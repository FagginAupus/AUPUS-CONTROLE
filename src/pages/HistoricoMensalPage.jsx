import React, { useState, useEffect, useCallback } from 'react';
import '../styles/common/index.css';
import Header from '../components/common/Header';
import Navigation from '../components/common/Navigation';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/apiService';
import {
  Calendar,
  Users,
  TrendingUp,
  TrendingDown,
  ArrowLeft,
  RefreshCw,
  Download,
  Eye,
  Database,
  CheckCircle,
  AlertTriangle,
  Clock,
  Zap,
  Loader
} from 'lucide-react';
import './ControlePage.css';
import './HistoricoMensalPage.css';

const HistoricoMensalPage = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const isAdminOrAnalista = user?.role === 'admin' || user?.role === 'analista';

  const [resumos, setResumos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [detalhes, setDetalhes] = useState(null);
  const [mesSelecionado, setMesSelecionado] = useState(null);
  const [loadingDetalhes, setLoadingDetalhes] = useState(false);
  const [filtroDetalhe, setFiltroDetalhe] = useState('');

  const carregarResumos = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/controle/historico-mensal');
      if (response.success) {
        setResumos(response.data);
      }
    } catch (error) {
      showNotification(`Erro ao carregar histórico: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    carregarResumos();
  }, [carregarResumos]);

  const gerarRetroativo = async () => {
    if (gerando) return;
    try {
      setGerando(true);
      showNotification('Gerando snapshots retroativos...', 'info');
      const response = await apiService.post('/controle/historico-mensal/gerar-retroativo');
      if (response.success) {
        showNotification(response.message, 'success');
        await carregarResumos();
      } else {
        showNotification(response.message || 'Erro ao gerar', 'error');
      }
    } catch (error) {
      showNotification(`Erro: ${error.message}`, 'error');
    } finally {
      setGerando(false);
    }
  };

  const gerarMesAnterior = async () => {
    if (gerando) return;
    try {
      setGerando(true);
      const response = await apiService.get('/controle/historico-mensal/gerar-mes-anterior');
      if (response.success) {
        showNotification(response.message, 'success');
        await carregarResumos();
      }
    } catch (error) {
      showNotification(`Erro: ${error.message}`, 'error');
    } finally {
      setGerando(false);
    }
  };

  const verDetalhes = async (anoMes) => {
    try {
      setLoadingDetalhes(true);
      setMesSelecionado(anoMes);
      const response = await apiService.get(`/controle/historico-mensal/${anoMes}`);
      if (response.success) {
        setDetalhes(response.data);
      }
    } catch (error) {
      showNotification(`Erro ao carregar detalhes: ${error.message}`, 'error');
    } finally {
      setLoadingDetalhes(false);
    }
  };

  const voltarParaLista = () => {
    setDetalhes(null);
    setMesSelecionado(null);
    setFiltroDetalhe('');
  };

  const exportarMes = async (anoMes) => {
    try {
      const response = await apiService.get(`/controle/historico-mensal/${anoMes}/exportar`);
      if (response.success && response.data) {
        const itens = response.data.itens || [];
        if (itens.length === 0) {
          showNotification('Nenhum dado para exportar', 'warning');
          return;
        }

        // Generate CSV
        const headers = [
          'Nome Cliente', 'Nº UC', 'Apelido UC', 'Nº Proposta', 'Status',
          'UG', 'Consumo Médio', 'Consumo Calibrado', 'Calibragem',
          'Desc. Tarifa', 'Desc. Bandeira', 'Consultor',
          'Data Entrada', 'Data Assinatura', 'Data Em Andamento',
          'Data Titularidade', 'Data Alocação UG'
        ];

        const rows = itens.map(item => [
          item.nome_cliente || '',
          item.numero_uc || '',
          item.apelido_uc || '',
          item.numero_proposta || '',
          item.status_troca || '',
          item.ug_nome || '',
          item.consumo_medio || '',
          item.consumo_calibrado || '',
          item.calibragem || '',
          item.desconto_tarifa || '',
          item.desconto_bandeira || '',
          item.consultor || '',
          item.data_entrada_controle ? new Date(item.data_entrada_controle).toLocaleDateString('pt-BR') : '',
          item.data_assinatura ? new Date(item.data_assinatura).toLocaleDateString('pt-BR') : '',
          item.data_em_andamento ? new Date(item.data_em_andamento).toLocaleDateString('pt-BR') : '',
          item.data_titularidade ? new Date(item.data_titularidade).toLocaleDateString('pt-BR') : '',
          item.data_alocacao_ug ? new Date(item.data_alocacao_ug).toLocaleDateString('pt-BR') : ''
        ]);

        const csvContent = [
          headers.join(';'),
          ...rows.map(row => row.map(cell => `"${cell}"`).join(';'))
        ].join('\n');

        const BOM = '\uFEFF';
        const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `historico_${anoMes}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        showNotification(`Exportado ${itens.length} registros de ${anoMes}`, 'success');
      }
    } catch (error) {
      showNotification(`Erro ao exportar: ${error.message}`, 'error');
    }
  };

  const formatarMes = (anoMes) => {
    const [ano, mes] = anoMes.split('-');
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${meses[parseInt(mes) - 1]}/${ano}`;
  };

  const formatarMesCompleto = (anoMes) => {
    const [ano, mes] = anoMes.split('-');
    const meses = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return `${meses[parseInt(mes) - 1]} de ${ano}`;
  };

  const itensFiltrados = detalhes?.itens?.filter(item => {
    if (!filtroDetalhe) return true;
    const busca = filtroDetalhe.toLowerCase();
    return (
      (item.nome_cliente || '').toLowerCase().includes(busca) ||
      (item.numero_uc || '').toLowerCase().includes(busca) ||
      (item.numero_proposta || '').toLowerCase().includes(busca) ||
      (item.status_troca || '').toLowerCase().includes(busca) ||
      (item.ug_nome || '').toLowerCase().includes(busca) ||
      (item.consultor || '').toLowerCase().includes(busca)
    );
  }) || [];

  // View: Detalhes de um mês
  if (detalhes && mesSelecionado) {
    const resumo = detalhes.resumo;
    return (
      <div className="page-container">
        <div className="container">
          <Header title="Controle" />
          <Navigation />

          <div className="historico-header">
            <button onClick={voltarParaLista} className="btn btn-secondary">
              <ArrowLeft size={16} />
              Voltar
            </button>
            <h2 className="historico-titulo">
              <Calendar size={20} />
              {formatarMesCompleto(mesSelecionado)}
            </h2>
            <button onClick={() => exportarMes(mesSelecionado)} className="btn btn-primary" style={{ color: 'white' }}>
              <Download size={16} />
              Exportar CSV
            </button>
          </div>

          {/* Resumo do mês */}
          <section className="quick-stats">
            <div className="stat-card">
              <div className="stat-icon"><Database size={24} style={{ color: '#f0f0f0', opacity: 0.8 }} /></div>
              <div className="stat-content">
                <span className="stat-label">Total</span>
                <span className="stat-value">{resumo.total_associados}</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon"><TrendingUp size={24} style={{ color: '#4ade80', opacity: 0.8 }} /></div>
              <div className="stat-content">
                <span className="stat-label">Novos</span>
                <span className="stat-value" style={{ color: '#4ade80' }}>+{resumo.novos_no_mes}</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon"><TrendingDown size={24} style={{ color: '#f87171', opacity: 0.8 }} /></div>
              <div className="stat-content">
                <span className="stat-label">Saídas</span>
                <span className="stat-value" style={{ color: '#f87171' }}>-{resumo.saidas_no_mes}</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon"><Clock size={24} style={{ color: '#f0f0f0', opacity: 0.8 }} /></div>
              <div className="stat-content">
                <div className="controle-status-resumo">
                  <div className="controle-status-item">
                    <span className="controle-status-badge controle-status-esteira">{resumo.total_esteira}</span>
                    <small>Esteira</small>
                  </div>
                  <div className="controle-status-item">
                    <span className="controle-status-badge controle-status-em-andamento">{resumo.total_em_andamento}</span>
                    <small>Em Andamento</small>
                  </div>
                  <div className="controle-status-item">
                    <span className="controle-status-badge controle-status-associado">{resumo.total_associado}</span>
                    <small>Associado</small>
                  </div>
                  <div className="controle-status-item">
                    <span className="controle-status-badge controle-status-saindo">{resumo.total_saindo}</span>
                    <small>Saindo</small>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Filtro */}
          <section className="filters-section">
            <div className="filters-container">
              <div className="filters-grid-with-calibragem">
                <div className="filter-group filter-busca">
                  <label>Buscar:</label>
                  <input
                    type="text"
                    placeholder="Cliente, UC, proposta, consultor..."
                    value={filtroDetalhe}
                    onChange={(e) => setFiltroDetalhe(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Tabela de associados do mês */}
          <section className="table-section">
            <div className="table-header">
              <h2>
                Associados em {formatarMesCompleto(mesSelecionado)}
                <span className="table-count">{itensFiltrados.length}</span>
              </h2>
            </div>
            <div className="table-container">
              {loadingDetalhes ? (
                <div className="loading-container">
                  <div className="loading-spinner"></div>
                  <p>Carregando detalhes...</p>
                </div>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Proposta</th>
                      <th>Cliente</th>
                      <th>UC</th>
                      <th>Consultor</th>
                      <th>UG</th>
                      <th>Consumo (kWh)</th>
                      <th>Calibrado (kWh)</th>
                      <th>Status</th>
                      <th>Data Entrada</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itensFiltrados.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <span className="proposta-numero">{item.numero_proposta || '-'}</span>
                        </td>
                        <td>
                          <div className="cliente-info">
                            <span className="nome-cliente">{item.nome_cliente || '-'}</span>
                            {item.apelido_uc && (
                              <small className="apelido-uc">{item.apelido_uc}</small>
                            )}
                          </div>
                        </td>
                        <td><span className="uc-numero">{item.numero_uc || '-'}</span></td>
                        <td><span className="consultor-nome">{item.consultor || '-'}</span></td>
                        <td>{item.ug_nome || <span style={{ color: '#666' }}>Sem UG</span>}</td>
                        <td className="text-right">{item.consumo_medio ? Number(item.consumo_medio).toLocaleString('pt-BR') : '-'}</td>
                        <td className="text-right">{item.consumo_calibrado ? Number(item.consumo_calibrado).toLocaleString('pt-BR') : '-'}</td>
                        <td>
                          <span className={`controle-status-badge controle-status-${(item.status_troca || '').toLowerCase().replace(/\s+/g, '-')}`}>
                            {item.status_troca}
                          </span>
                        </td>
                        <td>
                          {item.data_assinatura
                            ? new Date(item.data_assinatura).toLocaleDateString('pt-BR')
                            : item.data_entrada_controle
                              ? new Date(item.data_entrada_controle).toLocaleDateString('pt-BR')
                              : '-'
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>
        </div>
      </div>
    );
  }

  // View: Lista de meses
  return (
    <div className="page-container">
      <div className="container">
        <Header title="Controle" />
        <Navigation />

        <div className="historico-header">
          <h2 className="historico-titulo">
            <Calendar size={20} />
            Histórico Mensal de Associados
          </h2>
          <div className="historico-actions">
            {isAdminOrAnalista && (
              <>
                <button
                  onClick={gerarMesAnterior}
                  className="btn btn-secondary"
                  disabled={gerando}
                >
                  <RefreshCw size={16} className={gerando ? 'spin' : ''} />
                  Gerar Mês Anterior
                </button>
                <button
                  onClick={gerarRetroativo}
                  className="btn btn-primary"
                  disabled={gerando}
                  style={{ color: 'white' }}
                >
                  {gerando ? <Loader size={16} className="spin" /> : <Database size={16} />}
                  {gerando ? 'Gerando...' : 'Gerar Retroativo'}
                </button>
              </>
            )}
          </div>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Carregando histórico...</p>
          </div>
        ) : resumos.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon"><Calendar size={48} /></span>
            <h3>Nenhum histórico gerado</h3>
            <p>Clique em "Gerar Retroativo" para criar os snapshots de todos os meses.</p>
          </div>
        ) : (
          <div className="historico-grid">
            {resumos.map((resumo) => (
              <div key={resumo.id} className="historico-card">
                <div className="historico-card-header">
                  <h3>{formatarMes(resumo.ano_mes)}</h3>
                  <span className="historico-total">{resumo.total_associados} UCs</span>
                </div>

                <div className="historico-card-stats">
                  <div className="historico-stat">
                    <TrendingUp size={14} style={{ color: '#4ade80' }} />
                    <span style={{ color: '#4ade80' }}>+{resumo.novos_no_mes}</span>
                    <small>novos</small>
                  </div>
                  <div className="historico-stat">
                    <TrendingDown size={14} style={{ color: '#f87171' }} />
                    <span style={{ color: '#f87171' }}>-{resumo.saidas_no_mes}</span>
                    <small>saídas</small>
                  </div>
                </div>

                <div className="historico-card-status">
                  <div className="historico-status-row">
                    <span className="controle-status-badge controle-status-esteira">{resumo.total_esteira}</span>
                    <small>Esteira</small>
                  </div>
                  <div className="historico-status-row">
                    <span className="controle-status-badge controle-status-em-andamento">{resumo.total_em_andamento}</span>
                    <small>Andamento</small>
                  </div>
                  <div className="historico-status-row">
                    <span className="controle-status-badge controle-status-associado">{resumo.total_associado}</span>
                    <small>Associado</small>
                  </div>
                  <div className="historico-status-row">
                    <span className="controle-status-badge controle-status-saindo">{resumo.total_saindo}</span>
                    <small>Saindo</small>
                  </div>
                </div>

                <div className="historico-card-ug">
                  <div>
                    <CheckCircle size={12} style={{ color: '#4ade80' }} />
                    <span>{resumo.total_com_ug} com UG</span>
                  </div>
                  <div>
                    <AlertTriangle size={12} style={{ color: '#fbbf24' }} />
                    <span>{resumo.total_sem_ug} sem UG</span>
                  </div>
                </div>

                <div className="historico-card-actions">
                  <button
                    onClick={() => verDetalhes(resumo.ano_mes)}
                    className="btn btn-secondary btn-sm"
                  >
                    <Eye size={14} />
                    Detalhes
                  </button>
                  <button
                    onClick={() => exportarMes(resumo.ano_mes)}
                    className="btn btn-primary btn-sm"
                    style={{ color: 'white' }}
                  >
                    <Download size={14} />
                    CSV
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoricoMensalPage;
