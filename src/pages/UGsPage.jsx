// src/pages/UGsPage.jsx - COMPLETO COM CALIBRAGEM CORRIGIDA SEM STATUS
import React, { useState, useEffect, useCallback } from 'react';
import Header from '../components/common/Header';
import Navigation from '../components/common/Navigation';
import { useNotification } from '../context/NotificationContext';
import storageService from '../services/storageService';

const UGsPage = () => {
  const [dados, setDados] = useState([]);
  const [dadosFiltrados, setDadosFiltrados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalNovaUG, setModalNovaUG] = useState({ show: false });
  const [modalEdicao, setModalEdicao] = useState({ show: false, item: null, index: -1 });
  
  const [filtros, setFiltros] = useState({
    nome: '',
    calibrada: ''
  });

  const [estatisticas, setEstatisticas] = useState({
    total: 0,
    calibradas: 0,
    naoCalibradas: 0,
    potenciaTotal: 0
  });

  const { showNotification } = useNotification();

  const carregarDados = useCallback(async () => {
    try {
      setLoading(true);
      
      console.log('📥 Carregando UGs do localStorage...');
      
      const dadosUGs = await storageService.getUGs();
      setDados(dadosUGs);
      setDadosFiltrados(dadosUGs);
      
      console.log(`✅ ${dadosUGs.length} UGs carregadas`);
      
      if (dadosUGs.length === 0) {
        showNotification('Nenhuma UG encontrada. Cadastre sua primeira Unidade Geradora!', 'info');
      } else {
        showNotification(`${dadosUGs.length} UGs carregadas com sucesso!`, 'success');
      }
      
    } catch (error) {
      console.error('❌ Erro ao carregar UGs:', error);
      showNotification('Erro ao carregar UGs: ' + error.message, 'error');
      setDados([]);
      setDadosFiltrados([]);
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  const filtrarDados = useCallback(() => {
    let dadosFiltrados = dados;

    if (filtros.nome) {
      const busca = filtros.nome.toLowerCase();
      dadosFiltrados = dadosFiltrados.filter(item =>
        item.nomeUsina?.toLowerCase().includes(busca)
      );
    }

    if (filtros.calibrada) {
      const isCalibrada = filtros.calibrada === 'true';
      dadosFiltrados = dadosFiltrados.filter(item => item.calibrado === isCalibrada);
    }

    setDadosFiltrados(dadosFiltrados);
  }, [dados, filtros]);

  const atualizarEstatisticas = useCallback(() => {
    const total = dadosFiltrados.length;
    const calibradas = dadosFiltrados.filter(item => item.calibrado).length;
    const naoCalibradas = total - calibradas;
    const potenciaTotal = dadosFiltrados.reduce((acc, item) => acc + (item.potenciaCA || 0), 0);

    setEstatisticas({
      total,
      calibradas,
      naoCalibradas,
      potenciaTotal
    });
  }, [dadosFiltrados]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  useEffect(() => {
    filtrarDados();
  }, [filtrarDados]);

  useEffect(() => {
    atualizarEstatisticas();
  }, [atualizarEstatisticas]);

  const limparFiltros = () => {
    setFiltros({
      nome: '',
      calibrada: ''
    });
  };

  const criarNovaUG = () => {
    setModalNovaUG({ show: true });
  };

  const salvarNovaUG = async (dadosUG) => {
    try {
      const jaExiste = dados.find(ug => 
        ug.nomeUsina.toLowerCase() === dadosUG.nomeUsina.toLowerCase()
      );
      
      if (jaExiste) {
        showNotification('Já existe uma UG com este nome!', 'error');
        return;
      }

      const capacidade = 720 * dadosUG.potenciaCC * (dadosUG.fatorCapacidade / 100);
      
      const novaUG = {
        ...dadosUG,
        capacidade,
        media: 0,
        calibrado: false,
        dataCadastro: new Date().toISOString(),
        id: Date.now().toString()
      };

      await storageService.adicionarUG(novaUG);
      await carregarDados();
      
      setModalNovaUG({ show: false });
      showNotification(`UG "${dadosUG.nomeUsina}" criada com sucesso!`, 'success');
      
    } catch (error) {
      console.error('❌ Erro ao criar UG:', error);
      showNotification('Erro ao criar UG: ' + error.message, 'error');
    }
  };

  const editarUG = (index) => {
    const item = dadosFiltrados[index];
    if (!item) return;
    setModalEdicao({ show: true, item, index });
  };

  const salvarEdicaoUG = async (dadosAtualizados) => {
    try {
      const { item } = modalEdicao;
      
      const indexReal = dados.findIndex(ug => ug.id === item.id);
      
      if (indexReal === -1) {
        showNotification('UG não encontrada para edição', 'error');
        return;
      }

      if (dadosAtualizados.potenciaCC || dadosAtualizados.fatorCapacidade) {
        const potenciaCC = dadosAtualizados.potenciaCC || item.potenciaCC;
        const fatorCapacidade = dadosAtualizados.fatorCapacidade || item.fatorCapacidade;
        dadosAtualizados.capacidade = 720 * potenciaCC * (fatorCapacidade / 100);
      }

      await storageService.atualizarUG(indexReal, dadosAtualizados);
      await carregarDados();
      
      setModalEdicao({ show: false, item: null, index: -1 });
      showNotification('UG atualizada com sucesso!', 'success');
      
    } catch (error) {
      console.error('❌ Erro ao salvar edição:', error);
      showNotification('Erro ao salvar: ' + error.message, 'error');
    }
  };

  const removerUG = async (index) => {
    const item = dadosFiltrados[index];
    
    if (!window.confirm(`Tem certeza que deseja remover a UG "${item.nomeUsina}"?`)) {
      return;
    }

    try {
      const indexReal = dados.findIndex(ug => ug.id === item.id);
      
      if (indexReal === -1) {
        showNotification('UG não encontrada para remoção', 'error');
        return;
      }

      await storageService.removerUG(indexReal);
      await carregarDados();
      
      showNotification(`UG "${item.nomeUsina}" removida com sucesso!`, 'success');
      
    } catch (error) {
      console.error('❌ Erro ao remover:', error);
      showNotification('Erro ao remover: ' + error.message, 'error');
    }
  };

  const calibrarUG = async (index, novaMedia) => {
    try {
      const item = dadosFiltrados[index];
      const indexReal = dados.findIndex(ug => ug.id === item.id);
      
      if (indexReal === -1) {
        showNotification('UG não encontrada', 'error');
        return;
      }

      await storageService.atualizarUG(indexReal, { 
        media: novaMedia, 
        calibrado: true 
      });
      
      await carregarDados();
      showNotification(`UG "${item.nomeUsina}" calibrada com sucesso!`, 'success');
      
    } catch (error) {
      console.error('❌ Erro ao calibrar:', error);
      showNotification('Erro ao calibrar: ' + error.message, 'error');
    }
  };

  const exportarDados = async () => {
    try {
      await storageService.exportarParaCSV('ugs');
      showNotification('UGs exportadas com sucesso!', 'success');
    } catch (error) {
      console.error('❌ Erro ao exportar:', error);
      showNotification('Erro ao exportar: ' + error.message, 'error');
    }
  };

  return (
    <div className="page-container">
      <div className="container">
        <Header 
          title="UNIDADES GERADORAS" 
          subtitle="Gerenciamento de UGs" 
          icon="🏭" 
        />
        
        <Navigation />

        {/* Estatísticas */}
        <section className="quick-stats">
          <div className="stat-card">
            <span className="stat-label">Total de UGs</span>
            <span className="stat-value">{estatisticas.total}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Calibradas</span>
            <span className="stat-value">{estatisticas.calibradas}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Não Calibradas</span>
            <span className="stat-value">{estatisticas.naoCalibradas}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Potência Total</span>
            <span className="stat-value">{estatisticas.potenciaTotal.toLocaleString()} kW</span>
          </div>
        </section>

        {/* Filtros */}
        <section className="filters-section">
          <div className="filters-container">
            <div className="filters-grid">
              <div className="filter-group">
                <input
                  type="text"
                  placeholder="🔍 Buscar por nome da usina..."
                  value={filtros.nome}
                  onChange={(e) => setFiltros({...filtros, nome: e.target.value})}
                />
              </div>
              
              <div className="filter-group">
                <select
                  value={filtros.calibrada}
                  onChange={(e) => setFiltros({...filtros, calibrada: e.target.value})}
                >
                  <option value="">Todas as UGs</option>
                  <option value="true">Apenas Calibradas</option>
                  <option value="false">Apenas Não Calibradas</option>
                </select>
              </div>
              
              <div className="filter-group">
                <button onClick={limparFiltros} className="btn-secondary">
                  🗑️ Limpar
                </button>
              </div>
            </div>
          </div>

          {/* Ações */}
          <div className="actions-container">
            <button onClick={criarNovaUG} className="btn-primary">
              ➕ Nova UG
            </button>
            <button onClick={exportarDados} className="btn-secondary">
              📊 Exportar CSV
            </button>
            <button onClick={carregarDados} className="btn-secondary">
              🔄 Atualizar
            </button>
          </div>
        </section>

        {/* Tabela de dados - SEM STATUS + CALIBRAGEM CORRIGIDA */}
        <section className="table-section">
          <div className="table-header">
            <h2>🏭 Lista de Unidades Geradoras</h2>
            <span className="table-count">{dadosFiltrados.length} UGs</span>
          </div>
          
          {loading ? (
            <div className="loading">Carregando UGs...</div>
          ) : dadosFiltrados.length === 0 ? (
            <div className="no-data">
              <p>📭 Nenhuma UG encontrada</p>
              <p>Cadastre sua primeira Unidade Geradora clicando em "Nova UG"</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Nome da Usina</th>
                    <th>Potência CA</th>
                    <th>Potência CC</th>
                    <th>Fator Cap.</th>
                    <th>Capacidade</th>
                    <th>Calibragem</th>
                    <th>Data Cadastro</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {dadosFiltrados.map((item, index) => (
                    <tr key={item.id || index}>
                      <td>
                        <strong>{item.nomeUsina}</strong>
                      </td>
                      <td>{item.potenciaCA} kW</td>
                      <td>{item.potenciaCC} kW</td>
                      <td>{item.fatorCapacidade}%</td>
                      <td>{item.capacidade?.toLocaleString()} kWh/mês</td>
                      <td>
                        {item.calibrado ? (
                          <span className="calibragem-definida">
                            {item.media?.toLocaleString()} kWh
                          </span>
                        ) : (
                          <CalibragemInput 
                            onCalibrar={(media) => calibrarUG(index, media)}
                          />
                        )}
                      </td>
                      <td>
                        {new Date(item.dataCadastro).toLocaleDateString('pt-BR')}
                      </td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            onClick={() => editarUG(index)}
                            className="btn-icon edit"
                            title="Editar"
                          >
                            ✏️
                          </button>
                          <button 
                            onClick={() => removerUG(index)}
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

        {/* Modal de Nova UG */}
        {modalNovaUG.show && (
          <ModalNovaUG 
            onSave={salvarNovaUG}
            onClose={() => setModalNovaUG({ show: false })}
          />
        )}

        {/* Modal de Edição */}
        {modalEdicao.show && (
          <ModalEdicaoUG 
            item={modalEdicao.item}
            onSave={salvarEdicaoUG}
            onClose={() => setModalEdicao({ show: false, item: null, index: -1 })}
          />
        )}
      </div>
    </div>
  );
};

// Componente de Input para Calibragem
const CalibragemInput = ({ onCalibrar }) => {
  const [media, setMedia] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const mediaNum = parseInt(media);
    
    if (!mediaNum || mediaNum <= 0) {
      alert('Digite um valor válido para a média');
      return;
    }

    onCalibrar(mediaNum);
    setMedia('');
  };

  return (
    <form onSubmit={handleSubmit} className="calibragem-form">
      <input
        type="number"
        placeholder="Valor calibragem"
        value={media}
        onChange={(e) => setMedia(e.target.value)}
        className="calibragem-input"
        required
      />
      <button type="submit" className="calibragem-btn" title="Calibrar">
        🎯
      </button>
    </form>
  );
};

// Componente Modal de Nova UG
const ModalNovaUG = ({ onSave, onClose }) => {
  const [dados, setDados] = useState({
    nomeUsina: '',
    potenciaCA: 0,
    potenciaCC: 0,
    fatorCapacidade: 85
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!dados.nomeUsina || !dados.potenciaCA || !dados.potenciaCC) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }

    onSave(dados);
  };

  const capacidadeCalculada = 720 * dados.potenciaCC * (dados.fatorCapacidade / 100);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>➕ Nova Unidade Geradora</h3>
          <button onClick={onClose} className="close-btn">❌</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label>Nome da Usina *</label>
            <input
              type="text"
              value={dados.nomeUsina}
              onChange={(e) => setDados({...dados, nomeUsina: e.target.value})}
              required
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Potência CA (kW) *</label>
              <input
                type="number"
                step="0.01"
                value={dados.potenciaCA}
                onChange={(e) => setDados({...dados, potenciaCA: parseFloat(e.target.value) || 0})}
                required
              />
            </div>
            <div className="form-group">
              <label>Potência CC (kW) *</label>
              <input
                type="number"
                step="0.01"
                value={dados.potenciaCC}
                onChange={(e) => setDados({...dados, potenciaCC: parseFloat(e.target.value) || 0})}
                required
              />
            </div>
          </div>
          
          <div className="form-group">
            <label>Fator de Capacidade (%)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={dados.fatorCapacidade}
              onChange={(e) => setDados({...dados, fatorCapacidade: parseFloat(e.target.value) || 0})}
            />
          </div>
          
          <div className="capacidade-preview">
            <strong>Capacidade Calculada: {capacidadeCalculada.toLocaleString()} kWh/mês</strong>
          </div>
          
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn-primary">
              Salvar UG
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Componente Modal de Edição
const ModalEdicaoUG = ({ item, onSave, onClose }) => {
  const [dados, setDados] = useState({ ...item });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(dados);
  };

  const capacidadeCalculada = 720 * dados.potenciaCC * (dados.fatorCapacidade / 100);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>✏️ Editar Unidade Geradora</h3>
          <button onClick={onClose} className="close-btn">❌</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label>Nome da Usina</label>
            <input
              type="text"
              value={dados.nomeUsina || ''}
              onChange={(e) => setDados({...dados, nomeUsina: e.target.value})}
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Potência CA (kW)</label>
              <input
                type="number"
                step="0.01"
                value={dados.potenciaCA || 0}
                onChange={(e) => setDados({...dados, potenciaCA: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div className="form-group">
              <label>Potência CC (kW)</label>
              <input
                type="number"
                step="0.01"
                value={dados.potenciaCC || 0}
                onChange={(e) => setDados({...dados, potenciaCC: parseFloat(e.target.value) || 0})}
              />
            </div>
          </div>
          
          <div className="form-group">
            <label>Fator de Capacidade (%)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={dados.fatorCapacidade || 0}
              onChange={(e) => setDados({...dados, fatorCapacidade: parseFloat(e.target.value) || 0})}
            />
          </div>
          
          <div className="form-group">
            <label>Média Atual (kWh)</label>
            <input
              type="number"
              value={dados.media || 0}
              onChange={(e) => setDados({...dados, media: parseInt(e.target.value) || 0})}
            />
          </div>
          
          <div className="capacidade-preview">
            <strong>Capacidade Calculada: {capacidadeCalculada.toLocaleString()} kWh/mês</strong>
          </div>
          
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn-secondary">
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

export default UGsPage;