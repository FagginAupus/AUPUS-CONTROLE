// src/services/apiService.js - VERSÃO CORRIGIDA PARA PROBLEMA 401

class ApiService {
    constructor() {
        this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
        this.token = localStorage.getItem('aupus_token');

        // Rate limiting prevention
        this.requestQueue = new Map();
        this.lastRequestTime = 0;
        this.minRequestInterval = 100; // 100ms between requests
    }

    // ========================================
    // CONFIGURAÇÃO DE TOKEN
    // ========================================

    setToken(token) {
        this.token = token;
        localStorage.setItem('aupus_token', token);
    }

    getToken() {
        return this.token || localStorage.getItem('aupus_token');
    }

    clearToken() {
        this.token = null;
        localStorage.removeItem('aupus_token');
    }

    // ========================================
    // RATE LIMITING PREVENTION
    // ========================================

    async waitForRateLimit() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;

        if (timeSinceLastRequest < this.minRequestInterval) {
            const waitTime = this.minRequestInterval - timeSinceLastRequest;
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        this.lastRequestTime = Date.now();
    }

    checkForDuplicateRequest(endpoint, method, body) {
        const requestKey = `${method}:${endpoint}:${JSON.stringify(body || {})}`;
        const now = Date.now();
        const lastRequest = this.requestQueue.get(requestKey);

        // Prevent duplicate requests within 1 second
        if (lastRequest && (now - lastRequest) < 1000) {
            console.warn('🚫 Requisição duplicada bloqueada:', requestKey);
            return true;
        }

        this.requestQueue.set(requestKey, now);

        // Clean old entries
        if (this.requestQueue.size > 100) {
            const cutoffTime = now - 5000; // 5 seconds
            for (const [key, time] of this.requestQueue.entries()) {
                if (time < cutoffTime) {
                    this.requestQueue.delete(key);
                }
            }
        }

        return false;
    }

    // ========================================
    // MÉTODO BASE PARA REQUISIÇÕES - CORRIGIDO
    // ========================================

    async request(endpoint, options = {}) {
        // Check for duplicate requests
        if (this.checkForDuplicateRequest(endpoint, options.method || 'GET', options.body)) {
            throw new Error('Requisição duplicada bloqueada para evitar rate limiting');
        }

        // Apply rate limiting
        await this.waitForRateLimit();

        const url = `${this.baseURL}${endpoint}`;
        const token = this.getToken();

        const config = {
            method: options.method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...options.headers,
            },
            ...options,
        };

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        if (options.body) {
            config.body = options.body;
        }

        try {
            const response = await fetch(url, config);
            const responseData = await response.json();

            if (!response.ok) {
                console.error(`❌ Erro ${response.status}:`, responseData);

                // ✅ TRATAMENTO ESPECÍFICO PARA 429 - RATE LIMITING
                if (response.status === 429) {
                    // Clear request queue to prevent further issues
                    this.requestQueue.clear();

                    // Increase minimum interval temporarily
                    const originalInterval = this.minRequestInterval;
                    this.minRequestInterval = Math.min(originalInterval * 2, 2000); // Max 2 seconds

                    // Reset after 30 seconds
                    setTimeout(() => {
                        this.minRequestInterval = originalInterval;
                    }, 30000);

                    const errorMessage = responseData.message || 'Muitas tentativas de login. Tente novamente em alguns minutos.';
                    throw new Error(errorMessage);
                }

                // Log de erros de validação
                if (response.status === 422 && responseData.errors) {

                } else {
                    console.error(`❌ Erro ${response.status}:`, responseData);
                }

                // ✅ TRATAMENTO ESPECÍFICO PARA 401 - MELHORADO
                if (response.status === 401) {
                    // Se for rota de login, não remover token (credenciais inválidas)
                    if (endpoint.includes('/auth/login')) {
                        throw new Error(responseData.message || 'Email ou senha incorretos');
                    }

                    // ✅ MELHORADO: Para session-status, se deu 401, significa que está deslogado
                    if (endpoint.includes('/auth/session-status')) {
                        this.clearToken();

                        // Disparar evento de sessão expirada
                        window.dispatchEvent(new CustomEvent('sessionExpired', {
                            detail: {
                                message: 'Sua sessão expirou por inatividade',
                                errorType: 'session_expired'
                            }
                        }));

                        throw new Error('Sessão expirada');
                    }

                    // Para /auth/me também considerar como sessão expirada
                    if (endpoint.includes('/auth/me')) {
                        this.clearToken();

                        window.dispatchEvent(new CustomEvent('sessionExpired', {
                            detail: {
                                message: 'Sua sessão expirou',
                                errorType: 'session_expired'
                            }
                        }));

                        throw new Error('Sessão expirada');
                    }

                    // Se for refresh de token, não disparar eventos
                    if (endpoint.includes('/auth/refresh')) {
                        throw new Error(responseData.message || 'Token não pode ser renovado');
                    }

                    // ✅ MELHORADO: Para QUALQUER outra rota com 401, considerar sessão expirada
                    // Se tem token mas está dando 401, significa que o token é inválido/expirado
                    if (this.getToken()) {
                        this.clearToken();

                        window.dispatchEvent(new CustomEvent('sessionExpired', {
                            detail: {
                                message: responseData.message || 'Sua sessão expirou por inatividade',
                                errorType: 'session_expired'
                            }
                        }));

                        throw new Error(responseData.message || 'Sessão expirada - faça login novamente');
                    }

                    // Se não tem token, é apenas erro de autenticação
                    throw new Error(responseData.message || 'Erro de autenticação');
                }
                
                // ✅ CORREÇÃO CRÍTICA: PRESERVAR DADOS DE RESPOSTA PARA OUTROS ERROS
                const errorMessage = responseData.message || responseData.error || `HTTP ${response.status}`;
                const error = new Error(errorMessage);
                error.response = {
                    status: response.status,
                    data: responseData
                };
                throw error;
            }

            return responseData;
            
        } catch (error) {
            console.error(`❌ Erro na requisição ${config.method} ${url}:`, error);
            throw error; // ✅ PRESERVAR ERRO ORIGINAL
        }
    }

    // ========================================
    // MÉTODOS DE CONVENIÊNCIA
    // ========================================

    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }

    async post(endpoint, data = {}) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
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
    // UPLOAD DE ARQUIVOS
    // ========================================

    async uploadFile(endpoint, file, additionalData = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const token = this.getToken();
        
        const formData = new FormData();
        formData.append('file', file);
        
        Object.keys(additionalData).forEach(key => {
            formData.append(key, additionalData[key]);
        });

        const config = {
            method: 'POST',
            headers: {
                'Authorization': token ? `Bearer ${token}` : undefined,
            },
            body: formData,
        };

        try {
            const response = await fetch(url, config);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}`);
            }

            const data = await response.json();
            return data;

        } catch (error) {
            console.error(`❌ Erro no upload ${url}:`, error);
            throw error;
        }
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
    // PROPOSTAS - MÉTODOS NECESSÁRIOS PARA O DATACONTEXT
    // ========================================

    async getPropostas(filtros = {}) {
        const params = new URLSearchParams(filtros).toString();
        const endpoint = params ? `/propostas?${params}` : '/propostas';
        return this.get(endpoint);
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

    // ========================================
    // CONTROLE - MÉTODOS NECESSÁRIOS PARA O DATACONTEXT
    // ========================================

    async getControle(filtros = {}) {
        const params = new URLSearchParams(filtros).toString();
        const endpoint = params ? `/controle?${params}` : '/controle';
        return this.get(endpoint);
    }

    async criarControle(controleData) {
        return this.post('/controle', controleData);
    }

    async atualizarControle(id, controleData) {
        return this.put(`/controle/${id}`, controleData);
    }

    async excluirControle(id) {
        return this.delete(`/controle/${id}`);
    }

    // ========================================
    // UGs (USINAS GERADORAS)
    // ========================================

    async getUGs(filtros = {}) {
        const params = new URLSearchParams(filtros).toString();
        const endpoint = params ? `/ugs?${params}` : '/ugs';
        return this.get(endpoint);
    }

    async criarUG(dadosUG) {
        return this.post('/ugs', dadosUG);
    }

    // ========================================
    // USUÁRIOS - MÉTODOS NECESSÁRIOS
    // ========================================

    async getUsuarios(filtros = {}) {
        const params = new URLSearchParams(filtros).toString();
        const endpoint = params ? `/usuarios?${params}` : '/usuarios';
        return this.get(endpoint);
    }

    async getTeam() {
        return this.get('/usuarios/equipe');
    }

    async getFamiliaConsultor(consultorId) {
        return this.get(`/usuarios/${consultorId}/familia`);
    }

    // ========================================
    // UTILITÁRIOS DE TOKEN
    // ========================================

    checkTokenExpiration() {
        const token = this.getToken();
        if (!token) return { expired: true, minutesLeft: 0 };
        
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const exp = payload.exp * 1000; // Converter para ms
            const now = Date.now();
            const minutesLeft = Math.max(0, Math.floor((exp - now) / (1000 * 60)));
            
            return {
                expired: minutesLeft <= 0,
                minutesLeft,
                warningZone: minutesLeft <= 30
            };
        } catch (error) {
            console.error('Erro ao verificar expiração do token:', error);
            return { expired: true, minutesLeft: 0 };
        }
    }

    // ========================================
    // MÉTODO ESPECÍFICO PARA CRIAR ANALISTA
    // ========================================

    async criarAnalista(dadosAnalista) {
        return this.post('/usuarios/criar-analista', dadosAnalista);
    }
}

const apiService = new ApiService();
export default apiService;