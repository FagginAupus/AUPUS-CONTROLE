// src/pages/Dashboard.jsx - Corrigido hierarquia e modais claros
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/common/Header';
import Navigation from '../components/common/Navigation';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  Users, 
  Database, 
  Zap,
  Crown,
  Briefcase,
  User,
  UserPlus,
  X,
  Calendar
} from 'lucide-react';
import storageService from '../services/storageService';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user, createUser, canCreateUser, getMyTeam } = useAuth();
  const { showNotification } = useNotification();
  
  const [estadisticas, setEstatisticas] = useState({
    totalPropostas: 0,
    aguardando: 0,
    fechadas: 0,
    totalUCs: 0,
    totalControle: 0,
    totalUGs: 0
  });
  
  const [modalCadastro, setModalCadastro] = useState({ show: false, type: '' });
  const [equipe, setEquipe] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      carregarDados();
      carregarEquipe();
    }
  }, [user?.id]);

  const carregarDados = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      let dadosProspec = [];
      let dadosControle = [];
      let dadosUGs = [];

      dadosProspec = await storageService.getProspec();

      try {
        dadosControle = await storageService.getControle();
      } catch (error) {
        console.warn('⚠️ Controle clube não disponível:', error.message);
        dadosControle = [];
      }

      if (user?.role === 'admin') {
        try {
          dadosUGs = await storageService.getUGs();
        } catch (error) {
          console.warn('⚠️ UGs não disponíveis:', error.message);
          dadosUGs = [];
        }
      }

      if (user.role !== 'admin') {
        const teamMembers = getMyTeam();
        const teamNames = teamMembers.map(member => member.name);
        
        dadosProspec = dadosProspec.filter(item => 
          teamNames.includes(item.consultor) || 
          teamNames.includes(item.nomeCliente) ||
          item.usuario_id === user.id
        );
        
        dadosControle = dadosControle.filter(item => 
          teamNames.includes(item.consultor) || 
          teamNames.includes(item.nomeCliente) ||
          item.usuario_id === user.id
        );
      }

      setEstatisticas({
        totalPropostas: dadosProspec.length,
        aguardando: dadosProspec.filter(p => p.status === 'Aguardando').length,
        fechadas: dadosProspec.filter(p => p.status === 'Fechado').length,
        totalUCs: new Set(dadosProspec.map(p => p.numeroUC).filter(Boolean)).size,
        totalControle: dadosControle.length,
        totalUGs: dadosUGs.length
      });
      
    } catch (error) {
      console.error('❌ Erro ao carregar dados do dashboard:', error);
      showNotification('Erro ao carregar estatísticas do dashboard', 'error');
    } finally {
      setLoading(false);
    }
  }, [user?.id, user?.role, getMyTeam, showNotification]);

  const carregarEquipe = useCallback(() => {
    if (!user?.id) return;
    
    try {
      const team = getMyTeam();
      
      if (user?.role === 'admin') {
        setEquipe(team.filter(member => member.role === 'consultor'));
      } else {
        setEquipe(team.filter(member => member.id !== user?.id));
      }
    } catch (error) {
      console.error('❌ Erro ao carregar equipe:', error);
    }
  }, [user?.id, user?.role, getMyTeam]);

  const abrirModalCadastro = (type) => {
    if (!canCreateUser(type)) {
      showNotification('Você não tem permissão para criar este tipo de usuário', 'warning');
      return;
    }
    setModalCadastro({ show: true, type });
  };

  const fecharModalCadastro = () => {
    setModalCadastro({ show: false, type: '' });
  };

  const handleCriarUsuario = async (dadosUsuario) => {
    try {
      const result = await createUser({
        ...dadosUsuario,
        role: modalCadastro.type
      });

      if (result.success) {
        showNotification(`${getTipoLabel(modalCadastro.type)} criado(a) com sucesso!`, 'success');
        fecharModalCadastro();
        carregarEquipe();
      } else {
        showNotification(result.message || 'Erro ao criar usuário', 'error');
      }
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      showNotification('Erro interno ao criar usuário', 'error');
    }
  };

  const getTipoLabel = (type) => {
    const labels = {
      consultor: 'Consultor',
      gerente: 'Gerente', 
      vendedor: 'Vendedor'
    };
    return labels[type] || type;
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

  const formatarData = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getGerentesDisponiveis = () => {
    return equipe.filter(member => member.role === 'gerente');
  };

  const getTituloEquipe = () => {
    switch (user?.role) {
      case 'admin':
        return 'Consultores Cadastrados';
      case 'consultor':
        return 'Minha Equipe';
      case 'gerente':
        return 'Minha Equipe';
      default:
        return 'Equipe';
    }
  };

  // Função para determinar quais botões mostrar baseado na hierarquia
  const getBotoesDisponiveis = () => {
    const botoes = [];
    
    switch (user?.role) {
      case 'admin':
        // Admin só cadastra consultor
        if (canCreateUser('consultor')) {
          botoes.push({
            tipo: 'consultor',
            icon: Briefcase,
            label: 'Cadastrar Consultor'
          });
        }
        break;
      
      case 'consultor':
        // Consultor cadastra gerente e vendedor
        if (canCreateUser('gerente')) {
          botoes.push({
            tipo: 'gerente',
            icon: Users,
            label: 'Cadastrar Gerente'
          });
        }
        if (canCreateUser('vendedor')) {
          botoes.push({
            tipo: 'vendedor',
            icon: User,
            label: 'Cadastrar Vendedor'
          });
        }
        break;
      
      case 'gerente':
        // Gerente só cadastra vendedor
        if (canCreateUser('vendedor')) {
          botoes.push({
            tipo: 'vendedor',
            icon: User,
            label: 'Cadastrar Vendedor'
          });
        }
        break;
      
      case 'vendedor':
        // Vendedor não cadastra ninguém
        break;
    }
    
    return botoes;
  };

  const StatCard = ({ icon: Icon, label, value }) => (
    <div className="stat-card">
      <div className="stat-icon">
        <Icon size={32} style={{ color: '#f0f0f0', opacity: 0.8 }} />
      </div>
      <div className="stat-content">
        <span className="stat-label">{label}</span>
        <span className="stat-value">{value}</span>
      </div>
    </div>
  );

  const RoleIcon = getRoleIcon(user?.role);
  const botoesDisponiveis = getBotoesDisponiveis();

  return (
    <div className="page-container">
      <div className="container">
        <Header 
          title={`Bem-vindo(a), ${user?.name}!`}
        />
        <Navigation />
        
        {/* Estatísticas Rápidas */}
        <section className="quick-stats">
          <StatCard 
            icon={FileText} 
            label="Total Propostas" 
            value={estadisticas.totalPropostas}
          />
          <StatCard 
            icon={Clock} 
            label="Aguardando" 
            value={estadisticas.aguardando}
          />
          <StatCard 
            icon={CheckCircle} 
            label="Fechadas" 
            value={estadisticas.fechadas}
          />
          <StatCard 
            icon={Database} 
            label="Total UCs" 
            value={estadisticas.totalUCs}
          />
          {user?.role === 'admin' && (
            <StatCard 
              icon={Zap} 
              label="UGs Cadastradas" 
              value={estadisticas.totalUGs}
            />
          )}
        </section>

        {/* Cadastro de Usuários - Hierarquia Correta */}
        {botoesDisponiveis.length > 0 && (
          <section className="user-management">
            <h2>
              <Users size={24} />
              Gerenciar Equipe
            </h2>
            
            <div className="management-actions">
              {botoesDisponiveis.map((botao) => {
                const IconComponent = botao.icon;
                return (
                  <button 
                    key={botao.tipo}
                    onClick={() => abrirModalCadastro(botao.tipo)}
                    className={`create-user-btn ${botao.tipo}`}
                  >
                    <span className="btn-icon">
                      <IconComponent size={20} />
                    </span>
                    <span className="btn-label">{botao.label}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Lista da Equipe */}
        {equipe.length > 0 && (
          <section className="user-management">
            <div className="team-list">
              <h3>{getTituloEquipe()} ({equipe.length})</h3>
              <div className="team-grid">
                {equipe.map(member => {
                  const MemberIcon = getRoleIcon(member.role);
                  return (
                    <div key={member.id} className="team-member">
                      <div className="member-avatar">
                        <span className="member-icon">
                          <MemberIcon size={24} />
                        </span>
                      </div>
                      <div className="member-info">
                        <h4>{member.name}</h4>
                        <p className="member-role">{getTipoLabel(member.role)}</p>
                        <p className="member-email">{member.email}</p>
                        <p className="member-date">
                          <Calendar size={14} />
                          Desde: {formatarData(member.created_at)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Modal de Cadastro */}
        {modalCadastro.show && (
          <ModalCadastroUsuario 
            tipo={modalCadastro.type}
            onClose={fecharModalCadastro}
            onSubmit={handleCriarUsuario}
            gerentes={getGerentesDisponiveis()}
          />
        )}
      </div>
    </div>
  );
};

// Modal de Cadastro - TEMA CLARO
const ModalCadastroUsuario = ({ tipo, onClose, onSubmit, gerentes }) => {
  const [dados, setDados] = useState({
    name: '',
    username: '',
    password: '',
    managerId: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!dados.name.trim() || !dados.username.trim() || !dados.password.trim()) {
      return;
    }

    setLoading(true);
    await onSubmit(dados);
    setLoading(false);
  };

  const getTipoLabel = (type) => {
    const labels = {
      consultor: 'Consultor',
      gerente: 'Gerente', 
      vendedor: 'Vendedor'
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="modal-overlay-light">
        <div className="modal-light loading-modal">
          <p>Criando usuário...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="modal-overlay-light" onClick={onClose}>
      <div className="modal-light" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-light">
          <h3>
            <UserPlus size={20} />
            Cadastrar {getTipoLabel(tipo)}
          </h3>
          <button onClick={onClose} className="btn-close-light">
            <X size={18} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body-light">
          <div className="form-group-light">
            <label>Nome Completo:</label>
            <input
              type="text"
              value={dados.name}
              onChange={(e) => setDados({...dados, name: e.target.value})}
              placeholder="Digite o nome completo"
              required
            />
          </div>

          <div className="form-group-light">
            <label>Nome de Usuário:</label>
            <input
              type="text"
              value={dados.username}
              onChange={(e) => setDados({...dados, username: e.target.value})}
              placeholder="Digite o nome de usuário"
              required
            />
          </div>

          <div className="form-group-light">
            <label>Senha:</label>
            <input
              type="password"
              value={dados.password}
              onChange={(e) => setDados({...dados, password: e.target.value})}
              placeholder="Digite a senha"
              required
            />
          </div>

          {tipo === 'vendedor' && gerentes.length > 0 && (
            <div className="form-group-light">
              <label>Gerente Responsável:</label>
              <select
                value={dados.managerId}
                onChange={(e) => setDados({...dados, managerId: e.target.value})}
              >
                <option value="">Selecione um gerente...</option>
                {gerentes.map(gerente => (
                  <option key={gerente.id} value={gerente.id}>
                    {gerente.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="modal-footer-light">
            <button type="button" onClick={onClose} className="btn-secondary-light">
              Cancelar
            </button>
            <button type="submit" className="btn-primary-light" disabled={loading}>
              {loading ? 'Salvando...' : `Criar ${getTipoLabel(tipo)}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Dashboard;