// src/services/storageService.js - Baseado no seu código atual, SEM telefone/email/endereco
import apiService from './apiService';

class StorageService {
    constructor() {
        console.log('🚀 StorageService inicializado - Modo API Apenas');
    }

    // ========================================
    // AUTENTICAÇÃO
    // ========================================

    async login(email, senha) {
        console.log('🔐 Login via API...');
        const response = await apiService.post('/auth/login', { email, password: senha });
        console.log('🔍 Resposta do login:', response);

        if (response?.success && response?.user && response?.token) {
            // Configurar token no apiService
            apiService.setToken(response.token);
            
            // Não usar localStorage - retornar dados diretamente
            console.log('✅ Login realizado com sucesso');
            return response.user;
        } else {
            console.log('❌ Login failed - response:', {
                hasSuccess: !!response?.success,
                hasUser: !!response?.user,
                hasToken: !!response?.token,
                response: response
            });
            
            throw new Error('Token de acesso ou dados do usuário não recebidos');
        }
    }

    logout() {
        // Apenas limpar token do apiService
        apiService.clearToken();
        console.log('🚪 Logout realizado');
    }

    // ========================================
    // PROPOSTAS - SEM telefone, email, endereco
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
            // CORRIGIDO: Rota correta é /controle, não /controle-clube
            const response = await apiService.get('/controle');
            
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
            
            const response = await apiService.post('/controle', controle);
            
            console.log('✅ Controle clube salvo na API com sucesso');
            return response;
            
        } catch (error) {
            console.error('❌ Erro ao salvar controle clube:', error.message);
            throw new Error(`Não foi possível salvar o controle clube: ${error.message}`);
        }
    }

    async adicionarControle(controle) {
        return await this.saveControle(controle);
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

    async adicionarUG(ug) {
        try {
            console.log('💾 Salvando UG na API...');
            
            const response = await apiService.post('/ugs', ug);
            
            console.log('✅ UG salva na API com sucesso');
            return response;
            
        } catch (error) {
            console.error('❌ Erro ao salvar UG:', error.message);
            throw new Error(`Não foi possível salvar a UG: ${error.message}`);
        }
    }

    // ========================================
    // UNIDADES CONSUMIDORAS
    // ========================================

    async getUnidadesConsumidoras() {
        try {
            console.log('📥 Carregando unidades consumidoras da API...');
            const response = await apiService.get('/unidades-consumidoras');
            
            let unidades = [];
            if (response?.data?.data && Array.isArray(response.data.data)) {
                unidades = response.data.data;
            } else if (response?.data && Array.isArray(response.data)) {
                unidades = response.data;
            } else if (Array.isArray(response)) {
                unidades = response;
            } else {
                unidades = [];
            }
            
            console.log(`✅ Carregadas ${unidades.length} unidades consumidoras da API`);
            return unidades;
            
        } catch (error) {
            console.error('❌ Erro ao carregar unidades consumidoras:', error.message);
            throw new Error(`Não foi possível carregar as unidades consumidoras: ${error.message}`);
        }
    }

    // ========================================
    // CONEXÃO E SAÚDE DA API
    // ========================================

    async checkApiConnection() {
        console.log('🔗 Verificando conexão com API...');
        try {
            const response = await apiService.get('/health-check');
            console.log('✅ API conectada e funcionando');
            return { connected: true, message: 'API funcionando', data: response };
        } catch (error) {
            console.error('❌ Erro na conexão com API:', error.message);
            return { connected: false, message: error.message };
        }
    }

    // ========================================
    // MAPEAMENTO DE DADOS - SEM telefone, email, endereco
    // ========================================

    mapearPropostaParaBackend(proposta) {
        console.log('🔄 Mapeando proposta para backend (SEM telefone/email/endereco):', proposta);
        
        const dadosBackend = {
            nome_cliente: proposta.nomeCliente,
            consultor: proposta.consultor,
            data_proposta: proposta.dataProposta || proposta.data,
            numero_proposta: proposta.numeroProposta,
            economia: parseFloat(proposta.economia) || 20.00,
            bandeira: parseFloat(proposta.bandeira) || 20.00,
            recorrencia: proposta.recorrencia || '3%',
            observacoes: proposta.observacoes || '',
            beneficios: proposta.beneficiosAdicionais || proposta.beneficios || [],
            status: proposta.status || 'Aguardando',
            // REMOVIDOS: telefone, email, endereco
            unidades_consumidoras: proposta.unidades_consumidoras || proposta.unidadesConsumidoras || [],
        };

        // Garantir que data_proposta tenha um valor válido
        if (!dadosBackend.data_proposta) {
            dadosBackend.data_proposta = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        }

        // Garantir que unidades_consumidoras seja um array válido
        if (!Array.isArray(dadosBackend.unidades_consumidoras)) {
            dadosBackend.unidades_consumidoras = [];
        }

        // Remover campos undefined para evitar erro 422
        Object.keys(dadosBackend).forEach(key => {
            if (dadosBackend[key] === undefined) {
                delete dadosBackend[key];
            }
        });

        console.log('✅ Mapeamento concluído (SEM telefone/email/endereco):', dadosBackend);
        return dadosBackend;
    }

    // ========================================
    // EXPORTAÇÃO DE DADOS
    // ========================================

    async exportarParaCSV(tipo) {
        try {
            console.log(`📤 Exportando ${tipo} para CSV...`);
            
            let dados = [];
            
            switch (tipo) {
                case 'prospec':
                    dados = await this.getProspec();
                    break;
                case 'controle':
                    dados = await this.getControle();
                    break;
                case 'ugs':
                    dados = await this.getUGs();
                    break;
                default:
                    throw new Error('Tipo de exportação não suportado');
            }

            if (dados.length === 0) {
                throw new Error('Nenhum dado encontrado para exportação');
            }

            this.downloadCSV(dados, `${tipo}_${new Date().toISOString().slice(0, 10)}.csv`);
            
        } catch (error) {
            console.error(`❌ Erro ao exportar ${tipo}:`, error.message);
            throw error;
        }
    }

    downloadCSV(dados, nomeArquivo) {
        if (!dados || dados.length === 0) return;
        
        // Obter cabeçalhos (chaves do primeiro objeto)
        const headers = Object.keys(dados[0]);
        
        // Converter para CSV
        const csvContent = [
            headers.join(','), // Cabeçalho
            ...dados.map(item => 
                headers.map(header => {
                    let valor = item[header];
                    if (valor === null || valor === undefined) valor = '';
                    if (typeof valor === 'string' && valor.includes(',')) {
                        valor = `"${valor}"`;
                    }
                    return valor;
                }).join(',')
            )
        ].join('\n');
        
        // Criar e fazer download do arquivo
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
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

    async exportarDadosFiltrados(tipo, dados) {
        try {
            console.log(`📤 Exportando dados filtrados de ${tipo}...`);
            
            if (!dados || dados.length === 0) {
                throw new Error('Nenhum dado fornecido para exportação');
            }

            this.downloadCSV(dados, `${tipo}_filtrado_${new Date().toISOString().slice(0, 10)}.csv`);
            
        } catch (error) {
            console.error(`❌ Erro ao exportar dados filtrados:`, error.message);
            throw error;
        }
    }

    // ========================================
    // MÉTODOS LEGADOS (COMPATIBILIDADE)
    // ========================================

    async atualizarProspec(index, dadosAtualizados) {
        // Para manter compatibilidade com código existente
        // Na prática, precisamos do ID real da proposta
        if (dadosAtualizados.id) {
            return await this.updateProspec(dadosAtualizados.id, dadosAtualizados);
        } else {
            throw new Error('ID da proposta é necessário para atualização');
        }
    }

    async removerProspec(id) {
        // Atualizado para usar ID ao invés de index
        if (!id) {
            throw new Error('ID da proposta é necessário para remoção');
        }
        return await this.deleteProspec(id);
    }

    async atualizarControle(index, dadosAtualizados) {
        // Para manter compatibilidade
        if (dadosAtualizados.id) {
            return await apiService.put(`/controle/${dadosAtualizados.id}`, dadosAtualizados);
        } else {
            throw new Error('ID do controle é necessário para atualização');
        }
    }

    // ========================================
    // MÉTODOS UTILITÁRIOS ADICIONAIS
    // ========================================

    // Método para verificar se a API está disponível
    async isAPIHealthy() {
        try {
            const result = await this.checkApiConnection();
            return result.connected;
        } catch (error) {
            return false;
        }
    }

    // Método para obter estatísticas das propostas
    async getProspecStatistics() {
        try {
            const propostas = await this.getProspec();
            
            return {
                total: propostas.length,
                aguardando: propostas.filter(p => p.status === 'Aguardando').length,
                fechadas: propostas.filter(p => p.status === 'Fechado').length,
                perdidas: propostas.filter(p => p.status === 'Perdido').length,
                emAnalise: propostas.filter(p => p.status === 'Em Análise').length
            };
        } catch (error) {
            console.error('❌ Erro ao obter estatísticas:', error);
            return { total: 0, aguardando: 0, fechadas: 0, perdidas: 0, emAnalise: 0 };
        }
    }
}

const storageService = new StorageService();
export default storageService;