// src/pages/ControlePage.jsx - Com modal UG corrigido seguindo padrão PROSPEC
import React, { useState, useEffect, useCallback } from 'react';
import Header from '../components/common/Header';
import Navigation from '../components/common/Navigation';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import storageService from '../services/storageService';
import './ControlePage.css';

const ControlePage = () => {
  const { user, getMyTeam, getConsultorName } = useAuth();
  const [dados, setDados] = useState([]);
  const [dadosFiltrados, setDadosFiltrados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ugsDisponiveis, setUgsDisponiveis] = useState([]);
  const [modalUG, setModalUG] = useState({ show: false, item: null, index: -1 });
  const [calibragemGlobal, setCalibragemGlobal] = useState(0);
  const [calibragemAplicada, setCalibragemAplicada] = useState(0);
  const [ugSelecionada, setUgSelecionada] = useState(''); // Estado para controlar o select
  
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
      
      const dadosControle = await storageService.getControle();
      
      let dadosFiltradosPorEquipe = [];

      if (user?.role === 'admin') {
        dadosFiltradosPorEquipe = dadosControle.map(item => ({
          ...item,
          consultor: getConsultorName(item.consultor)
        }));
      } else {
        const teamNames = getMyTeam().map(member => member.name);
        dadosFiltradosPorEquipe = dadosControle.filter(item => 
          teamNames.includes(item.consultor)
        );
      }
      
      const dadosComIds = dadosFiltradosPorEquipe.map((item, index) => ({
        ...item,
        id: item.id || `${item.numeroProposta}-${item.numeroUC}-${index}-${Date.now()}`
      }));
      
      setDados(dadosComIds);
      setDadosFiltrados(dadosComIds);
      
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
    if (user?.role !== 'admin') return;
    
    try {
      const ugs = await storageService.getUGs();
      setUgsDisponiveis(ugs);
      
      const calibragemSalva = storageService.getCalibragemGlobal();
      setCalibragemGlobal(calibragemSalva);
      setCalibragemAplicada(calibragemSalva);
      
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

    setEstatisticas({ total, comUG, semUG, calibradas });
  };

  useEffect(() => {
    carregarDados();
    carregarUGsDisponiveis();
  }, [carregarDados, carregarUGsDisponiveis]);

  useEffect(() => {
    filtrarDados();
  }, [filtrarDados]);

  const editarUG = (index) => {
    const item = dadosFiltrados[index];
    setModalUG({ show: true, item, index });
    setUgSelecionada(item.ug || ''); // Definir o valor inicial do select
  };

  const salvarUG = async (novaUG = null) => {
    try {
      const itemParaSalvar = modalUG.item;
      if (!itemParaSalvar) {
        showNotification('Erro: Item não encontrado', 'error');
        return;
      }

      // Use o valor do select se novaUG não for fornecida
      const ugParaSalvar = novaUG !== null ? novaUG : ugSelecionada;
      
      // Encontrar o index real no array de dados original
      const indexReal = dados.findIndex(d => d.id === itemParaSalvar.id);
      
      if (indexReal === -1) {
        showNotification('Erro: Item não encontrado no controle', 'error');
        return;
      }

      // Atualizar usando o método correto do storageService
      await storageService.atualizarUGControle(indexReal, ugParaSalvar);
      
      // Fechar modal
      setModalUG({ show: false, item: null, index: -1 });
      setUgSelecionada('');
      
      // Recarregar dados
      await carregarDados();
      
      showNotification(
        ugParaSalvar ? 'UG atribuída com sucesso!' : 'UG removida com sucesso!', 
        'success'
      );
    } catch (error) {
      console.error('❌ Erro ao salvar UG:', error);
      showNotification('Erro ao salvar UG: ' + error.message, 'error');
    }
  };

  const aplicarCalibragem = () => {
    setCalibragemAplicada(calibragemGlobal);
    storageService.setCalibragemGlobal(calibragemGlobal);
    showNotification(`Calibragem de ${calibragemGlobal}% aplicada!`, 'success');
  };

  const exportarDados = async () => {
    try {
      await storageService.exportarDadosFiltrados('controle', dadosFiltrados);
      showNotification('Dados exportados com sucesso!', 'success');
    } catch (error) {
      console.error('❌ Erro ao exportar:', error);
      showNotification('Erro ao exportar: ' + error.message, 'error');
    }
  };

  const calcularValorCalibrado = (media, calibragem) => {
    if (!media || media === 0) return 0;
    if (!calibragem || calibragem === 0) return parseFloat(media);
    
    const multiplicador = 1 + (calibragem / 100);
    return Math.round(parseFloat(media) * multiplicador);
  };

  const consultoresUnicos = [...new Set(dados.map(item => item.consultor).filter(Boolean))];
  const ugsUnicas = [...new Set(dados.map(item => item.ug).filter(Boolean))];

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
                    value={calibragemGlobal}
                    onChange={(e) => setCalibragemGlobal(parseFloat(e.target.value) || 0)}
                    placeholder="Ex: 10"
                  />
                  <button onClick={aplicarCalibragem} className="btn btn-primary">
                    Aplicar Calibragem
                  </button>
                </div>
                <button onClick={exportarDados} className="btn btn-secondary">
                  📊 Exportar Dados
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Tabela */}
        <section className="table-section">
          <div className="table-container">
            {loading ? (
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
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th>Proposta</th>
                      <th>Cliente</th>
                      <th>UC</th>
                      <th>Consultor</th>
                      <th>Distribuidora</th>
                      <th>UG</th>
                      <th>Média (kWh)</th>
                      <th>Calibrada (kWh)</th>
                      {isAdmin && <th>Ações</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {dadosFiltrados.map((item, index) => {
                      const valorCalibrado = calcularValorCalibrado(item.media, calibragemAplicada);
                      
                      return (
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
                            <span className="distribuidora-nome">{item.distribuidora}</span>
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

        {/* Modal UG - CORRIGIDO seguindo padrão PROSPEC */}
        {modalUG.show && (
          <div className="modal-overlay" onClick={() => setModalUG({ show: false, item: null, index: -1 })}>
            <div className="modal-content modal-controle" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header modal-header-controle">
                <h3>⚙️ Editar UG</h3>
                <button 
                  onClick={() => setModalUG({ show: false, item: null, index: -1 })}
                  className="btn btn-close"
                >
                  ✕
                </button>
              </div>
              
              <div className="modal-body modal-body-controle">
                <div className="proposta-info">
                  <h4>{modalUG.item?.nomeCliente}</h4>
                  <p><strong>Proposta:</strong> {modalUG.item?.numeroProposta}</p>
                  <p><strong>UC:</strong> {modalUG.item?.numeroUC}</p>
                  <p><strong>Média:</strong> {modalUG.item?.media} kWh</p>
                </div>

                <div className="form-group">
                  <label>UG Responsável</label>
                  <select 
                    value={ugSelecionada}
                    onChange={(e) => setUgSelecionada(e.target.value)}
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

              <div className="modal-footer modal-footer-controle">
                <button 
                  onClick={() => salvarUG()}
                  className="btn btn-primary"
                  disabled={!ugSelecionada}
                >
                  💾 Salvar UG
                </button>
                <button 
                  onClick={() => salvarUG('')}
                  className="btn btn-danger"
                >
                  🗑️ Remover UG
                </button>
                <button 
                  onClick={() => setModalUG({ show: false, item: null, index: -1 })}
                  className="btn btn-secondary"
                >
                  Cancelar
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