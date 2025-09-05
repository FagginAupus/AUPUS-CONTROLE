// ModalConsultorDetalhes.jsx - Aba Informações com Campos de Cadastro
import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Users, 
  Mail, 
  Phone, 
  Calendar, 
  Briefcase,
  Crown,
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
  Hash
} from 'lucide-react';
import apiService from '../services/apiService';
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

  // Buscar família dinamicamente
  useEffect(() => {
    if (consultor?.id && isOpen) {
      fetchFamiliaConsultor(consultor.id);
      // Inicializar dados para edição
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
    }
  }, [consultor?.id, isOpen]);

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
      const response = await apiService.put(`/usuarios/${consultor.id}`, dadosEdicao);
      if (response.success) {
        // Atualizar dados locais do consultor
        Object.assign(consultor, dadosEdicao);
        setModoEdicao(false);
        console.log('✅ Dados atualizados com sucesso');
      } else {
        console.error('❌ Erro ao salvar dados:', response.message);
      }
    } catch (error) {
      console.error('❌ Erro ao salvar dados:', error);
    } finally {
      setSalvandoDados(false);
    }
  };

  const handleCancelarEdicao = () => {
    setModoEdicao(false);
    // Resetar dados para valores originais
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

  const getRoleIcon = (role) => {
    const icons = {
      admin: Crown,
      consultor: Briefcase,
      gerente: Users,
      vendedor: User
    };
    return icons[role] || User;
  };

  const getTipoLabel = (type) => {
    const labels = {
      consultor: 'Consultor',
      gerente: 'Gerente', 
      vendedor: 'Vendedor'
    };
    return labels[type] || type;
  };

  if (!isOpen || !consultor) return null;

  return (
    <div className="modal-overlay-consultor">
      <div className="modal-consultor-content">
        {/* Header do Modal */}
        <div className="modal-consultor-header">
          <div className="header-consultor-info">
            <div className="consultor-avatar">
              <Briefcase size={24} />
            </div>
            <div className="consultor-header-details">
              <h2>{consultor.name || consultor.nome}</h2>
              <span className="consultor-role-badge">
                {getTipoLabel(consultor.role)}
              </span>
            </div>
          </div>
          <button className="btn-close-consultor" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Navegação das Abas */}
        <div className="modal-consultor-tabs">
          <button 
            className={`tab-btn ${abaAtiva === 'informacoes' ? 'active' : ''}`}
            onClick={() => setAbaAtiva('informacoes')}
          >
            <Info size={18} />
            Informações
          </button>
          <button 
            className={`tab-btn ${abaAtiva === 'equipe' ? 'active' : ''}`}
            onClick={() => setAbaAtiva('equipe')}
          >
            <Users size={18} />
            Equipe ({getTotalEquipe()})
          </button>
        </div>

        {/* Conteúdo das Abas */}
        <div className="modal-consultor-body">
          {abaAtiva === 'informacoes' && (
            <div className="tab-content-informacoes">
              {/* Botão de Editar */}
              <div className="info-actions">
                {!modoEdicao ? (
                  <button className="btn-editar" onClick={() => setModoEdicao(true)}>
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
                      <Save size={16} />
                      {salvandoDados ? 'Salvando...' : 'Salvar'}
                    </button>
                    <button className="btn-cancelar" onClick={handleCancelarEdicao}>
                      <X size={16} />
                      Cancelar
                    </button>
                  </div>
                )}
              </div>

              {/* Grid de Informações */}
              <div className="info-grid">
                {/* Nome Completo */}
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
                      />
                    ) : (
                      <span>{consultor.name || consultor.nome || '-'}</span>
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
                      />
                    ) : (
                      <span>{consultor.email || '-'}</span>
                    )}
                  </div>
                </div>

                {/* Telefone */}
                <div className="info-card">
                  <div className="info-icon">
                    <Phone size={20} />
                  </div>
                  <div className="info-details">
                    <label>Celular</label>
                    {modoEdicao ? (
                      <input
                        type="text"
                        value={dadosEdicao.telefone}
                        onChange={(e) => setDadosEdicao({...dadosEdicao, telefone: e.target.value})}
                        className="edit-input"
                      />
                    ) : (
                      <span>{consultorCompleto?.telefone || '-'}</span>
                    )}
                  </div>
                </div>

                {/* CPF */}
                <div className="info-card">
                  <div className="info-icon">
                    <Hash size={20} />
                  </div>
                  <div className="info-details">
                    <label>CPF</label>
                    {modoEdicao ? (
                      <input
                        type="text"
                        value={dadosEdicao.cpf_cnpj}
                        onChange={(e) => setDadosEdicao({...dadosEdicao, cpf_cnpj: e.target.value})}
                        className="edit-input"
                      />
                    ) : (
                      <span>{consultorCompleto?.cpf_cnpj || '-'}</span>
                    )}
                  </div>
                </div>

                {/* Endereço */}
                <div className="info-card full-width">
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
                      />
                    ) : (
                      <span>{consultorCompleto?.endereco || '-'}</span>
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
                      />
                    ) : (
                      <span>{consultorCompleto?.cidade || '-'}</span>
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
                      />
                    ) : (
                      <span>{consultorCompleto?.estado || '-'}</span>
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
                      />
                    ) : (
                      <span>{consultorCompleto?.cep || '-'}</span>
                    )}
                  </div>
                </div>

                {/* Chave PIX */}
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
                      />
                    ) : (
                      <span>{consultorCompleto?.pix || '-'}</span>
                    )}
                  </div>
                </div>

                {/* Data de Cadastro e Status */}
                <div className="info-card">
                  <div className="info-icon">
                    <Calendar size={20} />
                  </div>
                  <div className="info-details">
                    <label>Data de Cadastro</label>
                    <span>{formatarData(consultorCompleto?.created_at)}</span>
                  </div>
                </div>

                <div className="info-card">
                  <div className="info-icon">
                    <UserCheck size={20} />
                  </div>
                  <div className="info-details">
                    <label>Status</label>
                    <span className={`status-badge ${(consultorCompleto?.is_active !== false && consultorCompleto?.is_active !== 0) ? 'active' : 'inactive'}`}>
                      {(consultorCompleto?.is_active !== false && consultorCompleto?.is_active !== 0) ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {abaAtiva === 'equipe' && (
            <div className="tab-content-equipe">
              {loadingFamilia ? (
                <div className="loading-equipe">
                  <Loader size={32} className="spinner" />
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
                          const IconComponent = getRoleIcon(gerente.role);
                          const vendedoresDoGerente = familiaData.vendedores_indiretos?.filter(vendedor => 
                            vendedor.manager_name === gerente.name
                          ) || [];
                          const isExpanded = expandedGerentes.includes(gerente.id);
                          const showAll = showAllVendedores[gerente.id] || false;

                          return (
                            <div key={gerente.id} className="member-card gerente">
                              <div className="member-header">
                                <div className="member-icon">
                                  <IconComponent size={20} />
                                </div>
                                <div className="member-info">
                                  <h4>{gerente.name}</h4>
                                  <span className="member-role">Gerente</span>
                                </div>
                              </div>
                              <div className="member-contact">
                                <span>{gerente.email}</span>
                                {gerente.telefone && <span>{gerente.telefone}</span>}
                              </div>
                              
                              {/* Vendedores deste gerente */}
                              {vendedoresDoGerente.length > 0 && (
                                <div className="gerente-vendedores">
                                  <button 
                                    className="vendedores-toggle"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleVendedores(gerente.id);
                                    }}
                                  >
                                    <span className="vendedores-count">
                                      👥 {vendedoresDoGerente.length} vendedor(es)
                                    </span>
                                    {isExpanded ? 
                                      <ChevronDown size={16} /> : 
                                      <ChevronRight size={16} />
                                    }
                                  </button>
                                  
                                  {isExpanded && (
                                    <div className="vendedores-list expanded">
                                      {vendedoresDoGerente.slice(0, showAll ? vendedoresDoGerente.length : 3).map(vendedor => (
                                        <div key={vendedor.id} className="vendedor-item">
                                          <User size={14} />
                                          <div className="vendedor-info">
                                            <span className="vendedor-name">{vendedor.name}</span>
                                            <span className="vendedor-email">{vendedor.email}</span>
                                          </div>
                                        </div>
                                      ))}
                                      
                                      {vendedoresDoGerente.length > 3 && (
                                        <button 
                                          className="show-more-vendedores"
                                          onClick={() => toggleShowAllVendedores(gerente.id)}
                                        >
                                          {showAll ? 'Ver menos' : `Ver mais ${vendedoresDoGerente.length - 3}`}
                                        </button>
                                      )}
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
                        {familiaData.vendedores_diretos.map(vendedor => {
                          const IconComponent = getRoleIcon(vendedor.role);
                          return (
                            <div key={vendedor.id} className="member-card vendedor">
                              <div className="member-header">
                                <div className="member-icon">
                                  <IconComponent size={20} />
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
                          );
                        })}
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
        <div className="modal-consultor-footer">
          <button className="btn-fechar" onClick={onClose}>
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalConsultorDetalhes;