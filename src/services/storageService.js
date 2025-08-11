// src/services/storageService.js - Híbrido: API + localStorage como fallback
import apiService from './apiService';

class StorageService {
    constructor() {
        this.useAPI = true; // Flag para usar API ou localStorage
        this.calibragemGlobal = 0; // Cache local
        
        console.log('🚀 StorageService inicializado em modo híbrido');
        this.detectarModoOperacao();
    }

    // ========================================
    // CONFIGURAÇÃO E DETECÇÃO DE MODO
    // ========================================

    async detectarModoOperacao() {
        try {
            await apiService.healthCheck();
            this.useAPI = true;
            console.log('✅ Modo API ativado - Conectado ao backend');
        } catch (error) {
            this.useAPI = false;
            console.log('⚠️ Modo localStorage ativado - Backend indisponível:', error.message);
        }
    }

    setMode(useAPI) {
        this.useAPI = useAPI;
        console.log(`🔧 Modo alterado para: ${useAPI ? 'API' : 'localStorage'}`);
    }

    // ========================================
    // AUTENTICAÇÃO
    // ========================================

    async login(credentials) {
        if (this.useAPI) {
            try {
                console.log('🔐 login (API)');
                // Garantir que estamos enviando email, não username
                const loginData = {
                    email: credentials.email,
                    password: credentials.password
                };
                
                const response = await apiService.login(loginData);
                
                if (response && response.success) {
                    // Salvar dados localmente também
                    localStorage.setItem('aupus_user', JSON.stringify(response.user));
                    localStorage.setItem('aupus_token', response.token);
                    
                    console.log('✅ Login API realizado:', response.user.name);
                    return response;
                }
                
                throw new Error(response.message || 'Falha no login');
            } catch (error) {
                console.log('⚠️ API falhou, usando localStorage:', error.message);
                return this.loginLocal(credentials);
            }
        } else {
            return this.loginLocal(credentials);
        }
    }

    loginLocal(credentials) {
        console.log('🔐 login (localStorage)');
        
        try {
            // Verificar usuário admin padrão (com email em vez de username)
            if (credentials.email === 'admin@aupus.com' && credentials.password === '123') {
                const adminUser = {
                    id: 'admin',
                    email: 'admin@aupus.com',
                    name: 'Administrador',
                    nome: 'Administrador',
                    role: 'admin',
                    permissions: {
                        canCreateConsultors: true,
                        canAccessAll: true,
                        canManageUGs: true,
                        canManageCalibration: true,
                        canSeeAllData: true
                    }
                };
                
                localStorage.setItem('aupus_user', JSON.stringify(adminUser));
                localStorage.setItem('aupus_token', 'local_admin_token');
                
                console.log('✅ Login admin local realizado');
                return { 
                    success: true, 
                    user: adminUser,
                    token: 'local_admin_token'
                };
            }

            // Verificar usuários cadastrados localmente
            const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
            const usuario = usuarios.find(u => 
                u.email === credentials.email && u.password === credentials.password
            );

            if (usuario) {
                const userData = {
                    ...usuario,
                    nome: usuario.name || usuario.nome
                };
                
                localStorage.setItem('aupus_user', JSON.stringify(userData));
                localStorage.setItem('aupus_token', `local_token_${userData.id}`);
                
                console.log('✅ Login local realizado:', userData.nome);
                return { 
                    success: true, 
                    user: userData,
                    token: `local_token_${userData.id}`
                };
            }

            return { 
                success: false, 
                message: 'Email ou senha incorretos'
            };

        } catch (error) {
            console.error('❌ Erro no login local:', error);
            return { 
                success: false, 
                message: 'Erro no sistema de autenticação local' 
            };
        }
    }

    async logout() {
        if (this.useAPI) {
            try {
                console.log('🚪 logout (API)');
                await apiService.logout();
            } catch (error) {
                console.log('⚠️ Erro no logout da API:', error.message);
            }
        }
        
        // Limpar dados locais
        localStorage.removeItem('aupus_user');
        localStorage.removeItem('aupus_token');
    }

