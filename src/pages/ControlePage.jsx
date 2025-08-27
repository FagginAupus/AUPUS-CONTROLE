// src/pages/ControlePage.jsx - Com modal UG corrigido seguindo padrão PROSPEC
import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Edit
} from 'lucide-react';
import './ControlePage.css';

const ControlePage = () => {
  const { user, getMyTeam, getConsultorName } = useAuth();
    const { 
    controle, 
    loadControle,
    ugs,
    loadUgs 
  } = useData();

  const [ugsDisponiveis, setUgsDisponiveis] = useState([]);
  const [modalUG, setModalUG] = useState({ show: false, item: null, index: -1 });
  const [calibragemGlobal, setCalibragemGlobal] = useState(0);
  const [modalStatusTroca, setModalStatusTroca] = useState({ show: false, item: null, index: -1 });

  const [filtros, setFiltros] = useState({
    consultor: '',
    ug: '',
    busca: ''
  });

  const [estatisticas, setEstatisticas] = useState({
    total: 0,
    comUG: 0,
    semUG: 0,
    calibradas: 0
  });

  const { showNotification } = useNotification();
  const debouncedFiltros = useMemo(() => filtros, [filtros]);

  const isAdmin = user?.role === 'admin';
    
    useEffect(() => {
      if (isAdmin && (!ugs.data || ugs.data.length === 0) && !ugs.loading) {
        console.log('🔄 Carregando UGs para admin...');
        loadUgs({}, true);
      }
    }, [isAdmin, ugs.data, ugs.loading, loadUgs]);

    useEffect(() => {
      const carregarCalibragem = async () => {
        console.log('🚀 carregarCalibragem INICIADO');
        console.log('👤 isAdmin:', isAdmin);
        console.log('🔗 apiService disponível:', !!apiService);
        
        if (!isAdmin) {
          console.log('❌ Não é admin, saindo...');
          return;
        }
        
        try {
          console.log('🔗 Fazendo requisição para /configuracoes/calibragem-global/value');
          const response = await apiService.get('/configuracoes/calibragem-global/value');
          
          console.log('📥 Resposta COMPLETA da API:', {
            response: response,
            hasSuccess: response?.success,
            hasValor: response?.valor !== undefined,
            valorTipo: typeof response?.valor,
            valorConteudo: response?.valor,
            estruturaCompleta: JSON.stringify(response, null, 2)
          });
          
          if (response?.success && response?.valor !== undefined) {
            const valorCalibagem = parseFloat(response.valor) || 0;
            console.log('✅ Calibragem carregada com sucesso:', valorCalibagem);
            setCalibragemGlobal(valorCalibagem);
          } else {
            console.log('⚠️ Resposta não possui success=true ou valor está undefined:', {
              success: response?.success,
              valor: response?.valor,
              valorExiste: 'valor' in (response || {})
            });
            setCalibragemGlobal(0); // Valor padrão
          }
        } catch (error) {
          console.error('❌ ERRO ao carregar calibragem:', {
            error: error,
            message: error.message,
            status: error.status,
            response: error.response,
            stack: error.stack
          });
          
          // Se der 404, significa que o endpoint não existe
          if (error.message?.includes('404')) {
            console.log('🔍 Endpoint não encontrado - usando valor padrão 0');
          }
          
          setCalibragemGlobal(0); // Valor padrão em caso de erro
        }
      };
      
      carregarCalibragem();
    }, [isAdmin]);

  console.log('🔍 Debug apiService:', {
    apiServiceDisponivel: !!apiService,
    temMetodoAtualizar: typeof apiService.atualizarConfiguracao,
    temMetodoGet: typeof apiService.getConfiguracao
  });
  
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
    let dados = controle.data || [];

    if (filtros.consultor) {
      dados = dados.filter(item =>
        item.consultor?.toLowerCase().includes(filtros.consultor.toLowerCase())
      );
    }

    if (filtros.ug) {
      if (filtros.ug === 'sem-ug') {
        dados = dados.filter(item => !item.ug);
      } else {
        dados = dados.filter(item => item.ug === filtros.ug);
      }
    }

    if (filtros.busca) {
      const busca = filtros.busca.toLowerCase();
      dados = dados.filter(item =>
        item.nomeCliente?.toLowerCase().includes(busca) ||
        item.numeroProposta?.toLowerCase().includes(busca) ||
        item.numeroUC?.toLowerCase().includes(busca) ||
        item.apelido?.toLowerCase().includes(busca)
      );
    }

    return dados;
  }, [controle.data, filtros]);

  const calcularEstatisticas = useCallback(() => {
    const dados = dadosFiltrados;
    
    setEstatisticas({
      total: dados.length,
      comUG: dados.filter(item => item.ug && item.ug !== '').length,
      semUG: dados.filter(item => !item.ug || item.ug === '').length,
      calibradas: dados.filter(item => item.valorCalibrado > 0).length
    });
  }, [dadosFiltrados]);

  // UseEffect para recalcular estatísticas quando dados mudam
  useEffect(() => {
    calcularEstatisticas();
  }, [calcularEstatisticas]);

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
    if (item.statusTroca !== 'Finalizado') {
      showNotification('Status deve ser "Finalizado" para atribuir UG', 'warning');
      return;
    }

    try {
      // ✅ USAR UGs do contexto se disponíveis, senão buscar
      if (ugs.data && ugs.data.length > 0) {
        console.log('📋 Usando UGs do contexto - abertura instantânea');
        
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

      console.log('🔍 DEBUG - response completa:', response);
      console.log('🔍 DEBUG - response.success:', response?.success);
      console.log('🔍 DEBUG - response.errorType:', response?.errorType);
      console.log('🔍 DEBUG - response.message:', response?.message);

      // Verificar se é erro de capacidade especificamente
      if (response?.success === false && response?.errorType === 'capacity') {
        console.log('✅ DEBUG - Entrando na condição de capacidade');
        console.log('🟡 DEBUG - Chamando showNotification com WARNING');
        showNotification(response.message, 'warning');
        console.log('🔚 DEBUG - Executando return, não deve prosseguir');
        // NÃO fechar o modal - deixar usuário escolher outra UG
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
    console.log('🔄 aplicarCalibragem chamada!');
    console.log('🔍 Debug - isAdmin:', isAdmin);
    console.log('🔍 Debug - calibragemGlobal:', calibragemGlobal);
    
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
    console.log('🔄 Mostrando confirmação...');
    const mensagem = calibragemGlobal === 0 
      ? `Resetar calibragem global para 0% (remover calibragem)?`
      : `Aplicar calibragem de ${calibragemGlobal}% como padrão global do sistema?`;
      
    if (!window.confirm(mensagem)) {
      console.log('❌ Usuário cancelou');
      return;
    }

    try {
      console.log('🔄 Iniciando chamada para API...');
      
      // Salvar a calibragem global nas configurações do sistema
      const response = await apiService.put('/configuracoes/calibragem_global', { 
          valor: calibragemGlobal 
      });
      
      console.log('✅ Resposta da API:', response);
      
      const mensagemSucesso = calibragemGlobal === 0 
        ? 'Calibragem global resetada para 0%!'
        : `Calibragem global de ${calibragemGlobal}% salva com sucesso!`;
        
      showNotification(mensagemSucesso, 'success');
      
    } catch (error) {
      console.error('❌ Erro ao aplicar calibragem:', error);
      showNotification('Erro ao aplicar calibragem: ' + error.message, 'error');
    }
  }, [isAdmin, calibragemGlobal, showNotification]);

  const exportarDados = useCallback(async () => {
    try {
      await storageService.exportarParaCSV('controle');
      showNotification('Dados exportados com sucesso!', 'success');
    } catch (error) {
      console.error('❌ Erro ao exportar:', error);
      showNotification('Erro ao exportar: ' + error.message, 'error');
    }
  }, [showNotification]);

  // Obter listas únicas para filtros
  const consultoresUnicos = useMemo(() => 
    [...new Set((controle.data || []).map(item => item.consultor).filter(Boolean))], 
    [controle.data]
  );
  const ugsUnicas = useMemo(() => 
    [...new Set((controle.data || []).map(item => item.ug).filter(Boolean))], 
    [controle.data]
  );

  return (
    <div className="page-container">
      <div className="container">
        <Header 
          title="Controle" 
        />   
        <Navigation />

        {/* Estatísticas Rápidas */}
        <section className="quick-stats">
          <div className="stat-card">
            <div className="stat-icon">
              <Database size={24} style={{ color: '#f0f0f0', opacity: 0.8 }} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Total</span>
              <span className="stat-value">{estatisticas.total}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <CheckCircle size={24} style={{ color: '#f0f0f0', opacity: 0.8 }} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Com UG</span>
              <span className="stat-value">{estatisticas.comUG}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <AlertTriangle size={24} style={{ color: '#f0f0f0', opacity: 0.8 }} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Sem UG</span>
              <span className="stat-value">{estatisticas.semUG}</span>
            </div>
          </div>
          {isAdmin && (
            <div className="stat-card">
              <div className="stat-icon">
                <Users size={24} style={{ color: '#f0f0f0', opacity: 0.8 }} />
              </div>
              <div className="stat-content">
                <span className="stat-label">Calibradas</span>
                <span className="stat-value">{estatisticas.calibradas}</span>
              </div>
            </div>
          )}
        </section>

        {/* Filtros */}
        <section className="filters-section">
          <div className="filters-container">
            <div className="filters-grid">
              <div className="filter-group">
                <label>Consultor:</label>
                <select
                  value={filtros.consultor}
                  onChange={(e) => setFiltros(prev => ({ ...prev, consultor: e.target.value }))}
                >
                  <option value="">Todos</option>
                  {consultoresUnicos.map(consultor => (
                    <option key={consultor} value={consultor}>{consultor}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>UG:</label>
                <select
                  value={filtros.ug}
                  onChange={(e) => setFiltros(prev => ({ ...prev, ug: e.target.value }))}
                >
                  <option value="">Todas</option>
                  <option value="sem-ug">Sem UG</option>
                  {ugsUnicas.map(ug => (
                    <option key={ug} value={ug}>{ug}</option>
                  ))}
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

            {isAdmin && (
              <div className="calibragem-controls">
                <div className="calibragem-group">
                  <label>Calibragem Global (%):</label>
                  <input
                    type="number"
                    step="1"
                    value={calibragemGlobal}
                    onChange={(e) => setCalibragemGlobal(parseFloat(e.target.value) || 0)}
                    placeholder="Ex: 10"
                  />
                  <button 
                    onClick={aplicarCalibragem} 
                    className="btn btn-primary"
                    disabled={calibragemGlobal < 0 || calibragemGlobal > 100} // ✅ CORREÇÃO: Não desabilitar para valor 0
                  >
                    Aplicar Calibragem
                  </button>
                </div>
                <button 
                  onClick={refreshDados}
                  className="btn btn-secondary"
                  disabled={controle.loading}
                  title="Atualizar dados"
                >
                  {controle.loading ? '🔄' : '⟳'} Atualizar
                </button>
                <button onClick={exportarDados} className="btn btn-secondary">
                  📊 Exportar Dados
                </button>
              </div>
            )}
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
                          <span className="ug-atribuida">{item.ug}</span>
                        ) : (
                          <span className="sem-ug">Sem UG</span>
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
                          {calibragemGlobal !== 0 && item.media ? (
                            <div className="calibragem-info">
                              <div className="calibragem-calculada">
                                {calcularValorCalibrado(item.media, calibragemGlobal).toFixed(0)} kWh
                                <br />
                                <small style={{color: '#4CAF50', fontWeight: '600'}}>
                                  ({calibragemGlobal > 0 ? '+' : ''}{calibragemGlobal}% aplicado)
                                </small>
                              </div>
                            </div>
                          ) : (
                            <div className="sem-calibragem">
                              {calibragemGlobal === 0 ? 'Sem calibragem' : '-'}
                            </div>
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
                      {isAdmin && (
                        <td>
                          <button
                            onClick={() => editarUG(index)}
                            className="btn btn-small btn-secondary"
                            title="Editar UG"
                          >
                            <Edit size={16} /> UG
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Modal UG - Apenas para admin */}
        {modalUG.show && isAdmin && (
          <ModalUG 
            item={modalUG.item}
            ugsAnalise={ugsDisponiveis || []} // ✅ CORRIGIDO: usar ugsDisponiveis
            onSave={salvarUG}
            onClose={() => setModalUG({ show: false, item: null, index: -1 })}
          />
        )}
        {console.log('🔍 Render ModalStatusTroca:', modalStatusTroca.show) || null}
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
    // Limpar data quando status não for "Finalizado"
    if (statusTroca !== 'Finalizado') {
      setDataTitularidade('');
    } else if (statusTroca === 'Finalizado' && !dataTitularidade) {
      // Definir data atual quando selecionar "Finalizado" pela primeira vez
      setDataTitularidade(new Date().toISOString().split('T')[0]);
    }
  }, [statusTroca, dataTitularidade]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Se está saindo de "Finalizado" e tem UG, mostrar confirmação
    if (item.statusTroca === 'Finalizado' && statusTroca !== 'Finalizado' && item.ugNome) {
      setShowConfirmacao(true);
      return;
    }
    
    // Sempre enviar uma data - atual se não for "Finalizado", ou a selecionada se for "Finalizado"
    const dataFinal = statusTroca === 'Finalizado' 
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
                Ao alterar o status de <strong>"Finalizado"</strong> para <strong>"{statusTroca}"</strong>, 
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
                <option value="Aguardando">Aguardando</option>
                <option value="Em andamento">Em andamento</option>
                <option value="Finalizado">Finalizado</option>
              </select>
            </div>
            
            {/* Campo Data - só aparece quando status é "Finalizado" */}
            {statusTroca === 'Finalizado' && (
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

export default ControlePage;