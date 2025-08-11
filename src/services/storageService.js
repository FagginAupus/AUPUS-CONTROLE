// src/services/storageService.js - VERSÃO CORRIGIDA SEM LOGIN LOCAL
import apiService from './apiService';

class StorageService {
    constructor() {
        this.useAPI = false;
        this.calibragemGlobal = 0;
        console.log('🚀 StorageService inicializado em modo híbrido');
        this.detectarModoOperacao();
    }

    // ========================================
    // DETECÇÃO DE MODO DE OPERAÇÃO
    // ========================================

    async detectarModoOperacao() {
        try {
            const healthCheck = await apiService.healthCheck();
            this.useAPI = healthCheck && healthCheck.status === 'ok';
            
            if (this.useAPI) {
                console.log('✅ Modo API ativado - Conectado ao backend');
            } else {
                console.log('⚠️ Modo offline - Usando localStorage apenas');
            }
        } catch (error) {
            this.useAPI = false;
            console.log('⚠️ API não disponível - Modo offline ativo');
        }
    }

    // ========================================
    // AUTENTICAÇÃO - APENAS VIA API/BANCO
    // ========================================

    async login(credentials) {
        // Aceitar tanto objeto credentials quanto email, password separados
        let email, password;
        
        if (typeof credentials === 'object' && credentials.email && credentials.password) {
            email = credentials.email;
            password = credentials.password;
        } else if (arguments.length === 2) {
            // Compatibilidade com login(email, password)
            email = credentials;
            password = arguments[1];
        } else {
            throw new Error('Credenciais inválidas');
        }

        console.log('🔐 login - tentando autenticação para:', email);

        if (this.useAPI) {
            console.log('🔐 login (API)');
            const response = await apiService.post('/auth/login', { email, password });
            console.log('🔍 Resposta completa da API:', response);
            
            if (response && response.success && response.user && response.token) {
                // Salvar token no apiService
                apiService.setToken(response.token);
                
                // Mapear corretamente os campos do usuário
                const userData = {
                    id: response.user.id,
                    name: response.user.name,
                    nome: response.user.name, // Compatibilidade
                    email: response.user.email,
                    role: response.user.role,
                    telefone: response.user.telefone,
                    is_active: response.user.is_active,
                    permissions: response.user.permissions || [],
                    token: response.token,
                    lastLogin: new Date().toISOString()
                };
                
                localStorage.setItem('user', JSON.stringify(userData));
                localStorage.setItem('token', response.token);
                
                console.log('✅ Login API realizado:', userData.name);
                return userData;
            } else {
                console.log('❌ Resposta da API inválida:', response);
                throw new Error(response?.message || 'Credenciais inválidas');
            }
        } else {
            throw new Error('Sistema offline - login indisponível');
        }
    }

    logout() {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        apiService.clearToken();
        console.log('👋 Logout realizado');
    }

    getCurrentUser() {
        try {
            const userData = localStorage.getItem('user');
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            console.error('❌ Erro ao obter dados do usuário:', error);
            return null;
        }
    }

    // ========================================
    // PROPOSTAS - CORRIGIDO
    // ========================================

    async getProspec() {
        if (this.useAPI) {
            try {
                console.log('📥 getProspec (API)');
                const response = await apiService.get('/propostas');
                
                // CORREÇÃO: Verificar estrutura da resposta
                let propostas = [];
                if (response && response.data && Array.isArray(response.data.data)) {
                    // Resposta paginada
                    propostas = response.data.data;
                } else if (response && Array.isArray(response.data)) {
                    // Array direto
                    propostas = response.data;
                } else if (Array.isArray(response)) {
                    // Array na raiz
                    propostas = response;
                } else {
                    console.warn('⚠️ Estrutura de resposta inesperada:', response);
                    propostas = [];
                }
                
                // Cache no localStorage com verificação
                localStorage.setItem('propostas', JSON.stringify(propostas));
                console.log(`✅ Carregadas ${propostas.length} propostas da API`);
                
                return propostas;
            } catch (error) {
                console.log('⚠️ API falhou, usando localStorage:', error.message);
                // Fallback para localStorage
                const localPropostas = this.getProspecLocal();
                console.log(`✅ Carregadas ${localPropostas.length} propostas do localStorage`);
                return localPropostas;
            }
        } else {
            return this.getProspecLocal();
        }
    }

