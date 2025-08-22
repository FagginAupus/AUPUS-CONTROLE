// src/services/apiService.js - SERVIÇO COMPLETO DE API - CORRIGIDO

class ApiService {
    constructor() {
        this.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
        this.token = localStorage.getItem('aupus_token');
        
        console.log('🔗 ApiService inicializado');
        console.log('🌐 Base URL:', this.baseURL);
    }

    // ========================================
    // CONFIGURAÇÃO DE TOKEN
    // ========================================

    setToken(token) {
        this.token = token;
        localStorage.setItem('aupus_token', token);
        console.log('🔐 Token configurado');
    }

    getToken() {
        return this.token || localStorage.getItem('aupus_token');
    }

    clearToken() {
        this.token = null;
        localStorage.removeItem('aupus_token');
        console.log('🚪 Token removido');
    }

    // ========================================
    // MÉTODO BASE PARA REQUISIÇÕES - CORRIGIDO
    // ========================================

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const token = this.getToken();
        
        const config = {
            method: options.method || 'GET', // CORRIGIDO: method deve estar no config
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                ...options.headers,
            },
            ...options, // Spread options depois para sobrescrever se necessário
        };

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        // CORRIGIDO: Se tiver body, usar o body do options
        if (options.body) {
            config.body = options.body;
        }

        // Log detalhado da requisição
        console.log(`📡 ${config.method} ${url}`);
        if (config.body && config.headers['Content-Type'] === 'application/json') {
            try {
                console.log('📤 Dados enviados:', JSON.parse(config.body));
            } catch (e) {
                console.log('📤 Dados enviados:', config.body);
            }
        }

        try {            
            const response = await fetch(url, config); // CORRIGIDO: url primeiro, config segundo
            const responseData = await response.json();
            
            if (!response.ok) {
                console.error(`❌ Erro ${response.status}:`, responseData);
                
                // MOSTRAR DETALHES DO ERRO DE VALIDAÇÃO
                if (response.status === 422 && responseData.errors) {
                    console.error('🚨 Erros de validação:', JSON.stringify(responseData.errors, null, 2));
                }
                
                // ✅ CORREÇÃO: Só limpar token se for 401 E NÃO for uma tentativa de login
                if (response.status === 401 && !endpoint.includes('/auth/login')) {
                    this.clearToken();
                    throw new Error('Sessão expirada - faça login novamente');
                }
                
                // Para outras rotas ou para login com 401, buscar mensagem do servidor
                if (response.status === 400 && responseData.message && 
                    (responseData.message.includes('capacidade') || responseData.message.includes('suficiente'))) {
                    // Para erros de capacidade, retornar objeto ao invés de throw
                    return {
                        success: false,
                        message: responseData.message,
                        errorType: 'capacity'
                    };
                }

                // Para outras rotas ou para login com 401, buscar mensagem do servidor
                const errorMessage = responseData.message || responseData.error || `HTTP ${response.status}`;
                throw new Error(errorMessage);
            }

            console.log(`✅ Resposta recebida:`, responseData);
            return responseData;

        } catch (error) {
            console.error(`❌ Erro na requisição ${config.method} ${url}:`, error);
            throw error;
        }
    }

    // ========================================
    // MÉTODOS DE CONVENIÊNCIA
    // ========================================

    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }

    async post(endpoint, data = {}) {
        console.log('📤 apiService.post INICIADO:', {
            endpoint: endpoint,
            url: `${this.baseURL}${endpoint}`,
            hasData: !!data,
            hasToken: !!this.token,
            dataKeys: Object.keys(data)
        });
        
        const response = await this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        console.log('📥 apiService.post - Response:', response);
        return response;
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
        
        // Adicionar dados extras
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

        console.log(`📤 UPLOAD ${url}`);

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                if (response.status === 401) {
                    this.clearToken();
                    throw new Error('Sessão expirada');
                }
                
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}`);
            }

            const data = await response.json();
            console.log(`✅ Upload concluído:`, data);
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
    // UGs (USINAS GERADORAS) - CORRIGIDO
    // ========================================

    async getUGs(filtros = {}) {
        console.log('📥 Buscando UGs da API...');
        const params = new URLSearchParams(filtros).toString();
        const endpoint = params ? `/ugs?${params}` : '/ugs';
        return this.get(endpoint);
    }

    async getUG(id) {
        console.log('📋 Buscando UG específica da API...', id);
        return this.get(`/ugs/${id}`);
    }

    async criarUG(dadosUG) {
        console.log('🌐 apiService.criarUG INICIADO');
        console.log('🌐 Nome da UG:', dadosUG.nome_usina);
        console.log('🔍 DADOS COMPLETOS ENVIADOS:', JSON.stringify(dadosUG, null, 2));
        
        try {
            const response = await this.post('/ugs', dadosUG);
            console.log('✅ apiService.criarUG - Resposta recebida:', response);
            return response;
        } catch (error) {
            console.error('❌ apiService.criarUG - Erro:', error);
            throw error;
        }
    }

    async atualizarUG(id, dadosUG) {
        console.log('📝 Atualizando UG na API...', id);
        return this.put(`/ugs/${id}`, dadosUG);
    }

    async excluirUG(id) {
        console.log('🗑️ Excluindo UG da API...', id);
        return this.delete(`/ugs/${id}`);
    }

    async getUGStatistics(filtros = {}) {
        console.log('📊 Buscando estatísticas das UGs...');
        const params = new URLSearchParams(filtros).toString();
        const endpoint = params ? `/ugs/statistics?${params}` : '/ugs/statistics';
        return this.get(endpoint);
    }

    // ========================================
    // USUÁRIOS
    // ========================================

    async getUsuarios(filtros = {}) {
        const params = new URLSearchParams(filtros).toString();
        const endpoint = params ? `/usuarios?${params}` : '/usuarios';
        return this.get(endpoint);
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

    async excluirUsuario(id) {
        return this.delete(`/usuarios/${id}`);
    }

    async getTeam() {
        return this.get('/usuarios/team');
    }

    async getEstatisticasUsuarios(filtros = {}) {
        const params = new URLSearchParams(filtros).toString();
        const endpoint = params ? `/usuarios/statistics?${params}` : '/usuarios/statistics';
        return this.get(endpoint);
    }

    async bulkActivateUsuarios(ids) {
        return this.post('/usuarios/bulk-activate', { ids });
    }

    async bulkDeactivateUsuarios(ids) {
        return this.post('/usuarios/bulk-deactivate', { ids });
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

    async updateStatusProposta(id, status) {
        return this.patch(`/propostas/${id}/status`, { status });
    }

    async duplicarProposta(id) {
        return this.post(`/propostas/${id}/duplicate`);
    }

    async converterPropostaParaControle(id) {
        return this.post(`/propostas/${id}/convert-to-controle`);
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

    async uploadDocumentoProposta(id, file, tipo) {
        return this.uploadFile(`/propostas/${id}/upload-documento`, file, { tipo });
    }

    async removeDocumentoProposta(id, tipo) {
        return this.delete(`/propostas/${id}/documento/${tipo}`);
    }

    async bulkUpdateStatusPropostas(ids, status) {
        return this.post('/propostas/bulk-update-status', { ids, status });
    }

    // ========================================
    // CONTROLE
    // ========================================

    async getControle(filtros = {}) {
        const params = new URLSearchParams(filtros).toString();
        const endpoint = params ? `/controle?${params}` : '/controle';
        return this.get(endpoint);
    }

    async getControleItem(id) {
        return this.get(`/controle/${id}`);
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

    async getConfiguracao(chave) {
        return this.get(`/configuracoes/${chave}`);
    }

    async salvarConfiguracao(configData) {
        return this.post('/configuracoes', configData);
    }

    // ========================================
    // NOTIFICAÇÕES
    // ========================================

    async getNotificacoes(filtros = {}) {
        const params = new URLSearchParams(filtros).toString();
        const endpoint = params ? `/notificacoes?${params}` : '/notificacoes';
        return this.get(endpoint);
    }

    async marcarComoLida(id) {
        return this.patch(`/notificacoes/${id}/mark-read`);
    }

    // ========================================
    // DASHBOARD & SISTEMA
    // ========================================

    async getDashboardData(filtros = {}) {
        const params = new URLSearchParams(filtros).toString();
        const endpoint = params ? `/dashboard?${params}` : '/dashboard';
        return this.get(endpoint);
    }

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