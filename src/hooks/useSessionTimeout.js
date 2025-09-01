// src/hooks/useSessionTimeout.js - VERSÃO BÁSICA INICIAL
import { useState, useCallback } from 'react';

/**
 * Hook básico para gerenciamento de sessão
 * Esta é uma versão simplificada que será expandida gradualmente
 */
const useSessionTimeout = () => {
  // Estados básicos
  const [showWarning, setShowWarning] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120); // 2 horas em minutos
  const [isEditingActive, setIsEditingActive] = useState(false);

  // Função para estender sessão
  const extendSession = useCallback(() => {
    console.log('⏰ Sessão estendida pelo usuário');
    setShowWarning(false);
    setTimeLeft(120); // Reset para 2 horas
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
    setTimeLeft(120);
    setShowWarning(false);
  }, []);

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