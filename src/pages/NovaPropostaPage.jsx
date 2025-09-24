// src/pages/NovaPropostaPage.jsx - CORRIGIDO COMPLETO
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import Header from '../components/common/Header';
import Navigation from '../components/common/Navigation';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import storageService from '../services/storageService';
import apiService from '../services/apiService';
import { formatarPrimeiraMaiuscula } from '../utils/formatters';
import './NovaPropostaPage.css';

const NovaPropostaPage = () => {
  const navigate = useNavigate();
  const { user, getMyTeam, refreshTeam } = useAuth();
  const { showNotification } = useNotification();
  const [loading, setLoading] = useState(false);
  const [numeroProposta, setNumeroProposta] = useState('');
  const [beneficiosAdicionais, setBeneficiosAdicionais] = useState([]);
  const [consultoresDisponiveis, setConsultoresDisponiveis] = useState([]);
  
  const { 
    afterCreateProposta, 
    loadPropostas, 
    loadControle 
  } = useData();

  const obterBeneficiosSelecionados = (data) => {
    const beneficios = [];
    if (data.beneficio1) beneficios.push({ numero: 1, texto: 'Os benefícios economicos foram calculados com base nas tarifas de energia, com impostos' });
    if (data.beneficio2) beneficios.push({ numero: 2, texto: 'A titularidade da fatura será transferida para o Consorcio Clube Aupus' });
    if (data.beneficio3) beneficios.push({ numero: 3, texto: 'A Aupus Energia fornecerá consultoria energética para o condomínio' });
    if (data.beneficio4) beneficios.push({ numero: 4, texto: 'Todo o processo será conduzido pela Aupus Energia, não se preocupe' });
    if (data.beneficio5) beneficios.push({ numero: 5, texto: 'Você irá pagar DOIS boletos, sendo um boleto mínimo para Equatorial e o outro sendo Aluguel da Usina para Aupus Energia' });
    if (data.beneficio6) beneficios.push({ numero: 6, texto: 'Contamos com uma moderna plataforma para te oferecer uma experiencia única!' });
    if (data.beneficio7) beneficios.push({ numero: 7, texto: 'A proposta se aplica para todos os condominos que tiverem interesse' });
    if (data.beneficio8) beneficios.push({ numero: 8, texto: 'Desconto em DOBRO no primeiro mês!!' });
    return beneficios;
  };

  const [arquivosFatura, setArquivosFatura] = useState({});

  const handleFileUpload = (ucIndex, file) => {
    console.log(`📁 Upload de fatura para UC ${ucIndex}:`, file?.name);
    console.log('🔍 Detalhes do arquivo:', {
      name: file?.name,
      type: file?.type,
      size: file?.size
    });
    
    // Validar arquivo
    if (file) {
      // ✅ CORREÇÃO: Lista mais abrangente de MIME types
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/jpg',          // Alguns browsers podem reportar assim
        'image/pjpeg',        // Internet Explorer
        'image/png',
        'image/x-png'         // Variação do PNG
      ];
      
      // ✅ CORREÇÃO: Validação também por extensão como fallback
      const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png'];
      const fileName = file.name.toLowerCase();
      const hasValidExtension = allowedExtensions.some(ext => fileName.endsWith(ext));
      
      const maxSize = 10 * 1024 * 1024; // ✅ CORREÇÃO: 10MB (não 100MB)
      
      // ✅ VALIDAÇÃO MELHORADA: MIME type OU extensão
      const isMimeTypeValid = allowedTypes.includes(file.type);
      const isFileValid = isMimeTypeValid || hasValidExtension;
      
      console.log('🔍 Validação do arquivo:', {
        mimeType: file.type,
        isMimeTypeValid,
        hasValidExtension,
        isFileValid,
        size: file.size,
        maxSize
      });
      
      if (!isFileValid) {
        console.error('❌ Tipo de arquivo inválido:', {
          type: file.type,
          name: file.name,
          allowedTypes,
          allowedExtensions
        });
        showNotification(
          `Apenas arquivos PDF, JPG e PNG são permitidos para faturas. Arquivo enviado: ${file.type}`, 
          'error'
        );
        return;
      }
      
      if (file.size > maxSize) {
        console.error('❌ Arquivo muito grande:', {
          size: file.size,
          maxSize,
          sizeMB: (file.size / 1024 / 1024).toFixed(2)
        });
        showNotification('Arquivo muito grande. Tamanho máximo: 10MB', 'error');
        return;
      }
      
      console.log('✅ Arquivo validado com sucesso para UC', ucIndex);
    }
    
    // ✅ CORREÇÃO: Garantir que o estado seja atualizado
    setArquivosFatura(prev => {
      const newState = {
        ...prev,
        [ucIndex]: file || null
      };
      console.log('📝 Estado arquivosFatura atualizado:', {
        ucIndex,
        fileName: file?.name,
        newState: Object.keys(newState)
      });
      return newState;
    });
  };

  const uploadArquivosFatura = async (numeroUC, ucIndex, propostaId) => {
    const arquivo = arquivosFatura[ucIndex];
    
    if (!arquivo) {
      console.log(`📁 Nenhuma fatura para UC index ${ucIndex} (UC ${numeroUC})`);
      return null;
    }

    try {
      console.log(`📤 Fazendo upload da fatura para UC ${numeroUC}...`, {
        arquivo: arquivo.name,
        tamanho: arquivo.size,
        tipo: arquivo.type,
        propostaId: propostaId
      });
      
      const formData = new FormData();
      formData.append('arquivo', arquivo);
      formData.append('numeroUC', String(numeroUC)); // ✅ Garantir que seja string
      formData.append('tipoDocumento', 'faturaUC');
      
      // ✅ LOG PARA DEBUG
      console.log('📝 Dados do FormData:', {
        arquivo: arquivo.name,
        numeroUC: String(numeroUC),
        tipoDocumento: 'faturaUC',
        propostaId: propostaId
      });
      
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000/api'}/propostas/${propostaId}/upload-documento`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('aupus_token')}`
          // ❌ NÃO incluir Content-Type - deixar o browser definir para FormData
        },
        body: formData
      });

      // ✅ LOG DA RESPOSTA COMPLETA
      console.log(`📥 Response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erro na resposta do servidor:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log(`✅ Fatura UC ${numeroUC} enviada com sucesso:`, result);
      
      // ✅ VALIDAR SE REALMENTE FOI SALVA
      if (!result.success || !result.nomeArquivo) {
        throw new Error('Servidor retornou sucesso mas sem nome do arquivo');
      }
      
      return result.nomeArquivo;
      
    } catch (error) {
      console.error(`❌ Erro ao enviar fatura UC ${numeroUC}:`, error);
      showNotification(`Erro ao enviar fatura da UC ${numeroUC}: ${error.message}`, 'error');
      return null;
    }
  };

  const { register, control, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm({
    defaultValues: {
      dataProposta: new Date().toISOString().split('T')[0],
      consultor_id: ['admin', 'analista'].includes(user?.role) ? null : (user?.id || ''),
      recorrencia: (user?.role === 'admin' || user?.role === 'analista' || user?.role === 'consultor') ? '3%' : '',
      economia: 20,
      bandeira: 20,
      inflacao: 2,
      tarifaTributos: 0.98,

      // ✅ MODIFICAR ESTA LINHA PARA PRÉ-SELECIONAR EQUATORIAL GO
      ucs: [{ distribuidora: 'EQUATORIAL GO', numeroUC: '', apelido: '', ligacao: '', consumo: '' }],

      // Benefícios padrão
      beneficio1: true,
      beneficio2: true,
      beneficio3: false,
      beneficio4: true,
      beneficio5: false,
      beneficio6: true,
      beneficio7: false,
      beneficio8: false
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'ucs'
  });

  const watchConsultor = watch('consultor_id');

  // Carregar consultores disponíveis
  const carregarConsultores = useCallback(async () => {
    try {
      const team = getMyTeam();
      
      if (user?.role === 'admin' || user?.role === 'analista') {
        const consultores = team.filter(member => member.role === 'consultor');
        // ✅ CORREÇÃO: Usar null em vez de string vazia
        setConsultoresDisponiveis([
          ...consultores.map(member => ({ id: member.id, name: member.name })),
          { id: null, name: 'Sem consultor (AUPUS direto)' } // ← MUDANÇA AQUI
        ]);
        // ✅ ADMIN: Definir "Sem Consultor" como padrão
        setValue('consultor_id', null);
      } else if (user?.role === 'consultor') {
        const funcionarios = team.filter(member =>
          member.role === 'gerente' || member.role === 'vendedor'
        );
        setConsultoresDisponiveis([
          { id: user.id, name: user.name },
          ...funcionarios.map(member => ({ id: member.id, name: member.name }))
        ]);
        // ✅ CONSULTOR: Definir ele mesmo como padrão
        setValue('consultor_id', user.id);
      } else if (user?.role === 'gerente') {
        const vendedores = team.filter(member =>
          member.role === 'vendedor'
        );
        setConsultoresDisponiveis([
          { id: user.id, name: user.name },
          ...vendedores.map(member => ({ id: member.id, name: member.name }))
        ]);
        // ✅ GERENTE: Definir ele mesmo como padrão
        setValue('consultor_id', user.id);
      } else if (user?.role === 'vendedor') {
        setConsultoresDisponiveis([{ id: user.id, name: user.name }]);
        // ✅ VENDEDOR: Definir ele mesmo como padrão
        setValue('consultor_id', user.id);
      }
    } catch (error) {
      console.error('Erro ao carregar consultores:', error);
      setConsultoresDisponiveis([{ id: user?.id, name: user?.name || 'Erro' }]);
    }
  }, [user, setValue, refreshTeam]);

  // Gerar número da proposta
  const gerarNumeroProposta = async () => {
    try {
      console.log('📋 Gerando número da proposta...');
      
      // Buscar propostas existentes para encontrar o próximo número
      const propostas = await storageService.getProspec();
      
      const ano = new Date().getFullYear();
      let maiorNumero = 0;
      
      // Encontrar o maior número existente do ano atual
      propostas.forEach(proposta => {
        if (proposta.numeroProposta && proposta.numeroProposta.startsWith(`${ano}/`)) {
          const numero = parseInt(proposta.numeroProposta.split('/')[1]) || 0;
          if (numero > maiorNumero) {
            maiorNumero = numero;
          }
        }
      });
      
      // Próximo número disponível
      const proximoNumero = maiorNumero + 1;
      const numeroFormatado = `${ano}/${proximoNumero.toString().padStart(3, '0')}`;
      
      setNumeroProposta(numeroFormatado);
      console.log('✅ Número da proposta gerado:', numeroFormatado);
      
    } catch (error) {
      console.warn('⚠️ Erro ao gerar número via propostas existentes, usando fallback:', error);
      
      // Fallback com timestamp se der erro
      const ano = new Date().getFullYear();
      const timestamp = Date.now().toString().slice(-3);
      const numeroFallback = `${ano}/${timestamp}`;
      
      setNumeroProposta(numeroFallback);
      console.log('✅ Número da proposta (fallback):', numeroFallback);
    }
  };

  useEffect(() => {
    gerarNumeroProposta();
    carregarConsultores();
    injetarCssModal();
  }, [carregarConsultores]);

  // Handle consultor change
  useEffect(() => {
    // Só ajustar recorrência se o usuário pode vê-la
    if (user?.role === 'admin' || user?.role === 'analista' || user?.role === 'consultor') {
      // ✅ CORREÇÃO: Comparar com null em vez de string
      if (watchConsultor === null || watchConsultor === '') {
        setValue('recorrencia', '0%');
      } else if (watchConsultor && watchConsultor !== null && watchConsultor !== '') {
        setValue('recorrencia', '3%');
      }
    } else {
      // Para gerente e vendedor, sempre setar como vazio ou valor padrão oculto
      setValue('recorrencia', '');
    }
  }, [watchConsultor, setValue, user?.role]);

  const limparFormulario = () => {
    reset({
      dataProposta: new Date().toISOString().split('T')[0],
      consultor_id: ['admin', 'analista'].includes(user?.role) ? null : (user?.id || ''),
      recorrencia: (user?.role === 'admin' || user?.role === 'analista' || user?.role === 'consultor') ? '3%' : '', // ✅ Condicional
      economia: 20,
      bandeira: 20,
      inflacao: 2,
      tarifaTributos: 0.98,
      ucs: [{ distribuidora: 'EQUATORIAL GO', numeroUC: '', apelido: '', ligacao: '', consumo: '' }],
      // Benefícios continuam como false (não obrigatórios)
      beneficio1: true,
      beneficio2: true,
      beneficio3: false,
      beneficio4: true,
      beneficio5: false,
      beneficio6: true,
      beneficio7: false,
      beneficio8: false
    });
    setBeneficiosAdicionais([]);
    setArquivosFatura({});
    gerarNumeroProposta();
    // ✅ Recarregar consultores para definir padrão novamente
    carregarConsultores();
    showNotification('Formulário limpo com sucesso!', 'info');
  };

  const adicionarBeneficioAdicional = () => {
    setBeneficiosAdicionais([...beneficiosAdicionais, '']);
  };

  const atualizarBeneficioAdicional = (index, valor) => {
    const novos = [...beneficiosAdicionais];
    novos[index] = valor;
    setBeneficiosAdicionais(novos);
  };

  const removerBeneficioAdicional = (index) => {
    setBeneficiosAdicionais(beneficiosAdicionais.filter((_, i) => i !== index));
  };

  // 4. VALIDAÇÃO ADICIONAL - Adicionar antes do onSubmit
  const validarFormulario = (data) => {
    const erros = [];
    
    // Validar se pelo menos uma UC está preenchida
    if (!data.ucs || data.ucs.length === 0) {
      erros.push('Pelo menos uma Unidade Consumidora deve ser informada');
    }
    
    // Validar se todas as UCs têm dados obrigatórios
    data.ucs.forEach((uc, index) => {
      if (!uc.distribuidora) erros.push(`UC ${index + 1}: Distribuidora é obrigatória`);
      if (!uc.numeroUC) erros.push(`UC ${index + 1}: Número UC é obrigatório`);
      if (!uc.apelido) erros.push(`UC ${index + 1}: Apelido é obrigatório`);
      if (!uc.ligacao) erros.push(`UC ${index + 1}: Ligação é obrigatória`);
      if (!uc.consumo || uc.consumo <= 0) erros.push(`UC ${index + 1}: Consumo é obrigatório e deve ser maior que 0`);
    });
    
    return erros;
  };
  // FUNÇÃO PRINCIPAL - COMPLETA E CORRIGIDA
  // CORREÇÃO COMPLETA para src/pages/NovaPropostaPage.jsx
  // Função onSubmit - seção de preparação dos dados para backend

  const onSubmit = async (data) => {
    if (loading) return;
    
    setLoading(true);
    
    try {
      console.log('📋 Dados do formulário:', data);

      let consultorNome = 'Sem consultor';
      if (data.consultor_id && data.consultor_id !== '') {
        const consultorSelecionado = consultoresDisponiveis.find(c => c.id === data.consultor_id);
        consultorNome = consultorSelecionado?.name || 'Consultor não encontrado';
      }

      if (!consultorNome) {
        showNotification('Selecione um consultor responsável', 'error');
        return;
      }

      // Validação das UCs
      if (!data.ucs || data.ucs.length === 0) {
        showNotification('Adicione pelo menos uma unidade consumidora', 'error');
        return;
      }

      // Benefícios
      const beneficiosSelecionados = obterBeneficiosSelecionados(data);
      
      const propostaParaBackend = {
        nomeCliente: data.nomeCliente,
        consultor_id: data.consultor_id || null,
        consultor: consultorNome,
        data_proposta: data.dataProposta,
        status: 'Aguardando',
        observacoes: `Proposta criada via sistema web.${data.observacoes || ''}`.trim(),
        recorrencia: data.recorrencia || '3%',
        desconto_tarifa: data.economia || 20,
        desconto_bandeira: data.bandeira || 20,
        inflacao: data.inflacao || 2.00,
        tarifa_tributos: data.tarifaTributos || 0.98,
        beneficios: [
          ...beneficiosSelecionados,
          ...beneficiosAdicionais.map(b => ({ 
            numero: beneficiosSelecionados.length + beneficiosAdicionais.indexOf(b) + 1, 
            texto: b 
          }))
        ],
        unidades_consumidoras: data.ucs?.map(uc => ({
          numero_unidade: uc.numeroUC,     // ✅ Campo correto
          apelido: uc.apelido,
          ligacao: uc.ligacao,
          distribuidora: uc.distribuidora,
          consumo_medio: uc.consumo,       // ✅ Campo correto
          status: 'Aguardando'
        })) || [],
      };

      console.log('📤 Enviando proposta para o backend:', propostaParaBackend);

      // ✅ PASSO 1: Criar a proposta
      const result = await storageService.adicionarProspec(propostaParaBackend);
      console.log('✅ Proposta salva com sucesso:', result);

      // ✅ PASSO 2: Extrair ID da proposta
      const propostaId = result.data?.id || result.id;
      
      if (!propostaId) {
        throw new Error('ID da proposta não foi retornado pelo servidor');
      }

      console.log('🆔 ID da proposta extraído:', propostaId);

      // ✅ PASSO 3: Fazer upload das faturas (SE HOUVER)
      const faturasSalvas = {};
      let totalFaturas = 0;
      let faturasComSucesso = 0;

      // Contar total de faturas para upload
      for (let ucIndex = 0; ucIndex < data.ucs.length; ucIndex++) {
        if (arquivosFatura[ucIndex]) {
          totalFaturas++;
        }
      }

      if (totalFaturas > 0) {
        console.log(`📤 Iniciando upload de ${totalFaturas} faturas...`);
        
        for (let ucIndex = 0; ucIndex < data.ucs.length; ucIndex++) {
          const uc = data.ucs[ucIndex];
          const numeroUC = uc.numeroUC;
          
          if (!arquivosFatura[ucIndex]) {
            console.log(`⏭️ Pulando UC ${numeroUC} - sem fatura`);
            continue;
          }

          try {
            console.log(`📤 Processando fatura ${faturasComSucesso + 1}/${totalFaturas} - UC ${numeroUC}`);
            
            const nomeArquivoFatura = await uploadArquivosFatura(numeroUC, ucIndex, propostaId);
            
            if (nomeArquivoFatura) {
              faturasSalvas[numeroUC] = nomeArquivoFatura;
              faturasComSucesso++;
              console.log(`✅ Fatura UC ${numeroUC} salva: ${nomeArquivoFatura} (${faturasComSucesso}/${totalFaturas})`);
            } else {
              console.warn(`⚠️ Fatura UC ${numeroUC} não foi salva`);
            }
            
            // ✅ PEQUENA PAUSA ENTRE UPLOADS para evitar sobrecarga
            if (ucIndex < data.ucs.length - 1 && arquivosFatura[ucIndex + 1]) {
              await new Promise(resolve => setTimeout(resolve, 500));
            }
            
          } catch (error) {
            console.error(`❌ Erro ao salvar fatura UC ${numeroUC}:`, error);
            // Continuar com outras faturas mesmo se uma falhar
          }
        }

        console.log(`📊 Resultado do upload: ${faturasComSucesso}/${totalFaturas} faturas salvas`);
      } else {
        console.log('📁 Nenhuma fatura para upload');
      }

      // ✅ PASSO 4: Verificar se documentação foi atualizada (opcional)
      if (Object.keys(faturasSalvas).length > 0) {
        console.log('🔍 Verificando se documentação foi atualizada...');
        
        try {
          // Fazer uma chamada para verificar a documentação
          const verificacaoResponse = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000/api'}/propostas/${propostaId}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('aupus_token')}`,
              'Content-Type': 'application/json'
            }
          });

          if (verificacaoResponse.ok) {
            const propostaVerificacao = await verificacaoResponse.json();
            const documentacao = propostaVerificacao.data?.documentacao || propostaVerificacao.documentacao;
            
            console.log('📋 Documentação final:', documentacao);
            
            if (documentacao && documentacao.faturas_ucs) {
              console.log('✅ Documentação atualizada com faturas:', Object.keys(documentacao.faturas_ucs));
            } else {
              console.warn('⚠️ Documentação não contém faturas_ucs');
            }
          }
        } catch (error) {
          console.warn('⚠️ Não foi possível verificar a documentação:', error.message);
        }
      }

      // ✅ SUCESSO FINAL
      const mensagemSucesso = totalFaturas > 0 
        ? `Proposta salva com sucesso! ${faturasComSucesso}/${totalFaturas} faturas enviadas.`
        : 'Proposta salva com sucesso!';
        
      showNotification(mensagemSucesso, 'success');
      
      // ✅ ATUALIZAR DADOS E LIMPAR FORMULÁRIO
      if (afterCreateProposta) {
        await afterCreateProposta();
      }

      // ✅ REFRESH DOS DADOS ANTES DE NAVEGAR
      console.log('🔄 Atualizando dados automaticamente após criação de proposta...');
      await loadPropostas(1, {}, true);
      await loadControle(1, {}, true);

      reset();
      setArquivosFatura({});
      setBeneficiosAdicionais([]);

      // Redirecionar
      navigate('/prospec');

    } catch (error) {
      console.error('❌ Erro geral no salvamento:', error);
      
      // ✅ MELHOR TRATAMENTO DE ERROS
      let mensagemErro = 'Erro ao salvar proposta';
      
      if (error.message?.includes('UC duplicada') || error.message?.includes('duplicate')) {
        mensagemErro = 'Uma ou mais UCs já estão em outra proposta ativa';
      } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
        mensagemErro = 'Erro de conexão. Verifique sua internet';
      } else if (error.message) {
        mensagemErro = error.message;
      }
      
      showNotification(mensagemErro, 'error');
      
    } finally {
      setLoading(false);
    }
  };

  // ✅ NOVA FUNÇÃO - MODAL PARA UCs BLOQUEADAS
  // Adicionar esta função no mesmo arquivo, fora do onSubmit
  const mostrarModalUcsBloqueadas = (dadosErro) => {
      console.log('🎭 Mostrando modal de UCs bloqueadas:', dadosErro);
      
      const { message, ucs_bloqueadas } = dadosErro;
      
      // Remover modal existente se houver
      const modalExistente = document.querySelector('.modal-ucs-bloqueadas');
      if (modalExistente) {
          modalExistente.remove();
      }
      
      // Criar modal personalizado
      const modal = document.createElement('div');
      modal.className = 'modal-overlay modal-ucs-bloqueadas';
      modal.innerHTML = `
          <div class="modal-content">
              <div class="modal-header">
                  <h3>⚠️ Unidades Consumidoras Indisponíveis</h3>
                  <button class="btn-close" onclick="this.closest('.modal-overlay').remove()">×</button>
              </div>
              <div class="modal-body">
                  <p><strong>Não é possível criar a proposta pois algumas unidades já possuem propostas ativas:</strong></p>
                  <div class="ucs-bloqueadas-lista">
                      ${ucs_bloqueadas.map(uc => `
                          <div class="uc-bloqueada-item">
                              <div class="uc-info">
                                  <strong>UC ${uc.numero_uc}</strong> - ${uc.apelido}
                              </div>
                              <div class="proposta-info">
                                  Proposta: <strong>${uc.proposta_numero}</strong><br>
                                  Cliente: <strong>${uc.proposta_cliente}</strong><br>
                                  Status: <span class="status-badge status-${uc.status_atual.toLowerCase()}">${uc.status_atual}</span>
                              </div>
                          </div>
                      `).join('')}
                  </div>
                  <div class="modal-footer">
                      <p><strong>Ação necessária:</strong> Remova essas unidades da proposta ou cancele as propostas anteriores.</p>
                  </div>
              </div>
              <div class="modal-actions">
                  <button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove()">
                      Entendi, vou corrigir
                  </button>
              </div>
          </div>
      `;
      
      document.body.appendChild(modal);
      
      // Auto-remover após 20 segundos
      setTimeout(() => {
          if (modal.parentNode) {
              modal.remove();
          }
      }, 20000);
      
      console.log('✅ Modal de UCs bloqueadas criado e exibido');
  };
  const gerarPDFProposta = async (item) => {
    try {
      console.log('📄 Gerando PDF da proposta...', item);

      // Preparar dados para o PDF a partir do item da tabela
      const dadosPDF = {
        numeroProposta: item.numeroProposta,
        nomeCliente: item.nomeCliente,
        consultor: item.consultor,
        data: item.data,
        descontoTarifa: parseFloat(item.descontoTarifa) || 0.2,
        descontoBandeira: parseFloat(item.descontoBandeira) || 0.2,
        // ✅ ADICIONAR ESTES CAMPOS:
        inflacao: parseFloat(item.inflacao) / 100 || 0.02,        // Se vem em % do backend
        tarifaTributos: parseFloat(item.tarifaTributos) || 0.98,  // Se disponível
        observacoes: item.observacoes || '',
        ucs: [], // Buscar UCs da proposta se disponível
        beneficios: []
      };

      // Se benefícios estão disponíveis no item, usar
      if (item.beneficios && typeof item.beneficios === 'string') {
        try {
          dadosPDF.beneficios = JSON.parse(item.beneficios);
        } catch (e) {
          console.warn('Erro ao parsear benefícios:', e);
        }
      }

      // Importar e usar o gerador de PDF
      const PDFGenerator = (await import('../services/pdfGenerator.js')).default;
      await PDFGenerator.baixarPDF(dadosPDF, true);
      
      showNotification(`PDF da proposta ${item.numeroProposta} gerado com sucesso!`, 'success');
      
    } catch (error) {
      console.error('❌ Erro ao gerar PDF:', error);
      showNotification(`Erro ao gerar PDF: ${error.message}`, 'error');
    }
  };

  return (
    <div className="page-container">
      <div className="container">
        <Header 
          title="Nova Proposta"
        />
        <Navigation />
        <form onSubmit={handleSubmit(onSubmit)} className="form-container">
          
          {/* INFORMAÇÕES BÁSICAS */}
          <section className="form-section">
            <h2>📋 Informações Básicas</h2>
            
            {/* Primeira linha */}
            <div className="form-grid-uniform">
              {/* ✅ CORREÇÃO: Adicionar campo Número da Proposta */}
              <div className="form-group">
                <label>Número da Proposta</label>
                <input 
                  type="text" 
                  value={numeroProposta}
                  disabled
                  style={{ backgroundColor: '#f0f0f0', color: '#666' }}
                  placeholder="Será gerado automaticamente"
                />
              </div>
              <div className="form-group">
                <label>Data da Proposta *</label>
                <input 
                  {...register('dataProposta', { required: 'Data da proposta é obrigatória' })} 
                  type="date" 
                  className={errors.dataProposta ? 'error' : ''}
                />
                {errors.dataProposta && <span className="error-message">{errors.dataProposta.message}</span>}
              </div>

              <div className="form-group">
                <label>Nome do Cliente *</label>
                <input 
                  {...register('nomeCliente', { required: 'Nome é obrigatório' })} 
                  type="text" 
                  placeholder="Nome completo do cliente"
                  onBlur={(e) => setValue('nomeCliente', formatarPrimeiraMaiuscula(e.target.value))}
                  className={errors.nomeCliente ? 'error' : ''}
                />
                {errors.nomeCliente && <span className="error-message">{errors.nomeCliente.message}</span>}
              </div>

              {/* ✅ NOVO: Div que ocupa o espaço de um campo mas tem dois inputs */}
              <div className="form-group form-group-double">
                <div className="double-inputs">
                  <div className="input-half">
                    <label>Inflação (%) *</label>
                    <input 
                      {...register('inflacao', { 
                        required: 'Inflação é obrigatória',
                        min: { value: 0, message: 'Valor mínimo 0' },
                        max: { value: 20, message: 'Valor máximo 20' }
                      })} 
                      type="number" 
                      step="0.01"
                      min="0"
                      max="20"
                      placeholder="2.00"
                      className={errors.inflacao ? 'error' : ''}
                    />
                    {errors.inflacao && <span className="error-message">{errors.inflacao.message}</span>}
                  </div>
                  <div className="input-half">
                    <label>Tarifa (R$/kWh) *</label>
                    <input 
                      {...register('tarifaTributos', { 
                        required: 'Tarifa é obrigatória',
                        min: { value: 0.01, message: 'Valor mínimo 0.01' }
                      })} 
                      type="number" 
                      step="0.0001"
                      min="0"
                      placeholder="0.98765"
                      className={errors.tarifaTributos ? 'error' : ''}
                    />
                    {errors.tarifaTributos && <span className="error-message">{errors.tarifaTributos.message}</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* Segunda linha - OCULTAR RECORRÊNCIA PARA GERENTE E VENDEDOR */}
            <div className="form-grid-uniform">
              <div className="form-group">
                <label>Nome do Consultor *</label>
                {user?.role === 'vendedor' ? (
                  <input
                    type="text"
                    value={user.name}
                    disabled
                    style={{ backgroundColor: '#f0f0f0' }}
                  />
                ) : (
                  <select
                    {...register('consultor_id', { 
                      required: false,
                      validate: (value) => {
                        // Permitir tanto null quanto string vazia para "Sem consultor"
                        if (!value || value === '') {
                          return true; // Válido
                        }
                        // Se tem valor, verificar se existe na lista
                        const consultorExiste = consultoresDisponiveis.some(c => c.id === value);
                        return consultorExiste || 'Consultor selecionado não é válido';
                      }
                    })}
                    className="form-input"
                  >
                    <option value="">Selecione o consultor</option>
                    {consultoresDisponiveis.map((consultor, index) => (
                      <option key={index} value={consultor.id || ''}>
                        {consultor.name}
                      </option>
                    ))}
                  </select>
                )}
                {errors.consultor && <span className="error-message">{errors.consultor.message}</span>}
              </div>

              {/* ✅ ADICIONAR ESTA CONDIÇÃO - Só mostrar para admin e consultor */}
              {(user?.role === 'admin' || user?.role === 'analista' || user?.role === 'consultor') && (
                <div className="form-group">
                  <label>Recorrência *</label>
                  <input 
                    {...register('recorrencia', { 
                      required: (user?.role === 'admin' || user?.role === 'analista' || user?.role === 'consultor') ? 'Recorrência é obrigatória' : false
                    })} 
                    type="text" 
                    style={{ backgroundColor: watchConsultor === 'Sem consultor (AUPUS direto)' ? '#f0f0f0' : 'white' }}
                    readOnly={watchConsultor === 'Sem consultor (AUPUS direto)'}
                    className={errors.recorrencia ? 'error' : ''}
                  />
                  {errors.recorrencia && <span className="error-message">{errors.recorrencia.message}</span>}
                </div>
              )}


              <div className="form-group">
                <label>Desconto Tarifa (%)</label>
                <input 
                  {...register('economia', { 
                    required: 'Campo obrigatório',
                    min: { value: 0, message: 'Valor mínimo 0' },
                    max: { value: 100, message: 'Valor máximo 100' }
                  })}
                  type="number" 
                  step="0.01"
                  min="0" 
                  max="100"
                  className={errors.economia ? 'error' : ''}
                />
                {errors.economia && <span className="error-message">{errors.economia.message}</span>}
              </div>

              <div className="form-group">
                <label>Desconto Bandeira (%)</label>
                <input 
                  {...register('bandeira', { 
                    required: 'Campo obrigatório',
                    min: { value: 0, message: 'Valor mínimo 0' },
                    max: { value: 100, message: 'Valor máximo 100' }
                  })}
                  type="number" 
                  step="0.01"
                  min="0" 
                  max="100"
                  className={errors.bandeira ? 'error' : ''}
                />
                {errors.bandeira && <span className="error-message">{errors.bandeira.message}</span>}
              </div>
            </div>
          </section>

          {/* UNIDADES CONSUMIDORAS */}
          <section className="form-section">
            <h2>🏢 Unidades Consumidoras</h2>
            
            <div className="ucs-list">
              {fields.map((field, index) => (
                <div key={field.id} className="uc-row">
                  <div className="uc-header">
                    <h3>Unidade {index + 1}</h3>
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="btn-remove-uc"
                      >
                        ❌ Remover
                      </button>
                    )}
                  </div>

                  <div className="uc-inputs-grid">
                  {/* Campo 1 - Distribuidora (mais largo) */}
                  <div className="uc-field">
                    <label>Distribuidora *</label>
                    <select 
                      {...register(`ucs.${index}.distribuidora`, { 
                        required: 'Distribuidora é obrigatória' 
                      })}
                      className={errors.ucs?.[index]?.distribuidora ? 'error' : ''}
                    >
                      <option value="">Selecione...</option>
                      <option value="EQUATORIAL GO">EQUATORIAL GO</option>
                      <option value="ENEL GO">ENEL GO</option>
                      <option value="NEOENERGIA">NEOENERGIA</option>
                      <option value="CEMIG">CEMIG</option>
                      <option value="CPFL">CPFL</option>
                      <option value="LIGHT">LIGHT</option>
                      <option value="OUTRAS">OUTRAS</option>
                    </select>
                    {errors.ucs?.[index]?.distribuidora && (
                      <span className="error-message">{errors.ucs[index].distribuidora.message}</span>
                    )}
                  </div>

                  {/* Campo 2 - Número UC (menor) */}
                  <div className="uc-field">
                    <label>Número UC *</label>
                    <input 
                      {...register(`ucs.${index}.numeroUC`, { 
                        required: 'Número UC é obrigatório',
                        minLength: { value: 3, message: 'Mínimo 3 caracteres' }
                      })} 
                      type="text" 
                      placeholder="Ex: 123456"
                      className={errors.ucs?.[index]?.numeroUC ? 'error' : ''}
                    />
                    {errors.ucs?.[index]?.numeroUC && (
                      <span className="error-message">{errors.ucs[index].numeroUC.message}</span>
                    )}
                  </div>

                  {/* Campo 3 - Apelido */}
                  <div className="uc-field">
                    <label>Apelido *</label>
                    <input 
                      {...register(`ucs.${index}.apelido`, { 
                        required: 'Apelido é obrigatório' 
                      })} 
                      type="text" 
                      placeholder="Ex: Casa, Loja..."
                      onBlur={(e) => setValue(`ucs.${index}.apelido`, formatarPrimeiraMaiuscula(e.target.value))}
                      className={errors.ucs?.[index]?.apelido ? 'error' : ''}
                    />
                    {errors.ucs?.[index]?.apelido && (
                      <span className="error-message">{errors.ucs[index].apelido.message}</span>
                    )}
                  </div>

                  {/* Campo 4 - Ligação */}
                  <div className="uc-field">
                    <label>Ligação *</label>
                    <select 
                      {...register(`ucs.${index}.ligacao`, { 
                        required: 'Tipo de ligação é obrigatório' 
                      })}
                      className={errors.ucs?.[index]?.ligacao ? 'error' : ''}
                    >
                      <option value="">Selecione...</option>
                      <option value="MONOFÁSICA">MONOFÁSICA</option>
                      <option value="BIFÁSICA">BIFÁSICA</option>
                      <option value="TRIFÁSICA">TRIFÁSICA</option>
                    </select>
                    {errors.ucs?.[index]?.ligacao && (
                      <span className="error-message">{errors.ucs[index].ligacao.message}</span>
                    )}
                  </div>

                  {/* Campo 5 - Consumo (menor) */}
                  <div className="uc-field">
                    <label>Consumo (kWh) *</label>
                    <input 
                      {...register(`ucs.${index}.consumo`, { 
                        required: 'Consumo é obrigatório',
                        min: { value: 1, message: 'Consumo deve ser maior que 0' }
                      })} 
                      type="number" 
                      min="1"
                      placeholder="Ex: 500"
                      className={errors.ucs?.[index]?.consumo ? 'error' : ''}
                    />
                    {errors.ucs?.[index]?.consumo && (
                      <span className="error-message">{errors.ucs[index].consumo.message}</span>
                    )}
                  </div>

                  {/* Campo 6 - PDF da Fatura */}
                  <div className="uc-field">
                    <label>
                      PDF da Fatura
                      <span className="optional-field">(opcional)</span>
                    </label>
                    <div className="file-upload-container">
                      <input
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => handleFileUpload(index, e.target.files[0])}
                        className="file-input"
                        id={`fatura-uc-${index}`}
                      />
                      <label htmlFor={`fatura-uc-${index}`} className="file-upload-label">
                        {arquivosFatura[index] ? (
                          <span className="file-selected">
                            📄 {arquivosFatura[index].name.length > 8 ? 
                              arquivosFatura[index].name.substring(0, 8) + '...' : 
                              arquivosFatura[index].name}
                          </span>
                        ) : (
                          <span className="file-placeholder">
                            📄 Selecionar PDF
                          </span>
                        )}
                      </label>
                      {arquivosFatura[index] && (
                        <button
                          type="button"
                          className="btn-remove-file"
                          onClick={() => handleFileUpload(index, null)}
                          title="Remover arquivo"
                        >
                          ×
                        </button>
                      )}
                    </div>
                    <small className="file-help-text">
                      Apenas PDF, máx 10MB
                    </small>
                  </div>
                </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => append({ distribuidora: 'EQUATORIAL GO', numeroUC: '', apelido: '', ligacao: '', consumo: '' })}
              className="btn btn-secondary"
            >
              + Adicionar Unidade Consumidora
            </button>
          </section>

          {/* BENEFÍCIOS */}
          <section className="form-section">
            <h2>💰 Benefícios Inclusos</h2>
            
            <div className="beneficios-grid">
              <div className="beneficio-item">
                <input 
                  {...register('beneficio1')} 
                  type="checkbox" 
                  id="beneficio1"
                />
                <label htmlFor="beneficio1">Os benefícios economicos foram calculados com base nas tarifas de energia, com impostos</label>
              </div>

              <div className="beneficio-item">
                <input 
                  {...register('beneficio2')} 
                  type="checkbox" 
                  id="beneficio2"
                />
                <label htmlFor="beneficio2">A titularidade da fatura será transferida para o Consorcio Clube Aupus</label>
              </div>

              <div className="beneficio-item">
                <input 
                  {...register('beneficio3')} 
                  type="checkbox" 
                  id="beneficio3"
                />
                <label htmlFor="beneficio3">A Aupus Energia fornecerá consultoria energética para o condomínio</label>
              </div>

              <div className="beneficio-item">
                <input 
                  {...register('beneficio4')} 
                  type="checkbox" 
                  id="beneficio4"
                />
                <label htmlFor="beneficio4">Todo o processo será conduzido pela Aupus Energia, não se preocupe</label>
              </div>

              <div className="beneficio-item">
                <input 
                  {...register('beneficio5')} 
                  type="checkbox" 
                  id="beneficio5"
                />
                <label htmlFor="beneficio5">Você irá pagar DOIS boletos, sendo um boleto mínimo para Equatorial e o outro sendo Aluguel da Usina para Aupus Energia</label>
              </div>

              <div className="beneficio-item">
                <input 
                  {...register('beneficio6')} 
                  type="checkbox" 
                  id="beneficio6"
                />
                <label htmlFor="beneficio6">Contamos com uma moderna plataforma para te oferecer uma experiencia única!</label>
              </div>

              <div className="beneficio-item">
                <input 
                  {...register('beneficio7')} 
                  type="checkbox" 
                  id="beneficio7"
                />
                <label htmlFor="beneficio7">A proposta se aplica para todos os condominos que tiverem interesse</label>
              </div>

              <div className="beneficio-item">
                <input 
                  {...register('beneficio8')} 
                  type="checkbox" 
                  id="beneficio8"
                />
                <label htmlFor="beneficio8">Desconto em DOBRO no primeiro mês!!</label>
              </div>
            </div>

            {/* Benefícios Adicionais */}
            <div className="beneficios-adicionais">
              <h3>Benefícios Extras</h3>
              
              {beneficiosAdicionais.map((beneficio, index) => (
                <div key={index} className="beneficio-adicional">
                  <input
                    type="text"
                    value={beneficio}
                    onChange={(e) => atualizarBeneficioAdicional(index, e.target.value)}
                    placeholder="Digite o benefício adicional"
                  />
                  <button
                    type="button"
                    onClick={() => removerBeneficioAdicional(index)}
                    className="btn-remove"
                  >
                    ❌
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={adicionarBeneficioAdicional}
                className="btn btn-secondary"
              >
                + Adicionar Benefício Extra
              </button>
            </div>
          </section>

          {/* BOTÕES DE AÇÃO */}
          <section className="form-actions">
            <div className="actions-container">
              <button
                type="button"
                onClick={limparFormulario}
                className="btn btn-secondary"
                disabled={loading}
              >
                🧹 Limpar Formulário
              </button>

              <div className="primary-actions">
                <button
                  type="button"
                  onClick={() => navigate('/prospec')}
                  className="btn btn-outline"
                  disabled={loading}
                >
                  ← Voltar
                </button>

                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={loading}
                  style={{ 
                    opacity: loading ? 0.7 : 1,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    position: 'relative'
                  }}
                >
                  {loading ? (
                    <>
                      <span style={{ visibility: 'hidden' }}>Salvar Proposta</span>
                      <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <div className="spinner" style={{
                          width: '16px',
                          height: '16px',
                          border: '2px solid #ffffff40',
                          borderTop: '2px solid #ffffff',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite'
                        }} />
                        Salvando...
                      </div>
                    </>
                  ) : (
                    'Salvar Proposta'
                  )}
                </button>
                
                <button 
                  type="button" 
                  className="btn-secondary" 
                  onClick={() => navigate('/prospec')}
                  disabled={loading}
                  style={{ opacity: loading ? 0.5 : 1 }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </section>
        </form>

        {/* Loading Overlay */}
        {loading && (
          <div className="loading-overlay">
            <div className="loading-content">
              <div className="loading-spinner">⏳</div>
              <p>Salvando proposta...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const injetarCssModal = () => {
    if (document.getElementById('modal-ucs-css')) return;
    
    const style = document.createElement('style');
    style.id = 'modal-ucs-css';
    style.textContent = `
        .modal-overlay.modal-ucs-bloqueadas {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 9999;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }

        .modal-ucs-bloqueadas .modal-content {
            background: white;
            border-radius: 12px;
            max-width: 600px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
            animation: modalAppear 0.3s ease-out;
        }

        @keyframes modalAppear {
            from { opacity: 0; transform: scale(0.9) translateY(-20px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
        }

        .modal-ucs-bloqueadas .modal-header {
            padding: 20px;
            border-bottom: 1px solid #eee;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #f8f9fa;
            border-radius: 12px 12px 0 0;
        }

        .modal-ucs-bloqueadas .modal-header h3 {
            margin: 0;
            color: #dc3545;
            font-size: 18px;
            font-weight: 600;
        }

        .modal-ucs-bloqueadas .modal-body {
            padding: 20px;
        }

        .modal-ucs-bloqueadas .modal-body p {
            margin: 0 0 15px 0;
            color: #333;
            line-height: 1.5;
        }

        .ucs-bloqueadas-lista {
            margin: 15px 0;
        }

        .uc-bloqueada-item {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 10px;
            border-left: 4px solid #f39c12;
        }

        .uc-bloqueada-item:last-child {
            margin-bottom: 0;
        }

        .uc-bloqueada-item .uc-info {
            font-size: 16px;
            font-weight: 600;
            color: #856404;
            margin-bottom: 8px;
        }

        .uc-bloqueada-item .proposta-info {
            font-size: 14px;
            color: #6c757d;
            line-height: 1.4;
        }

        .status-badge {
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
        }

        .status-aguardando { background: #fff3cd; color: #856404; }
        .status-fechada { background: #d4edda; color: #155724; }
        .status-perdida { background: #f8d7da; color: #721c24; }

        .modal-footer {
            margin-top: 15px;
            padding-top: 15px;
            border-top: 1px solid #eee;
        }

        .modal-footer p {
            margin: 0;
            font-weight: 500;
            color: #495057;
        }

        .modal-actions {
            padding: 20px;
            border-top: 1px solid #eee;
            text-align: right;
            background: #f8f9fa;
            border-radius: 0 0 12px 12px;
        }

        .btn-close {
            background: none;
            border: none;
            font-size: 24px;
            cursor: pointer;
            color: #666;
            padding: 0;
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: all 0.2s;
        }

        .btn-close:hover {
            color: #333;
            background: #e9ecef;
        }

        .btn.btn-primary {
            background: #007bff;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 6px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s;
        }

        .btn.btn-primary:hover {
            background: #0056b3;
        }
    `;
    
    document.head.appendChild(style);
};

export default NovaPropostaPage;