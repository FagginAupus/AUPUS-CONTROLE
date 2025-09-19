// src/pages/RelatoriosPage.jsx - Com filtros por equipe
import React, { useState, useEffect, useCallback } from 'react';
import Header from '../components/common/Header';
import Navigation from '../components/common/Navigation';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import storageService from '../services/storageService';
import ModalFiltrosExportacao from '../components/ModalFiltrosExportacao';
import exportXmlService from '../services/exportXmlService';

const RelatoriosPage = () => {
  const { user, getMyTeam, getConsultorName } = useAuth();
  const [loading, setLoading] = useState(false);
  const [estatisticas, setEstatisticas] = useState({
    total: 0,
    totalControle: 0,
    totalUGs: 0,
    ultimaProposta: 'N/A'
  });

  const consultoresUnicos = [...new Set([])];

  const { showNotification } = useNotification();

  const carregarEstatisticas = useCallback(async () => {
    try {
      setLoading(true);

      let dadosProspec = [];
      let dadosControle = [];
      let dadosUGs = [];

      if (user?.role === 'admin') {
        // Admin vê todos os dados
        dadosProspec = await storageService.getProspec();
        dadosControle = await storageService.getControle();
        dadosUGs = await storageService.getUGs();
      } else {
        // Outros usuários veem apenas dados da sua equipe
        const teamNames = getMyTeam().map(member => member.name);
        
        const allProspec = await storageService.getProspec();
        const allControle = await storageService.getControle();
        
        dadosProspec = allProspec.filter(item => 
          teamNames.includes(item.consultor)
        );
        
        dadosControle = allControle.filter(item => 
          teamNames.includes(item.consultor)
        );

        // UGs apenas para admin
        dadosUGs = [];
      }

      // Encontrar última proposta
      let ultimaProposta = 'N/A';
      if (dadosProspec.length > 0) {
        const propostas = dadosProspec
          .filter(p => p.data)
          .sort((a, b) => new Date(b.data) - new Date(a.data));
        
        if (propostas.length > 0) {
          ultimaProposta = new Date(propostas[0].data).toLocaleDateString('pt-BR');
        }
      }

      setEstatisticas({
        total: dadosProspec.length,
        totalControle: dadosControle.length,
        totalUGs: dadosUGs.length,
        ultimaProposta
      });

    } catch (error) {
      console.error('❌ Erro ao carregar estatísticas:', error);
      showNotification('Erro ao carregar estatísticas', 'error');
    } finally {
      setLoading(false);
    }
  }, [user, getMyTeam, showNotification]);

  const [modalExportacao, setModalExportacao] = useState({ isOpen: false, tipo: '' });

  const exportarProspec = () => {
    setModalExportacao({ isOpen: true, tipo: 'prospec' });
  };

  const exportarControle = () => {
    setModalExportacao({ isOpen: true, tipo: 'controle' });
  };
  useEffect(() => {
    carregarEstatisticas();
  }, [carregarEstatisticas]);

  const executarExportacao = async (filtros) => {
    try {
      setLoading(true);
      const { tipo } = modalExportacao;
      
      let todosOsDados;
      if (tipo === 'prospec') {
        todosOsDados = await storageService.getProspec();
        const resultado = await exportXmlService.exportarProspecParaXml(todosOsDados, filtros);
        showNotification(`Prospecção exportada! ${resultado.totalRegistros} registros`, 'success');
      } else if (tipo === 'controle') {
        todosOsDados = await storageService.getControle();
        const resultado = await exportXmlService.exportarControleParaXml(todosOsDados, filtros);
        showNotification(`Controle exportado! ${resultado.totalRegistros} registros`, 'success');
      }
    } catch (error) {
      showNotification(`Erro: ${error.message}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const exportarUGs = async () => {
    if (user?.role !== 'admin') {
      showNotification('Apenas administradores podem exportar UGs', 'warning');
      return;
    }

    try {
      setLoading(true);
      showNotification('Preparando exportação...', 'info');
      
      await storageService.exportarParaCSV('ugs');
      showNotification('Relatório de UGs exportado com sucesso!', 'success');
    } catch (error) {
      console.error('❌ Erro ao exportar UGs:', error);
      showNotification('Erro ao exportar: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const carregarDados = async () => {
    try {
      setLoading(true);
      showNotification('Atualizando dados...', 'info');
      await carregarEstatisticas();
      showNotification('Dados atualizados com sucesso!', 'success');
    } catch (error) {
      console.error('❌ Erro ao atualizar dados:', error);
      showNotification('Erro ao atualizar dados', 'error');
    } finally {
      setLoading(false);
    }
  };

  const limparTodosDados = async () => {
    if (user?.role !== 'admin') {
      showNotification('Apenas administradores podem limpar dados', 'warning');
      return;
    }

    const confirmacao = window.confirm(
      '⚠️ ATENÇÃO: Esta ação irá remover TODOS os dados do sistema!\n\n' +
      'Isso inclui:\n' +
      '• Todas as propostas\n' +
      '• Todos os dados de controle\n' +
      '• Todas as UGs cadastradas\n' +
      '• Todos os usuários (exceto admin)\n\n' +
      'Esta ação NÃO PODE ser desfeita!\n\n' +
      'Deseja realmente continuar?'
    );

    if (!confirmacao) return;

    const confirmacaoFinal = window.confirm(
      'Última confirmação: Tem CERTEZA ABSOLUTA que deseja limpar todos os dados?'
    );

    if (!confirmacaoFinal) return;

    try {
      setLoading(true);
      showNotification('Limpando todos os dados...', 'info');

      // Limpar todos os dados
      localStorage.removeItem('aupus_prospec');
      localStorage.removeItem('aupus_controle');
      localStorage.removeItem('aupus_ugs');
      localStorage.removeItem('aupus_users');
      localStorage.removeItem('aupus_calibragem_global');

      await carregarEstatisticas();
      showNotification('Todos os dados foram removidos com sucesso!', 'success');
    } catch (error) {
      console.error('❌ Erro ao limpar dados:', error);
      showNotification('Erro ao limpar dados: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = user?.role === 'admin';

  return (
    <div className="page-container">
      <div className="container">
        <Header 
          title="Exportação e Análise de Dados" 
        />
        <Navigation />

        {/* Estatísticas Resumidas */}
        <section className="quick-stats">
          <div className="stat-card">
            <div className="stat-icon">📋</div>
            <div className="stat-content">
              <span className="stat-label">Propostas</span>
              <span className="stat-value">{estatisticas.total}</span>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">⚙️</div>
            <div className="stat-content">
              <span className="stat-label">No Controle</span>
              <span className="stat-value">{estatisticas.totalControle}</span>
            </div>
          </div>

          {isAdmin && (
            <div className="stat-card">
              <div className="stat-icon">🏭</div>
              <div className="stat-content">
                <span className="stat-label">UGs</span>
                <span className="stat-value">{estatisticas.totalUGs}</span>
              </div>
            </div>
          )}

          <div className="stat-card">
            <div className="stat-icon">📅</div>
            <div className="stat-content">
              <span className="stat-label">Última Proposta</span>
              <span className="stat-value" style={{ fontSize: '1rem' }}>
                {estatisticas.ultimaProposta}
              </span>
            </div>
          </div>
        </section>

        {loading && (
          <div className="loading-section">
            <div className="loading-spinner"></div>
            <p>Processando...</p>
          </div>
        )}

        {!loading && (
          <>
            {/* Exportar Relatórios */}
            <section className="filters-section">
              <div className="filters-container">
                <h2>📤 Exportar Relatórios</h2>
                <div className="export-grid">
                  <div className="export-card">
                    <h3>Relatório de Prospecção</h3>
                    <p>
                      {isAdmin 
                        ? 'Lista completa de propostas com status, consultores e dados técnicos'
                        : 'Propostas da sua equipe com status e dados técnicos'
                      }
                    </p>
                    <button 
                      onClick={exportarProspec} 
                      className="btn btn-primary"
                      disabled={estatisticas.total === 0}
                    >
                      📋 Exportar Prospecção
                    </button>
                  </div>
                  
                  <div className="export-card">
                    <h3>Relatório de Controle</h3>
                    <p>
                      {isAdmin 
                        ? 'Propostas fechadas com UGs definidas e status de calibragem'
                        : 'Propostas fechadas da sua equipe com UGs definidas'
                      }
                    </p>
                    <button 
                      onClick={exportarControle} 
                      className="btn btn-primary"
                      disabled={estatisticas.totalControle === 0}
                    >
                      ⚙️ Exportar Controle
                    </button>
                  </div>
                  
                  {isAdmin && (
                    <div className="export-card">
                      <h3>Relatório de UGs</h3>
                      <p>Dados técnicos das Unidades Geradoras e capacidades</p>
                      <button 
                        onClick={exportarUGs} 
                        className="btn btn-primary"
                        disabled={estatisticas.totalUGs === 0}
                      >
                        🏭 Exportar UGs
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Ações do Sistema - apenas para admin */}
            {isAdmin && (
              <section className="filters-section">
                <div className="filters-container">
                  <h2>🔧 Ações do Sistema</h2>
                  <div className="actions-container">
                    <button onClick={carregarDados} className="btn btn-secondary">
                      🔄 Atualizar Dados
                    </button>
                    <button onClick={limparTodosDados} className="btn btn-danger">
                      🗑️ Limpar Todos os Dados
                    </button>
                  </div>
                  
                  <div className="system-info">
                    <h4>ℹ️ Informações do Sistema</h4>
                    <div className="info-grid">
                      <div className="info-item">
                        <strong>Última Proposta:</strong> {estatisticas.ultimaProposta}
                      </div>
                      <div className="info-item">
                        <strong>Total de Registros:</strong> {estatisticas.total + estatisticas.totalControle + estatisticas.totalUGs}
                      </div>
                      <div className="info-item">
                        <strong>Storage:</strong> localStorage (local no navegador)
                      </div>
                      <div className="info-item">
                        <strong>Status:</strong> ✅ Sistema Operacional
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {/* Informações da Equipe para não-admins */}
            {!isAdmin && (
              <section className="filters-section">
                <div className="filters-container">
                  <h2>👥 Informações da Equipe</h2>
                  <div className="team-info">
                    <div className="info-grid">
                      <div className="info-item">
                        <strong>Seu Perfil:</strong> {user?.name} ({user?.role})
                      </div>
                      <div className="info-item">
                        <strong>Membros da Equipe:</strong> {getMyTeam().length}
                      </div>
                      <div className="info-item">
                        <strong>Propostas da Equipe:</strong> {estatisticas.total}
                      </div>
                      <div className="info-item">
                        <strong>No Controle:</strong> {estatisticas.totalControle}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}
          </>
        )}

        <ModalFiltrosExportacao
          isOpen={modalExportacao.isOpen}
          onClose={() => setModalExportacao({ isOpen: false, tipo: '' })}
          onExportar={executarExportacao}
          tipo={modalExportacao.tipo}
          consultores={consultoresUnicos}
        />
        
      </div>
    </div>
  );
};

export default RelatoriosPage;