    async getCurrentUser() {
        if (this.useAPI) {
            try {
                const response = await apiService.getCurrentUser();
                const user = response.data || response;
                localStorage.setItem('aupus_user', JSON.stringify(user));
                return user;
            } catch (error) {
                console.log('⚠️ API falhou, usando localStorage:', error.message);
                return this.getUserLocal();
            }
        } else {
            return this.getUserLocal();
        }
    }

    getUserLocal() {
        try {
            const userData = localStorage.getItem('aupus_user');
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            console.error('❌ Erro ao obter usuário local:', error);
            return null;
        }
    }

    async getTeam() {
        if (this.useAPI) {
            try {
                const response = await apiService.getTeam();
                return response.data || response;
            } catch (error) {
                console.log('⚠️ API falhou, usando localStorage:', error.message);
                return this.getTeamLocal();
            }
        } else {
            return this.getTeamLocal();
        }
    }

    getTeamLocal() {
        try {
            const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
            const currentUser = this.getUserLocal();
            
            if (!currentUser) return [];
            
            if (currentUser.role === 'admin') {
                return usuarios;
            }
            
            // Para outros usuários, retornar apenas subordinados
            return usuarios.filter(u => u.createdBy === currentUser.id);
            
        } catch (error) {
            console.error('❌ Erro ao obter equipe local:', error);
            return [];
        }
    }

    // ========================================
    // MÉTODOS PARA PROPOSTAS (PROSPEC)
    // ========================================

    async getProspec() {
        if (this.useAPI) {
            try {
                console.log('📥 getProspec (API)');
                const response = await apiService.getPropostas();
                const dados = response.data || response;
                
                // Cache local
                localStorage.setItem('propostas', JSON.stringify(dados));
                console.log(`✅ Carregadas ${dados.length} propostas da API`);
                
                return dados;
            } catch (error) {
                console.log('⚠️ API falhou, usando localStorage:', error.message);
                return this.getProspecLocal();
            }
        } else {
            return this.getProspecLocal();
        }
    }

    getProspecLocal() {
        console.log('📥 getProspec (localStorage)');
        const dados = JSON.parse(localStorage.getItem('propostas') || '[]');
        console.log(`✅ Carregadas ${dados.length} propostas do localStorage`);
        return dados;
    }

    async saveProspec(dados) {
        if (this.useAPI) {
            try {
                console.log('💾 saveProspec (API)');
                const response = await apiService.saveProposta(dados);
                
                // Atualizar cache local
                this.updateProspecLocal(dados);
                
                return response;
            } catch (error) {
                console.log('⚠️ API falhou, salvando no localStorage:', error.message);
                return this.saveProspecLocal(dados);
            }
        } else {
            return this.saveProspecLocal(dados);
        }
    }

    saveProspecLocal(dados) {
        console.log('💾 saveProspec (localStorage)');
        const propostas = JSON.parse(localStorage.getItem('propostas') || '[]');
        
        const index = propostas.findIndex(p => p.id === dados.id);
        if (index >= 0) {
            propostas[index] = { ...propostas[index], ...dados };
        } else {
            dados.id = dados.id || Date.now().toString();
            propostas.push(dados);
        }
        
        localStorage.setItem('propostas', JSON.stringify(propostas));
        console.log('✅ Proposta salva no localStorage');
        return { success: true, data: dados };
    }

    updateProspecLocal(dados) {
        const propostas = JSON.parse(localStorage.getItem('propostas') || '[]');
        const index = propostas.findIndex(p => p.id === dados.id);
        
        if (index >= 0) {
            propostas[index] = { ...propostas[index], ...dados };
            localStorage.setItem('propostas', JSON.stringify(propostas));
        }
    }

    async deleteProspec(id) {
        if (this.useAPI) {
            try {
                console.log('🗑️ deleteProspec (API)');
                const response = await apiService.deleteProposta(id);
                
                // Remover do cache local
                this.deleteProspecLocal(id);
                
                return response;
            } catch (error) {
                console.log('⚠️ API falhou, removendo do localStorage:', error.message);
                return this.deleteProspecLocal(id);
            }
        } else {
            return this.deleteProspecLocal(id);
        }
    }

