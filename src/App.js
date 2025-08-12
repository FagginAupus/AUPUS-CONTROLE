// src/App.js - Atualizado com AlertStatus da API
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Importar os services para inicializar globalmente
import storageService from './services/storageService';

// Páginas
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import ProspecPage from './pages/ProspecPage';
import NovaPropostaPage from './pages/NovaPropostaPage';
import ControlePage from './pages/ControlePage';
import UGsPage from './pages/UGsPage';
import RelatoriosPage from './pages/RelatoriosPage';

// Componente para status da API
import ApiStatusAlert from './components/common/ApiStatusAlert';

// Estilos globais
import './App.css';

function App() {
  useEffect(() => {
    // Inicializar serviços quando o app carrega
    const initializeServices = async () => {
      console.log('🚀 Inicializando AUPUS...');
      
      try {
        // Verificar conexão com API
        const apiStatus = await storageService.checkApiConnection();
        if (apiStatus.connected) {
          console.log('✅ Services inicializados com sucesso');
        } else {
          console.warn('⚠️ API não disponível:', apiStatus.message);
        }
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
            {/* Alerta de status da API - aparece apenas quando há problemas */}
            <ApiStatusAlert />
            
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
              
              {/* Rota padrão - redirecionar para dashboard se autenticado, senão para login */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </div>
        </Router>
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;