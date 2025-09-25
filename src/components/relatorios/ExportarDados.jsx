// src/components/relatorios/ExportarDados.jsx
import React, { useState } from 'react';
import relatoriosService from '../../services/relatoriosService';
import {
  BarChart3,
  Trophy,
  FileText,
  Settings,
  DollarSign,
  Download,
  FileSpreadsheet,
  File,
  FileType
} from 'lucide-react';

const ExportarDados = ({ filters, loading, setLoading, onNotification }) => {
  const [exportando, setExportando] = useState(false);

  const handleExportar = async (tipo, relatorio) => {
    try {
      setExportando(true);
      onNotification(`Preparando exportação em ${tipo.toUpperCase()}...`, 'info');

      // Buscar dados do relatório
      let dados = [];
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');

      switch (relatorio) {
        case 'dashboard':
          const dashData = await relatoriosService.getDashboardExecutivo(filters);
          dados = relatoriosService.formatarDadosParaExportacao(
            dashData.data?.evolucao_mensal || [], 'dashboard'
          );
          break;

        case 'ranking':
          const rankData = await relatoriosService.getRankingConsultores(filters);
          dados = relatoriosService.formatarDadosParaExportacao(
            rankData.data?.ranking || [], 'ranking'
          );
          break;

        case 'propostas':
          const propData = await relatoriosService.getAnalisePropostas(filters);
          dados = relatoriosService.formatarDadosParaExportacao(
            propData.data?.status_distribuicao || [], 'propostas'
          );
          break;


        default:
          throw new Error('Tipo de relatório não suportado');
      }

      if (!dados.length) {
        onNotification('Nenhum dado encontrado para exportar no período selecionado', 'warning');
        return;
      }

      // Executar exportação
      const filename = `${relatorio}_${timestamp}`;

      if (tipo === 'csv') {
        relatoriosService.exportarCSV(dados, `${filename}.csv`);
        onNotification(`Arquivo CSV exportado com sucesso! (${dados.length} registros)`, 'success');
      } else if (tipo === 'excel') {
        relatoriosService.exportarExcel(dados, `${filename}.xlsx`);
        onNotification(`Arquivo Excel exportado com sucesso! (${dados.length} registros)`, 'success');
      } else if (tipo === 'pdf') {
        const result = await relatoriosService.gerarPDF(dados, relatorio);
        onNotification(result.message, result.success ? 'info' : 'error');
      }

    } catch (error) {
      console.error('Erro na exportação:', error);
      onNotification(`Erro ao exportar: ${error.message}`, 'error');
    } finally {
      setExportando(false);
    }
  };

  const relatorios = [
    { id: 'dashboard', nome: 'Dashboard Executivo', icone: BarChart3 },
    { id: 'ranking', nome: 'Ranking de Consultores', icone: Trophy },
    { id: 'propostas', nome: 'Análise de Propostas', icone: FileText },
    { id: 'controle', nome: 'Controle Clube', icone: Settings },
    { id: 'financeiro', nome: 'Relatórios Financeiros', icone: DollarSign }
  ];

  const formatos = [
    { tipo: 'excel', nome: 'Excel (.xlsx)', icone: FileSpreadsheet, cor: '#217346' },
    { tipo: 'pdf', nome: 'PDF (.pdf)', icone: File, cor: '#dc3545' },
    { tipo: 'csv', nome: 'CSV (.csv)', icone: FileType, cor: '#6c757d' }
  ];

  return (
    <div className="exportar-dados">
      <h2><Download className="inline-icon" /> Exportar Dados</h2>

      <div className="export-info">
        <p>Selecione o relatório e formato desejado para exportação:</p>
        <div className="filtros-aplicados">
          <strong>Filtros aplicados:</strong>
          <span>Período: {filters.dataInicio} até {filters.dataFim}</span>
          {filters.consultor && <span>Consultor: {filters.consultor}</span>}
          {filters.status && <span>Status: {filters.status}</span>}
        </div>
      </div>

      <div className="export-grid">
        {relatorios.map(relatorio => (
          <div key={relatorio.id} className="export-relatorio">
            <h3><relatorio.icone size={20} className="inline-icon" /> {relatorio.nome}</h3>
            <div className="format-buttons">
              {formatos.map(formato => (
                <button
                  key={formato.tipo}
                  className="btn-export"
                  style={{ backgroundColor: formato.cor }}
                  onClick={() => handleExportar(formato.tipo, relatorio.id)}
                  disabled={loading || exportando}
                >
                  <formato.icone size={16} className="inline-icon" /> {formato.nome}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {exportando && (
        <div className="export-loading">
          <div className="loading-spinner"></div>
          <p>Preparando exportação...</p>
        </div>
      )}
    </div>
  );
};

export default ExportarDados;