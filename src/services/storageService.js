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

        propostas.forEach((proposta, propostaIndex) => {
            
            // Verificar se tem UCs no array
            let ucsArray = [];
            
            if (proposta.unidades_consumidoras && Array.isArray(proposta.unidades_consumidoras)) {
                ucsArray = proposta.unidades_consumidoras;
            } else if (proposta.unidadesConsumidoras && Array.isArray(proposta.unidadesConsumidoras)) {
                ucsArray = proposta.unidadesConsumidoras;
            } else if (typeof proposta.unidadesConsumidoras === 'string') {
                try {
                    ucsArray = JSON.parse(proposta.unidadesConsumidoras);
                } catch (e) {
                    ucsArray = [];
                }
            }

            // Se não tem UCs, criar uma linha padrão com dados vazios
            if (!ucsArray || ucsArray.length === 0) {
                linhasExpandidas.push({
                    id: `${proposta.id}-UC-default-${Date.now()}`,
                    propostaId: proposta.id,
                    numeroProposta: proposta.numeroProposta || proposta.numero_proposta,
                    nomeCliente: proposta.nomeCliente || proposta.nome_cliente,
                    consultor: proposta.consultor,
                    data: proposta.data || proposta.data_proposta,
                    status: proposta.status,
                    observacoes: proposta.observacoes,
                    recorrencia: proposta.recorrencia,
                    descontoTarifa: proposta.descontoTarifa,
                    descontoBandeira: proposta.descontoBandeira,
                    beneficios: proposta.beneficios || [],
                    documentacao: proposta.documentacao || {},
                    
                    // ⚠️ DADOS VAZIOS PORQUE NÃO HÁ UCs
                    ucIndex: 0,
                    apelido: '-',
                    numeroUC: '-',
                    numeroCliente: '-',
                    ligacao: '-',
                    media: 0,
                    distribuidora: '-',
                    
                    created_at: proposta.created_at,
                    updated_at: proposta.updated_at
                });
            } else {
                // Criar uma linha para cada UC real
                ucsArray.forEach((uc, ucIndex) => {
                    const uniqueId = `${proposta.id}-UC-${ucIndex}-${uc.numero_unidade || `idx${ucIndex}`}-${Date.now()}`;

                    linhasExpandidas.push({
                        id: uniqueId,
                        propostaId: proposta.id, // ✅ SEMPRE manter referência clara ao ID original
                        numeroProposta: proposta.numeroProposta || proposta.numero_proposta,
                        nomeCliente: proposta.nomeCliente || proposta.nome_cliente,
                        consultor: proposta.consultor,
                        data: proposta.data || proposta.data_proposta,
                        status: uc.status || proposta.status,
                        observacoes: proposta.observacoes,
                        recorrencia: proposta.recorrencia,
                        descontoTarifa: proposta.descontoTarifa,
                        descontoBandeira: proposta.descontoBandeira,
                        beneficios: proposta.beneficios || [],
                        documentacao: proposta.documentacao || {},

                        // ✅ DADOS REAIS DA UC
                        ucIndex: ucIndex,
                        apelido: uc.apelido || `UC ${uc.numero_unidade || ucIndex + 1}`,
                        numeroUC: uc.numero_unidade || uc.numeroUC || '',
                        numeroCliente: uc.numero_cliente || uc.numeroCliente || '',
                        ligacao: uc.ligacao || uc.tipo_ligacao || '',
                        media: uc.consumo_medio || uc.media || 0,
                        distribuidora: uc.distribuidora || '',
                        
                        created_at: proposta.created_at,
                        updated_at: proposta.updated_at
                    });
                });
            }
        });

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

    // 🔧 STORAGE SERVICE - CORREÇÃO FINAL
    // =====================================

    // Substitua o método getProspec() no seu storageService.js por este:

    async getProspec() {
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
                propostas = [];
            }

            // Verificar se os dados já vêm expandidos do backend
            const primeiroItem = propostas[0];
            const jaVemExpandido = primeiroItem && (
                primeiroItem.propostaId !== undefined ||
                primeiroItem.numeroUC !== undefined ||
                primeiroItem.apelido !== undefined
            );

            if (jaVemExpandido) {
                // Dados já vêm expandidos - apenas mapear
                return propostas.map(linha => ({
                    ...linha,
                    consumoMedio: linha.media || linha.consumoMedio || linha.consumo_medio || 0,
                    numeroUC: linha.numeroUC || linha.numero_uc || '-',
                    apelido: linha.apelido || linha.apelido_uc || '-'
                }));
            } else {
                // Dados são propostas normais - expandir
                const propostasMapeadas = propostas.map((proposta, index) => {
                    return this.mapearPropostaDoBackend(proposta);
                }).filter(Boolean);

                return this.expandirPropostasParaUCs(propostasMapeadas);
            }

        } catch (error) {
            console.error('❌ Erro ao carregar propostas do storageService:', error);
            return [];
        }
    }
    async buscarUCsDaTabela(propostaId) {
        try {
            const token = localStorage.getItem('aupus_token') || localStorage.getItem('auth_token');
            const apiUrl = process.env.REACT_APP_API_URL || '';
            
            const response = await fetch(`${apiUrl}/propostas/${propostaId}/ucs`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                return data.success ? data.data : [];
            }
            
            return [];
        } catch (error) {
            console.error('❌ Erro ao buscar UCs da tabela:', error);
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
            // ✅ CORREÇÃO: Adicionar per_page=all para obter TODOS os registros
            const response = await apiService.get('/controle?per_page=all');

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
            return null;
        }

        // ✅ PROCESSAR DESCONTOS
        let descontoTarifa = 20;
        let descontoBandeira = 20;

        if (proposta.desconto_tarifa !== undefined) {
            descontoTarifa = this.processarDesconto(proposta.desconto_tarifa);
        } else if (proposta.economia !== undefined) {
            descontoTarifa = this.processarDesconto(proposta.economia);
        }

        if (proposta.desconto_bandeira !== undefined) {
            descontoBandeira = this.processarDesconto(proposta.desconto_bandeira);
        } else if (proposta.bandeira !== undefined) {
            descontoBandeira = this.processarDesconto(proposta.bandeira);
        }

        // 🔍 PROCESSAR UNIDADES CONSUMIDORAS COM DEBUG DETALHADO
        let unidadesProcessadas = [];
        let ucsArray = [];

        // Verificar se tem unidades_consumidoras
        if (proposta.unidades_consumidoras) {
            if (typeof proposta.unidades_consumidoras === 'string') {
                try {
                    ucsArray = JSON.parse(proposta.unidades_consumidoras);
                } catch (e) {
                    ucsArray = [];
                }
            } else if (Array.isArray(proposta.unidades_consumidoras)) {
                ucsArray = proposta.unidades_consumidoras;
            }
        }

        // Processar UCs encontradas
        if (ucsArray && ucsArray.length > 0) {
            unidadesProcessadas = ucsArray.map((uc, index) => {
                return {
                    ...uc,
                    status: uc.status || 'Aguardando'
                };
            });
        }

        // ✅ CRIAR PROPOSTA MAPEADA
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
            
            // 🔒 CORREÇÃO DEFINITIVA: Não usar dados da primeira UC para compatibilidade
            // Esses campos serão preenchidos na expansão de linhas com dados corretos
            apelido: '',
            numeroUC: '',
            numeroCliente: '',
            ligacao: '',
            media: 0,
            distribuidora: '',
            
            // Timestamps
            created_at: proposta.created_at,
            updated_at: proposta.updated_at
        };


        return propostaMapeada;
    }
    // ========================================
    // MAPEAMENTO FRONTEND → BACKEND
    // ========================================

    mapearPropostaParaBackend(proposta) {

        let consultorIdFinal = proposta.consultor_id;
        if (consultorIdFinal === '' || consultorIdFinal === 'null' || consultorIdFinal === undefined) {
            consultorIdFinal = null;
        }

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
                consultor_id: consultorIdFinal,
                consultor: proposta.consultor || '',
                recorrencia: proposta.recorrencia,
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
            if (!propostaId || (propostaId !== 0 && !propostaId)) {
                return null;
            }

            // Tentar buscar via API diretamente
            try {
                const response = await apiService.get(`/propostas/${propostaId}`);

                if (response?.success && response?.data) {
                    const proposta = response.data;
                    const propostaMapeada = this.mapearPropostaDoBackend(proposta);

                    return propostaMapeada;
                }
            } catch (apiError) {
                // Para não-admins, retornar null para evitar dados incorretos
                if (apiError.message?.includes('403') || apiError.message?.includes('401') || apiError.message?.includes('Forbidden')) {
                    return null;
                }
            }

            // ✅ Fallback apenas para casos específicos (não erro de permissão)
            try {
                const todasPropostas = await this.getProspecOriginal();

                // ✅ BUSCA MAIS RIGOROSA: Apenas por ID numérico exato
                const propostaIdNumber = Number(propostaId);
                if (!isNaN(propostaIdNumber)) {
                    const propostaEncontrada = todasPropostas.find(proposta =>
                        proposta.id === propostaIdNumber
                    );

                    if (propostaEncontrada) {
                        return propostaEncontrada;
                    }
                }

            } catch (cacheError) {
                // Erro silencioso no fallback
            }

            return null;

        } catch (error) {
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

    // ========================================
    // RATEIO DE UG
    // ========================================

    async obterRateioDetalhes(ugId) {
        try {
            console.log('📊 Buscando detalhes do rateio para UG:', ugId);
            const response = await apiService.get(`/ugs/${ugId}/rateio-detalhes`);
            console.log('📊 Resposta do rateio:', response);
            return response;
        } catch (error) {
            console.error('❌ Erro ao buscar detalhes do rateio:', error);
            throw error;
        }
    }

    async atualizarMediasUCs(ucsAtualizadas) {
        try {
            console.log('✏️ Atualizando médias das UCs no banco de dados...');
            console.log('📊 UCs a atualizar (dados completos):', ucsAtualizadas);

            // Formatar dados para o backend - usar numero_unidade como identificador principal
            const dadosParaBackend = ucsAtualizadas.map(uc => {
                const consumoMedio = parseFloat(uc.consumo_calibrado_editado || uc.consumo_calibrado || 0);

                console.log(`🔍 Processando UC: ${uc.numero_unidade}`, {
                    id: uc.id,
                    uc_id: uc.uc_id,
                    numero_unidade: uc.numero_unidade,
                    consumo_calibrado_editado: uc.consumo_calibrado_editado,
                    consumo_calibrado: uc.consumo_calibrado,
                    consumo_medio_final: consumoMedio
                });

                return {
                    // Converter numero_unidade para string (validação do backend exige string)
                    numero_unidade: String(uc.numero_unidade),
                    consumo_medio: consumoMedio
                };
            });

            console.log('📤 Dados formatados para backend:', dadosParaBackend);

            const response = await apiService.post('/unidades-consumidoras/bulk-update', {
                updates: dadosParaBackend
            });

            console.log('✅ Médias das UCs atualizadas com sucesso:', response);
            return response;

        } catch (error) {
            console.error('❌ Erro ao atualizar médias das UCs:', error);
            console.error('❌ Detalhes do erro:', {
                message: error.message,
                response: error.response?.data,
                status: error.response?.status
            });
            throw error;
        }
    }

    async gerarRelatorioUGs() {
        try {
            console.log('📄 Gerando relatório de UGs');
            const response = await apiService.get('/ugs/relatorio');
            console.log('📄 Resposta do relatório:', response);
            return response;
        } catch (error) {
            console.error('❌ Erro ao gerar relatório de UGs:', error);
            throw error;
        }
    }
}

const storageService = new StorageService();
export default storageService;