    getProspecLocal() {
        try {
            const propostas = JSON.parse(localStorage.getItem('propostas') || '[]');
            console.log(`✅ Carregadas ${propostas.length} propostas do localStorage`);
            return Array.isArray(propostas) ? propostas : [];
        } catch (error) {
            console.error('❌ Erro ao ler localStorage:', error);
            return [];
        }
    }

    async saveProspec(proposta) {
        if (this.useAPI) {
            try {
                console.log('💾 saveProspec (API):', proposta.numeroProposta || proposta.numero_proposta);
                
                // CORREÇÃO: Mapear dados para formato esperado pelo backend
                const dadosBackend = this.mapearPropostaParaBackend(proposta);
                
                const response = await apiService.post('/propostas', dadosBackend);
                
                // Atualizar cache local com verificação
                const propostas = this.getProspecLocal();
                const existingIndex = propostas.findIndex(p => p.id === proposta.id);
                
                if (existingIndex >= 0) {
                    propostas[existingIndex] = response;
                } else {
                    propostas.push(response);
                }
                
                localStorage.setItem('propostas', JSON.stringify(propostas));
                console.log('✅ Proposta salva na API e cache atualizado');
                
                return response;
            } catch (error) {
                console.log('⚠️ API falhou, salvando localmente:', error.message);
                return this.saveProspecLocal(proposta);
            }
        } else {
            return this.saveProspecLocal(proposta);
        }
    }

    // NOVO: Mapear dados do frontend para backend
    mapearPropostaParaBackend(proposta) {
        return {
            // Campos obrigatórios
            nome_cliente: proposta.nomeCliente || proposta.nome_cliente,
            consultor: proposta.consultor,
            
            // Campos opcionais
            data_proposta: proposta.data || proposta.data_proposta,
            numero_proposta: proposta.numeroProposta || proposta.numero_proposta,
            telefone: proposta.celular || proposta.telefone,
            status: proposta.status || 'Aguardando',
            economia: proposta.descontoTarifa ? (proposta.descontoTarifa * 100) : proposta.economia,
            bandeira: proposta.descontoBandeira ? (proposta.descontoBandeira * 100) : proposta.bandeira,
            recorrencia: proposta.recorrencia,
            
            // Benefícios - converter objeto em array se necessário
            beneficios: proposta.beneficios ? 
                (Array.isArray(proposta.beneficios) ? proposta.beneficios : Object.values(proposta.beneficios)) : 
                null,
            
            // Unidades Consumidoras (se existir)
            unidades_consumidoras: proposta.numeroUC ? [{
                numero_unidade: parseInt(proposta.numeroUC),
                numero_cliente: parseInt(proposta.numeroUC), // Assumindo mesmo valor
                apelido: proposta.apelido,
                ligacao: proposta.ligacao,
                consumo_medio: parseInt(proposta.media) || 0,
                distribuidora: proposta.distribuidora
            }] : proposta.unidades_consumidoras || null
        };
    }

    // ✅ MÉTODO ADICIONADO - adicionarProspec como alias para saveProspec
    async adicionarProspec(proposta) {
        console.log('📝 adicionarProspec - Alias para saveProspec');
        return await this.saveProspec(proposta);
    }

