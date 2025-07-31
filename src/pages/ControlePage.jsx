// src/pages/ControlePage.jsx - Com funcionalidade de calibragem corrigida
import React, { useState, useEffect, useCallback } from 'react';
import Header from '../components/common/Header';
import Navigation from '../components/common/Navigation';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import storageService from '../services/storageService';

const ControlePage = () => {
  const { user, getMyTeam, getConsultorName } = useAuth();
  const [dados, setDados] = useState([]);
  const [dadosFiltrados, setDadosFiltrados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ugsDisponiveis, setUgsDisponiveis] = useState([]);
  const [modalUG, setModalUG] = useState({ show: false, item: null, index: -1 });
  const [calibragemGlobal, setCalibragemGlobal] = useState(0);
  const [calibragemAplicada, setCalibragemAplicada] = useState(0); // Valor realmente aplicado na tabela
  
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

  const carregarDados = useCallback(async () => {
    try {
      setLoading(true);
      
      console.log('📥 Carregando dados do controle...');
      
      // Carregar dados do controle
      const dadosControle = await storageService.getControle();
      
      let dadosFiltradosPorEquipe = [];

      if (user?.role === 'admin') {
        // Admin vê todos os dados, mas com consultor responsável
        dadosFiltradosPorEquipe = dadosControle.map(item => ({
          ...item,
          consultor: getConsultorName(item.consultor) // Mostrar consultor responsável
        }));
      } else {
        // Outros usuários veem apenas dados da sua equipe
        const teamNames = getMyTeam().map(member => member.name);
        dadosFiltradosPorEquipe = dadosControle.filter(item => 
          teamNames.includes(item.consultor)
        );
      }
      
      // Garantir IDs únicos
      const dadosComIds = dadosFiltradosPorEquipe.map((item, index) => ({
        ...item,
        id: item.id || `${item.numeroProposta}-${item.numeroUC}-${index}-${Date.now()}`
      }));
      
      setDados(dadosComIds);
      setDadosFiltrados(dadosComIds);
      
      // Atualizar estatísticas
      atualizarEstatisticas(dadosComIds);
      
      if (dadosComIds.length === 0) {
        showNotification('Nenhuma proposta no controle para sua equipe.', 'info');
      } else {
        showNotification(`${dadosComIds.length} propostas carregadas no controle!`, 'success');
      }
      
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
      showNotification('Erro ao carregar dados: ' + error.message, 'error');
      setDados([]);
      setDadosFiltrados([]);
    } finally {
      setLoading(false);
    }
  }, [showNotification, user, getMyTeam, getConsultorName]);

  const carregarUGsDisponiveis = useCallback(async () => {
    if (user?.role !== 'admin') return; // Apenas admin pode gerenciar UGs
    
    try {
      const ugs = await storageService.getUGs();
      setUgsDisponiveis(ugs);
      
      // Carregar calibragem global salva
      const calibragemSalva = storageService.getCalibragemGlobal();
      setCalibragemGlobal(calibragemSalva);
      setCalibragemAplicada(calibragemSalva); // Também definir como aplicada
      
    } catch (error) {
      console.error('❌ Erro ao carregar UGs:', error);
    }
  }, [user]);

  const filtrarDados = useCallback(() => {
    let dadosFiltrados = dados;

    if (filtros.consultor) {
      dadosFiltrados = dadosFiltrados.filter(item =>
        item.consultor?.toLowerCase().includes(filtros.consultor.toLowerCase())
      );
    }

    if (filtros.ug) {
      if (filtros.ug === 'sem-ug') {
        dadosFiltrados = dadosFiltrados.filter(item => !item.ug || item.ug.trim() === '');
      } else {
        dadosFiltrados = dadosFiltrados.filter(item => item.ug === filtros.ug);
      }
    }

    if (filtros.busca) {
      const busca = filtros.busca.toLowerCase();
      dadosFiltrados = dadosFiltrados.filter(item =>
        item.nomeCliente?.toLowerCase().includes(busca) ||
        item.numeroProposta?.toLowerCase().includes(busca) ||
        item.numeroUC?.toLowerCase().includes(busca)
      );
    }

    setDadosFiltrados(dadosFiltrados);
    atualizarEstatisticas(dadosFiltrados);
  }, [dados, filtros]);

  const atualizarEstatisticas = (dadosFiltrados) => {
    const total = dadosFiltrados.length;
    const comUG = dadosFiltrados.filter(item => item.ug && item.ug.trim() !== '').length;
    const semUG = total - comUG;
    const calibradas = dadosFiltrados.filter(item => item.calibrado).length;

    setEstatisticas({
      total,
      comUG,
      semUG,
      calibradas
    });
  };

  useEffect(() => {
    carregarDados();
    carregarUGsDisponiveis();
  }, [carregarDados, carregarUGsDisponiveis]);

  useEffect(() => {
    filtrarDados();
  }, [filtrarDados]);

  const limparFiltros = () => {
    setFiltros({
      consultor: '',
      ug: '',
      busca: ''
    });
  };

  // Funções apenas para admin
  const editarUG = (index) => {
    if (user?.role !== 'admin') return;
    
    const item = dadosFiltrados[index];
    if (!item) return;
    setModalUG({ show: true, item, index });
  };

  const salvarUG = async (novaUG) => {
    if (user?.role !== 'admin') return;
    
    try {
      const { item } = modalUG;
      
      const indexReal = dados.findIndex(p => p.id === item.id);
      
      if (indexReal === -1) {
        showNotification('Item não encontrado para edição', 'error');
        return;
      }

      await storageService.atualizarUGControle(indexReal, novaUG);
      await carregarDados();
      
      setModalUG({ show: false, item: null, index: -1 });
      
      const mensagem = novaUG ? 
        `UG "${novaUG}" definida com sucesso!` : 
        'UG removida com sucesso!';
      
      showNotification(mensagem, 'success');
      
    } catch (error) {
      console.error('❌ Erro ao salvar UG:', error);
      showNotification('Erro ao salvar UG: ' + error.message, 'error');
    }
  };

  const aplicarCalibragemGlobal = async () => {
    if (user?.role !== 'admin') return;
    
    if (calibragemGlobal === 0) {
      showNotification('Digite um valor de calibragem diferente de zero', 'warning');
      return;
    }

    try {
      // Salvar a calibragem
      storageService.setCalibragemGlobal(calibragemGlobal);
      
      // Aplicar calibragem global
      await storageService.aplicarCalibragemGlobal(calibragemGlobal);
      
      // Atualizar o valor aplicado para refletir na tabela
      setCalibragemAplicada(calibragemGlobal);
      
      await carregarUGsDisponiveis();
      await carregarDados();
      
      showNotification(`Calibragem de ${calibragemGlobal}% aplicada em todas as UGs!`, 'success');
      
    } catch (error) {
      console.error('❌ Erro na calibragem global:', error);
      showNotification('Erro na calibragem: ' + error.message, 'error');
    }
  };

  const exportarDados = async () => {
    try {
      await storageService.exportarParaCSV('controle');
      showNotification('Dados de controle exportados com sucesso!', 'success');
    } catch (error) {
      console.error('❌ Erro ao exportar:', error);
      showNotification('Erro ao exportar: ' + error.message, 'error');
    }
  };

  // Função para calcular valor calibrado usando o valor APLICADO
  const calcularValorCalibrado = (media, calibragem) => {
    if (!media || media === 0) return 0;
    if (!calibragem || calibragem === 0) return parseFloat(media);
    
    const multiplicador = 1 + (calibragem / 100);
    return Math.round(parseFloat(media) * multiplicador);
  };

  // Obter listas únicas para filtros
  const consultoresUnicos = [...new Set(dados.map(item => item.consultor).filter(Boolean))];
  const ugsUnicas = [...new Set(dados.map(item => item.ug).filter(Boolean))];

  // Verificar se é admin
  const isAdmin = user?.role === 'admin';

  return (
    <div className="page-container">
      <div className="container">
        <Header 
          title="CONTROLE" 
          subtitle="Propostas Fechadas e UGs" 
          icon="⚙️" 
        />
        
        <Navigation />

        {/* Estatísticas */}
        <section className="quick-stats">
          <div className="stat-card">
            <span className="stat-label">Total</span>
            <span className="stat-value">{estatisticas.total}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Com UG</span>
            <span className="stat-value">{estatisticas.comUG}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Sem UG</span>
            <span className="stat-value">{estatisticas.semUG}</span>
          </div>
          {isAdmin && (
            <div className="stat-card">
              <span className="stat-label">Calibradas</span>
              <span className="stat-value">{estatisticas.calibradas}</span>
            </div>
          )}
        </section>

        {/* Filtros e Controles */}
        <section className="filters-section">
          <div className="filters-container">
            <div className="filters-grid">
              <div className="filter-group">
                <label>Buscar</label>
                <input
                  type="text"
                  placeholder="🔍 Cliente, proposta ou UC..."
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
                <label>UG</label>
                <select
                  value={filtros.ug}
                  onChange={(e) => setFiltros({...filtros, ug: e.target.value})}
                >
                  <option value="">Todas</option>
                  <option value="sem-ug">Sem UG definida</option>
                  {ugsUnicas.map(ug => (
                    <option key={ug} value={ug}>{ug}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="actions-container">
              <button onClick={limparFiltros} className="btn btn-secondary">
                Limpar Filtros
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
              <h2>Propostas Fechadas</h2>
              <div className="table-header-right">
                <span className="table-count">{dadosFiltrados.length} registros</span>
                {isAdmin && (
                  <div className="calibragem-controls-compact">
                    <input
                      id="calibragemGlobal"
                      type="number"
                      value={calibragemGlobal}
                      onChange={(e) => setCalibragemGlobal(parseFloat(e.target.value) || 0)}
                      min="0"
                      max="200"
                      step="0.1"
                      placeholder="0"
                      className="calibragem-input-compact"
                      title="Percentual de calibragem"
                    />
                    <span className="calibragem-percent-compact">%</span>
                    <button 
                      onClick={aplicarCalibragemGlobal}
                      className="calibragem-apply-compact"
                      disabled={calibragemGlobal === 0}
                      title="Aplicar calibragem"
                    >
                      Aplicar
                    </button>
                  </div>
                )}
              </div>
            </div>

            {loading ? (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Carregando dados...</p>
              </div>
            ) : dadosFiltrados.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">⚙️</div>
                <h3>Nenhuma proposta encontrada</h3>
                <p>Não há propostas no controle que correspondam aos filtros aplicados.</p>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>UG</th>
                      <th>Cliente</th>
                      <th>Nº Proposta</th>
                      <th>Data</th>
                      <th>UC</th>
                      <th>Média</th>
                      <th>Calibragem</th>
                      {isAdmin && <th>Ações</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {dadosFiltrados.map((item, index) => {
                      const valorCalibrado = calcularValorCalibrado(item.media, calibragemAplicada);
                      
                      return (
                        <tr key={item.id}>
                          <td>
                            {item.ug ? (
                              <span className="ug-definida">{item.ug}</span>
                            ) : (
                              <span className="ug-pendente">Pendente</span>
                            )}
                          </td>
                          <td>{item.nomeCliente || '-'}</td>
                          <td>{item.numeroProposta || '-'}</td>
                          <td>
                            {item.data ? (() => {
                              try {
                                const dataObj = new Date(item.data);
                                return dataObj.toLocaleDateString('pt-BR');
                              } catch {
                                return item.data;
                              }
                            })() : '-'}
                          </td>
                          <td>{item.numeroUC || '-'}</td>
                          <td>
                            <span className="media-calculada">
                              {item.media ? parseFloat(item.media).toFixed(0) : '0'}
                            </span>
                          </td>
                          <td>
                            {calibragemAplicada > 0 && item.media ? (
                              <div className="calibragem-info">
                                <span className="calibragem-resultado">
                                  {valorCalibrado.toFixed(0)}
                                </span>
                                <small style={{color: '#666', fontSize: '0.8rem'}}>
                                  (+{calibragemAplicada}%)
                                </small>
                              </div>
                            ) : (
                              <span className="sem-calibragem">Sem calibragem</span>
                            )}
                          </td>
                          {isAdmin && (
                            <td>
                              <button
                                onClick={() => editarUG(index)}
                                className="btn btn-small btn-secondary"
                                title="Editar UG"
                              >
                                ✏️ UG
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Modal UG */}
        {modalUG.show && (
          <div className="modal-overlay" onClick={() => setModalUG({ show: false, item: null, index: -1 })}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Editar UG</h3>
                <button 
                  onClick={() => setModalUG({ show: false, item: null, index: -1 })}
                  className="btn btn-close"
                >
                  ✕
                </button>
              </div>
              
              <div className="modal-body">
                <div className="proposta-info">
                  <h4>{modalUG.item?.nomeCliente}</h4>
                  <p><strong>Proposta:</strong> {modalUG.item?.numeroProposta}</p>
                  <p><strong>UC:</strong> {modalUG.item?.numeroUC}</p>
                  <p><strong>Média:</strong> {modalUG.item?.media}</p>
                </div>

                <div className="form-group">
                  <label>UG Responsável</label>
                  <select 
                    defaultValue={modalUG.item?.ug || ''}
                    onChange={(e) => {
                      const novaUG = e.target.value;
                      setModalUG(prev => ({
                        ...prev,
                        item: { ...prev.item, ug: novaUG }
                      }));
                    }}
                  >
                    <option value="">Selecione uma UG</option>
                    {ugsDisponiveis.map(ug => (
                      <option key={ug.nomeUsina} value={ug.nomeUsina}>
                        {ug.nomeUsina}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  onClick={() => salvarUG(modalUG.item?.ug)}
                  className="btn btn-primary"
                >
                  Salvar
                </button>
                <button 
                  onClick={() => salvarUG('')}
                  className="btn btn-danger"
                >
                  Remover UG
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ControlePage;