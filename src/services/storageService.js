// src/services/storageService.js - COMPLETO COM CORREÇÃO DE LOGIN
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
    // AUTENTICAÇÃO - CORRIGIDO
    // ========================================

    async login(credentials) {
        // CORREÇÃO: Aceitar tanto objeto credentials quanto email, password separados
        let email, password;
        
        if (typeof credentials === 'object' && credentials.email && credentials.password) {
            email = credentials.email;
            password = credentials.password;
        } else if (arguments.length === 2) {
            // Compatibilidade com login(email, password)
            email = credentials;
            password = arguments[1];
        } else {
            return { success: false, message: 'Credenciais inválidas' };
        }

        console.log('🔐 login - tentando autenticação para:', email);

        if (this.useAPI) {
            try {
                console.log('🔐 login (API)');
                const response = await apiService.login(email, password);
                
                if (response.success && response.user && response.token) {
                    localStorage.setItem('aupus_user', JSON.stringify(response.user));
                    localStorage.setItem('aupus_token', response.token);
                    console.log(`✅ Login API realizado: ${response.user.name || response.user.nome}`);
                    return response;
                }
                
                return response;
            } catch (error) {
                console.log('⚠️ API falhou, tentando login local:', error.message);
                return this.loginLocal(email, password);
            }
        } else {
            return this.loginLocal(email, password);
        }
    }

    loginLocal(email, password) {
        try {
            console.log('🔐 loginLocal - tentando para:', email);
            
            // Verificar usuário admin padrão primeiro
            if (email === 'admin@aupus.com' && password === '123') {
                const adminUser = {
                    id: 'admin',
                    email: 'admin@aupus.com',
                    name: 'Administrador',
                    nome: 'Administrador',
                    role: 'admin',
                    permissions: ['all']
                };
                
                localStorage.setItem('aupus_user', JSON.stringify(adminUser));
                localStorage.setItem('aupus_token', `local_token_admin`);
                console.log('✅ Login admin local realizado');
                
                return { 
                    success: true, 
                    user: adminUser,
                    token: 'local_token_admin'
                };
            }

            // Buscar em usuários locais
            const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
            
            const userData = usuarios.find(u => 
                u.email && u.email.toLowerCase() === email.toLowerCase() && 
                (u.senha === password || u.password === password)
            );

            if (userData) {
                const normalizedUser = {
                    ...userData,
                    name: userData.nome || userData.name,
                    nome: userData.nome || userData.name
                };
                
                localStorage.setItem('aupus_user', JSON.stringify(normalizedUser));
                localStorage.setItem('aupus_token', `local_token_${userData.id}`);
                console.log(`✅ Login local realizado: ${normalizedUser.name}`);
                
                return { 
                    success: true, 
                    user: normalizedUser,
                    token: `local_token_${userData.id}`
                };
            }

            console.log('❌ Usuário não encontrado ou senha incorreta');
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
        console.log('✅ Logout local realizado');
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
            console.error('❌ Erro ao obter dados do usuário:', error);
            return null;
        }
    }

    // ========================================
    // PROPOSTAS
    // ========================================

    async getProspec() {
        if (this.useAPI) {
            try {
                console.log('📥 getProspec (API)');
                const response = await apiService.get('/propostas');
                const propostas = Array.isArray(response) ? response : (response.data || []);
                
                // Cache no localStorage
                localStorage.setItem('propostas', JSON.stringify(propostas));
                console.log(`✅ Carregadas ${propostas.length} propostas da API`);
                
                return propostas;
            } catch (error) {
                console.log('⚠️ API falhou, usando localStorage:', error.message);
                // Fallback para localStorage
                const localPropostas = JSON.parse(localStorage.getItem('propostas') || '[]');
                console.log(`✅ Carregadas ${localPropostas.length} propostas do localStorage`);
                return localPropostas;
            }
        } else {
            const propostas = JSON.parse(localStorage.getItem('propostas') || '[]');
            console.log(`✅ Carregadas ${propostas.length} propostas do localStorage`);
            return propostas;
        }
    }

    async saveProspec(proposta) {
        if (this.useAPI) {
            try {
                console.log('💾 saveProspec (API):', proposta.numero_proposta);
                const response = await apiService.post('/propostas', proposta);
                
                // Atualizar cache local
                const propostas = JSON.parse(localStorage.getItem('propostas') || '[]');
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

    saveProspecLocal(proposta) {
        try {
            const propostas = JSON.parse(localStorage.getItem('propostas') || '[]');
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
                console.log('🗑️ deleteProspec (API):', id);
                await apiService.delete(`/propostas/${id}`);
                
                // Remover do cache local
                const propostas = JSON.parse(localStorage.getItem('propostas') || '[]');
                const filteredPropostas = propostas.filter(p => p.id !== id);
                localStorage.setItem('propostas', JSON.stringify(filteredPropostas));
                
                console.log('✅ Proposta excluída da API e cache atualizado');
                return true;
            } catch (error) {
                console.log('⚠️ API falhou, excluindo localmente:', error.message);
                return this.deleteProspecLocal(id);
            }
        } else {
            return this.deleteProspecLocal(id);
        }
    }

    deleteProspecLocal(id) {
        try {
            const propostas = JSON.parse(localStorage.getItem('propostas') || '[]');
            const filteredPropostas = propostas.filter(p => p.id !== id);
            localStorage.setItem('propostas', JSON.stringify(filteredPropostas));
            console.log('✅ Proposta excluída do localStorage');
            return true;
        } catch (error) {
            console.error('❌ Erro ao excluir proposta:', error);
            throw error;
        }
    }

    // ========================================
    // CONTROLE CLUBE
    // ========================================

    async getControle() {
        if (this.useAPI) {
            try {
                console.log('📥 getControle (API)');
                const response = await apiService.get('/controle');
                const controle = Array.isArray(response) ? response : (response.data || []);
                
                // Cache no localStorage
                localStorage.setItem('controle', JSON.stringify(controle));
                console.log(`✅ Carregadas ${controle.length} do controle da API`);
                
                return controle;
            } catch (error) {
                console.log('⚠️ API falhou, usando localStorage:', error.message);
                // Fallback para localStorage
                const localControle = JSON.parse(localStorage.getItem('controle') || '[]');
                console.log(`✅ Carregadas ${localControle.length} do controle do localStorage`);
                return localControle;
            }
        } else {
            const controle = JSON.parse(localStorage.getItem('controle') || '[]');
            console.log(`✅ Carregadas ${controle.length} do controle do localStorage`);
            return controle;
        }
    }

    async saveControle(item) {
        if (this.useAPI) {
            try {
                console.log('💾 saveControle (API)');
                const response = await apiService.post('/controle', item);
                
                // Atualizar cache local
                const controle = JSON.parse(localStorage.getItem('controle') || '[]');
                const existingIndex = controle.findIndex(c => c.id === item.id);
                
                if (existingIndex >= 0) {
                    controle[existingIndex] = response;
                } else {
                    controle.push(response);
                }
                
                localStorage.setItem('controle', JSON.stringify(controle));
                console.log('✅ Item do controle salvo na API');
                
                return response;
            } catch (error) {
                console.log('⚠️ API falhou, salvando localmente:', error.message);
                return this.saveControleLocal(item);
            }
        } else {
            return this.saveControleLocal(item);
        }
    }

    saveControleLocal(item) {
        try {
            const controle = JSON.parse(localStorage.getItem('controle') || '[]');
            const timestamp = new Date().toISOString();
            
            if (item.id) {
                const index = controle.findIndex(c => c.id === item.id);
                if (index >= 0) {
                    controle[index] = { ...item, updated_at: timestamp };
                } else {
                    controle.push({ ...item, updated_at: timestamp });
                }
            } else {
                const novoItem = {
                    ...item,
                    id: `ctrl_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    created_at: timestamp,
                    updated_at: timestamp
                };
                controle.push(novoItem);
            }
            
            localStorage.setItem('controle', JSON.stringify(controle));
            console.log('✅ Item do controle salvo no localStorage');
            
            return controle[controle.length - 1];
        } catch (error) {
            console.error('❌ Erro ao salvar item do controle:', error);
            throw error;
        }
    }

    // ========================================
    // UNIDADES GERADORAS (UGs)
    // ========================================

    async getUGs() {
        if (this.useAPI) {
            try {
                console.log('📥 getUGs (API)');
                const response = await apiService.get('/ugs');
                const ugs = Array.isArray(response) ? response : (response.data || []);
                
                // Cache no localStorage
                localStorage.setItem('ugs', JSON.stringify(ugs));
                console.log(`✅ Carregadas ${ugs.length} UGs da API`);
                
                return ugs;
            } catch (error) {
                console.log('⚠️ API falhou, usando localStorage:', error.message);
                // Fallback para localStorage
                const localUGs = JSON.parse(localStorage.getItem('ugs') || '[]');
                console.log(`✅ Carregadas ${localUGs.length} UGs do localStorage`);
                return localUGs;
            }
        } else {
            const ugs = JSON.parse(localStorage.getItem('ugs') || '[]');
            console.log(`✅ Carregadas ${ugs.length} UGs do localStorage`);
            return ugs;
        }
    }

    async saveUG(ug) {
        if (this.useAPI) {
            try {
                console.log('💾 saveUG (API)');
                const response = await apiService.post('/ugs', ug);
                
                // Atualizar cache local
                const ugs = JSON.parse(localStorage.getItem('ugs') || '[]');
                const existingIndex = ugs.findIndex(u => u.id === ug.id);
                
                if (existingIndex >= 0) {
                    ugs[existingIndex] = response;
                } else {
                    ugs.push(response);
                }
                
                localStorage.setItem('ugs', JSON.stringify(ugs));
                console.log('✅ UG salva na API');
                
                return response;
            } catch (error) {
                console.log('⚠️ API falhou, salvando localmente:', error.message);
                return this.saveUGLocal(ug);
            }
        } else {
            return this.saveUGLocal(ug);
        }
    }

    saveUGLocal(ug) {
        try {
            const ugs = JSON.parse(localStorage.getItem('ugs') || '[]');
            const timestamp = new Date().toISOString();
            
            if (ug.id) {
                const index = ugs.findIndex(u => u.id === ug.id);
                if (index >= 0) {
                    ugs[index] = { ...ug, updated_at: timestamp };
                } else {
                    ugs.push({ ...ug, updated_at: timestamp });
                }
            } else {
                const novaUG = {
                    ...ug,
                    id: `ug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    created_at: timestamp,
                    updated_at: timestamp
                };
                ugs.push(novaUG);
            }
            
            localStorage.setItem('ugs', JSON.stringify(ugs));
            console.log('✅ UG salva no localStorage');
            
            return ugs[ugs.length - 1];
        } catch (error) {
            console.error('❌ Erro ao salvar UG:', error);
            throw error;
        }
    }

    // ========================================
    // CALIBRAGEM GLOBAL
    // ========================================

    async getCalibragemGlobal() {
        if (this.useAPI) {
            try {
                const response = await apiService.get('/configuracoes/calibragem_global');
                const calibragem = response.valor ? parseFloat(response.valor) : 0;
                this.calibragemGlobal = calibragem;
                localStorage.setItem('calibragem_global', calibragem.toString());
                return calibragem;
            } catch (error) {
                console.log('⚠️ API falhou, usando localStorage para calibragem');
                return this.getCalibragemGlobalLocal();
            }
        } else {
            return this.getCalibragemGlobalLocal();
        }
    }

    getCalibragemGlobalLocal() {
        const calibragem = parseFloat(localStorage.getItem('calibragem_global') || '0');
        this.calibragemGlobal = calibragem;
        return calibragem;
    }

    async setCalibragemGlobal(valor) {
        if (this.useAPI) {
            try {
                await apiService.put('/configuracoes/calibragem_global', { valor });
                this.calibragemGlobal = valor;
                localStorage.setItem('calibragem_global', valor.toString());
                console.log('✅ Calibragem global atualizada na API');
                return true;
            } catch (error) {
                console.log('⚠️ API falhou, salvando calibragem localmente');
                return this.setCalibragemGlobalLocal(valor);
            }
        } else {
            return this.setCalibragemGlobalLocal(valor);
        }
    }

    setCalibragemGlobalLocal(valor) {
        this.calibragemGlobal = valor;
        localStorage.setItem('calibragem_global', valor.toString());
        console.log('✅ Calibragem global atualizada no localStorage');
        return true;
    }

    // ========================================
    // MÉTODOS UTILITÁRIOS
    // ========================================

    async sincronizar() {
        if (!this.useAPI) {
            console.log('⚠️ API não disponível - sincronização cancelada');
            return false;
        }

        try {
            console.log('🔄 Iniciando sincronização...');
            
            // Sincronizar dados
            await Promise.all([
                this.getProspec(),
                this.getControle(),
                this.getUGs()
            ]);
            
            console.log('✅ Sincronização concluída');
            return true;
        } catch (error) {
            console.error('❌ Erro na sincronização:', error);
            return false;
        }
    }

    isAPIAvailable() {
        return this.useAPI;
    }

    // Método para limpar todos os dados locais
    clearAllData() {
        const keysToRemove = [
            'propostas',
            'controle', 
            'ugs',
            'calibragem_global',
            'aupus_user',
            'aupus_token',
            'usuarios'
        ];
        
        keysToRemove.forEach(key => {
            localStorage.removeItem(key);
        });
        
        console.log('🧹 Dados locais limpos');
    }
}

export const storageService = new StorageService();
export default storageService;