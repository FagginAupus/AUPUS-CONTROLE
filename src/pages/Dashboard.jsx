// src/pages/Dashboard.jsx - SEM WARNINGS DE ESLINT
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Header from '../components/common/Header';
import Navigation from '../components/common/Navigation';
import storageService from '../services/storageService';
import './Dashboard.css';

const Dashboard = () => {
  const { user, logout } = useAuth(); // Removido hasPermission não usado
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total: 0,
    aguardando: 0,
    fechadas: 0,
    ultimaProposta: '-',
    totalControle: 0,
    totalUGs: 0
  });
  const [loading, setLoading] = useState(true);

  const carregarEstatisticas = useCallback(async () => {
    try {
      setLoading(true);
      
      // Carregar estatísticas reais do localStorage
      const estatisticas = await storageService.getEstatisticas();
      setStats(estatisticas);
      
      console.log('📊 Estatísticas carregadas:', estatisticas);
      
    } catch (error) {
      console.error('❌ Erro ao carregar estatísticas:', error);
      // Em caso de erro, manter valores zerados
      setStats({
        total: 0,
        aguardando: 0,
        fechadas: 0,
        ultimaProposta: '-',
        totalControle: 0,
        totalUGs: 0
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregarEstatisticas();
    
    // Atualizar a cada 30 segundos como no original
    const interval = setInterval(carregarEstatisticas, 30000);
    return () => clearInterval(interval);
  }, [carregarEstatisticas]);

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

        {/* Estatísticas Gerais - DADOS REAIS DO LOCALSTORAGE */}
        <section className="stats">
          <h2>📈 Resumo Geral</h2>
          {loading ? (
            <div className="loading-stats">
              <p>Carregando estatísticas...</p>
            </div>
          ) : (
            <div className="stats-grid">
              <div className="stat-card">
                <h3>Total de Propostas</h3>
                <div className="stat-number">{stats.total}</div>
                <small>Todas as propostas criadas</small>
              </div>
              <div className="stat-card">
                <h3>Aguardando</h3>
                <div className="stat-number">{stats.aguardando}</div>
                <small>Propostas em andamento</small>
              </div>
              <div className="stat-card">
                <h3>Fechadas</h3>
                <div className="stat-number">{stats.fechadas}</div>
                <small>Propostas finalizadas</small>
              </div>
              <div className="stat-card">
                <h3>Última Proposta</h3>
                <div className="stat-number">{stats.ultimaProposta}</div>
                <small>Proposta mais recente</small>
              </div>
              <div className="stat-card">
                <h3>Em Controle</h3>
                <div className="stat-number">{stats.totalControle}</div>
                <small>Propostas fechadas em controle</small>
              </div>
              <div className="stat-card">
                <h3>UGs Cadastradas</h3>
                <div className="stat-number">{stats.totalUGs}</div>
                <small>Unidades Geradoras</small>
              </div>
            </div>
          )}
        </section>

        {/* Ações Rápidas */}
        <section className="quick-actions">
          <h2>🚀 Ações Rápidas</h2>
          <div className="actions-grid">
            <button 
              className="action-card primary"
              onClick={() => navigateTo('/prospec')}
            >
              <span className="action-icon">📋</span>
              <h3>Prospecção</h3>
              <p>Gerenciar propostas e leads</p>
            </button>
            
            <button 
              className="action-card secondary"
              onClick={() => navigateTo('/controle')}
            >
              <span className="action-icon">⚙️</span>
              <h3>Controle</h3>
              <p>Controlar propostas fechadas</p>
            </button>
            
            <button 
              className="action-card tertiary"
              onClick={() => navigateTo('/ugs')}
            >
              <span className="action-icon">🏭</span>
              <h3>UGs</h3>
              <p>Gerenciar Unidades Geradoras</p>
            </button>
            
            <button 
              className="action-card quaternary"
              onClick={() => navigateTo('/relatorios')}
            >
              <span className="action-icon">📊</span>
              <h3>Relatórios</h3>
              <p>Gerar relatórios e análises</p>
            </button>
          </div>
        </section>

        {/* Status do Sistema */}
        <section className="system-status">
          <h2>🔧 Status do Sistema</h2>
          <div className="status-grid">
            <div className="status-item">
              <span className="status-indicator online"></span>
              <span>Storage Local: Ativo</span>
            </div>
            <div className="status-item">
              <span className="status-indicator online"></span>
              <span>Sistema: Operacional</span>
            </div>
            <div className="status-item">
              <span className="status-indicator">📱</span>
              <span>Usuário: {user?.nome || 'Admin'}</span>
            </div>
          </div>
        </section>

        {/* Botão de Logout */}
        <div className="logout-section">
          <button 
            className="logout-btn"
            onClick={handleLogout}
          >
            🚪 Sair do Sistema
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;