// src/pages/ControlePage.jsx - SEM DADOS SIMULADOS
import React, { useState, useEffect } from 'react';
import Header from '../components/common/Header';
import Navigation from '../components/common/Navigation';
import { useNotification } from '../context/NotificationContext';
import storageService from '../services/storageService';
import './ControlePage.css';

const ControlePage = () => {
  const [dados, setDados] = useState([]);
  const [dadosFiltrados, setDadosFiltrados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calibragemGlobal, setCalibragemGlobal] = useState(0);
  const [modalUG, setModalUG] = useState({ show: false, item: null, index: -1 });
  const [ugsDisponiveis, setUgsDisponiveis] = useState([]);
  
  const [filtros, setFiltros] = useState({
    nome: '',
    consultor: '',
    ug: ''
  });

  const [estatisticas, setEstatisticas] = useState({
    total: 0,
    ugsDefinidas: 0,
    ugsPendentes: 0
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
      
      console.log('📥 Carregando dados de controle do localStorage...');
      
      // Carregar dados reais do localStorage
      const dadosControle = await storageService.getControle();
      
      setDados(dadosControle);
      setDadosFiltrados(dadosControle);
      
      // Carregar UGs disponíveis
      await carregarUGsDisponiveis();
      
      console.log(`✅ ${dadosControle.length} propostas de controle carregadas`);
      
      if (dadosControle.length === 0) {
        showNotification('Nenhuma proposta fechada encontrada. Feche algumas propostas no PROSPEC!', 'info');
      } else {
        showNotification(`${dadosControle.length} propostas fechadas carregadas!`, 'success');
      }
      
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
      showNotification('Erro ao carregar dados: ' + error.message, 'error');
      setDados([]);
      setDadosFiltrados([]);
    } finally {
      setLoading(false);
    }
  };

  const carregarUGsDisponiveis = async () => {
    try {
      const ugs = await storageService.getUGs();
      setUgsDisponiveis(ugs);
      console.log(`✅ ${ugs.length} UGs disponíveis carregadas`);
    } catch (error) {
      console.error('❌ Erro ao carregar UGs:', error);
      setUgsDisponiveis([]);
    }
  };

  const filtrarDados = () => {
    let dadosFiltrados = dados;

    if (filtros.nome) {
      const busca = filtros.nome.toLowerCase();
      dadosFiltrados = dadosFiltrados.filter(item =>
        item.nomeCliente?.toLowerCase().includes(busca) ||
        item.numeroProposta?.toLowerCase().includes(busca) ||
        item.numeroUC?.toLowerCase().includes(busca)
      );
    }

    if (filtros.consultor) {
      dadosFiltrados = dadosFiltrados.filter(item =>
        item.consultor === filtros.consultor
      );
    }

    if (filtros.ug) {
      if (filtros.ug === 'sem-ug') {
        dadosFiltrados = dadosFiltrados.filter(item => !item.ug);
      } else {
        dadosFiltrados = dadosFiltrados.filter(item => item.ug === filtros.ug);
      }
    }

    setDadosFiltrados(dadosFiltrados);
  };

  const atualizarEstatisticas = () => {
    const total = dadosFiltrados.length;
    const ugsDefinidas = dadosFiltrados.filter(item => item.ug).length;
    const ugsPendentes = total - ugsDefinidas;

    setEstatisticas({
      total,
      ugsDefinidas,
      ugsPendentes
    });
  };

  const limparFiltros = () => {
    setFiltros({
      nome: '',
      consultor: '',
      ug: ''
    });
  };

  // FUNÇÃO PARA DEFINIR UG
  const definirUG = (index) => {
    const item = dadosFiltrados[index];
    if (!item) return;

    setModalUG({ show: true, item, index });
  };

  // FUNÇÃO PARA SALVAR UG
  const salvarUG = async (ugSelecionada) => {
    try {
      const { item } = modalUG;
      
      // Encontrar o índice real no array principal
      const indexReal = dados.findIndex(p => 
        p.numeroProposta === item.numeroProposta && p.numeroUC === item.numeroUC
      );
      
      if (indexReal === -1) {
        showNotification('Item não encontrado', 'error');
        return;
      }

      // Atualizar UG no storage
      await storageService.atualizarUGControle(indexReal, ugSelecionada);
      
      // Recarregar dados
      await carregarDados();
      
      // Fechar modal
      setModalUG({ show: false, item: null, index: -1 });
      
      showNotification(`UG "${ugSelecionada}" definida com sucesso!`, 'success');
      
    } catch (error) {
      console.error('❌ Erro ao salvar UG:', error);
      showNotification('Erro ao salvar UG: ' + error.message, 'error');
    }
  };

  // FUNÇÃO PARA APLICAR CALIBRAGEM GLOBAL
  const aplicarCalibragemGlobal = async () => {
    if (calibragemGlobal === 0) {
      showNotification('Digite um valor de calibragem diferente de zero', 'warning');
      return;
    }

    if (!window.confirm(`Aplicar calibragem de ${calibragemGlobal}% em todas as propostas filtradas?`)) {
      return;
    }

    try {
      let processadas = 0;
      
      for (const item of dadosFiltrados) {
        if (item.ug) {
          // Encontrar UG e aplicar calibragem
          const ugIndex = ugsDisponiveis.findIndex(ug => ug.nomeUsina === item.ug);
          if (ugIndex !== -1) {
            const ug = ugsDisponiveis[ugIndex];
            const novaMedia = ug.media * (1 + calibragemGlobal / 100);
            
            await storageService.atualizarUG(ugIndex, { 
              ...ug, 
              media: novaMedia,
              calibrado: true 
            });
            processadas++;
          }
        }
      }
      
      await carregarUGsDisponiveis(); // Recarregar UGs
      await carregarDados(); // Recarregar dados
      
      showNotification(`Calibragem aplicada em ${processadas} UGs!`, 'success');
      setCalibragemGlobal(0);
      
    } catch (error) {
      console.error('❌ Erro na calibragem global:', error);
      showNotification('Erro na calibragem: ' + error.message, 'error');
    }
  };

  // FUNÇÃO PARA EXPORTAR DADOS
  const exportarDados = async () => {
    try {
      await storageService.exportarParaCSV('controle');
      showNotification('Dados de controle exportados com sucesso!', 'success');
    } catch (error) {
      console.error('❌ Erro ao exportar:', error);
      showNotification('Erro ao exportar: ' + error.message, 'error');
    }
  };

  // Obter lista única de consultores para filtro
  const consultoresUnicos = [...new Set(dados.map(item => item.consultor).filter(Boolean))];
  const ugsUnicas = [...new Set(dados.map(item => item.ug).filter(Boolean))];

  return (
    <div className="controle-container">
      <div className="container">
        <Header 
          title="CONTROLE" 
          subtitle="Controle de Propostas Fechadas" 
          icon="⚙️" 
        />
        
        <Navigation />

        {/* Estatísticas */}
        <section className="stats">
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Total</h3>
              <div className="stat-number">{estatisticas.total}</div>
            </div>
            <div className="stat-card">
              <h3>UGs Definidas</h3>
              <div className="stat-number">{estatisticas.ugsDefinidas}</div>
            </div>
            <div className="stat-card">
              <h3>UGs Pendentes</h3>
              <div className="stat-number">{estatisticas.ugsPendentes}</div>
            </div>
          </div>
        </section>

        {/* Filtros */}
        <section className="filters">
          <div className="filters-row">
            <input
              type="text"
              placeholder="🔍 Buscar por nome, proposta, UC..."
              value={filtros.nome}
              onChange={(e) => setFiltros({...filtros, nome: e.target.value})}
              className="filter-input"
            />
            
            <select
              value={filtros.consultor}
              onChange={(e) => setFiltros({...filtros, consultor: e.target.value})}
              className="filter-select"
            >
              <option value="">Todos os Consultores</option>
              {consultoresUnicos.map(consultor => (
                <option key={consultor} value={consultor}>{consultor}</option>
              ))}
            </select>
            
            <select
              value={filtros.ug}
              onChange={(e) => setFiltros({...filtros, ug: e.target.value})}
              className="filter-select"
            >
              <option value="">Todas as UGs</option>
              <option value="sem-ug">Sem UG Definida</option>
              {ugsUnicas.map(ug => (
                <option key={ug} value={ug}>{ug}</option>
              ))}
            </select>
            
            <button onClick={limparFiltros} className="clear-filters-btn">
              🗑️ Limpar
            </button>
          </div>
        </section>

        {/* Calibragem Global */}
        <section className="calibragem-global">
          <div className="calibragem-row">
            <label>Calibragem Global (%):</label>
            <input
              type="number"
              step="0.1"
              value={calibragemGlobal}
              onChange={(e) => setCalibragemGlobal(parseFloat(e.target.value) || 0)}
              className="calibragem-input"
            />
            <button 
              onClick={aplicarCalibragemGlobal}
              className="btn primary"
              disabled={calibragemGlobal === 0}
            >
              🎯 Aplicar Calibragem
            </button>
          </div>
        </section>

        {/* Ações */}
        <section className="actions">
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
            <div className="loading">Carregando propostas de controle...</div>
          ) : dadosFiltrados.length === 0 ? (
            <div className="no-data">
              <p>📭 Nenhuma proposta fechada encontrada</p>
              <p>Vá para o PROSPEC e feche algumas propostas para vê-las aqui</p>
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
                    <th>Média</th>
                    <th>UG Definida</th>
                    <th>Status UG</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {dadosFiltrados.map((item, index) => {
                    const ugInfo = ugsDisponiveis.find(ug => ug.nomeUsina === item.ug);
                    
                    return (
                      <tr key={`${item.numeroProposta}-${item.numeroUC}`}>
                        <td>
                          <strong>{item.nomeCliente}</strong>
                          <br />
                          <small>{item.apelido}</small>
                        </td>
                        <td>{item.numeroProposta}</td>
                        <td>{item.numeroUC}</td>
                        <td>{item.consultor}</td>
                        <td>{item.media?.toLocaleString()} kWh</td>
                        <td>
                          {item.ug ? (
                            <span className="ug-definida">{item.ug}</span>
                          ) : (
                            <span className="ug-pendente">Não definida</span>
                          )}
                        </td>
                        <td>
                          {ugInfo && (
                            <span className={`calibragem-status ${ugInfo.calibrado ? 'calibrada' : 'pendente'}`}>
                              {ugInfo.calibrado ? '✅ Calibrada' : '⏳ Pendente'}
                            </span>
                          )}
                        </td>
                        <td>
                          <div className="action-buttons">
                            <button 
                              onClick={() => definirUG(index)}
                              className="btn-icon define-ug"
                              title="Definir UG"
                            >
                              🏭
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Modal de Definir UG */}
        {modalUG.show && (
          <ModalDefinirUG 
            item={modalUG.item}
            ugsDisponiveis={ugsDisponiveis}
            onSave={salvarUG}
            onClose={() => setModalUG({ show: false, item: null, index: -1 })}
          />
        )}
      </div>
    </div>
  );
};

// Componente Modal de Definir UG
const ModalDefinirUG = ({ item, ugsDisponiveis, onSave, onClose }) => {
  const [ugSelecionada, setUgSelecionada] = useState(item.ug || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!ugSelecionada) {
      alert('Selecione uma UG');
      return;
    }

    onSave(ugSelecionada);
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>🏭 Definir Unidade Geradora</h3>
          <button onClick={onClose} className="close-btn">❌</button>
        </div>
        
        <div className="modal-body">
          <div className="proposta-info">
            <h4>Proposta: {item.numeroProposta}</h4>
            <p><strong>Cliente:</strong> {item.nomeCliente}</p>
            <p><strong>UC:</strong> {item.numeroUC}</p>
            <p><strong>Média:</strong> {item.media?.toLocaleString()} kWh</p>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Selecionar UG:</label>
              <select
                value={ugSelecionada}
                onChange={(e) => setUgSelecionada(e.target.value)}
                className="ug-select"
                required
              >
                <option value="">Selecione uma UG...</option>
                {ugsDisponiveis.map(ug => (
                  <option key={ug.id} value={ug.nomeUsina}>
                    {ug.nomeUsina} - {ug.potenciaCA}kW 
                    ({ug.calibrado ? 'Calibrada' : 'Não calibrada'})
                  </option>
                ))}
              </select>
            </div>
            
            {ugSelecionada && (
              <div className="ug-preview">
                {(() => {
                  const ug = ugsDisponiveis.find(u => u.nomeUsina === ugSelecionada);
                  return ug ? (
                    <div className="ug-details">
                      <h5>Detalhes da UG:</h5>
                      <p><strong>Potência CA:</strong> {ug.potenciaCA} kW</p>
                      <p><strong>Potência CC:</strong> {ug.potenciaCC} kW</p>
                      <p><strong>Capacidade:</strong> {ug.capacidade?.toLocaleString()} kWh/mês</p>
                      <p><strong>Média Atual:</strong> {ug.media?.toLocaleString()} kWh</p>
                      <p><strong>Status:</strong> {ug.calibrado ? '✅ Calibrada' : '⏳ Não calibrada'}</p>
                    </div>
                  ) : null;
                })()}
              </div>
            )}
            
            <div className="modal-footer">
              <button type="button" onClick={onClose} className="btn secondary">
                Cancelar
              </button>
              <button type="submit" className="btn primary">
                Definir UG
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ControlePage;