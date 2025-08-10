// src/App.js - Roteamento com controle de acesso hierárquico - ATUALIZADO
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Importar os services para inicializar globalmente
import storageService from './services/storageService';
import apiService from './services/apiService';

// Páginas
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import ProspecPage from './pages/ProspecPage';
import NovaPropostaPage from './pages/NovaPropostaPage';
import ControlePage from './pages/ControlePage';
import UGsPage from './pages/UGsPage';
import RelatoriosPage from './pages/RelatoriosPage';

// Componente para status da API
import ApiStatusIndicator from './components/common/ApiStatusIndicator';

// Estilos globais
import './App.css';

function App() {
  useEffect(() => {
    // Inicializar serviços quando o app carrega
    const initializeServices = async () => {
      console.log('🚀 Inicializando AUPUS...');
      
      try {
        // Detectar modo de operação (API ou localStorage)
        await storageService.detectarModoOperacao();
        console.log('✅ Services inicializados');
      } catch (error) {
        console.error('❌ Erro na inicialização dos services:', error);
      }
    };

    initializeServices();
  }, []);

  return (
    <AuthProvider>
      <NotificationProvider>
        <Router>
          <div className="App">
            {/* Indicador de status da API */}
            <ApiStatusIndicator />
            
            <Routes>
              {/* Rota de Login */}
              <Route path="/login" element={<LoginPage />} />
              
              {/* Rotas Protegidas */}
              <Route path="/" element={
                <ProtectedRoute requirePage="dashboard">
                  <Dashboard />
                </ProtectedRoute>
              } />
              
              <Route path="/dashboard" element={
                <ProtectedRoute requirePage="dashboard">
                  <Dashboard />
                </ProtectedRoute>
              } />
              
              <Route path="/prospec" element={
                <ProtectedRoute requirePage="prospec">
                  <ProspecPage />
                </ProtectedRoute>
              } />
              
              <Route path="/nova-proposta" element={
                <ProtectedRoute requirePage="prospec">
                  <NovaPropostaPage />
                </ProtectedRoute>
              } />
              
              <Route path="/controle" element={
                <ProtectedRoute requirePage="controle">
                  <ControlePage />
                </ProtectedRoute>
              } />
              
              {/* UGs apenas para admin */}
              <Route path="/ugs" element={
                <ProtectedRoute requirePage="ugs">
                  <UGsPage />
                </ProtectedRoute>
              } />
              
              <Route path="/relatorios" element={
                <ProtectedRoute requirePage="relatorios">
                  <RelatoriosPage />
                </ProtectedRoute>
              } />
              
              {/* Redirecionar rotas não encontradas para o dashboard */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;