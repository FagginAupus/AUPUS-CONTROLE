// src/hooks/useSessionTimeout.js - VERSÃO CORRIGIDA COM DEBUG
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import apiService from '../services/apiService';

const useSessionTimeout = () => {
  const { logout, isAuthenticated } = useAuth();
  
  // Estados básicos
  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120); // 2 horas em minutos
  const [isEditingActive, setIsEditingActive] = useState(false);
  
  // Refs para controle
  const isLoggingOut = useRef(false);
  const sessionCheckActive = useRef(true);
  const lastCheckTime = useRef(0);
  const consecutiveErrors = useRef(0);

  // Verificar status da sessão com controle de frequência
  useEffect(() => {
    if (!isAuthenticated || isLoggingOut.current) {
      sessionCheckActive.current = false;
      return;
    }

    sessionCheckActive.current = true;
    consecutiveErrors.current = 0;

    const checkSession = async () => {
      // Evitar verificações muito frequentes
      const now = Date.now();
      const timeSinceLastCheck = now - lastCheckTime.current;
      const minInterval = 120000; // 2 minutos
      
      if (timeSinceLastCheck < minInterval) {
        console.log(`🕐 Verificação de sessão ignorada - muito recente (${Math.round(timeSinceLastCheck/1000)}s atrás)`);
        return;
      }

      // Se já está fazendo logout ou não está autenticado, não verificar
      if (isLoggingOut.current || !sessionCheckActive.current || !isAuthenticated) {
        console.log('🚫 Verificação cancelada - logout em andamento ou não autenticado');
        return;
      }

      console.log('🔍 Iniciando verificação de sessão...');
      lastCheckTime.current = now;

      try {
        // Verificar se temos token antes de fazer a requisição
        const token = apiService.getToken();
        if (!token) {
          console.error('❌ Token não encontrado no localStorage');
          throw new Error('Token não encontrado');
        }

        console.log(`📡 Fazendo requisição para session-status (token presente: ${token.substring(0, 20)}...)`);
        const response = await apiService.get('/auth/session-status');
        
        console.log('✅ Resposta da verificação de sessão:', {
          success: response.success,
          expires_in: response.expires_in,
          warning: response.warning,
          time_left_minutes: response.time_left_minutes
        });
        
        if (response.success) {
          consecutiveErrors.current = 0; // Reset contador de erros
          
          const minutesLeft = response.time_left_minutes || Math.floor(response.expires_in / 60);
          setTimeLeft(minutesLeft);
          
          console.log(`⏱️ Tempo restante: ${minutesLeft} minutos`);
          
          // Mostrar aviso se restam menos de 30 minutos E não está editando
          if (response.warning && !showWarning && !isEditingActive) {
            console.log('⚠️ Sessão expirando em breve, mostrando aviso');
            setShowWarning(true);
          } else if (!response.warning && showWarning) {
            console.log('✅ Sessão não está mais na zona de aviso, ocultando');
            setShowWarning(false);
          }
        } else {
          console.error('❌ Resposta de sessão inválida:', response);
          throw new Error(response.message || 'Resposta inválida do servidor');
        }
        
      } catch (error) {
        consecutiveErrors.current++;
        console.error(`❌ Erro ao verificar sessão (tentativa ${consecutiveErrors.current}):`, {
          message: error.message,
          status: error.status,
          name: error.name
        });
        
        // Só fazer logout após múltiplos erros consecutivos
        if (consecutiveErrors.current >= 5) {
          console.log('🚨 Múltiplos erros de sessão detectados, fazendo logout...');
          
          // Se for erro de autenticação e não está já fazendo logout
          if (!isLoggingOut.current && 
              (error.message.includes('Sessão') || 
               error.message.includes('Token') || 
               error.message.includes('401') ||
               error.message.includes('expirada'))) {
            
            console.log('🚪 Sessão expirada detectada, fazendo logout...');
            isLoggingOut.current = true;
            sessionCheckActive.current = false;
            
            try {
              await logout();
            } catch (logoutError) {
              console.error('Erro no logout automático:', logoutError);
            }
          }
        } else {
          console.log(`⏳ Aguardando mais uma tentativa antes do logout (erros: ${consecutiveErrors.current}/2)`);
        }
      }
    };

    // Verificação inicial após 10 segundos (mais tempo para o app inicializar)
    console.log('⏰ Agendando verificação inicial de sessão em 10 segundos');
    const initialTimeout = setTimeout(() => {
      if (sessionCheckActive.current && isAuthenticated) {
        console.log('🚀 Executando verificação inicial de sessão');
        checkSession();
      }
    }, 10000); // 10 segundos

    // Verificar a cada 10 minutos (menos agressivo)
    console.log('⏰ Agendando verificações periódicas a cada 10 minutos');
    const interval = setInterval(() => {
      if (sessionCheckActive.current && isAuthenticated) {
        console.log('🔄 Executando verificação periódica de sessão');
        checkSession();
      }
    }, 10 * 60 * 1000); // 10 minutos

    return () => {
      console.log('🧹 Limpando timers de verificação de sessão');
      clearTimeout(initialTimeout);
      clearInterval(interval);
      sessionCheckActive.current = false;
    };
  }, [isAuthenticated, showWarning, logout, isEditingActive]);

  // Reset quando o usuário não estiver mais autenticado
  useEffect(() => {
    if (!isAuthenticated) {
      console.log('👤 Usuário não autenticado - resetando estado da sessão');
      setShowWarning(false);
      setTimeLeft(120);
      isLoggingOut.current = false;
      sessionCheckActive.current = false;
      consecutiveErrors.current = 0;
      lastCheckTime.current = 0;
    }
  }, [isAuthenticated]);

  // Função para estender sessão
  const extendSession = useCallback(async () => {
    if (isLoggingOut.current) {
      console.log('❌ Não é possível estender sessão - logout em andamento');
      return false;
    }

    try {
      console.log('🔄 Tentando estender sessão...');
      const response = await apiService.post('/auth/extend-session');
      
      if (response.success) {
        console.log('✅ Sessão estendida pelo usuário');
        setShowWarning(false);
        setTimeLeft(120); // Reset para 2 horas
        consecutiveErrors.current = 0; // Reset erros
        return true;
      } else {
        console.error('❌ Falha ao estender sessão:', response.message);
        return false;
      }
    } catch (error) {
      console.error('❌ Erro ao estender sessão:', error);
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
    console.log('🔄 Atividade resetada pelo usuário');
    if (isAuthenticated && !isLoggingOut.current) {
      setTimeLeft(120);
      setShowWarning(false);
      consecutiveErrors.current = 0;
    }
  }, [isAuthenticated]);

  // Verificar se está no grace period
  const isInGracePeriod = useCallback(() => {
    return isEditingActive;
  }, [isEditingActive]);

  // Debug info para desenvolvimento
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🐛 Debug useSessionTimeout:', {
        isAuthenticated,
        showWarning,
        timeLeft,
        isEditingActive,
        isLoggingOut: isLoggingOut.current,
        sessionCheckActive: sessionCheckActive.current,
        consecutiveErrors: consecutiveErrors.current,
        timeSinceLastCheck: lastCheckTime.current ? Date.now() - lastCheckTime.current : 'never'
      });
    }
  }, [isAuthenticated, showWarning, timeLeft, isEditingActive]);

  return {
    showWarning,
    timeLeft,
    isEditingActive,
    isInGracePeriod: isInGracePeriod(),
    extendSession,
    startEditing,
    stopEditing,
    resetActivity,
    // Debug info para desenvolvimento
    debug: process.env.NODE_ENV === 'development' ? {
      consecutiveErrors: consecutiveErrors.current,
      lastCheckTime: lastCheckTime.current,
      sessionCheckActive: sessionCheckActive.current
    } : null
  };
};

export default useSessionTimeout;