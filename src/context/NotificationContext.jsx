// src/context/NotificationContext.jsx - CORRIGIDO para evitar logs duplicados
import React, { createContext, useContext, useState, useCallback } from 'react';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification deve ser usado dentro de NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [lastNotification, setLastNotification] = useState(null);

  // Função para evitar notificações duplicadas
  const isDuplicate = useCallback((message, type) => {
    if (!lastNotification) return false;
    
    const now = Date.now();
    const timeDiff = now - lastNotification.timestamp;
    
    return (
      lastNotification.message === message &&
      lastNotification.type === type &&
      timeDiff < 2000 // Bloquear duplicatas em menos de 2 segundos
    );
  }, [lastNotification]);

  const showNotification = useCallback((message, type = 'info', duration = 5000) => {
    // Verificar se é duplicata
    if (isDuplicate(message, type)) {
      console.log('⚠️ Notificação duplicada bloqueada:', message);
      return;
    }

    const id = Date.now() + Math.random();
    const notification = {
      id,
      message,
      type,
      timestamp: Date.now()
    };

    // Atualizar última notificação
    setLastNotification(notification);

    // Adicionar nova notificação
    setNotifications(prev => [...prev, notification]);

    // Auto-remover após duração especificada (apenas para success e info)
    if (type === 'success' || type === 'info') {
      setTimeout(() => {
        removeNotification(id);
      }, duration);
    }
  }, [isDuplicate]);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const value = {
    notifications,
    showNotification,
    removeNotification,
    clearAllNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};