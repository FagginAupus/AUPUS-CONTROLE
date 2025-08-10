// src/services/apiService.js - Service para integração com Backend Laravel
import Cookies from 'js-cookie';

class ApiService {
    constructor() {
        // URL base da API - ajustar conforme seu ambiente
        this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
        
        this.token = Cookies.get('aupus_token') || localStorage.getItem('aupus_token');
        
        console.log(`🔗 ApiService inicializado`);
        console.log(`🌐 Base URL: ${this.baseURL}`);
    }

    // ========================================
    // CONFIGURAÇÃO DE TOKEN
    // ========================================

    setToken(token) {
        this.token = token;
        Cookies.set('aupus_token', token, { expires: 7 }); // 7 dias
        localStorage.setItem('aupus_token', token);
        console.log('🔐 Token configurado');
    }

    clearToken() {
        this.token = null;
        Cookies.remove('aupus_token');
        localStorage.removeItem('aupus_token');
        console.log('🚪 Token removido');
    }

    // ========================================
    // MÉTODO BASE PARA REQUISIÇÕES
    // ========================================

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        const defaultHeaders = {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        };

        if (this.token) {
            defaultHeaders['Authorization'] = `Bearer ${this.token}`;
        }

        const config = {
            headers: {
                ...defaultHeaders,
                ...options.headers,
            },
            ...options,
        };

