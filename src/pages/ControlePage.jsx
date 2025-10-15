// src/pages/ControlePage.jsx - Com calibragem no estilo original restaurada
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import '../styles/common/index.css';
import Header from '../components/common/Header';
import Navigation from '../components/common/Navigation';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import storageService from '../services/storageService';
import apiService from '../services/apiService';
import ModalFiltrosExportacao from '../components/ModalFiltrosExportacao';
import exportExcelService from '../services/exportExcelService';
import { useData } from '../context/DataContext';
import {
  Database,
  Users,
  AlertTriangle,
  CheckCircle,
  Circle,
  Edit,
  Clock,
  Home,
  Settings,
  Target,
  Building,
  Zap,
  Percent,
  TrendingUp,
  Flag,
  X,
  FileText,
  Save,
  Download,
  Eye,
  Trash2
} from 'lucide-react';
import './ControlePage.css';
import './CommonModalsPagesDark.css';
import '../components/common/CommonModal.css';

const ControlePage = () => {
  const { user, getMyTeam, getConsultorName } = useAuth();
    const { 
    controle, 
    loadControle,
    ugs,
    loadUgs,
    calibragem, 
    loadCalibragem,
    dashboard 
  } = useData();

  const calibragemGlobal = calibragem.valor;
  const isAdminOrAnalista = user?.role === 'admin' || user?.role === 'analista';
  const loadingUgsRef = useRef(false); 

  const [calibragemTemp, setCalibragemTemp] = useState(calibragemGlobal);

  // ✅ ADICIONAR useEffect para carregar calibragem quando necessário
  useEffect(() => {
    if (isAdminOrAnalista && calibragem.valor === 0 && !calibragem.loading) {
      loadCalibragem();
    }
  }, [isAdminOrAnalista, calibragem.valor, calibragem.loading, loadCalibragem]);

  const [ugsDisponiveis, setUgsDisponiveis] = useState([]);
  const [modalUG, setModalUG] = useState({ show: false, item: null, index: -1 });
  const [modalStatusTroca, setModalStatusTroca] = useState({ show: false, item: null, index: -1 });
  const [modalUCDetalhes, setModalUCDetalhes] = useState({ show: false, item: null, index: -1 });
  const [modalExclusao, setModalExclusao] = useState({ show: false, item: null, index: -1 });
  const [filtros, setFiltros] = useState({
    consultor: '',
    ug: '',
    busca: '',
    statusTroca: '' 
  });

  const { showNotification } = useNotification();
  const debouncedFiltros = useMemo(() => filtros, [filtros]);

  const abrirModalExportacao = () => {
    setModalExportacao(true);
  };

  const executarExportacao = async (filtros) => {
    try {
      setLoading(true);
      showNotification('Preparando exportação Excel do controle...', 'info');

      // Buscar todos os dados conforme permissão do usuário
      let todosOsDados;
      if (user?.role === 'admin' || user?.role === 'analista') {
        todosOsDados = await storageService.getControle();
      } else {
        const dadosCompletos = await storageService.getControle();
        todosOsDados = dadosCompletos;
      }

      // Transformar dados para formato esperado pelo Excel
      const dadosParaExportacao = todosOsDados.map(item => ({
        id: item.id,
        controle_id: item.id,
        consultorNome: item.consultor || item.consultorNome,
        numeroUC: item.numeroUC || item.numero_unidade || item.numero_uc,
        apelido: item.apelido || item.apelido_uc,
        consumoMedio: item.consumoMedio || item.consumo_medio,
        // ✅ CORREÇÃO: Usar descontos corretos do controle ou proposta
        // Prioridade: desconto do controle > desconto da proposta
        economia: item.desconto_tarifa || item.proposta_desconto_tarifa || '20%',
        bandeira: item.desconto_bandeira || item.proposta_desconto_bandeira || '20%',
        contribuicao: item.contribuicao || 'N/A',
        comissaoPercentual: item.comissaoPercentual || item.comissao_percentual || 5,
        dataEntradaControle: item.dataEntradaControle || item.data_entrada_controle,
        statusTroca: item.statusTroca || item.status_troca || 'Pendente',
        dataTitularidade: item.dataTitularidade || item.data_titularidade,
        observacoes: item.observacoes || ''
      }));

      const resultado = await exportExcelService.exportarControleParaExcel(dadosParaExportacao, filtros);
      showNotification(`Exportação Excel concluída! ${resultado.totalRegistros} registros exportados em ${resultado.arquivo}`, 'success');
      
    } catch (error) {
      console.error('❌ Erro na exportação:', error);
      showNotification(`Erro na exportação: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const [modalExportacao, setModalExportacao] = useState(false);
  const [loading, setLoading] = useState(false);

  // ✅ NOVO: Exportar relatório de associados
  const exportarAssociados = async () => {
    try {
      setLoading(true);
      showNotification('Preparando relatório de associados...', 'info');

      // Buscar todos os dados
      let todosOsDados;
      if (user?.role === 'admin' || user?.role === 'analista') {
        todosOsDados = await storageService.getControle();
      } else {
        const dadosCompletos = await storageService.getControle();
        todosOsDados = dadosCompletos;
      }

      // ✅ FILTRAR apenas registros com status_troca = "Associado"
      const dadosAssociados = todosOsDados.filter(item => {
        const status = item.statusTroca || item.status_troca || '';
        return status === 'Associado';
      });

      if (dadosAssociados.length === 0) {
        showNotification('Nenhuma UC associada encontrada!', 'warning');
        return;
      }

      // ✅ BUSCAR DADOS COMPLETOS DE TODAS AS UCs DE UMA VEZ (BULK)
      const apiUrl = process.env.REACT_APP_API_URL || '';
      const token = localStorage.getItem('aupus_token') || localStorage.getItem('auth_token');

      console.log(`📊 Buscando dados de ${dadosAssociados.length} associados em lote...`);

      // Extrair todos os IDs de controle
      const controleIds = dadosAssociados.map(item => item.id || item.controle_id);

      let dadosEnriquecidos = [];

      try {
        // Buscar todos os dados de uma vez via endpoint bulk
        const response = await fetch(`${apiUrl}/controle/bulk-uc-detalhes`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ controle_ids: controleIds })
        });

        if (response.ok) {
          const data = await response.json();

          if (data.success && data.data) {
            console.log(`✅ Dados de ${Object.keys(data.data).length} controles recebidos da API`);

            // Mapear os dados recebidos com os dados originais
            dadosEnriquecidos = dadosAssociados.map(item => {
              const controleId = item.id || item.controle_id;
              const dadosAPI = data.data[controleId];

              if (dadosAPI) {
                return {
                  numero_unidade: dadosAPI.numero_unidade || item.numeroUC || '',
                  nome_cliente: dadosAPI.nome_cliente || '',
                  apelido: dadosAPI.apelido || '',
                  consumo_medio: dadosAPI.consumo_medio || 0,
                  desconto_tarifa: dadosAPI.desconto_tarifa || '20%',
                  desconto_bandeira: dadosAPI.desconto_bandeira || '20%',
                  cpf_cnpj: dadosAPI.cpf_cnpj || 'N/A',
                  consultor_nome: dadosAPI.consultor_nome || '',
                  ug_nome: dadosAPI.ug_nome || '',
                  ligacao: dadosAPI.ligacao || '',
                  enderecoCompleto: dadosAPI.endereco_completo || ''
                };
              }

              // Fallback para dados originais se não houver dados da API
              return {
                numero_unidade: item.numeroUC || item.numero_unidade || '',
                nome_cliente: item.nome_cliente || item.nomeCliente || '',
                apelido: item.apelido || '',
                consumo_medio: item.consumoMedio || item.consumo_medio || 0,
                desconto_tarifa: item.desconto_tarifa || item.proposta_desconto_tarifa || '20%',
                desconto_bandeira: item.desconto_bandeira || item.proposta_desconto_bandeira || '20%',
                cpf_cnpj: item.cpf_cnpj || item.documento || 'N/A',
                consultor_nome: item.consultor || item.consultorNome || '',
                ug_nome: item.ug_nome || '',
                ligacao: item.ligacao || '',
                enderecoCompleto: ''
              };
            });
          }
        } else {
          console.warn('⚠️ Erro ao buscar dados em lote, usando dados básicos');
          // Usar dados básicos em caso de erro
          dadosEnriquecidos = dadosAssociados.map(item => ({
            numero_unidade: item.numeroUC || item.numero_unidade || '',
            nome_cliente: item.nome_cliente || item.nomeCliente || '',
            apelido: item.apelido || '',
            consumo_medio: item.consumoMedio || item.consumo_medio || 0,
            desconto_tarifa: item.desconto_tarifa || '20%',
            desconto_bandeira: item.desconto_bandeira || '20%',
            cpf_cnpj: 'N/A',
            consultor_nome: item.consultor || '',
            ug_nome: '',
            ligacao: item.ligacao || '',
            enderecoCompleto: ''
          }));
        }
      } catch (error) {
        console.error('❌ Erro ao buscar dados em lote:', error);
        // Usar dados básicos em caso de erro
        dadosEnriquecidos = dadosAssociados.map(item => ({
          numero_unidade: item.numeroUC || item.numero_unidade || '',
          nome_cliente: item.nome_cliente || item.nomeCliente || '',
          apelido: item.apelido || '',
          consumo_medio: item.consumoMedio || item.consumo_medio || 0,
          desconto_tarifa: item.desconto_tarifa || '20%',
          desconto_bandeira: item.desconto_bandeira || '20%',
          cpf_cnpj: 'N/A',
          consultor_nome: item.consultor || '',
          ug_nome: '',
          ligacao: item.ligacao || '',
          enderecoCompleto: ''
        }));
      }

      console.log(`✅ Processamento concluído: ${dadosEnriquecidos.length} registros`);

      const resultado = await exportExcelService.exportarAssociados(dadosEnriquecidos);
      showNotification(`Relatório de Associados concluído! ${resultado.totalRegistros} registros exportados em ${resultado.arquivo}`, 'success');

    } catch (error) {
      console.error('❌ Erro ao exportar associados:', error);
      showNotification(`Erro ao exportar associados: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminOrAnalista && 
        (!ugs.data || ugs.data.length === 0) && 
        !ugs.loading && 
        !loadingUgsRef.current) {
      
      loadingUgsRef.current = true;
      
      loadUgs({}, true).finally(() => {
        loadingUgsRef.current = false;
      });
    }
  }, [isAdminOrAnalista]);
  
  const carregarUGs = useCallback(async () => {
    if (controle.loading) return;
    
    try {
      if (!isAdminOrAnalista) return;
      
      const ugs = await storageService.getUGs();
      setUgsDisponiveis(ugs);
    } catch (error) {
      console.error('❌ Erro ao carregar UGs:', error);
      showNotification('Erro ao carregar UGs', 'error');
    }
  }, [controle.loading, isAdminOrAnalista, showNotification]);

  const dadosFiltrados = useMemo(() => {
    console.log('🔄 Recalculando dadosFiltrados:', filtros);
    let dados = controle.data || [];
    console.log('📊 Dados iniciais:', dados.length);

    // Filtro por consultor
    if (filtros.consultor && filtros.consultor.trim()) {
      const consultorAntes = dados.length;
      dados = dados.filter(item =>
        item.consultor?.toLowerCase().includes(filtros.consultor.toLowerCase())
      );
    }

    // ✅ FILTRO UG CORRIGIDO COM LOGS
    if (filtros.ug && filtros.ug.trim()) {
      const ugAntes = dados.length;
      
      if (filtros.ug === 'sem-ug') {
        dados = dados.filter(item => {
          const semUG = !item.ug || item.ug.trim() === '';
          return semUG;
        });
      } else {
        dados = dados.filter(item => {
          if (!item.ug || item.ug.trim() === '') {
            return false; // ← EXCLUSÃO EXPLÍCITA de registros sem UG
          }
          return item.ug.trim() === filtros.ug.trim();
        });
      }
      
      // ✅ DEBUG: Mostrar UGs dos registros restantes
      const ugsRestantes = dados.map(item => item.ug || 'SEM_UG');
    }

    // Filtro por status
    if (filtros.statusTroca && filtros.statusTroca.trim()) {
      const statusAntes = dados.length;
      dados = dados.filter(item => {
        const status = item.statusTroca || item.status_troca || 'Esteira';
        return status === filtros.statusTroca;
      });
    }

    // Filtro por busca textual
    if (filtros.busca && filtros.busca.trim()) {
      const buscaAntes = dados.length;
      const busca = filtros.busca.toLowerCase().trim();
      dados = dados.filter(item =>
        (item.nomeCliente?.toString().toLowerCase() || '').includes(busca) ||
        (item.numeroProposta?.toString().toLowerCase() || '').includes(busca) ||
        (item.numeroUC?.toString().toLowerCase() || '').includes(busca) ||
        (item.apelido?.toString().toLowerCase() || '').includes(busca)
      );
      console.log(`🔍 Filtro busca "${filtros.busca}": ${buscaAntes} → ${dados.length}`);
    }

    console.log('✅ Dados finais filtrados:', dados.length);
    return dados;
  }, [
    controle.data, 
    filtros.consultor, 
    filtros.ug, 
    filtros.statusTroca, 
    filtros.busca
  ]);

  // 3. ADICIONAR função para limpar filtros:
  const limparFiltros = () => {
    setFiltros({
      consultor: '',
      ug: '',
      busca: '',
      statusTroca: '' 
    });
  };

  const estatisticas = useMemo(() => {
    const dados = dadosFiltrados || [];
    
    const comUG = dados.filter(item => item.ug && item.ug.trim() !== '');
    const semUG = dados.filter(item => !item.ug || item.ug.trim() === '');
    
    // Calcular somatório dos consumos médios
    const somaConsumoComUG = comUG.reduce((soma, item) => {
      const consumo = parseFloat(item.media) || 0;
      return soma + consumo;
    }, 0);

    const somaConsumoSemUG = semUG.reduce((soma, item) => {
      const consumo = parseFloat(item.media) || 0;
      return soma + consumo;
    }, 0);
    
    // ✅ CORREÇÃO: Status comparação corrigida
    const statusTroca = dados.reduce((acc, item) => {
      // Usar o campo correto com fallback
      const status = item.status_troca || item.statusTroca || 'Esteira';
      
      switch (status) {
        case 'Esteira':
          acc.esteira++;
          break;
        case 'Em andamento':  // ✅ CORRIGIDO: 'Em andamento' (com 'E' maiúsculo, 'a' minúsculo)
          acc.emAndamento++;
          break;
        case 'Associado':
          acc.associado++;
          break;
        default:
          console.warn('Status desconhecido encontrado:', status);
          acc.esteira++; // Default para Esteira
      }
      return acc;
    }, { esteira: 0, emAndamento: 0, associado: 0 });
    
    return {
      total: dados.length,
      comUG: {
        quantidade: comUG.length,
        somaConsumo: Math.round(somaConsumoComUG)
      },
      semUG: {
        quantidade: semUG.length,
        somaConsumo: Math.round(somaConsumoSemUG)
      },
      statusTroca: statusTroca
    };
  }, [dadosFiltrados]);

  // UseEffect para recalcular estatísticas quando dados mudam
  useEffect(() => {
    setCalibragemTemp(calibragemGlobal);
  }, [calibragemGlobal]);

  const calcularValorCalibrado = useCallback((media, calibragemEspecifica = null) => {
    if (!media) return 0;
    
    const mediaNum = parseFloat(media);
    // Usar calibragem específica se fornecida, senão usar global
    const calibragem = calibragemEspecifica !== null ? calibragemEspecifica : calibragemGlobal;
    
    if (!calibragem || calibragem === 0) return mediaNum;
    
    const calibragemNum = parseFloat(calibragem);
    return mediaNum * (1 + calibragemNum / 100);
  }, [calibragemGlobal]);

  const editarStatusTroca = useCallback((index) => {
    console.log('🔍 editarStatusTroca chamada com index:', index);
    const item = dadosFiltrados[index];
    console.log('🔍 Item encontrado:', item);
    if (!item) {
      console.log('❌ Item não encontrado');
      return;
    }
    console.log('✅ Abrindo modal com item:', item);
    setModalStatusTroca({ show: true, item, index });
  }, [dadosFiltrados]);

  const editarUG = useCallback(async (index) => {
    if (!isAdminOrAnalista) return;
    
    const item = dadosFiltrados[index];
    if (!item) return;
    
    // Verificar se status permite atribuição
    if (item.statusTroca !== 'Associado') {
      showNotification('Status deve ser "Associado" para atribuir UG', 'warning');
      return;
    }

    try {
      // ✅ USAR UGs do contexto se disponíveis, senão buscar
      if (ugs.data && ugs.data.length > 0) {

        
        // Calcular capacidade disponível para cada UG
        const consumoUc = parseFloat(item.media) || 0;
        const calibragem = calibragemGlobal || 0;
        const consumoUcCalibrado = calibragem > 0 ? 
          consumoUc * (1 + calibragem / 100) : consumoUc;
        
        const ugsProcessadas = ugs.data.map(ug => {
          const capacidadeTotal = parseFloat(ug.capacidade) || 0;
          const consumoAtribuido = parseFloat(ug.mediaConsumoAtribuido) || 0;
          const consumoDisponivel = Math.max(0, capacidadeTotal - consumoAtribuido);
          const podeReceberUc = consumoDisponivel >= consumoUcCalibrado;
          
          // Calcular status
          const percentualUso = capacidadeTotal > 0 ? (consumoAtribuido / capacidadeTotal) * 100 : 0;
          let status, statusColor;
          
          if (percentualUso >= 95) {
            status = 'Cheia';
            statusColor = 'danger';
          } else if (percentualUso >= 80) {
            status = 'Quase Cheia';
            statusColor = 'warning';
          } else {
            status = 'Disponível';
            statusColor = 'success';
          }
          
          return {
            id: ug.id,
            nome_usina: ug.nomeUsina,
            potencia_cc: parseFloat(ug.potenciaCC) || 0,
            capacidade_total: capacidadeTotal,
            consumo_atribuido: consumoAtribuido,
            consumo_disponivel: consumoDisponivel,
            ucs_atribuidas: ug.ucsAtribuidas || 0,
            percentual_uso: Math.round(percentualUso * 10) / 10,
            status,
            status_color: statusColor,
            pode_receber_uc: podeReceberUc,
            consumo_uc_calibrado: consumoUcCalibrado
          };
        });
        
        setUgsDisponiveis(ugsProcessadas);
        setModalUG({ show: true, item, index });
        
      } else {
        console.log('📡 UGs não carregadas no contexto - buscando específicas');
        
        // Fallback: buscar UGs específicas se não estão no contexto
        const response = await apiService.get(`/controle/ugs-disponiveis?uc_id=${item.ucId}`);
        
        if (response.success) {
          setUgsDisponiveis(response.data || []);
          setModalUG({ show: true, item, index });
        } else {
          showNotification('Erro ao carregar UGs disponíveis', 'error');
        }
      }
    } catch (error) {
      console.error('Erro ao processar UGs:', error);
      showNotification('Erro ao carregar UGs disponíveis', 'error');
    }
  }, [isAdminOrAnalista, dadosFiltrados, ugs.data, calibragemGlobal, showNotification]);

  const salvarUG = useCallback(async (ugSelecionada) => {
    try {
      const { item } = modalUG;
      
      console.log('🔍 UG selecionada:', ugSelecionada);
      console.log('🔍 Item:', item);
      
      let response;
      
      if (ugSelecionada === 'remover') {
        // Remover UG atual
        response = await apiService.patch(`/controle/${item.id}/remover-ug`);
      } else {
        // Atribuir UG
        response = await apiService.post(`/controle/${item.id}/atribuir-ug`, {
          ug_id: ugSelecionada
        });
      }

      // Verificar se é erro de capacidade especificamente
      if (response?.success === false && response?.errorType === 'capacity') {
        showNotification(response.message, 'warning');
        return;
      }

      if (response?.success) {
        
        // ✅ ADICIONAR: Refresh automático após atribuir/remover UG
        console.log('🔄 Atualizando dados automaticamente após processar UG...');
        
        // Atualizar controle (força reload)
        await loadControle(1, controle.filters, true);
        
        // Atualizar UGs também (força reload)
        await loadUgs({}, true);

        setModalUG({ show: false, item: null, index: -1 });
        showNotification(response.message, 'success');
      } else if (response?.success === false) {
        console.log('❌ DEBUG - Erro, fechando modal');
        // Outros tipos de erro de resposta
        showNotification(response.message, 'error');
        setModalUG({ show: false, item: null, index: -1 });
      }
    } catch (error) {
      console.error('❌ Erro ao processar UG:', error);
      showNotification('Erro ao processar UG: ' + error.message, 'error');
      setModalUG({ show: false, item: null, index: -1 });
    }
  }, [modalUG, loadControle, controle.filters, loadUgs, showNotification]);

  const salvarStatusTroca = useCallback(async (novoStatus, novaData) => {
    try {
      const { item } = modalStatusTroca;
      
      const response = await apiService.patch(`/controle/${item.id}/status-troca`, {
        status_troca: novoStatus,
        data_titularidade: novaData
      });

      if (response?.success) {
        // ✅ ADICIONAR: Refresh automático após alterar status
        console.log('🔄 Atualizando dados automaticamente após alterar status...');
        
        // Atualizar controle (força reload)
        await loadControle(1, controle.filters, true);
        
        // Atualizar UGs também (força reload)
        await loadUgs({}, true);

        setModalStatusTroca({ show: false, item: null, index: -1 });
        showNotification(response.message, 'success');
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar status:', error);
      showNotification('Erro ao atualizar status: ' + error.message, 'error');
    }
  }, [modalStatusTroca, loadControle, controle.filters, loadUgs, showNotification]);

  // Função para confirmar exclusão de UC do controle
  const confirmarExclusao = useCallback((item, index) => {
    if (!isAdminOrAnalista) return;

    console.log('🗑️ Confirmando exclusão da UC:', item);
    setModalExclusao({ show: true, item, index });
  }, [isAdminOrAnalista]);

  // Função para executar soft delete
  const executarExclusao = useCallback(async () => {
    console.log('🔴 INÍCIO executarExclusao - função chamada');
    console.log('🔍 modalExclusao estado:', modalExclusao);

    try {
      const { item } = modalExclusao;

      if (!item) {
        console.error('❌ Item não encontrado no modalExclusao');
        showNotification('Item não encontrado para exclusão', 'error');
        return;
      }

      console.log('🗑️ Executando soft delete da UC:', item);
      console.log('🔍 ID do item:', item.id);

      // Realizar soft delete do controle
      console.log('📡 Fazendo chamada para API...');
      console.log('🔗 URL:', `/controle/${item.id}`);

      const response = await apiService.delete(`/controle/${item.id}`);

      console.log('📥 Resposta da API:', response);
      console.log('✅ Success?', response?.success);

      if (response?.success) {
        console.log('✅ Exclusão bem-sucedida, iniciando refresh...');

        // ✅ Refresh automático após exclusão
        console.log('🔄 Atualizando dados automaticamente após exclusão...');

        // Atualizar controle (força reload)
        await loadControle(1, controle.filters, true);
        console.log('🔄 loadControle executado');

        setModalExclusao({ show: false, item: null, index: -1 });
        console.log('🔄 Modal fechado');

        showNotification(response.message || 'UC removida do controle com sucesso!', 'success');
        console.log('✅ Notificação exibida');
      } else {
        console.error('❌ Resposta de erro da API:', response);
        showNotification(response?.message || 'Erro ao remover UC do controle', 'error');
      }
    } catch (error) {
      console.error('❌ Erro ao executar exclusão:', error);
      showNotification('Erro ao remover UC: ' + error.message, 'error');
    }
  }, [modalExclusao, loadControle, controle.filters, showNotification]);

  const refreshDados = useCallback(() => {
    console.log('🔄 Refresh manual dos dados');
    loadControle(1, controle.filters, true);
  }, [loadControle, controle.filters]);

  const aplicarCalibragem = useCallback(async () => {
    
    if (!isAdminOrAnalista) {
      console.log('❌ Usuário não é admin');
      return;
    }
    
    // ✅ CORREÇÃO: Permitir valor 0 e verificar se é um número válido
    if (calibragemGlobal < 0 || calibragemGlobal > 100) {
      console.log('❌ Calibragem inválida:', calibragemGlobal);
      showNotification('Calibragem deve estar entre 0 e 100%', 'warning');
      return;
    }

    // ✅ CORREÇÃO: Permitir aplicar mesmo com valor 0
    const mensagem = calibragemGlobal === 0 
      ? `Resetar calibragem global para 0% (remover calibragem)?`
      : `Aplicar calibragem de ${calibragemGlobal}% como padrão global do sistema?`;
      
    if (!window.confirm(mensagem)) {
      console.log('❌ Usuário cancelou');
      return;
    }

    try {
      console.log('🔄 Iniciando chamada para API...');
      
      const response = await apiService.put('/configuracoes/calibragem_global', { 
          valor: calibragemGlobal 
      });
      
      if (response?.success) {
        // ✅ ADICIONAR: Atualizar o DataContext após salvar
        await loadCalibragem(true); // Force reload
        
        const mensagemSucesso = calibragemGlobal === 0 
          ? 'Calibragem global resetada para 0%!'
          : `Calibragem global de ${calibragemGlobal}% salva com sucesso!`;
          
        showNotification(mensagemSucesso, 'success');
      }
    } catch (error) {
      console.error('❌ Erro ao aplicar calibragem:', error);
      showNotification('Erro ao aplicar calibragem: ' + error.message, 'error');
    }
  }, [isAdminOrAnalista, calibragemGlobal, loadCalibragem, showNotification]);

  const aplicarCalibragemComValor = useCallback(async (novoValor) => {
    if (!isAdminOrAnalista) return;
    
    if (novoValor < 0 || novoValor > 100) {
      showNotification('Calibragem deve estar entre 0 e 100%', 'warning');
      return;
    }

    const mensagem = novoValor === 0 
      ? `Resetar calibragem global para 0%?`
      : `Aplicar calibragem de ${novoValor}% como padrão global?`;
      
    if (!window.confirm(mensagem)) return;

    try {
      const response = await apiService.put('/configuracoes/calibragem_global', { 
        valor: novoValor 
      });
      
      if (response?.success) {
        // ✅ REFRESH COMPLETO DOS DADOS
        console.log('🔄 Refresh completo após aplicar calibragem...');
        
        // 1. Recarregar calibragem do banco
        await loadCalibragem(true);
        
        // 2. Recarregar dados de controle (força reload)
        await loadControle(1, controle.filters, true);
        
        // 3. Recarregar UGs (força reload)
        await loadUgs({}, true);
        
        const mensagemSucesso = novoValor === 0 
          ? 'Calibragem global resetada e dados atualizados!'
          : `Calibragem global de ${novoValor}% aplicada e dados atualizados!`;
          
        showNotification(mensagemSucesso, 'success');
      }
    } catch (error) {
      console.error('❌ Erro ao aplicar calibragem:', error);
      showNotification('Erro ao aplicar calibragem: ' + error.message, 'error');
    }
  }, [isAdminOrAnalista, loadCalibragem, loadControle, loadUgs, controle.filters, showNotification]);
  
  const exportarDados = useCallback(async () => {
    try {
      await storageService.exportarDadosFiltrados('controle', dadosFiltrados);
      showNotification('Dados exportados com sucesso!', 'success');
    } catch (error) {
      console.error('❌ Erro ao exportar:', error);
      showNotification('Erro ao exportar: ' + error.message, 'error');
    }
  }, [dadosFiltrados, showNotification]);

  // ✅ NOVAS FUNÇÕES PARA MODAL UC DETALHES
  const abrirModalUCDetalhes = useCallback((item, index) => {
    console.log('🏠 Abrindo modal UC detalhes:', item);
    console.log('🔍 Item.id (controleId):', item.id);
    setModalUCDetalhes({ 
      show: true, 
      item: { ...item, controleId: item.id }, 
      index 
    });
  }, []);

  const salvarUCDetalhes = useCallback(async (payload) => {
    try {
      console.log('💾 Salvando detalhes da UC:', payload);
      showNotification('Processando...', 'info');

      // ✅ PAYLOAD CORRIGIDO - sempre incluir todos os campos
      const requestPayload = {
        consumo_medio: payload.consumo_medio,
        usa_calibragem_global: payload.usa_calibragem_global,
        calibragem_individual: payload.calibragem_individual, // SEMPRE INCLUIR
        observacoes: payload.observacoes,
        
        // ✅ DESCONTOS - sempre incluir usa_desconto_proposta
        usa_desconto_proposta: payload.usa_desconto_proposta,
        desconto_tarifa: payload.desconto_tarifa,
        desconto_bandeira: payload.desconto_bandeira
      };

      console.log('🚀 Payload final sendo enviado:', requestPayload);

      const response = await apiService.put(`/controle/${payload.controleId}/uc-detalhes`, requestPayload);

      if (response?.success) {
        setModalUCDetalhes({ show: false, item: null, index: -1 });
        showNotification('UC atualizada com sucesso!', 'success');
        
        // ✅ RECARREGAR dados após salvar
        await loadControle(1, controle.filters, true);
      } else {
        throw new Error(response?.message || 'Erro ao atualizar UC');
      }
    } catch (error) {
      console.error('❌ Erro ao salvar UC:', error);
      showNotification('Erro ao salvar UC: ' + error.message, 'error');
    }
  }, [controle.filters, loadControle, showNotification]);


  // Obter listas únicas para filtros
  const consultoresUnicos = useMemo(() => {
    const dados = controle.data || [];
    
    // Corrigir consultores N/A antes de gerar lista única
    const consultoresCorrigidos = dados.map(item => {
      if (item.consultor === 'N/A' && item.usuario_id) {
        return getConsultorName(item.usuario_id) || item.consultor;
      }
      return item.consultor;
    }).filter(Boolean);

    return [...new Set(consultoresCorrigidos)];
  }, [controle.data, getConsultorName]);
  
  const ugsUnicas = useMemo(() => 
    [...new Set((controle.data || []).map(item => item.ug).filter(Boolean))], 
    [controle.data]
  );


  return (
    <div className="page-container">
      <div className="container">
        <Header title="Controle" />   
        <Navigation />

        {/* Estatísticas Rápidas */}
        <section className="quick-stats">
          {/* Total */}
          <div className="stat-card">
            <div className="stat-icon">
              <Database size={24} style={{ color: '#f0f0f0', opacity: 0.8 }} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Total</span>
              <span className="stat-value">{estatisticas.total}</span>
            </div>
          </div>

          {/* Com UG */}
          <div className="stat-card">
            <div className="stat-icon">
              <CheckCircle size={24} style={{ color: '#f0f0f0', opacity: 0.8 }} />
            </div>
            <div className="stat-content">
              <span className="stat-value">
                {estatisticas.comUG.somaConsumo.toLocaleString('pt-BR', { 
                  minimumFractionDigits: 0, 
                  maximumFractionDigits: 0 
                })} kWh
              </span>
              <span className="stat-label-small">
                {estatisticas.comUG.quantidade} {estatisticas.comUG.quantidade === 1 ? 'Unidade' : 'Unidades'} com UG
              </span>
            </div>
          </div>

          {/* Sem UG */}
          <div className="stat-card">
            <div className="stat-icon">
              <AlertTriangle size={24} style={{ color: '#f0f0f0', opacity: 0.8 }} />
            </div>
            <div className="stat-content">
              <span className="stat-value">
                {estatisticas.semUG.somaConsumo.toLocaleString('pt-BR', { 
                  minimumFractionDigits: 0, 
                  maximumFractionDigits: 0 
                })} kWh
              </span>
              <span className="stat-label-small">
                {estatisticas.semUG.quantidade} {estatisticas.semUG.quantidade === 1 ? 'Unidade' : 'Unidades'} sem UG
              </span>
            </div>
          </div>

          {/* ✅ CORREÇÃO 4: Card de Status usando dados locais filtrados */}
          <div className="stat-card">
            <div className="stat-icon">
              <Clock size={24} style={{ color: '#f0f0f0', opacity: 0.8 }} />
            </div>
            <div className="stat-content">
              <div className="controle-status-resumo">
                <div className="controle-status-item">
                  <span className="controle-status-badge controle-status-esteira">
                    {estatisticas.statusTroca.esteira}
                  </span>
                  <small>Esteira</small>
                </div>
                <div className="controle-status-item">
                  <span className="controle-status-badge controle-status-em-andamento">
                    {estatisticas.statusTroca.emAndamento}
                  </span>
                  <small>Em Andamento</small>
                </div>
                <div className="controle-status-item">
                  <span className="controle-status-badge controle-status-associado">
                    {estatisticas.statusTroca.associado}
                  </span>
                  <small>Associado</small>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Filtros e Controles */}
        <section className="filters-section">
          <div className="filters-container">
            <div className="filters-grid-with-calibragem">
              <div className="filter-group filter-busca">
                <label>Buscar:</label>
                <input
                  type="text"
                  placeholder="Cliente, proposta ou UC..."
                  value={filtros.busca}
                  onChange={(e) => setFiltros(prev => ({ ...prev, busca: e.target.value }))}
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
                <label>UG (Usina)</label>
                <select
                  value={filtros.ug}
                  onChange={(e) => setFiltros({...filtros, ug: e.target.value})}
                >
                  <option value="">Todas</option>
                  <option value="sem-ug">Sem UG</option>
                  {ugsUnicas.map(ug => (
                    <option key={ug} value={ug}>{ug}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Status Troca</label>
                <select
                  value={filtros.statusTroca}
                  onChange={(e) => setFiltros(prev => ({ ...prev, statusTroca: e.target.value }))}
                >
                  <option value="">Todos</option>
                  <option value="Esteira">Esteira</option>
                  <option value="Em andamento">Em andamento</option>
                  <option value="Associado">Associado</option>
                </select>
              </div>

              {isAdminOrAnalista && (
                <div className="filter-group filter-calibragem">
                  <label htmlFor="calibragem-input">Calibragem Global:</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <input
                      id="calibragem-input"
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      value={calibragemTemp}
                      onChange={(e) => setCalibragemTemp(parseFloat(e.target.value) || 0)}
                      placeholder="0.0"
                      disabled={calibragem.loading}
                      style={{ flex: 1 }}
                    />
                    <span style={{ fontSize: '0.9rem', color: '#f0f0f0' }}>%</span>
                  </div>
                </div>
              )}
            </div>

            {/* Botões de ação e calibragem */}
            <div className="actions-row">
              {isAdminOrAnalista && (
                <div className="calibragem-info-compact">
                  <span style={{ fontSize: '0.8rem', color: '#f0f0f0' }}>
                    Atual: <strong>{calibragemGlobal}%</strong>
                  </span>
                  <button
                    onClick={() => aplicarCalibragemComValor(calibragemTemp)}
                    disabled={calibragem.loading || calibragemTemp < 0 || calibragemTemp > 100}
                    className="btn btn-primary btn-sm"
                  >
                    {calibragem.loading ? 'Aplicando...' : 'Aplicar'}
                  </button>
                </div>
              )}

              {/* Botões de ação */}
              <div className="actions-container">
              <button onClick={limparFiltros} className="btn btn-secondary">
                Limpar Filtros
              </button>
              <button 
                onClick={refreshDados}
                className="btn btn-secondary"
                disabled={controle.loading}
                title="Atualizar dados"
              >
                {controle.loading ? '🔄' : '⟳'} Atualizar
              </button>
              <button
                onClick={abrirModalExportacao}
                className="btn btn-primary"
                disabled={dadosFiltrados.length === 0}
              >
                <Download size={16} />
                Exportar Excel
              </button>
              <button
                onClick={exportarAssociados}
                className="btn btn-success"
                disabled={loading}
                title="Exportar relatório simplificado de UCs associadas"
              >
                <FileText size={16} />
                Relatório Associados
              </button>
              </div>
            </div>
          </div>
        </section>

        {/* Tabela */}
        <section className="table-section">
          <div className="table-header">
            <h2>
              Controle de Propostas
              <span className="table-count">{dadosFiltrados.length}</span>
            </h2>
          </div>
          
          <div className="table-container">
            {controle.loading && controle.data.length === 0 ? (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Carregando dados...</p>
              </div>
            ) : dadosFiltrados.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">📋</span>
                <h3>Nenhuma proposta no controle</h3>
                <p>As propostas fechadas aparecerão aqui automaticamente.</p>
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Proposta</th>
                    <th>Cliente</th>
                    <th>UC</th>
                    <th>Consultor</th>
                    <th>UG</th>
                    <th>Média (kWh)</th>
                    {/* Coluna Calibrada - só aparece para admin */}
                    {isAdminOrAnalista && <th>Calibrada (kWh)</th>}
                    <th>Status Troca</th>
                    {isAdminOrAnalista && <th>Ações</th>}
                  </tr>
                </thead>
                <tbody>
                  {dadosFiltrados.map((item, index) => (
                    <tr key={item.id || index}>
                      <td>
                        <span className="proposta-numero">{item.numeroProposta}</span>
                      </td>
                      <td>
                        <strong>{item.nomeCliente}</strong>
                        <br />
                        <small style={{color: '#666'}}>{item.celular}</small>
                      </td>
                      <td>
                        <span className="uc-numero">{item.numeroUC}</span>
                        {item.apelido && (
                          <>
                            <br />
                            <small style={{color: '#666'}}>{item.apelido}</small>
                          </>
                        )}
                      </td>
                      <td>
                        <span className="consultor-nome">{item.consultor}</span>
                      </td>
                      <td>
                        {item.ug ? (
                          <span className="ug-definida">{item.ug}</span>
                        ) : (
                          <span className="ug-pendente">Sem UG</span>
                        )}
                      </td>
                      <td>
                        <span className="media-valor">
                          {item.media ? parseFloat(item.media).toFixed(0) : '0'}
                        </span>
                      </td>
                      {/* Valor calibrado - só para admin */}
                      {isAdminOrAnalista && (
                        <td>
                          {(() => {
                            // Usar calibragem individual se existir, senão usar global
                            const calibragemEfetiva = item.calibragemIndividual !== null && item.calibragemIndividual !== undefined
                              ? item.calibragemIndividual 
                              : calibragemGlobal;
                              
                            const valorCalibrado = calcularValorCalibrado(item.media, calibragemEfetiva);
                            
                            if (calibragemEfetiva === 0 || !item.media) {
                              return <span className="sem-calibragem">Sem calibragem</span>;
                            }
                            
                            return (
                              <div className="calibragem-info">
                                <span className="calibragem-calculada">
                                  {valorCalibrado.toFixed(0)}
                                </span>
                                <br />
                                <small className="calibragem-status calibrada">
                                  {item.calibragemIndividual !== null && item.calibragemIndividual !== undefined ? 'Individual' : 'Global'}: {calibragemEfetiva}%
                                </small>
                              </div>
                            );
                          })()}
                        </td>
                      )}
                      <td>
                        <button
                          onClick={() => editarStatusTroca(index)}
                          className={`btn btn-small status-troca-btn status-${item.statusTroca?.toLowerCase().replace(' ', '-')}`}
                          title="Clique para alterar status"
                        >
                          {item.statusTroca || 'Aguardando'}
                        </button>
                      </td>
                      
                      {/* CÉLULA DE AÇÕES - CORRIGIDA */}
                      {isAdminOrAnalista && (
                        <td>
                          <div className="action-buttons-controle">
                            {/* Botão UC - sempre visível */}
                            <button
                              onClick={() => abrirModalUCDetalhes(item, index)}
                              className="btn-uc"
                              title="Editar UC"
                            >
                              <Edit size={12} />
                              UC
                            </button>
                            
                            {/* Botão UG - só para admin */}
                            <button
                              onClick={item.statusTroca === 'Associado' ? () => editarUG(index) : undefined}
                              className="btn-ug"
                              title={
                                item.statusTroca === 'Associado'
                                  ? "Atribuir UG"
                                  : `Status deve ser "Associado" para atribuir UG (atual: ${item.statusTroca})`
                              }
                              disabled={item.statusTroca !== 'Associado'}
                            >
                              <Home size={12} />
                              UG
                            </button>

                            {/* Botão Excluir - só habilitado se não tiver UG atribuída */}
                            <button
                              onClick={!item.ugId ? () => confirmarExclusao(item, index) : undefined}
                              className="btn-icon delete"
                              title={
                                !item.ugId
                                  ? "Excluir UC do controle"
                                  : "Não é possível excluir - UG já atribuída"
                              }
                              disabled={!!item.ugId}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
        {modalUCDetalhes.show && (
          <ModalUCDetalhes 
            item={modalUCDetalhes.item}
            onSave={salvarUCDetalhes}
            onClose={() => setModalUCDetalhes({ show: false, item: null, index: -1 })}
          />
        )}
        
        {/* Modal UG - Apenas para admin */}
        {modalUG.show && isAdminOrAnalista && (
          <ModalUG 
            item={modalUG.item}
            ugsAnalise={ugsDisponiveis || []}
            onSave={salvarUG}
            onClose={() => setModalUG({ show: false, item: null, index: -1 })}
          />
        )}
        
        {modalStatusTroca.show && (
          <ModalStatusTroca 
            item={modalStatusTroca.item}
            onSave={salvarStatusTroca}
            onClose={() => setModalStatusTroca({ show: false, item: null, index: -1 })}
          />
        )}

        {/* Modal de Confirmação de Exclusão */}
        {modalExclusao.show && (
          <ModalConfirmarExclusao
            item={modalExclusao.item}
            onConfirmar={executarExclusao}
            onClose={() => setModalExclusao({ show: false, item: null, index: -1 })}
          />
        )}

        <ModalFiltrosExportacao
          isOpen={modalExportacao}
          onClose={() => setModalExportacao(false)}
          onExportar={executarExportacao}
          tipo="controle"
          consultores={consultoresUnicos}
        />
      </div>
    </div>
  );
};

// Modal para seleção de UG
// Modal para seleção de UG
const ModalUG = ({ item, onSave, onClose, ugsAnalise }) => {
  const [ugSelecionada, setUgSelecionada] = useState(item.ugId || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!ugSelecionada) {
      alert('Selecione uma UG');
      return;
    }
    onSave(ugSelecionada);
  };

  return (
    <div className="common-modal-overlay" onClick={onClose}>
      <div className="common-modal" onClick={(e) => e.stopPropagation()}>
        <div className="common-modal-header">
          <h2>
            <Building size={20} />
            Atribuir UG
          </h2>
          <button onClick={onClose} className="common-close-btn">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="common-modal-content">
          <div className="proposta-info">
            <p><strong>Cliente:</strong> {item.nomeCliente}</p>
            <p><strong>UC:</strong> {item.numeroUC} - {item.apelido}</p>
            <p><strong>Média:</strong> {item.media} kWh</p>
            <p><strong>Status:</strong> <span className="status-finalizado">{item.statusTroca}</span></p>
          </div>
          
          <div className="form-group">
            <label>Selecionar UG:</label>
            {!ugsAnalise || ugsAnalise.length === 0 ? (
              <div className="loading-ugs">
                <p>Nenhuma UG disponível</p>
              </div>
            ) : (
              <>
                <div className="ugs-lista">
                  {ugsAnalise.map((ug) => (
                    <div 
                      key={ug.id} 
                      className={`ug-item ${ug.pode_receber_uc ? 'clickable' : 'disabled'} ${ugSelecionada === ug.id ? 'selected' : ''}`}
                      onClick={ug.pode_receber_uc ? () => setUgSelecionada(ug.id) : null}
                    >
                      <div className="ug-info">
                        <div className="ug-nome">{ug.nome_usina}</div>
                        <div className="ug-detalhes">
                          {ug.potencia_cc}kWp ({ug.consumo_atribuido.toFixed(0)}/{ug.capacidade_total.toFixed(0)} kWh - {ug.status})
                        </div>
                      </div>
                      <div className={`ug-status ${ug.status_color}`}>
                        {ug.pode_receber_uc ? '✅ Disponível' : '❌ Sem capacidade'}
                      </div>
                    </div>
                  ))}
                  
                  {/* Opção para remover UG - só aparece se a UC já tem UG */}
                  {item.ug && item.ugNome && (
                    <div 
                      className={`ug-item clickable ${ugSelecionada === 'remover' ? 'selected' : ''}`}
                      onClick={() => setUgSelecionada('remover')}
                    >
                      <div className="ug-info">
                        <div className="ug-nome">🚫 Remover UG atual ({item.ugNome})</div>
                        <div className="ug-detalhes">Desatribuir UG desta UC</div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Campo oculto para o formulário - FORA da div ugs-lista */}
                <input type="hidden" value={ugSelecionada} required />
              </>
            )}
          </div>
          
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              💾 Atribuir UG
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ModalStatusTroca = ({ item, onSave, onClose }) => {
  const [statusTroca, setStatusTroca] = useState(item.statusTroca || 'Aguardando');
  const [dataTitularidade, setDataTitularidade] = useState(
    item.dataTitularidade || new Date().toISOString().split('T')[0]
  );
  const [showConfirmacao, setShowConfirmacao] = useState(false);

  // ✅ ADICIONAR: Limpar data quando status muda
  useEffect(() => {
    // Limpar data quando status não for "Associado"
    if (statusTroca !== 'Associado') {
      setDataTitularidade('');
    } else if (statusTroca === 'Associado' && !dataTitularidade) {
      // Definir data atual quando selecionar "Associado" pela primeira vez
      setDataTitularidade(new Date().toISOString().split('T')[0]);
    }
  }, [statusTroca, dataTitularidade]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Se está saindo de "Associado" e tem UG, mostrar confirmação
    if (item.statusTroca === 'Associado' && statusTroca !== 'Associado' && item.ugNome) {
      setShowConfirmacao(true);
      return;
    }
    
    // Sempre enviar uma data - atual se não for "Associado", ou a selecionada se for "Associado"
    const dataFinal = statusTroca === 'Associado' 
      ? dataTitularidade 
      : new Date().toISOString().split('T')[0]; // Data atual como fallback
    
    onSave(statusTroca, dataFinal);
  };

  const confirmarMudanca = () => {
    setShowConfirmacao(false);
    onSave(statusTroca, dataTitularidade);
  };

  const dataMaxima = new Date().toISOString().split('T')[0];

  return (
    <div className="common-modal-overlay" onClick={onClose}>
      <div className="common-modal" onClick={(e) => e.stopPropagation()}>
        <div className="common-modal-header">
          <h2>
            <Clock size={20} />
            Gerenciar Status de Troca
          </h2>
          <button onClick={onClose} className="common-close-btn">
            <X size={20} />
          </button>
        </div>
        
        {showConfirmacao ? (
          <div className="common-modal-content modal-body-controle confirmacao-body">
            <div className="alert alert-warning">
              <h4>⚠️ Confirmação Necessária</h4>
              <p>
                Ao alterar o status de <strong>"Associado"</strong> para <strong>"{statusTroca}"</strong>, 
                a UG <strong>"{item.ugNome}"</strong> será automaticamente <strong>desatribuída</strong> desta UC.
              </p>
              <p>Deseja continuar?</p>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowConfirmacao(false)} className="btn btn-secondary">
                Cancelar
              </button>
              <button onClick={confirmarMudanca} className="btn btn-warning">
                ⚠️ Confirmar e Desatribuir
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="common-modal-content modal-body-controle">
            <div className="proposta-info">
              <p><strong>Cliente:</strong> {item.nomeCliente}</p>
              <p><strong>UC:</strong> {item.numeroUC} - {item.apelido}</p>
              <p><strong>UG Atual:</strong> {item.ugNome || 'Nenhuma'}</p>
            </div>
            
            <div className="form-group">
              <label>Status da Troca:</label>
              <select
                value={statusTroca}
                onChange={(e) => setStatusTroca(e.target.value)}
                required
              >
                <option value="Esteira">Esteira</option>
                <option value="Em andamento">Em andamento</option>
                <option value="Associado">Associado</option>
              </select>
            </div>
            
            {/* Campo Data - só aparece quando status é "Finalizado" */}
            {statusTroca === 'Associado' && ( 
              <div className="form-group">
                <label>Data da Titularidade:</label>
                <input
                  type="date"
                  value={dataTitularidade}
                  onChange={(e) => setDataTitularidade(e.target.value)}
                  max={dataMaxima}
                  required
                />
                <small className="form-help">Não é possível selecionar datas futuras</small>
              </div>
            )}
            
            <div className="modal-footer">
              <button type="button" onClick={onClose} className="btn btn-secondary">
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary">
                💾 Salvar Status
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
const ModalUCDetalhes = ({ item, onSave, onClose }) => {
  const { showNotification } = useNotification();
  const [loading, setLoading] = useState(true);
  const [dados, setDados] = useState({
    numero_proposta: '',
    nome_cliente: '',
    numero_uc: '',
    apelido: '',
    consumo_medio: 0,
    calibragem: 0,
    observacoes: '',
    // CALIBRAGEM - padrão é usar global
    calibragemIndividual: '',
    usa_calibragem_global: true, // ✅ PADRÃO CORRETO
    calibragem_global: 0,
    // DESCONTOS
    desconto_tarifa: 20,
    desconto_bandeira: 20,
    proposta_desconto_tarifa: 20,
    proposta_desconto_bandeira: 20,
    usa_desconto_proposta: true,
    controleId: '',
    // DOCUMENTAÇÃO
    documentacao_troca_titularidade: ''
  });


  useEffect(() => {
    const carregarDadosUC = async () => {
      if (!item?.controleId) {
        console.log('❌ Sem controleId para carregar');
        return;
      }

      setLoading(true);
      try {
        console.log('📡 Carregando dados da UC, controleId:', item.controleId);
        
        const response = await apiService.get(`/controle/${item.controleId}/uc-detalhes`);
        
        if (!response?.success) {
          throw new Error(response?.message || 'Erro ao carregar dados');
        }

        const dadosUC = response.data;
        console.log('✅ Dados carregados do backend:', dadosUC);

        // ✅ LÓGICA CORRIGIDA DOS DESCONTOS
        // Valores ORIGINAIS da proposta (sempre fixos, só para exibição)
        const propostaDescontoTarifa = dadosUC.proposta_desconto_tarifa || '20%';
        const propostaDescontoBandeira = dadosUC.proposta_desconto_bandeira || '20%';
        
        // Valores ATUAIS da controle_clube (editáveis)
        const controleDescontoTarifa = dadosUC.desconto_tarifa; // pode ser null
        const controleDescontoBandeira = dadosUC.desconto_bandeira; // pode ser null
        
        // Se controle_clube tem valores próprios (não null), está usando individual
        // Se controle_clube é null, está usando da proposta
        const temDescontoIndividual = controleDescontoTarifa !== null && controleDescontoBandeira !== null;
        const usaDescontoProposta = !temDescontoIndividual;
        
        // Valores para mostrar nos inputs (quando editável)
        const inputDescontoTarifa = temDescontoIndividual ? 
          parseFloat(controleDescontoTarifa.replace('%', '')) : 
          parseFloat(propostaDescontoTarifa.replace('%', ''));
          
        const inputDescontoBandeira = temDescontoIndividual ? 
          parseFloat(controleDescontoBandeira.replace('%', '')) : 
          parseFloat(propostaDescontoBandeira.replace('%', ''));

        // ✅ CALIBRAGEM (manter como está)
        const calibragemIndividualValue = dadosUC.calibragem_individual;
        const temCalibragemIndividual = calibragemIndividualValue !== null && calibragemIndividualValue !== undefined;
        const usarCalibragemGlobal = !temCalibragemIndividual;

        setDados({
          numero_proposta: dadosUC.numero_proposta || '',
          nome_cliente: dadosUC.nome_cliente || '',
          numero_uc: dadosUC.numero_uc || '',
          apelido: dadosUC.apelido || '',
          consumo_medio: dadosUC.consumo_medio || '',
          observacoes: dadosUC.observacoes || '',
          
          // CALIBRAGEM
          usa_calibragem_global: usarCalibragemGlobal,
          calibragemIndividual: temCalibragemIndividual ? calibragemIndividualValue.toString() : '',
          calibragem_global: dadosUC.calibragem_global || 0,
          
          // ✅ DESCONTOS CORRIGIDOS
          usa_desconto_proposta: usaDescontoProposta,
          
          // Valores ORIGINAIS da proposta (só para exibição no cabeçalho)
          proposta_desconto_tarifa_original: propostaDescontoTarifa,
          proposta_desconto_bandeira_original: propostaDescontoBandeira,
          
          // Valores para os INPUTS (editáveis)
          desconto_tarifa: inputDescontoTarifa,
          desconto_bandeira: inputDescontoBandeira,

          controleId: item.controleId,

          // DOCUMENTAÇÃO
          documentacao_troca_titularidade: dadosUC.documentacao_troca_titularidade || ''
        });

        console.log('✅ Estado configurado:', {
          usa_desconto_proposta: usaDescontoProposta,
          proposta_original_tarifa: propostaDescontoTarifa,
          proposta_original_bandeira: propostaDescontoBandeira,
          input_tarifa: inputDescontoTarifa,
          input_bandeira: inputDescontoBandeira,
          tem_desconto_individual: temDescontoIndividual
        });
          
      } catch (error) {
        console.error('❌ Erro ao carregar dados da UC:', error);
        showNotification('Erro ao carregar dados da UC: ' + error.message, 'error');
      } finally {
        setLoading(false);
      }
    };

    if (item?.controleId) {
      carregarDadosUC();
    }
  }, [item?.controleId]); // Só recarregar se o controleId mudar

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validações existentes...
    if (!dados.consumo_medio || parseFloat(dados.consumo_medio) < 0) {
      alert('Consumo médio deve ser um valor positivo');
      return;
    }

    if (!dados.usa_calibragem_global) {
      const calibragemIndividual = parseFloat(dados.calibragemIndividual);
      if (isNaN(calibragemIndividual) || calibragemIndividual < 0 || calibragemIndividual > 100) {
        alert('Calibragem individual deve ser entre 0 e 100%');
        return;
      }
    }

    if (!dados.usa_desconto_proposta) {
      if (dados.desconto_tarifa < 0 || dados.desconto_tarifa > 100) {
        alert('Desconto de tarifa deve ser entre 0 e 100%');
        return;
      }
      if (dados.desconto_bandeira < 0 || dados.desconto_bandeira > 100) {
        alert('Desconto de bandeira deve ser entre 0 e 100%');
        return;
      }
    }

    try {
      const controleId = dados.controleId || item.controleId;

      // Se há um documento local para fazer upload, fazê-lo primeiro
      if (dados.documentacao_is_local && dados.documentacao_arquivo_local) {
        showNotification('Salvando documento...', 'info');
        const nomeArquivoSalvo = await uploadDocumentoReal(controleId);

        if (nomeArquivoSalvo) {
          // Atualizar estado para refletir que o documento agora está salvo
          setDados(prev => ({
            ...prev,
            documentacao_troca_titularidade: nomeArquivoSalvo,
            documentacao_arquivo_local: null,
            documentacao_is_local: false
          }));

          // Limpar blob URL local
          if (dados.documentacao_blob_url) {
            URL.revokeObjectURL(dados.documentacao_blob_url);
          }
        }
      }

      // ✅ PAYLOAD CORRIGIDO
      const payload = {
        controleId: controleId,
        consumo_medio: parseFloat(dados.consumo_medio),
        usa_calibragem_global: dados.usa_calibragem_global,
        calibragem_individual: dados.usa_calibragem_global ? null : parseFloat(dados.calibragemIndividual),
        observacoes: dados.observacoes,

        // ✅ DESCONTOS CORRIGIDOS
        usa_desconto_proposta: dados.usa_desconto_proposta,
        desconto_tarifa: dados.usa_desconto_proposta ? null : parseFloat(dados.desconto_tarifa),
        desconto_bandeira: dados.usa_desconto_proposta ? null : parseFloat(dados.desconto_bandeira)
      };

      console.log('🔍 Payload correto sendo enviado:', payload);
      onSave(payload);

    } catch (error) {
      console.error('Erro ao salvar:', error);
      showNotification('Erro ao salvar documento: ' + error.message, 'error');
    }
  };

  const handleCalibragemGlobalChange = (checked) => {
    console.log('🎯 Alternando calibragem global:', checked);
    
    setDados(prev => {
      const novosDados = {
        ...prev,
        usa_calibragem_global: checked
      };
      
      if (checked) {
        // ✅ Se marcar para usar global, limpar a individual
        novosDados.calibragemIndividual = '';
      } else {
        // ✅ Se desmarcar para usar individual, manter o valor atual ou deixar vazio
        // Não alterar o campo se já tem valor
        if (!prev.calibragemIndividual) {
          novosDados.calibragemIndividual = '';
        }
      }
      
      console.log('🎯 Novos dados após toggle:', novosDados);
      return novosDados;
    });
  };

  const toggleDescontoProposta = (checked) => {
    console.log('🎯 Toggle desconto proposta:', checked);

    setDados(prev => ({
      ...prev,
      usa_desconto_proposta: checked
      // ✅ NÃO alterar os valores dos inputs aqui!
      // Os inputs mantêm os valores atuais da controle_clube
    }));
  };

  // Funções para lidar com documentação
  const handleDocumentUpload = async (file) => {
    if (!file) return;

    // Validar arquivo
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      showNotification('Arquivo muito grande. Tamanho máximo: 10MB', 'error');
      return;
    }

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      showNotification('Tipo de arquivo não permitido. Use PDF ou imagens.', 'error');
      return;
    }

    try {
      // Criar blob URL para visualização local
      const blobUrl = URL.createObjectURL(file);

      // Armazenar arquivo e blob URL no estado local (não enviar para backend ainda)
      setDados(prev => ({
        ...prev,
        documentacao_troca_titularidade: file.name,
        documentacao_arquivo_local: file, // Arquivo para upload posterior
        documentacao_blob_url: blobUrl, // URL para visualização imediata
        documentacao_is_local: true // Flag indicando que é local
      }));

      showNotification('Documento adicionado. Clique em "Salvar Alterações" para confirmar.', 'info');

    } catch (error) {
      console.error('Erro ao processar arquivo:', error);
      showNotification('Erro ao processar arquivo: ' + error.message, 'error');
    }
  };

  const visualizarDocumento = async (nomeArquivo) => {
    if (!nomeArquivo) {
      console.log('Nenhum arquivo para visualizar');
      return;
    }

    try {
      console.log('Visualizando documento:', nomeArquivo);
      console.log('Estado atual dos dados:', {
        documentacao_is_local: dados.documentacao_is_local,
        documentacao_blob_url: dados.documentacao_blob_url,
        documentacao_arquivo_local: dados.documentacao_arquivo_local
      });

      // Verificar se é um documento local (não salvo ainda)
      if (dados.documentacao_is_local && dados.documentacao_blob_url) {
        console.log('Abrindo documento local:', nomeArquivo);
        window.open(dados.documentacao_blob_url, '_blank');
        return;
      }

      // Se não é local, buscar do servidor
      const url = `${process.env.REACT_APP_API_URL || 'http://localhost:8000/api'}/controle/documento/${nomeArquivo}`;
      const token = localStorage.getItem('aupus_token');

      console.log('Buscando documento do servidor:', url);

      // Fazer requisição autenticada e obter blob
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Erro ${response.status}: ${response.statusText}`);
      }

      // Criar blob e URL para download
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      // Abrir em nova aba
      window.open(blobUrl, '_blank');

      // Limpar URL do blob após um tempo
      setTimeout(() => {
        window.URL.revokeObjectURL(blobUrl);
      }, 10000);

    } catch (error) {
      console.error('Erro ao visualizar documento:', error);
      showNotification('Erro ao abrir documento: ' + error.message, 'error');
    }
  };

  // Função para fazer upload real do documento para o backend
  const uploadDocumentoReal = async (controleId) => {
    if (!dados.documentacao_arquivo_local) {
      return null; // Nenhum arquivo para enviar
    }

    try {
      const formData = new FormData();
      formData.append('documento', dados.documentacao_arquivo_local);
      formData.append('controle_id', controleId);
      formData.append('tipo', 'declaracao_troca_titularidade');

      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000/api'}/controle/upload-documento`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('aupus_token')}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Erro ao fazer upload do documento');
      }

      const result = await response.json();

      if (result.success) {
        return result.nome_arquivo;
      } else {
        throw new Error(result.message || 'Erro no upload do documento');
      }

    } catch (error) {
      console.error('Erro no upload real:', error);
      throw error;
    }
  };

  const removerDocumento = async () => {
    try {
      console.log('Removendo documento...', dados.documentacao_troca_titularidade);

      // Se é um arquivo local (não salvo), apenas limpar estado
      if (dados.documentacao_is_local) {
        console.log('Removendo arquivo local');

        // Limpar blob URL se existir
        if (dados.documentacao_blob_url) {
          URL.revokeObjectURL(dados.documentacao_blob_url);
        }

        setDados(prev => ({
          ...prev,
          documentacao_troca_titularidade: '',
          documentacao_arquivo_local: null,
          documentacao_blob_url: null,
          documentacao_is_local: false
        }));

        showNotification('Documento removido.', 'success');
        console.log('Documento local removido com sucesso');
        return;
      }

      // Se é um arquivo salvo, chamar API para deletar do backend
      if (dados.documentacao_troca_titularidade && !dados.documentacao_is_local) {
        console.log('Removendo arquivo salvo do backend');

        const controleId = dados.controleId || item.controleId;
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:8000/api'}/controle/${controleId}/documento`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('aupus_token')}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`Erro ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        if (!result.success) {
          throw new Error(result.message || 'Erro ao remover documento');
        }

        // Atualizar estado local
        setDados(prev => ({
          ...prev,
          documentacao_troca_titularidade: '',
          documentacao_arquivo_local: null,
          documentacao_blob_url: null,
          documentacao_is_local: false
        }));

        showNotification('Documento removido com sucesso!', 'success');
        console.log('Documento removido do backend com sucesso');
      }

    } catch (error) {
      console.error('Erro ao remover documento:', error);
      showNotification('Erro ao remover documento: ' + error.message, 'error');
    }
  };


  if (loading) {
    return (
      <div className="common-modal-overlay">
        <div className="common-modal modal-controle">
          <div className="common-modal-header modal-header-controle">
            <h3 className="modal-title-with-icon">
              <Home size={20} />
              Carregando dados da UC...
            </h3>
            <button onClick={onClose} className="common-close-btn">
              <X size={18} />
            </button>
          </div>
          <div className="common-modal-content modal-body-controle" style={{ textAlign: 'center', padding: '40px' }}>
            <div>Carregando informações...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="common-modal-overlay" onClick={onClose}>
      <div className="common-modal modal-controle modal-uc-detalhes" onClick={(e) => e.stopPropagation()}>
        <div className="common-modal-header modal-header-controle">
          <h3 className="modal-title-with-icon">
            <Home size={20} />
            Editar Detalhes da UC
          </h3>
          <button onClick={onClose} className="common-close-btn">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="common-modal-content modal-body-controle">
        {/* Informações da Proposta (Apenas Leitura) */}
        <div className="proposta-info">
          <h4 className="section-title-with-icon">
            <Database size={16} />
            Informações da Proposta
          </h4>
          <p><strong>Proposta:</strong> {dados.numero_proposta}</p>
          <p><strong>Cliente:</strong> {dados.nome_cliente}</p>
          <p><strong>UC:</strong> {dados.numero_uc} - {dados.apelido}</p>
        </div>

        {/* Consumo Médio (Editável) */}
        <div className="form-group" style={{ marginBottom: '20px' }}>
          <label htmlFor="consumo_medio" className="label-with-icon">
            <Settings size={16} />
            <strong>Consumo Médio (kWh):</strong>
          </label>
          <input
            type="number"
            id="consumo_medio"
            min="0"
            step="1"
            value={dados.consumo_medio}
            onChange={(e) => setDados(prev => ({ ...prev, consumo_medio: e.target.value }))}
            required
            className="form-input"
          />
        </div>

        {/* ✅ NOVA SEÇÃO: Configuração de Descontos */}
        <div className="desconto-section">
          <h4 className="section-title-with-icon">
            <Percent size={16} />
            Configuração de Descontos
          </h4>

          {/* Toggle para usar desconto da proposta */}
          <div className="form-group desconto-toggle">
            <label className="checkbox-container">
              <input
                type="checkbox"
                checked={dados.usa_desconto_proposta}
                onChange={(e) => toggleDescontoProposta(e.target.checked)}
              />
              <span>
                Usar descontos da proposta original
              </span>
            </label>
          </div>

          {/* Mostrar descontos da proposta original */}
          <div className="proposta-descontos">
            <p className="proposta-descontos-title">
              <strong>Descontos da Proposta:</strong>
            </p>
            <p className="proposta-descontos-valores">
              Tarifa: <strong>{dados.proposta_desconto_tarifa_original}</strong> |
              Bandeira: <strong>{dados.proposta_desconto_bandeira_original}</strong>
            </p>
          </div>


          {/* Campos de desconto individual */}
          <div className={`descontos-individuais ${dados.usa_desconto_proposta ? 'disabled' : ''}`}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="desconto_tarifa" className="label-with-icon">
                  <TrendingUp size={14} />
                  <strong>Desconto Tarifa (%):</strong>
                </label>
                <input
                  type="number"
                  id="desconto_tarifa"
                  min="0"
                  max="100"
                  step="1"
                  value={dados.desconto_tarifa}
                  onChange={(e) => setDados(prev => ({ ...prev, desconto_tarifa: e.target.value }))}
                  className="form-control"
                  disabled={dados.usa_desconto_proposta}
                />
              </div>

              <div className="form-group">
                <label htmlFor="desconto_bandeira" className="label-with-icon">
                  <Flag size={14} />
                  <strong>Desconto Bandeira (%):</strong>
                </label>
                <input
                  type="number"
                  id="desconto_bandeira"
                  min="0"
                  max="100"
                  step="1"
                  value={dados.desconto_bandeira}
                  onChange={(e) => setDados(prev => ({ ...prev, desconto_bandeira: e.target.value }))}
                  className="form-control"
                  disabled={dados.usa_desconto_proposta}
                />
              </div>
            </div>

            {!dados.usa_desconto_proposta && (
              <p className="warning-text">
                <AlertTriangle size={14} />
                Descontos individuais substituem os valores da proposta original
              </p>
            )}
          </div>
        </div>

        {/* Calibragem - manter como está */}
        <div className="form-group">
          <label className="label-with-icon">
            <Target size={16} />
            <strong>Calibragem:</strong>
          </label>
          
          <div style={{ marginBottom: '15px' }}>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={dados.usa_calibragem_global}
                onChange={(e) => handleCalibragemGlobalChange(e.target.checked)}
                className="checkbox-input"
              />
              <div className="checkbox-icon-custom">
                {dados.usa_calibragem_global ? (
                  <CheckCircle size={14} />
                ) : (
                  <Circle size={14} />
                )}
              </div>
              <span className="checkbox-text">
                Usar calibragem global ({dados.calibragem_global}%)
              </span>
            </label>
          </div>

          {!dados.usa_calibragem_global && (
            <div>
              <label htmlFor="calibragem_individual">
                Calibragem específica (%):
              </label>
              <input
                type="number"
                id="calibragem_individual"
                min="0"
                max="100"
                step="1"
                value={dados.calibragemIndividual}
                onChange={(e) => setDados(prev => ({ ...prev, calibragemIndividual: e.target.value }))}
                required={!dados.usa_calibragem_global}
                className="form-input"
                placeholder="Ex: 5.5"
              />
            </div>
          )}
        </div>

        {/* ✅ SEÇÃO DE DOCUMENTAÇÃO */}
        <div className="form-group">
          <label className="label-with-icon">
            <FileText size={16} />
            <strong>Documentação:</strong>
          </label>

          <div className="form-group file-group">
            <label>Declaração de Troca de Titularidade</label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => handleDocumentUpload(e.target.files[0])}
            />
            {dados.documentacao_troca_titularidade && (
              <div className="arquivo-existente">
                <span className="arquivo-info" title={dados.documentacao_troca_titularidade}>
                  <FileText size={14} /> {dados.documentacao_troca_titularidade.length > 30 ?
                    dados.documentacao_troca_titularidade.substring(0, 30) + '...' :
                    dados.documentacao_troca_titularidade}
                </span>
                <div className="arquivo-acoes">
                  <button
                    type="button"
                    className="btn-visualizar-doc"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      visualizarDocumento(dados.documentacao_troca_titularidade);
                    }}
                    title="Visualizar declaração"
                  >
                    <Eye size={14} />
                  </button>
                  <button
                    type="button"
                    className="btn-remover-doc"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      removerDocumento();
                    }}
                    title="Remover documento"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ✅ NOVO CAMPO: Observações */}
        <div className="form-group observacoes-group">
          <label htmlFor="observacoes" className="label-with-icon">
            <FileText size={16} />
            <strong>Observações:</strong>
          </label>
          <textarea
            id="observacoes"
            rows="3"
            value={dados.observacoes}
            onChange={(e) => setDados(prev => ({ ...prev, observacoes: e.target.value }))}
            className="form-control"
            placeholder="Observações sobre esta UC..."
          />
        </div>

        {/* Botões */}
        <div className="modal-footer modal-footer-controle">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            <X size={16} />
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary">
            <Save size={16} />
            Salvar Alterações
          </button>
        </div>
      </form>
      </div>
    </div>
  );
};

// Modal de Confirmação de Exclusão
const ModalConfirmarExclusao = ({ item, onConfirmar, onClose }) => {
  return (
    <div className="common-modal-overlay" onClick={onClose}>
      <div className="common-modal modal-controle" onClick={(e) => e.stopPropagation()}>
        <div className="common-modal-header modal-header-controle">
          <h3 className="modal-title-controle">
            <Trash2 size={20} />
            Confirmar Exclusão
          </h3>
          <button onClick={onClose} className="common-close-btn">
            <X size={18} />
          </button>
        </div>

        <div className="common-modal-content modal-body-controle">
          <div className="aviso-exclusao">
            <div className="icone-aviso">
              <AlertTriangle size={48} />
            </div>
            <h4>Tem certeza que deseja excluir esta UC do controle?</h4>
          </div>

          <div className="proposta-info">
            <p><strong>Cliente:</strong> {item.nomeCliente}</p>
            <p><strong>UC:</strong> {item.numeroUC}</p>
            <p><strong>Apelido:</strong> {item.apelido}</p>
            <p><strong>Média:</strong> {item.media} kWh</p>
          </div>

          <div className="consequencias-exclusao">
            <h5>
              <AlertTriangle size={16} />
              Consequências desta ação:
            </h5>
            <ul>
              <li>A UC será removida do controle (soft delete)</li>
              <li>O status da proposta voltará para "Pendente"</li>
              <li>Esta ação pode ser revertida pelo sistema</li>
            </ul>
          </div>
        </div>

        <div className="modal-footer modal-footer-controle">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            <X size={16} />
            Cancelar
          </button>
          <button
            type="button"
            onClick={(e) => {
              console.log('🔴 BOTÃO CONFIRMAR CLICADO');
              console.log('🔍 Evento:', e);
              console.log('🔍 onConfirmar função:', typeof onConfirmar);
              onConfirmar();
            }}
            className="btn btn-danger"
          >
            <Trash2 size={16} />
            Confirmar Exclusão
          </button>
        </div>
      </div>
    </div>
  );
};

export default ControlePage;