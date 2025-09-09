// src/pages/ProspecPage.jsx - Com modal de visualização para todos os perfis
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/common/Header';
import Navigation from '../components/common/Navigation';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import storageService from '../services/storageService'; 
import { formatarPrimeiraMaiuscula } from '../utils/formatters';
import './ProspecPage.css';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  TrendingUp,
  Edit, 
  Eye,
  Trash2,
  X,
  Download
} from 'lucide-react';

const ProspecPage = () => {
  const navigate = useNavigate();
  const { user, getMyTeam, getConsultorName } = useAuth();
  const { showNotification } = useNotification();
  const { 
    propostas, 
    loadPropostas, 
    afterDeleteProposta,
    afterUpdateProposta,
    loadControle // ← ADICIONAR esta importação
  } = useData();
  
  const [loading, setLoading] = useState(false); // ← ADICIONAR ESTA LINHA
  const [modalEdicao, setModalEdicao] = useState({ show: false, item: null, index: -1 });
  const [modalVisualizacao, setModalVisualizacao] = useState({ show: false, item: null });
  const [consultoresDisponiveis, setConsultoresDisponiveis] = useState([]);
  
  const [filtros, setFiltros] = useState({
    consultor: '',
    status: '',
    busca: ''
  });

  const carregarConsultores = useCallback(async () => {
    try {
      const team = getMyTeam();
      console.log('🔍 Modal - Team completo:', team);
      console.log('🔍 Modal - User role:', user?.role);
      
      if (user?.role === 'admin') {
        const consultores = team.filter(member => member.role === 'consultor');
        console.log('🔍 Modal - Consultores filtrados:', consultores);
        
        const listaFinal = [
          ...consultores.map(member => ({ id: member.id, name: member.name })),
          { id: null, name: 'Sem consultor (AUPUS direto)' }
        ];
        
        console.log('🔍 Modal - Lista final consultores:', listaFinal);
        setConsultoresDisponiveis(listaFinal);
      } else if (user?.role === 'consultor') {
        const funcionarios = team.filter(member => 
          member.role === 'gerente' || member.role === 'vendedor'
        );
        const listaFinal = [
          { id: user.id, name: user.name },
          ...funcionarios.map(member => ({ id: member.id, name: member.name }))
        ];
        console.log('🔍 Modal - Lista final funcionários:', listaFinal);
        setConsultoresDisponiveis(listaFinal);
      } else if (user?.role === 'gerente') {
        const vendedores = team.filter(member => 
          member.role === 'vendedor'
        );
        const listaFinal = [
          { id: user.id, name: user.name },
          ...vendedores.map(member => ({ id: member.id, name: member.name }))
        ];
        console.log('🔍 Modal - Lista final vendedores:', listaFinal);
        setConsultoresDisponiveis(listaFinal);
      } else if (user?.role === 'vendedor') {
        const listaFinal = [{ id: user.id, name: user.name }];
        console.log('🔍 Modal - Lista final vendedor:', listaFinal);
        setConsultoresDisponiveis(listaFinal);
      }
    } catch (error) {
      console.error('Erro ao carregar consultores:', error);
      setConsultoresDisponiveis([{ id: user?.id, name: user?.name || 'Erro' }]);
    }
  }, [user, getMyTeam]);

  // Carregar consultores quando o modal abre
  useEffect(() => {
    console.log('🔄 Modal - useEffect carregarConsultores executado');
    carregarConsultores();
  }, [carregarConsultores]);

  const dadosFiltrados = useMemo(() => {
    let dados = propostas.data || [];

    if (filtros.consultor) {
      dados = dados.filter(item =>
        item.consultor?.toLowerCase().includes(filtros.consultor.toLowerCase())
      );
    }

    if (filtros.status) {
      dados = dados.filter(item => item.status === filtros.status);
    }

    if (filtros.busca) {
      const busca = filtros.busca.toLowerCase();
      dados = dados.filter(item =>
        (item.nomeCliente?.toString().toLowerCase() || '').includes(busca) ||
        (item.numeroProposta?.toString().toLowerCase() || '').includes(busca) ||
        (item.numeroUC?.toString().toLowerCase() || '').includes(busca) ||
        (item.apelido?.toString().toLowerCase() || '').includes(busca)
      );
    }

    return dados;
  }, [propostas.data, filtros]);

  const limparFiltros = () => {
    setFiltros({
      consultor: '',
      status: '',
      busca: ''
    });
  };

  const editarItem = (index) => {
    const item = dadosFiltrados[index];
    if (!item) return;
    
    // ✅ DEBUG: Ver como os dados chegam
    console.log('🔍 Item completo:', item);
    console.log('🔍 Documentação no item:', item.documentacao);
    console.log('🔍 Número UC:', item.numeroUC || item.numero_unidade);
    
    // ✅ BUSCAR DOCUMENTAÇÃO ESPECÍFICA DA UC
    const numeroUC = item.numeroUC || item.numero_unidade;
    let documentacaoUC = {};
    
    // Se tem proposta expandida com documentação
    if (item.documentacao && typeof item.documentacao === 'object') {
      documentacaoUC = item.documentacao[numeroUC] || {};
      console.log('🔍 Documentação da UC encontrada:', documentacaoUC);
    } else {
      console.log('🔍 Documentação não encontrada ou não é objeto');
    }
    
    // Adicionar documentação específica da UC ao item
    const itemComDocumentacao = {
      ...item,
      // Dados da documentação específica da UC
      tipoDocumento: documentacaoUC.tipoDocumento || '',
      nomeRepresentante: documentacaoUC.nomeRepresentante || '',
      cpf: documentacaoUC.cpf || '',
      documentoPessoal: documentacaoUC.documentoPessoal || null,
      razaoSocial: documentacaoUC.razaoSocial || '',
      cnpj: documentacaoUC.cnpj || '',
      contratoSocial: documentacaoUC.contratoSocial || null,
      documentoPessoalRepresentante: documentacaoUC.documentoPessoalRepresentante || null,
      enderecoUC: documentacaoUC.enderecoUC || '',
      isArrendamento: documentacaoUC.isArrendamento || false,
      contratoLocacao: documentacaoUC.contratoLocacao || null,
      enderecoRepresentante: documentacaoUC.enderecoRepresentante || '',
      termoAdesao: documentacaoUC.termoAdesao || null
    };
    
    console.log('🔍 Item final com documentação:', itemComDocumentacao);
    
    setModalEdicao({ show: true, item: itemComDocumentacao, index });
  };

  const visualizarItem = (index) => {
    const item = dadosFiltrados[index];
    if (!item) return;
    setModalVisualizacao({ show: true, item });
  };

  const salvarEdicao = async (dadosAtualizados) => {
    setLoading(true);
    
    try {
      const { item } = modalEdicao;
      
      const propostaId = item.propostaId || item.id?.split('-')[0];
      
      if (!propostaId) {
        showNotification('ID da proposta não encontrado para edição', 'error');
        return;
      }

      // ✅ DETECTAR CAMPOS DE ARQUIVO E FAZER UPLOAD
      const camposArquivo = [
        'documentoPessoal', 'contratoSocial', 'documentoPessoalRepresentante',
        'contratoLocacao', 'termoAdesao'
      ];
      
      const documentacaoFinal = { ...dadosAtualizados };
      
      // Fazer upload dos arquivos primeiro
      for (const campo of camposArquivo) {
        if (dadosAtualizados[campo] && dadosAtualizados[campo] instanceof File) {
          try {

            // ✅ DEBUG: Ver o que está sendo enviado
            console.log('🔍 Dados do upload:', {
              campo: campo,
              arquivo: dadosAtualizados[campo],
              nomeArquivo: dadosAtualizados[campo].name,
              tamanho: dadosAtualizados[campo].size,
              tipo: dadosAtualizados[campo].type,
              numeroUC: item.numeroUC || item.numero_unidade,
              tipoDocumento: campo
            });

            const formData = new FormData();
            formData.append('arquivo', dadosAtualizados[campo]);
            formData.append('numeroUC', item.numeroUC || item.numero_unidade);
            formData.append('tipoDocumento', campo);

            const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000/api'}/propostas/${propostaId}/upload-documento`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('aupus_token')}`
                // NÃO incluir Content-Type - deixar o browser definir para FormData
              },
              body: formData
            });

            if (!response.ok) {
              const errorText = await response.text();
              console.error('Erro na resposta:', errorText);
              throw new Error(`HTTP ${response.status}: ${errorText}`);
            }

            const result = await response.json();
            
            documentacaoFinal[campo] = result.nomeArquivo;
            showNotification(`${campo} enviado com sucesso!`, 'success');
            
          } catch (error) {
            showNotification(`Erro ao enviar ${campo}: ${error.message}`, 'error');
            return;
          }
        }
      }

      // Agora salvar os dados com os nomes dos arquivos
      const dadosUC = {
      nomeCliente: dadosAtualizados.nomeCliente,
      
      apelido: dadosAtualizados.apelido,
      ligacao: dadosAtualizados.ligacao,
      media: dadosAtualizados.media,
      distribuidora: dadosAtualizados.distribuidora,
      status: dadosAtualizados.status,
      descontoTarifa: dadosAtualizados.descontoTarifa, 
      descontoBandeira: dadosAtualizados.descontoBandeira,
      economia: dadosAtualizados.descontoTarifa,
      bandeira: dadosAtualizados.descontoBandeira
    };

      // ✅ APENAS campos de documentação
      const documentacaoLimpa = {
        tipoDocumento: documentacaoFinal.tipoDocumento,
        nomeRepresentante: documentacaoFinal.nomeRepresentante,
        cpf: documentacaoFinal.cpf,
        documentoPessoal: documentacaoFinal.documentoPessoal,
        razaoSocial: documentacaoFinal.razaoSocial,
        cnpj: documentacaoFinal.cnpj,
        contratoSocial: documentacaoFinal.contratoSocial,
        documentoPessoalRepresentante: documentacaoFinal.documentoPessoalRepresentante,
        enderecoUC: documentacaoFinal.enderecoUC,
        isArrendamento: documentacaoFinal.isArrendamento,
        contratoLocacao: documentacaoFinal.contratoLocacao,
        enderecoRepresentante: documentacaoFinal.enderecoRepresentante,
        termoAdesao: documentacaoFinal.termoAdesao
      };

      const dadosComId = {
        ...dadosUC,
        
        numeroProposta: dadosAtualizados.numeroProposta,
        data: dadosAtualizados.data,
        observacoes: dadosAtualizados.observacoes || item.observacoes, // ✅ PRESERVAR
        recorrencia: dadosAtualizados.recorrencia,
        
        consultor_id: dadosAtualizados.consultor_id || null,
        consultor: dadosAtualizados.consultor || '',
        propostaId: propostaId,
        numeroUC: item.numeroUC || item.numero_unidade,
        documentacao: documentacaoLimpa,
        
        beneficios: item.beneficios || [],
      };

      await storageService.atualizarProspec(propostaId, dadosComId);
    
      // ✅ CHAMADAS DIRETAS DE REFRESH - ESTAS SÃO AS LINHAS IMPORTANTES
      console.log('🔄 Atualizando dados automaticamente após salvamento...');
      
      // Atualizar propostas (força reload)
      await loadPropostas(1, propostas.filters, true);
      
      // Atualizar controle também (força reload)  
      await loadControle(1, {}, true);

      setModalEdicao({ show: false, item: null, index: -1 });
      showNotification('Proposta atualizada com sucesso!', 'success');
      
    } catch (error) {
      console.error('❌ Erro ao salvar edição:', error);
      showNotification('Erro ao salvar: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };
  
  // Formatar UCs a partir do item da tabela
  const formatarUCsDoItem = (item) => {
    if (item.unidades_consumidoras) {
      try {
        const ucs = JSON.parse(item.unidades_consumidoras);
        return ucs.map(uc => ({
          apelido: uc.apelido || uc.numero_unidade || 'UC',
          numeroUC: uc.numero_unidade || uc.numeroUC || '',
          ligacao: uc.ligacao || uc.tipo_ligacao || 'Monofásica',
          consumo: uc.consumo_medio || uc.media || 0,
          distribuidora: uc.distribuidora || item.distribuidora || 'N/I' // Adicionar distribuidora
        }));
      } catch (e) {
        console.warn('Erro ao parsear UCs:', e);
      }
    }
    
    return [{
      apelido: item.apelido || item.numeroUC || 'UC',
      numeroUC: item.numeroUC || item.numero_unidade || '',
      ligacao: item.ligacao || item.tipo_ligacao || 'Monofásica',
      consumo: item.media || item.consumo_medio || item.consumo || 0,
      distribuidora: item.distribuidora || 'N/I' // Adicionar distribuidora do item
    }];
  };

  // Formatar benefícios a partir do item da tabela    
  const formatarBeneficiosDoItem = (item) => {
    // Se já é um array direto (caso atual)
    if (Array.isArray(item.beneficios)) {
      return item.beneficios.map((texto, index) => ({
        numero: index + 1,
        texto: texto
      }));
    }
    
    // Se é string JSON (caso antigo)  
    if (item.beneficios && typeof item.beneficios === 'string') {
      try {
        const beneficios = JSON.parse(item.beneficios);
        
        // Se é array de strings
        if (Array.isArray(beneficios) && typeof beneficios[0] === 'string') {
          return beneficios.map((texto, index) => ({
            numero: index + 1,
            texto: texto
          }));
        }
        
        // Se é array de objetos
        if (Array.isArray(beneficios) && typeof beneficios[0] === 'object') {
          return beneficios.map((beneficio, index) => ({
            numero: beneficio.numero || (index + 1),
            texto: beneficio.texto || beneficio.toString()
          }));
        }
        
      } catch (e) {
        console.warn('Erro ao parsear benefícios:', e);
      }
    }
    
    // Retornar array vazio se não conseguir processar
    return [];
  };

  const extrairValorDesconto = (desconto) => {
    if (typeof desconto === 'string' && desconto.includes('%')) {
      return parseFloat(desconto.replace('%', ''));
    }
    return parseFloat(desconto) || 20;
  };

  const gerarPDFProposta = async (item) => {
    try {
      console.log('📄 Gerando PDF da proposta...', item);

      // ✅ BUSCAR TODAS AS UCs DA MESMA PROPOSTA
      const propostaId = item.propostaId || item.id?.split('-')[0];
      if (!propostaId) {
        showNotification('ID da proposta não encontrado', 'error');
        return;
      }

      // ✅ BUSCAR PROPOSTA COMPLETA COM TODAS AS UCs
      let propostaCompleta;
      try {
        console.log('🔍 Buscando proposta completa por ID:', propostaId);
        propostaCompleta = await storageService.buscarPropostaPorId(propostaId);
        
        if (!propostaCompleta) {
          // Fallback: buscar nas propostas carregadas em memória
          const todasPropostas = await storageService.getProspec();
          propostaCompleta = todasPropostas.find(p => 
            p.propostaId === propostaId || p.id === propostaId
          );
        }
      } catch (error) {
        console.warn('⚠️ Erro ao buscar proposta completa:', error);
        propostaCompleta = null;
      }

      // ✅ EXTRAIR TODAS AS UCs DA PROPOSTA (FORMATADAS CORRETAMENTE)
      let todasUCsDaProposta = [];
      
      if (propostaCompleta && propostaCompleta.unidades_consumidoras) {
        // Se encontrou a proposta completa, usar as UCs dela
        const ucsOriginais = Array.isArray(propostaCompleta.unidades_consumidoras) 
          ? propostaCompleta.unidades_consumidoras 
          : [];
        
        // ✅ FORMATAR UCs CORRETAMENTE PARA O PDF
        todasUCsDaProposta = ucsOriginais.map(uc => ({
          apelido: uc.apelido || uc.numero_unidade || 'UC',
          numeroUC: uc.numero_unidade || uc.numeroUC || '',
          numero_unidade: uc.numero_unidade || uc.numeroUC || '',
          ligacao: uc.ligacao || uc.tipo_ligacao || 'Monofásica',
          consumo: parseInt(uc.consumo_medio || uc.consumo || uc.media || 0) || 0,
          consumo_medio: parseInt(uc.consumo_medio || uc.consumo || uc.media || 0) || 0,
          distribuidora: uc.distribuidora || ''
        }));
        
        console.log('✅ UCs encontradas na proposta completa:', todasUCsDaProposta.length);
      } else {
        // Fallback: agrupar todas as linhas da mesma proposta que estão na tabela atual
        const linhasDaMesmaProposta = dadosFiltrados.filter(linha => {
          const linhaPropostaId = linha.propostaId || linha.id?.split('-')[0];
          return linhaPropostaId === propostaId;
        });

        todasUCsDaProposta = linhasDaMesmaProposta.map(linha => ({
          apelido: linha.apelido || linha.numero_unidade || 'UC',
          numeroUC: linha.numeroUC || linha.numero_unidade || '',
          numero_unidade: linha.numeroUC || linha.numero_unidade || '',
          ligacao: linha.ligacao || linha.tipo_ligacao || 'Monofásica',
          consumo: parseInt(linha.media) || 0,
          consumo_medio: parseInt(linha.media) || 0,
          distribuidora: linha.distribuidora || ''
        }));
        
        console.log('✅ UCs extraídas das linhas da tabela:', todasUCsDaProposta.length);
      }

      // ✅ PREPARAR DADOS COMPLETOS PARA O PDF COM DESCONTOS CORRETOS
      const dadosPDF = {
        numeroProposta: item.numeroProposta,
        nomeCliente: item.nomeCliente,
        consultor: item.consultor,
        data: item.data,
        // ✅ CORRIGIR DESCONTOS: Converter de % ou decimal para decimal
        descontoTarifa: parseFloat(item.descontoTarifa) / 100 || 0.2,  // 20 → 0.2
        descontoBandeira: parseFloat(item.descontoBandeira) / 100 || 0.2, // 20 → 0.2
        // ✅ USAR VALORES SALVOS NO BANCO DE DADOS DA PROPOSTA
        inflacao: (parseFloat(item.inflacao) || 2) / 100,  // Do banco: proposta.inflacao / 100
        tarifaTributos: parseFloat(item.tarifaTributos) || 0.98, // Do banco: proposta.tarifa_tributos
        observacoes: item.observacoes || '',
        ucs: todasUCsDaProposta, // ← CORRIGIDO: usar todas as UCs formatadas
        beneficios: []
      };

      // ✅ PROCESSAR BENEFÍCIOS CORRETAMENTE
      if (item.beneficios && typeof item.beneficios === 'string') {
        try {
          const beneficiosArray = JSON.parse(item.beneficios);
          dadosPDF.beneficios = Array.isArray(beneficiosArray) 
            ? beneficiosArray.map((beneficio, index) => ({
                numero: beneficio.numero || (index + 1),
                texto: beneficio.texto || beneficio.toString()
              }))
            : [];
        } catch (e) {
          console.warn('Erro ao parsear benefícios:', e);
          dadosPDF.beneficios = [];
        }
      } else if (Array.isArray(item.beneficios)) {
        dadosPDF.beneficios = item.beneficios.map((beneficio, index) => ({
          numero: beneficio.numero || (index + 1),
          texto: beneficio.texto || beneficio.toString()
        }));
      }

      console.log('📊 Dados finais para o PDF:', {
        numeroProposta: dadosPDF.numeroProposta,
        nomeCliente: dadosPDF.nomeCliente,
        consultor: dadosPDF.consultor,
        descontoTarifa: dadosPDF.descontoTarifa, // Deve ser 0.2 (20%)
        descontoBandeira: dadosPDF.descontoBandeira, // Deve ser 0.2 (20%)
        inflacao: dadosPDF.inflacao, // Deve ser 0.02 (2%)
        tarifaTributos: dadosPDF.tarifaTributos, // Deve ser 0.8
        totalUCs: dadosPDF.ucs.length,
        primeiraUC: dadosPDF.ucs[0], // Para debug
        totalBeneficios: dadosPDF.beneficios.length
      });

      // ✅ VERIFICAR SE OS DADOS ESTÃO COMPLETOS
      if (dadosPDF.ucs.length === 0) {
        showNotification('Nenhuma unidade consumidora encontrada para esta proposta', 'warning');
        return;
      }

      if (dadosPDF.descontoTarifa === 0 || dadosPDF.descontoTarifa > 1) {
        console.warn('⚠️ Desconto tarifa parece incorreto:', dadosPDF.descontoTarifa);
      }

      // Gerar PDF
      const PDFGenerator = (await import('../services/pdfGenerator.js')).default;
      await PDFGenerator.baixarPDF(dadosPDF, true);
      
      showNotification(
        `PDF da proposta ${item.numeroProposta} gerado com sucesso! (${dadosPDF.ucs.length} UCs incluídas)`, 
        'success'
      );
      
    } catch (error) {
      console.error('❌ Erro ao gerar PDF:', error);
      showNotification(`Erro ao gerar PDF: ${error.message}`, 'error');
    }
  };

  const removerItem = async (index) => {
    const item = dadosFiltrados[index];
    const confirmacao = window.confirm(
      `Tem certeza que deseja cancelar a proposta de ${item.nomeCliente} (${item.apelido || item.numeroUC})?`
    );
    
    if (!confirmacao) {
      return;
    }

    setLoading(true); // ← ADICIONAR loading no início

    try {
      const propostaId = item.propostaId || item.id;
      
      if (!propostaId) {
        showNotification('ID da proposta não encontrado', 'error');
        return;
      }

      console.log('🗑️ Removendo proposta com ID:', propostaId);

      // ✅ CANCELAR UC ESPECÍFICA - Alterar status da UC para "Cancelada"
      console.log('📝 Cancelando UC específica...');
      await storageService.atualizarProspec(propostaId, { 
        propostaId: propostaId,
        numeroUC: item.numeroUC || item.numero_unidade,
        status: 'Cancelada'
      });

      // ✅ Refresh automático após cancelar
      console.log('🔄 Atualizando dados automaticamente após cancelamento...');
      
      // Atualizar propostas (força reload)
      await loadPropostas(1, propostas.filters, true);
      
      // Atualizar controle também (força reload)  
      await loadControle(1, {}, true);
      
      showNotification('Proposta cancelada com sucesso!', 'success');
      
    } catch (error) {
      console.error('❌ Erro ao remover:', error);
      showNotification('Erro ao remover: ' + error.message, 'error');
    } finally {
      setLoading(false); // ← ADICIONAR loading no finally
    }
  };

  const criarNovaProposta = () => {
    navigate('/nova-proposta');
  };

  const exportarDados = async () => {
    try {
      await storageService.exportarDadosFiltrados('prospec', dadosFiltrados);
      showNotification('Dados exportados com sucesso!', 'success');
    } catch (error) {
      console.error('❌ Erro ao exportar:', error);
      showNotification('Erro ao exportar: ' + error.message, 'error');
    }
  };

  const refreshDados = useCallback(() => {
    console.log('🔄 Refresh manual dos dados');
    loadPropostas(1, propostas.filters, true); // forceReload = true
  }, [loadPropostas, propostas.filters]);

  // Obter lista única de consultores para filtro
  const consultoresUnicos = [...new Set((propostas.data || []).map(item => item.consultor).filter(Boolean))];

  // Verificar se é admin para mostrar ações de admin
  const isAdmin = user?.role === 'admin';

  return (
    <div className="page-container">
      <div className="container">
        <Header 
          title="Gerenciamento de Propostas"  
        />
        <Navigation />

        {/* Estatísticas Rápidas */}
        <section className="quick-stats">
          <div className="stat-card">
            <div className="stat-icon">
              <FileText size={24} style={{ color: '#f0f0f0', opacity: 0.8 }} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Total</span>
              <span className="stat-value">{dadosFiltrados.length}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <Clock size={24} style={{ color: '#f0f0f0', opacity: 0.8 }} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Aguardando</span>
              <span className="stat-value">{dadosFiltrados.filter(item => 
                  (item.status || 'Aguardando') === 'Aguardando'
              ).length}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <CheckCircle size={24} style={{ color: '#f0f0f0', opacity: 0.8 }} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Fechadas</span>
              <span className="stat-value">{dadosFiltrados.filter(item => 
                  (item.status || 'Aguardando') === 'Fechada'
              ).length}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <TrendingUp size={24} style={{ color: '#f0f0f0', opacity: 0.8 }} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Valor Médio</span>
              <span className="stat-value">
                {dadosFiltrados.length > 0 
                  ? Math.round(dadosFiltrados.reduce((acc, item) => acc + (parseFloat(item.media) || 0), 0) / dadosFiltrados.length).toLocaleString('pt-BR')
                  : '0'} kWh
              </span>
            </div>
          </div>
        </section>

        {/* Filtros e Controles */}
        <section className="filters-section">
          <div className="filters-container">
            <div className="filters-grid">
              <div className="filter-group">
                <label>Buscar</label>
                <input
                  type="text"
                  placeholder="🔍 Cliente, proposta, UC..."
                  value={filtros.busca}
                  onChange={(e) => setFiltros({...filtros, busca: e.target.value})}
                />
              </div>
              
              <div className="filter-group">
                <label>Consultor</label>
                <select
                  value={filtros.consultor}
                  onChange={(e) => setFiltros({...filtros, consultor: e.target.value})}
                >
                  <option value="">Todos</option>
                  {consultoresUnicos.map(consultor => (
                    <option key={consultor} value={consultor}>{consultor}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Status</label>
                <select
                  value={filtros.status}
                  onChange={(e) => setFiltros({...filtros, status: e.target.value})}
                >
                  <option value="">Todos</option>
                  <option value="Aguardando">Aguardando</option>
                  <option value="Fechada">Fechadas</option>  {/* ✅ CORRIGIDO: value="Fechada" */}
                  <option value="Cancelada">Canceladas</option>
                  <option value="Recusada">Recusadas</option>
                </select>
              </div>
            </div>

            <div className="actions-container">
              <button onClick={limparFiltros} className="btn btn-secondary">
                Limpar Filtros
              </button>
              <button 
                onClick={refreshDados}
                className="btn btn-secondary"
                disabled={propostas.loading}
                title="Atualizar dados"
              >
                {propostas.loading ? '🔄' : '⟳'} Atualizar
              </button>
              <button onClick={criarNovaProposta} className="btn btn-success">
                ➕ Nova Proposta
              </button>
              <button onClick={exportarDados} className="btn btn-primary">
                📊 Exportar CSV
              </button>
            </div>
          </div>
        </section>

        {/* Tabela */}
        <section className="table-section">
          <div className="table-container">
            <div className="table-header">
              <h2><FileText /> Propostas <span className="table-count">{dadosFiltrados.length}</span></h2>
            </div>

            {propostas.loading && propostas.data.length === 0 ? (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Carregando propostas...</p>
              </div>
            ) : dadosFiltrados.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <h3>Nenhuma proposta encontrada</h3>
                <p>Não há propostas que correspondam aos filtros aplicados.</p>
                <button onClick={criarNovaProposta} className="btn btn-primary">
                  ➕ Criar Nova Proposta
                </button>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Nº Proposta</th>
                      <th>Data</th>
                      <th>Apelido</th>
                      <th>UC</th>
                      <th>Média</th>
                      <th>Status</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dadosFiltrados.map((item, index) => (
                      <tr key={item.id} className={item.status === 'Cancelada' ? 'linha-cancelada' : ''}>
                        <td>{item.nomeCliente || '-'}</td>
                        <td>
                          <span className="numero-proposta">
                            {item.numeroProposta || '-'}
                          </span>
                        </td>
                        <td>
                          <span className="data">
                            {item.data ? (() => {
                              try {
                                // Se a data vem no formato YYYY-MM-DD, converter diretamente
                                if (item.data.match(/^\d{4}-\d{2}-\d{2}$/)) {
                                  const [ano, mes, dia] = item.data.split('-');
                                  return `${dia}/${mes}/${ano}`;
                                }
                                // Para outros formatos, usar Date normalmente
                                const dataObj = new Date(item.data);
                                return dataObj.toLocaleDateString('pt-BR');
                              } catch {
                                return item.data;
                              }
                            })() : '-'}
                          </span>
                        </td>
                        <td>{item.apelido || '-'}</td>
                        <td>{item.numeroUC || '-'}</td>
                        <td>
                          <span className="valor">
                            {item.media ? parseFloat(item.media).toLocaleString('pt-BR') : '0'} kWh
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge status-${(item.status || 'Aguardando').toLowerCase()}`}>
                              {item.status || 'Aguardando'}
                          </span>
                        </td>
                        <td>
                          <div className="table-actions">
                            <button 
                              onClick={() => visualizarItem(index)} 
                              className="btn-icon view"
                              title="Visualizar"
                            >
                              <Eye size={16} />
                            </button>
                            <button 
                              onClick={() => editarItem(index)} 
                              className="btn-icon edit"
                              title="Editar"
                            >
                              <Edit size={16} />
                            </button>
                            <button 
                              onClick={() => gerarPDFProposta(item)} 
                              className="btn-icon pdf"
                              title="Gerar PDF"
                            >
                              <FileText size={16} />
                            </button>
                            <button 
                              onClick={() => removerItem(index)} 
                              className="btn-icon delete"
                              title="Excluir"
                              disabled={loading} // ← Desabilitar durante loading
                            >
                              {loading ? (
                                <div className="loading-spinner-inline"></div>
                              ) : (
                                <Trash2 size={16} />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Modal de Visualização - Para todos os perfis */}
        {modalVisualizacao.show && (
          <ModalVisualizacao 
            item={modalVisualizacao.item}
            user={user}
            onClose={() => setModalVisualizacao({ show: false, item: null })}
          />
        )}

        {/* Modal de Edição - Para todos os perfis */}
        {modalEdicao.show && (
          <ModalEdicao
            item={modalEdicao.item}
            onSave={salvarEdicao}
            onClose={() => setModalEdicao({ show: false, item: null, index: -1 })}
            loading={loading} // ← ADICIONAR
            setLoading={setLoading} // ← ADICIONAR
          />
        )}
      </div>
    </div>
  );
};

// Componente Modal de Visualização - Disponível para todos os perfis
const ModalVisualizacao = ({ item, user, onClose }) => {
  const formatarPercentualModal = (valor) => {
    if (!valor && valor !== 0) return '0.0%';
    
    // Se já é string com %, extrair número e formatar
    if (typeof valor === 'string' && valor.includes('%')) {
      const numero = parseFloat(valor.replace('%', ''));
      return `${numero.toFixed(1)}%`;
    }
    
    // Se é número, usar direto (SEM multiplicação)
    const numero = parseFloat(valor);
    if (isNaN(numero)) return '0.0%';
    
    console.log('🔍 formatarPercentualModal:', { 
      valor, 
      numero, 
      resultado: `${numero.toFixed(1)}%` 
    });
    
    return `${numero.toFixed(1)}%`;
  };

  const formatarData = (data) => {
    if (!data) return '-';
    try {
      // Se a data vier no formato ISO (2025-07-30T03:00:00.000Z), converter
      const dataObj = new Date(data);
      return dataObj.toLocaleDateString('pt-BR');
    } catch (error) {
      return data; // Retorna o valor original se não conseguir converter
    }
  };

  // Lista de benefícios padrão com seus textos originais
  const beneficiosPadrao = [
    "Os benefícios economicos foram calculados com base nas tarifas de energia, sem impostos",
    "A titularidade da fatura será transferida para o Consorcio Clube Aupus", 
    "A Aupus Energia fornecerá consultoria energética para o condomínio",
    "Todo o processo será conduzido pela Aupus Energia, não se preocupe",
    "Você irá pagar DOIS boletos, sendo um boleto mínimo para Equatorial e o outro sendo Aluguel da Usina para Aupus Energial",
    "Contamos com uma moderna plataforma para te oferecer uma experiencia única!",
    "A proposta se aplica para todos os condominos que tiverem interesse",
    "Desconto em DOBRO no primeiro mês!!"
  ];

  // Obter benefícios reais marcados na proposta
  const obterBeneficiosReais = () => {
    const beneficiosAplicaveis = [];
    
    // Verificar se temos benefícios salvos na proposta
    if (item.beneficios && typeof item.beneficios === 'object') {
      // Se os benefícios estão salvos como objeto
      for (let i = 1; i <= 9; i++) {
        if (item.beneficios[`beneficio${i}`]) {
          let textoBeneficio = beneficiosPadrao[i - 1];
          
          // Personalizar benefícios 1 e 2 com os valores reais
          if (i === 1 && item.descontoTarifa) {
            const desconto = parseFloat(item.descontoTarifa).toFixed(1); // ✅ SEM MULTIPLICAÇÃO
            textoBeneficio = `A Aupus Energia irá oferecer uma economia de até ${desconto}% no valor da energia elétrica, sem impostos`;
          }
          if (i === 2 && item.descontoBandeira) {
            const desconto = parseFloat(item.descontoBandeira).toFixed(1); // ✅ SEM MULTIPLICAÇÃO
            textoBeneficio = `A Aupus Energia irá oferecer uma economia de até ${desconto}% no valor referente à bandeira tarifária, sem impostos`;
          }
          
          beneficiosAplicaveis.push(textoBeneficio);
        }
      }
    } else {
      // Fallback: se não tem benefícios salvos, usar baseado nos descontos
      if (item.descontoTarifa && parseFloat(item.descontoTarifa) > 0) {
        const desconto = parseFloat(item.descontoTarifa).toFixed(1); // ✅ SEM MULTIPLICAÇÃO
        beneficiosAplicaveis.push(`A Aupus Energia irá oferecer uma economia de até ${desconto}% no valor da energia elétrica, sem impostos`);
      }

      if (item.descontoBandeira && parseFloat(item.descontoBandeira) > 0) {
        const desconto = parseFloat(item.descontoBandeira).toFixed(1); // ✅ SEM MULTIPLICAÇÃO
        beneficiosAplicaveis.push(`A Aupus Energia irá oferecer uma economia de até ${desconto}% no valor referente à bandeira tarifária, sem impostos`);
      }
      
      // Adicionar benefícios padrão comuns
      beneficiosAplicaveis.push("Isenção de taxa de adesão");
      beneficiosAplicaveis.push("Não há cobrança de taxa de cancelamento");
      beneficiosAplicaveis.push("Não há fidelidade contratual");
      beneficiosAplicaveis.push("O cliente pode cancelar a qualquer momento");
    }

    return beneficiosAplicaveis;
  };

  const beneficiosReais = obterBeneficiosReais();

  // ✅ CORREÇÃO: Verificar se deve mostrar recorrência (apenas admin e consultor)
  const mostrarRecorrencia = user?.role === 'admin' || user?.role === 'consultor';

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>👁️ Detalhes da Proposta</h3>
          <button onClick={onClose} className="btn btn-close">✕</button>
        </div>
        
        <div className="modal-body">
          <div className="proposta-details">
            {/* Informações principais - REORGANIZADA */}
            <div className="details-section">
              <h4>📋 Informações Principais</h4>
              <div className="details-grid">
                <div className="detail-item">
                  <label>Cliente:</label>
                  <span>{item.nomeCliente || '-'}</span>
                </div>
                <div className="detail-item">
                  <label>Nº Proposta:</label>
                  <span className="numero-proposta">{item.numeroProposta || '-'}</span>
                </div>
                <div className="detail-item">
                  <label>Data:</label>
                  <span className="data">{formatarData(item.data)}</span>
                </div>
                <div className="detail-item">
                  <label>Status:</label>
                  <span className={`status-badge ${item.status === 'Fechado' ? 'status-fechado' : 'status-aguardando'}`}>
                    {item.status || 'Aguardando'}
                  </span>
                </div>
                <div className="detail-item">
                  <label>Consultor:</label>
                  <span>{item.consultor || '-'}</span>
                </div>
                {/* ✅ CORREÇÃO: Mostrar recorrência apenas para admin e consultor */}
                {mostrarRecorrencia && (
                  <div className="detail-item">
                    <label>Recorrência:</label>
                    <span>{item.recorrencia || '-'}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Informações da UC */}
            <div className="details-section">
              <h4>⚡ Informações da UC</h4>
              <div className="details-grid">
                <div className="detail-item">
                  <label>Apelido:</label>
                  <span>{item.apelido || '-'}</span>
                </div>
                <div className="detail-item">
                  <label>Número UC:</label>
                  <span>{item.numeroUC || '-'}</span>
                </div>
                <div className="detail-item">
                  <label>Ligação:</label>
                  <span>{item.ligacao || '-'}</span>
                </div>
                <div className="detail-item">
                  <label>Média Consumo:</label>
                  <span className="valor">
                    {item.media ? parseFloat(item.media).toLocaleString('pt-BR') : '0'} kWh
                  </span>
                </div>
              </div>
            </div>

            {/* ✅ CORREÇÃO: Descontos e benefícios - Só mostrar para admin e consultor */}
            {mostrarRecorrencia && (
              <div className="details-section">
                <h4>💰 Descontos e Benefícios</h4>
                <div className="details-grid">
                  <div className="detail-item">
                    <label>Desconto Tarifa:</label>
                    <span className="desconto-valor">{formatarPercentualModal(item.descontoTarifa)}</span>
                  </div>
                  <div className="detail-item">
                    <label>Desconto Bandeira:</label>
                    <span className="desconto-valor">{formatarPercentualModal(item.descontoBandeira)}</span>
                  </div>
                </div>
                
                {/* Lista de benefícios reais */}
                {beneficiosReais.length > 0 && (
                  <div className="beneficios-lista">
                    <h5>📝 Benefícios Inclusos:</h5>
                    <ul>
                      {beneficiosReais.map((beneficio, index) => (
                        <li key={index}>{beneficio}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* ✅ NOVA SEÇÃO: Observações (visível para todos) */}
            {item.observacoes && (
              <div className="details-section">
                <h4>📝 Observações</h4>
                <div className="observacoes-content">
                  <p>{item.observacoes}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-secondary">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

// Componente Modal de Edição - ATUALIZADO com novos campos
const ModalEdicao = ({ item, onSave, onClose }) => {
  const { user, getMyTeam } = useAuth(); 
  const [loading, setLoading] = useState(false);
  const [consultoresDisponiveis, setConsultoresDisponiveis] = useState([]);
  const [dados, setDados] = useState({ 
    ...item,
    consultor_id: item.consultor_id || null,
    consultor: item.consultor || '',
    
    // ✅ EXTRAIR valores numéricos dos descontos na inicialização
    descontoTarifa: (() => {
      const valor = item.descontoTarifa || item.economia;
      if (typeof valor === 'string' && valor.includes('%')) {
        return parseFloat(valor.replace('%', ''));
      }
      return parseFloat(valor) || 20;
    })(),
    
    descontoBandeira: (() => {
      const valor = item.descontoBandeira || item.bandeira;
      if (typeof valor === 'string' && valor.includes('%')) {
        return parseFloat(valor.replace('%', ''));
      }
      return parseFloat(valor) || 20;
    })(),
        
    // ... resto dos campos permanecem iguais
    tipoDocumento: item.tipoDocumento || 'CPF',
    nomeRepresentante: item.nomeRepresentante || '',
    cpf: item.cpf || '',
    documentoPessoal: item.documentoPessoal || null,
    razaoSocial: item.razaoSocial || '',
    cnpj: item.cnpj || '',
    contratoSocial: item.contratoSocial || null,
    documentoPessoalRepresentante: item.documentoPessoalRepresentante || null,
    enderecoUC: item.enderecoUC || '',
    isArrendamento: item.isArrendamento || false,
    contratoLocacao: item.contratoLocacao || null,
    enderecoRepresentante: item.enderecoRepresentante || '',
    termoAdesao: item.termoAdesao || null
  });

  const [consultoresCarregados, setConsultoresCarregados] = useState(false)

  const carregarConsultores = useCallback(async () => {
    try {
      const team = getMyTeam();
      console.log('🔍 Modal - Team completo:', team);
      console.log('🔍 Modal - User role:', user?.role);
      
      if (user?.role === 'admin') {
        const consultores = team.filter(member => member.role === 'consultor');
        console.log('🔍 Modal - Consultores filtrados:', consultores);
        
        const listaFinal = [
          ...consultores.map(member => ({ id: member.id, name: member.name })),
          { id: null, name: 'Sem consultor (AUPUS direto)' }
        ];
        
        console.log('🔍 Modal - Lista final consultores:', listaFinal);
        setConsultoresDisponiveis(listaFinal);
        setConsultoresCarregados(true); 
      } else if (user?.role === 'consultor') {
        const consultorNome = user.name;
        const funcionarios = team.filter(member => 
          member.role === 'gerente' || member.role === 'vendedor'
        ).map(member => member.name);
        setConsultoresDisponiveis([consultorNome, ...funcionarios]);
      } else if (user?.role === 'gerente') {
        const gerenteNome = user.name;
        const vendedores = team.filter(member => 
          member.role === 'vendedor'
        ).map(member => member.name);
        setConsultoresDisponiveis([gerenteNome, ...vendedores]);
      } else if (user?.role === 'vendedor') {
        setConsultoresDisponiveis([user.name]);
      }
    } catch (error) {
      console.error('Erro ao carregar consultores:', error);
      setConsultoresDisponiveis([{ id: user?.id, name: user?.name || 'Erro' }]);
      setConsultoresCarregados(true); 
    }
  }, [user, getMyTeam]);

  // ✅ ADICIONAR ESTE useEffect:
  useEffect(() => {
    carregarConsultores();
  }, [carregarConsultores]);

  useEffect(() => {
    // Mapear consultor nome para ID quando consultores carregarem
    if (consultoresDisponiveis.length > 0 && dados.consultor && !dados.consultor_id) {
      const consultorEncontrado = consultoresDisponiveis.find(c => c.name === dados.consultor);
      if (consultorEncontrado) {
        setDados(prev => ({
          ...prev,
          consultor_id: consultorEncontrado.id
        }));
        console.log('🔗 Consultor mapeado:', {
          nome: dados.consultor,
          id: consultorEncontrado.id
        });
      }
    }
  }, [consultoresDisponiveis, dados.consultor, dados.consultor_id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    // Validação apenas se status for "Fechado"
    if (dados.status === 'Fechado') {
      const camposObrigatorios = [];
      
      if (!dados.nomeCliente) camposObrigatorios.push('Nome do Cliente');
      if (!dados.apelido) camposObrigatorios.push('Apelido UC');
      if (!dados.numeroUC) camposObrigatorios.push('Número UC');
      if (!dados.consultor_id && !dados.consultor) camposObrigatorios.push('Consultor Responsável');
      if (!dados.enderecoUC) camposObrigatorios.push('Endereço da UC');
      if (!dados.enderecoRepresentante) camposObrigatorios.push('Endereço do Representante');
      
      if (dados.tipoDocumento === 'CPF') {
        if (!dados.nomeRepresentante) camposObrigatorios.push('Nome do Representante');
        if (!dados.cpf) camposObrigatorios.push('CPF');
      } else {
        if (!dados.razaoSocial) camposObrigatorios.push('Razão Social');
        if (!dados.cnpj) camposObrigatorios.push('CNPJ');
        if (!dados.nomeRepresentante) camposObrigatorios.push('Nome do Representante da Empresa');
      }
      
      if (camposObrigatorios.length > 0) {
        alert(`Para fechar a proposta, preencha os seguintes campos:\n\n• ${camposObrigatorios.join('\n• ')}`);
        return;
      }
    }
    
    setLoading(true);
    
    try {
      // ✅ LOG PARA DEBUG - Ver o que está sendo enviado
      console.log('📤 Dados enviados no handleSubmit:', {
        id: dados.id || dados.propostaId,
        consultor: dados.consultor,
        nomeCliente: dados.nomeCliente,
        status: dados.status
      });

      // ✅ GARANTIR QUE TODOS OS DADOS ESTÃO COMPLETOS
      const dadosCompletos = {
      ...dados,
      consultor_id: dados.consultor_id || null, // ← ENVIAR consultor_id
      consultor: dados.consultor || '', // Manter para compatibilidade
      id: dados.id || dados.propostaId,
      propostaId: dados.propostaId || dados.id
    };

      await onSave(dadosCompletos);
      
    } catch (error) {
      console.error('❌ Erro ao salvar proposta:', error);
      // Mostrar erro mais amigável
      alert(`Erro ao salvar: ${error.message || 'Erro desconhecido'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onClose();
  };

  const handleFileChange = (campo, file) => {
    setDados({...dados, [campo]: file});
  };

  const handleTipoDocumentoChange = (tipo) => {
    setDados({
      ...dados, 
      tipoDocumento: tipo,
      // Limpar campos do tipo não selecionado
      ...(tipo === 'CPF' ? {
        razaoSocial: '',
        cnpj: '',
        contratoSocial: null,
        documentoPessoalRepresentante: null
      } : {
        nomeRepresentante: '',
        cpf: '',
        documentoPessoal: null
      })
    });
  };
  
  return (
    <div className="modal-overlay" onClick={handleClose}>
      {(() => {
        console.log('🎯 RENDER Modal - consultoresDisponiveis:', consultoresDisponiveis.length, consultoresDisponiveis);
        console.log('🎯 RENDER Modal - dados.consultor_id:', dados.consultor_id);
        return null;
      })()}
      
      <div className="modal-content modal-edicao-expandido" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header modal-header-solido">
          <h3><Edit size={18} /> Editar Proposta</h3>
          <button onClick={handleClose} className="btn btn-close">✕</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body modal-body-expandido">
          {/* Informações Básicas */}
          <div className="secao-modal">
            <h4 className="titulo-secao">📋 Informações Básicas</h4>
            
            <div className="form-row">
              <div className="form-group">
                <label>Nome do Cliente</label>
                <input
                  type="text"
                  value={dados.nomeCliente || ''}
                  onChange={(e) => setDados({...dados, nomeCliente: formatarPrimeiraMaiuscula(e.target.value)})}
                />
              </div>
              <div className="form-group">
                <label>Apelido UC</label>
                <input
                  type="text"
                  value={dados.apelido || ''}
                  onChange={(e) => setDados({...dados, apelido: formatarPrimeiraMaiuscula(e.target.value)})}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Número UC</label>
                <input
                  type="text"
                  value={dados.numeroUC || ''}
                  onChange={(e) => setDados({...dados, numeroUC: e.target.value})}
                  readOnly
                  className="input-readonly"
                />
              </div>
              <div className="form-group">
                <label>Ligação</label>
                <select
                  value={dados.ligacao || ''}
                  onChange={(e) => {
                    console.log('🔧 Alterando ligação:', e.target.value);
                    setDados({...dados, ligacao: e.target.value});
                  }}
                >
                  <option value="">Selecione...</option>
                  <option value="MONOFÁSICA">MONOFÁSICA</option>
                  <option value="BIFÁSICA">BIFÁSICA</option>
                  <option value="TRIFÁSICA">TRIFÁSICA</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Desconto Tarifa (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  name="descontoTarifa"
                  value={(() => {
                  // ✅ PRESERVAR valor real digitado ou extrair do valor inicial
                  const valor = dados.descontoTarifa;
                  if (typeof valor === 'string' && valor.includes('%')) {
                    return parseFloat(valor.replace('%', ''));
                  }
                  return parseFloat(valor) || '';
                })()} 
                onChange={(e) => {
                  // ✅ GUARDAR apenas o número, sem formatação
                  const numeroLimpo = parseFloat(e.target.value) || 0;
                  console.log('🔧 Desconto Tarifa alterado:', numeroLimpo);
                  setDados({...dados, descontoTarifa: numeroLimpo});
                }} 
                />
              </div>
              <div className="form-group">
                <label>Desconto Bandeira (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  name="descontoBandeira"
                  value={(() => {
                  const valor = dados.descontoBandeira;
                  if (typeof valor === 'string' && valor.includes('%')) {
                    return parseFloat(valor.replace('%', ''));
                  }
                  return parseFloat(valor) || '';
                })()} 
                onChange={(e) => {
                  // ✅ GUARDAR apenas o número, sem formatação
                  const numeroLimpo = parseFloat(e.target.value) || 0;
                  console.log('🔧 Desconto Bandeira alterado:', numeroLimpo);
                  setDados({...dados, descontoBandeira: numeroLimpo});
                }} 
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Consultor Responsável</label>
                {!consultoresCarregados ? (
                  <div style={{padding: '8px', color: '#666'}}>Carregando consultores...</div>
                ) : (
                  <select
                    value={dados.consultor_id || ''}
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      const selectedConsultor = consultoresDisponiveis.find(c => c.id === selectedId);
                      
                      console.log('🔧 Alterando consultor:', {
                        id: selectedId,
                        nome: selectedConsultor?.name
                      });
                      
                      setDados({
                        ...dados, 
                        consultor_id: selectedId,
                        consultor: selectedConsultor?.name || ''
                      });
                    }}
                  >
                    <option value="">Selecione um consultor...</option>
                    {consultoresDisponiveis.map((consultor, index) => (
                      <option key={consultor.id || `sem-consultor-${index}`} value={consultor.id || ''}>
                        {consultor.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div className="form-group">
                <label>Média (kWh)</label>
                <input
                  type="number"
                  value={dados.media || ''}
                  onChange={(e) => setDados({...dados, media: parseFloat(e.target.value) || 0})}
                />
              </div>
            </div>
          </div>
          
          {/* Tipo de Documento */}
          <div className="secao-modal">
            <h4 className="titulo-secao">📄 Documentação</h4>
            <div className="form-group">
              <label>Fatura de Energia da UC</label>
              {(() => {
                const documentacao = dados.documentacao || item.documentacao || {};
                const faturas_ucs = documentacao.faturas_ucs || {};
                const numeroUC = item.numeroUC || item.numero_unidade;
                const faturaExistente = faturas_ucs[numeroUC];
                
                if (faturaExistente) {
                  return (
                    <div className="arquivo-existente">
                      <span className="arquivo-info" title={faturaExistente}>
                        📄 Fatura: {faturaExistente.length > 30 ? faturaExistente.substring(0, 30) + '...' : faturaExistente}
                      </span>
                      <div className="arquivo-acoes">
                        <button
                          type="button"
                          className="btn-visualizar-doc"
                          onClick={() => window.open(`${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/storage/propostas/faturas/${faturaExistente}`, '_blank')}
                          title="Visualizar fatura"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn-baixar-doc"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = `${process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:8000'}/storage/propostas/faturas/${faturaExistente}`;
                            link.download = faturaExistente;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                          title="Baixar fatura"
                        >
                          <Download size={14} />
                        </button>
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <span className="sem-arquivo">Nenhuma fatura carregada para esta UC</span>
                  );
                }
              })()}
            </div>
            <div className="document-type-selector">
              <label className="radio-option">
                <input
                  type="radio"
                  name="tipoDocumento"
                  value="CPF"
                  checked={dados.tipoDocumento === 'CPF'}
                  onChange={(e) => handleTipoDocumentoChange(e.target.value)}
                />
                <span>CPF</span>
              </label>
              <label className="radio-option">
                <input
                  type="radio"
                  name="tipoDocumento"
                  value="CNPJ"
                  checked={dados.tipoDocumento === 'CNPJ'}
                  onChange={(e) => handleTipoDocumentoChange(e.target.value)}
                />
                <span>CNPJ</span>
              </label>
            </div>

            {/* Campos CPF */}
            {dados.tipoDocumento === 'CPF' && (
              <div className="form-group">
                <label>Documento Pessoal (CPF, RG, CNH)</label>
                {dados.documentoPessoal ? (
                  <div className="arquivo-existente">
                    <span className="arquivo-info" title={typeof dados.documentoPessoal === 'string' ? dados.documentoPessoal : dados.documentoPessoal.name}>
                      📎 {typeof dados.documentoPessoal === 'string' ? 
                        `Doc: ${dados.documentoPessoal.length > 30 ? dados.documentoPessoal.substring(0, 30) + '...' : dados.documentoPessoal}` : 
                        `Arquivo: ${dados.documentoPessoal.name.length > 30 ? dados.documentoPessoal.name.substring(0, 30) + '...' : dados.documentoPessoal.name}`}
                    </span>
                    {typeof dados.documentoPessoal === 'string' && (
                      <div className="arquivo-acoes">
                        <button
                          type="button"
                          className="btn-visualizar-doc"
                          onClick={() => window.open(`${process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:8000'}/storage/propostas/documentos/${dados.documentoPessoal}`, '_blank')}
                          title="Visualizar documento"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          type="button"
                          className="btn-baixar-doc"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/storage/propostas/documentos/${dados.documentoPessoal}`;
                            link.download = dados.documentoPessoal;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                          title="Baixar documento"
                        >
                          <Download size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                ) : null}
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileChange('documentoPessoal', e.target.files[0])}
                />
              </div>
            )}

            {/* Campos CNPJ */}
            {dados.tipoDocumento === 'CNPJ' && (
              <div className="document-fields">
                <div className="form-row">
                  <div className="form-group">
                    <label>Razão Social</label>
                    <input
                      type="text"
                      value={dados.razaoSocial || ''}
                      onChange={(e) => setDados({...dados, razaoSocial: e.target.value})}
                    />
                  </div>
                  <div className="form-group">
                    <label>CNPJ</label>
                    <input
                      type="text"
                      value={dados.cnpj || ''}
                      onChange={(e) => setDados({...dados, cnpj: e.target.value})}
                      placeholder="00.000.000/0000-00"
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Nome do Representante da Empresa</label>
                    <input
                      type="text"
                      value={dados.nomeRepresentante || ''}
                      onChange={(e) => setDados({...dados, nomeRepresentante: e.target.value})}
                      placeholder="Nome completo do representante legal"
                    />
                  </div>
                  <div className="form-group">
                    {/* Espaço vazio para manter layout */}
                  </div>
                </div>
                
                {/* SEPARADO: Contrato Social da Empresa */}
                <div className="form-row">
                  <div className="form-group file-group">
                    <label>Contrato Social da Empresa</label>
                    {dados.contratoSocial ? (
                      <div className="arquivo-existente">
                        <span className="arquivo-info" title={typeof dados.contratoSocial === 'string' ? dados.contratoSocial : dados.contratoSocial.name}>
                          📎 {typeof dados.contratoSocial === 'string' ? 
                            `Contrato: ${dados.contratoSocial.length > 30 ? dados.contratoSocial.substring(0, 30) + '...' : dados.contratoSocial}` : 
                            `Arquivo: ${dados.contratoSocial.name.length > 30 ? dados.contratoSocial.name.substring(0, 30) + '...' : dados.contratoSocial.name}`}
                        </span>
                        {typeof dados.contratoSocial === 'string' && (
                          <div className="arquivo-acoes">
                            <button
                              type="button"
                              className="btn-visualizar-doc"
                              onClick={() => window.open(`${process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:8000'}/storage/propostas/documentos/${dados.contratoSocial}`, '_blank')}
                              title="Visualizar contrato"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              type="button"
                              className="btn-baixar-doc"
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = `${process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:8000'}/storage/propostas/documentos/${dados.contratoSocial}`;
                                link.download = dados.contratoSocial;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              }}
                              title="Baixar contrato"
                            >
                              <Download size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    ) : null}
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange('contratoSocial', e.target.files[0])}
                    />
                  </div>
                </div>
                
                {/* SEPARADO: Documento Pessoal do Representante */}
                <div className="form-row">
                  <div className="form-group file-group">
                    <label>Documento Pessoal do Representante</label>
                    {dados.documentoPessoalRepresentante ? (
                      <div className="arquivo-existente">
                        <span className="arquivo-info" title={typeof dados.documentoPessoalRepresentante === 'string' ? dados.documentoPessoalRepresentante : dados.documentoPessoalRepresentante.name}>
                          📎 {typeof dados.documentoPessoalRepresentante === 'string' ? 
                            `Doc Rep: ${dados.documentoPessoalRepresentante.length > 30 ? dados.documentoPessoalRepresentante.substring(0, 30) + '...' : dados.documentoPessoalRepresentante}` : 
                            `Arquivo: ${dados.documentoPessoalRepresentante.name.length > 30 ? dados.documentoPessoalRepresentante.name.substring(0, 30) + '...' : dados.documentoPessoalRepresentante.name}`}
                        </span>
                        {typeof dados.documentoPessoalRepresentante === 'string' && (
                          <div className="arquivo-acoes">
                            <button
                              type="button"
                              className="btn-visualizar-doc"
                              onClick={() => window.open(`${process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:8000'}/storage/propostas/documentos/${dados.documentoPessoalRepresentante}`, '_blank')}
                              title="Visualizar documento"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              type="button"
                              className="btn-baixar-doc"
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = `${process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:8000'}/storage/propostas/documentos/${dados.documentoPessoalRepresentante}`;
                                link.download = dados.documentoPessoalRepresentante;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              }}
                              title="Baixar documento"
                            >
                              <Download size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    ) : null}
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange('documentoPessoalRepresentante', e.target.files[0])}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Campos comuns para ambos */}
            <div className="common-fields">
              <div className="form-row">
                <div className="form-group">
                  <label>Endereço da UC</label>
                  <input
                    type="text"
                    value={dados.enderecoUC || ''}
                    onChange={(e) => setDados({...dados, enderecoUC: e.target.value})}
                    placeholder="Rua, número, bairro, cidade, CEP"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group checkbox-group-modal">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={dados.isArrendamento || false}
                      onChange={(e) => setDados({...dados, isArrendamento: e.target.checked})}
                    />
                    <span>Este endereço é arrendamento</span>
                  </label>
                </div>
              </div>
              {/* Contrato de Locação - COM ÍCONES LUCIDE */}
              {dados.isArrendamento && (
                <div className="form-row">
                  <div className="form-group file-group">
                    <label>Contrato de Locação</label>
                    {dados.contratoLocacao ? (
                      <div className="arquivo-existente">
                        <span className="arquivo-info" title={typeof dados.contratoLocacao === 'string' ? dados.contratoLocacao : dados.contratoLocacao.name}>
                          📎 {typeof dados.contratoLocacao === 'string' ? 
                            `Locação: ${dados.contratoLocacao.length > 30 ? dados.contratoLocacao.substring(0, 30) + '...' : dados.contratoLocacao}` : 
                            `Arquivo: ${dados.contratoLocacao.name.length > 30 ? dados.contratoLocacao.name.substring(0, 30) + '...' : dados.contratoLocacao.name}`}
                        </span>
                        {typeof dados.contratoLocacao === 'string' && (
                          <div className="arquivo-acoes">
                            <button
                              type="button"
                              className="btn-visualizar-doc"
                              onClick={() => window.open(`${process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:8000'}/storage/propostas/documentos/${dados.contratoLocacao}`, '_blank')}
                              title="Visualizar contrato"
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              type="button"
                              className="btn-baixar-doc"
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = `${process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:8000'}/storage/propostas/documentos/${dados.contratoLocacao}`
                                link.download = dados.contratoLocacao;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              }}
                              title="Baixar contrato"
                            >
                              <Download size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    ) : null}
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange('contratoLocacao', e.target.files[0])}
                    />
                  </div>
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label>Endereço do Representante</label>
                  <input
                    type="text"
                    value={dados.enderecoRepresentante || ''}
                    onChange={(e) => setDados({...dados, enderecoRepresentante: e.target.value})}
                    placeholder="Rua, número, bairro, cidade, CEP"
                  />
                </div>
              </div>

              {/* Termo de Adesão - COM ÍCONES LUCIDE */}
              <div className="form-row">
                <div className="form-group file-group">
                  <label>Termo de Adesão Assinado</label>
                  <div className="file-with-download">
                    <button
                      type="button"
                      className="btn-download-termo"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = '/documentos/TERMO-AUPUS.pdf';
                        link.download = 'TERMO-AUPUS.pdf';
                        link.click();
                      }}
                      title="Baixar Termo de Adesão Padrão"
                    >
                      📄 Baixar Termo Padrão
                    </button>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange('termoAdesao', e.target.files[0])}
                    />
                  </div>
                  {dados.termoAdesao ? (
                    <div className="arquivo-existente">
                      <span className="arquivo-info" title={typeof dados.termoAdesao === 'string' ? dados.termoAdesao : dados.termoAdesao.name}>
                        📎 {typeof dados.termoAdesao === 'string' ? 
                          `Termo: ${dados.termoAdesao.length > 30 ? dados.termoAdesao.substring(0, 30) + '...' : dados.termoAdesao}` : 
                          `Arquivo: ${dados.termoAdesao.name.length > 30 ? dados.termoAdesao.name.substring(0, 30) + '...' : dados.termoAdesao.name}`}
                      </span>
                      {typeof dados.termoAdesao === 'string' && (
                        <div className="arquivo-acoes">
                          <button
                            type="button"
                            className="btn-visualizar-doc"
                            onClick={() => window.open(`${process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:8000'}/storage/propostas/documentos/${dados.termoAdesao}`, '_blank')}
                            title="Visualizar termo"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            type="button"
                            className="btn-baixar-doc"
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = `${process.env.REACT_APP_API_URL?.replace('/api', '') || 'http://localhost:8000'}/storage/propostas/documentos/${dados.termoAdesao}`;
                              link.download = dados.termoAdesao;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }}
                            title="Baixar termo"
                          >
                            <Download size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          {/* Status no final */}
          <div className="secao-modal">
            <h4 className="titulo-secao">📊 Status da Proposta</h4>
            <div className="form-row">
              <div className="form-group">
                <label>Status</label>
                <select
                  value={dados.status || 'Aguardando'}
                  onChange={(e) => setDados({...dados, status: e.target.value})}
                >
                  <option value="Aguardando">Aguardando</option>
                  <option value="Fechada">Fechada</option>
                  <option value="Cancelada">Cancelada</option>
                  <option value="Recusada">Recusada</option>
                </select>
              </div>
              <div className="form-group">
                <div className="status-help">
                  <small>
                    <strong>Atenção:</strong> Para definir como "Fechado", todos os campos de documentação devem estar preenchidos.
                  </small>
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button 
              type="submit" 
              className={`btn btn-primary ${loading ? 'btn-loading' : ''}`}
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="loading-spinner-inline"></div>
                  Salvando...
                </>
              ) : (
                <>💾 Salvar Alterações</>
              )}
            </button>
            <button 
              type="button" 
              onClick={handleClose} 
              className="btn btn-secondary"
              disabled={loading}
            >
              ❌ Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
  

};

export default ProspecPage;