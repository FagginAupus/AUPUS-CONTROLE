// src/services/storageService.js - Revertido para usar descontoTarifa e descontoBandeira
import apiService from './apiService';

class StorageService {
    constructor() {
        console.log('🚀 StorageService inicializado - Modo API Apenas');
    }

    // ========================================
    // AUTENTICAÇÃO - MANTENDO ESTRUTURA ORIGINAL
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
    // PROPOSTAS - COM DESCONTOS NO FORMATO CORRETO
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

            // ✅ MAPEAR DADOS DO BACKEND COM DESCONTOS CORRETOS
            const propostasMapeadas = propostas.map((proposta, index) => {
                console.log(`📋 Mapeando proposta ${index + 1}:`, {
                    id: proposta.id,
                    numero_proposta: proposta.numeroProposta || proposta.numero_proposta,
                    nome_cliente: proposta.nomeCliente || proposta.nome_cliente,
                    status: proposta.status,
                    descontoTarifa: proposta.descontoTarifa,
                    descontoBandeira: proposta.descontoBandeira,
                    apelido: proposta.apelido,
                    numeroUC: proposta.numeroUC || proposta.numero_unidade,
                    media: proposta.media || proposta.consumo_medio
                });

                return {
                    // Campos que já vêm corretos do backend
                    id: proposta.id,
                    numeroProposta: proposta.numeroProposta || proposta.numero_proposta,
                    nomeCliente: proposta.nomeCliente || proposta.nome_cliente,
                    consultor: proposta.consultor,
                    data: proposta.data || proposta.data_proposta,
                    status: proposta.status,
                    observacoes: proposta.observacoes,
                    recorrencia: proposta.recorrencia,

                    // ✅ DESCONTOS AGORA COM OS NOMES CORRETOS
                    descontoTarifa: this.processarDesconto(proposta.descontoTarifa),
                    descontoBandeira: this.processarDesconto(proposta.descontoBandeira),

                    // Campos da UC (já mapeados no backend)
                    apelido: proposta.apelido || '',
                    numeroUC: proposta.numeroUC || proposta.numero_unidade || '',
                    numeroCliente: proposta.numeroCliente || proposta.numero_cliente || '',
                    ligacao: proposta.ligacao || proposta.tipo_ligacao || '',
                    media: proposta.media || proposta.consumo_medio || 0,
                    distribuidora: proposta.distribuidora || '',

                    // Arrays
                    beneficios: proposta.beneficios || [],
                    unidadesConsumidoras: proposta.unidadesConsumidoras || [],

                    // Timestamps
                    created_at: proposta.created_at,
                    updated_at: proposta.updated_at
                };
            });
            
            console.log(`✅ Carregadas ${propostasMapeadas.length} propostas da API com descontos processados`);
            return propostasMapeadas;
            
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
    // CONTROLE CLUBE, UGS, etc (mantidos iguais)
    // ========================================

    async getControle() {
        try {
            console.log('📥 Carregando controle clube da API...');
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
    // MÉTODOS AUXILIARES PARA DESCONTOS
    // ========================================

    /**
     * ✅ Processar desconto vindo do backend
     */
    processarDesconto(valor) {
        if (!valor) return 20; // Valor padrão

        console.log('🔍 Processando desconto recebido:', { valor, tipo: typeof valor });

        // Se vier como string com %, extrair o número
        if (typeof valor === 'string' && valor.includes('%')) {
            const numeroExtraido = parseFloat(valor.replace('%', '')) || 20;
            console.log('✅ Desconto extraído:', numeroExtraido);
            return numeroExtraido;
        }

        // Se vier como número, usar direto
        const numeroFinal = parseFloat(valor) || 20;
        console.log('✅ Desconto processado:', numeroFinal);
        return numeroFinal;
    }

    /**
     * ✅ Formatar desconto para enviar ao backend
     */
    formatarDescontoParaBackend(valor) {
        if (!valor) return '20%';

        console.log('🔍 Formatando desconto para backend:', { valor, tipo: typeof valor });

        // Se já vem com %, validar e manter
        if (typeof valor === 'string' && valor.includes('%')) {
            console.log('✅ Desconto já com %:', valor);
            return valor;
        }

        // Se é número, adicionar % (sem multiplicar)
        const numeroLimpo = parseFloat(valor) || 20;
        const resultado = numeroLimpo + '%';
        console.log('✅ Desconto formatado:', resultado);
        return resultado;
    }

    // ========================================
    // MAPEAMENTO FRONTEND → BACKEND
    // ========================================

    mapearPropostaParaBackend(proposta) {
        console.log('🔄 Mapeando proposta para backend:', proposta);
        
        const dadosBackend = {
            // Campos principais
            nome_cliente: proposta.nomeCliente,
            consultor: proposta.consultor,
            data_proposta: proposta.dataProposta || proposta.data,
            numero_proposta: proposta.numeroProposta,
            status: proposta.status || 'Aguardando',
            observacoes: proposta.observacoes || '',
            recorrencia: proposta.recorrencia || '3%',
            
            // ✅ DESCONTOS COM FORMATO CORRETO (COM %)
            descontoTarifa: this.formatarDescontoParaBackend(proposta.descontoTarifa || 20),
            descontoBandeira: this.formatarDescontoParaBackend(proposta.descontoBandeira || 20),
            
            // Arrays
            beneficios: Array.isArray(proposta.beneficios) ? proposta.beneficios : [],
            unidadesConsumidoras: Array.isArray(proposta.unidadesConsumidoras) ? proposta.unidadesConsumidoras : []
        };

        console.log('📤 Dados mapeados para backend:', {
            ...dadosBackend,
            descontos: {
                descontoTarifa: dadosBackend.descontoTarifa,
                descontoBandeira: dadosBackend.descontoBandeira
            }
        });
        
        return dadosBackend;
    }

    // ========================================
    // MÉTODOS DE COMPATIBILIDADE (MANTIDOS)
    // ========================================

    async atualizarProspec(index, dadosAtualizados) {
        if (dadosAtualizados.id) {
            return await this.updateProspec(dadosAtualizados.id, dadosAtualizados);
        } else {
            throw new Error('ID da proposta é necessário para atualização');
        }
    }

    async removerProspec(id) {
        if (!id) {
            throw new Error('ID da proposta é necessário para remoção');
        }
        return await this.deleteProspec(id);
    }

    async atualizarControle(index, dadosAtualizados) {
        if (dadosAtualizados.id) {
            return await apiService.put(`/controle/${dadosAtualizados.id}`, dadosAtualizados);
        } else {
            throw new Error('ID do controle é necessário para atualização');
        }
    }

    async isAPIHealthy() {
        try {
            const result = await this.checkApiConnection();
            return result.connected;
        } catch (error) {
            return false;
        }
    }

    async getProspecStatistics() {
        try {
            const propostas = await this.getProspec();
            
            return {
                total: propostas.length,
                aguardando: propostas.filter(p => p.status === 'Aguardando').length,
                fechadas: propostas.filter(p => p.status === 'Fechado').length,
                perdidas: propostas.filter(p => p.status === 'Recusado').length,
                canceladas: propostas.filter(p => p.status === 'Cancelada').length
            };
        } catch (error) {
            console.error('❌ Erro ao obter estatísticas:', error);
            return { total: 0, aguardando: 0, fechadas: 0, perdidas: 0, canceladas: 0 };
        }
    }

    async exportarDadosFiltrados(tipo, dados) {
        console.log(`📤 Exportando ${dados.length} registros de ${tipo}`);
        
        const blob = new Blob([JSON.stringify(dados, null, 2)], {
            type: 'application/json'
        });

        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${tipo}_export_${new Date().toISOString().split('T')[0]}.json`;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        window.URL.revokeObjectURL(url);
        console.log('✅ Exportação concluída');
    }
}

const storageService = new StorageService();
export default storageService;