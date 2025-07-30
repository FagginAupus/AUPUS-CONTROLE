// src/pages/ControlePage.jsx - ARQUIVO COMPLETO CORRIGIDO
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
      } else {
        setUgsDisponiveis([]);
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

    if (filtros.ug === 'definido') {
      dadosFiltrados = dadosFiltrados.filter(item => item.ug && item.ug.trim() !== '');
    } else if (filtros.ug === 'vazio') {
      dadosFiltrados = dadosFiltrados.filter(item => !item.ug || item.ug.trim() === '');
    }

    setDadosFiltrados(dadosFiltrados);
  };

  const atualizarEstatisticas = () => {
    const total = dadosFiltrados.length;
    const ugsDefinidas = dadosFiltrados.filter(item => item.ug && item.ug.trim() !== '').length;
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

  const editarUG = (item, index) => {
    setModalUG({ show: true, item, index });
  };

  const salvarUG = async (novaUG) => {
    try {
      const { item, index } = modalUG;
      
      if (window.aupusStorage && typeof window.aupusStorage.atualizarControle === 'function') {
        await window.aupusStorage.atualizarControle(index, { ug: novaUG });
        await carregarDados(); // Recarregar dados
        showNotification('UG atualizada com sucesso!', 'success');
      } else {
        // Fallback local
        const novosDados = [...dados];
        novosDados[index] = { ...novosDados[index], ug: novaUG };
        setDados(novosDados);
        showNotification('UG atualizada localmente', 'info');
      }
      
      setModalUG({ show: false, item: null, index: -1 });
    } catch (error) {
      console.error('❌ Erro ao salvar UG:', error);
      showNotification('Erro ao salvar UG: ' + error.message, 'error');
    }
  };

  const aplicarCalibragemGlobal = async () => {
    if (!calibragemGlobal || calibragemGlobal === 0) {
      showNotification('Informe um valor válido para calibragem', 'warning');
      return;
    }

    try {
      const itensVazios = dados.filter(item => !item.ug || item.ug.trim() === '');
      
      if (itensVazios.length === 0) {
        showNotification('Não há propostas sem UG para calibrar', 'info');
        return;
      }

      for (let i = 0; i < dados.length; i++) {
        const item = dados[i];
        if (!item.ug || item.ug.trim() === '') {
          if (window.aupusStorage && typeof window.aupusStorage.atualizarControle === 'function') {
            await window.aupusStorage.atualizarControle(i, { ug: calibragemGlobal.toString() });
          }
        }
      }

      await carregarDados();
      showNotification(`Calibragem aplicada a ${itensVazios.length} propostas!`, 'success');
      setCalibragemGlobal(0);
    } catch (error) {
      console.error('❌ Erro na calibragem global:', error);
      showNotification('Erro na calibragem global: ' + error.message, 'error');
    }
  };

  // Obter consultores únicos para o filtro
  const consultoresUnicos = [...new Set(dados.map(item => item.consultor))].filter(Boolean).sort();

  if (loading) {
    return (
      <div className="page-container">
        <div className="container">
          <Header title="CONTROLE" subtitle="Gestão de Propostas Fechadas" icon="✅" />
          <Navigation />
          
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Carregando dados...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="container">
        <Header title="CONTROLE" subtitle="Gestão de Propostas Fechadas" icon="✅" />
        <Navigation />

        {/* ESTATÍSTICAS RÁPIDAS */}
        <section className="quick-stats">
          <div className="stat-card">
            <span className="stat-label">Total de Propostas</span>
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

        {/* SEÇÃO DE FILTROS - ESPAÇAMENTO CORRIGIDO */}
        <section className="filters-section">
          <h2>🔍 Filtros</h2>
          
          <div className="filters-grid">
            <div className="filter-group">
              <label htmlFor="filtroNome">Nome do Cliente</label>
              <input
                type="text"
                id="filtroNome"
                placeholder="Buscar por nome..."
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
                <option value="">Todos</option>
                {consultoresUnicos.map(consultor => (
                  <option key={consultor} value={consultor}>{consultor}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="filtroUG">Status UG</label>
              <select
                id="filtroUG"
                value={filtros.ug}
                onChange={(e) => setFiltros(prev => ({ ...prev, ug: e.target.value }))}
              >
                <option value="">Todos</option>
                <option value="definido">UG Definida</option>
                <option value="vazio">UG Vazia</option>
              </select>
            </div>
          </div>

          <div className="filter-actions">
            <button className="btn btn-secondary" onClick={limparFiltros}>
              🗑️ Limpar Filtros
            </button>
          </div>
        </section>

        {/* CALIBRAGEM GLOBAL */}
        {estatisticas.ugsPendentes > 0 && (
          <section className="filters-section calibragem-card">
            <h2>⚙️ Calibragem Global</h2>
            <p>Aplicar UG para todas as {estatisticas.ugsPendentes} propostas sem definição:</p>
            
            <div className="calibragem-container">
              <input
                type="number"
                className="calibragem-input"
                placeholder="UG"
                value={calibragemGlobal || ''}
                onChange={(e) => setCalibragemGlobal(parseInt(e.target.value) || 0)}
              />
              <button
                className="calibragem-apply btn btn-primary"
                onClick={aplicarCalibragemGlobal}
              >
                ⚡ Aplicar
              </button>
            </div>
          </section>
        )}

        {/* SEÇÃO DA TABELA - POSICIONAMENTO CORRETO */}
        <section className="data-section">
          <div className="table-header">
            <h2>📋 Dados de Controle</h2>
            <span className="table-count">{dadosFiltrados.length} registros</span>
          </div>

          {dadosFiltrados.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <h3>Nenhuma proposta encontrada</h3>
              <p>Não há propostas fechadas que correspondam aos filtros aplicados.</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>UG</th>
                    <th>Nome Cliente</th>
                    <th>Nº Proposta</th>
                    <th>Data</th>
                    <th>Apelido</th>
                    <th>UC</th>
                    <th>Desc. Tarifa</th>
                    <th>Desc. Bandeira</th>
                    <th>Ligação</th>
                    <th>Consultor</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {dadosFiltrados.map((item, index) => (
                    <tr key={`${item.numeroProposta}-${item.numeroUC}-${index}`}>
                      <td>
                        <span className={item.ug && item.ug.trim() !== '' ? 'ug-definido' : 'ug-vazio'}>
                          {item.ug && item.ug.trim() !== '' ? item.ug : 'Não definido'}
                        </span>
                      </td>
                      <td>{item.nomeCliente}</td>
                      <td className="numero-proposta">{item.numeroProposta}</td>
                      <td className="data">{item.data}</td>
                      <td>{item.apelido}</td>
                      <td className="numero-proposta">{item.numeroUC}</td>
                      <td className="valor">{((item.descontoTarifa || 0) * 100).toFixed(1)}%</td>
                      <td className="valor">{((item.descontoBandeira || 0) * 100).toFixed(1)}%</td>
                      <td>{item.ligacao}</td>
                      <td>{item.consultor}</td>
                      <td>
                        <div className="table-actions">
                          <button
                            className="action-btn edit"
                            onClick={() => editarUG(item, index)}
                            title="Editar UG"
                          >
                            ✏️ UG
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

        {/* MODAL EDIÇÃO UG */}
        {modalUG.show && (
          <div className="modal-overlay" onClick={() => setModalUG({ show: false, item: null, index: -1 })}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Definir UG</h3>
                <button
                  className="modal-close"
                  onClick={() => setModalUG({ show: false, item: null, index: -1 })}
                >
                  ✕
                </button>
              </div>
              
              <div className="modal-body">
                <p><strong>Cliente:</strong> {modalUG.item?.nomeCliente}</p>
                <p><strong>Proposta:</strong> {modalUG.item?.numeroProposta}</p>
                <p><strong>UC:</strong> {modalUG.item?.numeroUC}</p>
                
                <div className="form-group">
                  <label htmlFor="modalUGInput">Unidade Geradora:</label>
                  <input
                    type="text"
                    id="modalUGInput"
                    placeholder="Digite a UG"
                    defaultValue={modalUG.item?.ug || ''}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        salvarUG(e.target.value);
                      }
                    }}
                  />
                </div>
              </div>
              
              <div className="modal-footer">
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    const input = document.getElementById('modalUGInput');
                    salvarUG(input.value);
                  }}
                >
                  💾 Salvar
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setModalUG({ show: false, item: null, index: -1 })}
                >
                  ❌ Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ESTILOS DO MODAL */}
      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 12px;
          padding: 0;
          max-width: 500px;
          width: 90%;
          max-height: 80vh;
          overflow: auto;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
        }

        .modal-header {
          padding: 20px;
          border-bottom: 1px solid #e1e1e1;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .modal-header h3 {
          margin: 0;
          color: #333;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #999;
        }

        .modal-close:hover {
          color: #333;
        }

        .modal-body {
          padding: 20px;
        }

        .modal-body p {
          margin: 10px 0;
          color: #666;
        }

        .modal-footer {
          padding: 20px;
          border-top: 1px solid #e1e1e1;
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }
      `}</style>
    </div>
  );
};

export default ControlePage;