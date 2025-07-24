// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';

// Componentes
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import ProspecPage from './pages/ProspecPage';
import NovaPropostaPage from './pages/NovaPropostaPage';
import ControlePage from './pages/ControlePage';
import UGsPage from './pages/UGsPage';
import NotificationContainer from './components/common/NotificationContainer';

// Estilos
import './App.css';

// Componente para rota protegida simples
const ProtectedRoute = ({ children, requirePermission = null }) => {
  const { isAuthenticated, isLoading, hasPermission } = useAuth();

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
        color: 'white',
        fontSize: '1.2rem'
      }}>
        ⏳ Carregando...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Verificar permissão específica se necessário
  if (requirePermission && !hasPermission(requirePermission)) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
        color: 'white',
        textAlign: 'center',
        padding: '20px'
      }}>
        <div style={{ fontSize: '4rem', marginBottom: '20px' }}>🚫</div>
        <h2>Acesso Negado</h2>
        <p>Você não tem permissão para acessar esta página.</p>
        <button 
          onClick={() => window.history.back()}
          style={{
            background: '#4CAF50',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            cursor: 'pointer',
            marginTop: '20px'
          }}
        >
          ← Voltar
        </button>
      </div>
    );
  }

  return children;
};

function AppContent() {
  return (
    <div className="App">
      {/* Container de notificações global */}
      <NotificationContainer />

      <Routes>
        {/* Rota de Login */}
        <Route path="/login" element={<LoginPage />} />
        
        {/* Rota protegida do Dashboard */}
        <Route path="/" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />

        {/* Rota protegida do PROSPEC */}
        <Route path="/prospec" element={
          <ProtectedRoute requirePermission="prospec">
            <ProspecPage />
          </ProtectedRoute>
        } />

        {/* Rota protegida da Nova Proposta */}
        <Route path="/nova-proposta" element={
          <ProtectedRoute requirePermission="nova-proposta">
            <NovaPropostaPage />
          </ProtectedRoute>
        } />

        {/* Rota protegida do CONTROLE */}
        <Route path="/controle" element={
          <ProtectedRoute requirePermission="controle">
            <ControlePage />
          </ProtectedRoute>
        } />

        {/* Rota protegida das UGs */}
        <Route path="/ugs" element={
          <ProtectedRoute requirePermission="ugs">
            <UGsPage />
          </ProtectedRoute>
        } />
        
        {/* Redirecionamento para home */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <NotificationProvider>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </NotificationProvider>
  );
}

export default App;