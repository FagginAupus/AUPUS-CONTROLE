// src/pages/RelatoriosPage.jsx - Sistema Completo de Relatórios
import React, { useState, useEffect } from 'react';
import Header from '../components/common/Header';
import Navigation from '../components/common/Navigation';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { Lock } from 'lucide-react';

// Componentes de relatórios
import DashboardExecutivo from '../components/relatorios/DashboardExecutivo';

// Componentes utilitários
import FiltrosPeriodo from '../components/relatorios/FiltrosPeriodo';

import './RelatoriosPage.css';

const RelatoriosPage = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [globalFilters, setGlobalFilters] = useState({
    dataInicio: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    dataFim: new Date().toISOString().split('T')[0],
    consultor: '',
    status: ''
  });
  const [loading, setLoading] = useState(false);

  // Verificar se usuário tem acesso aos relatórios
  const hasAccess = user?.role === 'admin' || user?.role === 'analista';

  useEffect(() => {
    if (!hasAccess) {
      showNotification('Acesso negado. Apenas administradores e analistas podem acessar relatórios.', 'error');
    }
  }, [hasAccess, showNotification]);

  if (!hasAccess) {
    return (
      <div className="page-container">
        <div className="container">
          <Header title="Relatórios" />
          <Navigation />

          <div className="access-denied">
            <div className="access-denied-content">
              <h2><Lock className="inline-icon" /> Acesso Restrito</h2>
              <p>Apenas administradores e analistas podem acessar os relatórios do sistema.</p>
              <p>Seu perfil atual: <strong>{user?.role || 'Não definido'}</strong></p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleFilterChange = (newFilters) => {
    setGlobalFilters(prev => ({ ...prev, ...newFilters }));
  };

  return (
    <div className="page-container">
      <div className="container">
        <Header
          title="Relatórios Executivos"
          subtitle="Sistema completo de análise e relatórios"
        />
        <Navigation />

        <div className="relatorios-container">
          {/* Filtros Globais */}
          <div className="global-filters">
            <FiltrosPeriodo
              filters={globalFilters}
              onFilterChange={handleFilterChange}
              loading={loading}
            />
          </div>

          {/* Dashboard Executivo */}
          <div className="dashboard-content">
            {loading && (
              <div className="loading-overlay">
                <div className="loading-spinner"></div>
                <p>Carregando relatório...</p>
              </div>
            )}

            <div className={`content-wrapper ${loading ? 'loading' : ''}`}>
              <DashboardExecutivo
                filters={globalFilters}
                loading={loading}
                setLoading={setLoading}
                onNotification={showNotification}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RelatoriosPage;