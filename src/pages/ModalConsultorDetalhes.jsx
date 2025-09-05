// ModalConsultorDetalhes.jsx
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
  Loader
} from 'lucide-react';
import apiService from '../services/apiService';
import './ModalConsultorDetalhes.css';

const ModalConsultorDetalhes = ({ consultor, isOpen, onClose }) => {
  const [abaAtiva, setAbaAtiva] = useState('informacoes');
  const [familiaData, setFamiliaData] = useState(null);
  const [loadingFamilia, setLoadingFamilia] = useState(false);

  // Buscar família dinamicamente
  useEffect(() => {
    if (consultor?.id && isOpen) {
      fetchFamiliaConsultor(consultor.id);
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
              <div className="info-grid">
                <div className="info-card">
                  <div className="info-icon">
                    <Mail size={20} />
                  </div>
                  <div className="info-details">
                    <label>Email</label>
                    <span>{consultor.email || '-'}</span>
                  </div>
                </div>

                <div className="info-card">
                  <div className="info-icon">
                    <Phone size={20} />
                  </div>
                  <div className="info-details">
                    <label>Telefone</label>
                    <span>{consultor.telefone || '-'}</span>
                  </div>
                </div>

                <div className="info-card">
                  <div className="info-icon">
                    <Calendar size={20} />
                  </div>
                  <div className="info-details">
                    <label>Data de Cadastro</label>
                    <span>{formatarData(consultor.created_at)}</span>
                  </div>
                </div>

                <div className="info-card">
                  <div className="info-icon">
                    <UserCheck size={20} />
                  </div>
                  <div className="info-details">
                    <label>Status</label>
                    <span className={`status-badge ${consultor.is_active ? 'active' : 'inactive'}`}>
                      {consultor.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>

                <div className="info-card full-width">
                  <div className="info-icon">
                    <Building size={20} />
                  </div>
                  <div className="info-details">
                    <label>ID do Usuário</label>
                    <span className="user-id">{consultor.id}</span>
                  </div>
                </div>
              </div>

              {/* Estatísticas Rápidas */}
              <div className="stats-section">
                <h3>📊 Estatísticas da Equipe</h3>
                <div className="stats-grid">
                  <div className="stat-item">
                    <span className="stat-number">{familiaData?.gerentes?.length || 0}</span>
                    <span className="stat-label">Gerentes</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">
                      {(familiaData?.vendedores_diretos?.length || 0) + (familiaData?.vendedores_indiretos?.length || 0)}
                    </span>
                    <span className="stat-label">Vendedores</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">{getTotalEquipe()}</span>
                    <span className="stat-label">Total</span>
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
                              {(() => {
                                const vendedoresDoGerente = familiaData.vendedores_indiretos?.filter(vendedor => 
                                  vendedor.manager_id === gerente.id
                                ) || [];
                                
                                return vendedoresDoGerente.length > 0 ? (
                                  <div className="gerente-vendedores">
                                    <span className="vendedores-label">
                                      👥 {vendedoresDoGerente.length} vendedor(es):
                                    </span>
                                    <div className="vendedores-list">
                                      {vendedoresDoGerente.map(vendedor => (
                                        <div key={vendedor.id} className="vendedor-item">
                                          <User size={14} />
                                          <span>{vendedor.name}</span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : null;
                              })()}
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