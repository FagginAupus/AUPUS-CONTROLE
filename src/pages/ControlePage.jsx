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
  Edit,
  Clock
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

  const calcularValorCalibrado = useCallback((media, calibragem) => {
    if (!media || !calibragem || calibragem === 0) return 0;
    
    const mediaNum = parseFloat(media);
    const calibragemNum = parseFloat(calibragem);
    return mediaNum * (1 + calibragemNum / 100);
  }, []);

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
        console.log('✅ DEBUG - Sucesso, fechando modal');
        
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
      await storageService.exportarParaCSV('controle');
      showNotification('Dados exportados com sucesso!', 'success');
    } catch (error) {
      console.error('❌ Erro ao exportar:', error);
      showNotification('Erro ao exportar: ' + error.message, 'error');
    }
  }, [showNotification]);

  // ✅ NOVAS FUNÇÕES PARA MODAL UC DETALHES
  const abrirModalUCDetalhes = useCallback((item, index) => {
    console.log('🏠 Abrindo modal UC detalhes:', item);
    setModalUCDetalhes({ 
      show: true, 
      item: { ...item, controleId: item.id }, 
      index 
    });
  }, []);

  const salvarUCDetalhes = useCallback(async (dados) => {
    try {
      console.log('💾 Salvando detalhes da UC:', dados);
      showNotification('Processando...', 'info');

      const response = await apiService.put(`/controle/${dados.controleId}/uc-detalhes`, {
        consumo_medio: parseFloat(dados.consumo_medio),
        usa_calibragem_global: dados.usa_calibragem_global,
        calibragem_individual: dados.usa_calibragem_global ? null : parseFloat(dados.calibragem_individual)
      });

      if (response?.success) {
        // ✅ CORREÇÃO: Remover atualização manual que causa erro
        setModalUCDetalhes({ show: false, item: null, index: -1 });
        showNotification('UC atualizada com sucesso!', 'success');

        // Recarregar dados para garantir consistência
        await loadControle(controle.currentPage, controle.filters, true);
      }
    } catch (error) {
      console.error('❌ Erro ao salvar UC:', error);
      showNotification('Erro ao salvar UC: ' + error.message, 'error');
    }
  }, [modalUCDetalhes, showNotification, loadControle, controle]);


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
                    step="0.1"
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

            {/* Botão para limpar filtros */}
            <div className="actions-container">
              <button onClick={limparFiltros} className="btn btn-secondary">
                Limpar Filtros
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
                          {calibragemTemp !== 0 && item.media ? (
                            <div className="calibragem-info">
                              <span className="calibragem-calculada">
                                {calcularValorCalibrado(item.media, calibragemTemp).toFixed(0)}
                              </span>
                              <br />
                              <small 
                                className={`calibragem-status ${calibragemTemp !== calibragemGlobal ? 'pendente' : 'calibrada'}`}
                              >
                                {calibragemTemp > 0 ? '+' : ''}{calibragemTemp}%
                                {calibragemTemp !== calibragemGlobal ? ' (preview)' : ''}
                              </small>
                            </div>
                          ) : (
                            <span className="sem-calibragem">
                              {calibragemTemp === 0 ? 'Sem calibragem' : '-'}
                            </span>
                          )}
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
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            {/* Botão UG */}
                            <button
                              onClick={() => editarUG(index)}
                              className="btn btn-small btn-secondary"
                              title="Editar UG"
                            >
                              <Edit size={16} /> UG
                            </button>
                            
                            {/* Botão UC */}
                            <button
                              onClick={() => abrirModalUCDetalhes(item, index)}
                              className="btn btn-small btn-secondary"
                              title="Editar UC"
                            >
                              📝 UC
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
  const [loading, setLoading] = useState(true);
  const [dados, setDados] = useState({
    numero_proposta: '',
    nome_cliente: '',
    numero_uc: '',
    apelido: '',
    consumo_medio: '',
    calibragem_individual: '',
    usa_calibragem_global: true,
    calibragem_global: 0
  });

  // Carregar dados da UC
  useEffect(() => {
    const carregarDadosUC = async () => {
      try {
        setLoading(true);
        console.log('📡 Carregando dados da UC:', item.controleId);

        const response = await apiService.get(`/controle/${item.controleId}/uc-detalhes`);
        
        if (response?.success) {
          setDados({
            numero_proposta: response.data.numero_proposta || '',
            nome_cliente: response.data.nome_cliente || '',
            numero_uc: response.data.numero_uc || '',
            apelido: response.data.apelido || '',
            consumo_medio: response.data.consumo_medio || '',
            calibragem_individual: response.data.calibragem_individual || '',
            usa_calibragem_global: response.data.usa_calibragem_global,
            calibragem_global: response.data.calibragem_global || 0,
            controleId: item.controleId
          });
        }
      } catch (error) {
        console.error('❌ Erro ao carregar dados da UC:', error);
      } finally {
        setLoading(false);
      }
    };

    if (item?.controleId) {
      carregarDadosUC();
    }
  }, [item]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validações
    if (!dados.consumo_medio || parseFloat(dados.consumo_medio) < 0) {
      alert('Consumo médio deve ser um valor positivo');
      return;
    }

    if (!dados.usa_calibragem_global) {
      if (!dados.calibragem_individual || parseFloat(dados.calibragem_individual) < 0 || parseFloat(dados.calibragem_individual) > 100) {
        alert('Calibragem individual deve ser entre 0 e 100%');
        return;
      }
    }

    onSave(dados);
  };

  const handleCalibragemGlobalChange = (checked) => {
    setDados(prev => ({
      ...prev,
      usa_calibragem_global: checked,
      calibragem_individual: checked ? '' : prev.calibragem_individual
    }));
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
      <div className="modal-content modal-controle" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header modal-header-controle">
          <h3>🏠 Editar Detalhes da UC</h3>
          <button onClick={onClose} className="btn btn-close">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body modal-body-controle">
          {/* Informações da Proposta (Apenas Leitura) */}
          <div className="proposta-info">
            <h4>📋 Informações da Proposta</h4>
            <p><strong>Proposta:</strong> {dados.numero_proposta}</p>
            <p><strong>Cliente:</strong> {dados.nome_cliente}</p>
            <p><strong>UC:</strong> {dados.numero_uc} - {dados.apelido}</p>
          </div>

          {/* Consumo Médio (Editável) */}
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label htmlFor="consumo_medio">
              <strong>⚡ Consumo Médio (kWh):</strong>
            </label>
            <input
              type="number"
              id="consumo_medio"
              min="0"
              step="0.01"
              value={dados.consumo_medio}
              onChange={(e) => setDados(prev => ({ ...prev, consumo_medio: e.target.value }))}
              required
              style={{
                padding: '12px 15px',
                border: '2px solid #e9ecef',
                borderRadius: '6px',
                fontSize: '0.95rem',
                background: 'white',
                color: '#333'
              }}
            />
          </div>

          {/* Calibragem */}
          <div className="form-group" style={{ marginBottom: '20px' }}>
            <label>
              <strong>🎯 Calibragem:</strong>
            </label>
            
            {/* Checkbox para usar calibragem global */}
            <div style={{ marginTop: '10px', marginBottom: '15px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={dados.usa_calibragem_global}
                  onChange={(e) => handleCalibragemGlobalChange(e.target.checked)}
                  style={{ transform: 'scale(1.2)' }}
                />
                <span>Usar calibragem global ({dados.calibragem_global}%)</span>
              </label>
            </div>

            {/* Campo de calibragem individual */}
            {!dados.usa_calibragem_global && (
              <div>
                <label htmlFor="calibragem_individual">
                  <strong>Calibragem Individual (%):</strong>
                </label>
                <input
                  type="number"
                  id="calibragem_individual"
                  min="0"
                  max="100"
                  step="0.01"
                  value={dados.calibragem_individual}
                  onChange={(e) => setDados(prev => ({ ...prev, calibragem_individual: e.target.value }))}
                  required={!dados.usa_calibragem_global}
                  style={{
                    padding: '12px 15px',
                    border: '2px solid #e9ecef',
                    borderRadius: '6px',
                    fontSize: '0.95rem',
                    background: 'white',
                    color: '#333',
                    marginTop: '8px'
                  }}
                />
              </div>
            )}
          </div>

          {/* Informação sobre calibragem efetiva */}
          <div style={{
            padding: '12px 16px',
            background: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '6px',
            fontSize: '0.9rem',
            color: '#495057'
          }}>
            <strong>Calibragem que será aplicada:</strong> {
              dados.usa_calibragem_global 
                ? `${dados.calibragem_global}% (global)` 
                : `${dados.calibragem_individual || 0}% (individual)`
            }
          </div>
        </form>

        <div className="modal-footer modal-footer-controle">
          <button type="button" onClick={onClose} className="btn btn-secondary">
            Cancelar
          </button>
          <button type="submit" onClick={handleSubmit} className="btn btn-primary">
            💾 Salvar Alterações
          </button>
        </div>
      </div>
    </div>
  );
};

export default ControlePage;