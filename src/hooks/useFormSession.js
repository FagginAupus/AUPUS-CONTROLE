// src/hooks/useFormSession.js - VERSÃO BÁSICA INICIAL
import { useCallback } from 'react';

/**
 * Hook básico para gerenciar sessão em formulários
 * Versão inicial simplificada
 */
const useFormSession = (sessionMethods = {}, formName = 'form') => {
  const { startEditing, stopEditing, resetActivity } = sessionMethods;

  // Função para indicar início de edição
  const handleStartEditing = useCallback(() => {
    if (startEditing) {
      startEditing(formName);
    }
    console.log(`📝 Iniciando edição do formulário: ${formName}`);
  }, [startEditing, formName]);

  // Função para indicar fim de edição
  const handleStopEditing = useCallback(() => {
    if (stopEditing) {
      stopEditing(formName);
    }
    console.log(`💾 Finalizando edição do formulário: ${formName}`);
  }, [stopEditing, formName]);

  // Função para resetar atividade
  const handleResetActivity = useCallback(() => {
    if (resetActivity) {
      resetActivity();
    }
    console.log(`🔄 Atividade resetada no formulário: ${formName}`);
  }, [resetActivity, formName]);

  // Retornar métodos úteis para o formulário
  return {
    startEditing: handleStartEditing,
    stopEditing: handleStopEditing,
    resetActivity: handleResetActivity,
    
    // Métodos de conveniência
    onFormChange: () => {
      console.log('📝 Mudança detectada no formulário');
      handleResetActivity();
    },
    onFormSubmit: () => {
      console.log('📤 Formulário submetido');
      handleStopEditing();
    },
    onFormSave: () => {
      console.log('💾 Formulário salvo');
      handleResetActivity();
      handleStopEditing();
    },
    onFormCancel: () => {
      console.log('❌ Formulário cancelado');
      handleStopEditing();
    },
  };
};

export default useFormSession;