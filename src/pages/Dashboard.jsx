// src/pages/Dashboard.jsx - APENAS ESTATÍSTICAS
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import Header from '../components/common/Header';
import Navigation from '../components/common/Navigation';
import storageService from '../services/storageService';

const Dashboard = () => {
  const { user, logout } = useAuth();
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

  return (
    <div className="page-container">
      <div className="container">
        <Header 
          title="AUPUS ENERGIA" 
          subtitle="Sistema de Gestão de Propostas" 
          icon="⚡" 
        />
        
        <Navigation />

        {/* APENAS ESTATÍSTICAS GERAIS */}
        <section className="quick-stats">
          {loading ? (
            <div className="loading-message">
              <p>📊 Carregando estatísticas...</p>
            </div>
          ) : (
            <>
              <div className="stat-card">
                <span className="stat-label">Total de Propostas</span>
                <span className="stat-value">{stats.total}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Aguardando</span>
                <span className="stat-value">{stats.aguardando}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Fechadas</span>
                <span className="stat-value">{stats.fechadas}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Última Proposta</span>
                <span className="stat-value">{stats.ultimaProposta}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">Em Controle</span>
                <span className="stat-value">{stats.totalControle}</span>
              </div>
              <div className="stat-card">
                <span className="stat-label">UGs Cadastradas</span>
                <span className="stat-value">{stats.totalUGs}</span>
              </div>
            </>
          )}
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