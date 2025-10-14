// src/pages/LogsPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import '../styles/common/index.css';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import Header from '../components/common/Header';
import Navigation from '../components/common/Navigation';
import auditoriaService from '../services/auditoriaService';
import {
    Search,
    Filter,
    User,
    AlertTriangle,
    RefreshCw,
    ChevronLeft,
    ChevronRight,
    Info,
    ScrollText,
    Eye,
    Shield,
    FileText,
    Edit,
    Trash2,
    Zap,
    Settings,
    Users,
    BarChart,
    UserCheck,
    LogOut,
    CheckCircle,
    XCircle,
    Link,
    Unlink
} from 'lucide-react';
import './LogsPage.css';

const LogsPage = () => {
    const { user } = useAuth();
    const { showNotification } = useNotification();

    // Estados principais
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({
        page: 1,
        per_page: 20,
        total: 0,
        total_pages: 0
    });

    // Estados de filtros
    const [filtros, setFiltros] = useState({
        modulo: '',
        evento_tipo: '',
        usuario_id: '',
        data_inicio: '',
        data_fim: '',
        evento_critico: '',
        busca: ''
    });

    // Estados da interface
    const [mostrarFiltros, setMostrarFiltros] = useState(false);
    const [logSelecionado, setLogSelecionado] = useState(null);
    const [eventosCriticos, setEventosCriticos] = useState([]);

    // Verificar se o usuário tem permissão (apenas admin)
    useEffect(() => {
        if (!user || user.role !== 'admin') {
            showNotification('Acesso negado. Apenas administradores podem acessar os logs.', 'error');
            return;
        }
    }, [user, showNotification]);

    // Carregar logs
    const carregarLogs = useCallback(async (novaPagina = 1, novosFiltros = filtros) => {
        if (!user || user.role !== 'admin') return;

        setLoading(true);
        try {
            const params = {
                page: novaPagina,
                per_page: pagination.per_page,
                ...novosFiltros
            };

            // Remover filtros vazios
            Object.keys(params).forEach(key => {
                if (params[key] === '' || params[key] === null || params[key] === undefined) {
                    delete params[key];
                }
            });

            const response = await auditoriaService.listarEventos(params);

            if (response.success) {
                setLogs(response.data || []);
                setPagination(response.pagination || {
                    page: novaPagina,
                    per_page: 20,
                    total: 0,
                    total_pages: 0
                });
            } else {
                showNotification('Erro ao carregar logs: ' + (response.message || 'Erro desconhecido'), 'error');
            }
        } catch (error) {
            console.error('Erro ao carregar logs:', error);
            showNotification('Erro ao carregar logs. Verifique sua conexão.', 'error');
        } finally {
            setLoading(false);
        }
    }, [user, pagination.per_page, filtros, showNotification]);

    // Carregar eventos críticos
    const carregarEventosCriticos = useCallback(async () => {
        if (!user || user.role !== 'admin') return;

        try {
            const response = await auditoriaService.obterEventosCriticos();
            if (response.success) {
                setEventosCriticos(response.data || []);
            }
        } catch (error) {
            console.error('Erro ao carregar eventos críticos:', error);
        }
    }, [user]);

    // Carregar dados iniciais
    useEffect(() => {
        if (user && user.role === 'admin') {
            carregarLogs();
            carregarEventosCriticos();
        }
    }, [user, carregarLogs, carregarEventosCriticos]);

    // Aplicar filtros
    const aplicarFiltros = () => {
        carregarLogs(1, filtros);
    };

    // Limpar filtros
    const limparFiltros = () => {
        const filtrosLimpos = {
            modulo: '',
            evento_tipo: '',
            usuario_id: '',
            data_inicio: '',
            data_fim: '',
            evento_critico: '',
            busca: ''
        };
        setFiltros(filtrosLimpos);
        carregarLogs(1, filtrosLimpos);
    };

    // Mudar página
    const mudarPagina = (novaPagina) => {
        carregarLogs(novaPagina);
    };

    // Atualizar filtro
    const atualizarFiltro = (campo, valor) => {
        setFiltros(prev => ({
            ...prev,
            [campo]: valor
        }));
    };

    // Mostrar detalhes do log
    const mostrarDetalhes = (log) => {
        setLogSelecionado(log);
    };

    // Fechar detalhes
    const fecharDetalhes = () => {
        setLogSelecionado(null);
    };

    // Verificar permissão
    if (!user || user.role !== 'admin') {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Acesso Negado</h2>
                    <p className="text-gray-600">Apenas administradores podem acessar esta página.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container">
            <div className="container">
                <Header />
                <Navigation />
                <div className="logs-header">
                    <div className="logs-title">
                        <h1><ScrollText className="logs-icon" /> Logs do Sistema</h1>
                        <p>Visualize e monitore todas as ações realizadas no sistema</p>
                    </div>

                    <div className="logs-actions">
                        <button
                            onClick={() => setMostrarFiltros(!mostrarFiltros)}
                            className={`btn-filter ${mostrarFiltros ? 'active' : ''}`}
                        >
                            <Filter size={16} />
                            Filtros
                        </button>

                        <button
                            onClick={() => carregarLogs(pagination.page)}
                            className="btn-refresh"
                            disabled={loading}
                        >
                            <RefreshCw size={16} className={loading ? 'spinning' : ''} />
                            Atualizar
                        </button>
                    </div>
                </div>

                {/* Eventos Críticos em Destaque */}
                {eventosCriticos.length > 0 && (
                    <div className="eventos-criticos">
                        <h3><AlertTriangle className="eventos-criticos-icon" /> Eventos Críticos Recentes</h3>
                        <div className="eventos-criticos-lista">
                            {eventosCriticos.slice(0, 3).map((evento) => (
                                <div key={evento.id} className="evento-critico-item">
                                    <div className="evento-info">
                                        <span className="evento-tipo">
                                            {auditoriaService.formatters.formatarTipoEvento(evento.evento_tipo)}
                                        </span>
                                        <span className="evento-data">
                                            {auditoriaService.formatters.formatarData(evento.data_acao)}
                                        </span>
                                    </div>
                                    <span className="evento-descricao">{evento.descricao_evento}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Painel de Filtros */}
                {mostrarFiltros && (
                    <div className="filtros-panel">
                        <div className="filtros-grid">
                            <div className="filtro-item">
                                <label>Módulo</label>
                                <select
                                    value={filtros.modulo}
                                    onChange={(e) => atualizarFiltro('modulo', e.target.value)}
                                >
                                    <option value="">Todos os módulos</option>
                                    <option value="auth">Autenticação</option>
                                    <option value="propostas">Propostas</option>
                                    <option value="controle">Controle</option>
                                    <option value="ugs">UGs</option>
                                    <option value="dashboard">Dashboard</option>
                                    <option value="usuarios">Usuários</option>
                                </select>
                            </div>

                            <div className="filtro-item">
                                <label>Tipo de Evento</label>
                                <select
                                    value={filtros.evento_tipo}
                                    onChange={(e) => atualizarFiltro('evento_tipo', e.target.value)}
                                >
                                    <option value="">Todos os tipos</option>
                                    <option value="USUARIO_LOGIN">Login</option>
                                    <option value="USUARIO_LOGOUT">Logout</option>
                                    <option value="PROPOSTA_CRIADA">Proposta Criada</option>
                                    <option value="PROPOSTA_EDITADA">Proposta Editada</option>
                                    <option value="PROPOSTA_EXCLUIDA">Proposta Excluída</option>
                                    <option value="UG_CRIADA">UG Criada</option>
                                    <option value="UG_EDITADA">UG Editada</option>
                                    <option value="UG_EXCLUIDA">UG Excluída</option>
                                    <option value="CONTROLE_CRIADO">Controle Criado</option>
                                    <option value="CONTROLE_EDITADO">Controle Editado</option>
                                    <option value="CONTROLE_EXCLUIDO">Controle Excluído</option>
                                    <option value="UG_ATRIBUIDA">UG Atribuída</option>
                                    <option value="UG_REMOVIDA">UG Removida</option>
                                    <option value="STATUS_ALTERADO">Status Alterado</option>
                                    <option value="TERMO_GERADO">Termo Gerado</option>
                                    <option value="TERMO_ENVIADO_AUTENTIQUE">Termo Enviado</option>
                                    <option value="TERMO_ASSINADO">Termo Assinado</option>
                                    <option value="TERMO_REJEITADO">Termo Rejeitado</option>
                                    <option value="TERMO_REGENERADO">Termo Regenerado</option>
                                    <option value="TERMO_CANCELADO">Termo Cancelado</option>
                                </select>
                            </div>

                            <div className="filtro-item">
                                <label>Data Início</label>
                                <input
                                    type="date"
                                    value={filtros.data_inicio}
                                    onChange={(e) => atualizarFiltro('data_inicio', e.target.value)}
                                />
                            </div>

                            <div className="filtro-item">
                                <label>Data Fim</label>
                                <input
                                    type="date"
                                    value={filtros.data_fim}
                                    onChange={(e) => atualizarFiltro('data_fim', e.target.value)}
                                />
                            </div>

                            <div className="filtro-item">
                                <label>Crítico</label>
                                <select
                                    value={filtros.evento_critico}
                                    onChange={(e) => atualizarFiltro('evento_critico', e.target.value)}
                                >
                                    <option value="">Todos</option>
                                    <option value="true">Apenas críticos</option>
                                    <option value="false">Apenas normais</option>
                                </select>
                            </div>
                        </div>

                        <div className="filtros-actions">
                            <button onClick={aplicarFiltros} className="btn-apply">
                                Aplicar Filtros
                            </button>
                            <button onClick={limparFiltros} className="btn-clear">
                                Limpar
                            </button>
                        </div>
                    </div>
                )}

                {/* Tabela de Logs */}
                <div className="logs-table-container">
                    {loading ? (
                        <div className="loading-state">
                            <RefreshCw className="spinning" size={24} />
                            <p>Carregando logs...</p>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="empty-state">
                            <Search size={48} />
                            <h3>Nenhum log encontrado</h3>
                            <p>Tente ajustar os filtros ou verificar em outro período.</p>
                        </div>
                    ) : (
                        <>
                            <table className="logs-table">
                                <thead>
                                    <tr>
                                        <th>Data/Hora</th>
                                        <th>Usuário</th>
                                        <th>Módulo</th>
                                        <th>Ação</th>
                                        <th>Descrição</th>
                                        <th>Prioridade</th>
                                        <th>IP</th>
                                        <th>Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {logs.map((log) => (
                                        <tr key={log.id} className={log.evento_critico ? 'log-critico' : ''}>
                                            <td className="log-data">
                                                {auditoriaService.formatters.formatarData(log.data_acao)}
                                            </td>
                                            <td className="log-usuario">
                                                <div className="usuario-info">
                                                    <User size={14} />
                                                    <span>{log.usuario_nome || 'Sistema'}</span>
                                                </div>
                                            </td>
                                            <td className="log-modulo">
                                                <span className="badge badge-modulo">
                                                    {auditoriaService.formatters.formatarModulo(log.modulo)}
                                                </span>
                                            </td>
                                            <td className="log-acao">
                                                <span className={`badge badge-acao ${auditoriaService.formatters.obterCorAcao(log.acao, log.evento_tipo)}`}>
                                                    {auditoriaService.formatters.formatarAcao(log.acao)}
                                                </span>
                                            </td>
                                            <td className="log-descricao">
                                                {log.descricao_evento || auditoriaService.formatters.formatarTipoEvento(log.evento_tipo)}
                                            </td>
                                            <td className="log-prioridade">
                                                <span className={`prioridade ${log.evento_critico ? 'critico' : 'normal'}`}>
                                                    {auditoriaService.formatters.obterPrioridadeVisual(log.evento_critico)}
                                                </span>
                                            </td>
                                            <td className="log-ip">
                                                {log.ip_address || '-'}
                                            </td>
                                            <td className="log-actions">
                                                <button
                                                    onClick={() => mostrarDetalhes(log)}
                                                    className="btn-details"
                                                    title="Ver detalhes"
                                                >
                                                    <Info size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>

                            {/* Paginação */}
                            <div className="pagination">
                                <div className="pagination-info">
                                    Página {pagination.page} de {pagination.total_pages}
                                    ({pagination.total} registros)
                                </div>

                                <div className="pagination-controls">
                                    <button
                                        onClick={() => mudarPagina(pagination.page - 1)}
                                        disabled={pagination.page <= 1}
                                        className="btn-pagination"
                                    >
                                        <ChevronLeft size={16} />
                                        Anterior
                                    </button>

                                    <span className="page-numbers">
                                        {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
                                            const pageNum = Math.max(1, pagination.page - 2) + i;
                                            if (pageNum > pagination.total_pages) return null;

                                            return (
                                                <button
                                                    key={pageNum}
                                                    onClick={() => mudarPagina(pageNum)}
                                                    className={`btn-page ${pageNum === pagination.page ? 'active' : ''}`}
                                                >
                                                    {pageNum}
                                                </button>
                                            );
                                        })}
                                    </span>

                                    <button
                                        onClick={() => mudarPagina(pagination.page + 1)}
                                        disabled={pagination.page >= pagination.total_pages}
                                        className="btn-pagination"
                                    >
                                        Próxima
                                        <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Modal de Detalhes */}
            {logSelecionado && (
                <div className="modal-overlay" onClick={fecharDetalhes}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Detalhes do Log</h3>
                            <button onClick={fecharDetalhes} className="btn-close">
                                ×
                            </button>
                        </div>

                        <div className="modal-body">
                            <div className="log-details">
                                <div className="detail-row">
                                    <span className="detail-label">Data/Hora:</span>
                                    <span className="detail-value">
                                        {auditoriaService.formatters.formatarData(logSelecionado.data_acao)}
                                    </span>
                                </div>

                                <div className="detail-row">
                                    <span className="detail-label">Usuário:</span>
                                    <span className="detail-value">{logSelecionado.usuario_nome || 'Sistema'}</span>
                                </div>

                                <div className="detail-row">
                                    <span className="detail-label">Módulo:</span>
                                    <span className="detail-value">
                                        {auditoriaService.formatters.formatarModulo(logSelecionado.modulo)}
                                    </span>
                                </div>

                                <div className="detail-row">
                                    <span className="detail-label">Ação:</span>
                                    <span className="detail-value">
                                        {auditoriaService.formatters.formatarAcao(logSelecionado.acao)}
                                    </span>
                                </div>

                                <div className="detail-row">
                                    <span className="detail-label">Tipo de Evento:</span>
                                    <span className="detail-value">
                                        {auditoriaService.formatters.formatarTipoEvento(logSelecionado.evento_tipo)}
                                    </span>
                                </div>

                                <div className="detail-row">
                                    <span className="detail-label">Descrição:</span>
                                    <span className="detail-value">{logSelecionado.descricao_evento || '-'}</span>
                                </div>

                                <div className="detail-row">
                                    <span className="detail-label">Entidade:</span>
                                    <span className="detail-value">{logSelecionado.entidade}</span>
                                </div>

                                <div className="detail-row">
                                    <span className="detail-label">ID da Entidade:</span>
                                    <span className="detail-value">{logSelecionado.entidade_id}</span>
                                </div>

                                <div className="detail-row">
                                    <span className="detail-label">IP:</span>
                                    <span className="detail-value">{logSelecionado.ip_address || '-'}</span>
                                </div>

                                <div className="detail-row">
                                    <span className="detail-label">Evento Crítico:</span>
                                    <span className="detail-value">
                                        {logSelecionado.evento_critico ? '🔴 Sim' : '🟢 Não'}
                                    </span>
                                </div>

                                {logSelecionado.dados_contexto && (
                                    <div className="detail-section">
                                        <span className="detail-label">Dados de Contexto:</span>
                                        <div className="dados-contexto">
                                            {auditoriaService.formatters.formatarDadosContexto(logSelecionado.dados_contexto)?.map((item, index) => (
                                                <div key={index} className="contexto-item">
                                                    <span className="contexto-chave">{item.chave}:</span>
                                                    <span className="contexto-valor">{item.valor}</span>
                                                </div>
                                            )) || <span className="detail-value">Nenhum dado adicional</span>}
                                        </div>
                                    </div>
                                )}

                                {logSelecionado.observacoes && (
                                    <div className="detail-row">
                                        <span className="detail-label">Observações:</span>
                                        <span className="detail-value">{logSelecionado.observacoes}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LogsPage;