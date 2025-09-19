// src/services/exportExcelService.js

/* eslint-disable no-undef */

/**
 * 📊 SERVIÇO DE EXPORTAÇÃO EXCEL (XLSX)
 * Converte dados para Excel e realiza download
 * Substitui o antigo sistema de exportação XML
 */
class ExportExcelService {
  
  constructor() {
    this.xlsxLoaded = false;
    this.xlsxPromise = null;
    this.ensureXLSXLoaded();
  }

  /**
   * 🔄 GARANTIR QUE XLSX ESTEJA CARREGADO
   */
  async ensureXLSXLoaded() {
    if (this.xlsxLoaded && typeof window.XLSX !== 'undefined') {
      return Promise.resolve();
    }

    if (this.xlsxPromise) {
      return this.xlsxPromise;
    }

    this.xlsxPromise = this.loadXLSXLibrary();
    return this.xlsxPromise;
  }

  /**
   * 🔄 CARREGAR BIBLIOTECA XLSX DINAMICAMENTE
   */
  loadXLSXLibrary() {
    return new Promise((resolve, reject) => {
      // Verificar se já está carregada globalmente
      if (typeof window.XLSX !== 'undefined') {
        this.xlsxLoaded = true;
        resolve();
        return;
      }

      // Verificar se o script já existe
      const existingScript = document.querySelector('script[src*="xlsx"]');
      if (existingScript) {
        existingScript.onload = () => {
          this.xlsxLoaded = true;
          resolve();
        };
        return;
      }

      console.log('📦 Carregando biblioteca XLSX...');
      
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      script.async = true;
      
      script.onload = () => {
        console.log('✅ XLSX library carregada com sucesso');
        this.xlsxLoaded = true;
        resolve();
      };
      
      script.onerror = (error) => {
        console.error('❌ Falha ao carregar XLSX library:', error);
        reject(new Error('Falha ao carregar biblioteca Excel'));
      };
      
      document.head.appendChild(script);
    });
  }

  /**
   * 📋 EXPORTAR PROSPECÇÃO PARA EXCEL
   * Cada linha representa uma UC individual com dados da proposta
   */
  async exportarProspecParaExcel(dados, filtros = {}) {
    try {
      console.log('📊 Iniciando exportação de prospecção:', {
        totalRegistros: dados.length,
        filtros: filtros
      });

      // Garantir que XLSX está carregado
      await this.ensureXLSXLoaded();

      // Verificar disponibilidade da biblioteca
      if (typeof window.XLSX === 'undefined') {
        throw new Error('Biblioteca XLSX não pôde ser carregada');
      }

      // Aplicar filtros
      const dadosFiltrados = this.aplicarFiltrosProspec(dados, filtros);
      console.log(`📋 Total após filtros: ${dadosFiltrados.length} registros`);

      // Estruturar dados para Excel
      const registrosParaExcel = dadosFiltrados.map((item, index) => {
        const valorUC = this.calcularValorUC(item);
        
        return {
          'Nº': index + 1,
          'ID Proposta': item.propostaId || item.id || '',
          'Nº Proposta': item.numeroProposta || '',
          'Data Proposta': this.formatarDataParaExcel(item.data || item.dataProposta),
          'Cliente': item.nomeCliente || '',
          'Consultor': item.consultor || '',
          'Status': item.status || 'Aguardando',
          'Nº UC': item.numeroUC || item.numero_unidade || '',
          'Apelido UC': item.apelido || '',
          'Consumo Médio (kWh)': this.formatarNumero(item.consumoMedio || 0),
          'Valor UC (R$)': this.formatarMoeda(valorUC),
          'Desconto Tarifa (%)': this.formatarPercentual(item.descontoTarifa || 0),
          'Desconto Bandeira (%)': this.formatarPercentual(item.descontoBandeira || 0),
          'Recorrência': item.recorrencia || '',
          'Observações': this.limparTexto(item.observacoes || ''),
          'Benefícios': this.processarBeneficios(item.beneficios)
        };
      });

      // Criar workbook
      const workbook = window.XLSX.utils.book_new();
      
      // Criar worksheet principal
      const worksheet = window.XLSX.utils.json_to_sheet(registrosParaExcel);
      
      // Configurar largura das colunas
      worksheet['!cols'] = [
        { width: 5 },   // Nº
        { width: 12 },  // ID Proposta
        { width: 15 },  // Nº Proposta
        { width: 12 },  // Data
        { width: 25 },  // Cliente
        { width: 20 },  // Consultor
        { width: 12 },  // Status
        { width: 15 },  // Nº UC
        { width: 20 },  // Apelido UC
        { width: 15 },  // Consumo
        { width: 15 },  // Valor UC
        { width: 15 },  // Desc. Tarifa
        { width: 15 },  // Desc. Bandeira
        { width: 12 },  // Recorrência
        { width: 30 },  // Observações
        { width: 25 }   // Benefícios
      ];

            
      // Adicionar worksheet ao workbook
      window.XLSX.utils.book_append_sheet(workbook, worksheet, 'Prospecção por UC');
      
      // Criar aba de metadados
      this.adicionarAbaMetadados(workbook, 'prospec', dadosFiltrados.length, filtros);
      
      // Gerar e baixar arquivo
      const nomeArquivo = `prospecacao_por_uc_${this.getTimestamp()}.xlsx`;
      window.XLSX.writeFile(workbook, nomeArquivo);
      
      return {
        success: true,
        totalRegistros: registrosParaExcel.length,
        arquivo: nomeArquivo
      };

    } catch (error) {
      console.error('❌ Erro na exportação de prospecção:', error);
      throw new Error(`Erro ao exportar prospecção: ${error.message}`);
    }
  }

