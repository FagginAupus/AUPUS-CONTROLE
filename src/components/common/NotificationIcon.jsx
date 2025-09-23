// src/components/common/NotificationIcon.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, CheckCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import notificationService from '../../services/notificationService';
import './NotificationIcon.css';

const NotificationIcon = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  // Só mostrar para admins e analistas
  const shouldShow = user && ['admin', 'analista'].includes(user.role);

  // Buscar notificações
  const fetchNotifications = async () => {
    if (!shouldShow) return;

    setLoading(true);
    try {
      const data = await notificationService.getNotifications();

      // Garantir que data é sempre um array
      let notificationsArray = Array.isArray(data) ? data : (data?.data ? data.data : []);

      // Verificação dupla para garantir que é array
      if (!Array.isArray(notificationsArray)) {
        console.warn('⚠️ Dados de notificação não são array:', notificationsArray);
        notificationsArray = [];
      }

      console.log('📢 Notificações recebidas:', notificationsArray);
      setNotifications(notificationsArray);

      const unreadCount = notificationsArray.filter(notif => !notif.lida).length;
      setUnreadCount(unreadCount);
    } catch (error) {
      console.error('Erro ao buscar notificações:', error);
      setNotifications([]); // Fallback para array vazio
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  };

  // Buscar notificações a cada 30 segundos
  useEffect(() => {
    if (!shouldShow) return;

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);

    return () => clearInterval(interval);
  }, [shouldShow]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleNotificationClick = async (notification) => {
    // Marcar como lida se não foi lida
    if (!notification.lida) {
      await notificationService.markAsRead(notification.id);
      await fetchNotifications(); // Atualizar lista
    }

    // Navegar para o link se existir
    if (notification.link) {
      window.location.href = notification.link;
    }

    setIsOpen(false);
  };

  const handleMarkAllAsRead = async () => {
    await notificationService.markAllAsRead();
    await fetchNotifications();
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Agora';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    return `${diffDays}d`;
  };

  const getNotificationIcon = (tipo) => {
    switch (tipo) {
      case 'sucesso': return '✅';
      case 'erro': return '❌';
      case 'warning': return '⚠️';
      default: return 'ℹ️';
    }
  };

  if (!shouldShow) {
    return null;
  }

  return (
    <div className="notification-icon-container" ref={dropdownRef}>
      <button
        className="notification-icon-button"
        onClick={() => setIsOpen(!isOpen)}
        title="Notificações"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notification-dropdown">
          <div className="notification-header">
            <h3>Notificações</h3>
            <div className="notification-actions">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  className="mark-all-read-btn"
                  title="Marcar todas como lidas"
                >
                  <CheckCheck size={16} />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="close-dropdown-btn"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="notification-list">
            {loading ? (
              <div className="notification-loading">Carregando...</div>
            ) : !Array.isArray(notifications) || notifications.length === 0 ? (
              <div className="notification-empty">
                Nenhuma notificação encontrada
              </div>
            ) : (
              (Array.isArray(notifications) ? notifications : []).slice(0, 10).map((notification) => (
                <div
                  key={notification.id}
                  className={`notification-item ${!notification.lida ? 'unread' : ''}`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="notification-icon">
                    {getNotificationIcon(notification.tipo)}
                  </div>
                  <div className="notification-content">
                    <div className="notification-title">
                      {notification.titulo}
                    </div>
                    <div className="notification-description">
                      {notification.descricao}
                    </div>
                    <div className="notification-time">
                      {formatTime(notification.created_at)}
                    </div>
                  </div>
                  {!notification.lida && (
                    <div className="notification-unread-dot"></div>
                  )}
                </div>
              ))
            )}
          </div>

          {Array.isArray(notifications) && notifications.length > 10 && (
            <div className="notification-footer">
              <span>Mostrando 10 de {notifications.length} notificações</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationIcon;