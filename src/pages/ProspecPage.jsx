// src/pages/ProspecPage.jsx - Com modal de visualização para todos os perfis
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/common/Header';
import Navigation from '../components/common/Navigation';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import storageService from '../services/storageService';
import './ProspecPage.css';

const ProspecPage = () => {
  const navigate = useNavigate();
  const { user, getMyTeam, getConsultorName } = useAuth();
  const [dados, setDados] = useState([]);
  const [dadosFiltrados, setDadosFiltrados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalEdicao, setModalEdicao] = useState({ show: false, item: null, index: -1 });
  const [modalVisualizacao, setModalVisualizacao] = useState({ show: false, item: null });
  
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
      
      let dadosFiltradosPorEquipe = [];

      if (user?.role === 'admin') {
        // Admin vê todos os dados, mas com consultor responsável
        dadosFiltradosPorEquipe = dadosProspec.map(item => ({
          ...item,
          consultor: getConsultorName(item.consultor) // Mostrar consultor responsável
        }));
      } else {
        // Outros usuários veem apenas dados da sua equipe
        const teamNames = getMyTeam().map(member => member.name);
        dadosFiltradosPorEquipe = dadosProspec.filter(item => 
          teamNames.includes(item.consultor)
        );
      }
      
      // Garantir IDs únicos para cada item
      const dadosComIds = dadosFiltradosPorEquipe.map((item, index) => ({
        ...item,
        id: item.id || `${item.numeroProposta}-${item.numeroUC}-${index}-${Date.now()}`
      }));
      
      setDados(dadosComIds);
      setDadosFiltrados(dadosComIds);
      
      if (dadosComIds.length === 0) {
        showNotification('Nenhuma proposta encontrada para sua equipe.', 'info');
      } else {
        showNotification(`${dadosComIds.length} propostas carregadas!`, 'success');
      }
      
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
      showNotification('Erro ao carregar dados: ' + error.message, 'error');
      setDados([]);
      setDadosFiltrados([]);
    } finally {
      setLoading(false);
    }
  }, [showNotification, user, getMyTeam, getConsultorName]);

  const filtrarDados = useCallback(() => {
    let dadosFiltrados = dados;

    if (filtros.consultor) {
      dadosFiltrados = dadosFiltrados.filter(item =>
        item.consultor?.toLowerCase().includes(filtros.consultor.toLowerCase())
      );
    }

    if (filtros.status) {
      dadosFiltrados = dadosFiltrados.filter(item => item.status === filtros.status);
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

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

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

  const editarItem = (index) => {
    if (user?.role !== 'admin') return;
    
    const item = dadosFiltrados[index];
    if (!item) return;
    setModalEdicao({ show: true, item, index });
  };

  const visualizarItem = (index) => {
    const item = dadosFiltrados[index];
    if (!item) return;
    setModalVisualizacao({ show: true, item });
  };

  const salvarEdicao = async (dadosAtualizados) => {
    try {
      const { item } = modalEdicao;
      
      const indexReal = dados.findIndex(p => p.id === item.id);
      
      if (indexReal === -1) {
        showNotification('Item não encontrado para edição', 'error');
        return;
      }

      await storageService.atualizarProspec(indexReal, dadosAtualizados);
      await carregarDados();
      
      setModalEdicao({ show: false, item: null, index: -1 });
      showNotification('Proposta atualizada com sucesso!', 'success');
      
    } catch (error) {
      console.error('❌ Erro ao salvar edição:', error);
      showNotification('Erro ao salvar: ' + error.message, 'error');
    }
  };

  const removerItem = async (index) => {
    if (user?.role !== 'admin') return;

    const item = dadosFiltrados[index];
    const confirmacao = window.confirm(
      `Tem certeza que deseja remover a proposta de ${item.nomeCliente} (${item.apelido || item.numeroUC})?`
    );
    
    if (!confirmacao) {
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

  const criarNovaProposta = () => {
    navigate('/nova-proposta');
  };

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

  // Verificar se é admin para mostrar ações de admin
  const isAdmin = user?.role === 'admin';

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
            <span className="stat-label">Valor Médio</span>
            <span className="stat-value">
              {dadosFiltrados.length > 0 
                ? Math.round(dadosFiltrados.reduce((acc, item) => acc + (parseFloat(item.media) || 0), 0) / dadosFiltrados.length).toLocaleString('pt-BR')
                : '0'} kWh
            </span>
          </div>
        </section>

        {/* Filtros e Controles */}
        <section className="filters-section">
          <div className="filters-container">
            <div className="filters-grid">
              <div className="filter-group">
                <label>Buscar</label>
                <input
                  type="text"
                  placeholder="🔍 Cliente, proposta, UC..."
                  value={filtros.busca}
                  onChange={(e) => setFiltros({...filtros, busca: e.target.value})}
                />
              </div>
              
              <div className="filter-group">
                <label>Consultor</label>
                <select
                  value={filtros.consultor}
                  onChange={(e) => setFiltros({...filtros, consultor: e.target.value})}
                >
                  <option value="">Todos</option>
                  {consultoresUnicos.map(consultor => (
                    <option key={consultor} value={consultor}>{consultor}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Status</label>
                <select
                  value={filtros.status}
                  onChange={(e) => setFiltros({...filtros, status: e.target.value})}
                >
                  <option value="">Todos</option>
                  <option value="Aguardando">Aguardando</option>
                  <option value="Fechado">Fechadas</option>
                </select>
              </div>
            </div>

            <div className="actions-container">
              <button onClick={limparFiltros} className="btn btn-secondary">
                Limpar Filtros
              </button>
              <button onClick={criarNovaProposta} className="btn btn-success">
                ➕ Nova Proposta
              </button>
              <button onClick={exportarDados} className="btn btn-primary">
                📊 Exportar CSV
              </button>
            </div>
          </div>
        </section>

        {/* Tabela */}
        <section className="table-section">
          <div className="table-container">
            <div className="table-header">
              <h2>Lista de Propostas</h2>
              <span className="table-count">{dadosFiltrados.length} registros</span>
            </div>

            {loading ? (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Carregando propostas...</p>
              </div>
            ) : dadosFiltrados.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <h3>Nenhuma proposta encontrada</h3>
                <p>Não há propostas que correspondam aos filtros aplicados.</p>
                <button onClick={criarNovaProposta} className="btn btn-primary">
                  ➕ Criar Nova Proposta
                </button>
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Nº Proposta</th>
                      <th>Data</th>
                      <th>Apelido</th>
                      <th>UC</th>
                      <th>Média</th>
                      <th>Status</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dadosFiltrados.map((item, index) => (
                      <tr key={item.id}>
                        <td>{item.nomeCliente || '-'}</td>
                        <td>
                          <span className="numero-proposta">
                            {item.numeroProposta || '-'}
                          </span>
                        </td>
                        <td>
                          <span className="data">
                            {item.data ? (() => {
                              try {
                                const dataObj = new Date(item.data);
                                return dataObj.toLocaleDateString('pt-BR');
                              } catch {
                                return item.data;
                              }
                            })() : '-'}
                          </span>
                        </td>
                        <td>{item.apelido || '-'}</td>
                        <td>{item.numeroUC || '-'}</td>
                        <td>
                          <span className="valor">
                            {item.media ? parseFloat(item.media).toLocaleString('pt-BR') : '0'} kWh
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge ${item.status === 'Fechado' ? 'status-fechado' : 'status-aguardando'}`}>
                            {item.status || 'Aguardando'}
                          </span>
                        </td>
                        <td>
                          <div className="table-actions">
                            {/* Todos os perfis podem ver detalhes */}
                            <button
                              onClick={() => visualizarItem(index)}
                              className="btn-icon view"
                              title="Visualizar detalhes"
                            >
                              👁️
                            </button>
                            {/* Só admin pode editar e remover */}
                            {isAdmin && (
                              <>
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
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Modal de Visualização - Para todos os perfis */}
        {modalVisualizacao.show && (
          <ModalVisualizacao 
            item={modalVisualizacao.item}
            onClose={() => setModalVisualizacao({ show: false, item: null })}
          />
        )}

        {/* Modal de Edição - Apenas para admin */}
        {modalEdicao.show && isAdmin && (
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

// Componente Modal de Visualização - Disponível para todos os perfis
const ModalVisualizacao = ({ item, onClose }) => {
  const formatarPercentual = (valor) => {
    if (!valor) return '0.0%';
    return `${(parseFloat(valor) * 100).toFixed(1)}%`;
  };

  const formatarTelefone = (telefone) => {
    if (!telefone) return '-';
    // Formatação básica para telefone brasileiro
    const nums = telefone.replace(/\D/g, '');
    if (nums.length === 11) {
      return `(${nums.substr(0,2)}) ${nums.substr(2,5)}-${nums.substr(7,4)}`;
    }
    return telefone;
  };

  const formatarData = (data) => {
    if (!data) return '-';
    try {
      // Se a data vier no formato ISO (2025-07-30T03:00:00.000Z), converter
      const dataObj = new Date(data);
      return dataObj.toLocaleDateString('pt-BR');
    } catch (error) {
      return data; // Retorna o valor original se não conseguir converter
    }
  };

  // Lista de benefícios padrão com seus textos originais
  const beneficiosPadrao = [
    "A Aupus Energia irá oferecer uma economia na energia elétrica, sem impostos",
    "A Aupus Energia irá oferecer uma economia no valor referente à bandeira tarifária, sem impostos", 
    "Isenção de taxa de adesão",
    "Não há cobrança de taxa de cancelamento",
    "Não há fidelidade contratual",
    "O cliente pode cancelar a qualquer momento",
    "Atendimento personalizado",
    "Suporte técnico especializado",
    "Economia imediata na primeira fatura"
  ];

  // Obter benefícios reais marcados na proposta
  const obterBeneficiosReais = () => {
    const beneficiosAplicaveis = [];
    
    // Verificar se temos benefícios salvos na proposta
    if (item.beneficios && typeof item.beneficios === 'object') {
      // Se os benefícios estão salvos como objeto
      for (let i = 1; i <= 9; i++) {
        if (item.beneficios[`beneficio${i}`]) {
          let textoBeneficio = beneficiosPadrao[i - 1];
          
          // Personalizar benefícios 1 e 2 com os valores reais
          if (i === 1 && item.descontoTarifa) {
            const desconto = (parseFloat(item.descontoTarifa) * 100).toFixed(1);
            textoBeneficio = `A Aupus Energia irá oferecer uma economia de até ${desconto}% no valor da energia elétrica, sem impostos`;
          }
          if (i === 2 && item.descontoBandeira) {
            const desconto = (parseFloat(item.descontoBandeira) * 100).toFixed(1);
            textoBeneficio = `A Aupus Energia irá oferecer uma economia de até ${desconto}% no valor referente à bandeira tarifária, sem impostos`;
          }
          
          beneficiosAplicaveis.push(textoBeneficio);
        }
      }
    } else {
      // Fallback: se não tem benefícios salvos, usar baseado nos descontos
      if (item.descontoTarifa && parseFloat(item.descontoTarifa) > 0) {
        const desconto = (parseFloat(item.descontoTarifa) * 100).toFixed(1);
        beneficiosAplicaveis.push(`A Aupus Energia irá oferecer uma economia de até ${desconto}% no valor da energia elétrica, sem impostos`);
      }
      
      if (item.descontoBandeira && parseFloat(item.descontoBandeira) > 0) {
        const desconto = (parseFloat(item.descontoBandeira) * 100).toFixed(1);
        beneficiosAplicaveis.push(`A Aupus Energia irá oferecer uma economia de até ${desconto}% no valor referente à bandeira tarifária, sem impostos`);
      }
      
      // Adicionar benefícios padrão comuns
      beneficiosAplicaveis.push("Isenção de taxa de adesão");
      beneficiosAplicaveis.push("Não há cobrança de taxa de cancelamento");
      beneficiosAplicaveis.push("Não há fidelidade contratual");
      beneficiosAplicaveis.push("O cliente pode cancelar a qualquer momento");
    }

    return beneficiosAplicaveis;
  };

  const beneficiosReais = obterBeneficiosReais();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>👁️ Detalhes da Proposta</h3>
          <button onClick={onClose} className="btn btn-close">✕</button>
        </div>
        
        <div className="modal-body">
          <div className="proposta-details">
            {/* Informações principais - REORGANIZADA */}
            <div className="details-section">
              <h4>📋 Informações Principais</h4>
              <div className="details-grid">
                <div className="detail-item">
                  <label>Cliente:</label>
                  <span>{item.nomeCliente || '-'}</span>
                </div>
                <div className="detail-item">
                  <label>Nº Proposta:</label>
                  <span className="numero-proposta">{item.numeroProposta || '-'}</span>
                </div>
                <div className="detail-item">
                  <label>Data:</label>
                  <span className="data">{formatarData(item.data)}</span>
                </div>
                <div className="detail-item">
                  <label>Status:</label>
                  <span className={`status-badge ${item.status === 'Fechado' ? 'status-fechado' : 'status-aguardando'}`}>
                    {item.status || 'Aguardando'}
                  </span>
                </div>
                <div className="detail-item">
                  <label>Telefone:</label>
                  <span className="telefone">{formatarTelefone(item.telefone)}</span>
                </div>
                <div className="detail-item">
                  <label>Consultor:</label>
                  <span>{item.consultor || '-'}</span>
                </div>
                <div className="detail-item">
                  <label>Recorrência:</label>
                  <span>{item.recorrencia || '-'}</span>
                </div>
              </div>
            </div>

            {/* Informações da UC */}
            <div className="details-section">
              <h4>⚡ Informações da UC</h4>
              <div className="details-grid">
                <div className="detail-item">
                  <label>Apelido:</label>
                  <span>{item.apelido || '-'}</span>
                </div>
                <div className="detail-item">
                  <label>Número UC:</label>
                  <span>{item.numeroUC || '-'}</span>
                </div>
                <div className="detail-item">
                  <label>Ligação:</label>
                  <span>{item.ligacao || '-'}</span>
                </div>
                <div className="detail-item">
                  <label>Média Consumo:</label>
                  <span className="valor">
                    {item.media ? parseFloat(item.media).toLocaleString('pt-BR') : '0'} kWh
                  </span>
                </div>
              </div>
            </div>

            {/* Descontos e benefícios - REORGANIZADA */}
            <div className="details-section">
              <h4>💰 Descontos e Benefícios</h4>
              <div className="details-grid">
                <div className="detail-item">
                  <label>Desconto Tarifa:</label>
                  <span className="desconto-valor">{formatarPercentual(item.descontoTarifa)}</span>
                </div>
                <div className="detail-item">
                  <label>Desconto Bandeira:</label>
                  <span className="desconto-valor">{formatarPercentual(item.descontoBandeira)}</span>
                </div>
              </div>
              
              {/* Lista de benefícios reais */}
              {beneficiosReais.length > 0 && (
                <div className="beneficios-lista">
                  <h5>📝 Benefícios Inclusos:</h5>
                  <ul>
                    {beneficiosReais.map((beneficio, index) => (
                      <li key={index}>{beneficio}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn btn-secondary">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

// Componente Modal de Edição - Apenas para admin
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
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>✏️ Editar Proposta</h3>
          <button onClick={handleClose} className="btn btn-close">✕</button>
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
              <label>Apelido</label>
              <input
                type="text"
                value={dados.apelido || ''}
                onChange={(e) => setDados({...dados, apelido: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>Número UC</label>
              <input
                type="text"
                value={dados.numeroUC || ''}
                onChange={(e) => setDados({...dados, numeroUC: e.target.value})}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Desconto Tarifa (%)</label>
              <input
                type="number"
                step="0.1"
                value={dados.descontoTarifa ? (parseFloat(dados.descontoTarifa) * 100).toFixed(1) : ''}
                onChange={(e) => setDados({...dados, descontoTarifa: parseFloat(e.target.value) / 100 || 0})}
              />
            </div>
            <div className="form-group">
              <label>Desconto Bandeira (%)</label>
              <input
                type="number"
                step="0.1"
                value={dados.descontoBandeira ? (parseFloat(dados.descontoBandeira) * 100).toFixed(1) : ''}
                onChange={(e) => setDados({...dados, descontoBandeira: parseFloat(e.target.value) / 100 || 0})}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Ligação</label>
              <input
                type="text"
                value={dados.ligacao || ''}
                onChange={(e) => setDados({...dados, ligacao: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>Recorrência</label>
              <input
                type="text"
                value={dados.recorrencia || ''}
                onChange={(e) => setDados({...dados, recorrencia: e.target.value})}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Média (kWh)</label>
              <input
                type="number"
                value={dados.media || ''}
                onChange={(e) => setDados({...dados, media: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div className="form-group">
              <label>Telefone</label>
              <input
                type="text"
                value={dados.telefone || ''}
                onChange={(e) => setDados({...dados, telefone: e.target.value})}
              />
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
          </div>

          <div className="modal-footer">
            <button type="submit" className="btn btn-primary">
              Salvar Alterações
            </button>
            <button type="button" onClick={handleClose} className="btn btn-secondary">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProspecPage;