// src/components/SessionManager.jsx - VERSÃO BÁSICA INICIAL
import React from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * SessionManager - Versão inicial simplificada
 * 
 * Esta versão inicial só monitora a autenticação básica.
 * Depois implementaremos o sistema completo de timeout.
 */
const SessionManager = ({ children }) => {
  const { isAuthenticated } = useAuth();

  // Se não estiver autenticado, não renderizar nada
  // (o ProtectedRoute já cuida do redirecionamento)
  if (!isAuthenticated) {
    return null;
  }

  // Por enquanto, apenas renderizar os children
  // Mais tarde implementaremos o modal de aviso e controle de timeout
  return <>{children}</>;
};

export default SessionManager;