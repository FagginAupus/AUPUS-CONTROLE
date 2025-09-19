// src/components/auth/ProtectedRoute.jsx - Rota protegida simplificada
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ children, requirePage = null }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  // Mostrar loading enquanto verifica autenticação
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{
          width: '50px',
          height: '50px',
          border: '5px solid #f3f3f3',
          borderTop: '5px solid #3498db',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <p>Carregando...</p>
      </div>
    );
  }

  // Redirecionar para login se não estiver autenticado
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Verificação simples de permissões baseada no role
  const canAccess = (page, userRole, userPermissions) => {
    if (!page) return true;
    
    // Mapeamento de páginas para permissões
    const pagePermissions = {
      'dashboard': 'dashboard.view',
      'prospec': 'propostas.view', 
      'controle': 'controle.view',
      'ugs': 'ugs.view',
      'relatorios': 'relatorios.view'
    };

    const requiredPermission = pagePermissions[page];
    
    // Se tem permissão mapeada, usar Spatie
    if (requiredPermission && userPermissions) {
      return userPermissions.includes(requiredPermission);
    }
    
    // Fallback para lógica antiga
    const permissions = {
      'admin': ['dashboard', 'prospec', 'controle', 'ugs', 'relatorios'],
      'consultor': ['dashboard', 'prospec', 'controle', 'relatorios'], 
      'gerente': ['dashboard', 'prospec', 'controle'],
      'vendedor': ['dashboard', 'prospec']
    };
    
    const userPages = permissions[userRole] || ['dashboard'];
    return userPages.includes(page);
  };

  // Verificar se tem permissão para acessar a página específica
  if (requirePage && !canAccess(requirePage, user?.role, user?.permissions)) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '20px',
        textAlign: 'center',
        padding: '20px'
      }}>
        <div style={{ fontSize: '48px' }}>🚫</div>
        <h2>Acesso Negado</h2>
        <p>Você não tem permissão para acessar esta página.</p>
        <p style={{ color: '#666' }}>
          Usuário: <strong>{user?.name}</strong> ({user?.role})
        </p>
        <button 
          onClick={() => window.history.back()}
          style={{
            padding: '10px 20px',
            backgroundColor: '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          ← Voltar
        </button>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;