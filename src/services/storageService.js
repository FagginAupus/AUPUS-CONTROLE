// src/services/storageService.js - COMPLETO COM MÉTODOS DE UGs
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
    // AUTENTICAÇÃO
    // ========================================

    async login(email, password) {
        if (this.useAPI) {
            try {
                console.log('🔐 login (API)');
                const response = await apiService.login(email, password);
                
                if (response.success && response.user && response.token) {
                    localStorage.setItem('aupus_user', JSON.stringify(response.user));
                    localStorage.setItem('aupus_token', response.token);
                    console.log(`✅ Login API realizado: ${response.user.nome}`);
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
            const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
            
            const userData = usuarios.find(u => 
                u.email.toLowerCase() === email.toLowerCase() && 
                u.senha === password
            );

            if (userData) {
                localStorage.setItem('aupus_user', JSON.stringify(userData));
                localStorage.setItem('aupus_token', `local_token_${userData.id}`);
                console.log(`✅ Login local realizado: ${userData.nome}`);
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
            console.log('📥 getProspec (localStorage)');
            return this.getProspecLocal();
        }
    }

    getProspecLocal() {
        try {
            const dados = JSON.parse(localStorage.getItem('propostas') || '[]');
            console.log(`✅ Carregadas ${dados.length} propostas do localStorage`);
            return dados;
        } catch (error) {
            console.error('❌ Erro ao carregar propostas local:', error);
            return [];
        }
    }

    async salvarProposta(proposta) {
        if (this.useAPI) {
            try {
                const response = await apiService.criarProposta(proposta);
                // Atualizar cache local
                const propostas = this.getProspecLocal();
                const novaProposta = response.data || response;
                propostas.push(novaProposta);
                localStorage.setItem('propostas', JSON.stringify(propostas));
                
                return { success: true, data: novaProposta };
            } catch (error) {
                console.log('⚠️ API falhou, salvando localmente:', error.message);
                return this.salvarPropostaLocal(proposta);
            }
        } else {
            return this.salvarPropostaLocal(proposta);
        }
    }

    salvarPropostaLocal(proposta) {
        try {
            const propostas = this.getProspecLocal();
            const novaProposta = {
                ...proposta,
                id: proposta.id || Date.now().toString(),
                dataAtualizacao: new Date().toISOString()
            };
            
            propostas.push(novaProposta);
            localStorage.setItem('propostas', JSON.stringify(propostas));
            
            return { success: true, data: novaProposta };
        } catch (error) {
            console.error('❌ Erro ao salvar proposta local:', error);
            return { success: false, error: error.message };
        }
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
                console.log(`✅ Carregadas ${dados.length} itens de controle da API`);
                
                return dados;
            } catch (error) {
                console.log('⚠️ API falhou, usando localStorage:', error.message);
                return this.getControleLocal();
            }
        } else {
            console.log('📥 getControle (localStorage)');
            return this.getControleLocal();
        }
    }

    getControleLocal() {
        try {
            const dados = JSON.parse(localStorage.getItem('controle') || '[]');
            console.log(`✅ Carregadas ${dados.length} do controle do localStorage`);
            return dados;
        } catch (error) {
            console.error('❌ Erro ao carregar controle local:', error);
            return [];
        }
    }

    // ========================================
    // MÉTODOS PARA UGs (USINAS GERADORAS)
    // ========================================

    async getUGs() {
        if (this.useAPI) {
            try {
                console.log('📥 getUGs (API)');
                // Assumindo que há um endpoint para UGs na API
                const response = await apiService.get('/ugs');
                const dados = response.data || response;
                
                // Cache local
                localStorage.setItem('ugs', JSON.stringify(dados));
                console.log(`✅ Carregadas ${dados.length} UGs da API`);
                
                return dados;
            } catch (error) {
                console.log('⚠️ API falhou, usando localStorage:', error.message);
                return this.getUGsLocal();
            }
        } else {
            console.log('📥 getUGs (localStorage)');
            return this.getUGsLocal();
        }
    }

    getUGsLocal() {
        try {
            const dados = JSON.parse(localStorage.getItem('ugs') || '[]');
            console.log(`✅ Carregadas ${dados.length} UGs do localStorage`);
            return dados;
        } catch (error) {
            console.error('❌ Erro ao carregar UGs local:', error);
            return [];
        }
    }

    async adicionarUG(ug) {
        if (this.useAPI) {
            try {
                console.log('💾 adicionarUG (API)');
                const response = await apiService.post('/ugs', ug);
                
                // Atualizar cache local
                const ugs = this.getUGsLocal();
                const novaUG = response.data || response;
                ugs.push(novaUG);
                localStorage.setItem('ugs', JSON.stringify(ugs));
                
                console.log(`✅ UG "${ug.nomeUsina}" adicionada via API`);
                return { success: true, data: novaUG };
            } catch (error) {
                console.log('⚠️ API falhou, salvando localmente:', error.message);
                return this.adicionarUGLocal(ug);
            }
        } else {
            return this.adicionarUGLocal(ug);
        }
    }

    adicionarUGLocal(ug) {
        try {
            const ugs = this.getUGsLocal();
            const novaUG = {
                ...ug,
                id: ug.id || Date.now().toString(),
                dataCadastro: new Date().toISOString(),
                dataAtualizacao: new Date().toISOString()
            };
            
            ugs.push(novaUG);
            localStorage.setItem('ugs', JSON.stringify(ugs));
            
            console.log(`✅ UG "${ug.nomeUsina}" adicionada localmente`);
            return { success: true, data: novaUG };
        } catch (error) {
            console.error('❌ Erro ao adicionar UG local:', error);
            return { success: false, error: error.message };
        }
    }

    async atualizarUG(index, ugAtualizada) {
        if (this.useAPI) {
            try {
                const ugs = this.getUGsLocal();
                const ugExistente = ugs[index];
                
                if (!ugExistente || !ugExistente.id) {
                    throw new Error('UG não encontrada para atualização');
                }

                console.log('📝 atualizarUG (API)');
                const response = await apiService.put(`/ugs/${ugExistente.id}`, ugAtualizada);
                
                // Atualizar cache local
                ugs[index] = { ...ugAtualizada, id: ugExistente.id };
                localStorage.setItem('ugs', JSON.stringify(ugs));
                
                console.log(`✅ UG "${ugAtualizada.nomeUsina}" atualizada via API`);
                return { success: true, data: response.data || response };
            } catch (error) {
                console.log('⚠️ API falhou, atualizando localmente:', error.message);
                return this.atualizarUGLocal(index, ugAtualizada);
            }
        } else {
            return this.atualizarUGLocal(index, ugAtualizada);
        }
    }

    atualizarUGLocal(index, ugAtualizada) {
        try {
            const ugs = this.getUGsLocal();
            
            if (index < 0 || index >= ugs.length) {
                throw new Error('Índice inválido para atualização');
            }

            const ugExistente = ugs[index];
            ugs[index] = {
                ...ugExistente,
                ...ugAtualizada,
                dataAtualizacao: new Date().toISOString()
            };
            
            localStorage.setItem('ugs', JSON.stringify(ugs));
            
            console.log(`✅ UG "${ugAtualizada.nomeUsina}" atualizada localmente`);
            return { success: true, data: ugs[index] };
        } catch (error) {
            console.error('❌ Erro ao atualizar UG local:', error);
            return { success: false, error: error.message };
        }
    }

    async removerUG(index) {
        if (this.useAPI) {
            try {
                const ugs = this.getUGsLocal();
                const ugExistente = ugs[index];
                
                if (!ugExistente || !ugExistente.id) {
                    throw new Error('UG não encontrada para remoção');
                }

                console.log('🗑️ removerUG (API)');
                await apiService.delete(`/ugs/${ugExistente.id}`);
                
                // Atualizar cache local
                ugs.splice(index, 1);
                localStorage.setItem('ugs', JSON.stringify(ugs));
                
                console.log(`✅ UG "${ugExistente.nomeUsina}" removida via API`);
                return { success: true };
            } catch (error) {
                console.log('⚠️ API falhou, removendo localmente:', error.message);
                return this.removerUGLocal(index);
            }
        } else {
            return this.removerUGLocal(index);
        }
    }

    removerUGLocal(index) {
        try {
            const ugs = this.getUGsLocal();
            
            if (index < 0 || index >= ugs.length) {
                throw new Error('Índice inválido para remoção');
            }

            const ugRemovida = ugs.splice(index, 1)[0];
            localStorage.setItem('ugs', JSON.stringify(ugs));
            
            console.log(`✅ UG "${ugRemovida.nomeUsina}" removida localmente`);
            return { success: true };
        } catch (error) {
            console.error('❌ Erro ao remover UG local:', error);
            return { success: false, error: error.message };
        }
    }

    // ========================================
    // MÉTODOS DE EXPORTAÇÃO
    // ========================================

    async exportarParaCSV(tipo, dados = null) {
        try {
            let dadosExportacao;
            let nomeArquivo;

            switch (tipo) {
                case 'prospec':
                    dadosExportacao = dados || await this.getProspec();
                    nomeArquivo = `prospec_${new Date().toISOString().split('T')[0]}.csv`;
                    break;
                case 'controle':
                    dadosExportacao = dados || await this.getControle();
                    nomeArquivo = `controle_${new Date().toISOString().split('T')[0]}.csv`;
                    break;
                case 'ugs':
                    dadosExportacao = dados || await this.getUGs();
                    nomeArquivo = `ugs_${new Date().toISOString().split('T')[0]}.csv`;
                    break;
                default:
                    throw new Error(`Tipo de exportação '${tipo}' não suportado`);
            }

            if (!dadosExportacao || dadosExportacao.length === 0) {
                throw new Error('Nenhum dado disponível para exportação');
            }

            const csvContent = this.converterParaCSV(dadosExportacao);
            this.baixarCSV(csvContent, nomeArquivo);
            
            console.log(`✅ Dados de ${tipo} exportados: ${nomeArquivo}`);
            return { success: true, filename: nomeArquivo };
        } catch (error) {
            console.error('❌ Erro na exportação:', error);
            throw error;
        }
    }

    async exportarDadosFiltrados(tipo, dadosFiltrados) {
        return this.exportarParaCSV(tipo, dadosFiltrados);
    }

    converterParaCSV(dados) {
        if (!dados || dados.length === 0) return '';

        const headers = Object.keys(dados[0]);
        const csvRows = [headers.join(',')];

        for (const item of dados) {
            const values = headers.map(header => {
                const val = item[header];
                return `"${String(val || '').replace(/"/g, '""')}"`;
            });
            csvRows.push(values.join(','));
        }

        return csvRows.join('\n');
    }

    baixarCSV(conteudo, nomeArquivo) {
        const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', nomeArquivo);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    // ========================================
    // CONFIGURAÇÕES E CALIBRAGEM
    // ========================================

    async getCalibragemGlobal() {
        if (this.useAPI) {
            try {
                const response = await apiService.get('/configuracoes/calibragem_global');
                this.calibragemGlobal = parseFloat(response.valor || response.data?.valor || 0);
            } catch (error) {
                console.log('⚠️ API falhou, usando calibragem local:', error.message);
                this.calibragemGlobal = parseFloat(localStorage.getItem('config_calibragem_global') || '0');
            }
        } else {
            this.calibragemGlobal = parseFloat(localStorage.getItem('config_calibragem_global') || '0');
        }
        
        console.log(`⚙️ Calibragem global carregada: ${this.calibragemGlobal}%`);
        return this.calibragemGlobal;
    }

    async setCalibragemGlobal(valor) {
        this.calibragemGlobal = parseFloat(valor);
        localStorage.setItem('config_calibragem_global', this.calibragemGlobal.toString());
        
        if (this.useAPI) {
            try {
                await apiService.post('/configuracoes', {
                    chave: 'calibragem_global',
                    valor: this.calibragemGlobal
                });
            } catch (error) {
                console.log('⚠️ Erro ao salvar calibragem na API:', error.message);
            }
        }
        
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
            'usuarios', 'configuracoes', 'ugs'
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
            const ugs = this.getUGsLocal();
            
            return {
                hasUser: !!user,
                hasToken: !!token,
                propostas: propostas.length,
                controle: controle.length,
                ugs: ugs.length,
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
                await this.getUGs();
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