    saveProspecLocal(proposta) {
        try {
            const propostas = this.getProspecLocal();
            const timestamp = new Date().toISOString();
            
            if (proposta.id) {
                // Atualizar existente
                const index = propostas.findIndex(p => p.id === proposta.id);
                if (index >= 0) {
                    propostas[index] = { ...proposta, updated_at: timestamp };
                } else {
                    propostas.push({ ...proposta, updated_at: timestamp });
                }
            } else {
                // Nova proposta
                const novaProposta = {
                    ...proposta,
                    id: `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    created_at: timestamp,
                    updated_at: timestamp
                };
                propostas.push(novaProposta);
            }
            
            localStorage.setItem('propostas', JSON.stringify(propostas));
            console.log('✅ Proposta salva no localStorage');
            
            return propostas[propostas.length - 1];
        } catch (error) {
            console.error('❌ Erro ao salvar proposta:', error);
            throw error;
        }
    }

    async deleteProspec(id) {
        if (this.useAPI) {
            try {
                console.log('🗑️ deleteProspec (API)');
                await apiService.delete(`/propostas/${id}`);
                
                // Remover do cache local
                const propostas = this.getProspecLocal();
                const novasPropostas = propostas.filter(p => p.id !== id);
                localStorage.setItem('propostas', JSON.stringify(novasPropostas));
                
                console.log('✅ Proposta removida da API');
            } catch (error) {
                console.log('⚠️ API falhou, removendo localmente:', error.message);
                this.deleteProspecLocal(id);
            }
        } else {
            this.deleteProspecLocal(id);
        }
    }

    deleteProspecLocal(id) {
        try {
            const propostas = this.getProspecLocal();
            const novasPropostas = propostas.filter(p => p.id !== id);
            localStorage.setItem('propostas', JSON.stringify(novasPropostas));
            console.log('✅ Proposta removida do localStorage');
        } catch (error) {
            console.error('❌ Erro ao remover proposta:', error);
            throw error;
        }
    }

    // ========================================
    // CONTROLE - CORRIGIDO
    // ========================================

    async getControle() {
        if (this.useAPI) {
            try {
                console.log('📥 getControle (API)');
                const response = await apiService.get('/controle');
                
                let controles = [];
                if (response && response.data && Array.isArray(response.data.data)) {
                    controles = response.data.data;
                } else if (response && Array.isArray(response.data)) {
                    controles = response.data;
                } else if (Array.isArray(response)) {
                    controles = response;
                } else {
                    controles = [];
                }
                
                localStorage.setItem('controle', JSON.stringify(controles));
                console.log(`✅ Carregadas ${controles.length} do controle da API`);
                
                return controles;
            } catch (error) {
                console.log('⚠️ API falhou, usando localStorage:', error.message);
                const localControles = this.getControleLocal();
                console.log(`✅ Carregadas ${localControles.length} do controle do localStorage`);
                return localControles;
            }
        } else {
            return this.getControleLocal();
        }
    }

    getControleLocal() {
        try {
            const controles = JSON.parse(localStorage.getItem('controle') || '[]');
            console.log(`✅ Carregadas ${controles.length} do controle do localStorage`);
            return Array.isArray(controles) ? controles : [];
        } catch (error) {
            console.error('❌ Erro ao ler controle do localStorage:', error);
            return [];
        }
    }

    // ========================================
    // UGS (USINAS GERADORAS) - CORRIGIDO
    // ========================================

    async getUGs() {
        if (this.useAPI) {
            try {
                console.log('📥 getUGs (API)');
                const response = await apiService.get('/ugs');
                
                let ugs = [];
                if (response && response.data && Array.isArray(response.data.data)) {
                    ugs = response.data.data;
                } else if (response && Array.isArray(response.data)) {
                    ugs = response.data;
                } else if (Array.isArray(response)) {
                    ugs = response;
                } else {
                    ugs = [];
                }
                
                localStorage.setItem('ugs', JSON.stringify(ugs));
                console.log(`✅ Carregadas ${ugs.length} UGs da API`);
                
                return ugs;
            } catch (error) {
                console.log('⚠️ API falhou, usando localStorage:', error.message);
                const localUGs = this.getUGsLocal();
                console.log(`✅ Carregadas ${localUGs.length} UGs do localStorage`);
                return localUGs;
            }
        } else {
            return this.getUGsLocal();
        }
    }

    getUGsLocal() {
        try {
            const ugs = JSON.parse(localStorage.getItem('ugs') || '[]');
            console.log(`✅ Carregadas ${ugs.length} UGs do localStorage`);
            return Array.isArray(ugs) ? ugs : [];
        } catch (error) {
            console.error('❌ Erro ao ler UGs do localStorage:', error);
            return [];
        }
    }

    // ========================================
    // UTILITÁRIOS
    // ========================================

    clearAllData() {
        localStorage.removeItem('propostas');
        localStorage.removeItem('controle');
        localStorage.removeItem('ugs');
        localStorage.removeItem('user');
        localStorage.removeItem('calibragemGlobal');
        console.log('🧹 Todos os dados removidos do localStorage');
    }

    getUserData() {
        try {
            const userData = localStorage.getItem('user');
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            console.error('❌ Erro ao obter dados do usuário:', error);
            return null;
        }
    }

    setUserData(userData) {
        localStorage.setItem('user', JSON.stringify(userData));
    }
}

// Instância única
const storageService = new StorageService();

// ✅ EXPORTAÇÕES CORRETAS
export default storageService;
export { storageService };