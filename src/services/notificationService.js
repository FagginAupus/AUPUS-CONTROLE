// src/services/notificationService.js
import apiService from './apiService';

class NotificationService {
    async getNotifications() {
        try {
            console.log('📢 Buscando notificações do backend...');
            const response = await apiService.get('/notificacoes');

            console.log('📢 Resposta da API:', response);

            // Verificar diferentes estruturas de resposta possíveis
            let notifications = [];
            if (response?.data?.data?.data) {
                // Laravel paginado: response.data.data.data (API wrapper + pagination + data)
                notifications = response.data.data.data;
            } else if (response?.data?.data) {
                // Laravel paginado: response.data.data
                notifications = Array.isArray(response.data.data) ? response.data.data : response.data.data.data || [];
            } else if (response?.data) {
                // Resposta direta
                notifications = Array.isArray(response.data) ? response.data : [];
            } else if (Array.isArray(response)) {
                // Array direto
                notifications = response;
            }

            // Garantir que é sempre um array
            if (!Array.isArray(notifications)) {
                console.warn('⚠️ Notifications não é array após processamento:', notifications);
                notifications = [];
            }

            console.log('📢 Notificações processadas:', notifications);
            return notifications;
        } catch (error) {
            console.error('Erro ao buscar notificações:', error);
            return [];
        }
    }

    async markAsRead(notificationId) {
        try {
            console.log('✅ Marcando notificação como lida:', notificationId);
            await apiService.patch(`/notificacoes/${notificationId}/read`);
            return true;
        } catch (error) {
            console.error('Erro ao marcar notificação como lida:', error);
            return false;
        }
    }

    async markAllAsRead() {
        try {
            console.log('✅ Marcando todas as notificações como lidas');
            await apiService.post('/notificacoes/mark-all-read');
            return true;
        } catch (error) {
            console.error('Erro ao marcar todas as notificações como lidas:', error);
            return false;
        }
    }

    async getUnreadCount() {
        try {
            const response = await apiService.get('/notificacoes/unread-count');
            return response.data?.count || 0;
        } catch (error) {
            console.error('Erro ao buscar contagem de não lidas:', error);
            return 0;
        }
    }
}

const notificationService = new NotificationService();
export default notificationService;