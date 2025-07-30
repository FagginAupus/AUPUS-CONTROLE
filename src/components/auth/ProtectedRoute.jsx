// src/components/auth/ProtectedRoute.jsx - Rota protegida com verificação de permissões
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ children, requirePage = null }) => {
  const { isAuthenticated, user, canAccessPage, loading } = useAuth();
  const location = useLocation();

  // Mostrar loading enquanto verifica autenticação
  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Carregando...</p>
      </div>
    );
  }

  // Redirecionar para login se não estiver autenticado
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Verificar se tem permissão para acessar a página específica
  if (requirePage && !canAccessPage(requirePage)) {
    return (
      <div className="access-denied-container">
        <div className="access-denied-content">
          <div className="access-denied-icon">🚫</div>
          <h2>Acesso Negado</h2>
          <p>Você não tem permissão para acessar esta página.</p>
          <p className="user-info">
            Usuário: <strong>{user?.name}</strong> ({user?.role})
          </p>
          <button 
            onClick={() => window.history.back()}
            className="btn-back"
          >
            ← Voltar
          </button>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;