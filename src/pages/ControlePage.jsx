// src/pages/ControlePage.jsx - CORRIGIDO conforme solicitações
import React, { useState, useEffect } from 'react';
import Header from '../components/common/Header';
import Navigation from '../components/common/Navigation';
import { useNotification } from '../context/NotificationContext';
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

  const { showNotification } = useNotification();

  useEffect(() => {
    carregarDados();
  }, []);

  useEffect(() => {
    filtrarDados();
  }, [filtros, dados]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      
      let tentativas = 0;
      while (!window.aupusStorage && tentativas < 30) {
        await new Promise(resolve => setTimeout(resolve, 100));
        tentativas++;
      }

      if (!window.aupusStorage || typeof window.aupusStorage.getControle !== 'function') {
        console.warn('⚠️ aupusStorage não disponível');
        setDados([]);
        setDadosFiltrados([]);
        showNotification('Sistema não disponível. Feche algumas propostas no PROSPEC!', 'info');
        return;
      }

      const dadosControle = await window.aupusStorage.getControle();
      const dadosArray = Array.isArray(dadosControle) ? dadosControle : [];
      
      setDados(dadosArray);
      setDadosFiltrados(dadosArray);
      
      // Carregar UGs disponíveis
      await carregarUGsDisponiveis();
      
      console.log(`✅ ${dadosArray.length} propostas de controle carregadas`);
      
      // NOTIFICAÇÃO ÚNICA - evitar logs duplicados
      if (dadosArray.length === 0) {
        showNotification('Nenhuma proposta fechada encontrada. Feche algumas propostas no PROSPEC!', 'info');
      } else {
        showNotification(`${dadosArray.length} propostas fechadas carregadas!`, 'success');
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
      if (window.aupusStorage && typeof window.aupusStorage.getUGs === 'function') {
        const ugs = await window.aupusStorage.getUGs();
        setUgsDisponiveis(Array.isArray(ugs) ? ugs : []);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar UGs:', error);
      setUgsDisponiveis([]);
    }
  };

  const filtrarDados = () => {
    let dadosFiltrados = dados;

    if (filtros.nome) {
      dadosFiltrados = dadosFiltrados.filter(item =>
        item.nomeCliente?.toLowerCase().includes(filtros.nome.toLowerCase())
      );
    }

    if (filtros.consultor) {
      dadosFiltrados = dadosFiltrados.filter(item =>
        item.consultor === filtros.consultor
      );
    }

    if (filtros.ug) {
      dadosFiltrados = dadosFiltrados.filter(item =>
        item.ug === filtros.ug
      );
    }

    setDadosFiltrados(dadosFiltrados);
  };

  const editarUG = (item, index) => {
    setModalUG({ show: true, item, index });
  };

  const salvarUG = async (ugSelecionada) => {
    try {
      const { item, index } = modalUG;
      
      // Encontrar index real no array principal
      const indexReal = dados.findIndex(p => 
        p.numeroProposta === item.numeroProposta && 
        p.numeroUC === item.numeroUC
      );
      
      if (indexReal !== -1 && window.aupusStorage?.atualizarUGControle) {
        await window.aupusStorage.atualizarUGControle(indexReal, ugSelecionada);
        await carregarDados(); // Recarregar dados
        
        const mensagem = ugSelecionada ? 
          `UG "${ugSelecionada}" definida com sucesso!` : 
          'UG removida com sucesso!';
        
        showNotification(mensagem, 'success');
      } else {
        showNotification('Erro ao atualizar UG', 'error');
      }
    } catch (error) {
      console.error('❌ Erro ao salvar UG:', error);
      showNotification('Erro ao salvar UG: ' + error.message, 'error');
    }
    
    setModalUG({ show: false, item: null, index: -1 });
  };

  const aplicarCalibragem = () => {
    showNotification(`Calibragem de ${calibragemGlobal}% aplicada!`, 'success');
  };

  const calcularCalibragem = (media) => {
    const multiplicador = 1 + (calibragemGlobal / 100);
    return Math.round((media || 0) * multiplicador);
  };

  const formatarData = (data) => {
    return new Date(data).toLocaleDateString('pt-BR');
  };

  const formatarPercentual = (valor) => {
    return ((valor || 0) * 100).toFixed(1) + '%';
  };

  const getUGStatusClass = (ug) => {
    return (!ug || ug.trim() === '') ? 'ug-vazio' : 'ug-definido';
  };

  const getUGStatusIcon = (ug) => {
    return (!ug || ug.trim() === '') ? '❌' : '✅';
  };

  const ugsPendentesCount = dados.filter(item => !item.ug || item.ug.trim() === '').length;
  const ugsDefinidasCount = dados.filter(item => item.ug && item.ug.trim() !== '').length;

  return (
    <div className="page-container">
      <div className="container">
        <Header 
          title="CONTROLE" 
          subtitle="Propostas Fechadas e UGs" 
          icon="✅" 
        />
        
        <Navigation />

        {/* ALERTA CORRIGIDO - SEM "Preencher UGs..." */}
        {ugsPendentesCount > 0 && (
          <div className="alert alert-warning">
            <div className="alert-content">
              <span className="alert-icon">⚠️</span>
              <div className="alert-text">
                <strong>Atenção!</strong> Existem {ugsPendentesCount} propostas fechadas sem UG definida.
              </div>
            </div>
          </div>
        )}

        {/* Estatísticas */}
        <section className="stats-section">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{dados.length}</div>
              <div className="stat-label">Total Propostas</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{ugsDefinidasCount}</div>
              <div className="stat-label">UGs Definidas</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{ugsPendentesCount}</div>
              <div className="stat-label">UGs Pendentes</div>
            </div>
          </div>
        </section>

        {/* Filtros e Calibragem */}
        <section className="filters-section">
          <div className="filters-grid">
            <div className="filter-group">
              <label htmlFor="filtroNome">Cliente</label>
              <input
                type="text"
                id="filtroNome"
                placeholder="Buscar por cliente..."
                value={filtros.nome}
                onChange={(e) => setFiltros(prev => ({ ...prev, nome: e.target.value }))}
              />
            </div>

            <div className="filter-group">
              <label htmlFor="filtroConsultor">Consultor</label>
              <select
                id="filtroConsultor"
                value={filtros.consultor}
                onChange={(e) => setFiltros(prev => ({ ...prev, consultor: e.target.value }))}
              >
                <option value="">Todos os consultores</option>
                {[...new Set(dados.map(item => item.consultor))].filter(Boolean).sort().map(consultor => (
                  <option key={consultor} value={consultor}>{consultor}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="filtroUG">UG</label>
              <select
                id="filtroUG"
                value={filtros.ug}
                onChange={(e) => setFiltros(prev => ({ ...prev, ug: e.target.value }))}
              >
                <option value="">Todas as UGs</option>
                {[...new Set(dados.map(item => item.ug))].filter(Boolean).sort().map(ug => (
                  <option key={ug} value={ug}>{ug}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="calibragemGlobal">Calibragem Global (%)</label>
              <div className="calibragem-container">
                <input
                  type="number"
                  id="calibragemGlobal"
                  value={calibragemGlobal}
                  onChange={(e) => setCalibragemGlobal(parseFloat(e.target.value) || 0)}
                  step="0.1"
                  min="0"
                  max="100"
                />
                <button onClick={aplicarCalibragem} className="btn btn-secondary">
                  Aplicar
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Tabela */}
        <section className="data-section">
          <div className="table-header">
            <h2>Propostas Fechadas ({dadosFiltrados.length})</h2>
            <button className="btn btn-primary" onClick={carregarDados}>
              🔄 Atualizar
            </button>
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Carregando propostas...</p>
            </div>
          ) : dadosFiltrados.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <h3>Nenhuma proposta encontrada</h3>
              <p>Feche algumas propostas no PROSPEC ou ajuste os filtros</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nº Proposta</th>
                    <th>Cliente</th>
                    <th>Apelido</th>
                    <th>Nº UC</th>
                    <th>Data</th>
                    <th>Desc. Tarifa</th>
                    <th>Desc. Bandeira</th>
                    <th>Ligação</th>
                    <th>Consultor</th>
                    <th>Recorrência</th>
                    <th>Média (kWh)</th>
                    <th>Calibrado (kWh)</th>
                    <th>Telefone</th>
                    <th>UG</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {dadosFiltrados.map((item, index) => (
                    <tr key={`${item.numeroProposta}-${item.numeroUC}-${index}`}>
                      <td>{item.numeroProposta || '-'}</td>
                      <td><strong>{item.nomeCliente || '-'}</strong></td>
                      <td>{item.apelido || '-'}</td>
                      <td>{item.numeroUC || '-'}</td>
                      <td className="data">{item.data ? formatarData(item.data) : '-'}</td>
                      <td className="valor">{formatarPercentual(item.descontoTarifa)}</td>
                      <td className="valor">{formatarPercentual(item.descontoBandeira)}</td>
                      <td>{item.ligacao || '-'}</td>
                      <td><strong>{item.consultor || '-'}</strong></td>
                      <td className="valor">{item.recorrencia || '-'}</td>
                      <td className="valor">{(item.media || 0).toLocaleString('pt-BR')} kWh</td>
                      <td className="valor calibragem">{calcularCalibragem(item.media).toLocaleString('pt-BR')} kWh</td>
                      <td className="data">{item.telefone || '-'}</td>
                      <td className={`ug ${getUGStatusClass(item.ug)}`}>
                        {getUGStatusIcon(item.ug)} {item.ug || 'Não definida'}
                      </td>
                      <td>
                        <div className="table-actions">
                          <button
                            onClick={() => editarUG(item, index)}
                            className="action-btn ug"
                            title="Editar UG"
                          >
                            🏢
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

      {/* Modal de Edição UG */}
      {modalUG.show && (
        <ModalUG
          item={modalUG.item}
          ugsDisponiveis={ugsDisponiveis}
          onClose={() => setModalUG({ show: false, item: null, index: -1 })}
          onSave={salvarUG}
        />
      )}
    </div>
  );
};

// Componente Modal UG
const ModalUG = ({ item, ugsDisponiveis, onClose, onSave }) => {
  const [ugSelecionada, setUgSelecionada] = useState(item?.ug || '');

  const handleSave = () => {
    onSave(ugSelecionada);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Definir UG</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <p><strong>Cliente:</strong> {item?.nomeCliente}</p>
          <p><strong>Apelido:</strong> {item?.apelido}</p>
          <p><strong>UC:</strong> {item?.numeroUC}</p>
          
          <div className="form-group">
            <label htmlFor="ugSelect">Selecionar UG:</label>
            <select
              id="ugSelect"
              value={ugSelecionada}
              onChange={(e) => setUgSelecionada(e.target.value)}
            >
              <option value="">Selecione uma UG...</option>
              {ugsDisponiveis.map((ug) => (
                <option key={ug.id} value={ug.nomeUsina}>
                  {ug.nomeUsina} - {ug.capacidade} MWh
                </option>
              ))}
              <option value="" style={{ color: '#dc3545' }}>--- Remover UG ---</option>
            </select>
          </div>
        </div>
        
        <div className="modal-footer">
          <button className="btn btn-primary" onClick={handleSave}>
            💾 Salvar
          </button>
          <button className="btn btn-secondary" onClick={onClose}>
            ❌ Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ControlePage;