// src/services/auditoriaService.js
import apiService from './apiService';

const auditoriaService = {
    /**
     * Listar eventos de auditoria com filtros
     */
    listarEventos: async (params = {}) => {
        try {
            const queryString = new URLSearchParams();

            if (params.page) queryString.append('page', params.page);
            if (params.per_page) queryString.append('per_page', params.per_page);
            if (params.modulo) queryString.append('modulo', params.modulo);
            if (params.evento_tipo) queryString.append('evento_tipo', params.evento_tipo);
            if (params.usuario_id) queryString.append('usuario_id', params.usuario_id);
            if (params.data_inicio) queryString.append('data_inicio', params.data_inicio);
            if (params.data_fim) queryString.append('data_fim', params.data_fim);
            if (params.evento_critico !== undefined) queryString.append('evento_critico', params.evento_critico);

            const url = queryString.toString() ? `/auditoria?${queryString}` : '/auditoria';
            return await apiService.get(url);
        } catch (error) {
            console.error('❌ Erro ao listar eventos de auditoria:', error);
            throw error;
        }
    },

    /**
     * Obter eventos críticos recentes
     */
    obterEventosCriticos: async () => {
        try {
            return await apiService.get('/auditoria/eventos-criticos');
        } catch (error) {
            console.error('❌ Erro ao obter eventos críticos:', error);
            throw error;
        }
    },

    /**
     * Obter eventos por módulo
     */
    obterEventosPorModulo: async (modulo) => {
        try {
            return await apiService.get(`/auditoria/modulo/${modulo}`);
        } catch (error) {
            console.error('❌ Erro ao obter eventos por módulo:', error);
            throw error;
        }
    },

    /**
     * Obter histórico de uma entidade específica
     */
    obterHistoricoEntidade: async (entidade, entidadeId) => {
        try {
            return await apiService.get(`/auditoria/historico/${entidade}/${entidadeId}`);
        } catch (error) {
            console.error('❌ Erro ao obter histórico da entidade:', error);
            throw error;
        }
    },

    /**
     * Obter estatísticas de auditoria
     */
    obterEstatisticas: async () => {
        try {
            return await apiService.get('/auditoria/estatisticas');
        } catch (error) {
            console.error('❌ Erro ao obter estatísticas de auditoria:', error);
            throw error;
        }
    },

    /**
     * Formatadores para exibição
     */
    formatters: {
        /**
         * Formatar data para exibição
         */
        formatarData: (dataString) => {
            if (!dataString) return '-';
            try {
                const data = new Date(dataString);
                return data.toLocaleDateString('pt-BR') + ' ' + data.toLocaleTimeString('pt-BR');
            } catch (error) {
                return dataString;
            }
        },

        /**
         * Formatar tipo de evento para exibição
         */
        formatarTipoEvento: (eventoTipo) => {
            const tipos = {
                'USUARIO_LOGIN': 'Login do Usuário',
                'USUARIO_LOGOUT': 'Logout do Usuário',
                'PROPOSTA_CRIADA': 'Proposta Criada',
                'PROPOSTA_EDITADA': 'Proposta Editada',
                'PROPOSTA_EXCLUIDA': 'Proposta Excluída',
                'UG_CRIADA': 'UG Criada',
                'UG_EDITADA': 'UG Editada',
                'UG_EXCLUIDA': 'UG Excluída',
                'TERMO_ADESAO_ENVIADO': 'Termo Enviado',
                'TERMO_GERADO': 'Termo Gerado',
                'TERMO_ENVIADO_AUTENTIQUE': 'Termo Enviado para Autentique',
                'TERMO_ASSINADO': 'Termo Assinado',
                'TERMO_REJEITADO': 'Termo Rejeitado',
                'TERMO_REGENERADO': 'Termo Regenerado',
                'TERMO_CANCELADO': 'Termo Cancelado',
                'NOTIFICACAO_LIDA': 'Notificação Lida',
                'STATUS_ALTERADO': 'Status Alterado',
                'CONTROLE_CRIADO': 'Controle Criado',
                'CONTROLE_EDITADO': 'Controle Editado',
                'CONTROLE_EXCLUIDO': 'Controle Excluído',
                'UG_ATRIBUIDA': 'UG Atribuída',
                'UG_REMOVIDA': 'UG Removida'
            };
            return tipos[eventoTipo] || eventoTipo;
        },

        /**
         * Formatar módulo para exibição
         */
        formatarModulo: (modulo) => {
            const modulos = {
                'auth': 'Autenticação',
                'propostas': 'Propostas',
                'controle': 'Controle',
                'ugs': 'UGs',
                'dashboard': 'Dashboard',
                'usuarios': 'Usuários'
            };
            return modulos[modulo] || modulo;
        },

        /**
         * Formatar ação para exibição
         */
        formatarAcao: (acao) => {
            const acoes = {
                'CRIADO': 'Criado',
                'ALTERADO': 'Alterado',
                'EXCLUIDO': 'Excluído',
                'LOGIN': 'Login',
                'LOGOUT': 'Logout',
                'LIDA': 'Lida',
                'TERMO_ENVIADO': 'Enviado'
            };
            return acoes[acao] || acao;
        },

        /**
         * Obter cor do badge baseado na ação
         */
        obterCorAcao: (acao, eventoTipoCompleto) => {
            if (eventoTipoCompleto?.includes('EXCLUIDA') || eventoTipoCompleto?.includes('EXCLUIDO')) {
                return 'bg-red-100 text-red-800';
            }

            switch (acao) {
                case 'CRIADO':
                    return 'bg-green-100 text-green-800';
                case 'ALTERADO':
                    return 'bg-blue-100 text-blue-800';
                case 'EXCLUIDO':
                    return 'bg-red-100 text-red-800';
                case 'LOGIN':
                    return 'bg-purple-100 text-purple-800';
                case 'LOGOUT':
                    return 'bg-gray-100 text-gray-800';
                case 'LIDA':
                    return 'bg-indigo-100 text-indigo-800';
                case 'TERMO_ENVIADO':
                    return 'bg-yellow-100 text-yellow-800';
                default:
                    return 'bg-gray-100 text-gray-800';
            }
        },

        /**
         * Obter prioridade visual baseado se é evento crítico
         */
        obterPrioridadeVisual: (eventoCritico) => {
            return eventoCritico ? 'Crítico' : 'Normal';
        },

        /**
         * Formatar dados de contexto para exibição
         */
        formatarDadosContexto: (dadosContexto) => {
            if (!dadosContexto) return null;

            try {
                const dados = typeof dadosContexto === 'string'
                    ? JSON.parse(dadosContexto)
                    : dadosContexto;

                return Object.entries(dados)
                    .filter(([key, value]) => value !== null && value !== undefined && value !== '')
                    .map(([key, value]) => ({
                        chave: key.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase()),
                        valor: typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)
                    }));
            } catch (error) {
                return null;
            }
        }
    }
};

export default auditoriaService;