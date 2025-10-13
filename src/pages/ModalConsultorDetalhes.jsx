// ModalConsultorDetalhes.jsx - VERSÃO FINAL SEM ERROS DE ESLINT
import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Users, 
  Mail, 
  Phone, 
  Calendar, 
  Briefcase,
  UserCheck,
  Building,
  Info,
  Loader,
  ChevronDown,
  ChevronRight,
  Edit2,
  Save,
  MapPin,
  CreditCard,
  Hash,
  AlertCircle
} from 'lucide-react';
import apiService from '../services/apiService';
import '../components/common/CommonModal.css';
import './ModalConsultorDetalhes.css';

const ModalConsultorDetalhes = ({ consultor, isOpen, onClose }) => {
  const [abaAtiva, setAbaAtiva] = useState('informacoes');
  const [familiaData, setFamiliaData] = useState(null);
  const [loadingFamilia, setLoadingFamilia] = useState(false);
  const [expandedGerentes, setExpandedGerentes] = useState([]);
  const [showAllVendedores, setShowAllVendedores] = useState({});
  
  // Estados para edição
  const [modoEdicao, setModoEdicao] = useState(false);
  const [dadosEdicao, setDadosEdicao] = useState({});
  const [salvandoDados, setSalvandoDados] = useState(false);
  const [consultorCompleto, setConsultorCompleto] = useState(null);
  const [erroBackend, setErroBackend] = useState(false);

  // Função para determinar status baseado em is_active
  const getStatusInfo = (isActive) => {
    if (isActive === true || isActive === 'true' || isActive === 1 || isActive === '1') {
      return { text: 'Ativo', class: 'active' };
    }
    return { text: 'Inativo', class: 'inactive' };
  };

  // Inicialização com dados do consultor atual
  useEffect(() => {
    if (consultor?.id && isOpen) {
      initializeDadosEdicao();
      fetchConsultorCompleto(consultor.id);
      fetchFamiliaConsultor(consultor.id);
    }
  }, [consultor?.id, isOpen]);

  // Inicializar com dados disponíveis
  const initializeDadosEdicao = () => {
    setDadosEdicao({
      nome: consultor.name || consultor.nome || '',
      email: consultor.email || '',
      telefone: consultor.telefone || '',
      cpf_cnpj: consultor.cpf_cnpj || '',
      endereco: consultor.endereco || '',
      cidade: consultor.cidade || '',
      estado: consultor.estado || '',
      cep: consultor.cep || '',
      pix: consultor.pix || ''
    });
    setConsultorCompleto(consultor);
    setErroBackend(false);
  };

  // Função para buscar dados completos (com fallback)
  const fetchConsultorCompleto = async (consultorId) => {
    try {
      console.log('🔍 Tentando buscar dados completos do consultor:', consultorId);
      const response = await apiService.get(`/usuarios/${consultorId}`);
      if (response.success) {
        const dadosCompletos = response.data;
        console.log('✅ Dados completos do consultor recebidos:', dadosCompletos);
        
        setConsultorCompleto(dadosCompletos);
        setErroBackend(false);
        
        setDadosEdicao(prev => ({
          nome: dadosCompletos.name || dadosCompletos.nome || prev.nome,
          email: dadosCompletos.email || prev.email,
          telefone: dadosCompletos.telefone || prev.telefone,
          cpf_cnpj: dadosCompletos.cpf_cnpj || prev.cpf_cnpj,
          endereco: dadosCompletos.endereco || prev.endereco,
          cidade: dadosCompletos.cidade || prev.cidade,
          estado: dadosCompletos.estado || prev.estado,
          cep: dadosCompletos.cep || prev.cep,
          pix: dadosCompletos.pix || prev.pix
        }));
        
        console.log('✅ Dados mesclados com sucesso');
      }
    } catch (error) {
      console.error('❌ Erro ao buscar dados completos do consultor:', error);
      console.log('⚠️ Usando dados básicos disponíveis como fallback');
      setErroBackend(true);
    }
  };

  const fetchFamiliaConsultor = async (consultorId) => {
    setLoadingFamilia(true);
    try {
      console.log('🔍 Buscando família do consultor:', consultorId);
      const response = await apiService.getFamiliaConsultor(consultorId);
      if (response.success) {
        setFamiliaData(response.data);
        console.log('✅ Família carregada:', response.data);
      }
    } catch (error) {
      console.error('Erro ao carregar família:', error);
      setFamiliaData(null);
    } finally {
      setLoadingFamilia(false);
    }
  };

  const handleSalvarDados = async () => {
    setSalvandoDados(true);
    try {
      console.log('Salvando dados do consultor:', dadosEdicao);
      const response = await apiService.put(`/usuarios/${consultor.id}`, dadosEdicao);
      if (response.success) {
        Object.assign(consultor, dadosEdicao);
        setModoEdicao(false);
        console.log('✅ Dados atualizados com sucesso');
        
        try {
          await fetchConsultorCompleto(consultor.id);
        } catch (error) {
          console.log('⚠️ Não foi possível recarregar dados após salvamento, mas dados foram salvos');
        }
      } else {
        console.error('❌ Erro ao salvar dados:', response.message);
        alert('Erro ao salvar dados: ' + response.message);
      }
    } catch (error) {
      console.error('❌ Erro ao salvar dados:', error);
      alert('Erro ao salvar dados. Tente novamente.');
    } finally {
      setSalvandoDados(false);
    }
  };

  const handleCancelarEdicao = () => {
    setModoEdicao(false);
    initializeDadosEdicao();
  };

  const toggleVendedores = (gerenteId) => {
    setExpandedGerentes(prev => 
      prev.includes(gerenteId) 
        ? prev.filter(id => id !== gerenteId)
        : [...prev, gerenteId]
    );
  };

  const toggleShowAllVendedores = (gerenteId) => {
    setShowAllVendedores(prev => ({
      ...prev,
      [gerenteId]: !prev[gerenteId]
    }));
  };

  const getTotalEquipe = () => {
    if (!familiaData) return 0;
    return (familiaData.gerentes?.length || 0) + 
           (familiaData.vendedores_diretos?.length || 0) + 
           (familiaData.vendedores_indiretos?.length || 0);
  };

  const formatarData = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getTipoLabel = (type) => {
    const labels = {
      consultor: 'Consultor',
      gerente: 'Gerente', 
      vendedor: 'Vendedor'
    };
    return labels[type] || type;
  };

  // Funções para exibir dados (com fallback)
  const getDisplayValue = (field, fallback = '-') => {
    return dadosEdicao[field] || 
           consultorCompleto?.[field] || 
           consultor?.[field] || 
           fallback;
  };

  if (!isOpen || !consultor) return null;

  // Determinar status atual
  const statusAtual = consultorCompleto?.is_active ?? consultor?.is_active;
  const statusInfo = getStatusInfo(statusAtual);

  return (
    <div className="common-modal-overlay">
      <div className="common-modal large" onClick={(e) => e.stopPropagation()}>
        {/* Header do Modal */}
        <div className="common-modal-header" style={{ background: 'linear-gradient(135deg, #3498db, #2980b9)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <Briefcase size={24} />
            </div>
            <div>
              <h2 style={{ margin: '0 0 4px 0' }}>{getDisplayValue('nome') || getDisplayValue('name') || 'Nome não informado'}</h2>
              <span style={{
                background: 'rgba(255, 255, 255, 0.25)',
                color: 'white',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '0.85rem',
                fontWeight: 600
              }}>
                {getTipoLabel(consultor.role)}
              </span>
            </div>
          </div>
          <button className="common-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Navegação das Abas */}
        <div className="common-modal-tabs">
          <button
            className={`common-modal-tab ${abaAtiva === 'informacoes' ? 'active' : ''}`}
            onClick={() => setAbaAtiva('informacoes')}
          >
            <Info size={18} />
            Informações
          </button>
          <button
            className={`common-modal-tab ${abaAtiva === 'equipe' ? 'active' : ''}`}
            onClick={() => setAbaAtiva('equipe')}
          >
            <Users size={18} />
            Equipe ({getTotalEquipe()})
          </button>
        </div>

        {/* Conteúdo das Abas */}
        <div className="common-modal-content">
          {abaAtiva === 'informacoes' && (
            <div className="tab-content-informacoes">
              {/* Aviso de Erro Backend */}
              {erroBackend && (
                <div className="backend-error-warning">
                  <AlertCircle size={20} />
                  <span>
                    Alguns dados podem estar desatualizados devido a um erro no servidor. 
                    As informações básicas estão sendo exibidas.
                  </span>
                </div>
              )}

              {/* Botão de Editar */}
              <div className="info-actions">
                {!modoEdicao ? (
                  <button 
                    className="btn-editar-consultor" 
                    onClick={() => setModoEdicao(true)}
                  >
                    <Edit2 size={16} />
                    Editar Informações
                  </button>
                ) : (
                  <div className="edit-actions">
                    <button 
                      className="btn-salvar" 
                      onClick={handleSalvarDados}
                      disabled={salvandoDados}
                    >
                      {salvandoDados ? (
                        <>
                          <Loader size={16} className="spinning" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save size={16} />
                          Salvar
                        </>
                      )}
                    </button>
                    <button 
                      className="btn-cancelar" 
                      onClick={handleCancelarEdicao}
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>

              {/* Cards de Informação */}
              <div className="info-cards-grid">
                {/* Nome */}
                <div className="info-card">
                  <div className="info-icon">
                    <User size={20} />
                  </div>
                  <div className="info-details">
                    <label>Nome Completo</label>
                    {modoEdicao ? (
                      <input
                        type="text"
                        value={dadosEdicao.nome}
                        onChange={(e) => setDadosEdicao({...dadosEdicao, nome: e.target.value})}
                        className="edit-input"
                        placeholder="Digite o nome completo"
                      />
                    ) : (
                      <span>{getDisplayValue('nome') || getDisplayValue('name')}</span>
                    )}
                  </div>
                </div>

                {/* Email */}
                <div className="info-card">
                  <div className="info-icon">
                    <Mail size={20} />
                  </div>
                  <div className="info-details">
                    <label>Email</label>
                    {modoEdicao ? (
                      <input
                        type="email"
                        value={dadosEdicao.email}
                        onChange={(e) => setDadosEdicao({...dadosEdicao, email: e.target.value})}
                        className="edit-input"
                        placeholder="Digite o email"
                      />
                    ) : (
                      <span>{getDisplayValue('email')}</span>
                    )}
                  </div>
                </div>

                {/* Telefone */}
                <div className="info-card">
                  <div className="info-icon">
                    <Phone size={20} />
                  </div>
                  <div className="info-details">
                    <label>Telefone</label>
                    {modoEdicao ? (
                      <input
                        type="tel"
                        value={dadosEdicao.telefone}
                        onChange={(e) => setDadosEdicao({...dadosEdicao, telefone: e.target.value})}
                        className="edit-input"
                        placeholder="Digite o telefone"
                      />
                    ) : (
                      <span>{getDisplayValue('telefone')}</span>
                    )}
                  </div>
                </div>

                {/* CPF/CNPJ */}
                <div className="info-card">
                  <div className="info-icon">
                    <Hash size={20} />
                  </div>
                  <div className="info-details">
                    <label>CPF/CNPJ</label>
                    {modoEdicao ? (
                      <input
                        type="text"
                        value={dadosEdicao.cpf_cnpj}
                        onChange={(e) => setDadosEdicao({...dadosEdicao, cpf_cnpj: e.target.value})}
                        className="edit-input"
                        placeholder="Digite o CPF ou CNPJ"
                      />
                    ) : (
                      <span>{getDisplayValue('cpf_cnpj')}</span>
                    )}
                  </div>
                </div>

                {/* Endereço */}
                <div className="info-card">
                  <div className="info-icon">
                    <MapPin size={20} />
                  </div>
                  <div className="info-details">
                    <label>Endereço</label>
                    {modoEdicao ? (
                      <input
                        type="text"
                        value={dadosEdicao.endereco}
                        onChange={(e) => setDadosEdicao({...dadosEdicao, endereco: e.target.value})}
                        className="edit-input"
                        placeholder="Digite o endereço completo"
                      />
                    ) : (
                      <span>{getDisplayValue('endereco')}</span>
                    )}
                  </div>
                </div>

                {/* Cidade */}
                <div className="info-card">
                  <div className="info-icon">
                    <Building size={20} />
                  </div>
                  <div className="info-details">
                    <label>Cidade</label>
                    {modoEdicao ? (
                      <input
                        type="text"
                        value={dadosEdicao.cidade}
                        onChange={(e) => setDadosEdicao({...dadosEdicao, cidade: e.target.value})}
                        className="edit-input"
                        placeholder="Digite a cidade"
                      />
                    ) : (
                      <span>{getDisplayValue('cidade')}</span>
                    )}
                  </div>
                </div>

                {/* Estado */}
                <div className="info-card">
                  <div className="info-icon">
                    <MapPin size={20} />
                  </div>
                  <div className="info-details">
                    <label>Estado</label>
                    {modoEdicao ? (
                      <input
                        type="text"
                        value={dadosEdicao.estado}
                        onChange={(e) => setDadosEdicao({...dadosEdicao, estado: e.target.value})}
                        className="edit-input"
                        maxLength={2}
                        placeholder="Ex: GO"
                      />
                    ) : (
                      <span>{getDisplayValue('estado')}</span>
                    )}
                  </div>
                </div>

                {/* CEP */}
                <div className="info-card">
                  <div className="info-icon">
                    <Hash size={20} />
                  </div>
                  <div className="info-details">
                    <label>CEP</label>
                    {modoEdicao ? (
                      <input
                        type="text"
                        value={dadosEdicao.cep}
                        onChange={(e) => setDadosEdicao({...dadosEdicao, cep: e.target.value})}
                        className="edit-input"
                        placeholder="Digite o CEP"
                      />
                    ) : (
                      <span>{getDisplayValue('cep')}</span>
                    )}
                  </div>
                </div>

                {/* PIX */}
                <div className="info-card">
                  <div className="info-icon">
                    <CreditCard size={20} />
                  </div>
                  <div className="info-details">
                    <label>Chave PIX</label>
                    {modoEdicao ? (
                      <input
                        type="text"
                        value={dadosEdicao.pix}
                        onChange={(e) => setDadosEdicao({...dadosEdicao, pix: e.target.value})}
                        className="edit-input"
                        placeholder="Digite a chave PIX"
                      />
                    ) : (
                      <span>{getDisplayValue('pix')}</span>
                    )}
                  </div>
                </div>

                {/* Status */}
                <div className="info-card">
                  <div className="info-icon">
                    <UserCheck size={20} />
                  </div>
                  <div className="info-details">
                    <label>Status</label>
                    <span className={`status-badge ${statusInfo.class}`}>
                      {statusInfo.text}
                    </span>
                  </div>
                </div>

                {/* Data de Criação */}
                <div className="info-card">
                  <div className="info-icon">
                    <Calendar size={20} />
                  </div>
                  <div className="info-details">
                    <label>Data de Criação</label>
                    <span>{formatarData(consultorCompleto?.created_at || consultor?.created_at)}</span>
                  </div>
                </div>

                {/* ID do Usuário */}
                <div className="info-card full-width">
                  <div className="info-icon">
                    <Hash size={20} />
                  </div>
                  <div className="info-details">
                    <label>ID do Usuário</label>
                    <span className="user-id">{consultor.id}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {abaAtiva === 'equipe' && (
            <div className="tab-content-equipe">
              {loadingFamilia ? (
                <div className="loading-state">
                  <Loader size={32} />
                  <p>Carregando equipe...</p>
                </div>
              ) : (
                <>
                  {/* Gerentes */}
                  {familiaData?.gerentes?.length > 0 && (
                    <div className="equipe-section">
                      <h3>
                        <Users size={20} />
                        Gerentes ({familiaData.gerentes.length})
                      </h3>
                      <div className="members-grid">
                        {familiaData.gerentes.map(gerente => {
                          const vendedoresDoGerente = familiaData.vendedores_indiretos?.filter(
                            v => v.manager_id === gerente.id
                          ) || [];
                          const isExpanded = expandedGerentes.includes(gerente.id);
                          const showAll = showAllVendedores[gerente.id] || false;
                          const vendedoresExibidos = showAll ? vendedoresDoGerente : vendedoresDoGerente.slice(0, 3);

                          return (
                            <div key={gerente.id} className="member-card gerente">
                              <div className="member-header">
                                <div className="member-icon">
                                  <Users size={20} />
                                </div>
                                <div className="member-info">
                                  <h4>{gerente.name}</h4>
                                  <span className="member-role">Gerente</span>
                                </div>
                                {vendedoresDoGerente.length > 0 && (
                                  <button
                                    className="expand-btn"
                                    onClick={() => toggleVendedores(gerente.id)}
                                  >
                                    {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                  </button>
                                )}
                              </div>
                              <div className="member-contact">
                                <span>{gerente.email}</span>
                                {gerente.telefone && <span>{gerente.telefone}</span>}
                              </div>
                              {isExpanded && vendedoresDoGerente.length > 0 && (
                                <div className="gerente-vendedores">
                                  <span className="vendedores-label">
                                    Vendedores ({vendedoresDoGerente.length})
                                  </span>
                                  <div className="vendedores-list">
                                    {vendedoresExibidos.map(vendedor => (
                                      <div key={vendedor.id} className="vendedor-item">
                                        <User size={14} />
                                        <div className="vendedor-info">
                                          <div className="vendedor-nome">{vendedor.name}</div>
                                          <div className="vendedor-email">{vendedor.email}</div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  {vendedoresDoGerente.length > 3 && (
                                    <div className="show-more-container">
                                      <button
                                        className="show-more-btn"
                                        onClick={() => toggleShowAllVendedores(gerente.id)}
                                      >
                                        {showAll ? 'Ver menos' : `Ver mais ${vendedoresDoGerente.length - 3}`}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Vendedores Diretos */}
                  {familiaData?.vendedores_diretos?.length > 0 && (
                    <div className="equipe-section">
                      <h3>
                        <User size={20} />
                        Vendedores Diretos ({familiaData.vendedores_diretos.length})
                      </h3>
                      <div className="members-grid">
                        {familiaData.vendedores_diretos.map(vendedor => (
                          <div key={vendedor.id} className="member-card vendedor">
                            <div className="member-header">
                              <div className="member-icon">
                                <User size={20} />
                              </div>
                              <div className="member-info">
                                <h4>{vendedor.name}</h4>
                                <span className="member-role">Vendedor</span>
                              </div>
                            </div>
                            <div className="member-contact">
                              <span>{vendedor.email}</span>
                              {vendedor.telefone && <span>{vendedor.telefone}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Estado Vazio */}
                  {getTotalEquipe() === 0 && !loadingFamilia && (
                    <div className="empty-team-state">
                      <Users size={48} />
                      <h3>Nenhum membro na equipe</h3>
                      <p>Este consultor ainda não possui gerentes ou vendedores em sua equipe.</p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer do Modal */}
        <div className="common-modal-footer">
          <button className="common-btn common-btn-secondary" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalConsultorDetalhes;