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


// Estilos globais
import './App.css';

function App() {
  useEffect(() => {
    let initialized = false;
    
    const initializeServices = async () => {
      if (initialized) return;
      initialized = true;
      
      console.log('🚀 Inicializando AUPUS...');
      console.log('✅ Services inicializados com sucesso');
    };

    initializeServices();
  }, []);

  return (
    <AuthProvider>
      <NotificationProvider>
        <Router>
          <div className="App">        
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