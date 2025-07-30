// src/pages/ControlePage.jsx - Com filtros por equipe e controle de funcionalidades
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

        {/* Calibragem Global - apenas para admin */}
        {isAdmin && (
          <section className="calibragem-section">
            <div className="calibragem-container">
              <h3>🎯 Calibragem Global</h3>
              <div className="calibragem-controls">
                <div className="calibragem-input">
                  <label>Percentual de Calibragem (%)</label>
                  <input
                    type="number"
                    value={calibragemGlobal}
                    onChange={(e) => setCalibragemGlobal(parseFloat(e.target.value) || 0)}
                    min="0"
                    max="200"
                    step="0.1"
                    placeholder="Ex: 15"
                  />
                </div>
                <button 
                  onClick={aplicarCalibragemGlobal}
                  className="btn btn-primary"
                  disabled={calibragemGlobal === 0}
                >
                  Aplicar Calibragem
                </button>
              </div>
            </div>
          </section>
        )}

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
                  <option value="">Todos os consultores</option>
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
                  <option value="">Todas as UGs</option>
                  <option value="sem-ug">Sem UG</option>
                  {ugsUnicas.map(ug => (
                    <option key={ug} value={ug}>{ug}</option>
                  ))}
                </select>
              </div>
              
              <div className="filter-group">
                <label>&nbsp;</label>
                <button onClick={limparFiltros} className="btn btn-secondary">
                  🗑️ Limpar
                </button>
              </div>
            </div>
          </div>

          {/* Ações */}
          <div className="actions-container">
            <button onClick={exportarDados} className="btn btn-secondary">
              📊 Exportar CSV
            </button>
            <button onClick={carregarDados} className="btn btn-secondary">
              🔄 Atualizar
            </button>
          </div>
        </section>

        {/* Tabela de Controle */}
        <section className="table-section">
          <div className="table-header">
            <h2>⚙️ Propostas no Controle</h2>
            <span className="table-count">{dadosFiltrados.length} propostas</span>
          </div>
          
          {loading ? (
            <div className="loading">Carregando dados de controle...</div>
          ) : dadosFiltrados.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">⚙️</div>
              <h3>Nenhuma proposta no controle</h3>
              <p>As propostas fechadas aparecerão aqui automaticamente</p>
            </div>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Proposta</th>
                    <th>Data</th>
                    <th>Cliente</th>
                    <th>UC</th>
                    <th>Consultor</th>
                    <th>Média (kWh)</th>
                    <th>UG Atribuída</th>
                    {/* Mostrar calibragem apenas para admin */}
                    {isAdmin && <th>Calibragem</th>}
                    {/* Mostrar ações apenas para admin */}
                    {isAdmin && <th>Ações</th>}
                  </tr>
                </thead>
                <tbody>
                  {dadosFiltrados.map((item, index) => (
                    <tr key={item.id || index}>
                      <td>
                        <span className="numero-proposta">{item.numeroProposta}</span>
                      </td>
                      <td>
                        <span className="data">
                          {item.data ? new Date(item.data).toLocaleDateString('pt-BR') : '-'}
                        </span>
                      </td>
                      <td>
                        <strong>{item.nomeCliente}</strong>
                        <br />
                        <span className="telefone">{item.celular || item.telefone}</span>
                      </td>
                      <td>
                        <span className="numero-proposta">{item.numeroUC}</span>
                        <br />
                        <small>{item.apelido}</small>
                      </td>
                      <td>{item.consultor}</td>
                      <td>
                        <span className="valor">{(item.media || 0).toLocaleString()}</span>
                      </td>
                      <td>
                        {item.ug ? (
                          <span className="ug-badge">{item.ug}</span>
                        ) : (
                          <span className="sem-ug">Sem UG</span>
                        )}
                      </td>
                      {/* Mostrar calibragem apenas para admin */}
                      {isAdmin && (
                        <td>
                          <span className="valor">{(item.calibragem || 0).toLocaleString()}</span>
                        </td>
                      )}
                      {/* Mostrar ações apenas para admin */}
                      {isAdmin && (
                        <td>
                          <div className="table-actions">
                            <button
                              onClick={() => editarUG(index)}
                              className="btn-icon edit"
                              title="Definir UG"
                            >
                              🏭
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Modal de UG - apenas para admin */}
        {modalUG.show && isAdmin && (
          <ModalUG 
            item={modalUG.item}
            ugs={ugsDisponiveis}
            onSave={salvarUG}
            onClose={() => setModalUG({ show: false, item: null, index: -1 })}
          />
        )}
      </div>
    </div>
  );
};

// Componente Modal de UG
const ModalUG = ({ item, ugs, onSave, onClose }) => {
  const [ugSelecionada, setUgSelecionada] = useState(item.ug || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(ugSelecionada);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>🏭 Definir UG</h3>
          <button onClick={onClose} className="close-btn">❌</button>
        </div>
        
        <div className="modal-body">
          <div className="cliente-info">
            <h4>{item.nomeCliente}</h4>
            <p>Proposta: {item.numeroProposta}</p>
            <p>UC: {item.numeroUC} ({item.apelido})</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Selecionar UG</label>
              <select
                value={ugSelecionada}
                onChange={(e) => setUgSelecionada(e.target.value)}
              >
                <option value="">Selecione uma UG...</option>
                {ugs.map(ug => (
                  <option key={ug.id} value={ug.nomeUsina}>
                    {ug.nomeUsina} - {(ug.capacidade || 0).toFixed(2)} MWh
                  </option>
                ))}
                <option value="">--- Remover UG ---</option>
              </select>
            </div>

            <div className="modal-footer">
              <button type="button" onClick={onClose} className="btn btn-secondary">
                Cancelar
              </button>
              <button type="submit" className="btn btn-primary">
                Salvar UG
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ControlePage;