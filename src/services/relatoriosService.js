// src/services/relatoriosService.js
import apiService from './apiService';

class RelatoriosService {
  /**
   * Carregar dados do dashboard executivo
   */
  async getDashboardExecutivo(filters = {}) {
    const response = await apiService.get('/relatorios/dashboard-executivo', { params: filters });
    return response;
  }

  /**
   * Carregar ranking de consultores
   */
  async getRankingConsultores(filters = {}) {
    const response = await apiService.get('/relatorios/ranking-consultores', { params: filters });
    return response;
  }

  /**
   * Carregar análise de propostas
   */
  async getAnalisePropostas(filters = {}) {
    const response = await apiService.get('/relatorios/analise-propostas', { params: filters });
    return response;
  }

  /**
   * Carregar dados do controle clube
   */
  async getControleClube(filters = {}) {
    const response = await apiService.get('/relatorios/controle-clube', { params: filters });
    return response;
  }

  /**
   * Carregar análise geográfica
   */
  async getAnaliseGeografica(filters = {}) {
    const response = await apiService.get('/relatorios/geografico', { params: filters });
    return response;
  }

  /**
   * Carregar relatórios financeiros
   */
  async getRelatoriosFinanceiros(filters = {}) {
    const response = await apiService.get('/relatorios/financeiro', { params: filters });
    return response;
  }

  /**
   * Carregar dados de produtividade
   */
  async getProdutividade(filters = {}) {
    const response = await apiService.get('/relatorios/produtividade', { params: filters });
    return response;
  }

  /**
   * Exportar dados
   */
  async exportarDados(tipo, relatorio, filtros = {}) {
    const response = await apiService.post('/relatorios/exportar', {
      tipo,
      relatorio,
      filtros
    });
    return response;
  }

  /**
   * Exportar dados em CSV (implementação local)
   */
  exportarCSV(dados, filename = 'relatorio.csv', colunas = []) {
    if (!dados || dados.length === 0) {
      throw new Error('Nenhum dado para exportar');
    }

    // Se não foram especificadas colunas, usar todas as chaves do primeiro objeto
    const headers = colunas.length > 0 ? colunas : Object.keys(dados[0]);

    // Criar CSV
    const csvContent = [
      // Cabeçalho
      headers.join(','),
      // Dados
      ...dados.map(row =>
        headers.map(header => {
          let value = row[header];

          // Tratar valores null/undefined
          if (value === null || value === undefined) {
            value = '';
          }

          // Tratar strings que contêm vírgulas ou quebras de linha
          if (typeof value === 'string' && (value.includes(',') || value.includes('\n') || value.includes('"'))) {
            value = `"${value.replace(/"/g, '""')}"`;
          }

          return value;
        }).join(',')
      )
    ].join('\n');

    // Fazer download
    this.downloadFile(csvContent, filename, 'text/csv;charset=utf-8;');
  }

  /**
   * Exportar dados em Excel (implementação simples com CSV)
   */
  exportarExcel(dados, filename = 'relatorio.xlsx', colunas = []) {
    // Por enquanto, vamos usar CSV com extensão .xlsx
    // Uma implementação mais robusta usaria uma lib como xlsx
    const csvFilename = filename.replace('.xlsx', '.csv');
    this.exportarCSV(dados, csvFilename, colunas);
  }

  /**
   * Gerar relatório em PDF (mock)
   */
  async gerarPDF(dados, template = 'default') {
    // Esta seria uma implementação mais complexa
    // Por enquanto, retorna apenas uma mensagem
    return {
      success: true,
      message: 'Funcionalidade de PDF será implementada em versão futura',
      url: null
    };
  }

  /**
   * Função utilitária para fazer download de arquivo
   */
  downloadFile(content, filename, mimeType = 'text/plain') {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Limpar URL do objeto
    window.URL.revokeObjectURL(url);
  }

  /**
   * Formatar dados para exportação
   */
  formatarDadosParaExportacao(dados, tipo = 'dashboard') {
    if (!dados || dados.length === 0) return [];

    switch (tipo) {
      case 'dashboard':
        return dados.map(item => ({
          'Período': item.periodo,
          'Total de Propostas': item.total,
          'Propostas Fechadas': item.fechadas,
          'Taxa de Conversão (%)': item.taxa_conversao
        }));

      case 'ranking':
        return dados.map((item, index) => ({
          'Posição': index + 1,
          'Consultor': item.consultor,
          'Total de Propostas': item.total_propostas,
          'Propostas Fechadas': item.fechadas,
          'Taxa de Conversão (%)': item.taxa_conversao?.toFixed(1) || '0.0',
          'Ticket Médio (R$)': item.ticket_medio?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00',
          'Volume Total (R$)': item.valor_total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'
        }));

      case 'propostas':
        return dados.map(item => ({
          'Status': item.status_proposta,
          'Quantidade': item.quantidade,
          'Valor Médio (R$)': item.valor_medio?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00',
          'Consumo Médio (kWh)': item.consumo_medio?.toFixed(0) || '0'
        }));

      case 'geografico':
        return dados.map(item => ({
          'Localização': item.distribuidora || item.estado,
          'Total de Propostas': item.total_propostas,
          'Propostas Fechadas': item.fechadas,
          'Taxa de Conversão (%)': item.taxa_conversao?.toFixed(1) || '0.0'
        }));

      default:
        return dados;
    }
  }

  /**
   * Validar permissões de acesso aos relatórios
   */
  validarAcessoRelatorios(user) {
    if (!user) return false;
    return ['admin', 'analista'].includes(user.role);
  }

  /**
   * Obter configurações padrão de filtros
   */
  getDefaultFilters() {
    const hoje = new Date();
    const trintaDiasAtras = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000);

    return {
      dataInicio: trintaDiasAtras.toISOString().split('T')[0],
      dataFim: hoje.toISOString().split('T')[0],
      consultor: '',
      status: ''
    };
  }
}

export default new RelatoriosService();