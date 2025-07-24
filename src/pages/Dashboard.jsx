// src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/common/Header';
import Navigation from '../components/common/Navigation';
import './Dashboard.css';

const Dashboard = () => {
  const { user, logout, hasPermission } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total: 0,
    aguardando: 0,
    fechadas: 0,
    ultimaProposta: '-'
  });

  useEffect(() => {
    carregarEstatisticas();
    
    // Atualizar a cada 30 segundos como no original
    const interval = setInterval(carregarEstatisticas, 30000);
    return () => clearInterval(interval);
  }, []);

  const carregarEstatisticas = async () => {
    try {
      // Simular carregamento de dados (depois conectar com o storage real)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Dados mock que simulam as estatísticas do sistema original
      setStats({
        total: 25,
        aguardando: 18,
        fechadas: 7,
        ultimaProposta: '2025/0025'
      });
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const navigateTo = (path) => {
    navigate(path);
  };

  return (
    <div className="dashboard-container">
      <div className="container">
        <Header 
          title="AUPUS ENERGIA" 
          subtitle="Sistema de Gestão de Propostas" 
          icon="⚡" 
        />
        
        <Navigation />

        {/* Estatísticas Gerais - IGUAIS AO ORIGINAL */}
        <section className="stats">
          <h2>📈 Resumo Geral</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Total de Propostas</h3>
              <div className="stat-number">{stats.total}</div>
            </div>
            <div className="stat-card">
              <h3>Aguardando</h3>
              <div className="stat-number">{stats.aguardando}</div>
            </div>
            <div className="stat-card">
              <h3>Fechadas</h3>
              <div className="stat-number">{stats.fechadas}</div>
            </div>
            <div className="stat-card">
              <h3>Última Proposta</h3>
              <div className="stat-number">{stats.ultimaProposta}</div>
            </div>
          </div>
        </section>

        {/* Informações do Usuário - Compacto */}
        <section className="user-section">
          <div className="user-card">
            <div className="user-header">
              <div className="user-avatar">
                {user?.role === 'admin' && '👑'}
                {user?.role === 'consultor' && '👤'}
                {user?.role === 'operador' && '⚙️'}
              </div>
              <div className="user-info">
                <h3>{user?.name}</h3>
                <p className="user-role">
                  {user?.role === 'admin' && 'Administrador'}
                  {user?.role === 'consultor' && 'Consultor'}
                  {user?.role === 'operador' && 'Operador'}
                </p>
              </div>
              <button className="logout-btn" onClick={handleLogout}>
                🚪 Sair
              </button>
            </div>
            
            <div className="permissions-info">
              <h4>🔐 Permissões:</h4>
              <div className="permissions-list">
                {user?.permissions?.includes('all') ? (
                  <span className="permission-badge admin">✅ Acesso Total</span>
                ) : (
                  <div className="permissions-grid">
                    {user?.permissions?.includes('nova-proposta') && (
                      <span className="permission-badge">📝 Nova Proposta</span>
                    )}
                    {user?.permissions?.includes('prospec') && (
                      <span className="permission-badge">📊 PROSPEC</span>
                    )}
                    {user?.permissions?.includes('controle') && (
                      <span className="permission-badge">✅ Controle</span>
                    )}
                    {user?.permissions?.includes('ugs') && (
                      <span className="permission-badge">🏢 UGs</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Dashboard;