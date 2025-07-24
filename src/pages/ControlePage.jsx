// src/pages/ControlePage.jsx
import React, { useState, useEffect } from 'react';
import Header from '../components/common/Header';
import Navigation from '../components/common/Navigation';
import { useNotification } from '../context/NotificationContext';
import './ControlePage.css';

const ControlePage = () => {
  const [dados, setDados] = useState([]);
  const [dadosFiltrados, setDadosFiltrados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalUG, setModalUG] = useState({ show: false, item: null, index: -1 });
  const [calibragemGlobal, setCalibragemGlobal] = useState(0);
  const [filtros, setFiltros] = useState({
    nome: '',
    consultor: '',
    ug: ''
  });
  const [stats, setStats] = useState({
    total: 0,
    ugsDefinidas: 0,
    ugsPendentes: 0
  });

  const { showNotification } = useNotification();

  // UGs disponíveis (mock)
  const ugsDisponiveis = [
    { nomeUsina: 'Usina Solar Goiânia I', capacidade: 1200.50 },
    { nomeUsina: 'Usina Solar Brasília II', capacidade: 980.75 },
    { nomeUsina: 'Usina Solar Anápolis III', capacidade: 1450.25 }
  ];

  useEffect(() => {
    carregarDados();
    carregarCalibragem();
  }, []);

  useEffect(() => {
    aplicarFiltros();
  }, [dados, filtros]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      
      // Simular carregamento
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Dados mock de propostas fechadas
      const dadosMock = [
        {
          id: 1,
          ug: '', // UG vazia - precisa definir
          nomeCliente: 'João Silva',
          numeroProposta: '2025/0001',
          data: '2025-07-20',
          apelido: 'Loja Centro',
          numeroUC: '12345678',
          descontoTarifa: 0.20,
          descontoBandeira: 0.15,
          ligacao: 'Trifásica',
          consultor: 'Maria Santos',
          recorrencia: '3%',
          media: 850,
          telefone: '(62) 99999-9999'
        },
        {
          id: 2,
          ug: 'Usina Solar Goiânia I', // UG já definida
          nomeCliente: 'Empresa ABC',
          numeroProposta: '2025/0002',
          data: '2025-07-21',
          apelido: 'Matriz',
          numeroUC: '87654321',
          descontoTarifa: 0.25,
          descontoBandeira: 0.20,
          ligacao: 'Trifásica',
          consultor: 'João Silva',
          recorrencia: '5%',
          media: 1200,
          telefone: '(62) 88888-8888'
        },
        {
          id: 3,
          ug: '', // UG vazia - precisa definir
          nomeCliente: 'Comércio XYZ',
          numeroProposta: '2025/0003',
          data: '2025-07-22',
          apelido: 'Filial Norte',
          numeroUC: '11223344',
          descontoTarifa: 0.18,
          descontoBandeira: 0.12,
          ligacao: 'Bifásica',
          consultor: 'Maria Santos',
          recorrencia: '2%',
          media: 650,
          telefone: '(62) 77777-7777'
        }
      ];

      setDados(dadosMock);
      showNotification('Propostas fechadas carregadas!', 'success');
    } catch (error) {
      showNotification('Erro ao carregar dados', 'error');
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const carregarCalibragem = () => {
    const calibragem = localStorage.getItem('aupus_calibragem_global');
    setCalibragemGlobal(calibragem ? parseFloat(calibragem) : 0);
  };

  const aplicarFiltros = () => {
    let filtrados = [...dados];

    // Filtro por nome
    if (filtros.nome) {
      filtrados = filtrados.filter(item =>
        item.nomeCliente.toLowerCase().includes(filtros.nome.toLowerCase())
      );
    }

    // Filtro por consultor
    if (filtros.consultor) {
      filtrados = filtrados.filter(item => item.consultor === filtros.consultor);
    }

    // Filtro por UG
    if (filtros.ug === 'definido') {
      filtrados = filtrados.filter(item => item.ug && item.ug.trim() !== '');
    } else if (filtros.ug === 'vazio') {
      filtrados = filtrados.filter(item => !item.ug || item.ug.trim() === '');
    }

    setDadosFiltrados(filtrados);

    // Calcular estatísticas
    const total = filtrados.length;
    const ugsDefinidas = filtrados.filter(item => item.ug && item.ug.trim() !== '').length;
    const ugsPendentes = total - ugsDefinidas;

    setStats({ total, ugsDefinidas, ugsPendentes });
  };

  const handleFiltroChange = (campo, valor) => {
    setFiltros(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  const getConsultores = () => {
    return [...new Set(dados.map(item => item.consultor))].sort();
  };

  const editarUG = (item, index) => {
    setModalUG({
      show: true,
      item,
      index
    });
  };

  const salvarUG = async (novaUG) => {
    try {
      if (modalUG.index === -1) return;
      
      // Simular salvamento
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Atualizar dados
      const novosDados = [...dados];
      novosDados[modalUG.index].ug = novaUG;
      setDados(novosDados);
      
      setModalUG({ show: false, item: null, index: -1 });
      
      const mensagem = novaUG ? 
        `UG "${novaUG}" definida com sucesso!` : 
        'UG removida com sucesso!';
      
      showNotification(mensagem, 'success');
    } catch (error) {
      showNotification('Erro ao salvar UG', 'error');
    }
  };

  const aplicarCalibragem = () => {
    try {
      localStorage.setItem('aupus_calibragem_global', calibragemGlobal.toString());
      showNotification(`Calibragem de ${calibragemGlobal}% aplicada com sucesso!`, 'success');
    } catch (error) {
      showNotification('Erro ao aplicar calibragem', 'error');
    }
  };

  const preencherUGsVazias = async () => {
    const ugsVazias = dados.filter(item => !item.ug || item.ug.trim() === '');
    
    if (ugsVazias.length === 0) {
      showNotification('Não há UGs vazias para preencher!', 'info');
      return;
    }

    const ugEscolhida = prompt(`Escolha uma UG para preencher as ${ugsVazias.length} propostas vazias:\n\n` +
      ugsDisponiveis.map((ug, i) => `${i + 1}. ${ug.nomeUsina} - ${ug.capacidade} MWh`).join('\n') +
      '\n\nDigite o número da UG escolhida:'
    );

    if (ugEscolhida && !isNaN(ugEscolhida)) {
      const indice = parseInt(ugEscolhida) - 1;
      
      if (indice >= 0 && indice < ugsDisponiveis.length) {
        const ug = ugsDisponiveis[indice];
        
        try {
          // Simular preenchimento
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          const novosDados = dados.map(item => 
            (!item.ug || item.ug.trim() === '') 
              ? { ...item, ug: ug.nomeUsina }
              : item
          );
          
          setDados(novosDados);
          showNotification(`${ugsVazias.length} UGs preenchidas com "${ug.nomeUsina}"!`, 'success');
        } catch (error) {
          showNotification('Erro ao preencher UGs', 'error');
        }
      } else {
        showNotification('Número inválido selecionado!', 'error');
      }
    }
  };

  const formatarData = (data) => {
    return new Date(data).toLocaleDateString('pt-BR');
  };

  const formatarPercentual = (valor) => {
    return (valor * 100).toFixed(1) + '%';
  };

  const getUGStatusClass = (ug) => {
    return (!ug || ug.trim() === '') ? 'ug-vazio' : 'ug-definido';
  };

  const getUGStatusIcon = (ug) => {
    return (!ug || ug.trim() === '') ? '❌' : '✅';
  };

  const calcularCalibragem = (media) => {
    const multiplicador = 1 + (calibragemGlobal / 100);
    return Math.round(media * multiplicador);
  };

  const ugsPendentesCount = dados.filter(item => !item.ug || item.ug.trim() === '').length;

  return (
    <div className="page-container">
      <div className="container">
        <Header 
          title="CONTROLE" 
          subtitle="Propostas Fechadas e UGs" 
          icon="✅" 
        />
        
        <Navigation />

        {/* Alerta sobre UGs vazias */}
        {ugsPendentesCount > 0 && (
          <div className="alert alert-warning">
            <div className="alert-content">
              <span className="alert-icon">⚠️</span>
              <div className="alert-text">
                <strong>Atenção!</strong> Existem {ugsPendentesCount} propostas fechadas sem UG definida.
                <button className="btn btn-small" onClick={preencherUGsVazias}>
                  Preencher UGs
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Filtros */}
        <section className="filters-section">
          <div className="filters-container">
            <div className="filters-grid">
              <div className="filter-group">
                <label htmlFor="filtroNome">🔍 Buscar por Nome</label>
                <input
                  type="text"
                  id="filtroNome"
                  placeholder="Digite o nome do cliente..."
                  value={filtros.nome}
                  onChange={(e) => handleFiltroChange('nome', e.target.value)}
                />
              </div>

              <div className="filter-group">
                <label htmlFor="filtroConsultor">👤 Consultor</label>
                <select
                  id="filtroConsultor"
                  value={filtros.consultor}
                  onChange={(e) => handleFiltroChange('consultor', e.target.value)}
                >
                  <option value="">Todos</option>
                  {getConsultores().map(consultor => (
                    <option key={consultor} value={consultor}>
                      {consultor}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label htmlFor="filtroUG">🏢 Status UG</label>
                <select
                  id="filtroUG"
                  value={filtros.ug}
                  onChange={(e) => handleFiltroChange('ug', e.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="definido">UG Definida</option>
                  <option value="vazio">UG Vazia</option>
                </select>
              </div>
            </div>

            <div className="actions-container">
              <button className="btn btn-secondary" onClick={carregarDados}>
                🔄 Atualizar
              </button>
            </div>
          </div>
        </section>

        {/* Estatísticas com Calibragem */}
        <section className="quick-stats">
          <div className="stat-card">
            <span className="stat-label">Total Fechadas</span>
            <span className="stat-value">{stats.total}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">UGs Definidas</span>
            <span className="stat-value">{stats.ugsDefinidas}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">UGs Pendentes</span>
            <span className="stat-value">{stats.ugsPendentes}</span>
          </div>
          <div className="stat-card calibragem-card">
            <span className="stat-label">⚡ Calibragem Global</span>
            <div className="calibragem-container">
              <input
                type="number"
                placeholder="0"
                step="0.1"
                min="0"
                max="100"
                value={calibragemGlobal}
                onChange={(e) => setCalibragemGlobal(parseFloat(e.target.value) || 0)}
                className="calibragem-input"
              />
              <span className="calibragem-percent">%</span>
              <button onClick={aplicarCalibragem} className="calibragem-apply">
                Aplicar
              </button>
            </div>
          </div>
        </section>

        {/* Tabela */}
        <section className="table-section">
          <div className="table-header">
            <h2>Propostas Fechadas</h2>
            <span className="table-count">
              {dadosFiltrados.length} registro{dadosFiltrados.length !== 1 ? 's' : ''}
            </span>
          </div>

          {loading ? (
            <div className="loading-container">
              <div className="spinner-large"></div>
              <p>Carregando propostas fechadas...</p>
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
                    <th>Recorrência</th>
                    <th>Média (kWh)</th>
                    <th>Calibragem (kWh)</th>
                    <th>Telefone</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {dadosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan="15" className="empty-state">
                        <div>
                          <div className="empty-icon">📭</div>
                          <h3>Nenhuma proposta fechada encontrada</h3>
                          <p>Não há propostas fechadas que correspondam aos filtros aplicados.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    dadosFiltrados.map((item, index) => (
                      <tr key={item.id}>
                        <td>
                          <div className="ug-cell">
                            <span className={`ug-status ${getUGStatusClass(item.ug)}`}>
                              {getUGStatusIcon(item.ug)}
                            </span>
                            <span className={`ug-text ${getUGStatusClass(item.ug)}`}>
                              {item.ug || 'Não definida'}
                            </span>
                          </div>
                        </td>
                        <td>{item.nomeCliente}</td>
                        <td className="numero-proposta">{item.numeroProposta}</td>
                        <td className="data">{formatarData(item.data)}</td>
                        <td>{item.apelido}</td>
                        <td>{item.numeroUC}</td>
                        <td>{formatarPercentual(item.descontoTarifa)}</td>
                        <td>{formatarPercentual(item.descontoBandeira)}</td>
                        <td>{item.ligacao}</td>
                        <td>{item.consultor}</td>
                        <td>{item.recorrencia}</td>
                        <td className="valor">{item.media.toLocaleString('pt-BR')} kWh</td>
                        <td className="valor calibragem">{calcularCalibragem(item.media).toLocaleString('pt-BR')} kWh</td>
                        <td className="data">{item.telefone}</td>
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
                    ))
                  )}
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
          <span className="modal-close" onClick={onClose}>&times;</span>
        </div>
        <div className="modal-body">
          <div className="cliente-card">
            <h3>{item?.nomeCliente}</h3>
            <div className="cliente-detalhes">
              <p><strong>Proposta:</strong> {item?.numeroProposta}</p>
              <p><strong>UC:</strong> {item?.numeroUC}</p>
              <p><strong>Apelido:</strong> {item?.apelido}</p>
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="selectUG">UG (Unidade Geradora)</label>
            <select
              id="selectUG"
              value={ugSelecionada}
              onChange={(e) => setUgSelecionada(e.target.value)}
              style={{ fontSize: '1.1rem', padding: '15px', width: '100%' }}
            >
              <option value="">Selecione uma UG...</option>
              {ugsDisponiveis.map(ug => (
                <option key={ug.nomeUsina} value={ug.nomeUsina}>
                  {ug.nomeUsina} - {ug.capacidade} MWh
                </option>
              ))}
              <option value="" style={{ fontStyle: 'italic', color: '#dc3545' }}>
                --- Remover UG ---
              </option>
            </select>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-primary" onClick={handleSave}>
            💾 Salvar UG
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