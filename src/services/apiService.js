// src/services/apiService.js - Service para integração com Backend Laravel
import Cookies from 'js-cookie';

class ApiService {
    constructor() {
        // URL base da API - ajustar conforme seu servidor
        this.baseURL = process.env.NODE_ENV === 'production' 
            ? 'http://45.55.122.87/api'  // URL de produção
            : 'http://localhost:8000/api'; // URL de desenvolvimento
        
        this.token = Cookies.get('aupus_token') || localStorage.getItem('aupus_token');
        
        console.log(`🔗 ApiService inicializado - Environment: ${process.env.NODE_ENV}`);
        console.log(`🌐 Base URL: ${this.baseURL}`);
    }

    // Configurar token de autenticação
    setToken(token) {
        this.token = token;
        Cookies.set('aupus_token', token, { expires: 7 }); // 7 dias
        localStorage.setItem('aupus_token', token);
        console.log('🔐 Token configurado');
    }

    // Remover token
    clearToken() {
        this.token = null;
        Cookies.remove('aupus_token');
        localStorage.removeItem('aupus_token');
        console.log('🚪 Token removido');
    }

    // Método base para requisições
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
                    window.location.href = '/login';
                    throw new Error('Sessão expirada');
                }
                
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}`);
            }

            const data = await response.json();
            console.log(`✅ Resposta recebida:`, data);
            return data;

        } catch (error) {
            console.error(`❌ Erro na requisição ${endpoint}:`, error);
            throw error;
        }
    }

    // Métodos HTTP específicos
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

    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }

    // ========================================
    // MÉTODOS DE AUTENTICAÇÃO
    // ========================================

    async login(email, password) {
        try {
            const response = await this.post('/auth/login', {
                email,
                password,
            });

            if (response.success && response.token) {
                this.setToken(response.token);
                return {
                    success: true,
                    user: response.user,
                    token: response.token,
                };
            }

            return {
                success: false,
                message: response.message || 'Erro no login',
            };
        } catch (error) {
            return {
                success: false,
                message: error.message || 'Erro de conexão',
            };
        }
    }

    async logout() {
        try {
            await this.post('/auth/logout');
        } catch (error) {
            console.error('Erro no logout:', error);
        } finally {
            this.clearToken();
        }
    }

    async getUser() {
        try {
            const response = await this.get('/auth/user');
            return response.user;
        } catch (error) {
            console.error('Erro ao obter usuário:', error);
            return null;
        }
    }

    // ========================================
    // MÉTODOS PARA PROPOSTAS
    // ========================================

    async getPropostas() {
        const response = await this.get('/propostas');
        return response.data || [];
    }

    async criarProposta(proposta) {
        const response = await this.post('/propostas', proposta);
        return response.data;
    }

    async atualizarProposta(id, dados) {
        const response = await this.put(`/propostas/${id}`, dados);
        return response.data;
    }

    async excluirProposta(id) {
        await this.delete(`/propostas/${id}`);
        return true;
    }

    // ========================================
    // MÉTODOS PARA CONTROLE
    // ========================================

    async getControle() {
        const response = await this.get('/controle');
        return response.data || [];
    }

    async adicionarControle(proposta) {
        const response = await this.post('/controle', proposta);
        return response.data;
    }

    async atualizarControle(id, dados) {
        const response = await this.put(`/controle/${id}`, dados);
        return response.data;
    }

    async atualizarUGControle(id, ug) {
        const response = await this.put(`/controle/${id}/ug`, { ug });
        return response.data;
    }

    async removerControle(id) {
        await this.delete(`/controle/${id}`);
        return true;
    }

    // ========================================
    // MÉTODOS PARA UGS
    // ========================================

    async getUGs() {
        const response = await this.get('/unidades-consumidoras?tipo=ug');
        return response.data || [];
    }

    async criarUG(ug) {
        const response = await this.post('/unidades-consumidoras', {
            ...ug,
            is_ug: true
        });
        return response.data;
    }

    async atualizarUG(id, dados) {
        const response = await this.put(`/unidades-consumidoras/${id}`, dados);
        return response.data;
    }

    async excluirUG(id) {
        await this.delete(`/unidades-consumidoras/${id}`);
        return true;
    }

    // ========================================
    // MÉTODOS PARA USUÁRIOS
    // ========================================

    async getUsuarios() {
        const response = await this.get('/usuarios');
        return response.data || [];
    }

    async criarUsuario(usuario) {
        const response = await this.post('/usuarios', usuario);
        return response.data;
    }

    async atualizarUsuario(id, dados) {
        const response = await this.put(`/usuarios/${id}`, dados);
        return response.data;
    }

    // ========================================
    // MÉTODOS PARA CONFIGURAÇÕES
    // ========================================

    async getConfiguracoes() {
        const response = await this.get('/configuracoes');
        return response.data || {};
    }

    async salvarConfiguracao(chave, valor) {
        const response = await this.post('/configuracoes', { chave, valor });
        return response.data;
    }

    // ========================================
    // MÉTODOS PARA RELATÓRIOS E ESTATÍSTICAS
    // ========================================

    async getEstatisticas() {
        const response = await this.get('/relatorios/estatisticas');
        return response.data || {};
    }

    async getDashboardData() {
        const response = await this.get('/dashboard');
        return response.data || {};
    }

    // ========================================
    // MIGRAÇÃO DO LOCALSTORAGE PARA API
    // ========================================

    async migrarDadosLocalStorage() {
        try {
            console.log('🔄 Iniciando migração dos dados do localStorage...');
            
            // Obter dados do localStorage
            const prospecData = localStorage.getItem('aupus_prospec');
            const controleData = localStorage.getItem('aupus_controle');
            const ugsData = localStorage.getItem('aupus_ugs');

            let migrationResult = {
                propostas: 0,
                controle: 0,
                ugs: 0,
                errors: []
            };

            // Migrar propostas
            if (prospecData) {
                try {
                    const propostas = JSON.parse(prospecData);
                    for (const proposta of propostas) {
                        await this.criarProposta(proposta);
                        migrationResult.propostas++;
                    }
                } catch (error) {
                    migrationResult.errors.push(`Propostas: ${error.message}`);
                }
            }

            // Migrar UGs
            if (ugsData) {
                try {
                    const ugs = JSON.parse(ugsData);
                    for (const ug of ugs) {
                        await this.criarUG(ug);
                        migrationResult.ugs++;
                    }
                } catch (error) {
                    migrationResult.errors.push(`UGs: ${error.message}`);
                }
            }

            // Migrar controle
            if (controleData) {
                try {
                    const controle = JSON.parse(controleData);
                    for (const item of controle) {
                        await this.adicionarControle(item);
                        migrationResult.controle++;
                    }
                } catch (error) {
                    migrationResult.errors.push(`Controle: ${error.message}`);
                }
            }

            console.log('✅ Migração concluída:', migrationResult);
            return migrationResult;

        } catch (error) {
            console.error('❌ Erro na migração:', error);
            throw error;
        }
    }
}

// Exportar instância única
const apiService = new ApiService();
export default apiService;