// src/App.js - Atualizado com DataProvider
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { DataProvider } from './context/DataContext'; // ✅ NOVO
import ProtectedRoute from './components/auth/ProtectedRoute';
import './dark-theme.css';
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
        <DataProvider> {/* ✅ NOVO: DataProvider envolve toda a aplicação */}
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
              </Routes>
            </div>
          </Router>
        </DataProvider> {/* ✅ NOVO */}
      </NotificationProvider>
    </AuthProvider>
  );
}

export default App;