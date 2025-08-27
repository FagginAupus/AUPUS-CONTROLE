// src/pages/Dashboard.jsx - Corrigido hierarquia e modais claros
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/common/Header';
import Navigation from '../components/common/Navigation';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { useData } from '../context/DataContext';
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
  const { dashboard, loadDashboard, afterCreateUser } = useData(); // USAR DATACONTEXT
  
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
        
        // Notificar DataContext sobre novo usuário
        if (afterCreateUser) {
          afterCreateUser(result.data);
        }
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
// Modal de Cadastro - TEMA CLARO
const ModalCadastroUsuario = ({ tipo, onClose, onSubmit, gerentes }) => {
  const [dados, setDados] = useState({
    nome: '',
    email: '',
    telefone: '',
    cpf_cnpj: '',
    endereco: '',
    cidade: '',
    estado: '',
    cep: '',
    pix: '',
    password: '00000000', // Senha padrão
    managerId: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!dados.nome.trim() || !dados.email.trim() || !dados.telefone.trim() || 
        !dados.cpf_cnpj.trim() || !dados.endereco.trim() || !dados.cidade.trim() || 
        !dados.estado.trim() || !dados.cep.trim()) {
      return;
    }

    // Validar PIX obrigatório para consultor
    if (tipo === 'consultor' && !dados.pix.trim()) {
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

  const isPixObrigatorio = tipo === 'consultor';

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
            <label>Nome Completo <span style={{color: 'red'}}>*</span>:</label>
            <input
              type="text"
              value={dados.nome}
              onChange={(e) => setDados({...dados, nome: e.target.value})}
              placeholder="Digite o nome completo"
              required
            />
          </div>

          <div className="form-group-light">
            <label>Email <span style={{color: 'red'}}>*</span>:</label>
            <input
              type="email"
              value={dados.email}
              onChange={(e) => setDados({...dados, email: e.target.value})}
              placeholder="Digite o email"
              required
            />
          </div>

          <div className="form-group-light">
            <label>Celular <span style={{color: 'red'}}>*</span>:</label>
            <input
              type="text"
              value={dados.telefone}
              onChange={(e) => setDados({...dados, telefone: e.target.value})}
              placeholder="Digite o celular"
              required
            />
          </div>

          <div className="form-group-light">
            <label>CPF <span style={{color: 'red'}}>*</span>:</label>
            <input
              type="text"
              value={dados.cpf_cnpj}
              onChange={(e) => setDados({...dados, cpf_cnpj: e.target.value})}
              placeholder="Digite o CPF"
              required
            />
          </div>

          <div className="form-group-light">
            <label>Endereço <span style={{color: 'red'}}>*</span>:</label>
            <input
              type="text"
              value={dados.endereco}
              onChange={(e) => setDados({...dados, endereco: e.target.value})}
              placeholder="Digite o endereço completo"
              required
            />
          </div>

          <div className="form-group-light">
            <label>Cidade <span style={{color: 'red'}}>*</span>:</label>
            <input
              type="text"
              value={dados.cidade}
              onChange={(e) => setDados({...dados, cidade: e.target.value})}
              placeholder="Digite a cidade"
              required
            />
          </div>

          <div className="form-group-light">
            <label>Estado <span style={{color: 'red'}}>*</span>:</label>
            <input
              type="text"
              value={dados.estado}
              onChange={(e) => setDados({...dados, estado: e.target.value})}
              placeholder="Ex: GO"
              maxLength={2}
              required
            />
          </div>

          <div className="form-group-light">
            <label>CEP <span style={{color: 'red'}}>*</span>:</label>
            <input
              type="text"
              value={dados.cep}
              onChange={(e) => setDados({...dados, cep: e.target.value})}
              placeholder="Digite o CEP"
              required
            />
          </div>

          <div className="form-group-light">
            <label>
              Chave PIX 
              {isPixObrigatorio ? (
                <span style={{color: 'red'}}> *</span>
              ) : (
                <span style={{color: '#666', fontSize: '0.9em'}}> (Opcional)</span>
              )}:
            </label>
            <input
              type="text"
              value={dados.pix}
              onChange={(e) => setDados({...dados, pix: e.target.value})}
              placeholder="Digite a chave PIX"
              required={isPixObrigatorio}
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