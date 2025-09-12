// src/services/storageService.js - Completo com expansão de UCs
import apiService from './apiService';
import { formatarPrimeiraMaiuscula } from '../utils/formatters';

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
            
            // ✅ CORRIGIDO: Usar 'aupus_token' igual ao apiService
            localStorage.setItem('aupus_token', response.token);
            localStorage.setItem('user', JSON.stringify(response.user));
            
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
        // Limpar token do apiService
        apiService.clearToken();
        
        // ✅ CORRIGIDO: Usar 'aupus_token' igual ao apiService
        localStorage.removeItem('aupus_token');
        localStorage.removeItem('user');
        
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
            /**
            console.log('🔍 Proposta original do backend:', {
                id: proposta.id,
                numeroProposta: proposta.numeroProposta || proposta.numero_proposta,
                documentacao_existe: !!proposta.documentacao,
                documentacao_conteudo: proposta.documentacao
            });
            */
            
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
                    documentacao: proposta.documentacao || {},
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
                        status: uc.status || proposta.status,
                        observacoes: proposta.observacoes,
                        recorrencia: proposta.recorrencia,
                        descontoTarifa: this.processarDesconto(proposta.descontoTarifa || proposta.economia),
                        descontoBandeira: this.processarDesconto(proposta.descontoBandeira || proposta.bandeira),
                        beneficios: proposta.beneficios || [],
                        
                        documentacao: proposta.documentacao || {},

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


    /**
     * ✅ MÉTODO ORIGINAL: getProspec sem expansão (para casos específicos)
     */
    async getProspec() {
        try {
            // console.log('📥 Carregando propostas da API para expansão...');
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

            // console.log(`📊 Total de propostas recebidas: ${propostas.length}`);
            
            // ✅ MAPEAR DADOS DO BACKEND COM DESCONTOS CORRETOS
            const propostasMapeadas = propostas.map((proposta, index) => {
                const propostaMapeada = this.mapearPropostaDoBackend(proposta);
                
                console.log(`📋 Proposta ${index + 1} mapeada:`, {
                    id: propostaMapeada?.id,
                    numeroProposta: propostaMapeada?.numeroProposta,
                    descontos: {
                        descontoTarifa: propostaMapeada?.descontoTarifa,
                        descontoBandeira: propostaMapeada?.descontoBandeira
                    }
                });
                
                return propostaMapeada;
            }).filter(Boolean); // Remove propostas inválidas
            
            // ✅ EXPANDIR PARA UCs
            const linhasExpandidas = this.expandirPropostasParaUCs(propostasMapeadas);
            
            // console.log(`🎯 Total de linhas expandidas: ${linhasExpandidas.length}`);
            
            return linhasExpandidas;

        } catch (error) {
            console.error('❌ Erro ao carregar propostas do storageService:', error);
            return [];
        }
    }

    async saveProspec(proposta) {
        console.log('📤 Dados enviados:', proposta);
        
        try {
            const dadosParaBackend = this.mapearPropostaParaBackend(proposta);
            const response = await apiService.post('/propostas', dadosParaBackend);
            
            if (response.success) {
                console.log('✅ Proposta salva com sucesso:', response.data);
                return response.data;
            } else {
                throw new Error(response.message || 'Erro desconhecido do servidor');
            }
            
        } catch (originalError) {
            // ✅ CONDICIONAL: Só logar se não for UC duplicada
            if (originalError.response?.status === 422 && 
                originalError.response?.data?.error_type === 'ucs_com_proposta_ativa') {
                // Silenciar logs para UC duplicada - modal será exibido
            } else {
                console.error('❌ Erro ao salvar proposta:', originalError.message);
                console.log('🔍 DEBUG storageService - estrutura do erro original:', {
                    hasResponse: !!originalError.response,
                    responseStatus: originalError.response?.status,
                    responseData: originalError.response?.data,
                    errorType: originalError.response?.data?.error_type
                });
            }
            
            // ✅ VERIFICAÇÃO ESPECÍFICA PARA UC DUPLICADA (sem logs)
            if (originalError.response?.status === 422 && 
                originalError.response?.data?.error_type === 'ucs_com_proposta_ativa') {
                
                // Preservar dados sem logs de debug
                const erroPreservado = new Error(originalError.message);
                erroPreservado.response = originalError.response;
                erroPreservado.isUcDuplicada = true;
                throw erroPreservado;
            }
            
            throw originalError;
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
                console.warn('⚠️ Formato inesperado de resposta do controle:', response);
                controles = [];
            }

            console.log(`✅ ${controles.length} controles carregados da API`);
            return controles;
            
        } catch (error) {
            console.error('❌ Erro ao carregar controle:', error.message);
            
            if (error.message.includes('404')) {
                console.log('ℹ️ Nenhum controle encontrado - retornando array vazio');
                return [];
            }
            
            throw new Error(`Não foi possível carregar controle: ${error.message}`);
        }
    }

    async getUGs() {
        try {
            console.log('🔗 storageService.getUGs() INICIADO');
            console.log('🔗 Fazendo requisição para /api/ugs');
            
            const response = await apiService.get('/ugs');
            
            console.log('🔗 RESPOSTA RAW recebida:', {
                hasResponse: !!response,
                type: typeof response,
                isArray: Array.isArray(response),
                hasData: response?.data !== undefined,
                hasSuccess: response?.success !== undefined,
                keys: response ? Object.keys(response) : 'sem response'
            });
            
            let ugs;
            if (response?.success && response?.data) {
                console.log('✅ Resposta tem success e data');
                ugs = response.data;
            } else if (Array.isArray(response)) {
                console.log('✅ Resposta é array direto');
                ugs = response;
            } else {
                console.log('❌ Formato de resposta inesperado:', response);
                ugs = [];
            }
            
            console.log(`✅ storageService.getUGs() CONCLUÍDO - ${ugs.length} UGs`);
            return ugs;
            
        } catch (error) {
            console.error('❌ ERRO em storageService.getUGs():', {
                message: error.message,
                status: error.status,
                response: error.response?.data || 'sem response data'
            });
            throw new Error(`Não foi possível carregar as UGs: ${error.message}`);
        }
    }

    // ========================================
    // ✅ ADICIONAR ESTA SEÇÃO NO storageService.js
    // ========================================

    async adicionarUG(dadosUG) {
        try {
            console.log('💾 storageService.adicionarUG INICIADO');
            console.log('💾 Nome da UG:', dadosUG.nome_usina);
            console.log('💾 Dados completos:', JSON.stringify(dadosUG, null, 2));
            
            console.log('🌐 Chamando apiService.criarUG...');
            const response = await apiService.criarUG(dadosUG);
            
            console.log('✅ storageService.adicionarUG - UG criada com sucesso:', response);
            return response;
            
        } catch (error) {
            console.error('❌ storageService.adicionarUG - Erro:', error.message);
            console.error('❌ storageService.adicionarUG - Stack:', error.stack);
            throw new Error(`Não foi possível criar a UG: ${error.message}`);
        }
    }

    async atualizarUG(ugId, dadosUG) {
        try {
            console.log('✏️ Atualizando UG via API...', {id: ugId, dados: dadosUG});
            
            if (!ugId) {
            throw new Error('ID da UG é necessário para atualização');
            }
            
            // ✅ MANTER OS NOMES ORIGINAIS DO FRONTEND PARA O BACKEND
            const dadosLimpos = {
            nomeUsina: dadosUG.nomeUsina,
            potenciaCC: parseFloat(dadosUG.potenciaCC) || 0,
            fatorCapacidade: parseFloat(dadosUG.fatorCapacidade) || 19,  // ✅ MANTER COMO ESTÁ
            numero_unidade: String(dadosUG.numero_unidade || '').trim(),
            };

            console.log('📝 Dados limpos para API:', dadosLimpos);
            console.log('🔍 Especificamente fatorCapacidade:', {
            original: dadosUG.fatorCapacidade,
            processado: dadosLimpos.fatorCapacidade,
            tipo: typeof dadosLimpos.fatorCapacidade
            });
            
            const response = await apiService.put(`/ugs/${ugId}`, dadosLimpos);
            console.log('✅ UG atualizada com sucesso');
            return response;
            
        } catch (error) {
            console.error('❌ Erro ao atualizar UG:', error.message);
            throw new Error(`Não foi possível atualizar a UG: ${error.message}`);
        }
        }

    async removerUG(ugId) {
        try {
            console.log('🗑️ Removendo UG via API:', ugId);
            
            // ✅ CHAMADA REAL PARA API
            await apiService.delete(`/ugs/${ugId}`);
            
            console.log('✅ UG removida com sucesso da API');
            return { success: true };
            
        } catch (error) {
            console.error('❌ Erro ao remover UG:', error.message);
            throw new Error(`Não foi possível remover a UG: ${error.message}`);
        }
    }

    /**
     * ✅ Processar desconto vindo do backend
     */
    processarDesconto(desconto) {
        if (desconto === null || desconto === undefined) return 20;
        
        if (typeof desconto === 'number') return desconto;
        if (typeof desconto === 'string') {
            const limpo = desconto.replace('%', '').trim();
            const numero = parseFloat(limpo);
            return isNaN(numero) ? 20 : numero;
        }
        if (desconto.valor !== undefined) return parseFloat(desconto.valor) || 20;
        
        return 20;
    }

    /**
     * ✅ Formatar desconto para enviar ao backend
     */
    formatarDescontoParaBackend(valor) {
        if (valor === null || valor === undefined) return '20%';

        // Se já vem com %, remover e reprocessar
        if (typeof valor === 'string' && valor.includes('%')) {
            const numeroLimpo = parseFloat(valor.replace('%', ''));
            return isNaN(numeroLimpo) ? '20%' : `${numeroLimpo}%`;
        }

        const numeroLimpo = parseFloat(valor);
        return isNaN(numeroLimpo) ? '20%' : `${numeroLimpo}%`;
    }

    /**
     * ✅ NOVO: Mapear proposta do backend para o frontend
     * CORRIGE o problema dos descontos não aparecerem corretamente
     */
    mapearPropostaDoBackend(proposta) {
        if (!proposta) {
            console.warn('⚠️ Proposta vazia recebida para mapeamento');
            return null;
        }

        // ✅ PROCESSAR DESCONTOS - PRIORIZAR descontoTarifa/descontoBandeira, depois economia/bandeira
        let descontoTarifa = 20; // Padrão
        let descontoBandeira = 20; // Padrão

        // Verificar se vem com os nomes novos
        if (proposta.descontoTarifa !== undefined) {
            descontoTarifa = this.processarDesconto(proposta.descontoTarifa);
        } else if (proposta.economia !== undefined) {
            // Fallback para o nome antigo
            descontoTarifa = this.processarDesconto(proposta.economia);
        }

        if (proposta.descontoBandeira !== undefined) {
            descontoBandeira = this.processarDesconto(proposta.descontoBandeira);
        } else if (proposta.bandeira !== undefined) {
            // Fallback para o nome antigo
            descontoBandeira = this.processarDesconto(proposta.bandeira);
        }

        const unidadesConsumidoras = proposta.unidades_consumidoras || [];

        const unidadesProcessadas = unidadesConsumidoras.map(uc => ({
            ...uc,
            status: uc.status || 'Aguardando' // ✅ Garantir que cada UC tem status
        }));

        const propostaMapeada = {
            // Campos principais
            id: proposta.id,
            numeroProposta: proposta.numero_proposta || proposta.numeroProposta,
            nomeCliente: proposta.nome_cliente || proposta.nomeCliente,
            consultor: proposta.consultor,
            data: proposta.data_proposta || proposta.data,
            observacoes: proposta.observacoes,
            recorrencia: proposta.recorrencia,
            
            documentacao: proposta.documentacao || {},

            // ✅ DESCONTOS MAPEADOS CORRETAMENTE
            descontoTarifa: descontoTarifa,
            descontoBandeira: descontoBandeira,
            
            // Arrays
            beneficios: proposta.beneficios || [],
            unidades_consumidoras: unidadesProcessadas, // ✅ UCs PROCESSADAS
            unidadesConsumidoras: unidadesProcessadas, // Compatibilidade
            
            // Dados da primeira UC para compatibilidade
            apelido: proposta.apelido || '',
            numeroUC: proposta.numeroUC || '',
            numeroCliente: proposta.numeroCliente || '',
            ligacao: proposta.ligacao || '',
            media: proposta.media || 0,
            distribuidora: proposta.distribuidora || '',
            
            // Timestamps
            created_at: proposta.created_at,
            updated_at: proposta.updated_at
        };


        console.log('🔄 Proposta mapeada do backend:', {
            id: propostaMapeada.id,
            numeroProposta: propostaMapeada.numeroProposta,
            descontos: {
                descontoTarifa: propostaMapeada.descontoTarifa,
                descontoBandeira: propostaMapeada.descontoBandeira
            }
        });

        return propostaMapeada;
    }
    // ========================================
    // MAPEAMENTO FRONTEND → BACKEND
    // ========================================

    mapearPropostaParaBackend(proposta) {
        console.log('🔄 Mapeando proposta para backend:', proposta);

        // ✅ SE FOR CANCELAMENTO DE UC, ENVIAR APENAS OS CAMPOS NECESSÁRIOS
        if (proposta.cancelar_uc && proposta.numero_uc) {
            return {
                cancelar_uc: true,
                numero_uc: proposta.numero_uc
            };
        }

        // ✅ IDENTIFICAR SE É EDIÇÃO DE MODAL (campos limitados)
        const isEdicaoModal = proposta.numeroUC && !proposta.nomeCliente;

        if (isEdicaoModal) {
            // ✅ MODAL DE EDIÇÃO: Enviar apenas campos editáveis
            const dadosModal = {
                consultor: proposta.consultor || '',
                status: proposta.status || 'Aguardando',
                
                // ✅ DESCONTOS - usar valores reais do formulário  
                economia: proposta.economia ? `${proposta.economia}%` : undefined,
                bandeira: proposta.bandeira ? `${proposta.bandeira}%` : undefined,
                
                // ✅ CAMPOS DE ENDEREÇO (CORREÇÃO - estava faltando enderecoUC)
                logradouroUC: proposta.logradouroUC,
                enderecoUC: proposta.enderecoUC,  // 🔧 ADICIONAR ESTE CAMPO
                
                // ✅ CONTATOS DO REPRESENTANTE
                whatsappRepresentante: proposta.whatsappRepresentante,
                emailRepresentante: proposta.emailRepresentante,
                enderecoRepresentante: proposta.enderecoRepresentante,
                
                // UC específica
                numeroUC: proposta.numeroUC,
                apelido: proposta.apelido,
                ligacao: proposta.ligacao,
                media: proposta.media,
                distribuidora: proposta.distribuidora
            };

            // ✅ INCLUIR documentação se existir
            if (proposta.documentacao) {
                dadosModal.documentacao = proposta.documentacao;
            }

            // ✅ CORREÇÃO: PRESERVAR benefícios existentes para não sobrescrever
            if (proposta.beneficios && Array.isArray(proposta.beneficios) && proposta.beneficios.length > 0) {
                dadosModal.beneficios = proposta.beneficios;
            }

            // ✅ CORREÇÃO: PRESERVAR observações existentes para não sobrescrever  
            if (proposta.observacoes) {
                dadosModal.observacoes = proposta.observacoes;
            }

            return dadosModal;
        }

        // ✅ CRIAÇÃO COMPLETA: Enviar todos os campos
        let beneficiosArray = [];
        if (proposta.beneficios && Array.isArray(proposta.beneficios)) {
            beneficiosArray = proposta.beneficios;
        } else if (proposta.beneficiosAdicionais && Array.isArray(proposta.beneficiosAdicionais)) {
            beneficiosArray = proposta.beneficiosAdicionais;
        }

        // ✅ PROCESSAR UNIDADES CONSUMIDORAS
        let unidadesArray = [];
        if (proposta.numeroUC && (proposta.apelido || proposta.ligacao || proposta.media || proposta.distribuidora)) { 
            // Indica edição de UC específica
            unidadesArray = [{
                numero_unidade: proposta.numeroUC,
                apelido: proposta.apelido,
                ligacao: proposta.ligacao,
                consumo_medio: proposta.media,
                distribuidora: proposta.distribuidora,
                status: proposta.status
            }];
        } else if (proposta.unidadesConsumidoras && Array.isArray(proposta.unidadesConsumidoras)) {
            unidadesArray = proposta.unidadesConsumidoras;
        } else if (proposta.unidades_consumidoras && Array.isArray(proposta.unidades_consumidoras)) {
            unidadesArray = proposta.unidades_consumidoras;
            unidadesArray = unidadesArray.map(uc => ({
                ...uc,
                status: uc.status
            }));
        }

        const unidadesProcessadas = this.processarUnidadesConsumidoras(proposta);

        const dadosBackend = {
            // Campos principais
            nome_cliente: formatarPrimeiraMaiuscula(proposta.nomeCliente),
            consultor: proposta.consultor || '',
            data_proposta: proposta.dataProposta || proposta.data,
            status: proposta.status || 'Aguardando',
            observacoes: proposta.observacoes || '',
            recorrencia: proposta.recorrencia || '3%',
            
            // ✅ DESCONTOS COM FORMATO CORRETO (COM %)
            economia: this.formatarDescontoParaBackend(proposta.economia || proposta.descontoTarifa),
            bandeira: this.formatarDescontoParaBackend(proposta.bandeira || proposta.descontoBandeira),
            
            // Arrays - USAR VARIÁVEL PROCESSADA
            beneficios: this.processarBeneficios(proposta),
            unidades_consumidoras: unidadesProcessadas
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

        if (proposta.numeroUC) {
            dadosBackend.numeroUC = proposta.numeroUC;
            // 🆕 ADICIONAR CAMPOS DA UC COMO INDIVIDUAIS (igual ao status)
            if (proposta.apelido) dadosBackend.apelido = proposta.apelido;
            if (proposta.ligacao) dadosBackend.ligacao = proposta.ligacao;
            if (proposta.media) dadosBackend.media = proposta.media;
            if (proposta.distribuidora) dadosBackend.distribuidora = proposta.distribuidora;
        }

        // ✅ NOVO: Incluir documentação se existir
        if (proposta.documentacao) {
            dadosBackend.documentacao = proposta.documentacao;
        }

        return dadosBackend;
    }

    processarBeneficios(proposta) {
        let beneficiosArray = [];
        
        if (Array.isArray(proposta.beneficios)) {
            beneficiosArray = proposta.beneficios;
        } else if (Array.isArray(proposta.beneficiosAdicionais)) {
            beneficiosArray = proposta.beneficiosAdicionais;
        }
        
        console.log('🔍 Benefícios processados:', {
            original_beneficios: proposta.beneficios,
            original_beneficiosAdicionais: proposta.beneficiosAdicionais,
            final_array: beneficiosArray,
            count: beneficiosArray.length
        });
        
        return beneficiosArray;
    }

    processarUnidadesConsumidoras(proposta) {
        let unidadesArray = [];
        
        if (Array.isArray(proposta.unidadesConsumidoras)) {
            unidadesArray = proposta.unidadesConsumidoras;
        } else if (Array.isArray(proposta.unidades_consumidoras)) {
            unidadesArray = proposta.unidades_consumidoras;
        }
        
        // Aplicar formatação e status
        unidadesArray = unidadesArray.map(uc => ({
            ...uc,
            apelido: formatarPrimeiraMaiuscula(uc.apelido),
            status: uc.status || 'Aguardando'
        }));
        
        console.log('🏢 Unidades processadas:', {
            count: unidadesArray.length,
            unidades: unidadesArray
        });
        
        return unidadesArray;
    }

    // ========================================
    // MÉTODOS DE COMPATIBILIDADE (MANTIDOS)
    // ========================================

    async atualizarProspec(index, dadosAtualizados) {
        if (dadosAtualizados.propostaId || dadosAtualizados.id) {
            const id = dadosAtualizados.propostaId || dadosAtualizados.id; // ✅ PRIORIZAR propostaId
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

    async getPropostas() {
        // console.log('📡 Chamando endpoint: /propostas (getPropostas)');
        
        try {
            const response = await apiService.get('/propostas');
            
            // ✅ DEBUG: Ver o que vem da API
            console.log('🔍 Resposta da API propostas:', {
                success: response.success,
                total: response.data?.length,
                primeira_proposta: response.data?.[0]
            });
            
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

            console.log(`📊 Total de propostas recebidas: ${propostas.length}`);
            
            // ✅ MAPEAR DADOS DO BACKEND
            const propostasMapeadas = propostas.map((proposta, index) => {
                const propostaMapeada = this.mapearPropostaDoBackend(proposta);
                
                console.log(`📋 Proposta ${index + 1} mapeada:`, {
                    id: propostaMapeada?.id,
                    numeroProposta: propostaMapeada?.numeroProposta,
                    documentacao_existe: !!propostaMapeada?.documentacao,
                    documentacao: propostaMapeada?.documentacao
                });
                
                return propostaMapeada;
            }).filter(Boolean);
            
            // ✅ EXPANDIR PARA UCs
            return this.expandirPropostasParaUCs(propostasMapeadas);
            
        } catch (error) {
            console.error('❌ Erro ao carregar propostas:', error);
            return [];
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

    async buscarPropostaPorId(propostaId) {
        try {
            console.log('🔍 Buscando proposta completa por ID:', propostaId);
            
            // Tentar buscar via API diretamente
            try {
            const response = await apiService.get(`/propostas/${propostaId}`);
            
            if (response?.success && response?.data) {
                const proposta = response.data;
                console.log('✅ Proposta encontrada via API:', proposta.numero_proposta);
                
                // ✅ MAPEAR CORRETAMENTE USANDO O MÉTODO EXISTENTE
                const propostaMapeada = this.mapearPropostaDoBackend(proposta);
                
                // ✅ GARANTIR QUE AS UCs ESTÃO FORMATADAS CORRETAMENTE
                if (propostaMapeada && propostaMapeada.unidades_consumidoras) {
                console.log('📊 UCs na proposta mapeada:', propostaMapeada.unidades_consumidoras.length);
                
                // Debug: Log da primeira UC para verificar estrutura
                if (propostaMapeada.unidades_consumidoras.length > 0) {
                    console.log('🔍 Primeira UC estrutura:', propostaMapeada.unidades_consumidoras[0]);
                }
                }
                
                return propostaMapeada;
            }
            } catch (apiError) {
            console.warn('⚠️ Erro ao buscar via API individual:', apiError.message);
            }
            
            // Fallback: buscar na lista geral de propostas (sem expansão)
            try {
            const todasPropostas = await this.getProspecOriginal(); // Usar versão sem expansão para evitar loop
            const propostaEncontrada = todasPropostas.find(proposta => {
                // Tentar diferentes formatos de ID
                return proposta.propostaId === propostaId || 
                    proposta.id === propostaId ||
                    proposta.numeroProposta === propostaId;
            });
            
            if (propostaEncontrada) {
                console.log('✅ Proposta encontrada no cache:', propostaEncontrada.numeroProposta);
                console.log('📊 UCs no cache:', propostaEncontrada.unidades_consumidoras?.length || 0);
                return propostaEncontrada;
            }
            } catch (cacheError) {
            console.warn('⚠️ Erro ao buscar no cache:', cacheError.message);
            }
            
            console.warn('⚠️ Proposta não encontrada:', propostaId);
            return null;
            
        } catch (error) {
            console.error('❌ Erro ao buscar proposta por ID:', error);
            return null;
        }
        }

        /**
         * ✅ BUSCAR TODAS AS UCs DE UMA PROPOSTA - VERSÃO CORRIGIDA
         * Método específico para obter apenas as UCs de uma proposta
         */
        async buscarUCsDaProposta(propostaId) {
        try {
            const proposta = await this.buscarPropostaPorId(propostaId);
            
            if (!proposta) {
            console.warn('❌ Proposta não encontrada para buscar UCs:', propostaId);
            return [];
            }
            
            // Extrair UCs da proposta
            let ucs = [];
            
            if (proposta.unidades_consumidoras && Array.isArray(proposta.unidades_consumidoras)) {
            ucs = proposta.unidades_consumidoras;
            } else if (proposta.ucs && Array.isArray(proposta.ucs)) {
            ucs = proposta.ucs;
            } else if (proposta.unidadesConsumidoras && Array.isArray(proposta.unidadesConsumidoras)) {
            ucs = proposta.unidadesConsumidoras;
            }
            
            // ✅ FORMATAR UCs PARA GARANTIR CONSISTÊNCIA
            const ucsFormatadas = ucs.map(uc => ({
            apelido: uc.apelido || uc.numero_unidade || 'UC',
            numeroUC: uc.numero_unidade || uc.numeroUC || '',
            numero_unidade: uc.numero_unidade || uc.numeroUC || '',
            ligacao: uc.ligacao || uc.tipo_ligacao || 'Monofásica',
            consumo: parseInt(uc.consumo_medio || uc.consumo || uc.media || 0) || 0,
            consumo_medio: parseInt(uc.consumo_medio || uc.consumo || uc.media || 0) || 0,
            distribuidora: uc.distribuidora || '',
            status: uc.status || 'Aguardando'
            }));
            
            console.log(`✅ ${ucsFormatadas.length} UCs formatadas para a proposta ${propostaId}`);
            
            if (ucsFormatadas.length > 0) {
            console.log('🔍 Primeira UC formatada:', ucsFormatadas[0]);
            }
            
            return ucsFormatadas;
            
        } catch (error) {
            console.error('❌ Erro ao buscar UCs da proposta:', error);
            return [];
        }
        }

        /**
         * ✅ MÉTODO ORIGINAL GETPROSPEC SEM EXPANSÃO
         * Para evitar loops infinitos e obter dados brutos
         */
        async getProspecOriginal() {
        try {
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

            // Mapear propostas sem expandir
            const propostasMapeadas = propostas.map(proposta => {
            return this.mapearPropostaDoBackend(proposta);
            }).filter(Boolean);
            
            console.log(`📊 Total de propostas originais: ${propostasMapeadas.length}`);
            return propostasMapeadas;
            
        } catch (error) {
            console.error('❌ Erro ao carregar propostas originais:', error);
            return [];
        }
    }
}

const storageService = new StorageService();
export default storageService;