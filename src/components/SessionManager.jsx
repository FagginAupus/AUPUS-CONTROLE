// src/components/SessionManager.jsx - VERSÃO COMPLETA
import React from 'react';
import { useAuth } from '../context/AuthContext';
import useSessionTimeout from '../hooks/useSessionTimeout';
import SessionWarningModal from './SessionWarningModal';

const SessionManager = ({ children }) => {
  const { logout, isAuthenticated } = useAuth();
  
  const {
    showWarning,
    timeLeft,
    isInGracePeriod,
    extendSession,
    startEditing,
    stopEditing,
    resetActivity
  } = useSessionTimeout();

  // Funções para serem usadas pelos componentes filhos
  const sessionMethods = {
    startEditing,
    stopEditing,
    resetActivity,
    isInGracePeriod
  };

  const handleExtendSession = async () => {
    console.log('✅ Usuário escolheu estender sessão');
    const success = await extendSession();
    if (!success) {
      console.error('Falha ao estender sessão');
    }
  };

  const handleLogout = async () => {
    console.log('🚪 Usuário escolheu fazer logout');
    try {
      await logout();
    } catch (error) {
      console.error('Erro no logout:', error);
    }
  };

  // Se não estiver autenticado, não mostrar o modal
  if (!isAuthenticated) {
    return <>{children}</>;
  }

  // Clone os children passando os métodos de sessão via props
  const childrenWithProps = React.Children.map(children, child => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, { sessionMethods });
    }
    return child;
  });

  return (
    <>
      {childrenWithProps}
      
      <SessionWarningModal
        isOpen={showWarning}
        timeLeft={timeLeft}
        isInGracePeriod={isInGracePeriod}
        onExtendSession={handleExtendSession}
        onLogout={handleLogout}
      />
    </>
  );
};

export default SessionManager;