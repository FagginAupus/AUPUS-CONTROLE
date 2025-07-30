// src/App.js - SEM WARNINGS DE ESLINT
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
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              
              <Route path="/prospec" element={
                <ProtectedRoute>
                  <ProspecPage />
                </ProtectedRoute>
              } />
              
              <Route path="/controle" element={
                <ProtectedRoute>
                  <ControlePage />
                </ProtectedRoute>
              } />
              
              <Route path="/ugs" element={
                <ProtectedRoute>
                  <UGsPage />
                </ProtectedRoute>
              } />
              
              <Route path="/relatorios" element={
                <ProtectedRoute>
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