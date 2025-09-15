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
import GerarTermoButton from '../components/GerarTermoButton';
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
} from 'lucide-react';

const getApiBaseUrl = () => {
  return process.env.REACT_APP_API_URL?.replace('/api', '');
};

const getApiUrl = () => {
  return process.env.REACT_APP_API_URL;
};

const construirUrlDocumento = (nomeArquivo) => {
  if (!nomeArquivo) return '';
  
  // Construir URL base removendo "/api" apenas do final
  const apiUrl = process.env.REACT_APP_API_URL;
  const baseUrl = apiUrl.replace(/\/api$/, ''); // Remove "/api" apenas se estiver no final
  
  return `${baseUrl}/storage/propostas/documentos/${nomeArquivo}`;
};

// Função para visualizar documento
const visualizarDocumento = (nomeArquivo) => {
  if (!nomeArquivo) {
    console.warn('Nome do arquivo não fornecido para visualização');
    return;
  }
  
  const url = construirUrlDocumento(nomeArquivo);
  window.open(url, '_blank');
  console.log('Documento aberto em nova aba:', url);
};

// Componente simplificado - APENAS botão de visualizar
const BotoesDocumento = ({ nomeArquivo, tipoArquivo }) => {
  if (!nomeArquivo || typeof nomeArquivo !== 'string') {
    return null;
  }

  return (
    <div className="arquivo-acoes">
      <button
        type="button"
        className="btn-visualizar-doc"
        onClick={() => visualizarDocumento(nomeArquivo)}
        title={`Visualizar ${tipoArquivo}`}
      >
        <Eye size={14} />
      </button>
    </div>
  );
};

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
      
      if (user?.role === 'admin') {
        const consultores = team.filter(member => member.role === 'consultor');
        
        const listaFinal = [
          ...consultores.map(member => ({ id: member.id, name: member.name })),
          { id: null, name: 'Sem consultor (AUPUS direto)' }
        ];
                        
        setConsultoresDisponiveis(listaFinal);
      } else if (user?.role === 'consultor') {
        const funcionarios = team.filter(member => 
          member.role === 'gerente' || member.role === 'vendedor'
        );
        const listaFinal = [
          { id: user.id, name: user.name },
          ...funcionarios.map(member => ({ id: member.id, name: member.name }))
        ];
        setConsultoresDisponiveis(listaFinal);
      } else if (user?.role === 'gerente') {
        const vendedores = team.filter(member => 
          member.role === 'vendedor'
        );
        const listaFinal = [
          { id: user.id, name: user.name },
          ...vendedores.map(member => ({ id: member.id, name: member.name }))
        ];
        setConsultoresDisponiveis(listaFinal);
      } else if (user?.role === 'vendedor') {
        const listaFinal = [{ id: user.id, name: user.name }];
        setConsultoresDisponiveis(listaFinal);
      }
    } catch (error) {
      console.error('Erro ao carregar consultores:', error);
      setConsultoresDisponiveis([{ id: user?.id, name: user?.name || 'Erro' }]);
    }
  }, [user, getMyTeam]);

    useEffect(() => {
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
      documentacao: item.documentacao,
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
      logradouroUC: documentacaoUC.logradouroUC || documentacaoUC.logradouro_uc || '',
      termoAdesao: documentacaoUC.termoAdesao || null,
      whatsappRepresentante: documentacaoUC.whatsappRepresentante || '', 
      emailRepresentante: documentacaoUC.emailRepresentante || '' 
    };
    
    console.log('🔍 Item final com documentação:', itemComDocumentacao);
    
    setModalEdicao({ show: true, item: itemComDocumentacao, index });
  };

  const visualizarItem = (index) => {
    const item = dadosFiltrados[index];
    if (!item) return;
    setModalVisualizacao({ show: true, item });
  };

  // CORREÇÃO: Remover as linhas problemáticas da função salvarEdicao
  // Substituir a função salvarEdicao existente por esta versão corrigida:

  const salvarEdicao = async (dadosAtualizados) => {
    setLoading(true);
    
    try {
      const { item } = modalEdicao;
      const propostaId = item.propostaId || item.id?.split('-')[0];
      
      if (!propostaId) {
        showNotification('ID da proposta não encontrado para edição', 'error');
        return;
      }

      // ✅ UPLOAD DE ARQUIVOS (mantém como está)
      const camposArquivo = [
        'documentoPessoal', 'contratoSocial', 'documentoPessoalRepresentante',
        'contratoLocacao', 'termoAdesao'
      ];
      
      const documentacaoFinal = { ...dadosAtualizados };
      
      for (const campo of camposArquivo) {
        if (dadosAtualizados[campo] && dadosAtualizados[campo] instanceof File) {
          try {
            const formData = new FormData();
            formData.append('arquivo', dadosAtualizados[campo]);
            formData.append('numeroUC', item.numeroUC || item.numero_unidade);
            formData.append('tipoDocumento', campo);

            const response = await fetch(`${process.env.REACT_APP_API_URL}/propostas/${propostaId}/upload-documento`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('aupus_token')}`
              },
              body: formData
            });

            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`);
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

      // ✅ DADOS LIMPOS - SEM DUPLICAÇÕES
      const dadosLimpos = {
        // Dados básicos
        nomeCliente: dadosAtualizados.nomeCliente,
        apelido: dadosAtualizados.apelido,
        ligacao: dadosAtualizados.ligacao,
        media: dadosAtualizados.media,
        distribuidora: dadosAtualizados.distribuidora,
        status: dadosAtualizados.status,
        numeroProposta: dadosAtualizados.numeroProposta,
        data: dadosAtualizados.data,
        observacoes: dadosAtualizados.observacoes || item.observacoes,
        
        // ✅ CONSULTOR E RECORRÊNCIA - APENAS UMA VEZ
        consultor_id: dadosAtualizados.consultor_id || null,
        consultor: dadosAtualizados.consultor || '',
        recorrencia: dadosAtualizados.recorrencia || (dadosAtualizados.consultor_id ? 1 : 0),
        
        // Descontos
        descontoTarifa: dadosAtualizados.descontoTarifa,
        descontoBandeira: dadosAtualizados.descontoBandeira,
        
        // Contatos
        whatsappRepresentante: dadosAtualizados.whatsappRepresentante,
        emailRepresentante: dadosAtualizados.emailRepresentante,
        logradouroUC: dadosAtualizados.logradouroUC,
        
        // IDs
        propostaId: propostaId,
        numeroUC: item.numeroUC || item.numero_unidade,
        
        // Documentação
        documentacao: {
          tipoDocumento: documentacaoFinal.tipoDocumento,
          nomeRepresentante: documentacaoFinal.nomeRepresentante,
          cpf: documentacaoFinal.cpf,
          documentoPessoal: documentacaoFinal.documentoPessoal,
          razaoSocial: documentacaoFinal.razaoSocial,
          cnpj: documentacaoFinal.cnpj,
          contratoSocial: documentacaoFinal.contratoSocial,
          logradouroUC: documentacaoFinal.logradouroUC,
          documentoPessoalRepresentante: documentacaoFinal.documentoPessoalRepresentante,
          enderecoUC: documentacaoFinal.enderecoUC,
          isArrendamento: documentacaoFinal.isArrendamento,
          contratoLocacao: documentacaoFinal.contratoLocacao,
          enderecoRepresentante: documentacaoFinal.enderecoRepresentante,
          termoAdesao: documentacaoFinal.termoAdesao,
          whatsappRepresentante: documentacaoFinal.whatsappRepresentante,
          emailRepresentante: documentacaoFinal.emailRepresentante
        },
        
        // Benefícios
        beneficios: item.beneficios || []
      };

      await storageService.atualizarProspec(propostaId, dadosLimpos);
      
      // ✅ REFRESH DOS DADOS
      console.log('🔄 Atualizando dados automaticamente após salvamento...');
      await loadPropostas(1, propostas.filters, true);
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
            loading={loading}
            setLoading={setLoading} 
            consultoresDisponiveis={consultoresDisponiveis}
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
const ModalEdicao = ({ item, onSave, onClose, loading, setLoading, consultoresDisponiveis }) => {
  const { user, getMyTeam } = useAuth(); 
  const { showNotification } = useNotification();
  const [statusDocumento, setStatusDocumento] = useState(null);
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

  const buscarStatusDocumento = async () => {
    if (!item?.propostaId && !item?.id) return;
    
    const propostaId = item.propostaId || item.id?.split('-')[0];
    if (!propostaId) return;
    
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/documentos/propostas/${propostaId}/status`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('aupus_token')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const result = await response.json();
        setStatusDocumento(result.documento);
      }
    } catch (error) {
      console.error('Erro ao buscar status do documento:', error);
    }
  };

  // ADICIONAR useEffect para buscar status:
  useEffect(() => {
    buscarStatusDocumento();
  }, [item?.propostaId, item?.id]);
  
  const [faturaArquivo, setFaturaArquivo] = useState(null);


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
    
    if (dados.consultor_id === null || dados.consultor_id === '') {
      dados.recorrencia = 0;
      dados.consultor_id = null;
      dados.consultor = 'Sem consultor';
    }

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
      // ✅ FAZER UPLOAD DA FATURA PRIMEIRO (DENTRO DO MODAL)
      if (faturaArquivo && (item.numeroUC || item.numero_unidade)) {
        try {
          console.log('📤 Fazendo upload da fatura da UC...');
          
          const propostaId = item.propostaId || item.id?.split('-')[0];
          const numeroUC = item.numeroUC || item.numero_unidade;
          const formData = new FormData();
          formData.append('arquivo', faturaArquivo);
          formData.append('numeroUC', String(numeroUC));
          formData.append('tipoDocumento', 'faturaUC');

          const response = await fetch(`${process.env.REACT_APP_API_URL}/propostas/${propostaId}/upload-documento`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('aupus_token')}`
            },
            body: formData
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Erro no upload da fatura: HTTP ${response.status}`);
          }

          const result = await response.json();
          console.log('✅ Fatura da UC enviada com sucesso:', result.nomeArquivo);
          showNotification(`Fatura da UC ${numeroUC} enviada com sucesso!`, 'success');
          setFaturaArquivo(null);
          
        } catch (error) {
          console.error('❌ Erro ao enviar fatura da UC:', error);
          showNotification(`Erro ao enviar fatura da UC: ${error.message}`, 'error');
          setLoading(false);
          return;
        }
      }

      const dadosCompletos = {
        ...dados,
        consultor_id: dados.consultor_id || null,
        consultor: dados.consultor || '',
        id: dados.id || dados.propostaId,
        propostaId: dados.propostaId || dados.id
      };

      console.log('📤 Dados enviados no handleSubmit:', {
        id: dadosCompletos.id,
        consultor: dadosCompletos.consultor,
        nomeCliente: dadosCompletos.nomeCliente,
        status: dadosCompletos.status
      });

      await onSave(dadosCompletos);
      
    } catch (error) {
      console.error('❌ Erro ao salvar proposta:', error);
      showNotification(`Erro ao salvar: ${error.message || 'Erro desconhecido'}`, 'error');
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

  const handleFaturaUpload = (file) => {
    console.log('📁 Fatura selecionada:', file?.name);
    
    if (file) {
      const allowedTypes = ['application/pdf'];
      const maxSize = 10 * 1024 * 1024; // 10MB
      
      if (!allowedTypes.includes(file.type)) {
        alert('Apenas arquivos PDF são permitidos para faturas');
        return;
      }
      
      if (file.size > maxSize) {
        alert('Arquivo muito grande. Tamanho máximo: 10MB');
        return;
      }
    }
    
    setFaturaArquivo(file);
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
                {!consultoresDisponiveis || consultoresDisponiveis.length === 0 ? (
                  <div style={{padding: '8px', color: '#666'}}>Carregando consultores...</div>
                ) : (
                  <select
                    value={dados.consultor_id === null ? 'null' : (dados.consultor_id || '')}
                    onChange={(e) => {
                      const selectedValue = e.target.value;
                      const selectedId = selectedValue === 'null' ? null : (selectedValue === '' ? null : selectedValue);
                      const selectedConsultor = consultoresDisponiveis.find(c => c.id === selectedId);
                      
                      console.log('🔧 Alterando consultor:', {
                        value: selectedValue,
                        id: selectedId,
                        nome: selectedConsultor?.name
                      });
                      
                      if (selectedId === null) {
                        setDados({
                          ...dados, 
                          consultor_id: null,
                          consultor: 'Sem consultor',
                          recorrencia: 0
                        });
                      } else {
                        setDados({
                          ...dados, 
                          consultor_id: selectedId,
                          consultor: selectedConsultor.name,
                          recorrencia: dados.recorrencia || 1
                        });
                      }
                    }}
                  >
                    <option value="">Selecione um consultor...</option>
                    {/* ✅ APENAS ADMIN vê esta opção */}
                    {user?.role === 'admin' && (
                      <option value="null">Sem consultor (AUPUS direto)</option>
                    )}
                    {consultoresDisponiveis
                      .filter(consultor => consultor.id !== null)
                      .map((consultor, index) => (
                      <option key={consultor.id || `consultor-${index}`} value={consultor.id}>
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
              
              {/* ✅ NOVO INPUT DE UPLOAD */}
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => handleFaturaUpload(e.target.files[0])}
                title="Selecione a fatura da UC em formato PDF"
              />
              
              {/* ✅ MOSTRAR ARQUIVO SELECIONADO PARA UPLOAD */}
              {faturaArquivo && (
                <div className="arquivo-selecionado">
                  <span className="arquivo-info" title={faturaArquivo.name}>
                    📄 Novo arquivo: {faturaArquivo.name.length > 30 ? faturaArquivo.name.substring(0, 30) + '...' : faturaArquivo.name}
                  </span>
                  <button
                    type="button"
                    className="btn-remover-arquivo"
                    onClick={() => setFaturaArquivo(null)}
                    title="Remover arquivo selecionado"
                  >
                    ✕
                  </button>
                </div>
              )}
              
              {/* ✅ MOSTRAR FATURA EXISTENTE (se houver) */}
              {(() => {
                const documentacao = dados.documentacao || item.documentacao || {};
                const faturas_ucs = documentacao.faturas_ucs || {};
                const numeroUC = item.numeroUC || item.numero_unidade;
                const faturaExistente = faturas_ucs[numeroUC];
                
                if (faturaExistente) {
                  return (
                    <div className="arquivo-existente">
                      <span className="arquivo-info" title={faturaExistente}>
                        📄 Fatura atual: {faturaExistente.length > 30 ? faturaExistente.substring(0, 30) + '...' : faturaExistente}
                      </span>
                      <div className="arquivo-acoes">
                        <button
                          type="button"
                          className="btn-visualizar-doc"
                          onClick={() => window.open(`${process.env.REACT_APP_API_URL.replace('/api', '') }/storage/propostas/faturas/${faturaExistente}`, '_blank')}
                          title="Visualizar fatura"
                        >
                          <Eye size={14} />
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

            {/* Seletor de Tipo de Documento */}
            <div className="document-type-selector">
              <label className="radio-option">
                <input 
                  type="radio" 
                  name="tipoDocumento" 
                  value="CPF" 
                  checked={dados.tipoDocumento === 'CPF'}
                  onChange={() => handleTipoDocumentoChange('CPF')}
                />
                <span>Pessoa Física (CPF)</span>
              </label>
              <label className="radio-option">
                <input 
                  type="radio" 
                  name="tipoDocumento" 
                  value="CNPJ" 
                  checked={dados.tipoDocumento === 'CNPJ'}
                  onChange={() => handleTipoDocumentoChange('CNPJ')}
                />
                <span>Pessoa Jurídica (CNPJ)</span>
              </label>
            </div>

            {/* Campos CPF */}
            {dados.tipoDocumento === 'CPF' && (
              <div className="document-fields">
                <div className="form-row">
                  <div className="form-group">
                    <label>Nome do Representante Legal</label>
                    <input
                      type="text"
                      value={dados.nomeRepresentante || ''}
                      onChange={(e) => setDados({...dados, nomeRepresentante: e.target.value})}
                      placeholder="Nome completo do representante"
                    />
                  </div>
                  <div className="form-group">
                    <label>CPF</label>
                    <input
                      type="text"
                      value={dados.cpf || ''}
                      onChange={(e) => setDados({...dados, cpf: e.target.value})}
                      placeholder="000.000.000-00"
                    />
                  </div>
                </div>
                
                {/* Documento Pessoal */}
                <div className="form-row">
                  <div className="form-group file-group">
                    <label>Documento Pessoal (RG/CNH)</label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange('documentoPessoal', e.target.files[0])}
                    />
                    {dados.documentoPessoal ? (
                      <div className="arquivo-existente">
                        <span className="arquivo-info" title={typeof dados.documentoPessoal === 'string' ? dados.documentoPessoal : dados.documentoPessoal.name}>
                          📎 {typeof dados.documentoPessoal === 'string' ? 
                            `Doc: ${dados.documentoPessoal.length > 30 ? dados.documentoPessoal.substring(0, 30) + '...' : dados.documentoPessoal}` : 
                            `Arquivo: ${dados.documentoPessoal.name.length > 30 ? dados.documentoPessoal.name.substring(0, 30) + '...' : dados.documentoPessoal.name}`}
                        </span>
                        {typeof dados.documentoPessoal === 'string' && (
                          <BotoesDocumento 
                            nomeArquivo={dados.documentoPessoal} 
                            tipoArquivo="documento pessoal"
                          />
                        )}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            )}
            
            {/* Campos CNPJ - MANTÉM O MESMO */}
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
                
                {/* Arquivos CNPJ */}
                <div className="form-row">
                  <div className="form-group file-group">
                    <label>Contrato Social da Empresa</label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange('contratoSocial', e.target.files[0])}
                    />
                    {dados.contratoSocial ? (
                      <div className="arquivo-existente">
                        <span className="arquivo-info">📎 Contrato Social</span>
                        <BotoesDocumento 
                          nomeArquivo={dados.contratoSocial} 
                          tipoArquivo="contrato social"
                        />
                      </div>
                    ) : null}
                  </div>
                  <div className="form-group file-group">
                    <label>Documento do Representante</label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange('documentoPessoalRepresentante', e.target.files[0])}
                    />
                    {dados.documentoPessoalRepresentante ? (
                      <div className="arquivo-existente">
                        <span className="arquivo-info">📎 Doc. Representante</span>
                        <BotoesDocumento 
                          nomeArquivo={dados.documentoPessoalRepresentante} 
                          tipoArquivo="documento representante"
                        />
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            )}

            <div className="common-fields">
              <div className="endereco-logradouro-grid">

                <div className="endereco-column">
                  <div className="form-group">
                    <label>Endereço da UC</label>
                    <input
                      type="text"
                      value={dados.enderecoUC || ''}
                      onChange={(e) => setDados({...dados, enderecoUC: e.target.value})}
                      placeholder="Endereço resumido da Unidade Consumidora"
                    />
                  </div>
                  <div className="logradouro-column">
                    <div className="form-group logradouro-field">
                      <label>Logadouro da UC</label>
                      <textarea
                        value={dados.logradouroUC || ''}
                        onChange={(e) => setDados({...dados, logradouroUC: e.target.value})}
                        placeholder="Descrição detalhada do logradouro, idêntico ao que está na fatura da Equatorial"
                        rows="6"
                      ></textarea>
                    </div>
                  </div>
                  {dados.isArrendamento && (
                    <div className="common-fields">
                      <div className="form-row">
                        <div className="form-group file-group">
                          <label>Contrato de Locação/Arrendamento</label>
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => handleFileChange('contratoLocacao', e.target.files[0])}
                          />
                          {dados.contratoLocacao ? (
                            <div className="arquivo-existente">
                              <span className="arquivo-info">📎 Contrato de Locação</span>
                              <BotoesDocumento 
                                nomeArquivo={dados.contratoLocacao} 
                                tipoArquivo="contrato locação"
                              />
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="form-group checkbox-group">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={dados.isArrendamento || false}
                        onChange={(e) => setDados({...dados, isArrendamento: e.target.checked})}
                      />
                      <span className="checkmark"></span>
                      UC em Arrendamento
                    </label>
                  </div>
                  <div className="form-group">
                    <label>Endereço do Representante</label>
                    <input
                      type="text"
                      value={dados.enderecoRepresentante || ''}
                      onChange={(e) => setDados({...dados, enderecoRepresentante: e.target.value})}
                      placeholder="Endereço completo do representante"
                    />
                  </div>
                </div>
              </div>
              
              {/* Termo de Adesão - COM ÍCONES LUCIDE */}
              <div className="form-row">
                <div className="form-group file-group">
                  <label>Termo de Adesão</label>
                  <div className="form-row">
                    {/* WhatsApp do Representante */}
                    <div className="form-group">
                      <label>WhatsApp do receptor do Termo</label>
                      <input
                        type="tel"
                        value={dados.whatsappRepresentante || ''}
                        onChange={(e) => setDados({...dados, whatsappRepresentante: e.target.value})}
                        placeholder="(00) 00000-0000"
                      />
                    </div>

                    {/* Email do Representante */}
                    <div className="form-group">
                      <label>Email do receptor do Termo</label>
                      <input
                        type="email"
                        value={dados.emailRepresentante || ''}
                        onChange={(e) => setDados({...dados, emailRepresentante: e.target.value})}
                        placeholder="email@exemplo.com"
                      />
                    </div>
                  </div>
                  <div className="file-with-download">
                    <div className="secao-modal">
                      <h4 className="titulo-secao">📄 Termo de Adesão</h4>
                      <GerarTermoButton
                        proposta={item}
                        dados={dados}
                        onSalvarAntes={async (dadosParaSalvar) => {
                          // Salvar antes de gerar o termo
                          await onSave(dadosParaSalvar); // ← USAR 'onSave' em vez de 'salvarEdicao'
                        }}
                      />
                    </div>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange('termoAdesao', e.target.files[0])}
                    />
                  </div>
                  {statusDocumento && statusDocumento.status === 'Assinado' && (
                    <div className="form-group">
                      <label className="label-with-icon">
                        <FileText size={16} />
                        Termo Assinado
                      </label>
                      <div className="arquivo-existente">
                        <span className="arquivo-info">
                          ✅ Termo assinado em {statusDocumento.data_assinatura || statusDocumento.atualizado_em}
                        </span>
                        <div style={{display: 'flex', gap: '4px'}}>
                          <button
                            type="button"
                            className="btn-visualizar-doc"
                            onClick={() => window.open(`${process.env.REACT_APP_API_URL}/documentos/propostas/${dados.propostaId}/pdf-assinado`, '_blank')}
                            title="Visualizar PDF assinado"
                          >
                            👁️
                          </button>
                          <button
                            type="button" 
                            className="btn-baixar-doc"
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = `${process.env.REACT_APP_API_URL}/documentos/propostas/${dados.propostaId}/pdf-assinado`;
                              link.download = `termo_assinado_${dados.numeroUC}.pdf`;
                              link.click();
                            }}
                            title="Baixar PDF assinado"
                          >
                            ⬇️
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                  {dados.termoAdesao ? (
                    <div className="arquivo-existente">
                      <span className="arquivo-info" title={typeof dados.termoAdesao === 'string' ? dados.termoAdesao : dados.termoAdesao.name}>
                        📎 {typeof dados.termoAdesao === 'string' ? 
                          `Termo: ${dados.termoAdesao.length > 30 ? dados.termoAdesao.substring(0, 30) + '...' : dados.termoAdesao}` : 
                          `Arquivo: ${dados.termoAdesao.name.length > 30 ? dados.termoAdesao.name.substring(0, 30) + '...' : dados.termoAdesao.name}`}
                      </span>
                      {typeof dados.termoAdesao === 'string' && (
                        <BotoesDocumento 
                          nomeArquivo={dados.termoAdesao} 
                          tipoArquivo="termo de adesão"
                        />
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