    deleteProspecLocal(id) {
        console.log('🗑️ deleteProspec (localStorage)');
        const propostas = JSON.parse(localStorage.getItem('propostas') || '[]');
        const novasPropostas = propostas.filter(p => p.id !== id);
        localStorage.setItem('propostas', JSON.stringify(novasPropostas));
        console.log('✅ Proposta removida do localStorage');
        return { success: true };
    }

    // ========================================
    // MÉTODOS PARA CONTROLE
    // ========================================

    async getControle() {
        if (this.useAPI) {
            try {
                console.log('📥 getControle (API)');
                const response = await apiService.getControle();
                const dados = response.data || response;
                
                // Cache local
                localStorage.setItem('controle', JSON.stringify(dados));
                console.log(`✅ Carregadas ${dados.length} do controle da API`);
                
                return dados;
            } catch (error) {
                console.log('⚠️ API falhou, usando localStorage:', error.message);
                return this.getControleLocal();
            }
        } else {
            return this.getControleLocal();
        }
    }

    getControleLocal() {
        console.log('📥 getControle (localStorage)');
        const dados = JSON.parse(localStorage.getItem('controle') || '[]');
        console.log(`✅ Carregadas ${dados.length} do controle do localStorage`);
        return dados;
    }

    async saveControle(dados) {
        if (this.useAPI) {
            try {
                console.log('💾 saveControle (API)');
                const response = await apiService.saveControle(dados);
                
                // Atualizar cache local
                this.updateControleLocal(dados);
                
                return response;
            } catch (error) {
                console.log('⚠️ API falhou, salvando no localStorage:', error.message);
                return this.saveControleLocal(dados);
            }
        } else {
            return this.saveControleLocal(dados);
        }
    }

    saveControleLocal(dados) {
        console.log('💾 saveControle (localStorage)');
        const controle = JSON.parse(localStorage.getItem('controle') || '[]');
        
        const index = controle.findIndex(c => c.id === dados.id);
        if (index >= 0) {
            controle[index] = { ...controle[index], ...dados };
        } else {
            dados.id = dados.id || Date.now().toString();
            controle.push(dados);
        }
        
        localStorage.setItem('controle', JSON.stringify(controle));
        console.log('✅ Controle salvo no localStorage');
        return { success: true, data: dados };
    }

    updateControleLocal(dados) {
        const controle = JSON.parse(localStorage.getItem('controle') || '[]');
        const index = controle.findIndex(c => c.id === dados.id);
        
        if (index >= 0) {
            controle[index] = { ...controle[index], ...dados };
            localStorage.setItem('controle', JSON.stringify(controle));
        }
    }

    async deleteControle(id) {
        if (this.useAPI) {
            try {
                console.log('🗑️ deleteControle (API)');
                const response = await apiService.deleteControle(id);
                
                // Remover do cache local
                this.deleteControleLocal(id);
                
                return response;
            } catch (error) {
                console.log('⚠️ API falhou, removendo do localStorage:', error.message);
                return this.deleteControleLocal(id);
            }
        } else {
            return this.deleteControleLocal(id);
        }
    }

    deleteControleLocal(id) {
        console.log('🗑️ deleteControle (localStorage)');
        const controle = JSON.parse(localStorage.getItem('controle') || '[]');
        const novoControle = controle.filter(c => c.id !== id);
        localStorage.setItem('controle', JSON.stringify(novoControle));
        console.log('✅ Controle removido do localStorage');
        return { success: true };
    }

    // ========================================
    // MÉTODOS PARA CONFIGURAÇÕES
    // ========================================

    async getConfiguracoes(grupo = null) {
        if (this.useAPI) {
            try {
                const response = await apiService.getConfiguracoes(grupo);
                const dados = response.data || response;
                
                // Cache local
                const chave = grupo ? `config_${grupo}` : 'configuracoes';
                localStorage.setItem(chave, JSON.stringify(dados));
                
                return dados;
            } catch (error) {
                console.log('⚠️ API falhou, usando localStorage:', error.message);
                return this.getConfiguracoesLocal(grupo);
            }
        } else {
            return this.getConfiguracoesLocal(grupo);
        }
    }

