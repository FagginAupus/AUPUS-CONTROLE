// src/services/storageService.js - APENAS API, SEM LOCALSTORAGE
import apiService from './apiService';

class StorageService {
    constructor() {
        console.log('🚀 StorageService inicializado - Modo API Apenas');
        this.useAPI = true; // Sempre usar API
    }

    // ========================================
    // AUTENTICAÇÃO
    // ========================================

    async login(email, password) {
        try {
            console.log('🔐 Login via API...');
            const response = await apiService.post('/auth/login', { email, password });
            
            console.log('🔍 Resposta do login:', response);
            
            // Aceitar diferentes estruturas de resposta
            const token = response?.access_token || response?.token;
            const user = response?.user;
            
            if (token && user) {
                // Usar a mesma chave que o apiService
                localStorage.setItem('aupus_token', token);
                localStorage.setItem('user', JSON.stringify(user));
                
                // Configurar token no apiService
                apiService.setToken(token);
                
                console.log('✅ Login realizado com sucesso');
                return user;
            }
            
            // Log detalhado se falhou
            console.error('❌ Estrutura de resposta inválida:', {
                hasAccessToken: !!response?.access_token,
                hasToken: !!response?.token,
                hasUser: !!response?.user,
                response: response
            });
            
            throw new Error('Token de acesso ou dados do usuário não recebidos');
        } catch (error) {
            console.error('❌ Erro no login:', error.message);
            throw new Error(`Falha no login: ${error.message}`);
        }
    }

    logout() {
        localStorage.removeItem('aupus_token');
        localStorage.removeItem('user');
        apiService.clearToken();
        console.log('🚪 Logout realizado');
    }

    // ========================================
    // PROPOSTAS
    // ========================================

    async getProspec() {
        try {
            console.log('📥 Carregando propostas da API...');
            const response = await apiService.get('/propostas');
            
            let propostas = [];
            if (response?.data?.data && Array.isArray(response.data.data)) {
                // Resposta paginada
                propostas = response.data.data;
            } else if (response?.data && Array.isArray(response.data)) {
                // Array direto
                propostas = response.data;
            } else if (Array.isArray(response)) {
                // Array na raiz
                propostas = response;
            } else {
                console.warn('⚠️ Estrutura de resposta inesperada:', response);
                propostas = [];
            }
            
            console.log(`✅ Carregadas ${propostas.length} propostas da API`);
            return propostas;
            
        } catch (error) {
            console.error('❌ Erro ao carregar propostas:', error.message);
            throw new Error(`Não foi possível carregar as propostas: ${error.message}`);
        }
    }

    async saveProspec(proposta) {
        try {
            console.log('💾 Salvando proposta na API...');
            
            const dadosBackend = this.mapearPropostaParaBackend(proposta);
            const response = await apiService.post('/propostas', dadosBackend);
            
            console.log('✅ Proposta salva na API com sucesso');
            return response;
            
        } catch (error) {
            console.error('❌ Erro ao salvar proposta:', error.message);
            throw new Error(`Não foi possível salvar a proposta: ${error.message}`);
        }
    }

    async adicionarProspec(proposta) {
        console.log('📝 adicionarProspec - Salvando proposta...');
        return await this.saveProspec(proposta);
    }

    async updateProspec(id, proposta) {
        try {
            console.log('✏️ Atualizando proposta na API...');
            
            const dadosBackend = this.mapearPropostaParaBackend(proposta);
            const response = await apiService.put(`/propostas/${id}`, dadosBackend);
            
            console.log('✅ Proposta atualizada na API com sucesso');
            return response;
            
        } catch (error) {
            console.error('❌ Erro ao atualizar proposta:', error.message);
            throw new Error(`Não foi possível atualizar a proposta: ${error.message}`);
        }
    }

    async deleteProspec(id) {
        try {
            console.log('🗑️ Excluindo proposta da API...');
            
            await apiService.delete(`/propostas/${id}`);
            
            console.log('✅ Proposta excluída da API com sucesso');
            
        } catch (error) {
            console.error('❌ Erro ao excluir proposta:', error.message);
            throw new Error(`Não foi possível excluir a proposta: ${error.message}`);
        }
    }

    // ========================================
    // CONTROLE CLUBE
    // ========================================

