// src/pages/ProspecPage.jsx
import React, { useState, useEffect } from 'react';
import Header from '../components/common/Header';
import Navigation from '../components/common/Navigation';
import { useNotification } from '../context/NotificationContext';
import './ProspecPage.css';

const ProspecPage = () => {
  const [dados, setDados] = useState([]);
  const [dadosFiltrados, setDadosFiltrados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({
    nome: '',
    status: '',
    consultor: ''
  });
  const [stats, setStats] = useState({
    total: 0,
    aguardando: 0,
    fechadas: 0,
    valorMedio: 0
  });

  const { showNotification } = useNotification();

  useEffect(() => {
    carregarDados();
  }, []);

  useEffect(() => {
    aplicarFiltros();
  }, [dados, filtros]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      
      // Simular carregamento (substituir pelo storageService depois)
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Dados mock para demonstração
      const dadosMock = [
        {
          id: 1,
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
          telefone: '(62) 99999-9999',
          status: 'Aguardando'
        },
        {
          id: 2,
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
          telefone: '(62) 88888-8888',
          status: 'Fechado'
        },
        {
          id: 3,
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
          telefone: '(62) 77777-7777',
          status: 'Aguardando'
        }
      ];

      setDados(dadosMock);
      showNotification('Dados carregados com sucesso!', 'success');
    } catch (error) {
      showNotification('Erro ao carregar dados', 'error');
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltros = () => {
    let filtrados = [...dados];

    // Filtro por nome
    if (filtros.nome) {
      filtrados = filtrados.filter(item =>
        item.nomeCliente.toLowerCase().includes(filtros.nome.toLowerCase())
      );
    }

    // Filtro por status
    if (filtros.status) {
      filtrados = filtrados.filter(item => item.status === filtros.status);
    }

    // Filtro por consultor
    if (filtros.consultor) {
      filtrados = filtrados.filter(item => item.consultor === filtros.consultor);
    }

    setDadosFiltrados(filtrados);

    // Calcular estatísticas
    const total = filtrados.length;
    const aguardando = filtrados.filter(item => item.status === 'Aguardando').length;
    const fechadas = filtrados.filter(item => item.status === 'Fechado').length;
    const valorMedio = filtrados.length > 0 
      ? filtrados.reduce((sum, item) => sum + item.media, 0) / filtrados.length 
      : 0;

    setStats({ total, aguardando, fechadas, valorMedio });
  };

  const handleFiltroChange = (campo, valor) => {
    setFiltros(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  const formatarData = (data) => {
    return new Date(data).toLocaleDateString('pt-BR');
  };

  const formatarPercentual = (valor) => {
    return (valor * 100).toFixed(1) + '%';
  };

  const getConsultores = () => {
    return [...new Set(dados.map(item => item.consultor))].sort();
  };

  return (
    <div className="page-container">
      <div className="container">
        <Header 
          title="PROSPEC" 
          subtitle="Gestão de Propostas" 
          icon="📊" 
        />
        
        <Navigation />

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
                <label htmlFor="filtroStatus">📋 Status</label>
                <select
                  id="filtroStatus"
                  value={filtros.status}
                  onChange={(e) => handleFiltroChange('status', e.target.value)}
                >
                  <option value="">Todos</option>
                  <option value="Aguardando">Aguardando</option>
                  <option value="Fechado">Fechado</option>
                </select>
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
            </div>

            <div className="actions-container">
              <button className="btn btn-primary" disabled>
                ➕ Nova Proposta
              </button>
              <button className="btn btn-secondary" onClick={carregarDados}>
                🔄 Atualizar
              </button>
            </div>
          </div>
        </section>

        {/* Estatísticas */}
        <section className="quick-stats">
          <div className="stat-card">
            <span className="stat-label">Total</span>
            <span className="stat-value">{stats.total}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Aguardando</span>
            <span className="stat-value">{stats.aguardando}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Fechadas</span>
            <span className="stat-value">{stats.fechadas}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Média (kWh)</span>
            <span className="stat-value">{Math.round(stats.valorMedio)}</span>
          </div>
        </section>

        {/* Tabela */}
        <section className="table-section">
          <div className="table-header">
            <h2>Lista de Propostas</h2>
            <span className="table-count">
              {dadosFiltrados.length} registro{dadosFiltrados.length !== 1 ? 's' : ''}
            </span>
          </div>

          {loading ? (
            <div className="loading-container">
              <div className="spinner-large"></div>
              <p>Carregando propostas...</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Nome Cliente</th>
                    <th>Nº Proposta</th>
                    <th>Data</th>
                    <th>Apelido</th>
                    <th>UC</th>
                    <th>Desc. Tarifa</th>
                    <th>Desc. Bandeira</th>
                    <th>Ligação</th>
                    <th>Consultor</th>
                    <th>Média (kWh)</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {dadosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan="12" className="empty-state">
                        <div>
                          <div className="empty-icon">📭</div>
                          <h3>Nenhuma proposta encontrada</h3>
                          <p>Não há propostas que correspondam aos filtros aplicados.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    dadosFiltrados.map(item => (
                      <tr key={item.id}>
                        <td>{item.nomeCliente}</td>
                        <td className="numero-proposta">{item.numeroProposta}</td>
                        <td className="data">{formatarData(item.data)}</td>
                        <td>{item.apelido}</td>
                        <td>{item.numeroUC}</td>
                        <td>{formatarPercentual(item.descontoTarifa)}</td>
                        <td>{formatarPercentual(item.descontoBandeira)}</td>
                        <td>{item.ligacao}</td>
                        <td>{item.consultor}</td>
                        <td className="valor">{item.media.toLocaleString('pt-BR')} kWh</td>
                        <td>
                          <span className={`status-badge ${item.status === 'Fechado' ? 'status-fechado' : 'status-aguardando'}`}>
                            {item.status}
                          </span>
                        </td>
                        <td>
                          <div className="table-actions">
                            <button className="action-btn edit" title="Editar">
                              ✏️
                            </button>
                            <button className="action-btn view" title="Ver PDF">
                              📄
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
    </div>
  );
};

export default ProspecPage;