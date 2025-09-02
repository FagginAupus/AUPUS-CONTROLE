// src/hooks/useSessionTimeout.js - VERSÃO CORRIGIDA
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/apiService';

const useSessionTimeout = () => {
  const { logout, isAuthenticated } = useAuth();
  
  // Estados básicos
  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120); // 2 horas em minutos
  const [isEditingActive, setIsEditingActive] = useState(false);
  
  // Ref para evitar múltiplas chamadas de logout
  const isLoggingOut = useRef(false);
  const sessionCheckActive = useRef(true);

  // Verificar status da sessão periodicamente
  useEffect(() => {
    if (!isAuthenticated || isLoggingOut.current) {
      sessionCheckActive.current = false;
      return;
    }

    sessionCheckActive.current = true;

    const checkSession = async () => {
      // Se já está fazendo logout ou não está autenticado, não verificar
      if (isLoggingOut.current || !sessionCheckActive.current || !isAuthenticated) {
        return;
      }

      try {
        const response = await apiService.get('/auth/session-status');
        
        if (response.success) {
          const minutesLeft = Math.floor(response.expires_in / 60);
          setTimeLeft(minutesLeft);
          
          // Mostrar aviso se restam menos de 30 minutos
          if (response.warning && !showWarning) {
            console.log('⚠️ Sessão expirando, mostrando aviso');
            setShowWarning(true);
          }
        }
      } catch (error) {
        console.error('Erro ao verificar sessão:', error);
        
        // Se for erro de autenticação e não está já fazendo logout
        if (!isLoggingOut.current && 
            (error.message.includes('Sessão') || 
             error.message.includes('Token') || 
             error.message.includes('401'))) {
          
          console.log('🚪 Sessão expirada detectada, fazendo logout...');
          isLoggingOut.current = true;
          sessionCheckActive.current = false;
          
          try {
            await logout();
          } catch (logoutError) {
            console.error('Erro no logout automático:', logoutError);
          }
        }
      }
    };

    // Verificação inicial após 1 segundo (para não conflitar com outros processos)
    const initialTimeout = setTimeout(() => {
      if (sessionCheckActive.current && isAuthenticated) {
        checkSession();
      }
    }, 1000);

    // Verificar a cada 5 minutos
    const interval = setInterval(() => {
      if (sessionCheckActive.current && isAuthenticated) {
        checkSession();
      }
    }, 5 * 60 * 1000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
      sessionCheckActive.current = false;
    };
  }, [isAuthenticated, showWarning, logout]);

  // Reset quando o usuário não estiver mais autenticado
  useEffect(() => {
    if (!isAuthenticated) {
      setShowWarning(false);
      setTimeLeft(120);
      isLoggingOut.current = false;
      sessionCheckActive.current = false;
    }
  }, [isAuthenticated]);

  // Função para estender sessão
  const extendSession = useCallback(async () => {
    if (isLoggingOut.current) return false;

    try {
      const response = await apiService.post('/auth/extend-session');
      if (response.success) {
        console.log('⏰ Sessão estendida pelo usuário');
        setShowWarning(false);
        setTimeLeft(120); // Reset para 2 horas
        return true;
      }
    } catch (error) {
      console.error('Erro ao estender sessão:', error);
      return false;
    }
  }, []);

  // Marcar início de edição
  const startEditing = useCallback((context = 'unknown') => {
    console.log(`✏️ Iniciando edição: ${context}`);
    setIsEditingActive(true);
  }, []);

  // Marcar fim de edição
  const stopEditing = useCallback((context = 'unknown') => {
    console.log(`💾 Finalizando edição: ${context}`);
    setIsEditingActive(false);
  }, []);

  // Resetar atividade
  const resetActivity = useCallback(() => {
    console.log('🔄 Atividade resetada');
    if (isAuthenticated && !isLoggingOut.current) {
      setTimeLeft(120);
      setShowWarning(false);
    }
  }, [isAuthenticated]);

  // Verificar se está no grace period
  const isInGracePeriod = useCallback(() => {
    return isEditingActive;
  }, [isEditingActive]);

  return {
    showWarning,
    timeLeft,
    isEditingActive,
    isInGracePeriod: isInGracePeriod(),
    extendSession,
    startEditing,
    stopEditing,
    resetActivity
  };
};

export default useSessionTimeout;