    async getControle() {
        try {
            console.log('📥 Carregando controle clube da API...');
            const response = await apiService.get('/controle-clube');
            
            let controles = [];
            if (response?.data?.data && Array.isArray(response.data.data)) {
                controles = response.data.data;
            } else if (response?.data && Array.isArray(response.data)) {
                controles = response.data;
            } else if (Array.isArray(response)) {
                controles = response;
            } else {
                controles = [];
            }
            
            console.log(`✅ Carregados ${controles.length} registros de controle da API`);
            return controles;
            
        } catch (error) {
            console.error('❌ Erro ao carregar controle clube:', error.message);
            throw new Error(`Não foi possível carregar o controle clube: ${error.message}`);
        }
    }

    async saveControle(controle) {
        try {
            console.log('💾 Salvando controle clube na API...');
            
            const response = await apiService.post('/controle-clube', controle);
            
            console.log('✅ Controle clube salvo na API com sucesso');
            return response;
            
        } catch (error) {
            console.error('❌ Erro ao salvar controle clube:', error.message);
            throw new Error(`Não foi possível salvar o controle clube: ${error.message}`);
        }
    }

    // ========================================
    // UGS (USINAS GERADORAS)
    // ========================================

    async getUGs() {
        try {
            console.log('📥 Carregando UGs da API...');
            const response = await apiService.get('/ugs');
            
            let ugs = [];
            if (response?.data?.data && Array.isArray(response.data.data)) {
                ugs = response.data.data;
            } else if (response?.data && Array.isArray(response.data)) {
                ugs = response.data;
            } else if (Array.isArray(response)) {
                ugs = response;
            } else {
                ugs = [];
            }
            
            console.log(`✅ Carregadas ${ugs.length} UGs da API`);
            return ugs;
            
        } catch (error) {
            console.error('❌ Erro ao carregar UGs:', error.message);
            throw new Error(`Não foi possível carregar as UGs: ${error.message}`);
        }
    }

    // ========================================
    // ESTATÍSTICAS
    // ========================================

    async getStatistics() {
        try {
            console.log('📊 Carregando estatísticas da API...');
            const response = await apiService.get('/propostas/statistics');
            
            console.log('✅ Estatísticas carregadas da API');
            return response.data || response;
            
        } catch (error) {
            console.error('❌ Erro ao carregar estatísticas:', error.message);
            throw new Error(`Não foi possível carregar as estatísticas: ${error.message}`);
        }
    }

    // ========================================
    // UTILITÁRIOS
    // ========================================

    mapearPropostaParaBackend(proposta) {
        return {
            // Campos obrigatórios
            nome_cliente: proposta.nomeCliente || proposta.nome_cliente,
            consultor: proposta.consultor,
            
            // Campos opcionais
            data_proposta: proposta.data || proposta.data_proposta,
            numero_proposta: proposta.numeroProposta || proposta.numero_proposta,
            telefone: proposta.celular || proposta.telefone,
            email: proposta.email,
            endereco: proposta.endereco,
            status: proposta.status || 'Em Análise',
            economia: proposta.descontoTarifa ? (proposta.descontoTarifa * 100) : proposta.economia,
            bandeira: proposta.descontoBandeira ? (proposta.descontoBandeira * 100) : proposta.bandeira,
            recorrencia: proposta.recorrencia,
            observacoes: proposta.observacoes,
            valor_financiamento: proposta.valor_financiamento,
            prazo_financiamento: proposta.prazo_financiamento,
            
            // Benefícios - converter objeto em array se necessário
            beneficios: proposta.beneficios ? 
                (Array.isArray(proposta.beneficios) ? proposta.beneficios : Object.values(proposta.beneficios)) : 
                null,
                
            // Kit
            kit: proposta.kit || null
        };
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

    clearAllData() {
        localStorage.removeItem('user');
        localStorage.removeItem('aupus_token');
        apiService.clearToken();
        console.log('🧹 Dados de autenticação removidos');
    }

    // ========================================
    // VERIFICAÇÃO DE CONEXÃO COM API
    // ========================================

    async checkApiConnection() {
        try {
            console.log('🔗 Verificando conexão com API...');
            const response = await apiService.get('/health-check');
            
            if (response?.status === 'ok') {
                console.log('✅ API conectada e funcionando');
                return { connected: true, message: 'API funcionando normalmente' };
            }
            
            throw new Error('Resposta inválida da API');
            
        } catch (error) {
            console.error('❌ API não disponível:', error.message);
            return { 
                connected: false, 
                message: `API não disponível: ${error.message}` 
            };
        }
    }
}

// Instância única
const storageService = new StorageService();

export default storageService;
export { storageService };