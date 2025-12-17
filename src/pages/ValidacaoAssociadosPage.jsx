// src/pages/ValidacaoAssociadosPage.jsx - Validação de Associados
import React, { useState, useEffect, useCallback } from 'react';
import '../styles/common/index.css';
import Header from '../components/common/Header';
import Navigation from '../components/common/Navigation';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/apiService';
import {
  Users,
  CheckCircle,
  Clock,
  Search,
  X,
  Save,
  User,
  Phone,
  Mail,
  MapPin,
  Home,
  FileText,
  AlertCircle,
  RefreshCw,
  Link as LinkIcon,
  Database,
  Settings
} from 'lucide-react';
import './ValidacaoAssociadosPage.css';
import './CommonModalsPagesDark.css';
import '../components/common/CommonModal.css';

const ValidacaoAssociadosPage = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();

  // Estados principais
  const [pendentes, setPendentes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filtro, setFiltro] = useState('');

  // Estados do Modal
  const [modalValidacao, setModalValidacao] = useState({ show: false, item: null });
  const [formData, setFormData] = useState({});
  const [associadoExistente, setAssociadoExistente] = useState(null);
  const [buscandoCpf, setBuscandoCpf] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [consultores, setConsultores] = useState([]);

  // Verificar se usuário tem permissão
  const isAdminOrAnalista = user?.role === 'admin' || user?.role === 'analista';

  // Carregar pendentes de validação com delay para evitar conflito com Navigation
  const carregarPendentes = useCallback(async (forceRefresh = false) => {
    if (!isAdminOrAnalista) return;

    try {
      setLoading(true);

      // Aguardar um pouco para o Navigation terminar sua chamada primeiro
      if (!forceRefresh) {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      const response = await apiService.request('/associados/pendentes-validacao');

      if (response.success && Array.isArray(response.data)) {
        setPendentes(response.data);
      } else {
        setPendentes([]);
        if (!response.success) {
          showNotification('Erro ao carregar pendentes de validação', 'error');
        }
      }
    } catch (error) {
      console.error('Erro ao carregar pendentes:', error);
      setPendentes([]);
      showNotification('Erro ao carregar dados: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [isAdminOrAnalista, showNotification]);

  // Carregar consultores
  const carregarConsultores = useCallback(async () => {
    try {
      const response = await apiService.request('/usuarios?role=consultor');
      if (response.success && Array.isArray(response.data)) {
        setConsultores(response.data);
      } else {
        setConsultores([]);
      }
    } catch (error) {
      console.error('Erro ao carregar consultores:', error);
      setConsultores([]);
    }
  }, []);

  useEffect(() => {
    carregarPendentes();
    carregarConsultores();
  }, [carregarPendentes, carregarConsultores]);

  // Atualizar lista
  const handleRefresh = async () => {
    setRefreshing(true);
    await carregarPendentes(true); // forceRefresh = true, sem delay
    setRefreshing(false);
    showNotification('Lista atualizada!', 'success');
  };

  // Abrir modal de validação
  const abrirModalValidacao = async (item) => {
    try {
      setLoading(true);
      const response = await apiService.request(`/associados/validar/${item.proposta_id}/${item.uc.numero_unidade}`);

      if (response.success) {
        const dados = response.data;

        setFormData({
          nome: dados.cliente.nome || dados.proposta.nome_cliente || '',
          cpf_cnpj: dados.cliente.cpf_cnpj || '',
          whatsapp: dados.cliente.whatsapp || '',
          email: dados.cliente.email || '',
          endereco: dados.cliente.endereco || '',
          bairro: dados.cliente.bairro || '',
          cidade: dados.cliente.cidade || '',
          estado: dados.cliente.estado || '',
          cep: dados.cliente.cep || '',
          apelido_uc: dados.uc.apelido || `UC ${dados.uc.numero_unidade}`,
          ligacao: dados.uc.ligacao || 'Monofásica',
          consumo_medio: dados.uc.consumo_medio || 0,
          consultor_id: dados.proposta.consultor_id || '',
          desconto_tarifa: dados.proposta.desconto_tarifa || '20%',
          desconto_bandeira: dados.proposta.desconto_bandeira || '20%'
        });

        setAssociadoExistente(dados.associado_existente);
        setModalValidacao({ show: true, item: { ...item, dadosCompletos: dados } });
      } else {
        showNotification('Erro ao carregar dados para validação', 'error');
      }
    } catch (error) {
      console.error('Erro ao abrir modal:', error);
      showNotification('Erro ao carregar dados: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Buscar associado por CPF/CNPJ
  const buscarAssociadoPorCpf = async () => {
    if (!formData.cpf_cnpj || formData.cpf_cnpj.length < 11) {
      showNotification('Digite um CPF/CNPJ válido', 'warning');
      return;
    }

    try {
      setBuscandoCpf(true);
      const response = await apiService.request(`/associados/buscar-cpf-cnpj?cpf_cnpj=${encodeURIComponent(formData.cpf_cnpj)}`);

      if (response.success && response.encontrado) {
        setAssociadoExistente(response.data);
        showNotification(`Associado encontrado: ${response.data.nome}`, 'success');
      } else {
        setAssociadoExistente(null);
        showNotification('Nenhum associado encontrado com este CPF/CNPJ', 'info');
      }
    } catch (error) {
      console.error('Erro ao buscar associado:', error);
      showNotification('Erro ao buscar associado', 'error');
    } finally {
      setBuscandoCpf(false);
    }
  };

  // Vincular a associado existente
  const vincularAssociadoExistente = () => {
    if (associadoExistente) {
      setFormData(prev => ({
        ...prev,
        nome: associadoExistente.nome,
        cpf_cnpj: associadoExistente.cpf_cnpj,
        whatsapp: associadoExistente.whatsapp || prev.whatsapp,
        email: associadoExistente.email || prev.email,
        associado_id: associadoExistente.id
      }));
      showNotification('Dados do associado preenchidos. Confirme a validação.', 'success');
    }
  };

  // Confirmar validação
  const confirmarValidacao = async () => {
    if (!formData.nome || !formData.cpf_cnpj) {
      showNotification('Nome e CPF/CNPJ são obrigatórios', 'warning');
      return;
    }

    try {
      setSalvando(true);
      const item = modalValidacao.item;

      const payload = {
        ...formData,
        associado_id: associadoExistente?.id || null
      };

      const response = await apiService.request(
        `/associados/confirmar/${item.proposta_id}/${item.uc.numero_unidade}`,
        {
          method: 'POST',
          body: JSON.stringify(payload)
        }
      );

      if (response.success) {
        showNotification('Validação concluída com sucesso! Associado, UC e Controle criados.', 'success');
        setModalValidacao({ show: false, item: null });
        setFormData({});
        setAssociadoExistente(null);
        carregarPendentes();
      } else {
        showNotification(response.message || 'Erro ao confirmar validação', 'error');
      }
    } catch (error) {
      console.error('Erro ao confirmar validação:', error);
      showNotification('Erro ao confirmar validação: ' + error.message, 'error');
    } finally {
      setSalvando(false);
    }
  };

  // Fechar modal
  const fecharModal = () => {
    setModalValidacao({ show: false, item: null });
    setFormData({});
    setAssociadoExistente(null);
  };

  // Filtrar pendentes
  const pendentesFiltrados = Array.isArray(pendentes) ? pendentes.filter(item => {
    if (!filtro) return true;
    const busca = filtro.toLowerCase();
    return (
      item.nome_cliente?.toLowerCase().includes(busca) ||
      item.numero_proposta?.toLowerCase().includes(busca) ||
      String(item.uc?.numero_unidade).includes(busca)
    );
  }) : [];

  // Formatar CPF/CNPJ
  const formatarCpfCnpj = (valor) => {
    if (!valor) return '';
    const numeros = valor.replace(/\D/g, '');
    if (numeros.length <= 11) {
      return numeros.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return numeros.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  // Formatar data
  const formatarData = (data) => {
    if (!data) return '-';
    return new Date(data).toLocaleDateString('pt-BR');
  };

  // Se não tem permissão
  if (!isAdminOrAnalista) {
    return (
      <div className="page-container">
        <div className="container">
          <Header title="Validação de Associados" />
          <Navigation />
          <div className="access-denied-container">
            <AlertCircle size={48} />
            <h2>Acesso Restrito</h2>
            <p>Apenas administradores e analistas podem acessar esta página.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="container">
        <Header title="Validação de Associados" />
        <Navigation />

        {/* Estatísticas Rápidas */}
        <section className="quick-stats">
          <div className="stat-card">
            <div className="stat-icon">
              <Database size={24} style={{ color: '#f0f0f0', opacity: 0.8 }} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Total Pendentes</span>
              <span className="stat-value">{pendentes.length}</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <Clock size={24} style={{ color: '#f0f0f0', opacity: 0.8 }} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Aguardando Validação</span>
              <span className="stat-value">{pendentesFiltrados.length}</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-icon">
              <Users size={24} style={{ color: '#f0f0f0', opacity: 0.8 }} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Status</span>
              <span className="stat-value-small">Pendente Validação</span>
            </div>
          </div>
        </section>

        {/* Filtros e Controles */}
        <section className="filters-section">
          <div className="filters-container">
            <div className="filters-grid">
              <div className="filter-group filter-busca">
                <label>Buscar:</label>
                <input
                  type="text"
                  placeholder="Cliente, proposta ou UC..."
                  value={filtro}
                  onChange={(e) => setFiltro(e.target.value)}
                />
              </div>

              <div className="filter-actions">
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
          </div>
        </section>

        {/* Tabela de Pendentes */}
        <section className="table-section">
          {loading ? (
            <div className="loading-container">
              <RefreshCw size={32} className="spinning" />
              <p>Carregando pendentes...</p>
            </div>
          ) : pendentesFiltrados.length === 0 ? (
            <div className="empty-container">
              <CheckCircle size={48} />
              <h3>Nenhuma validação pendente</h3>
              <p>Todas as UCs foram validadas ou não há novas propostas fechadas.</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Proposta</th>
                    <th>Cliente</th>
                    <th>UC</th>
                    <th>Consultor</th>
                    <th>Data</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {pendentesFiltrados.map((item, index) => (
                    <tr key={`${item.proposta_id}-${item.uc?.numero_unidade}-${index}`}>
                      <td>
                        <span className="numero-proposta">{item.numero_proposta}</span>
                      </td>
                      <td>
                        <div className="cliente-info">
                          <span className="nome-cliente">{item.nome_cliente}</span>
                        </div>
                      </td>
                      <td>
                        <div className="uc-info">
                          <span className="numero-uc">{item.uc?.numero_unidade}</span>
                          {item.uc?.apelido && (
                            <small className="uc-apelido">{item.uc.apelido}</small>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="consultor">{item.consultor_nome || '-'}</span>
                      </td>
                      <td>
                        <span className="data">{formatarData(item.created_at)}</span>
                      </td>
                      <td>
                        <div className="acoes-cell">
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => abrirModalValidacao(item)}
                            title="Validar Associado"
                          >
                            <CheckCircle size={14} />
                            Validar
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

      {/* Modal de Validação */}
      {modalValidacao.show && (
        <div className="common-modal-overlay" onClick={fecharModal}>
          <div className="common-modal modal-validacao-associado" onClick={(e) => e.stopPropagation()}>
            <div className="common-modal-header">
              <h3 className="modal-title-with-icon">
                <Users size={20} />
                Validar Associado
              </h3>
              <button className="common-close-btn" onClick={fecharModal}>
                <X size={18} />
              </button>
            </div>

            <div className="common-modal-content">
              {/* Info da Proposta */}
              <div className="modal-section">
                <h4 className="section-title-with-icon">
                  <FileText size={16} />
                  Informações da Proposta
                </h4>
                <div className="info-row-grid">
                  <div className="info-item">
                    <label>Proposta</label>
                    <span>{modalValidacao.item?.numero_proposta}</span>
                  </div>
                  <div className="info-item">
                    <label>UC</label>
                    <span>{modalValidacao.item?.uc?.numero_unidade}</span>
                  </div>
                  <div className="info-item">
                    <label>Desconto Tarifa</label>
                    <div className="input-with-suffix">
                      <input
                        type="text"
                        className="form-input form-input-small"
                        value={(formData.desconto_tarifa || '').replace(/%/g, '')}
                        onChange={(e) => setFormData({ ...formData, desconto_tarifa: e.target.value.replace(/%/g, '') })}
                        placeholder="20"
                      />
                      <span className="input-suffix">%</span>
                    </div>
                  </div>
                  <div className="info-item">
                    <label>Desconto Bandeira</label>
                    <div className="input-with-suffix">
                      <input
                        type="text"
                        className="form-input form-input-small"
                        value={(formData.desconto_bandeira || '').replace(/%/g, '')}
                        onChange={(e) => setFormData({ ...formData, desconto_bandeira: e.target.value.replace(/%/g, '') })}
                        placeholder="20"
                      />
                      <span className="input-suffix">%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Busca de Associado Existente */}
              <div className="modal-section">
                <h4 className="section-title-with-icon">
                  <Search size={16} />
                  Buscar Associado Existente
                </h4>
                <div className="cpf-search-row">
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Digite o CPF/CNPJ para buscar"
                    value={formData.cpf_cnpj || ''}
                    onChange={(e) => setFormData({ ...formData, cpf_cnpj: e.target.value })}
                  />
                  <button
                    className="btn btn-secondary"
                    onClick={buscarAssociadoPorCpf}
                    disabled={buscandoCpf}
                  >
                    {buscandoCpf ? <RefreshCw size={16} className="spinning" /> : <Search size={16} />}
                    Buscar
                  </button>
                </div>

                {associadoExistente && (
                  <div className="associado-encontrado-box">
                    <div className="associado-info-row">
                      <User size={20} />
                      <div className="associado-dados">
                        <strong>{associadoExistente.nome}</strong>
                        <span>{formatarCpfCnpj(associadoExistente.cpf_cnpj)}</span>
                        <span>{associadoExistente.unidadesConsumidoras?.length || 0} UCs vinculadas</span>
                      </div>
                    </div>
                    <button className="btn btn-success btn-sm" onClick={vincularAssociadoExistente}>
                      <LinkIcon size={14} />
                      Vincular a este
                    </button>
                  </div>
                )}
              </div>

              {/* Dados do Cliente */}
              <div className="modal-section">
                <h4 className="section-title-with-icon">
                  <User size={16} />
                  Dados do Cliente / Associado
                </h4>
                <div className="form-row">
                  <div className="form-group full-width">
                    <label>Nome do Cliente *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.nome || ''}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      placeholder="Nome completo"
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>CPF/CNPJ *</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.cpf_cnpj || ''}
                      onChange={(e) => setFormData({ ...formData, cpf_cnpj: e.target.value })}
                      placeholder="000.000.000-00"
                    />
                  </div>
                  <div className="form-group">
                    <label>WhatsApp</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.whatsapp || ''}
                      onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                      placeholder="(00) 00000-0000"
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group full-width">
                    <label>Email</label>
                    <input
                      type="email"
                      className="form-input"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="email@exemplo.com"
                    />
                  </div>
                </div>
              </div>

              {/* Dados do Endereço */}
              <div className="modal-section">
                <h4 className="section-title-with-icon">
                  <MapPin size={16} />
                  Endereço da UC
                </h4>
                <div className="form-row">
                  <div className="form-group full-width">
                    <label>Endereço</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.endereco || ''}
                      onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                      placeholder="Rua, número, complemento"
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Bairro</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.bairro || ''}
                      onChange={(e) => setFormData({ ...formData, bairro: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Cidade</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.cidade || ''}
                      onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group small">
                    <label>UF</label>
                    <input
                      type="text"
                      className="form-input"
                      maxLength={2}
                      value={formData.estado || ''}
                      onChange={(e) => setFormData({ ...formData, estado: e.target.value.toUpperCase() })}
                    />
                  </div>
                  <div className="form-group">
                    <label>CEP</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.cep || ''}
                      onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                      placeholder="00000-000"
                    />
                  </div>
                </div>
              </div>

              {/* Dados da UC */}
              <div className="modal-section">
                <h4 className="section-title-with-icon">
                  <Home size={16} />
                  Dados da UC
                </h4>
                <div className="form-row">
                  <div className="form-group">
                    <label>Apelido da UC</label>
                    <input
                      type="text"
                      className="form-input"
                      value={formData.apelido_uc || ''}
                      onChange={(e) => setFormData({ ...formData, apelido_uc: e.target.value })}
                      placeholder="Ex: Casa, Loja, Fazenda"
                    />
                  </div>
                  <div className="form-group">
                    <label>Ligação</label>
                    <select
                      className="form-input"
                      value={formData.ligacao || 'Monofásica'}
                      onChange={(e) => setFormData({ ...formData, ligacao: e.target.value })}
                    >
                      <option value="Monofásica">Monofásica</option>
                      <option value="Bifásica">Bifásica</option>
                      <option value="Trifásica">Trifásica</option>
                    </select>
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Consumo Médio (kWh)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={formData.consumo_medio || ''}
                      onChange={(e) => setFormData({ ...formData, consumo_medio: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Consultor Responsável</label>
                    <select
                      className="form-input"
                      value={formData.consultor_id || ''}
                      onChange={(e) => setFormData({ ...formData, consultor_id: e.target.value })}
                    >
                      <option value="">Selecione...</option>
                      {Array.isArray(consultores) && consultores.map(c => (
                        <option key={c.id} value={c.id}>{c.nome || c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="common-modal-footer">
              <button className="btn btn-secondary" onClick={fecharModal}>
                <X size={16} />
                Cancelar
              </button>
              <button
                className="btn btn-primary"
                onClick={confirmarValidacao}
                disabled={salvando || !formData.nome || !formData.cpf_cnpj}
              >
                {salvando ? (
                  <>
                    <RefreshCw size={16} className="spinning" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Confirmar Validação
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ValidacaoAssociadosPage;
