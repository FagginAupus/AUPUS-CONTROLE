// src/pages/RelatoriosPage.jsx - Sistema Completo de Relatórios
import React, { useState, useEffect } from 'react';
import Header from '../components/common/Header';
import Navigation from '../components/common/Navigation';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import {
  BarChart3,
  Trophy,
  FileText,
  Settings,
  DollarSign,
  TrendingUp,
  Download,
  Lock
} from 'lucide-react';

// Componentes de relatórios
import DashboardExecutivo from '../components/relatorios/DashboardExecutivo';
import RankingConsultores from '../components/relatorios/RankingConsultores';
import AnalisePropostas from '../components/relatorios/AnalisePropostas';
import ControleClube from '../components/relatorios/ControleClube';
import RelatoriosFinanceiros from '../components/relatorios/RelatoriosFinanceiros';
import Produtividade from '../components/relatorios/Produtividade';
import ExportarDados from '../components/relatorios/ExportarDados';

// Componentes utilitários
import FiltrosPeriodo from '../components/relatorios/FiltrosPeriodo';

import './RelatoriosPage.css';

const RelatoriosPage = () => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  const [activeTab, setActiveTab] = useState('dashboard');
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

  const tabs = [
    { id: 'dashboard', label: 'Dashboard Executivo', icon: BarChart3 },
    { id: 'ranking', label: 'Ranking Consultores', icon: Trophy },
    { id: 'propostas', label: 'Análise de Propostas', icon: FileText },
    { id: 'controle', label: 'Controle Clube', icon: Settings },
    { id: 'financeiro', label: 'Relatórios Financeiros', icon: DollarSign },
    { id: 'produtividade', label: 'Produtividade', icon: TrendingUp },
    { id: 'exportar', label: 'Exportar Dados', icon: Download }
  ];

  const handleFilterChange = (newFilters) => {
    setGlobalFilters(prev => ({ ...prev, ...newFilters }));
  };

  const renderTabContent = () => {
    const commonProps = {
      filters: globalFilters,
      loading: loading,
      setLoading: setLoading,
      onNotification: showNotification
    };

    switch (activeTab) {
      case 'dashboard':
        return <DashboardExecutivo {...commonProps} />;
      case 'ranking':
        return <RankingConsultores {...commonProps} />;
      case 'propostas':
        return <AnalisePropostas {...commonProps} />;
      case 'controle':
        return <ControleClube {...commonProps} />;
      case 'financeiro':
        return <RelatoriosFinanceiros {...commonProps} />;
      case 'produtividade':
        return <Produtividade {...commonProps} />;
      case 'exportar':
        return <ExportarDados {...commonProps} />;
      default:
        return <DashboardExecutivo {...commonProps} />;
    }
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

          {/* Navegação por Tabs */}
          <div className="tabs-container">
            <div className="tabs-header">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(tab.id)}
                  disabled={loading}
                >
                  <tab.icon className="tab-icon" size={18} />
                  <span className="tab-label">{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Conteúdo da Tab Ativa */}
            <div className="tab-content">
              {loading && (
                <div className="loading-overlay">
                  <div className="loading-spinner"></div>
                  <p>Carregando relatório...</p>
                </div>
              )}

              <div className={`content-wrapper ${loading ? 'loading' : ''}`}>
                {renderTabContent()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RelatoriosPage;