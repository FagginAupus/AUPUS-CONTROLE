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
  Settings,
  Receipt
} from 'lucide-react';
import './ValidacaoAssociadosPage.css';
import './CommonModalsPagesDark.css';
import '../components/common/CommonModal.css';
import { formatarCpfCnpj, formatarWhatsApp } from '../utils/formatters';

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
  const [associadosEncontrados, setAssociadosEncontrados] = useState([]); // Lista de resultados
  const [associadosSugeridos, setAssociadosSugeridos] = useState([]); // Sugestões automáticas ao abrir modal
  const [termoBusca, setTermoBusca] = useState(''); // Campo de busca separado
  const [buscandoCpf, setBuscandoCpf] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [consultores, setConsultores] = useState([]);
  const [abaAtiva, setAbaAtiva] = useState('proposta'); // 'proposta', 'associado' ou 'faturamento'

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
      const response = await apiService.request('/usuarios?role=consultor&per_page=100');
      if (response.success && response.data) {
        // O backend retorna dados paginados, então precisamos extrair o array
        const consultoresData = Array.isArray(response.data) ? response.data : (response.data.data || []);
        setConsultores(consultoresData);
        console.log('✅ Consultores carregados:', consultoresData.length);
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

  // Buscar associados sugeridos automaticamente (por nome, cpf, email, whatsapp)
  const buscarAssociadosSugeridos = async (dados) => {
    try {
      const sugestoes = [];
      const idsEncontrados = new Set();

      // Buscar por CPF/CNPJ
      if (dados.cliente.cpf_cnpj && dados.cliente.cpf_cnpj.length >= 3) {
        const resp = await apiService.request(`/associados/buscar-cpf-cnpj?busca=${encodeURIComponent(dados.cliente.cpf_cnpj)}`);
        if (resp.success && resp.encontrado) {
          const lista = resp.multiplos ? resp.data : [resp.data];
          lista.forEach(a => {
            if (!idsEncontrados.has(a.id)) {
              idsEncontrados.add(a.id);
              sugestoes.push({ ...a, motivo: 'CPF/CNPJ coincide' });
            }
          });
        }
      }

      // Buscar por email
      if (dados.cliente.email && dados.cliente.email.length >= 3) {
        const resp = await apiService.request(`/associados/buscar-cpf-cnpj?busca=${encodeURIComponent(dados.cliente.email)}`);
        if (resp.success && resp.encontrado) {
          const lista = resp.multiplos ? resp.data : [resp.data];
          lista.forEach(a => {
            if (!idsEncontrados.has(a.id)) {
              idsEncontrados.add(a.id);
              sugestoes.push({ ...a, motivo: 'Email coincide' });
            } else {
              // Atualizar motivo se já existir
              const idx = sugestoes.findIndex(s => s.id === a.id);
              if (idx >= 0 && !sugestoes[idx].motivo.includes('Email')) {
                sugestoes[idx].motivo += ' e Email';
              }
            }
          });
        }
      }

      // Buscar por nome (exato ou parcial)
      if (dados.cliente.nome && dados.cliente.nome.length >= 3) {
        const resp = await apiService.request(`/associados/buscar-cpf-cnpj?busca=${encodeURIComponent(dados.cliente.nome)}`);
        if (resp.success && resp.encontrado) {
          const lista = resp.multiplos ? resp.data : [resp.data];
          lista.forEach(a => {
            if (!idsEncontrados.has(a.id)) {
              idsEncontrados.add(a.id);
              sugestoes.push({ ...a, motivo: 'Nome similar' });
            } else {
              const idx = sugestoes.findIndex(s => s.id === a.id);
              if (idx >= 0 && !sugestoes[idx].motivo.includes('Nome')) {
                sugestoes[idx].motivo += ' e Nome';
              }
            }
          });
        }
      }

      // Buscar por WhatsApp
      if (dados.cliente.whatsapp && dados.cliente.whatsapp.length >= 8) {
        const resp = await apiService.request(`/associados/buscar-cpf-cnpj?busca=${encodeURIComponent(dados.cliente.whatsapp)}`);
        if (resp.success && resp.encontrado) {
          const lista = resp.multiplos ? resp.data : [resp.data];
          lista.forEach(a => {
            if (!idsEncontrados.has(a.id)) {
              idsEncontrados.add(a.id);
              sugestoes.push({ ...a, motivo: 'WhatsApp coincide' });
            }
          });
        }
      }

      setAssociadosSugeridos(sugestoes);

      if (sugestoes.length > 0) {
        console.log(`✅ ${sugestoes.length} associado(s) sugerido(s) encontrado(s)`);
      }
    } catch (error) {
      console.error('Erro ao buscar sugestões:', error);
      setAssociadosSugeridos([]);
    }
  };

  // Abrir modal de validação
  const abrirModalValidacao = async (item) => {
    try {
      setLoading(true);
      setAssociadosSugeridos([]); // Limpar sugestões anteriores

      const response = await apiService.request(`/associados/validar/${item.proposta_id}/${item.uc.numero_unidade}`);

      if (response.success) {
        const dados = response.data;

        // Formatar valores para exibição
        const cpfFormatado = formatarCpfCnpj(dados.cliente.cpf_cnpj);
        const whatsFormatado = formatarWhatsApp(dados.cliente.whatsapp);

        setFormData({
          nome: dados.cliente.nome || dados.proposta.nome_cliente || '',
          cpf_cnpj: cpfFormatado !== '-' ? cpfFormatado : '',
          whatsapp: whatsFormatado !== '-' ? whatsFormatado : '',
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
          desconto_bandeira: dados.proposta.desconto_bandeira || '20%',
          // Campos de faturamento - inicializados com dados do cliente/proposta (formatados)
          nome_faturamento: dados.cliente.nome || dados.proposta.nome_cliente || '',
          cpf_cnpj_faturamento: cpfFormatado !== '-' ? cpfFormatado : '',
          whatsapp_faturamento: whatsFormatado !== '-' ? whatsFormatado : '',
          email_faturamento_1: dados.cliente.email || '',
          email_faturamento_2: ''
        });

        setAssociadoExistente(dados.associado_existente);
        setAbaAtiva('proposta'); // Resetar para primeira aba
        setModalValidacao({ show: true, item: { ...item, dadosCompletos: dados } });

        // Buscar sugestões de associados existentes automaticamente
        buscarAssociadosSugeridos(dados);
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

  // Buscar associado por nome, CPF/CNPJ, email ou número UC
  const buscarAssociado = async () => {
    if (!termoBusca || termoBusca.length < 3) {
      showNotification('Digite pelo menos 3 caracteres para buscar', 'warning');
      return;
    }

    try {
      setBuscandoCpf(true);
      setAssociadosEncontrados([]);
      setAssociadoExistente(null);

      const response = await apiService.request(`/associados/buscar-cpf-cnpj?busca=${encodeURIComponent(termoBusca)}`);

      if (response.success && response.encontrado) {
        // Verifica se retornou múltiplos resultados
        if (response.multiplos) {
          setAssociadosEncontrados(response.data);
          showNotification(`${response.total} associados encontrados`, 'success');
        } else {
          // Apenas um resultado
          setAssociadosEncontrados([response.data]);
          showNotification(`Associado encontrado: ${response.data.nome}`, 'success');
        }
      } else {
        setAssociadosEncontrados([]);
        showNotification('Nenhum associado encontrado', 'info');
      }
    } catch (error) {
      console.error('Erro ao buscar associado:', error);
      showNotification('Erro ao buscar associado', 'error');
    } finally {
      setBuscandoCpf(false);
    }
  };

  // Vincular a associado existente (pode receber o associado como parâmetro)
  const vincularAssociadoExistente = (associado = null) => {
    const associadoParaVincular = associado || associadoExistente;
    if (associadoParaVincular) {
      const cpfFormatado = formatarCpfCnpj(associadoParaVincular.cpf_cnpj);
      const whatsFormatado = formatarWhatsApp(associadoParaVincular.whatsapp);
      setFormData(prev => ({
        ...prev,
        nome: associadoParaVincular.nome,
        cpf_cnpj: cpfFormatado !== '-' ? cpfFormatado : '',
        whatsapp: whatsFormatado !== '-' ? whatsFormatado : prev.whatsapp,
        email: associadoParaVincular.email || prev.email,
        associado_id: associadoParaVincular.id
      }));
      setAssociadoExistente(associadoParaVincular);
      setAssociadosEncontrados([]); // Limpar lista de resultados
      setTermoBusca(''); // Limpar campo de busca
      showNotification(`Associado "${associadoParaVincular.nome}" vinculado. Confirme a validação.`, 'success');
    }
  };

  // Confirmar validação
  const confirmarValidacao = async () => {
    if (!formData.nome || !formData.cpf_cnpj) {
      showNotification('Nome e CPF/CNPJ são obrigatórios', 'warning');
      return;
    }

    if (!formData.email) {
      showNotification('Email do associado é obrigatório', 'warning');
      setAbaAtiva('associado'); // Ir para aba do associado
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
        setAssociadosSugeridos([]);
        carregarPendentes();
      } else {
        showNotification(response.message || 'Erro ao confirmar validação', 'error');
      }
    } catch (error) {
      console.error('Erro ao confirmar validação:', error);

      // Tratar resposta de conflito (CPF/CNPJ ou email já existe)
      if (error.response?.status === 409 && error.response?.data?.requer_vinculacao) {
        const conflitos = error.response.data.conflitos || [];
        showNotification(error.response.data.message || 'Já existe associado com este CPF/CNPJ ou email. Vincule a um existente.', 'warning');

        // Mostrar os associados conflitantes como sugestões
        if (conflitos.length > 0) {
          setAssociadosSugeridos(conflitos.map(c => ({
            ...c,
            motivo: c.motivo
          })));
          setAbaAtiva('associado'); // Ir para aba do associado
        }
      } else {
        showNotification('Erro ao confirmar validação: ' + error.message, 'error');
      }
    } finally {
      setSalvando(false);
    }
  };

  // Fechar modal
  const fecharModal = () => {
    setModalValidacao({ show: false, item: null });
    setFormData({});
    setAssociadoExistente(null);
    setAssociadosEncontrados([]);
    setAssociadosSugeridos([]);
    setTermoBusca('');
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

            {/* Abas do Modal */}
            <div className="modal-tabs">
              <button
                className={`modal-tab ${abaAtiva === 'proposta' ? 'active' : ''}`}
                onClick={() => setAbaAtiva('proposta')}
              >
                <FileText size={16} />
                Proposta / UC
              </button>
              <button
                className={`modal-tab ${abaAtiva === 'associado' ? 'active' : ''}`}
                onClick={() => setAbaAtiva('associado')}
              >
                <User size={16} />
                Associado
              </button>
              <button
                className={`modal-tab ${abaAtiva === 'faturamento' ? 'active' : ''}`}
                onClick={() => setAbaAtiva('faturamento')}
              >
                <Receipt size={16} />
                Faturamento
              </button>
            </div>

            <div className="common-modal-content">
              {/* === ABA 1: PROPOSTA E UC === */}
              {abaAtiva === 'proposta' && (
                <>
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

                  {/* Dados do Endereço da UC */}
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
                </>
              )}

              {/* === ABA 2: ASSOCIADO === */}
              {abaAtiva === 'associado' && (
                <>
                  {/* Sugestões automáticas de associados */}
                  {associadosSugeridos.length > 0 && !associadoExistente && (
                    <div className="modal-section sugestoes-section">
                      <h4 className="section-title-with-icon warning-title">
                        <AlertCircle size={16} />
                        Possíveis Associados Existentes
                      </h4>
                      <p className="section-description warning-description">
                        Encontramos associados que podem corresponder a este cliente. Vincule a um existente ou crie um novo.
                      </p>
                      <div className="associados-lista">
                        {associadosSugeridos.map((assoc) => (
                          <div key={assoc.id} className="associado-encontrado-box sugerido">
                            <div className="associado-info-row">
                              <User size={20} />
                              <div className="associado-dados">
                                <strong>{assoc.nome}</strong>
                                <span>{formatarCpfCnpj(assoc.cpf_cnpj)}</span>
                                {assoc.email && <span>{assoc.email}</span>}
                                <span className="motivo-tag">{assoc.motivo}</span>
                              </div>
                            </div>
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => vincularAssociadoExistente(assoc)}
                            >
                              <LinkIcon size={14} />
                              Vincular
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Associado já vinculado */}
                  {associadoExistente && (
                    <div className="modal-section">
                      <h4 className="section-title-with-icon">
                        <CheckCircle size={16} style={{ color: '#27ae60' }} />
                        Associado Vinculado
                      </h4>
                      <div className="associado-vinculado-box">
                        <div className="associado-info-row">
                          <User size={24} />
                          <div className="associado-dados">
                            <strong>{associadoExistente.nome}</strong>
                            <span>{formatarCpfCnpj(associadoExistente.cpf_cnpj)}</span>
                            {associadoExistente.email && <span>{associadoExistente.email}</span>}
                            {associadoExistente.whatsapp && <span>{associadoExistente.whatsapp}</span>}
                            <span className="vinculado-tag">Vinculado</span>
                          </div>
                        </div>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => {
                            setAssociadoExistente(null);
                            setFormData(prev => ({ ...prev, associado_id: null }));
                          }}
                        >
                          <X size={14} />
                          Remover vínculo
                        </button>
                      </div>
                      <p className="section-description" style={{ marginTop: '12px', color: '#888' }}>
                        Os dados do associado vinculado não podem ser alterados por este modal.
                      </p>
                    </div>
                  )}

                  {/* Busca de Associado Existente - só mostra se não estiver vinculado */}
                  {!associadoExistente && (
                    <div className="modal-section">
                      <h4 className="section-title-with-icon">
                        <Search size={16} />
                        Buscar Associado Existente
                      </h4>
                      <p className="section-description">
                        Busque por nome, CPF/CNPJ, email ou número da UC para vincular a um associado existente.
                      </p>
                      <div className="cpf-search-row">
                        <input
                          type="text"
                          className="form-input"
                          placeholder="Digite nome, CPF/CNPJ, email ou nº UC..."
                          value={termoBusca}
                          onChange={(e) => setTermoBusca(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && buscarAssociado()}
                        />
                        <button
                          className="btn btn-secondary"
                          onClick={buscarAssociado}
                          disabled={buscandoCpf}
                        >
                          {buscandoCpf ? <RefreshCw size={16} className="spinning" /> : <Search size={16} />}
                          Buscar
                        </button>
                      </div>

                      {/* Lista de resultados da busca */}
                      {associadosEncontrados.length > 0 && (
                        <div className="associados-lista">
                          <span className="lista-titulo">{associadosEncontrados.length} resultado(s) encontrado(s):</span>
                          {associadosEncontrados.map((assoc) => (
                            <div key={assoc.id} className="associado-encontrado-box">
                              <div className="associado-info-row">
                                <User size={20} />
                                <div className="associado-dados">
                                  <strong>{assoc.nome}</strong>
                                  <span>{formatarCpfCnpj(assoc.cpf_cnpj)}</span>
                                  <span>{assoc.controles_count ?? assoc.controles?.length ?? 0} contratos</span>
                                </div>
                              </div>
                              <button
                                className="btn btn-success btn-sm"
                                onClick={() => vincularAssociadoExistente(assoc)}
                              >
                                <LinkIcon size={14} />
                                Vincular
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Dados do Cliente / Associado - campos readonly se vinculado */}
                  <div className="modal-section">
                    <h4 className="section-title-with-icon">
                      <User size={16} />
                      {associadoExistente ? 'Dados do Associado (somente leitura)' : 'Dados do Novo Associado'}
                    </h4>
                    {associadoExistente && (
                      <p className="section-description" style={{ color: '#f39c12', marginBottom: '12px' }}>
                        Para editar os dados do associado, remova o vínculo acima.
                      </p>
                    )}
                    <div className="form-row">
                      <div className="form-group full-width">
                        <label>Nome do Cliente *</label>
                        <input
                          type="text"
                          className={`form-input ${associadoExistente ? 'readonly-input' : ''}`}
                          value={formData.nome || ''}
                          onChange={(e) => !associadoExistente && setFormData({ ...formData, nome: e.target.value })}
                          placeholder="Nome completo"
                          readOnly={!!associadoExistente}
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>CPF/CNPJ *</label>
                        <input
                          type="text"
                          className={`form-input ${associadoExistente ? 'readonly-input' : ''}`}
                          value={formData.cpf_cnpj || ''}
                          onChange={(e) => !associadoExistente && setFormData({ ...formData, cpf_cnpj: e.target.value })}
                          placeholder="000.000.000-00"
                          readOnly={!!associadoExistente}
                        />
                      </div>
                      <div className="form-group">
                        <label>WhatsApp</label>
                        <input
                          type="text"
                          className={`form-input ${associadoExistente ? 'readonly-input' : ''}`}
                          value={formData.whatsapp || ''}
                          onChange={(e) => !associadoExistente && setFormData({ ...formData, whatsapp: e.target.value })}
                          placeholder="(00) 00000-0000"
                          readOnly={!!associadoExistente}
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group full-width">
                        <label>Email *</label>
                        <input
                          type="email"
                          className={`form-input ${associadoExistente ? 'readonly-input' : ''}`}
                          value={formData.email || ''}
                          onChange={(e) => !associadoExistente && setFormData({ ...formData, email: e.target.value })}
                          placeholder="email@exemplo.com"
                          readOnly={!!associadoExistente}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* === ABA 3: FATURAMENTO === */}
              {abaAtiva === 'faturamento' && (
                <>
                  {/* Informações de Faturamento */}
                  <div className="modal-section">
                    <h4 className="section-title-with-icon">
                      <Receipt size={16} />
                      Informações de Faturamento
                    </h4>
                    <p className="section-description">
                      Dados que serão utilizados para emissão e envio das faturas desta UC.
                    </p>
                    <div className="form-row">
                      <div className="form-group full-width">
                        <label>Nome para Faturamento</label>
                        <input
                          type="text"
                          className="form-input"
                          value={formData.nome_faturamento || ''}
                          onChange={(e) => setFormData({ ...formData, nome_faturamento: e.target.value })}
                          placeholder="Nome que aparecerá na fatura"
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>CPF/CNPJ para Faturamento</label>
                        <input
                          type="text"
                          className="form-input"
                          value={formData.cpf_cnpj_faturamento || ''}
                          onChange={(e) => setFormData({ ...formData, cpf_cnpj_faturamento: e.target.value })}
                          placeholder="000.000.000-00"
                        />
                      </div>
                      <div className="form-group">
                        <label>WhatsApp para Faturamento</label>
                        <input
                          type="text"
                          className="form-input"
                          value={formData.whatsapp_faturamento || ''}
                          onChange={(e) => setFormData({ ...formData, whatsapp_faturamento: e.target.value })}
                          placeholder="(00) 00000-0000"
                        />
                      </div>
                    </div>
                  </div>

                  {/* E-mails para Envio de Fatura */}
                  <div className="modal-section">
                    <h4 className="section-title-with-icon">
                      <Mail size={16} />
                      E-mails para Envio de Fatura
                    </h4>
                    <p className="section-description">
                      Informe até dois e-mails para recebimento das faturas.
                    </p>
                    <div className="form-row">
                      <div className="form-group full-width">
                        <label>E-mail Principal</label>
                        <input
                          type="email"
                          className="form-input"
                          value={formData.email_faturamento_1 || ''}
                          onChange={(e) => setFormData({ ...formData, email_faturamento_1: e.target.value })}
                          placeholder="email@exemplo.com"
                        />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group full-width">
                        <label>E-mail Secundário (opcional)</label>
                        <input
                          type="email"
                          className="form-input"
                          value={formData.email_faturamento_2 || ''}
                          onChange={(e) => setFormData({ ...formData, email_faturamento_2: e.target.value })}
                          placeholder="email2@exemplo.com"
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
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