        try {
            console.log(`📡 ${config.method || 'GET'} ${url}`);
            
            const response = await fetch(url, config);
            
            if (!response.ok) {
                if (response.status === 401) {
                    this.clearToken();
                    // Opcional: redirecionar para login
                    // window.location.href = '/login';
                    throw new Error('Sessão expirada');
                }
                
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}`);
            }

            const data = await response.json();
            console.log(`✅ Resposta recebida:`, data);
            return data;

        } catch (error) {
            console.error(`❌ Erro na requisição ${config.method || 'GET'} ${url}:`, error);
            throw error;
        }
    }

    // Métodos de conveniência
    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }

    async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async patch(endpoint, data) {
        return this.request(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }

    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }

    // ========================================
    // AUTENTICAÇÃO
    // ========================================

    async login(credentials) {
        const response = await this.post('/auth/login', credentials);
        if (response.success && response.token) {
            this.setToken(response.token);
        }
        return response;
    }

    async register(userData) {
        return this.post('/auth/register', userData);
    }

    async logout() {
        try {
            await this.post('/auth/logout');
        } catch (error) {
            console.warn('Erro ao fazer logout na API:', error);
        } finally {
            this.clearToken();
        }
    }

    async refreshToken() {
        const response = await this.post('/auth/refresh');
        if (response.token) {
            this.setToken(response.token);
        }
        return response;
    }

    async getCurrentUser() {
        return this.get('/auth/me');
    }

    async changePassword(passwordData) {
        return this.post('/auth/change-password', passwordData);
    }

    // ========================================
    // USUÁRIOS
    // ========================================

    async getUsuarios() {
        return this.get('/usuarios');
    }

    async getUsuario(id) {
        return this.get(`/usuarios/${id}`);
    }

    async criarUsuario(userData) {
        return this.post('/usuarios', userData);
    }

    async atualizarUsuario(id, userData) {
        return this.put(`/usuarios/${id}`, userData);
    }

    async toggleUsuarioAtivo(id) {
        return this.patch(`/usuarios/${id}/toggle-active`);
    }

    async getTeam() {
        return this.get('/usuarios/team');
    }

    // ========================================
    // PROPOSTAS (PROSPEC)
    // ========================================

    async getPropostas(filtros = {}) {
        const params = new URLSearchParams(filtros).toString();
        const endpoint = params ? `/propostas?${params}` : '/propostas';
        return this.get(endpoint);
    }

    async getProposta(id) {
        return this.get(`/propostas/${id}`);
    }

    async criarProposta(propostaData) {
        return this.post('/propostas', propostaData);
    }

    async atualizarProposta(id, propostaData) {
        return this.put(`/propostas/${id}`, propostaData);
    }

    async excluirProposta(id) {
        return this.delete(`/propostas/${id}`);
    }

    async getEstatisticasPropostas(filtros = {}) {
        const params = new URLSearchParams(filtros).toString();
        const endpoint = params ? `/propostas/statistics?${params}` : '/propostas/statistics';
        return this.get(endpoint);
    }

    async exportarPropostas(filtros = {}) {
        const params = new URLSearchParams(filtros).toString();
        const endpoint = params ? `/propostas/export?${params}` : '/propostas/export';
        return this.get(endpoint);
    }

    // ========================================
    // UNIDADES CONSUMIDORAS
    // ========================================

    async getUnidadesConsumidoras(filtros = {}) {
        const params = new URLSearchParams(filtros).toString();
        const endpoint = params ? `/unidades-consumidoras?${params}` : '/unidades-consumidoras';
        return this.get(endpoint);
    }

    async getUnidadeConsumidora(id) {
        return this.get(`/unidades-consumidoras/${id}`);
    }

    async criarUnidadeConsumidora(ucData) {
        return this.post('/unidades-consumidoras', ucData);
    }

    async atualizarUnidadeConsumidora(id, ucData) {
        return this.put(`/unidades-consumidoras/${id}`, ucData);
    }

    async excluirUnidadeConsumidora(id) {
        return this.delete(`/unidades-consumidoras/${id}`);
    }

    async getEstatisticasUnidades(filtros = {}) {
        const params = new URLSearchParams(filtros).toString();
        const endpoint = params ? `/unidades-consumidoras/statistics?${params}` : '/unidades-consumidoras/statistics';
        return this.get(endpoint);
    }

    // ========================================
    // CONTROLE
    // ========================================

    async getControle(filtros = {}) {
        const params = new URLSearchParams(filtros).toString();
        const endpoint = params ? `/controle?${params}` : '/controle';
        return this.get(endpoint);
    }

    async adicionarControle(controleData) {
        return this.post('/controle', controleData);
    }

    async atualizarControle(id, controleData) {
        return this.put(`/controle/${id}`, controleData);
    }

    async excluirControle(id) {
        return this.delete(`/controle/${id}`);
    }

    // ========================================
    // CONFIGURAÇÕES
    // ========================================

    async getConfiguracoes(grupo = null) {
        const endpoint = grupo ? `/configuracoes/grupo/${grupo}` : '/configuracoes';
        return this.get(endpoint);
    }

    async salvarConfiguracao(chave, valor, grupo = 'geral') {
        return this.post('/configuracoes', {
            chave,
            valor,
            grupo
        });
    }

    async atualizarConfiguracao(id, configData) {
        return this.put(`/configuracoes/${id}`, configData);
    }

    async resetarConfiguracoes(chaves = null) {
        return this.post('/configuracoes/reset', { chaves });
    }

    async exportarConfiguracoes(grupo = null) {
        return this.post('/configuracoes/export', { grupo });
    }

    async limparCacheConfiguracoes() {
        return this.post('/configuracoes/clear-cache');
    }

    // ========================================
    // DASHBOARD & SISTEMA
    // ========================================

    async getDashboardData(filtros = {}) {
        const params = new URLSearchParams(filtros).toString();
        const endpoint = params ? `/dashboard?${params}` : '/dashboard';
        return this.get(endpoint);
    }

    async getSystemInfo() {
        return this.get('/sistema/info');
    }

    async getSystemHealth() {
        return this.get('/sistema/health');
    }

    // ========================================
    // TESTES E HEALTH CHECK
    // ========================================

    async healthCheck() {
        return this.get('/health-check');
    }

    async testDatabase() {
        return this.get('/test-db');
    }
}

// Criar instância única (Singleton)
const apiService = new ApiService();

export default apiService;