// src/pages/ControlePage.jsx - Com calibragem no estilo original restaurada
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Header from '../components/common/Header';
import Navigation from '../components/common/Navigation';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import storageService from '../services/storageService';
import apiService from '../services/apiService';

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
  Save        
} from 'lucide-react';
import './ControlePage.css';

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
  const isAdmin = user?.role === 'admin'; 
  const loadingUgsRef = useRef(false); 

  const [calibragemTemp, setCalibragemTemp] = useState(calibragemGlobal);

  // ✅ ADICIONAR useEffect para carregar calibragem quando necessário
  useEffect(() => {
    if (isAdmin && calibragem.valor === 0 && !calibragem.loading) {
      loadCalibragem();
    }
  }, [isAdmin, calibragem.valor, calibragem.loading, loadCalibragem]);


  const [ugsDisponiveis, setUgsDisponiveis] = useState([]);
  const [modalUG, setModalUG] = useState({ show: false, item: null, index: -1 });
  const [modalStatusTroca, setModalStatusTroca] = useState({ show: false, item: null, index: -1 });
  const [modalUCDetalhes, setModalUCDetalhes] = useState({ show: false, item: null, index: -1 });
  const [filtros, setFiltros] = useState({
    consultor: '',
    ug: '',
    busca: '',
    statusTroca: '' 
  });

  const { showNotification } = useNotification();
  const debouncedFiltros = useMemo(() => filtros, [filtros]);

  useEffect(() => {
    if (isAdmin && 
        (!ugs.data || ugs.data.length === 0) && 
        !ugs.loading && 
        !loadingUgsRef.current) {
      
      loadingUgsRef.current = true;
      
      loadUgs({}, true).finally(() => {
        loadingUgsRef.current = false;
      });
    }
  }, [isAdmin]);
  
  const carregarUGs = useCallback(async () => {
    if (controle.loading) return;
    
    try {
      if (!isAdmin) return;
      
      const ugs = await storageService.getUGs();
      setUgsDisponiveis(ugs);
    } catch (error) {
      console.error('❌ Erro ao carregar UGs:', error);
      showNotification('Erro ao carregar UGs', 'error');
    }
  }, [controle.loading, isAdmin, showNotification]);

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
    if (!isAdmin) return;
    
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
  }, [isAdmin, dadosFiltrados, ugs.data, calibragemGlobal, showNotification]);

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

  const refreshDados = useCallback(() => {
    console.log('🔄 Refresh manual dos dados');
    loadControle(1, controle.filters, true);
  }, [loadControle, controle.filters]);

  const aplicarCalibragem = useCallback(async () => {
    
    if (!isAdmin) {
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
  }, [isAdmin, calibragemGlobal, loadCalibragem, showNotification]);

  const aplicarCalibragemComValor = useCallback(async (novoValor) => {
    if (!isAdmin) return;
    
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
  }, [isAdmin, loadCalibragem, loadControle, loadUgs, controle.filters, showNotification]);
  
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

      // ✅ CORREÇÃO: Usar o controleId que vem do payload
      const response = await apiService.put(`/controle/${payload.controleId}/uc-detalhes`, {
        consumo_medio: payload.consumo_medio,
        usa_calibragem_global: payload.usa_calibragem_global,
        ...(payload.calibragem_individual !== null && payload.calibragem_individual !== undefined ? {
          calibragem_individual: payload.calibragem_individual
        } : {}),
        observacoes: payload.observacoes,
        desconto_tarifa: payload.desconto_tarifa,
        desconto_bandeira: payload.desconto_bandeira
      });

      if (response?.success) {
        setModalUCDetalhes({ show: false, item: null, index: -1 });
        showNotification('UC atualizada com sucesso!', 'success');

        // Recarregar dados para garantir consistência
        await loadControle(controle.currentPage, controle.filters, true);
      } else {
        throw new Error(response?.message || 'Erro desconhecido');
      }
    } catch (error) {
      console.error('❌ Erro ao salvar UC:', error);
      showNotification('Erro ao salvar UC: ' + error.message, 'error');
    }
  }, [showNotification, loadControle, controle]);


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
            <div className="filters-grid">
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

              <div className="filter-group">
                <label>Buscar:</label>
                <input
                  type="text"
                  placeholder="Cliente, proposta ou UC..."
                  value={filtros.busca}
                  onChange={(e) => setFiltros(prev => ({ ...prev, busca: e.target.value }))}
                />
              </div>
            </div>

            {/* ========================================== */}
            {/* CALIBRAGEM RESTAURADA NO ESTILO ORIGINAL  */}
            {/* ========================================== */}
            {isAdmin && (
              <div className="calibragem-controls">
                <div className="calibragem-group">
                  <label htmlFor="calibragem-input">Calibragem Global:</label>
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
                  />
                  <span style={{ fontSize: '0.9rem', color: '#666', marginLeft: '5px' }}>%</span>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ fontSize: '0.85rem', color: '#666' }}>
                    <strong>Atual: {calibragemGlobal}%</strong>
                    {calibragemGlobal > 0 && (
                      <span style={{ marginLeft: '10px', color: '#4CAF50' }}>
                        (Fator: {(1 + calibragemGlobal / 100).toFixed(3)})
                      </span>
                    )}
                  </div>
                  
                  <button
                    onClick={() => aplicarCalibragemComValor(calibragemTemp)}
                    disabled={calibragem.loading || calibragemTemp < 0 || calibragemTemp > 100}
                    className="btn btn-primary"
                    style={{ minWidth: '100px' }}
                  >
                    {calibragem.loading ? 'Aplicando...' : 'Aplicar'}
                  </button>
                </div>
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
              <button onClick={exportarDados} className="btn btn-primary">
                📊 Exportar CSV
              </button>
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
                    {isAdmin && <th>Calibrada (kWh)</th>}
                    <th>Status Troca</th>
                    {isAdmin && <th>Ações</th>}
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
                      {isAdmin && (
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
                      {isAdmin && (
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
        {modalUG.show && isAdmin && (
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-controle modal-ug-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header modal-header-controle">
          <h3 className="modal-title-controle">🏭 Atribuir UG</h3>
          <button onClick={onClose} className="btn btn-close">✕</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body modal-body-controle">
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3><Edit size={18} /> Gerenciar Status de Troca</h3>
          <button onClick={onClose} className="btn btn-close">✕</button>
        </div>
        
        {showConfirmacao ? (
          <div className="modal-body modal-body-controle confirmacao-body">
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
          <form onSubmit={handleSubmit} className="modal-body modal-body-controle">
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
    controleId: ''
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

        // ✅ LÓGICA CORRIGIDA PARA CALIBRAGEM
        // Se calibragem_individual existe (não é null), usar calibragem individual
        // Se calibragem_individual é null, usar calibragem global
        const calibragemIndividualValue = dadosUC.calibragem_individual;
        const temCalibragemIndividual = calibragemIndividualValue !== null && calibragemIndividualValue !== undefined;
        const usarCalibragemGlobal = !temCalibragemIndividual;
        
        console.log('🎯 Debug calibragem:', {
          calibragem_individual_raw: calibragemIndividualValue,
          tem_calibragem_individual: temCalibragemIndividual,
          usar_calibragem_global: usarCalibragemGlobal,
          calibragem_global: dadosUC.calibragem_global
        });

        // ✅ LÓGICA DOS DESCONTOS
        const proposta_desconto_tarifa = dadosUC.proposta_desconto_tarifa || '20%';
        const proposta_desconto_bandeira = dadosUC.proposta_desconto_bandeira || '20%';
        
        const descontoTarifaAtual = dadosUC.desconto_tarifa || proposta_desconto_tarifa;
        const descontoBandeiraAtual = dadosUC.desconto_bandeira || proposta_desconto_bandeira;
        
        const descontoTarifaProposta = dadosUC.desconto_tarifa_numerico || dadosUC.proposta_desconto_tarifa_numerico || 20;
        const descontoBandeiraProposta = dadosUC.desconto_bandeira_numerico || dadosUC.proposta_desconto_bandeira_numerico || 20;
        
        const usaDescontoProposta = 
          descontoTarifaAtual === proposta_desconto_tarifa && 
          descontoBandeiraAtual === proposta_desconto_bandeira;

        // ✅ DEFINIR OS DADOS NO ESTADO
        setDados({
          numero_proposta: dadosUC.numero_proposta || '',
          nome_cliente: dadosUC.nome_cliente || '',
          numero_uc: dadosUC.numero_uc || '',
          apelido: dadosUC.apelido || '',
          consumo_medio: dadosUC.consumo_medio || '',
          observacoes: dadosUC.observacoes || '',
          
          // ✅ CALIBRAGEM CORRIGIDA
          usa_calibragem_global: usarCalibragemGlobal,
          calibragemIndividual: temCalibragemIndividual ? calibragemIndividualValue.toString() : '',
          calibragem_global: dadosUC.calibragem_global || 0,
          
          // DESCONTOS
          desconto_tarifa: descontoTarifaAtual,
          desconto_bandeira: descontoBandeiraAtual,
          usa_desconto_proposta: usaDescontoProposta,
          proposta_desconto_tarifa: descontoTarifaProposta,
          proposta_desconto_bandeira: descontoBandeiraProposta,
          controleId: item.controleId
        });

        console.log('✅ Estado final dos dados:', {
          usa_calibragem_global: usarCalibragemGlobal,
          calibragemIndividual: temCalibragemIndividual ? calibragemIndividualValue.toString() : '',
          tem_calibragem_individual: temCalibragemIndividual
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
  }, [item, showNotification]);

  const handleSubmit = (e) => {
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

    // ✅ PAYLOAD CORRIGIDO
    const payload = {
      controleId: dados.controleId || item.controleId,
      consumo_medio: parseFloat(dados.consumo_medio),
      usa_calibragem_global: dados.usa_calibragem_global,
      calibragem_individual: dados.usa_calibragem_global ? null : parseFloat(dados.calibragemIndividual),
      observacoes: dados.observacoes,
      
      // ✅ DESCONTOS - lógica corrigida
      usa_desconto_proposta: dados.usa_desconto_proposta,
      ...(dados.usa_desconto_proposta ? {} : {
        desconto_tarifa: parseFloat(dados.desconto_tarifa),
        desconto_bandeira: parseFloat(dados.desconto_bandeira)
      })
    };

    console.log('🔍 Payload sendo enviado:', payload);
    onSave(payload);
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
    if (checked) {
      // Usar descontos da proposta
      setDados(prev => ({
        ...prev,
        usa_desconto_proposta: true,
        desconto_tarifa: prev.proposta_desconto_tarifa,
        desconto_bandeira: prev.proposta_desconto_bandeira
      }));
    } else {
      // Usar descontos individuais
      setDados(prev => ({
        ...prev,
        usa_desconto_proposta: false
      }));
    }
  };


  if (loading) {
    return (
      <div className="modal-overlay">
        <div className="modal-content modal-controle">
          <div className="modal-header modal-header-controle">
            <h3>🏠 Carregando dados da UC...</h3>
            <button onClick={onClose} className="btn btn-close">✕</button>
          </div>
          <div className="modal-body modal-body-controle" style={{ textAlign: 'center', padding: '40px' }}>
            <div>Carregando informações...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-controle modal-uc-detalhes" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header modal-header-controle">
          <h3 className="modal-title-with-icon">
            <Home size={20} />
            Editar Detalhes da UC
          </h3>
          <button onClick={onClose} className="btn btn-close">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body modal-body-controle">
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
        <div className="desconto-section" style={{ marginBottom: '25px', padding: '15px', border: '1px solid #e3e3e3', borderRadius: '8px', background: '#fafafa' }}>
          <h4 className="section-title-with-icon" style={{ marginBottom: '15px', color: '#2c3e50' }}>
            <Percent size={16} />
            Configuração de Descontos
          </h4>

          {/* Toggle para usar desconto da proposta */}
          <div className="form-group" style={{ marginBottom: '15px' }}>
            <label className="checkbox-container" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={dados.usa_desconto_proposta}
                onChange={(e) => toggleDescontoProposta(e.target.checked)}
                style={{ accentColor: '#007bff' }}
              />
              <span style={{ fontWeight: '500' }}>
                Usar descontos da proposta original
              </span>
            </label>
          </div>

          {/* Mostrar descontos da proposta original */}
          <div className="proposta-descontos" style={{ 
            background: '#e8f4fd', 
            padding: '10px', 
            borderRadius: '6px', 
            marginBottom: '15px',
            fontSize: '0.9rem'
          }}>
            <p style={{ margin: '0 0 5px 0', color: '#666' }}>
              <strong>Descontos da Proposta:</strong>
            </p>
            <p style={{ margin: '0' }}>
              <TrendingUp size={14} style={{ display: 'inline', marginRight: '4px' }} />
              Tarifa: <span style={{ fontWeight: '600', color: '#007bff' }}>{dados.proposta_desconto_tarifa}%</span>
              {' | '}
              <Flag size={14} style={{ display: 'inline', marginRight: '4px' }} />
              Bandeira: <span style={{ fontWeight: '600', color: '#007bff' }}>{dados.proposta_desconto_bandeira}%</span>
            </p>
          </div>

          {/* Campos de desconto individual */}
          <div className="descontos-individuais" style={{ opacity: dados.usa_desconto_proposta ? 0.5 : 1 }}>
            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
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
                  style={{
                    background: dados.usa_desconto_proposta ? '#f8f9fa' : 'white',
                    cursor: dados.usa_desconto_proposta ? 'not-allowed' : 'text'
                  }}
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
                  style={{
                    background: dados.usa_desconto_proposta ? '#f8f9fa' : 'white',
                    cursor: dados.usa_desconto_proposta ? 'not-allowed' : 'text'
                  }}
                />
              </div>
            </div>

            {!dados.usa_desconto_proposta && (
              <p style={{ 
                marginTop: '10px', 
                fontSize: '0.85rem', 
                color: '#dc3545',
                fontStyle: 'italic' 
              }}>
                ⚠️ Descontos individuais substituem os valores da proposta original
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

        {/* ✅ NOVO CAMPO: Observações */}
        <div className="form-group" style={{ marginBottom: '25px' }}>
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
            style={{ resize: 'vertical' }}
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

export default ControlePage;