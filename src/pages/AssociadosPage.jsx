// src/pages/AssociadosPage.jsx - Página de Gestão de Associados
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import '../styles/common/index.css';
import Header from '../components/common/Header';
import Navigation from '../components/common/Navigation';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/apiService';
import {
  Users,
  Search,
  X,
  Save,
  User,
  Phone,
  Mail,
  FileText,
  RefreshCw,
  Edit,
  Home,
  Database,
  Zap,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import './AssociadosPage.css';
import './CommonModalsPagesDark.css';
import '../components/common/CommonModal.css';

const AssociadosPage = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();

  // Verificar permissão
  const isAdminOrAnalista = user?.role === 'admin' || user?.role === 'analista';

  // Estados principais
  const [associados, setAssociados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filtro, setFiltro] = useState('');

  // Paginação
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const porPagina = 50;

  // Modal de detalhes
  const [modalDetalhes, setModalDetalhes] = useState({ show: false, associado: null });

  // Carregar associados
  const carregarAssociados = useCallback(async (pagina = 1, busca = '') => {
    if (!isAdminOrAnalista) return;

    try {
      setLoading(true);

      let url = `/associados?per_page=${porPagina}&page=${pagina}`;
      if (busca) {
        url += `&nome=${encodeURIComponent(busca)}`;
      }

      const response = await apiService.request(url);

      if (response.success) {
        setAssociados(response.data || []);
        if (response.meta) {
          setPaginaAtual(response.meta.current_page);
          setTotalPaginas(response.meta.last_page);
          setTotalRegistros(response.meta.total);
        }
      } else {
        setAssociados([]);
        showNotification('Erro ao carregar associados', 'error');
      }
    } catch (error) {
      console.error('Erro ao carregar associados:', error);
      setAssociados([]);
      showNotification('Erro ao carregar dados: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [isAdminOrAnalista, showNotification]);

  // Carregar ao montar
  useEffect(() => {
    carregarAssociados();
  }, [carregarAssociados]);

  // Atualizar lista
  const handleRefresh = async () => {
    setRefreshing(true);
    await carregarAssociados(paginaAtual, filtro);
    setRefreshing(false);
    showNotification('Lista atualizada!', 'success');
  };

  // Buscar com debounce
  const handleBusca = useCallback((valor) => {
    setFiltro(valor);
    setPaginaAtual(1);

    // Debounce de 500ms
    const timeoutId = setTimeout(() => {
      carregarAssociados(1, valor);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [carregarAssociados]);

  // Paginação
  const irParaPagina = (pagina) => {
    if (pagina >= 1 && pagina <= totalPaginas) {
      setPaginaAtual(pagina);
      carregarAssociados(pagina, filtro);
    }
  };

  // Abrir modal de detalhes
  const abrirDetalhes = async (associado) => {
    try {
      setLoading(true);

      // Buscar detalhes completos do associado incluindo UCs
      const response = await apiService.request(`/associados/${associado.id}`);

      if (response.success) {
        setModalDetalhes({ show: true, associado: response.data });
      } else {
        showNotification('Erro ao carregar detalhes do associado', 'error');
      }
    } catch (error) {
      console.error('Erro ao carregar detalhes:', error);
      showNotification('Erro ao carregar detalhes: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fechar modal
  const fecharModal = () => {
    setModalDetalhes({ show: false, associado: null });
  };

  // Salvar alterações do associado
  const salvarAssociado = async (dadosAtualizados) => {
    try {
      const response = await apiService.request(`/associados/${dadosAtualizados.id}`, {
        method: 'PUT',
        body: JSON.stringify(dadosAtualizados)
      });

      if (response.success) {
        showNotification('Associado atualizado com sucesso!', 'success');
        fecharModal();
        carregarAssociados(paginaAtual, filtro);
      } else {
        showNotification(response.message || 'Erro ao atualizar associado', 'error');
      }
    } catch (error) {
      console.error('Erro ao salvar:', error);
      showNotification('Erro ao salvar: ' + error.message, 'error');
    }
  };

  // Se não tem permissão
  if (!isAdminOrAnalista) {
    return (
      <div className="main-container">
        <Header />
        <Navigation />
        <div className="content-area">
          <div className="access-denied">
            <Users size={48} />
            <h2>Acesso Restrito</h2>
            <p>Apenas administradores e analistas podem acessar esta página.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-container">
      <Header />
      <Navigation />
      <div className="content-area">
        <section className="associados-section">
          {/* Header da página */}
          <div className="section-header">
            <div className="header-title">
              <Users size={24} />
              <h2>Gestão de Associados</h2>
              <span className="badge-count">{totalRegistros}</span>
            </div>
            <div className="header-actions">
              <button
                className="btn btn-secondary"
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw size={16} className={refreshing ? 'spinning' : ''} />
                Atualizar
              </button>
            </div>
          </div>

          {/* Barra de busca */}
          <div className="filtros-container">
            <div className="search-box">
              <Search size={18} />
              <input
                type="text"
                placeholder="Buscar por nome, CPF/CNPJ ou email..."
                value={filtro}
                onChange={(e) => handleBusca(e.target.value)}
              />
              {filtro && (
                <button className="clear-search" onClick={() => handleBusca('')}>
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Tabela de associados */}
          <div className="table-container">
            {loading ? (
              <div className="loading-state">
                <RefreshCw size={32} className="spinning" />
                <p>Carregando associados...</p>
              </div>
            ) : associados.length === 0 ? (
              <div className="empty-state">
                <Users size={48} />
                <p>Nenhum associado encontrado</p>
              </div>
            ) : (
              <>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Nome</th>
                      <th>CPF/CNPJ</th>
                      <th>WhatsApp</th>
                      <th>Email</th>
                      <th>UCs</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {associados.map((associado) => (
                      <tr key={associado.id}>
                        <td className="nome-cell">
                          <User size={14} />
                          <span>{associado.nome}</span>
                        </td>
                        <td>{associado.cpf_cnpj || '-'}</td>
                        <td>{associado.whatsapp || '-'}</td>
                        <td className="email-cell">{associado.email || '-'}</td>
                        <td className="ucs-count">
                          <span className="badge">
                            {associado.unidades_consumidoras?.length || associado.controles_count || 0}
                          </span>
                        </td>
                        <td className="actions-cell">
                          <button
                            className="btn-action btn-edit"
                            onClick={() => abrirDetalhes(associado)}
                            title="Ver detalhes"
                          >
                            <Edit size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Paginação */}
                <div className="pagination-container">
                  <div className="pagination-info">
                    Mostrando {((paginaAtual - 1) * porPagina) + 1} - {Math.min(paginaAtual * porPagina, totalRegistros)} de {totalRegistros}
                  </div>
                  <div className="pagination-controls">
                    <button
                      className="btn-pagination"
                      onClick={() => irParaPagina(paginaAtual - 1)}
                      disabled={paginaAtual <= 1}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="pagination-current">
                      Página {paginaAtual} de {totalPaginas}
                    </span>
                    <button
                      className="btn-pagination"
                      onClick={() => irParaPagina(paginaAtual + 1)}
                      disabled={paginaAtual >= totalPaginas}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </section>

        {/* Modal de Detalhes do Associado */}
        {modalDetalhes.show && (
          <ModalAssociadoDetalhes
            associado={modalDetalhes.associado}
            onSave={salvarAssociado}
            onClose={fecharModal}
          />
        )}
      </div>
    </div>
  );
};

// Modal de Detalhes do Associado
const ModalAssociadoDetalhes = ({ associado, onSave, onClose }) => {
  const { showNotification } = useNotification();
  const [abaAtiva, setAbaAtiva] = useState('dados'); // 'dados' ou 'ucs'
  const [salvando, setSalvando] = useState(false);
  const [formData, setFormData] = useState({
    id: associado?.id || '',
    nome: associado?.nome || '',
    cpf_cnpj: associado?.cpf_cnpj || '',
    whatsapp: associado?.whatsapp || '',
    email: associado?.email || '',
    endereco: associado?.endereco || '',
    bairro: associado?.bairro || '',
    cidade: associado?.cidade || '',
    estado: associado?.estado || '',
    cep: associado?.cep || ''
  });

  // UCs vinculadas (via controles ou direto)
  const ucsVinculadas = useMemo(() => {
    const ucs = [];

    // UCs via controle_clube
    if (associado?.controles) {
      associado.controles.forEach(controle => {
        if (controle.unidade_consumidora) {
          ucs.push({
            ...controle.unidade_consumidora,
            via: 'controle',
            controle_id: controle.id,
            status_troca: controle.status_troca
          });
        }
      });
    }

    // UCs diretas
    if (associado?.unidades_consumidoras) {
      associado.unidades_consumidoras.forEach(uc => {
        // Evitar duplicatas
        if (!ucs.find(u => u.id === uc.id)) {
          ucs.push({
            ...uc,
            via: 'direto'
          });
        }
      });
    }

    return ucs;
  }, [associado]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.nome || !formData.cpf_cnpj) {
      showNotification('Nome e CPF/CNPJ são obrigatórios', 'warning');
      return;
    }

    setSalvando(true);
    try {
      await onSave(formData);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="common-modal-overlay" onClick={onClose}>
      <div className="common-modal modal-associado-detalhes" onClick={(e) => e.stopPropagation()}>
        <div className="common-modal-header">
          <h3 className="modal-title-with-icon">
            <User size={20} />
            Detalhes do Associado
          </h3>
          <button onClick={onClose} className="common-close-btn">
            <X size={18} />
          </button>
        </div>

        {/* Sistema de Abas */}
        <div className="modal-tabs">
          <button
            type="button"
            className={`modal-tab ${abaAtiva === 'dados' ? 'active' : ''}`}
            onClick={() => setAbaAtiva('dados')}
          >
            <User size={16} />
            Dados do Associado
          </button>
          <button
            type="button"
            className={`modal-tab ${abaAtiva === 'ucs' ? 'active' : ''}`}
            onClick={() => setAbaAtiva('ucs')}
          >
            <Home size={16} />
            UCs Vinculadas
            {ucsVinculadas.length > 0 && (
              <span className="tab-badge">{ucsVinculadas.length}</span>
            )}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="common-modal-content">
          {/* ABA 1: Dados do Associado */}
          {abaAtiva === 'dados' && (
            <>
              <div className="modal-section">
                <h4 className="section-title-with-icon">
                  <User size={16} />
                  Informações Pessoais
                </h4>

                <div className="form-group">
                  <label>Nome Completo *</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>CPF/CNPJ *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.cpf_cnpj}
                      onChange={(e) => setFormData({ ...formData, cpf_cnpj: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>WhatsApp</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.whatsapp}
                      onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    className="form-input"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="email@exemplo.com"
                  />
                </div>
              </div>

              <div className="modal-section">
                <h4 className="section-title-with-icon">
                  <Home size={16} />
                  Endereço
                </h4>

                <div className="form-group">
                  <label>Endereço Completo</label>
                  <input
                    type="text"
                    className="form-input"
                    value={formData.endereco}
                    onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                    placeholder="Rua, número, complemento"
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Bairro</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.bairro}
                      onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Cidade</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.cidade}
                      onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Estado</label>
                    <select
                      className="form-input"
                      value={formData.estado}
                      onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                    >
                      <option value="">Selecione...</option>
                      <option value="AC">AC</option>
                      <option value="AL">AL</option>
                      <option value="AP">AP</option>
                      <option value="AM">AM</option>
                      <option value="BA">BA</option>
                      <option value="CE">CE</option>
                      <option value="DF">DF</option>
                      <option value="ES">ES</option>
                      <option value="GO">GO</option>
                      <option value="MA">MA</option>
                      <option value="MT">MT</option>
                      <option value="MS">MS</option>
                      <option value="MG">MG</option>
                      <option value="PA">PA</option>
                      <option value="PB">PB</option>
                      <option value="PR">PR</option>
                      <option value="PE">PE</option>
                      <option value="PI">PI</option>
                      <option value="RJ">RJ</option>
                      <option value="RN">RN</option>
                      <option value="RS">RS</option>
                      <option value="RO">RO</option>
                      <option value="RR">RR</option>
                      <option value="SC">SC</option>
                      <option value="SP">SP</option>
                      <option value="SE">SE</option>
                      <option value="TO">TO</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>CEP</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.cep}
                      onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                      placeholder="00000-000"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ABA 2: UCs Vinculadas */}
          {abaAtiva === 'ucs' && (
            <div className="modal-section">
              <h4 className="section-title-with-icon">
                <Zap size={16} />
                Unidades Consumidoras Vinculadas
              </h4>

              {ucsVinculadas.length === 0 ? (
                <div className="empty-ucs">
                  <Database size={32} />
                  <p>Nenhuma UC vinculada a este associado</p>
                </div>
              ) : (
                <div className="ucs-lista">
                  {ucsVinculadas.map((uc, index) => (
                    <div key={uc.id || index} className="uc-card">
                      <div className="uc-header">
                        <span className="uc-numero">
                          <Database size={14} />
                          {uc.numero_unidade}
                        </span>
                        {uc.status_troca && (
                          <span className={`status-badge status-${uc.status_troca?.toLowerCase().replace(' ', '-')}`}>
                            {uc.status_troca}
                          </span>
                        )}
                      </div>
                      <div className="uc-info">
                        {uc.apelido && (
                          <p><strong>Apelido:</strong> {uc.apelido}</p>
                        )}
                        {uc.consumo_medio && (
                          <p><strong>Consumo Médio:</strong> {uc.consumo_medio} kWh</p>
                        )}
                        {uc.endereco_completo && (
                          <p><strong>Endereço:</strong> {uc.endereco_completo}</p>
                        )}
                        {uc.cidade && uc.estado && (
                          <p><strong>Cidade:</strong> {uc.cidade}/{uc.estado}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Footer com botões */}
          <div className="common-modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              <X size={16} />
              Cancelar
            </button>
            {abaAtiva === 'dados' && (
              <button
                type="submit"
                className="btn btn-primary"
                disabled={salvando}
              >
                {salvando ? (
                  <>
                    <RefreshCw size={16} className="spinning" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Salvar Alterações
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssociadosPage;
