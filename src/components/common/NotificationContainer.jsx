// src/components/common/NotificationContainer.jsx - CORRIGIDO
import React from 'react';
import { useNotification } from '../../context/NotificationContext';
import './NotificationContainer.css';

const NotificationContainer = () => {
  const { notifications, removeNotification } = useNotification();

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="notification-container">
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          notification={notification}
          onRemove={removeNotification}
        />
      ))}
    </div>
  );
};

const NotificationItem = ({ notification, onRemove }) => {
  const getNotificationClass = (type) => {
    switch (type) {
      case 'success': return 'notification-success';
      case 'error': return 'notification-error';
      case 'warning': return 'notification-warning';
      case 'info': return 'notification-info';
      default: return 'notification-info';
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return 'ℹ️';
    }
  };

  return (
    <div className={`notification ${getNotificationClass(notification.type)}`}>
      <div className="notification-content">
        <span className="notification-icon">
          {getNotificationIcon(notification.type)}
        </span>
        <span className="notification-message">
          {notification.message}
        </span>
      </div>
      <button
        className="notification-close"
        onClick={() => onRemove(notification.id)}
        aria-label="Fechar notificação"
      >
        ×
      </button>
    </div>
  );
};

export default NotificationContainer;