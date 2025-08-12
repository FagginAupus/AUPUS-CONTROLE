// src/services/apiService.js - SERVIÇO COMPLETO DE API

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
    // MÉTODO BASE PARA REQUISIÇÕES
    // ========================================

    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const token = this.getToken();
        
        const config = {
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

        console.log(`📡 ${config.method || 'GET'} ${url}`);

        try {            
            const response = await fetch(url, config);
            
            if (!response.ok) {
                // ✅ CORREÇÃO: Só limpar token se for 401 E NÃO for uma tentativa de login
                if (response.status === 401 && !endpoint.includes('/auth/login')) {
                    this.clearToken();
                    throw new Error('Sessão expirada - faça login novamente');
                }
                
                // Para outras rotas ou para login com 401, buscar mensagem do servidor
                const errorData = await response.json().catch(() => ({}));
                const errorMessage = errorData.message || errorData.error || `HTTP ${response.status}`;
                
                throw new Error(errorMessage);
            }

            const data = await response.json();
            console.log(`✅ Resposta recebida:`, data);
            return data;

        } catch (error) {
            console.error(`❌ Erro na requisição ${config.method || 'GET'} ${url}:`, error);
            throw error;
        }
    }

    // ========================================
    // MÉTODOS DE CONVENIÊNCIA
    // ========================================

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

    async exportarUnidades(filtros = {}) {
        const params = new URLSearchParams(filtros).toString();
        const endpoint = params ? `/unidades-consumidoras/export?${params}` : '/unidades-consumidoras/export';
        return this.get(endpoint);
    }

    async importarUnidades(file) {
        return this.uploadFile('/unidades-consumidoras/import', file);
    }

    async bulkUpdateUnidades(updates) {
        return this.post('/unidades-consumidoras/bulk-update', { updates });
    }

    async calcularEconomiaUnidade(id, parametros) {
        return this.post(`/unidades-consumidoras/${id}/calculate-economy`, parametros);
    }

    // ========================================
    // UGs (USINAS GERADORAS)
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
        console.log('💾 Criando nova UG na API...', dadosUG.nomeUsina);
        return this.post('/ugs', dadosUG);
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

    async getUCsAtribuidasUG(id) {
        return this.get(`/ugs/${id}/ucs-atribuidas`);
    }

    async atribuirUCaUG(ugId, ucId) {
        return this.post(`/ugs/${ugId}/atribuir-uc`, { uc_id: ucId });
    }

    async desatribuirUCdeUG(ugId, ucId) {
        return this.post(`/ugs/${ugId}/desatribuir-uc`, { uc_id: ucId });
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

    async linkUGControle(controleId, ugId) {
        return this.post(`/controle/${controleId}/link-ug`, { ug_id: ugId });
    }

    async unlinkUGControle(controleId) {
        return this.post(`/controle/${controleId}/unlink-ug`);
    }

    async deactivateControle(id) {
        return this.post(`/controle/${id}/deactivate`);
    }

    async reactivateControle(id) {
        return this.post(`/controle/${id}/reactivate`);
    }

    async calibrarControle(id, percentual) {
        return this.post(`/controle/${id}/calibrar`, { percentual });
    }

    async aplicarCalibragemGlobal(percentual, filtros = {}) {
        return this.post('/controle/calibragem-global', { percentual, filtros });
    }

    async getEstatisticasControle(filtros = {}) {
        const params = new URLSearchParams(filtros).toString();
        const endpoint = params ? `/controle/statistics?${params}` : '/controle/statistics';
        return this.get(endpoint);
    }

    async exportarControle(filtros = {}) {
        const params = new URLSearchParams(filtros).toString();
        const endpoint = params ? `/controle/export?${params}` : '/controle/export';
        return this.get(endpoint);
    }

    async bulkCalibrarControle(ids, percentual) {
        return this.post('/controle/bulk-calibrar', { ids, percentual });
    }

    async bulkLinkUGControle(controleIds, ugId) {
        return this.post('/controle/bulk-link-ug', { controle_ids: controleIds, ug_id: ugId });
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

    async atualizarConfiguracao(chave, valor) {
        return this.put(`/configuracoes/${chave}`, { valor });
    }

    async getCalibragemGlobal() {
        return this.get('/configuracoes/calibragem-global/value');
    }

    async updateCalibragemGlobal(valor) {
        return this.post('/configuracoes/calibragem-global/update', { valor });
    }

    async bulkUpdateConfiguracoes(configuracoes) {
        return this.post('/configuracoes/bulk-update', { configuracoes });
    }

    async resetarConfiguracoes(chaves = null) {
        return this.post('/configuracoes/reset-to-default', { chaves });
    }

    async exportarConfiguracoes() {
        return this.get('/configuracoes/export');
    }

    async limparCacheConfiguracoes() {
        return this.post('/configuracoes/clear-cache');
    }

    // ========================================
    // NOTIFICAÇÕES
    // ========================================

    async getNotificacoes(filtros = {}) {
        const params = new URLSearchParams(filtros).toString();
        const endpoint = params ? `/notificacoes?${params}` : '/notificacoes';
        return this.get(endpoint);
    }

    async getNotificacao(id) {
        return this.get(`/notificacoes/${id}`);
    }

    async criarNotificacao(notifData) {
        return this.post('/notificacoes', notifData);
    }

    async marcarComoLida(id) {
        return this.patch(`/notificacoes/${id}/mark-read`);
    }

    async marcarTodasComoLidas() {
        return this.patch('/notificacoes/mark-all-read');
    }

    async excluirNotificacao(id) {
        return this.delete(`/notificacoes/${id}`);
    }

    async limparNotificacoesAntigas() {
        return this.delete('/notificacoes/cleanup-old');
    }

    async getUnreadCount() {
        return this.get('/notificacoes/unread-count');
    }

    async broadcastNotificacao(dados) {
        return this.post('/notificacoes/broadcast', dados);
    }

    async getEstatisticasNotificacoes() {
        return this.get('/notificacoes/statistics');
    }

    // ========================================
    // DASHBOARD & SISTEMA
    // ========================================

    async getDashboardData(filtros = {}) {
        const params = new URLSearchParams(filtros).toString();
        const endpoint = params ? `/dashboard?${params}` : '/dashboard';
        return this.get(endpoint);
    }

    async getDashboardResumo() {
        return this.get('/dashboard/resumo');
    }

    async getSystemInfo() {
        return this.get('/sistema/info');
    }

    async getSystemHealth() {
        return this.get('/sistema/health');
    }

    // ========================================
    // RELATÓRIOS
    // ========================================

    async getRelatorioGeral() {
        return this.get('/relatorios/geral');
    }

    async getRelatorioVendas(filtros = {}) {
        const params = new URLSearchParams(filtros).toString();
        const endpoint = params ? `/relatorios/vendas?${params}` : '/relatorios/vendas';
        return this.get(endpoint);
    }

    async getRelatorioPerformance(filtros = {}) {
        const params = new URLSearchParams(filtros).toString();
        const endpoint = params ? `/relatorios/performance?${params}` : '/relatorios/performance';
        return this.get(endpoint);
    }

    async getRelatorioEconomias(filtros = {}) {
        const params = new URLSearchParams(filtros).toString();
        const endpoint = params ? `/relatorios/economias?${params}` : '/relatorios/economias';
        return this.get(endpoint);
    }

    // ========================================
    // UTILITÁRIOS
    // ========================================

    async uploadGenerico(file, tipo = 'documento') {
        return this.uploadFile('/utils/upload', file, { type: tipo });
    }

    async validarDocumento(documento, tipo) {
        return this.post('/utils/validate-document', { document: documento, type: tipo });
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