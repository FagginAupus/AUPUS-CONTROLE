// src/App.js - Roteamento com controle de acesso hierárquico
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import ProtectedRoute from './components/auth/ProtectedRoute';

// Importar o storage service para inicializar globalmente
import './services/storageService';

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