    getConfiguracoesLocal(grupo = null) {
        const chave = grupo ? `config_${grupo}` : 'configuracoes';
        return JSON.parse(localStorage.getItem(chave) || '{}');
    }

    async saveConfiguracao(grupo, chave, valor) {
        const dados = { grupo, chave, valor };
        
        if (this.useAPI) {
            try {
                const response = await apiService.saveConfiguracao(dados);
                
                // Atualizar cache local
                this.updateConfiguracaoLocal(grupo, chave, valor);
                
                return response;
            } catch (error) {
                console.log('⚠️ API falhou, salvando no localStorage:', error.message);
                return this.saveConfiguracaoLocal(grupo, chave, valor);
            }
        } else {
            return this.saveConfiguracaoLocal(grupo, chave, valor);
        }
    }

    saveConfiguracaoLocal(grupo, chave, valor) {
        const configKey = `config_${grupo}`;
        const config = JSON.parse(localStorage.getItem(configKey) || '{}');
        config[chave] = valor;
        localStorage.setItem(configKey, JSON.stringify(config));
        return { success: true };
    }

    updateConfiguracaoLocal(grupo, chave, valor) {
        const configKey = `config_${grupo}`;
        const config = JSON.parse(localStorage.getItem(configKey) || '{}');
        config[chave] = valor;
        localStorage.setItem(configKey, JSON.stringify(config));
    }

    // ========================================
    // CALIBRAGEM GLOBAL
    // ========================================

    async getCalibragemGlobal() {
        if (this.useAPI) {
            try {
                const config = await this.getConfiguracoes('global');
                this.calibragemGlobal = parseFloat(config.calibragem || 0);
                return this.calibragemGlobal;
            } catch (error) {
                console.log('⚠️ Erro ao obter calibragem da API, usando cache:', error.message);
                return this.calibragemGlobal;
            }
        } else {
            const config = this.getConfiguracoesLocal('global');
            this.calibragemGlobal = parseFloat(config.calibragem || 0);
            return this.calibragemGlobal;
        }
    }

    async setCalibragemGlobal(valor) {
        this.calibragemGlobal = parseFloat(valor || 0);
        await this.saveConfiguracao('global', 'calibragem', this.calibragemGlobal);
        console.log(`⚙️ Calibragem global definida: ${this.calibragemGlobal}%`);
        return this.calibragemGlobal;
    }

    // ========================================
    // MÉTODOS DE UTILIDADE
    // ========================================

    // Limpar todos os dados (reset)
    clearAllData() {
        const keys = [
            'aupus_user', 'aupus_token', 'propostas', 'controle', 
            'usuarios', 'configuracoes'
        ];
        
        keys.forEach(key => localStorage.removeItem(key));
        
        // Limpar configs específicas
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith('config_')) {
                localStorage.removeItem(key);
            }
        });
        
        this.calibragemGlobal = 0;
        console.log('🧹 Todos os dados locais foram limpos');
    }

    // Verificar integridade dos dados
    async verifyDataIntegrity() {
        try {
            const user = this.getUserLocal();
            const token = localStorage.getItem('aupus_token');
            const propostas = this.getProspecLocal();
            const controle = this.getControleLocal();
            
            return {
                hasUser: !!user,
                hasToken: !!token,
                propostas: propostas.length,
                controle: controle.length,
                apiAvailable: this.useAPI
            };
        } catch (error) {
            console.error('❌ Erro na verificação de integridade:', error);
            return null;
        }
    }

    // Sincronizar dados locais com API
    async syncWithAPI() {
        if (!this.useAPI) {
            console.log('⚠️ API não disponível para sincronização');
            return false;
        }

        try {
            console.log('🔄 Iniciando sincronização com API...');
            
            // Re-detectar disponibilidade da API
            await this.detectarModoOperacao();
            
            if (this.useAPI) {
                // Buscar dados atualizados
                await this.getProspec();
                await this.getControle();
                await this.getCalibragemGlobal();
                
                console.log('✅ Sincronização concluída');
                return true;
            }
            
            return false;
        } catch (error) {
            console.error('❌ Erro na sincronização:', error);
            return false;
        }
    }
}

// Instância única
export const storageService = new StorageService();
export default storageService;