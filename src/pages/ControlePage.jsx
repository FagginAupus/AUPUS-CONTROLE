// src/pages/ControlePage.jsx - CALIBRAGEM CORRIGIDA SEM STATUS UG
import React, { useState, useEffect, useCallback } from 'react';
import Header from '../components/common/Header';
import Navigation from '../components/common/Navigation';
import { useNotification } from '../context/NotificationContext';
import storageService from '../services/storageService';

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

  const carregarDados = useCallback(async () => {
    try {
      setLoading(true);
      
      console.log('📥 Carregando dados de controle do localStorage...');
      
      const dadosControle = await storageService.getControle();
      setDados(dadosControle);
      setDadosFiltrados(dadosControle);
      
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
  }, [showNotification]);

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

  const filtrarDados = useCallback(() => {
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
  }, [dados, filtros]);

  const atualizarEstatisticas = useCallback(() => {
    const total = dadosFiltrados.length;
    const ugsDefinidas = dadosFiltrados.filter(item => item.ug).length;
    const ugsPendentes = total - ugsDefinidas;

    setEstatisticas({
      total,
      ugsDefinidas,
      ugsPendentes
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
      consultor: '',
      ug: ''
    });
  };

  const definirUG = (index) => {
    const item = dadosFiltrados[index];
    if (!item) return;
    setModalUG({ show: true, item, index });
  };

  const salvarUG = async (ugSelecionada) => {
    try {
      const { item } = modalUG;
      
      const indexReal = dados.findIndex(p => 
        p.numeroProposta === item.numeroProposta && p.numeroUC === item.numeroUC
      );
      
      if (indexReal === -1) {
        showNotification('Item não encontrado', 'error');
        return;
      }

      await storageService.atualizarUGControle(indexReal, ugSelecionada);
      await carregarDados();
      
      setModalUG({ show: false, item: null, index: -1 });
      showNotification(`UG "${ugSelecionada}" definida com sucesso!`, 'success');
      
    } catch (error) {
      console.error('❌ Erro ao salvar UG:', error);
      showNotification('Erro ao salvar UG: ' + error.message, 'error');
    }
  };

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
      
      await carregarUGsDisponiveis();
      await carregarDados();
      
      showNotification(`Calibragem aplicada em ${processadas} UGs!`, 'success');
      setCalibragemGlobal(0);
      
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

  // Função para calcular calibragem
  const calcularCalibragem = (item) => {
    if (!item.ug) return null;
    
    const ugInfo = ugsDisponiveis.find(ug => ug.nomeUsina === item.ug);
    if (!ugInfo) return null;
    
    // Mostrar: média original * 1,XX (calibragem)
    const calibragem = calibragemGlobal || 0;
    const mediaCalibrada = item.media * (1 + calibragem / 100);
    
    return {
      original: item.media,
      calibrada: mediaCalibrada,
      fator: (1 + calibragem / 100).toFixed(2)
    };
  };

  const consultoresUnicos = [...new Set(dados.map(item => item.consultor).filter(Boolean))];
  const ugsUnicas = [...new Set(dados.map(item => item.ug).filter(Boolean))];

  return (
    <div className="page-container">
      <div className="container">
        <Header 
          title="CONTROLE" 
          subtitle="Controle de Propostas Fechadas" 
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
            <span className="stat-label">UGs Definidas</span>
            <span className="stat-value">{estatisticas.ugsDefinidas}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">UGs Pendentes</span>
            <span className="stat-value">{estatisticas.ugsPendentes}</span>
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
                  value={filtros.nome}
                  onChange={(e) => setFiltros({...filtros, nome: e.target.value})}
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
                  value={filtros.ug}
                  onChange={(e) => setFiltros({...filtros, ug: e.target.value})}
                >
                  <option value="">Todas as UGs</option>
                  <option value="sem-ug">Sem UG Definida</option>
                  {ugsUnicas.map(ug => (
                    <option key={ug} value={ug}>{ug}</option>
                  ))}
                </select>
              </div>
              
              <div className="filter-group">
                <button onClick={limparFiltros} className="btn-secondary">
                  🗑️ Limpar
                </button>
              </div>
            </div>
          </div>

          {/* Calibragem Global */}
          <div className="calibragem-section">
            <div className="calibragem-container">
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
                className="btn-primary"
                disabled={calibragemGlobal === 0}
              >
                🎯 Aplicar Calibragem
              </button>
            </div>
          </div>

          {/* Ações */}
          <div className="actions-container">
            <button onClick={exportarDados} className="btn-secondary">
              📊 Exportar CSV
            </button>
            <button onClick={carregarDados} className="btn-secondary">
              🔄 Atualizar
            </button>
          </div>
        </section>

        {/* Tabela de dados - SEM STATUS UG + CALIBRAGEM CORRIGIDA */}
        <section className="table-section">
          <div className="table-header">
            <h2>⚙️ Propostas em Controle</h2>
            <span className="table-count">{dadosFiltrados.length} propostas</span>
          </div>
          
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
                    <th>Calibragem</th>
                    <th>UG Definida</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {dadosFiltrados.map((item, index) => {
                    const calibragem = calcularCalibragem(item);
                    
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
                          {calibragem ? (
                            <span className="calibragem-info">
                              {calibragem.original?.toLocaleString()} × {calibragem.fator}
                              <br />
                              <small className="calibragem-resultado">
                                = {calibragem.calibrada?.toLocaleString()} kWh
                              </small>
                            </span>
                          ) : (
                            <span className="sem-calibragem">-</span>
                          )}
                        </td>
                        <td>
                          {item.ug ? (
                            <span className="ug-definida">{item.ug}</span>
                          ) : (
                            <span className="ug-pendente">Não definida</span>
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

        {/* Modal de Definir UG - SEM MENÇÃO DE CALIBRADA */}
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

// Modal de Definir UG - SEM INFORMAÇÃO DE CALIBRADA
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
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
                    </div>
                  ) : null;
                })()}
              </div>
            )}
            
            <div className="modal-footer">
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancelar
              </button>
              <button type="submit" className="btn-primary">
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