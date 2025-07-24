// src/pages/UGsPage.jsx
import React, { useState, useEffect } from 'react';
import Header from '../components/common/Header';
import Navigation from '../components/common/Navigation';
import { useNotification } from '../context/NotificationContext';
import './UGsPage.css';

const UGsPage = () => {
  const [ugs, setUGs] = useState([]);
  const [ugsFiltradas, setUGsFiltradas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [ugEditando, setUGEditando] = useState(null);
  const [filtros, setFiltros] = useState({
    nome: '',
    status: '',
    capacidadeMin: '',
    capacidadeMax: ''
  });
  const [formData, setFormData] = useState({
    nomeUsina: '',
    capacidade: '',
    localizacao: '',
    status: 'Ativa',
    dataInicio: '',
    observacoes: ''
  });

  const { showNotification } = useNotification();

  useEffect(() => {
    carregarUGs();
  }, []);

  useEffect(() => {
    aplicarFiltros();
  }, [ugs, filtros]);

  const carregarUGs = async () => {
    try {
      setLoading(true);
      
      // Simular carregamento
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Dados mock de UGs
      const ugsMock = [
        {
          id: 1,
          nomeUsina: 'Usina Solar Goiânia I',
          capacidade: 1200.50,
          localizacao: 'Goiânia, GO',
          status: 'Ativa',
          dataInicio: '2024-01-15',
          clientesVinculados: 25,
          observacoes: 'Usina principal da região metropolitana'
        },
        {
          id: 2,
          nomeUsina: 'Usina Solar Brasília II',
          capacidade: 980.75,
          localizacao: 'Brasília, DF',
          status: 'Ativa',
          dataInicio: '2024-03-20',
          clientesVinculados: 18,
          observacoes: 'Atende região do Plano Piloto'
        },
        {
          id: 3,
          nomeUsina: 'Usina Solar Anápolis III',
          capacidade: 1450.25,
          localizacao: 'Anápolis, GO',
          status: 'Em Construção',
          dataInicio: '2025-02-01',
          clientesVinculados: 0,
          observacoes: 'Previsão de conclusão em junho/2025'
        }
      ];

      setUGs(ugsMock);
      showNotification(`${ugsMock.length} UGs carregadas com sucesso!`, 'success');
    } catch (error) {
      console.error('Erro ao carregar UGs:', error);
      showNotification('Erro ao carregar UGs', 'error');
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltros = () => {
    let resultado = [...ugs];

    if (filtros.nome) {
      resultado = resultado.filter(ug => 
        ug.nomeUsina.toLowerCase().includes(filtros.nome.toLowerCase())
      );
    }

    if (filtros.status) {
      resultado = resultado.filter(ug => ug.status === filtros.status);
    }

    if (filtros.capacidadeMin) {
      resultado = resultado.filter(ug => ug.capacidade >= parseFloat(filtros.capacidadeMin));
    }

    if (filtros.capacidadeMax) {
      resultado = resultado.filter(ug => ug.capacidade <= parseFloat(filtros.capacidadeMax));
    }

    setUGsFiltradas(resultado);
  };

  const handleFiltroChange = (campo, valor) => {
    setFiltros(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  const limparFiltros = () => {
    setFiltros({
      nome: '',
      status: '',
      capacidadeMin: '',
      capacidadeMax: ''
    });
  };

  const abrirModal = (ug = null) => {
    if (ug) {
      setUGEditando(ug);
      setFormData({
        nomeUsina: ug.nomeUsina,
        capacidade: ug.capacidade.toString(),
        localizacao: ug.localizacao,
        status: ug.status,
        dataInicio: ug.dataInicio,
        observacoes: ug.observacoes
      });
    } else {
      setUGEditando(null);
      setFormData({
        nomeUsina: '',
        capacidade: '',
        localizacao: '',
        status: 'Ativa',
        dataInicio: '',
        observacoes: ''
      });
    }
    setShowModal(true);
  };

  const fecharModal = () => {
    setShowModal(false);
    setUGEditando(null);
  };

  const handleFormChange = (campo, valor) => {
    setFormData(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  const salvarUG = async () => {
    try {
      if (!formData.nomeUsina || !formData.capacidade || !formData.localizacao) {
        showNotification('Preencha todos os campos obrigatórios!', 'error');
        return;
      }

      const capacidade = parseFloat(formData.capacidade);
      if (isNaN(capacidade) || capacidade <= 0) {
        showNotification('Capacidade deve ser um número válido!', 'error');
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      if (ugEditando) {
        const novasUGs = ugs.map(ug => 
          ug.id === ugEditando.id 
            ? { ...ug, ...formData, capacidade: capacidade }
            : ug
        );
        setUGs(novasUGs);
        showNotification('UG atualizada com sucesso!', 'success');
      } else {
        const novaUG = {
          id: Date.now(),
          ...formData,
          capacidade: capacidade,
          clientesVinculados: 0
        };
        setUGs(prev => [...prev, novaUG]);
        showNotification('UG criada com sucesso!', 'success');
      }

      fecharModal();
    } catch (error) {
      console.error('Erro ao salvar UG:', error);
      showNotification('Erro ao salvar UG', 'error');
    }
  };

  const excluirUG = async (ug) => {
    if (!window.confirm(`Tem certeza que deseja excluir a UG "${ug.nomeUsina}"?`)) {
      return;
    }

    try {
      if (ug.clientesVinculados > 0) {
        showNotification(
          `Não é possível excluir. Esta UG possui ${ug.clientesVinculados} clientes vinculados.`, 
          'error'
        );
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      const novasUGs = ugs.filter(u => u.id !== ug.id);
      setUGs(novasUGs);
      showNotification('UG excluída com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao excluir UG:', error);
      showNotification('Erro ao excluir UG', 'error');
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Ativa': return 'status-ativa';
      case 'Em Construção': return 'status-construcao';
      case 'Planejada': return 'status-planejada';
      case 'Inativa': return 'status-inativa';
      default: return 'status-default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Ativa': return '🟢';
      case 'Em Construção': return '🟡';
      case 'Planejada': return '🔵';
      case 'Inativa': return '🔴';
      default: return '⚪';
    }
  };

  const calcularEstatisticas = () => {
    const total = ugs.length;
    const ativas = ugs.filter(ug => ug.status === 'Ativa').length;
    const capacidadeTotal = ugs.reduce((acc, ug) => acc + ug.capacidade, 0);
    const clientesTotal = ugs.reduce((acc, ug) => acc + ug.clientesVinculados, 0);
    
    return { total, ativas, capacidadeTotal, clientesTotal };
  };

  const stats = calcularEstatisticas();

  return (
    <div className="page-container">
      <div className="container">
        <Header 
          title="UNIDADES GERADORAS" 
          subtitle="Gestão de Usinas Solares" 
          icon="🏢" 
        />
        
        <Navigation />

        {/* Estatísticas Rápidas */}
        <section className="quick-stats">
          <div className="stat-card">
            <div className="stat-icon">🏢</div>
            <div className="stat-info">
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">Total de UGs</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🟢</div>
            <div className="stat-info">
              <div className="stat-value">{stats.ativas}</div>
              <div className="stat-label">UGs Ativas</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⚡</div>
            <div className="stat-info">
              <div className="stat-value">{stats.capacidadeTotal.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</div>
              <div className="stat-label">MWh Total</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-info">
              <div className="stat-value">{stats.clientesTotal}</div>
              <div className="stat-label">Clientes Ativos</div>
            </div>
          </div>
        </section>

        {/* Filtros */}
        <section className="filters-section">
          <div className="section-header">
            <h2>🔍 Filtros</h2>
            <div className="section-actions">
              <button className="btn btn-secondary" onClick={limparFiltros}>
                🧹 Limpar
              </button>
              <button className="btn btn-primary" onClick={() => abrirModal()}>
                ➕ Nova UG
              </button>
            </div>
          </div>
          
          <div className="filters-grid">
            <div className="filter-group">
              <label>Nome da Usina:</label>
              <input
                type="text"
                value={filtros.nome}
                onChange={(e) => handleFiltroChange('nome', e.target.value)}
                placeholder="Digite o nome..."
              />
            </div>
            
            <div className="filter-group">
              <label>Status:</label>
              <select
                value={filtros.status}
                onChange={(e) => handleFiltroChange('status', e.target.value)}
              >
                <option value="">Todos</option>
                <option value="Ativa">Ativa</option>
                <option value="Em Construção">Em Construção</option>
                <option value="Planejada">Planejada</option>
                <option value="Inativa">Inativa</option>
              </select>
            </div>
            
            <div className="filter-group">
              <label>Capacidade Mín (MWh):</label>
              <input
                type="number"
                value={filtros.capacidadeMin}
                onChange={(e) => handleFiltroChange('capacidadeMin', e.target.value)}
                placeholder="0"
                min="0"
                step="0.1"
              />
            </div>
            
            <div className="filter-group">
              <label>Capacidade Máx (MWh):</label>
              <input
                type="number"
                value={filtros.capacidadeMax}
                onChange={(e) => handleFiltroChange('capacidadeMax', e.target.value)}
                placeholder="9999"
                min="0"
                step="0.1"
              />
            </div>
          </div>
        </section>

        {/* Tabela de UGs */}
        <section className="data-section">
          <div className="table-header">
            <h2>📋 Lista de UGs ({ugsFiltradas.length})</h2>
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Carregando UGs...</p>
            </div>
          ) : ugsFiltradas.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🏢</div>
              <h3>Nenhuma UG encontrada</h3>
              <p>Não há UGs cadastradas ou que atendam aos filtros aplicados.</p>
              <button className="btn btn-primary" onClick={() => abrirModal()}>
                ➕ Cadastrar primeira UG
              </button>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Nome da Usina</th>
                    <th>Capacidade (MWh)</th>
                    <th>Localização</th>
                    <th>Data Início</th>
                    <th>Clientes</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {ugsFiltradas.map(ug => (
                    <tr key={ug.id}>
                      <td>
                        <span className={`status-badge ${getStatusClass(ug.status)}`}>
                          {getStatusIcon(ug.status)} {ug.status}
                        </span>
                      </td>
                      <td>
                        <div className="ug-name">
                          <strong>{ug.nomeUsina}</strong>
                          {ug.observacoes && (
                            <small title={ug.observacoes}>💬</small>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="capacity-value">
                          {ug.capacidade.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td>{ug.localizacao}</td>
                      <td>{new Date(ug.dataInicio).toLocaleDateString('pt-BR')}</td>
                      <td>
                        <span className={`clients-count ${ug.clientesVinculados > 0 ? 'has-clients' : 'no-clients'}`}>
                          {ug.clientesVinculados}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions">
                          <button 
                            className="action-btn edit" 
                            onClick={() => abrirModal(ug)}
                            title="Editar UG"
                          >
                            ✏️
                          </button>
                          <button 
                            className="action-btn delete" 
                            onClick={() => excluirUG(ug)}
                            title="Excluir UG"
                            disabled={ug.clientesVinculados > 0}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Modal de UG */}
      {showModal && (
        <div className="modal-overlay" onClick={fecharModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{ugEditando ? '✏️ Editar UG' : '➕ Nova UG'}</h3>
              <button className="modal-close" onClick={fecharModal}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Nome da Usina *</label>
                  <input
                    type="text"
                    value={formData.nomeUsina}
                    onChange={(e) => handleFormChange('nomeUsina', e.target.value)}
                    placeholder="Ex: Usina Solar Goiânia I"
                  />
                </div>
                
                <div className="form-group">
                  <label>Capacidade (MWh) *</label>
                  <input
                    type="number"
                    value={formData.capacidade}
                    onChange={(e) => handleFormChange('capacidade', e.target.value)}
                    placeholder="1200.50"
                    min="0"
                    step="0.01"
                  />
                </div>
                
                <div className="form-group">
                  <label>Localização *</label>
                  <input
                    type="text"
                    value={formData.localizacao}
                    onChange={(e) => handleFormChange('localizacao', e.target.value)}
                    placeholder="Ex: Goiânia, GO"
                  />
                </div>
                
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleFormChange('status', e.target.value)}
                  >
                    <option value="Ativa">Ativa</option>
                    <option value="Em Construção">Em Construção</option>
                    <option value="Planejada">Planejada</option>
                    <option value="Inativa">Inativa</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Data de Início</label>
                  <input
                    type="date"
                    value={formData.dataInicio}
                    onChange={(e) => handleFormChange('dataInicio', e.target.value)}
                  />
                </div>
                
                <div className="form-group full-width">
                  <label>Observações</label>
                  <textarea
                    value={formData.observacoes}
                    onChange={(e) => handleFormChange('observacoes', e.target.value)}
                    placeholder="Informações adicionais sobre a UG..."
                    rows="3"
                  />
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={fecharModal}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={salvarUG}>
                {ugEditando ? 'Atualizar' : 'Criar'} UG
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UGsPage;