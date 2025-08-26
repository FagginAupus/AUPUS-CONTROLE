// src/pages/Dashboard.jsx - Dashboard corrigido com equipe para admin
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/common/Header';
import Navigation from '../components/common/Navigation';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
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

  // Carregar dados do dashboard

  useEffect(() => {
    if (user?.id) {
      carregarDados();
      carregarEquipe();
    }
  }, [user?.id]); // Apenas user.id como dependency

const carregarDados = useCallback(async () => {
  if (!user?.id) return; // Evitar carregar se user não existe
  
  try {
    setLoading(true);
    
    let dadosProspec = [];
    let dadosControle = [];
    let dadosUGs = [];

    // Admin vê todos os dados
    dadosProspec = await storageService.getProspec();

    // Tentar carregar controle clube apenas se necessário
    try {
      dadosControle = await storageService.getControle();
    } catch (error) {
      console.warn('⚠️ Controle clube não disponível:', error.message);
      dadosControle = [];
    }

    // Carregar UGs apenas para admin
    if (user?.role === 'admin') {
      try {
        dadosUGs = await storageService.getUGs();
      } catch (error) {
        console.warn('⚠️ UGs não disponíveis:', error.message);
        dadosUGs = [];
      }
    }

    // Filtrar dados por hierarquia apenas se não for admin
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
        // Admin vê apenas consultores
        setEquipe(team.filter(member => member.role === 'consultor'));
      } else {
        // Outros roles veem sua equipe completa (exceto eles mesmos)
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
      admin: '👑',
      consultor: '👔',
      gerente: '👨‍💼',
      vendedor: '👨‍💻'
    };

    return icons[role] || '👤';
  };

  const formatarData = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // Obter gerentes disponíveis para atribuir vendedores
  const getGerentesDisponiveis = () => {
    return equipe.filter(member => member.role === 'gerente');
  };

  // Função para obter o título da seção baseado no role
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

  return (
    <div className="page-container">
      <div className="container">
        <Header 
          title={`Bem-vindo(a), ${user?.name}!`}
        />
        <Navigation />
        {/* Estatísticas Rápidas */}
        <section className="quick-stats">
          <div className="stat-card">
            <div className="stat-content">
              <span className="stat-label">Total Propostas</span>
              <span className="stat-value">{estadisticas.totalPropostas}</span>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-content">
              <span className="stat-label">Aguardando</span>
              <span className="stat-value">{estadisticas.aguardando}</span>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-content">
              <span className="stat-label">Fechadas</span>
              <span className="stat-value">{estadisticas.fechadas}</span>
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-content">
              <span className="stat-label">Total UCs</span>
              <span className="stat-value">{estadisticas.totalUCs}</span>
            </div>
          </div>

          {user?.role === 'admin' && (
            <div className="stat-card">
              <div className="stat-content">
                <span className="stat-label">UGs Cadastradas</span>
                <span className="stat-value">{estadisticas.totalUGs}</span>
              </div>
            </div>
          )}
        </section>

        {/* Cadastro de Usuários */}
        {(canCreateUser('consultor') || canCreateUser('gerente') || canCreateUser('vendedor')) && (
          <section className="user-management">
            <h2>👥 Gerenciar Equipe</h2>
            
            <div className="management-actions">
              {canCreateUser('consultor') && (
                <button 
                  onClick={() => abrirModalCadastro('consultor')}
                  className="create-user-btn consultor"
                >
                  <span className="btn-icon">👔</span>
                  <span className="btn-label">Cadastrar Consultor</span>
                </button>
              )}

              {canCreateUser('gerente') && (
                <button 
                  onClick={() => abrirModalCadastro('gerente')}
                  className="create-user-btn gerente"
                >
                  <span className="btn-icon">👨‍💼</span>
                  <span className="btn-label">Cadastrar Gerente</span>
                </button>
              )}

              {canCreateUser('vendedor') && (
                <button 
                  onClick={() => abrirModalCadastro('vendedor')}
                  className="create-user-btn vendedor"
                >
                  <span className="btn-icon">👨‍💻</span>
                  <span className="btn-label">Cadastrar Vendedor</span>
                </button>
              )}
            </div>
          </section>
        )}

        {/* Lista da Equipe - ALTERAÇÃO: Mostrar para todos os roles que têm equipe */}
        {equipe.length > 0 && (
          <section className="user-management">
            <div className="team-list">
              <h3>{getTituloEquipe()} ({equipe.length})</h3>
              <div className="team-grid">
                {equipe.map(member => (
                  <div key={member.id} className="team-member">
                    <div className="member-avatar">
                      <span className="member-icon">{getRoleIcon(member.role)}</span>
                    </div>
                    <div className="member-info">
                      <h4>{member.name}</h4>
                      <p className="member-role">{getTipoLabel(member.role)}</p>
                      <p className="member-username">@{member.username}</p>
                      <p className="member-date">Criado em {formatarData(member.createdAt)}</p>
                      {member.managerId && (
                        <p className="member-manager">
                          Gerente: {equipe.find(g => g.id === member.managerId)?.name || 'N/A'}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Modal de Cadastro */}
        {modalCadastro.show && (
          <ModalCadastroUsuario
            tipo={modalCadastro.type}
            gerentes={getGerentesDisponiveis()}
            onSave={handleCriarUsuario}
            onClose={fecharModalCadastro}
          />
        )}
      </div>
    </div>
  );
};

// Componente Modal de Cadastro de Usuário
const ModalCadastroUsuario = ({ tipo, gerentes, onSave, onClose }) => {
  const [dados, setDados] = useState({
    name: '',
    username: '',
    password: '',
    managerId: '' // ID do gerente para vendedores
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!dados.name || !dados.username || !dados.password) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }

    if (dados.password.length < 3) {
      alert('Senha deve ter pelo menos 3 caracteres');
      return;
    }

    setLoading(true);
    await onSave(dados);
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
      <div className="page-container">
        <div className="container">
          <Header 
            title="DASHBOARD" 
            subtitle="Painel de Controle" 
            icon="📊" 
          />
          <Navigation />
          
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <p>Carregando dados do dashboard...</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>➕ Cadastrar {getTipoLabel(tipo)}</h3>
          <button onClick={onClose} className="btn btn-close">✕</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label>Nome Completo:</label>
            <input
              type="text"
              value={dados.name}
              onChange={(e) => setDados({...dados, name: e.target.value})}
              placeholder="Digite o nome completo"
              required
            />
          </div>

          <div className="form-group">
            <label>Nome de Usuário:</label>
            <input
              type="text"
              value={dados.username}
              onChange={(e) => setDados({...dados, username: e.target.value})}
              placeholder="Digite o nome de usuário"
              required
            />
          </div>

          <div className="form-group">
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
            <div className="form-group">
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

          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Salvando...' : `Criar ${getTipoLabel(tipo)}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Dashboard;