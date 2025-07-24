// src/pages/Dashboard.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/common/Header';
import Navigation from '../components/common/Navigation';
import './Dashboard.css';

const Dashboard = () => {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
  };

  const navigateTo = (path) => {
    navigate(path);
  };

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="container">
        <Header 
          title="AUPUS ENERGIA" 
          subtitle="Sistema de Gestão de Propostas" 
          icon="⚡" 
        />
        
        <Navigation />

        {/* Conteúdo Principal */}
        <div className="dashboard-content">
          <div className="welcome-section">
            <div className="welcome-card">
              <h2>🎉 Bem-vindo ao Sistema!</h2>
              <div className="user-info">
                <div className="user-avatar">
                  {user?.role === 'admin' && '👑'}
                  {user?.role === 'consultor' && '👤'}
                  {user?.role === 'operador' && '⚙️'}
                </div>
                <div className="user-details">
                  <h3>{user?.name}</h3>
                  <p className="user-role">
                    {user?.role === 'admin' && 'Administrador'}
                    {user?.role === 'consultor' && 'Consultor'}
                    {user?.role === 'operador' && 'Operador'}
                  </p>
                </div>
              </div>
              
              <div className="permissions-info">
                <h4>🔐 Suas Permissões:</h4>
                <div className="permissions-list">
                  {user?.permissions?.includes('all') ? (
                    <span className="permission-badge admin">Todas as Permissões</span>
                  ) : (
                    user?.permissions?.map(permission => (
                      <span key={permission} className="permission-badge">
                        {permission}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="quick-actions">
                <h4>🚀 Ações Rápidas:</h4>
                <div className="actions-grid">
                  <button 
                    className="action-btn" 
                    disabled={!hasPermission('nova-proposta')}
                    onClick={() => navigateTo('/nova-proposta')}
                  >
                    📝 Nova Proposta
                    {!hasPermission('nova-proposta') && <small>Sem permissão</small>}
                  </button>
                  
                  <button 
                    className="action-btn active" 
                    disabled={!hasPermission('prospec')}
                    onClick={() => navigateTo('/prospec')}
                  >
                    📊 PROSPEC
                    {hasPermission('prospec') && <small>✅ Disponível</small>}
                    {!hasPermission('prospec') && <small>Sem permissão</small>}
                  </button>
                  
                  <button 
                    className="action-btn" 
                    disabled={!hasPermission('controle')}
                    onClick={() => navigateTo('/controle')}
                  >
                    ✅ CONTROLE
                    {!hasPermission('controle') && <small>Sem permissão</small>}
                  </button>
                  
                  <button 
                    className="action-btn" 
                    disabled={!hasPermission('ugs')}
                    onClick={() => navigateTo('/ugs')}
                  >
                    🏢 Unidades Geradoras
                    {!hasPermission('ugs') && <small>Sem permissão</small>}
                  </button>
                </div>
              </div>

              <div className="logout-section">
                <button onClick={handleLogout} className="logout-btn">
                  🚪 Sair do Sistema
                </button>
              </div>
            </div>
          </div>

          {/* Informações do Sistema */}
          <div className="system-info">
            <div className="info-card">
              <h3>📈 Status do Sistema</h3>
              <div className="status-grid">
                <div className="status-item">
                  <span className="status-label">Versão:</span>
                  <span className="status-value">React 1.0.0</span>
                </div>
                <div className="status-item">
                  <span className="status-label">Último Login:</span>
                  <span className="status-value">
                    {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}
                  </span>
                </div>
                <div className="status-item">
                  <span className="status-label">Status:</span>
                  <span className="status-value online">🟢 Online</span>
                </div>
              </div>
            </div>

            <div className="info-card">
              <h3>🔧 Desenvolvimento</h3>
              <p>Esta é a versão inicial do sistema React.</p>
              <p>As funcionalidades estão sendo migradas gradualmente do sistema original.</p>
              <div className="progress-info">
                <div className="progress-bar">
                  <div className="progress-fill" style={{width: '40%'}}></div>
                </div>
                <span className="progress-text">40% Concluído</span>
              </div>
              
              <div className="completed-features">
                <h5>✅ Funcionalidades Prontas:</h5>
                <ul>
                  <li>Sistema de Login</li>
                  <li>Dashboard</li>
                  <li>PROSPEC (visualização)</li>
                  <li>Navegação entre páginas</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;