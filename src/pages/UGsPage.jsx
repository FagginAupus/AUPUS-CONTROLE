// src/pages/UGsPage.jsx - SEM DADOS SIMULADOS
import React, { useState, useEffect } from 'react';
import Header from '../components/common/Header';
import Navigation from '../components/common/Navigation';
import { useNotification } from '../context/NotificationContext';
import storageService from '../services/storageService';
import './UGsPage.css';

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

  useEffect(() => {
    carregarDados();
  }, []);

  useEffect(() => {
    filtrarDados();
  }, [filtros, dados]);

  useEffect(() => {
    atualizarEstatisticas();
  }, [dadosFiltrados]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      
      console.log('📥 Carregando UGs do localStorage...');
      
      // Carregar dados reais do localStorage
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
  };

  const filtrarDados = () => {
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
  };

  const atualizarEstatisticas = () => {
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
  };

  const limparFiltros = () => {
    setFiltros({
      nome: '',
      calibrada: ''
    });
  };

  // FUNÇÃO PARA CRIAR NOVA UG
  const criarNovaUG = () => {
    setModalNovaUG({ show: true });
  };

  // FUNÇÃO PARA SALVAR NOVA UG
  const salvarNovaUG = async (dadosUG) => {
    try {
      // Verificar se já existe UG com mesmo nome
      const jaExiste = dados.find(ug => 
        ug.nomeUsina.toLowerCase() === dadosUG.nomeUsina.toLowerCase()
      );
      
      if (jaExiste) {
        showNotification('Já existe uma UG com este nome!', 'error');
        return;
      }

      // Calcular capacidade automaticamente
      const capacidade = 720 * dadosUG.potenciaCC * (dadosUG.fatorCapacidade / 100);
      
      const novaUG = {
        ...dadosUG,
        capacidade,
        media: 0, // Será calculada posteriormente
        calibrado: false, // Nova UG não está calibrada
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

  // FUNÇÃO PARA EDITAR UG
  const editarUG = (index) => {
    const item = dadosFiltrados[index];
    if (!item) return;

    setModalEdicao({ show: true, item, index });
  };

  // FUNÇÃO PARA SALVAR EDIÇÃO
  const salvarEdicaoUG = async (dadosAtualizados) => {
    try {
      const { item } = modalEdicao;
      
      // Encontrar o índice real no array principal
      const indexReal = dados.findIndex(ug => ug.id === item.id);
      
      if (indexReal === -1) {
        showNotification('UG não encontrada para edição', 'error');
        return;
      }

      // Recalcular capacidade se alterou potência ou fator
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

  // FUNÇÃO PARA REMOVER UG
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

  // FUNÇÃO PARA CALIBRAR UG
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

  // FUNÇÃO PARA EXPORTAR DADOS
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
    <div className="ugs-container">
      <div className="container">
        <Header 
          title="UNIDADES GERADORAS" 
          subtitle="Gerenciamento de UGs" 
          icon="🏭" 
        />
        
        <Navigation />

        {/* Estatísticas */}
        <section className="stats">
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Total de UGs</h3>
              <div className="stat-number">{estatisticas.total}</div>
            </div>
            <div className="stat-card">
              <h3>Calibradas</h3>
              <div className="stat-number">{estatisticas.calibradas}</div>
            </div>
            <div className="stat-card">
              <h3>Não Calibradas</h3>
              <div className="stat-number">{estatisticas.naoCalibradas}</div>
            </div>
            <div className="stat-card">
              <h3>Potência Total</h3>
              <div className="stat-number">{estatisticas.potenciaTotal.toLocaleString()} kW</div>
            </div>
          </div>
        </section>

        {/* Filtros */}
        <section className="filters">
          <div className="filters-row">
            <input
              type="text"
              placeholder="🔍 Buscar por nome da usina..."
              value={filtros.nome}
              onChange={(e) => setFiltros({...filtros, nome: e.target.value})}
              className="filter-input"
            />
            
            <select
              value={filtros.calibrada}
              onChange={(e) => setFiltros({...filtros, calibrada: e.target.value})}
              className="filter-select"
            >
              <option value="">Todas as UGs</option>
              <option value="true">Apenas Calibradas</option>
              <option value="false">Apenas Não Calibradas</option>
            </select>
            
            <button onClick={limparFiltros} className="clear-filters-btn">
              🗑️ Limpar
            </button>
          </div>
        </section>

        {/* Ações */}
        <section className="actions">
          <button onClick={criarNovaUG} className="btn primary">
            ➕ Nova UG
          </button>
          <button onClick={exportarDados} className="btn secondary">
            📊 Exportar CSV
          </button>
          <button onClick={carregarDados} className="btn tertiary">
            🔄 Atualizar
          </button>
        </section>

        {/* Tabela de dados */}
        <section className="data-table">
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
                    <th>Média Atual</th>
                    <th>Status</th>
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
                          <span className="media-calibrada">
                            {item.media?.toLocaleString()} kWh
                          </span>
                        ) : (
                          <CalibragemInput 
                            onCalibrar={(media) => calibrarUG(index, media)}
                          />
                        )}
                      </td>
                      <td>
                        <span className={`status ${item.calibrado ? 'calibrada' : 'pendente'}`}>
                          {item.calibrado ? '✅ Calibrada' : '⏳ Pendente'}
                        </span>
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
        placeholder="Média kWh"
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
    
    // Validações básicas
    if (!dados.nomeUsina || !dados.potenciaCA || !dados.potenciaCC) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }

    onSave(dados);
  };

  // Calcular capacidade em tempo real
  const capacidadeCalculada = 720 * dados.potenciaCC * (dados.fatorCapacidade / 100);

  return (
    <div className="modal-overlay">
      <div className="modal">
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
            <button type="button" onClick={onClose} className="btn secondary">
              Cancelar
            </button>
            <button type="submit" className="btn primary">
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

  // Calcular capacidade em tempo real
  const capacidadeCalculada = 720 * dados.potenciaCC * (dados.fatorCapacidade / 100);

  return (
    <div className="modal-overlay">
      <div className="modal">
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
          
          <div className="form-group">
            <label>
              <input
                type="checkbox"
                checked={dados.calibrado || false}
                onChange={(e) => setDados({...dados, calibrado: e.target.checked})}
              />
              UG Calibrada
            </label>
          </div>
          
          <div className="capacidade-preview">
            <strong>Capacidade Calculada: {capacidadeCalculada.toLocaleString()} kWh/mês</strong>
          </div>
          
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn secondary">
              Cancelar
            </button>
            <button type="submit" className="btn primary">
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UGsPage;