  /**
   * ⚙️ EXPORTAR CONTROLE PARA EXCEL
   * Dados específicos da tabela controle_clube com relacionamentos
   */
  async exportarControleParaExcel(dados, filtros = {}) {
    try {
      console.log('⚙️ Iniciando exportação de controle:', {
        totalRegistros: dados.length,
        filtros: filtros
      });

      // Garantir que XLSX está carregado
      await this.ensureXLSXLoaded();

      // Verificar disponibilidade da biblioteca
      if (typeof window.XLSX === 'undefined') {
        throw new Error('Biblioteca XLSX não pôde ser carregada');
      }

      // Aplicar filtros
      const dadosFiltrados = this.aplicarFiltrosControle(dados, filtros);
      console.log(`📋 Total após filtros: ${dadosFiltrados.length} registros`);

      // Estruturar dados para Excel
      const registrosParaExcel = dadosFiltrados.map((item, index) => {
        const repasseCalculado = this.calcularRepasse(item);
        
        return {
          'Nº': index + 1,
          'ID Controle': item.id || item.controle_id || '',
          'Consultor': item.consultorNome || item.consultor || '',
          'Nº UC': item.numeroUC || item.numero_uc || '',
          'Apelido UC': item.apelido || item.apelido_uc || '',
          'Consumo Médio (kWh)': this.formatarNumero(item.consumoMedio || item.consumo_medio || 0),
          'Economia (%)': this.formatarPercentual(item.economia || item.economia_percentual || 0),
          'Desconto Bandeira (%)': this.formatarPercentual(item.bandeira || item.desconto_bandeira || 0),
          'Contribuição': item.contribuicao || 'N/A',
          'Comissão (%)': this.formatarPercentual(item.comissaoPercentual || item.comissao_percentual || 0),
          'Repasse (R$)': this.formatarMoeda(repasseCalculado),
          'Data Entrada': this.formatarDataParaExcel(item.dataEntradaControle || item.data_entrada_controle),
          'Status Troca': item.statusTroca || item.status_troca || 'Pendente',
          'Data Titularidade': item.statusTroca === 'Associado' || item.status_troca === 'Associado' 
            ? this.formatarDataParaExcel(item.dataTitularidade || item.data_titularidade)
            : '',
          'Observações': this.limparTexto(item.observacoes || '')
        };
      });

      // Criar workbook
      const workbook = window.XLSX.utils.book_new();
      
      // Criar worksheet principal
      const worksheet = window.XLSX.utils.json_to_sheet(registrosParaExcel);
      
      // Configurar largura das colunas
      worksheet['!cols'] = [
        { width: 5 },   // Nº
        { width: 12 },  // ID Controle
        { width: 20 },  // Consultor
        { width: 15 },  // Nº UC
        { width: 20 },  // Apelido UC
        { width: 15 },  // Consumo
        { width: 12 },  // Economia
        { width: 15 },  // Desc. Bandeira
        { width: 15 },  // Contribuição
        { width: 12 },  // Comissão
        { width: 15 },  // Repasse
        { width: 12 },  // Data Entrada
        { width: 15 },  // Status Troca
        { width: 15 },  // Data Titularidade
        { width: 30 }   // Observações
      ];

            
      // Adicionar worksheet ao workbook
      window.XLSX.utils.book_append_sheet(workbook, worksheet, 'Controle Clube');
      
      // Criar aba de metadados
      this.adicionarAbaMetadados(workbook, 'controle', dadosFiltrados.length, filtros);
      
      // Gerar e baixar arquivo
      const nomeArquivo = `controle_clube_${this.getTimestamp()}.xlsx`;
      window.XLSX.writeFile(workbook, nomeArquivo);
      
      return {
        success: true,
        totalRegistros: registrosParaExcel.length,
        arquivo: nomeArquivo
      };

    } catch (error) {
      console.error('❌ Erro na exportação de controle:', error);
      throw new Error(`Erro ao exportar controle: ${error.message}`);
    }
  }

