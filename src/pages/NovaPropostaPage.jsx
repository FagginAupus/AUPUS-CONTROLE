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
    if (data.beneficio1) beneficios.push({ numero: 1, texto: 'Os benefícios economicos foram calculados com base nas tarifas de energia, sem impostos' });
    if (data.beneficio2) beneficios.push({ numero: 2, texto: 'A titularidade da fatura será transferida para o Consorcio Clube Aupus' });
    if (data.beneficio3) beneficios.push({ numero: 3, texto: 'A Aupus Energia fornecerá consultoria energética para o condomínio' });
    if (data.beneficio4) beneficios.push({ numero: 4, texto: 'Todo o processo será conduzido pela Aupus Energia, não se preocupe' });
    if (data.beneficio5) beneficios.push({ numero: 5, texto: 'Você irá pagar DOIS boletos, sendo um boleto mínimo para Equatorial e o outro sendo Aluguel da Usina para Aupus Energia' });
    if (data.beneficio6) beneficios.push({ numero: 6, texto: 'Contamos com uma moderna plataforma para te oferecer uma experiencia única!' });
    if (data.beneficio7) beneficios.push({ numero: 7, texto: 'A proposta se aplica para todos os condominos que tiverem interesse' });
    if (data.beneficio8) beneficios.push({ numero: 8, texto: 'Desconto em DOBRO no primeiro mês!!' });
    return beneficios;
  };

  const { register, control, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm({
    defaultValues: {
      dataProposta: new Date().toISOString().split('T')[0],
      consultor: '',
      recorrencia: '3%',
      economia: 20,
      bandeira: 20,
      inflacao: 2,
      tarifaTributos: 0.98,
      
      ucs: [{ distribuidora: '', numeroUC: '', apelido: '', ligacao: '', consumo: '' }],
      // Benefícios padrão (não obrigatórios)
      beneficio1: true,
      beneficio2: true,
      beneficio3: true,
      beneficio4: true,
      beneficio5: true,
      beneficio6: true,
      beneficio7: true,
      beneficio8: false
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'ucs'
  });

  const watchConsultor = watch('consultor');

  // Carregar consultores disponíveis
  const carregarConsultores = useCallback(async () => {
    try {
      const team = getMyTeam();
      
      if (user?.role === 'admin') {
        const consultores = team.filter(member => member.role === 'consultor');
        // Adicionar opção "sem consultor" com ID especial
        setConsultoresDisponiveis([
          ...consultores.map(member => ({ id: member.id, name: member.name })),
          { id: null, name: 'Sem consultor (AUPUS direto)' }
        ]);
      } else if (user?.role === 'consultor') {
        const funcionarios = team.filter(member => 
          member.role === 'gerente' || member.role === 'vendedor'
        );
        setConsultoresDisponiveis([
          { id: user.id, name: user.name },
          ...funcionarios.map(member => ({ id: member.id, name: member.name }))
        ]);
      } else if (user?.role === 'gerente') {
        const vendedores = team.filter(member => 
          member.role === 'vendedor'
        );
        setConsultoresDisponiveis([
          { id: user.id, name: user.name },
          ...vendedores.map(member => ({ id: member.id, name: member.name }))
        ]);
      } else if (user?.role === 'vendedor') {
        setConsultoresDisponiveis([{ id: user.id, name: user.name }]);
        setValue('consultor', user.id); // Salvar ID ao invés do nome
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
  }, [carregarConsultores]);

  // Handle consultor change
  useEffect(() => {
    if (watchConsultor === 'Sem consultor (AUPUS direto)') {
      setValue('recorrencia', '0%');
    } else if (watchConsultor && watchConsultor !== 'Sem consultor (AUPUS direto)') {
      setValue('recorrencia', '3%');
    }
  }, [watchConsultor, setValue]);

  const limparFormulario = () => {
    if (window.confirm('Deseja limpar todos os dados do formulário?')) {
      reset({
        dataProposta: new Date().toISOString().split('T')[0],
        consultor: '',
        recorrencia: '3%',
        economia: 20,
        bandeira: 20,
        inflacao: 2,
        tarifaTributos: 0.98,
        ucs: [{ distribuidora: '', numeroUC: '', apelido: '', ligacao: '', consumo: '' }],
        // Benefícios continuam como false (não obrigatórios)
        beneficio1: false,
        beneficio2: false,
        beneficio3: false,
        beneficio4: false,
        beneficio5: false,
        beneficio6: false,
        beneficio7: false,
        beneficio8: false
      });
      setBeneficiosAdicionais([]);
      gerarNumeroProposta();
      showNotification('Formulário limpo com sucesso!', 'info');
    }
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
  const onSubmit = async (data) => {
    try {
      setLoading(true);

      // Validação extra
      const errosValidacao = validarFormulario(data);
      if (errosValidacao.length > 0) {
        showNotification(`Erro de validação: ${errosValidacao[0]}`, 'error');
        return;
      }

      // Ajustar nome do consultor
      let consultorFinal = data.consultor;
      if (data.consultor === 'Sem consultor (AUPUS direto)') {
        consultorFinal = 'AUPUS';
      }

      // Preparar benefícios como array
      const beneficiosArray = [];
      if (data.beneficio1) beneficiosArray.push('Os benefícios economicos foram calculados com base nas tarifas de energia, sem impostos');
      if (data.beneficio2) beneficiosArray.push('A titularidade da fatura será transferida para o Consorcio Clube Aupus');
      if (data.beneficio3) beneficiosArray.push('A Aupus Energia fornecerá consultoria energética para o condomínio');
      if (data.beneficio4) beneficiosArray.push('Todo o processo será conduzido pela Aupus Energia, não se preocupe');
      if (data.beneficio5) beneficiosArray.push('Você irá pagar DOIS boletos, sendo um boleto mínimo para Equatorial e o outro sendo Aluguel da Usina para Aupus Energia');
      if (data.beneficio6) beneficiosArray.push('Contamos com uma moderna plataforma para te oferecer uma experiencia única!');
      if (data.beneficio7) beneficiosArray.push('A proposta se aplica para todos os condominos que tiverem interesse');
      if (data.beneficio8) beneficiosArray.push('Desconto em DOBRO no primeiro mês!!');
      
      // Adicionar benefícios extras
      beneficiosAdicionais.forEach(beneficio => {
        if (beneficio.trim()) {
          beneficiosArray.push(beneficio.trim());
        }
      });

      // Preparar unidades consumidoras no formato esperado pelo backend
      const unidadesConsumidoras = data.ucs.map(uc => ({
        numero_unidade: parseInt(uc.numeroUC),
        apelido: uc.apelido || `UC ${uc.numeroUC}`,
        ligacao: uc.ligacao || '',
        distribuidora: uc.distribuidora || 'EQUATORIAL GO',
        consumo_medio: parseInt(uc.consumo) || 0,
        distribuidora: uc.distribuidora || ''
      }));

      const consultorId = data.consultor === null || data.consultor === 'null' ? null : data.consultor;

      const propostaParaBackend = {
        nomeCliente: data.nomeCliente,
        consultor_id: consultorId, // ← MUDANÇA: usar consultor_id ao invés de consultor
        dataProposta: data.dataProposta,
        numeroProposta: numeroProposta,
        // REMOVIDOS: telefone, email, endereco
        status: 'Aguardando',
        economia: data.economia || 0,
        bandeira: data.bandeira || 0,
        recorrencia: data.recorrencia,
        beneficios: beneficiosArray,
        unidadesConsumidoras: unidadesConsumidoras.length > 0 ? unidadesConsumidoras : [],
        observacoes: `Proposta criada via sistema web. ${data.observacoes || ''}`.trim()
      };

      console.log('📤 Enviando proposta para o backend:', propostaParaBackend);

      // Tentar salvar via API
      const result = await storageService.adicionarProspec(propostaParaBackend);
      console.log('✅ Proposta salva com sucesso:', result);

      // ✅ ADICIONAR: Refresh automático após criar nova proposta
      console.log('🔄 Atualizando dados automaticamente após criação...');
      
      // Atualizar propostas (força reload)
      await loadPropostas(1, {}, true);

      // **NOVA FUNCIONALIDADE: GERAR PDF AUTOMATICAMENTE** 
      try {
        console.log('📄 Gerando PDF automaticamente...');
        
        // Obter benefícios selecionados
        const beneficiosSelecionados = obterBeneficiosSelecionados(data);
        
        // Preparar dados para o PDF
        const dadosPDF = {
          numeroProposta: numeroProposta,
          nomeCliente: data.nomeCliente,
          consultor: data.consultor,
          data: data.dataProposta || new Date().toISOString().split('T')[0],
          descontoTarifa: (data.economia || 20) / 100,
          descontoBandeira: (data.bandeira || 20) / 100,
          inflacao: (data.inflacao || 2) / 100,        // Converter % para decimal
          tarifaTributos: data.tarifaTributos || 0.98, // Valor em R$/kWh
          observacoes: data.observacoes || '',
          ucs: data.ucs || [],
          beneficios: [
            ...beneficiosSelecionados,
            ...beneficiosAdicionais.map(b => ({ 
              numero: beneficiosSelecionados.length + beneficiosAdicionais.indexOf(b) + 1, 
              texto: b 
            }))
          ]
        };

        // Importar e usar o gerador de PDF
        const PDFGenerator = (await import('../services/pdfGenerator.js')).default;
        await PDFGenerator.baixarPDF(dadosPDF, true);
        
        showNotification(`Proposta ${numeroProposta} criada e PDF gerado com sucesso!`, 'success');
        
      } catch (pdfError) {
        console.error('⚠️ Erro ao gerar PDF (proposta foi salva):', pdfError);
        showNotification(`Proposta ${numeroProposta} criada! PDF não pôde ser gerado: ${pdfError.message}`, 'warning');
      }

      // Invalidar cache do DataContext
      afterCreateProposta();

      // Limpar formulário e navegar
      reset();
      setBeneficiosAdicionais([]);
      await gerarNumeroProposta();
      navigate('/prospec');

    } catch (error) {
      console.error('❌ Erro ao salvar proposta:', error);
      
      // Determinar mensagem de erro baseada no tipo de erro
      let errorMessage = 'Erro inesperado ao salvar proposta';
      
      if (error.message) {
        // Verificar tipos específicos de erro
        if (error.message.includes('Call to undefined method')) {
          errorMessage = 'Erro no servidor: Problema de configuração do backend Laravel';
        } else if (error.message.includes('500')) {
          errorMessage = 'Erro interno do servidor: Verifique se o backend está funcionando';
        } else if (error.message.includes('404')) {
          errorMessage = 'Rota não encontrada: Verifique se a API está configurada corretamente';
        } else if (error.message.includes('Network Error') || error.message.includes('fetch')) {
          errorMessage = 'Erro de conexão: Verifique sua internet e se o servidor está rodando';
        } else if (error.message.includes('401')) {
          errorMessage = 'Não autorizado: Faça login novamente';
        } else if (error.message.includes('403')) {
          errorMessage = 'Sem permissão para executar esta ação';
        } else if (error.message.includes('422')) {
          errorMessage = 'Dados inválidos: Verifique os campos obrigatórios';
        } else {
          errorMessage = `Erro: ${error.message}`;
        }
      }
      
      showNotification(errorMessage, 'error');
      
    } finally {
      setLoading(false);
    }
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
                <label>Data da Proposta</label>
                <input 
                  {...register('dataProposta')} 
                  type="date" 
                  className={errors.dataProposta ? 'error' : ''}
                />
              </div>

              <div className="form-group">
                <label>Nome do Cliente *</label>
                <input 
                  {...register('nomeCliente', { required: 'Nome é obrigatório' })} 
                  type="text" 
                  placeholder="Nome completo do cliente"
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

            {/* Segunda linha */}
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
                    {...register('consultor', { required: 'Consultor é obrigatório' })}
                    className="form-input"
                  >
                    <option value="">Selecione o consultor</option>
                    {consultoresDisponiveis.map((consultor, index) => (
                      <option key={index} value={consultor.id}>
                        {consultor.name}
                      </option>
                    ))}
                  </select>
                )}
                {errors.consultor && <span className="error-message">{errors.consultor.message}</span>}
              </div>

              <div className="form-group">
                <label>Recorrência *</label>
                <input 
                  {...register('recorrencia', { 
                    required: 'Recorrência é obrigatória'
                  })} 
                  type="text" 
                  style={{ backgroundColor: watchConsultor === 'Sem consultor (AUPUS direto)' ? '#f0f0f0' : 'white' }}
                  readOnly={watchConsultor === 'Sem consultor (AUPUS direto)'}
                  className={errors.recorrencia ? 'error' : ''}
                />
                {errors.recorrencia && <span className="error-message">{errors.recorrencia.message}</span>}
              </div>
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

                  <div className="uc-inputs-row">
                    <div className="form-group">
                      <label>Distribuidora *</label>
                      <select 
                        {...register(`ucs.${index}.distribuidora`, { 
                          required: 'Distribuidora é obrigatória' 
                        })}
                        className={errors.ucs?.[index]?.distribuidora ? 'error' : ''}
                      >
                        <option value="">Selecione...</option>
                        <option value="ENEL GO">ENEL GO</option>
                        <option value="EQUATORIAL GO">EQUATORIAL GO</option>
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

                    <div className="form-group">
                      <label>Número UC *</label>
                      <input 
                        {...register(`ucs.${index}.numeroUC`, { 
                          required: 'Número UC é obrigatório',
                          minLength: { value: 3, message: 'Mínimo 3 caracteres' }
                        })} 
                        type="text" 
                        placeholder="Ex: 123456789"
                        className={errors.ucs?.[index]?.numeroUC ? 'error' : ''}
                      />
                      {errors.ucs?.[index]?.numeroUC && (
                        <span className="error-message">{errors.ucs[index].numeroUC.message}</span>
                      )}
                    </div>

                    <div className="form-group">
                      <label>Apelido *</label>
                      <input 
                        {...register(`ucs.${index}.apelido`, { 
                          required: 'Apelido é obrigatório' 
                        })} 
                        type="text" 
                        placeholder="Ex: Casa, Loja..."
                        className={errors.ucs?.[index]?.apelido ? 'error' : ''}
                      />
                      {errors.ucs?.[index]?.apelido && (
                        <span className="error-message">{errors.ucs[index].apelido.message}</span>
                      )}
                    </div>

                    <div className="form-group">
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

                    <div className="form-group">
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
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => append({ distribuidora: '', numeroUC: '', apelido: '', ligacao: '', consumo: '' })}
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
                <label htmlFor="beneficio1">Os benefícios economicos foram calculados com base nas tarifas de energia, sem impostos</label>
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
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="loading-spinner">⏳</span>
                      Salvando...
                    </>
                  ) : (
                    <>
                      💾 Salvar Proposta
                    </>
                  )}
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

export default NovaPropostaPage;