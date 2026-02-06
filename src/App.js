// src/App.js - VERSÃO CORRIGIDA COM SISTEMA DE SESSÃO
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { DataProvider } from './context/DataContext';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Importar componentes de sessão (criaremos se não existirem)
import SessionManager from './components/SessionManager';

// Páginas existentes no projeto
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import ProspecPage from './pages/ProspecPage'; // ✅ Esta é a página correta
import NovaPropostaPage from './pages/NovaPropostaPage';
import ControlePage from './pages/ControlePage';
import HistoricoMensalPage from './pages/HistoricoMensalPage';
import UGsPage from './pages/UGsPage';
import RelatoriosPage from './pages/RelatoriosPage';
import LogsPage from './pages/LogsPage';
import ValidacaoAssociadosPage from './pages/ValidacaoAssociadosPage';
import AssociadosPage from './pages/AssociadosPage';

// Estilos
import './dark-theme.css';
import './App.css';

// Componente para escutar eventos de sessão
const SessionEventListener = () => {
  const { logout } = useAuth();

  useEffect(() => {
    // Escutar eventos de sessão expirada
    const handleSessionExpired = async (event) => {
      console.log('🚨 Evento de sessão expirada recebido:', event.detail);
      
      try {
        await logout();
        // O redirecionamento será feito pelo AuthContext
      } catch (error) {
        console.error('Erro ao fazer logout após sessão expirada:', error);
        // Forçar redirecionamento mesmo com erro
        window.location.href = '/login';
      }
    };
    
    // Escutar eventos de token renovado
    const handleTokenRefreshed = (event) => {
      console.log('✅ Token renovado automaticamente:', event.detail);
      // Aqui você pode mostrar uma notificação discreta se quiser
    };

    // Escutar eventos de token expirando
    const handleTokenExpiring = (event) => {
      console.log('⚠️ Token expirando em breve:', event.detail);
      // O SessionManager já cuida do aviso visual
    };

    const handleBeforeUnload = (event) => {
      console.log('🔄 Página sendo recarregada - mantendo sessão ativa');
      sessionStorage.setItem('page_refreshing', 'true');
    };

    const handlePageShow = (event) => {
      if (event.persisted || sessionStorage.getItem('page_refreshing')) {
        console.log('✅ Página restaurada após refresh - sessão mantida');
        sessionStorage.removeItem('page_refreshing');
      }
    };

    // Nos addEventListener existentes, adicionar:
    window.addEventListener('sessionExpired', handleSessionExpired);
    window.addEventListener('tokenRefreshed', handleTokenRefreshed);
    window.addEventListener('tokenExpiring', handleTokenExpiring);
    
    // ✅ ADICIONAR ESTAS 2 LINHAS:
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('pageshow', handlePageShow);

    return () => {
      // No cleanup existente, adicionar:
      window.removeEventListener('sessionExpired', handleSessionExpired);
      window.removeEventListener('tokenRefreshed', handleTokenRefreshed);
      window.removeEventListener('tokenExpiring', handleTokenExpiring);
      
      // ✅ ADICIONAR ESTAS 2 LINHAS:
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('pageshow', handlePageShow);
    };
  }, [logout]);

  return null;
};

// Componente principal da aplicação
const AppContent = () => {
  return (
    <Router>
      <SessionEventListener />
      
      <div className="App">        
        <Routes>
          {/* Rota de Login */}
          <Route path="/login" element={<LoginPage />} />
          
          {/* Rotas Protegidas com SessionManager */}
          <Route path="/" element={
            <ProtectedRoute requirePage="dashboard">
              <SessionManager>
                <Navigate to="/dashboard" replace />
              </SessionManager>
            </ProtectedRoute>
          } />
          
          <Route path="/dashboard" element={
            <ProtectedRoute requirePage="dashboard">
              <SessionManager>
                <Dashboard />
              </SessionManager>
            </ProtectedRoute>
          } />
          
          <Route path="/prospec" element={
            <ProtectedRoute requirePage="prospec">
              <SessionManager>
                <ProspecPage />
              </SessionManager>
            </ProtectedRoute>
          } />
          
          <Route path="/nova-proposta" element={
            <ProtectedRoute requirePage="prospec">
              <SessionManager>
                <NovaPropostaPage />
              </SessionManager>
            </ProtectedRoute>
          } />
          
          <Route path="/controle" element={
            <ProtectedRoute requirePage="controle">
              <SessionManager>
                <ControlePage />
              </SessionManager>
            </ProtectedRoute>
          } />

          <Route path="/controle/historico" element={
            <ProtectedRoute requirePage="controle">
              <SessionManager>
                <HistoricoMensalPage />
              </SessionManager>
            </ProtectedRoute>
          } />

          <Route path="/ugs" element={
            <ProtectedRoute requirePage="ugs">
              <SessionManager>
                <UGsPage />
              </SessionManager>
            </ProtectedRoute>
          } />
          
          <Route path="/relatorios" element={
            <ProtectedRoute requirePage="relatorios">
              <SessionManager>
                <RelatoriosPage />
              </SessionManager>
            </ProtectedRoute>
          } />

          <Route path="/logs" element={
            <ProtectedRoute>
              <SessionManager>
                <LogsPage />
              </SessionManager>
            </ProtectedRoute>
          } />

          <Route path="/validacao-associados" element={
            <ProtectedRoute>
              <SessionManager>
                <ValidacaoAssociadosPage />
              </SessionManager>
            </ProtectedRoute>
          } />

          <Route path="/associados" element={
            <ProtectedRoute>
              <SessionManager>
                <AssociadosPage />
              </SessionManager>
            </ProtectedRoute>
          } />

          {/* Rota 404 */}
          <Route path="*" element={
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-gray-900">404</h1>
                <p className="text-gray-600 mt-2">Página não encontrada</p>
              </div>
            </div>
          } />
        </Routes>
      </div>
    </Router>
  );
};

// Componente App principal
function App() {
  useEffect(() => {
    let initialized = false;
    
    const initializeServices = async () => {
      if (initialized) return;
      initialized = true;
      
      console.log('🚀 Inicializando AUPUS com Sistema de Sessão...');
      console.log('✅ Services inicializados com sucesso');
    };

    initializeServices();
  }, []);

  return (
    <AuthProvider>
      <NotificationProvider>
        <DataProvider>
          <AppContent />
        </DataProvider>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;