  /**
   * 📊 ADICIONAR ABA DE METADADOS
   */
  adicionarAbaMetadados(workbook, tipo, totalRegistros, filtros) {
    const metadados = [
      ['Relatório', tipo === 'prospec' ? 'Prospecção por UC' : 'Controle Clube'],
      ['Gerado em', new Date().toLocaleString('pt-BR')],
      ['Total de Registros', totalRegistros],
      ['Período Início', filtros.dataInicio || 'Não definido'],
      ['Período Fim', filtros.dataFim || 'Não definido'],
      ['Filtro Consultor', filtros.consultor || 'Todos'],
      ['Sistema', 'AUPUS Energia - Controle'],
      ['Versão', '2.0']
    ];

    const worksheetMeta = window.XLSX.utils.aoa_to_sheet(metadados);
    worksheetMeta['!cols'] = [{ width: 20 }, { width: 30 }];
    
    window.XLSX.utils.book_append_sheet(workbook, worksheetMeta, 'Metadados');
  }

  /**
   * 🔍 APLICAR FILTROS NA PROSPECÇÃO
   */
  aplicarFiltrosProspec(dados, filtros) {
    if (!filtros || Object.keys(filtros).length === 0) {
      return dados;
    }

    return dados.filter(item => {
      // Filtro por data
      if (filtros.dataInicio || filtros.dataFim) {
        const dataItem = new Date(item.data || item.dataProposta);
        if (isNaN(dataItem.getTime())) return false;
        
        if (filtros.dataInicio) {
          const dataInicio = new Date(filtros.dataInicio);
          if (dataItem < dataInicio) return false;
        }
        
        if (filtros.dataFim) {
          const dataFim = new Date(filtros.dataFim);
          if (dataItem > dataFim) return false;
        }
      }

      // Filtro por consultor
      if (filtros.consultor && filtros.consultor !== 'todos') {
        const consultorItem = (item.consultor || '').toLowerCase();
        const consultorFiltro = filtros.consultor.toLowerCase();
        if (!consultorItem.includes(consultorFiltro)) return false;
      }

      return true;
    });
  }

  /**
   * 🔍 APLICAR FILTROS NO CONTROLE
   */
  aplicarFiltrosControle(dados, filtros) {
    if (!filtros || Object.keys(filtros).length === 0) {
      return dados;
    }

    return dados.filter(item => {
      // Filtro por data de entrada no controle
      if (filtros.dataInicio || filtros.dataFim) {
        const dataItem = new Date(item.dataEntradaControle || item.data_entrada_controle);
        if (isNaN(dataItem.getTime())) return false;
        
        if (filtros.dataInicio) {
          const dataInicio = new Date(filtros.dataInicio);
          if (dataItem < dataInicio) return false;
        }
        
        if (filtros.dataFim) {
          const dataFim = new Date(filtros.dataFim);
          if (dataItem > dataFim) return false;
        }
      }

      // Filtro por consultor
      if (filtros.consultor && filtros.consultor !== 'todos') {
        const consultorItem = ((item.consultorNome || item.consultor) || '').toLowerCase();
        const consultorFiltro = filtros.consultor.toLowerCase();
        if (!consultorItem.includes(consultorFiltro)) return false;
      }

      return true;
    });
  }

  /**
   * 💰 CALCULAR VALOR DA UC
   */
  calcularValorUC(item) {
    const consumo = parseFloat(item.consumoMedio || item.consumo_medio || 0);
    const valorFatura = parseFloat(item.valorFatura || item.valor_fatura || 0);
    
    if (valorFatura > 0) return valorFatura;
    
    // Estimativa baseada no consumo (valor médio kWh no Brasil)
    const valorEstimadoPorKWh = 0.65;
    return consumo * valorEstimadoPorKWh;
  }

  /**
   * 💸 CALCULAR REPASSE
   */
  calcularRepasse(item) {
    const consumo = parseFloat(item.consumoMedio || item.consumo_medio || 0);
    const economia = parseFloat(item.economia || item.economia_percentual || 0);
    const comissao = parseFloat(item.comissaoPercentual || item.comissao_percentual || 5);
    
    const valorBase = consumo * 0.65; // Estimativa
    const economiaEmReais = (valorBase * economia) / 100;
    return (economiaEmReais * comissao) / 100;
  }

  /**
   * 🔄 PROCESSAR BENEFÍCIOS
   */
  processarBeneficios(beneficios) {
    if (!beneficios) return '';
    
    try {
      if (typeof beneficios === 'string') {
        const parsed = JSON.parse(beneficios);
        if (Array.isArray(parsed)) {
          return parsed.join(', ');
        }
        return beneficios;
      }
      
      if (Array.isArray(beneficios)) {
        return beneficios.join(', ');
      }
      
      return String(beneficios);
    } catch (error) {
      return String(beneficios || '');
    }
  }

  /**
   * 🧹 LIMPAR TEXTO
   */
  limparTexto(texto) {
    if (!texto) return '';
    return String(texto)
      .replace(/[\n\r\t]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 500); // Limite de caracteres
  }

  /**
   * 📅 FORMATAR DATA PARA EXCEL
   */
  formatarDataParaExcel(data) {
    if (!data) return '';
    
    try {
      const date = new Date(data);
      if (isNaN(date.getTime())) return '';
      
      return date.toLocaleDateString('pt-BR');
    } catch (error) {
      return '';
    }
  }

  /**
   * 🔢 FORMATAR NÚMERO
   */
  formatarNumero(numero) {
    const num = parseFloat(numero || 0);
    return isNaN(num) ? 0 : num.toLocaleString('pt-BR');
  }

  /**
   * 💰 FORMATAR MOEDA
   */
  formatarMoeda(valor) {
    const num = parseFloat(valor || 0);
    return isNaN(num) ? 'R$ 0,00' : num.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  }

  /**
   * 📊 FORMATAR PERCENTUAL
   */
  formatarPercentual(valor) {
    const num = parseFloat(valor || 0);
    return isNaN(num) ? '0%' : `${num.toFixed(2).replace('.', ',')}%`;
  }

  /**
   * ⏰ GERAR TIMESTAMP
   */
  getTimestamp() {
    const agora = new Date();
    return agora.toISOString()
      .replace(/[:\-T]/g, '')
      .split('.')[0];
  }
}

// Criar instância única do serviço
const exportExcelService = new ExportExcelService();

// Exportar como default
export default exportExcelService;