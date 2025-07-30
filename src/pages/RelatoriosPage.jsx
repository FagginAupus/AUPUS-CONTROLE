// src/pages/RelatoriosPage.jsx - COM ESTILIZAÇÃO CORRETA
import React, { useState, useEffect } from 'react';
import Header from '../components/common/Header';
import Navigation from '../components/common/Navigation';
import { useNotification } from '../context/NotificationContext';
import storageService from '../services/storageService';

const RelatoriosPage = () => {
  const [estatisticas, setEstatisticas] = useState({
    total: 0,
    aguardando: 0,
    fechadas: 0,
    ultimaProposta: '-',
    totalControle: 0,
    totalUGs: 0
  });
  const [dados, setDados] = useState({
    prospec: [],
    controle: [],
    ugs: []
  });
  const [loading, setLoading] = useState(true);

  const { showNotification } = useNotification();

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      
      // Carregar todos os dados
      const [prospec, controle, ugs, stats] = await Promise.all([
        storageService.getProspec(),
        storageService.getControle(),
        storageService.getUGs(),
        storageService.getEstatisticas()
      ]);
      
      setDados({ prospec, controle, ugs });
      setEstatisticas(stats);
      
      console.log('📊 Dados para relatórios carregados');
      
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
      showNotification('Erro ao carregar dados: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const exportarProspec = async () => {
    try {
      await storageService.exportarParaCSV('prospec');
      showNotification('Relatório de Prospecção exportado!', 'success');
    } catch (error) {
      showNotification('Erro ao exportar: ' + error.message, 'error');
    }
  };

  const exportarControle = async () => {
    try {
      await storageService.exportarParaCSV('controle');
      showNotification('Relatório de Controle exportado!', 'success');
    } catch (error) {
      showNotification('Erro ao exportar: ' + error.message, 'error');
    }
  };

  const exportarUGs = async () => {
    try {
      await storageService.exportarParaCSV('ugs');
      showNotification('Relatório de UGs exportado!', 'success');
    } catch (error) {
      showNotification('Erro ao exportar: ' + error.message, 'error');
    }
  };

  const limparTodosDados = async () => {
    if (!window.confirm('⚠️ ATENÇÃO: Isso irá remover TODOS os dados salvos. Tem certeza?')) {
      return;
    }

    if (!window.confirm('🚨 ÚLTIMA CHANCE: Esta ação não pode ser desfeita. Confirma a exclusão?')) {
      return;
    }

    try {
      await storageService.limparTodosDados();
      await carregarDados();
      showNotification('Todos os dados foram removidos!', 'success');
    } catch (error) {
      showNotification('Erro ao limpar dados: ' + error.message, 'error');
    }
  };

  // Calcular estatísticas adicionais
  const consultoresUnicos = [...new Set(dados.prospec.map(p => p.consultor).filter(Boolean))];
  const potenciaTotal = dados.ugs.reduce((acc, ug) => acc + (ug.potenciaCA || 0), 0);
  const capacidadeTotal = dados.ugs.reduce((acc, ug) => acc + (ug.capacidade || 0), 0);

  return (
    <div className="page-container">
      <div className="container">
        <Header 
          title="RELATÓRIOS" 
          subtitle="Análises e Exportações" 
          icon="📊" 
        />
        
        <Navigation />

        {loading ? (
          <div className="loading-message">Carregando dados...</div>
        ) : (
          <>
            {/* Resumo Executivo */}
            <section className="quick-stats">
              <div className="stat-card">
                <span className="stat-label">Total de Propostas</span>
                <span className="stat-value">{estatisticas.total}</span>
                <small>{consultoresUnicos.length} consultores ativos</small>
              </div>
              <div className="stat-card">
                <span className="stat-label">Taxa de Fechamento</span>
                <span className="stat-value">
                  {estatisticas.total > 0 
                    ? Math.round((estatisticas.fechadas / estatisticas.total) * 100) 
                    : 0}%
                </span>
                <small>{estatisticas.fechadas} de {estatisticas.total}</small>
              </div>
              <div className="stat-card">
                <span className="stat-label">Potência Total UGs</span>
                <span className="stat-value">{potenciaTotal.toLocaleString()} kW</span>
                <small>{dados.ugs.length} unidades</small>
              </div>
              <div className="stat-card">
                <span className="stat-label">Capacidade Total</span>
                <span className="stat-value">{Math.round(capacidadeTotal / 1000).toLocaleString()} MWh</span>
                <small>por mês</small>
              </div>
            </section>

            {/* Análise por Consultor */}
            <section className="table-section">
              <div className="table-header">
                <h2>👥 Análise por Consultor</h2>
                <span className="table-count">{consultoresUnicos.length} consultores</span>
              </div>
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th>Consultor</th>
                      <th>Total Propostas</th>
                      <th>Fechadas</th>
                      <th>Taxa (%)</th>
                      <th>Média kWh</th>
                    </tr>
                  </thead>
                  <tbody>
                    {consultoresUnicos.map(consultor => {
                      const propostas = dados.prospec.filter(p => p.consultor === consultor);
                      const fechadas = propostas.filter(p => p.status === 'Fechado');
                      const taxa = propostas.length > 0 ? Math.round((fechadas.length / propostas.length) * 100) : 0;
                      const mediaTotal = propostas.reduce((acc, p) => acc + (p.media || 0), 0);
                      const mediaConsultor = propostas.length > 0 ? Math.round(mediaTotal / propostas.length) : 0;
                      
                      return (
                        <tr key={consultor}>
                          <td><strong>{consultor}</strong></td>
                          <td>{propostas.length}</td>
                          <td>{fechadas.length}</td>
                          <td>
                            <span className={`status ${taxa >= 50 ? 'fechado' : 'aguardando'}`}>
                              {taxa}%
                            </span>
                          </td>
                          <td>{mediaConsultor.toLocaleString()} kWh</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Status das UGs */}
            <section className="filters-section">
              <div className="filters-container">
                <h2>🏭 Status das Unidades Geradoras</h2>
                <div className="ugs-summary">
                  <div className="ug-stat">
                    <span className="ug-number">{dados.ugs.length}</span>
                    <span className="ug-label">Total de UGs</span>
                  </div>
                  <div className="ug-stat">
                    <span className="ug-number">{dados.ugs.filter(ug => ug.calibrado).length}</span>
                    <span className="ug-label">Calibradas</span>
                  </div>
                  <div className="ug-stat">
                    <span className="ug-number">{dados.ugs.filter(ug => !ug.calibrado).length}</span>
                    <span className="ug-label">Pendentes</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Exportações */}
            <section className="filters-section">
              <div className="filters-container">
                <h2>📤 Exportar Relatórios</h2>
                <div className="export-grid">
                  <div className="export-card">
                    <h3>Relatório de Prospecção</h3>
                    <p>Lista completa de propostas com status, consultores e dados técnicos</p>
                    <button onClick={exportarProspec} className="btn-primary">
                      📋 Exportar Prospecção
                    </button>
                  </div>
                  
                  <div className="export-card">
                    <h3>Relatório de Controle</h3>
                    <p>Propostas fechadas com UGs definidas e status de calibragem</p>
                    <button onClick={exportarControle} className="btn-primary">
                      ⚙️ Exportar Controle
                    </button>
                  </div>
                  
                  <div className="export-card">
                    <h3>Relatório de UGs</h3>
                    <p>Dados técnicos das Unidades Geradoras e capacidades</p>
                    <button onClick={exportarUGs} className="btn-primary">
                      🏭 Exportar UGs
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Ações do Sistema */}
            <section className="filters-section">
              <div className="filters-container">
                <h2>🔧 Ações do Sistema</h2>
                <div className="actions-container">
                  <button onClick={carregarDados} className="btn-secondary">
                    🔄 Atualizar Dados
                  </button>
                  <button onClick={limparTodosDados} className="btn-danger">
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
          </>
        )}
      </div>
    </div>
  );
};

export default RelatoriosPage;