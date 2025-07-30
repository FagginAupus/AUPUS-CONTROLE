// src/pages/ProspecPage.jsx - USANDO SUA PÁGINA NOVA PROPOSTA ORIGINAL
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/common/Header';
import Navigation from '../components/common/Navigation';
import { useNotification } from '../context/NotificationContext';
import storageService from '../services/storageService';

const ProspecPage = () => {
  const navigate = useNavigate();
  const [dados, setDados] = useState([]);
  const [dadosFiltrados, setDadosFiltrados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalEdicao, setModalEdicao] = useState({ show: false, item: null, index: -1 });
  
  const [filtros, setFiltros] = useState({
    consultor: '',
    status: '',
    busca: ''
  });

  const { showNotification } = useNotification();

  const carregarDados = useCallback(async () => {
    try {
      setLoading(true);
      
      console.log('📥 Carregando dados do localStorage...');
      
      // Carregar dados reais do localStorage
      const dadosProspec = await storageService.getProspec();
      
      // Garantir IDs únicos para cada item
      const dadosComIds = dadosProspec.map((item, index) => ({
        ...item,
        id: item.id || `${item.numeroProposta}-${item.numeroUC}-${index}-${Date.now()}`
      }));
      
      setDados(dadosComIds);
      setDadosFiltrados(dadosComIds);
      
      if (dadosComIds.length === 0) {
        showNotification('Nenhuma proposta encontrada. Crie sua primeira proposta!', 'info');
      } else {
        showNotification(`${dadosComIds.length} propostas carregadas com sucesso!`, 'success');
      }
      
      console.log(`✅ ${dadosComIds.length} propostas carregadas`);
      
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
      showNotification('Erro ao carregar dados: ' + error.message, 'error');
      setDados([]);
      setDadosFiltrados([]);
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  const filtrarDados = useCallback(() => {
    let dadosFiltrados = dados;

    if (filtros.consultor) {
      dadosFiltrados = dadosFiltrados.filter(item =>
        item.consultor === filtros.consultor
      );
    }

    if (filtros.status) {
      dadosFiltrados = dadosFiltrados.filter(item =>
        item.status === filtros.status
      );
    }

    if (filtros.busca) {
      const busca = filtros.busca.toLowerCase();
      dadosFiltrados = dadosFiltrados.filter(item =>
        item.nomeCliente?.toLowerCase().includes(busca) ||
        item.numeroProposta?.toLowerCase().includes(busca) ||
        item.numeroUC?.toLowerCase().includes(busca) ||
        item.apelido?.toLowerCase().includes(busca)
      );
    }

    setDadosFiltrados(dadosFiltrados);
  }, [dados, filtros]);

  // Carregamento inicial
  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // Aplicar filtros
  useEffect(() => {
    filtrarDados();
  }, [filtrarDados]);

  const limparFiltros = () => {
    setFiltros({
      consultor: '',
      status: '',
      busca: ''
    });
  };

  // FUNÇÃO PARA EDITAR ITEM
  const editarItem = (index) => {
    const item = dadosFiltrados[index];
    if (!item) return;

    setModalEdicao({ show: true, item, index });
  };

  // FUNÇÃO PARA SALVAR EDIÇÃO
  const salvarEdicao = async (dadosAtualizados) => {
    try {
      const { item } = modalEdicao;
      
      // Encontrar o índice real no array principal
      const indexReal = dados.findIndex(p => p.id === item.id);
      
      if (indexReal === -1) {
        showNotification('Item não encontrado para edição', 'error');
        return;
      }

      // Atualizar no storage
      await storageService.atualizarProspec(indexReal, dadosAtualizados);
      
      // Recarregar dados
      await carregarDados();
      
      // Fechar modal
      setModalEdicao({ show: false, item: null, index: -1 });
      
      showNotification('Proposta atualizada com sucesso!', 'success');
      
    } catch (error) {
      console.error('❌ Erro ao salvar edição:', error);
      showNotification('Erro ao salvar: ' + error.message, 'error');
    }
  };

  // FUNÇÃO PARA REMOVER ITEM
  const removerItem = async (index) => {
    if (!window.confirm('Tem certeza que deseja remover esta proposta?')) {
      return;
    }

    try {
      const item = dadosFiltrados[index];
      const indexReal = dados.findIndex(p => p.id === item.id);
      
      if (indexReal === -1) {
        showNotification('Item não encontrado para remoção', 'error');
        return;
      }

      await storageService.removerProspec(indexReal);
      await carregarDados();
      
      showNotification('Proposta removida com sucesso!', 'success');
      
    } catch (error) {
      console.error('❌ Erro ao remover:', error);
      showNotification('Erro ao remover: ' + error.message, 'error');
    }
  };

  // NAVEGAR PARA SUA PÁGINA ORIGINAL DE NOVA PROPOSTA
  const criarNovaProposta = () => {
    navigate('/nova-proposta');
  };

  // FUNÇÃO PARA EXPORTAR DADOS
  const exportarDados = async () => {
    try {
      await storageService.exportarParaCSV('prospec');
      showNotification('Dados exportados com sucesso!', 'success');
    } catch (error) {
      console.error('❌ Erro ao exportar:', error);
      showNotification('Erro ao exportar: ' + error.message, 'error');
    }
  };

  // Obter lista única de consultores para filtro
  const consultoresUnicos = [...new Set(dados.map(item => item.consultor).filter(Boolean))];

  return (
    <div className="page-container">
      <div className="container">
        <Header 
          title="PROSPECÇÃO" 
          subtitle="Gerenciamento de Propostas" 
          icon="📋" 
        />
        
        <Navigation />

        {/* Estatísticas Rápidas */}
        <section className="quick-stats">
          <div className="stat-card">
            <span className="stat-label">Total</span>
            <span className="stat-value">{dadosFiltrados.length}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Aguardando</span>
            <span className="stat-value">{dadosFiltrados.filter(p => p.status === 'Aguardando').length}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Fechadas</span>
            <span className="stat-value">{dadosFiltrados.filter(p => p.status === 'Fechado').length}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Consultores</span>
            <span className="stat-value">{consultoresUnicos.length}</span>
          </div>
        </section>

        {/* Filtros */}
        <section className="filters-section">
          <div className="filters-container">
            <div className="filters-grid">
              <div className="filter-group">
                <input
                  type="text"
                  placeholder="🔍 Buscar por nome, proposta, UC..."
                  value={filtros.busca}
                  onChange={(e) => setFiltros({...filtros, busca: e.target.value})}
                />
              </div>
              
              <div className="filter-group">
                <select
                  value={filtros.consultor}
                  onChange={(e) => setFiltros({...filtros, consultor: e.target.value})}
                >
                  <option value="">Todos os Consultores</option>
                  {consultoresUnicos.map(consultor => (
                    <option key={consultor} value={consultor}>{consultor}</option>
                  ))}
                </select>
              </div>
              
              <div className="filter-group">
                <select
                  value={filtros.status}
                  onChange={(e) => setFiltros({...filtros, status: e.target.value})}
                >
                  <option value="">Todos os Status</option>
                  <option value="Aguardando">Aguardando</option>
                  <option value="Fechado">Fechado</option>
                </select>
              </div>
              
              <div className="filter-group">
                <button onClick={limparFiltros} className="btn-secondary">
                  🗑️ Limpar Filtros
                </button>
              </div>
            </div>
          </div>
          
          {/* Ações */}
          <div className="actions-container">
            <button onClick={criarNovaProposta} className="btn-primary">
              ➕ Nova Proposta
            </button>
            <button onClick={exportarDados} className="btn-secondary">
              📊 Exportar CSV
            </button>
            <button onClick={carregarDados} className="btn-secondary">
              🔄 Atualizar
            </button>
          </div>
        </section>

        {/* Tabela de dados */}
        <section className="table-section">
          <div className="table-header">
            <h2>📋 Lista de Propostas</h2>
            <span className="table-count">{dadosFiltrados.length} propostas</span>
          </div>
          
          {loading ? (
            <div className="loading">Carregando propostas...</div>
          ) : dadosFiltrados.length === 0 ? (
            <div className="no-data">
              <p>📭 Nenhuma proposta encontrada</p>
              <p>Crie sua primeira proposta clicando em "Nova Proposta"</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Proposta</th>
                    <th>UC</th>
                    <th>Consultor</th>
                    <th>Status</th>
                    <th>Média (kWh)</th>
                    <th>Data</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {dadosFiltrados.map((item, index) => (
                    <tr key={item.id || index}>
                      <td>
                        <strong>{item.nomeCliente}</strong>
                        <br />
                        <small>{item.apelido}</small>
                      </td>
                      <td>{item.numeroProposta}</td>
                      <td>{item.numeroUC}</td>
                      <td>{item.consultor}</td>
                      <td>
                        <span className={`status ${item.status?.toLowerCase()}`}>
                          {item.status}
                        </span>
                      </td>
                      <td>{item.media?.toLocaleString()} kWh</td>
                      <td>{new Date(item.data).toLocaleDateString('pt-BR')}</td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            onClick={() => editarItem(index)}
                            className="btn-icon edit"
                            title="Editar"
                          >
                            ✏️
                          </button>
                          <button 
                            onClick={() => removerItem(index)}
                            className="btn-icon delete"
                            title="Remover"
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

        {/* Modal de Edição */}
        {modalEdicao.show && (
          <ModalEdicao 
            item={modalEdicao.item}
            onSave={salvarEdicao}
            onClose={() => setModalEdicao({ show: false, item: null, index: -1 })}
          />
        )}
      </div>
    </div>
  );
};

// Componente Modal de Edição
const ModalEdicao = ({ item, onSave, onClose }) => {
  const [dados, setDados] = useState({ ...item });

  const handleSubmit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onSave(dados);
  };

  const handleClose = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>✏️ Editar Proposta</h3>
          <button onClick={handleClose} className="close-btn">❌</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-row">
            <div className="form-group">
              <label>Nome do Cliente</label>
              <input
                type="text"
                value={dados.nomeCliente || ''}
                onChange={(e) => setDados({...dados, nomeCliente: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select
                value={dados.status || 'Aguardando'}
                onChange={(e) => setDados({...dados, status: e.target.value})}
              >
                <option value="Aguardando">Aguardando</option>
                <option value="Fechado">Fechado</option>
              </select>
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Consultor</label>
              <input
                type="text"
                value={dados.consultor || ''}
                onChange={(e) => setDados({...dados, consultor: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>Média (kWh)</label>
              <input
                type="number"
                value={dados.media || 0}
                onChange={(e) => setDados({...dados, media: parseInt(e.target.value) || 0})}
              />
            </div>
          </div>
          
          <div className="modal-footer">
            <button type="button" onClick={handleClose} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProspecPage;