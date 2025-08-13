// src/services/storageService.js - Completo com expansão de UCs
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
    // ✅ NOVO: EXPANSÃO DE UCs
    // ========================================

    /**
     * ✅ NOVO MÉTODO: Expande propostas em linhas por UC
     * Cada UC vira uma linha na tabela, repetindo dados da proposta
     */
    expandirPropostasParaUCs(propostas) {
        const linhasExpandidas = [];
        
        propostas.forEach(proposta => {
            // Verificar se tem UCs no JSON
            let ucsArray = [];
            
            // Tentar diferentes formatos de UCs
            if (proposta.unidadesConsumidoras && Array.isArray(proposta.unidadesConsumidoras)) {
                ucsArray = proposta.unidadesConsumidoras;
            } else if (proposta.unidades_consumidoras && Array.isArray(proposta.unidades_consumidoras)) {
                ucsArray = proposta.unidades_consumidoras;
            } else if (typeof proposta.unidadesConsumidoras === 'string') {
                try {
                    ucsArray = JSON.parse(proposta.unidadesConsumidoras);
                } catch (e) {
                    console.warn('Erro ao parsear UCs JSON:', e);
                    ucsArray = [];
                }
            }

            // Se não tem UCs, criar uma linha padrão
            if (!ucsArray || ucsArray.length === 0) {
                linhasExpandidas.push({
                    // ID único para cada linha
                    id: `${proposta.id}-UC-default-${Date.now()}`,
                    
                    // Dados da proposta (repetidos para cada UC)
                    propostaId: proposta.id,
                    numeroProposta: proposta.numero_proposta || proposta.numeroProposta,
                    nomeCliente: proposta.nome_cliente || proposta.nomeCliente,
                    consultor: proposta.consultor,
                    data: proposta.data_proposta || proposta.data,
                    status: proposta.status,
                    observacoes: proposta.observacoes,
                    recorrencia: proposta.recorrencia,
                    descontoTarifa: this.processarDesconto(proposta.descontoTarifa || proposta.economia),
                    descontoBandeira: this.processarDesconto(proposta.descontoBandeira || proposta.bandeira),
                    beneficios: proposta.beneficios || [],
                    
                    // Dados da UC (vazios neste caso)
                    ucIndex: 0,
                    apelido: '-',
                    numeroUC: '-',
                    numeroCliente: '-',
                    ligacao: '-',
                    media: 0,
                    distribuidora: '-',
                    
                    // Timestamps
                    created_at: proposta.created_at,
                    updated_at: proposta.updated_at
                });
            } else {
                // Criar uma linha para cada UC
                ucsArray.forEach((uc, index) => {
                    linhasExpandidas.push({
                        // ID único para cada linha UC
                        id: `${proposta.id}-UC-${index}-${uc.numero_unidade || index}`,
                        
                        // Dados da proposta (repetidos para cada UC)
                        propostaId: proposta.id,
                        numeroProposta: proposta.numero_proposta || proposta.numeroProposta,
                        nomeCliente: proposta.nome_cliente || proposta.nomeCliente,
                        consultor: proposta.consultor,
                        data: proposta.data_proposta || proposta.data,
                        status: proposta.status,
                        observacoes: proposta.observacoes,
                        recorrencia: proposta.recorrencia,
                        descontoTarifa: this.processarDesconto(proposta.descontoTarifa || proposta.economia),
                        descontoBandeira: this.processarDesconto(proposta.descontoBandeira || proposta.bandeira),
                        beneficios: proposta.beneficios || [],
                        
                        // Dados específicos da UC
                        ucIndex: index,
                        apelido: uc.apelido || `UC ${uc.numero_unidade || index + 1}`,
                        numeroUC: uc.numero_unidade || uc.numeroUC || '-',
                        numeroCliente: uc.numero_cliente || uc.numeroCliente || '-',
                        ligacao: uc.ligacao || uc.tipo_ligacao || '-',
                        media: uc.consumo_medio || uc.media || 0,
                        distribuidora: uc.distribuidora || '-',
                        
                        // Timestamps
                        created_at: proposta.created_at,
                        updated_at: proposta.updated_at
                    });
                });
            }
        });
        
        console.log(`✅ Expandidas ${propostas.length} propostas em ${linhasExpandidas.length} linhas de UC`);
        return linhasExpandidas;
    }

    /**
     * ✅ NOVO MÉTODO: Agrupa linhas de volta para propostas (para edição)
     */
    agruparUCsParaProposta(linhasUC) {
        const propostas = {};
        
        linhasUC.forEach(linha => {
            if (!propostas[linha.propostaId]) {
                propostas[linha.propostaId] = {
                    id: linha.propostaId,
                    numeroProposta: linha.numeroProposta,
                    nomeCliente: linha.nomeCliente,
                    consultor: linha.consultor,
                    data: linha.data,
                    status: linha.status,
                    observacoes: linha.observacoes,
                    recorrencia: linha.recorrencia,
                    descontoTarifa: linha.descontoTarifa,
                    descontoBandeira: linha.descontoBandeira,
                    beneficios: linha.beneficios,
                    unidadesConsumidoras: [],
                    created_at: linha.created_at,
                    updated_at: linha.updated_at
                };
            }
            
            // Adicionar UC apenas se não for linha padrão
            if (linha.numeroUC !== '-') {
                propostas[linha.propostaId].unidadesConsumidoras.push({
                    apelido: linha.apelido,
                    numero_unidade: linha.numeroUC,
                    numero_cliente: linha.numeroCliente,
                    ligacao: linha.ligacao,
                    consumo_medio: linha.media,
                    distribuidora: linha.distribuidora
                });
            }
        });
        
        return Object.values(propostas)[0]; // Retorna a primeira proposta encontrada
    }

    // ========================================
    // PROPOSTAS - COM EXPANSÃO DE UCs
    // ========================================

    /**
     * ✅ MÉTODO PRINCIPAL: getProspec com expansão automática
     */
    async getProspec() {
        try {
            console.log('📥 Carregando propostas da API para expansão...');
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
                    unidades_consumidoras: proposta.unidades_consumidoras
                });

                return {
                    // Campos que já vêm corretos do backend
                    id: proposta.id,
                    numero_proposta: proposta.numero_proposta,
                    nome_cliente: proposta.nome_cliente,
                    consultor: proposta.consultor,
                    data_proposta: proposta.data_proposta,
                    status: proposta.status,
                    observacoes: proposta.observacoes,
                    recorrencia: proposta.recorrencia,

                    // ✅ DESCONTOS PROCESSADOS
                    descontoTarifa: this.processarDesconto(proposta.economia),
                    descontoBandeira: this.processarDesconto(proposta.bandeira),

                    // Arrays
                    beneficios: proposta.beneficios || [],
                    unidades_consumidoras: proposta.unidades_consumidoras || [],

                    // Timestamps
                    created_at: proposta.created_at,
                    updated_at: proposta.updated_at
                };
            });
            
            // ✅ EXPANDIR PARA UCs
            const linhasExpandidas = this.expandirPropostasParaUCs(propostasMapeadas);
            
            console.log(`✅ Retornadas ${linhasExpandidas.length} linhas expandidas de UC`);
            return linhasExpandidas;
            
        } catch (error) {
            console.error('❌ Erro ao carregar propostas expandidas:', error.message);
            throw new Error(`Não foi possível carregar as propostas: ${error.message}`);
        }
    }

    /**
     * ✅ MÉTODO ORIGINAL: getProspec sem expansão (para casos específicos)
     */
    async getProspecOriginal() {
        try {
            console.log('📥 Carregando propostas da API (formato original)...');
            const response = await apiService.get('/propostas');
            
            let propostas = [];
            if (response?.data?.data && Array.isArray(response.data.data)) {
                propostas = response.data.data;
            } else if (response?.data && Array.isArray(response.data)) {
                propostas = response.data;
            } else if (Array.isArray(response)) {
                propostas = response;
            } else {
                console.warn('⚠️ Estrutura de resposta inesperada:', response);
                propostas = [];
            }

            // ✅ MAPEAR DADOS DO BACKEND SEM EXPANSÃO
            const propostasMapeadas = propostas.map((proposta) => {
                return {
                    id: proposta.id,
                    numeroProposta: proposta.numero_proposta,
                    nomeCliente: proposta.nome_cliente,
                    consultor: proposta.consultor,
                    data: proposta.data_proposta,
                    status: proposta.status,
                    observacoes: proposta.observacoes,
                    recorrencia: proposta.recorrencia,
                    descontoTarifa: this.processarDesconto(proposta.economia),
                    descontoBandeira: this.processarDesconto(proposta.bandeira),
                    beneficios: proposta.beneficios || [],
                    unidadesConsumidoras: proposta.unidades_consumidoras || [],
                    created_at: proposta.created_at,
                    updated_at: proposta.updated_at
                };
            });
            
            console.log(`✅ Carregadas ${propostasMapeadas.length} propostas da API (original)`);
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
        
        // ✅ PROCESSAR BENEFÍCIOS
        let beneficiosArray = [];
        if (proposta.beneficios && Array.isArray(proposta.beneficios)) {
            beneficiosArray = proposta.beneficios;
        } else if (proposta.beneficiosAdicionais && Array.isArray(proposta.beneficiosAdicionais)) {
            beneficiosArray = proposta.beneficiosAdicionais;
        }
        
        // ✅ PROCESSAR UNIDADES CONSUMIDORAS
        let unidadesArray = [];
        if (proposta.unidadesConsumidoras && Array.isArray(proposta.unidadesConsumidoras)) {
            unidadesArray = proposta.unidadesConsumidoras;
        } else if (proposta.unidades_consumidoras && Array.isArray(proposta.unidades_consumidoras)) {
            unidadesArray = proposta.unidades_consumidoras;
        }

        console.log('📋 Dados processados:', {
            beneficios: beneficiosArray,
            beneficios_count: beneficiosArray.length,
            unidades_consumidoras: unidadesArray,
            unidades_count: unidadesArray.length
        });
        
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
            economia: this.formatarDescontoParaBackend(proposta.descontoTarifa || 20),
            bandeira: this.formatarDescontoParaBackend(proposta.descontoBandeira || 20),
            
            // ✅ ARRAYS COM NOMES CORRETOS PARA O BACKEND
            beneficios: beneficiosArray,
            unidades_consumidoras: unidadesArray
        };

        console.log('📤 Dados mapeados para backend:', {
            ...dadosBackend,
            descontos: {
                economia: dadosBackend.economia,
                bandeira: dadosBackend.bandeira
            },
            arrays: {
                beneficios_count: dadosBackend.beneficios.length,
                unidades_count: dadosBackend.unidades_consumidoras.length
            }
        });
        
        return dadosBackend;
    }

    // ========================================
    // MÉTODOS DE COMPATIBILIDADE (MANTIDOS)
    // ========================================

    async atualizarProspec(index, dadosAtualizados) {
        if (dadosAtualizados.id || dadosAtualizados.propostaId) {
            const id = dadosAtualizados.id || dadosAtualizados.propostaId;
            return await this.updateProspec(id, dadosAtualizados);
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
            // ✅ Usar versão original para estatísticas (para não contar UCs repetidas)
            const propostas = await this.getProspecOriginal();
            
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