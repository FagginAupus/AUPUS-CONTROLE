// =====================================
// 📊 EXPORT EXCEL SERVICE - VERSÃO COMPLETA COM NOVAS COLUNAS
// =====================================

class ExportExcelService {
  constructor() {
    this.xlsxLoaded = false;
  }

  /**
   * 🔧 GARANTIR QUE XLSX ESTÁ CARREGADO
   */
  async ensureXLSXLoaded() {
    if (this.xlsxLoaded && typeof window.XLSX !== 'undefined') {
      return;
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      
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
   * 📋 EXPORTAR PROSPECÇÃO PARA EXCEL - COM DATA DE ENTRADA NO CONTROLE
   */
  async exportarProspecParaExcel(dados, filtros = {}) {
    try {
      console.log('📊 === EXPORTAÇÃO PROSPECÇÃO COM DATA CONTROLE ===');
      console.log('Total de dados recebidos:', dados.length);

      await this.ensureXLSXLoaded();

      if (typeof window.XLSX === 'undefined') {
        throw new Error('Biblioteca XLSX não pôde ser carregada');
      }

      // Aplicar filtros
      const dadosFiltrados = this.aplicarFiltrosProspec(dados, filtros);
      console.log(`📋 Total após filtros: ${dadosFiltrados.length} registros`);

      // ✅ ENRIQUECER DADOS COM DATA DE ENTRADA NO CONTROLE
      const dadosEnriquecidos = await this.buscarDataEntradaControle(dadosFiltrados);

      // ✅ PROCESSAR DADOS PARA EXCEL
      const registrosParaExcel = dadosEnriquecidos.map((item, index) => {
        const numeroUC = item.numeroUC || item.numero_uc || item.numero_unidade || '';
        const apelido = item.apelido || item.apelido_uc || '';
        const consumoMedio = item.consumoMedio || item.consumo_medio || item.media || 0;
        
        return {
          'Nº': index + 1,
          'Nº Proposta': item.numeroProposta || item.numero_proposta || '',
          'Data Proposta': this.formatarDataParaExcel(item.data || item.dataProposta || item.data_proposta),
          'Cliente': item.nomeCliente || item.nome_cliente || '',
          'Consultor': item.consultor || '',
          'Status': item.status || 'Aguardando',
          'Nº UC': numeroUC,
          'Apelido UC': apelido,
          'Consumo Médio (kWh)': this.formatarNumero(consumoMedio),
          'Desconto Tarifa (%)': this.formatarPercentual(item.descontoTarifa || item.desconto_tarifa || item.economia || 0),
          'Desconto Bandeira (%)': this.formatarPercentual(item.descontoBandeira || item.desconto_bandeira || item.bandeira || 0),
          'Recorrência': item.recorrencia || '',
          // ✅ NOVA COLUNA: Data de Entrada no Controle
          'Data Entrada Controle': this.formatarDataParaExcel(item.dataEntradaControle)
        };
      });

      console.log('📋 AMOSTRA DO EXCEL (primeiros 2 registros):', registrosParaExcel.slice(0, 2));

      // Criar workbook
      const workbook = window.XLSX.utils.book_new();
      
      // Criar worksheet principal
      const worksheet = window.XLSX.utils.json_to_sheet(registrosParaExcel);
      
      // ✅ CONFIGURAR LARGURA DAS COLUNAS - ATUALIZADA
      worksheet['!cols'] = [
        { width: 5 },   // Nº
        { width: 15 },  // Nº Proposta  
        { width: 12 },  // Data Proposta
        { width: 25 },  // Cliente
        { width: 20 },  // Consultor
        { width: 12 },  // Status
        { width: 15 },  // Nº UC
        { width: 20 },  // Apelido UC
        { width: 15 },  // Consumo
        { width: 15 },  // Desc. Tarifa
        { width: 15 },  // Desc. Bandeira
        { width: 12 },  // Recorrência
        { width: 15 }   // Data Entrada Controle
      ];

      // ✅ ADICIONAR FILTROS EM TODAS AS COLUNAS
      if (registrosParaExcel.length > 0) {
        worksheet['!autofilter'] = { ref: worksheet['!ref'] };
      }
            
      // Adicionar worksheet ao workbook
      window.XLSX.utils.book_append_sheet(workbook, worksheet, 'Prospecção por UC');
      
      // Criar aba de metadados
      this.adicionarAbaMetadados(workbook, 'prospec', registrosParaExcel.length, filtros);
      
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
   * ⚙️ EXPORTAR CONTROLE PARA EXCEL - COM DATA DA PROPOSTA
   */
  async exportarControleParaExcel(dados, filtros = {}) {
    try {
      console.log('⚙️ === EXPORTAÇÃO CONTROLE COM DATA PROPOSTA ===');
      console.log('Total de dados recebidos:', dados.length);

      await this.ensureXLSXLoaded();

      if (typeof window.XLSX === 'undefined') {
        throw new Error('Biblioteca XLSX não pôde ser carregada');
      }

      // Aplicar filtros
      const dadosFiltrados = this.aplicarFiltrosControle(dados, filtros);
      console.log(`📋 Total após filtros: ${dadosFiltrados.length} registros`);

      // ✅ BUSCAR DADOS DAS UCs E DATA DA PROPOSTA
      const dadosEnriquecidos = await this.buscarDadosUCsParaControle(dadosFiltrados);
      const dadosComDataProposta = await this.buscarDataProposta(dadosEnriquecidos);

      // ✅ ESTRUTURAR DADOS PARA EXCEL
      const registrosParaExcel = dadosComDataProposta.map((item, index) => {
        const repasseCalculado = this.calcularRepasseCorrigido(item);
        
        return {
          'Nº': index + 1,
          'Consultor': item.consultorNome || item.consultor || '',
          'Nº UC': item.numeroUC || item.numero_uc || item.numero_unidade || '',
          'Apelido UC': item.apelido || item.apelido_uc || '',
          // ✅ USAR CONSUMO MÉDIO REAL BUSCADO
          'Consumo Médio (kWh)': this.formatarNumero(item.consumoMedioReal || item.consumoMedio || item.consumo_medio || 0),
          // ✅ USAR DESCONTOS REAIS DO CONTROLE_CLUBE
          'Economia (%)': this.formatarPercentual(item.economiaReal || item.economia || 0),
          'Desconto Bandeira (%)': this.formatarPercentual(item.bandeiraReal || item.bandeira || 0),
          // ✅ CONTRIBUIÇÃO: R$ 0,00 ao invés de N/A
          'Contribuição': this.formatarMoeda(0),
          // ✅ NOVA COLUNA: Nº Cont (padrão 0)
          'Nº Cont': 0,
          // ✅ COMISSÃO: 25% ao invés de 5%
          'Comissão (%)': this.formatarPercentual(25),
          'Repasse (R$)': this.formatarMoeda(repasseCalculado),
          // ✅ NOVA COLUNA: Data da Proposta
          'Data Proposta': this.formatarDataParaExcel(item.dataProposta),
          'Data Entrada': this.formatarDataParaExcel(item.dataEntradaControle || item.data_entrada_controle),
          'Status Troca': item.statusTroca || item.status_troca || 'Pendente',
          'Data Titularidade': item.statusTroca === 'Associado' || item.status_troca === 'Associado' 
            ? this.formatarDataParaExcel(item.dataTitularidade || item.data_titularidade)
            : ''
        };
      });

      console.log('⚙️ AMOSTRA DO EXCEL CONTROLE (primeiros 2 registros):', registrosParaExcel.slice(0, 2));

      // Criar workbook
      const workbook = window.XLSX.utils.book_new();
      
      // Criar worksheet principal
      const worksheet = window.XLSX.utils.json_to_sheet(registrosParaExcel);
      
      // ✅ CONFIGURAR LARGURA DAS COLUNAS - ATUALIZADA
      worksheet['!cols'] = [
        { width: 5 },   // Nº
        { width: 20 },  // Consultor
        { width: 15 },  // Nº UC
        { width: 20 },  // Apelido UC
        { width: 15 },  // Consumo
        { width: 12 },  // Economia
        { width: 15 },  // Desc. Bandeira
        { width: 15 },  // Contribuição
        { width: 10 },  // Nº Cont
        { width: 12 },  // Comissão
        { width: 15 },  // Repasse
        { width: 12 },  // Data Proposta
        { width: 12 },  // Data Entrada
        { width: 15 },  // Status Troca
        { width: 15 }   // Data Titularidade
      ];

      // ✅ ADICIONAR FILTROS EM TODAS AS COLUNAS
      if (registrosParaExcel.length > 0) {
        worksheet['!autofilter'] = { ref: worksheet['!ref'] };
      }
            
      // Adicionar worksheet ao workbook
      window.XLSX.utils.book_append_sheet(workbook, worksheet, 'Controle Clube');
      
      // Criar aba de metadados
      this.adicionarAbaMetadados(workbook, 'controle', registrosParaExcel.length, filtros);
      
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
   * 📅 BUSCAR DATA DE ENTRADA NO CONTROLE PARA PROSPECÇÃO
   * Busca data_entrada_controle da tabela controle_clube
   */
  async buscarDataEntradaControle(dadosProspec) {
    try {
      console.log('📅 === BUSCANDO DATA DE ENTRADA NO CONTROLE ===');
      console.log('Total de itens para enriquecer:', dadosProspec.length);

      const apiUrl = process.env.REACT_APP_API_URL || '';
      const token = localStorage.getItem('aupus_token') || localStorage.getItem('auth_token');

      const dadosEnriquecidos = await Promise.all(
        dadosProspec.map(async (itemProspec, index) => {
          try {
            const numeroUC = itemProspec.numeroUC || itemProspec.numero_uc || itemProspec.numero_unidade;
            
            if (!numeroUC || numeroUC === '-') {
              // Se não tem número da UC válido, retorna sem data
              return {
                ...itemProspec,
                dataEntradaControle: null
              };
            }

            // Buscar data de entrada no controle via API
            const response = await fetch(`${apiUrl}/controle/buscar-por-uc/${encodeURIComponent(numeroUC)}`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });

            if (response.ok) {
              const data = await response.json();
              
              if (data.success && data.data && data.data.data_entrada_controle) {
                console.log(`✅ Data encontrada para UC ${numeroUC}:`, data.data.data_entrada_controle);
                return {
                  ...itemProspec,
                  dataEntradaControle: data.data.data_entrada_controle
                };
              }
            }

            // Se não encontrou, retorna sem data
            return {
              ...itemProspec,
              dataEntradaControle: null
            };

          } catch (error) {
            console.warn(`⚠️ Erro ao buscar data entrada para UC ${itemProspec.numeroUC}:`, error);
            return {
              ...itemProspec,
              dataEntradaControle: null
            };
          }
        })
      );

      const itensComData = dadosEnriquecidos.filter(item => item.dataEntradaControle).length;
      console.log(`📅 Datas encontradas: ${itensComData}/${dadosEnriquecidos.length}`);

      return dadosEnriquecidos;

    } catch (error) {
      console.error('❌ Erro ao buscar datas de entrada no controle:', error);
      // Em caso de erro, retorna dados originais
      return dadosProspec.map(item => ({
        ...item,
        dataEntradaControle: null
      }));
    }
  }

  /**
   * 📅 BUSCAR DATA DA PROPOSTA PARA CONTROLE
   * Busca data_proposta da tabela propostas
   */
  async buscarDataProposta(dadosControle) {
    try {
      console.log('📅 === BUSCANDO DATA DA PROPOSTA ===');
      console.log('Total de itens para enriquecer:', dadosControle.length);

      const apiUrl = process.env.REACT_APP_API_URL || '';
      const token = localStorage.getItem('aupus_token') || localStorage.getItem('auth_token');

      const dadosEnriquecidos = await Promise.all(
        dadosControle.map(async (itemControle, index) => {
          try {
            const controleId = itemControle.id || itemControle.controle_id;
            
            if (!controleId) {
              return {
                ...itemControle,
                dataProposta: null
              };
            }

            // Reutilizar a chamada existente que já busca dados completos
            const response = await fetch(`${apiUrl}/controle/${controleId}/uc-detalhes`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });

            if (response.ok) {
              const data = await response.json();
              
              if (data.success && data.data) {
                // Buscar a data da proposta via ID da proposta
                const propostaId = data.data.proposta_id;
                
                if (propostaId) {
                  const responseProsposta = await fetch(`${apiUrl}/propostas/${propostaId}`, {
                    headers: {
                      'Authorization': `Bearer ${token}`,
                      'Content-Type': 'application/json'
                    }
                  });

                  if (responseProsposta.ok) {
                    const dataProposta = await responseProsposta.json();
                    
                    if (dataProposta.success && dataProposta.data.data_proposta) {
                      console.log(`✅ Data proposta encontrada para controle ${controleId}:`, dataProposta.data.data_proposta);
                      return {
                        ...itemControle,
                        dataProposta: dataProposta.data.data_proposta
                      };
                    }
                  }
                }
              }
            }

            return {
              ...itemControle,
              dataProposta: null
            };

          } catch (error) {
            console.warn(`⚠️ Erro ao buscar data da proposta para controle ${itemControle.id}:`, error);
            return {
              ...itemControle,
              dataProposta: null
            };
          }
        })
      );

      const itensComData = dadosEnriquecidos.filter(item => item.dataProposta).length;
      console.log(`📅 Datas de proposta encontradas: ${itensComData}/${dadosEnriquecidos.length}`);

      return dadosEnriquecidos;

    } catch (error) {
      console.error('❌ Erro ao buscar datas das propostas:', error);
      // Em caso de erro, retorna dados originais
      return dadosControle.map(item => ({
        ...item,
        dataProposta: null
      }));
    }
  }

  /**
   * 🔍 BUSCAR DADOS DAS UCs PARA CONTROLE - OTIMIZADO
   * Busca dados com rate limiting para evitar 429
   */
  async buscarDadosUCsParaControle(dadosControle) {
    try {
      console.log('🔍 === BUSCANDO DADOS DAS UCs PARA CONTROLE ===');
      console.log('Total de itens para enriquecer:', dadosControle.length);

      const apiUrl = process.env.REACT_APP_API_URL || '';
      const token = localStorage.getItem('aupus_token') || localStorage.getItem('auth_token');

      // ✅ PROCESSAR EM LOTES PEQUENOS PARA EVITAR RATE LIMITING
      const batchSize = 3; // Máximo 3 requisições simultâneas
      const delay = 500; // 500ms entre lotes

      const dadosEnriquecidos = [];

      for (let i = 0; i < dadosControle.length; i += batchSize) {
        const lote = dadosControle.slice(i, i + batchSize);
        
        console.log(`🔄 Processando lote ${Math.floor(i/batchSize) + 1}/${Math.ceil(dadosControle.length/batchSize)}`);

        const promessasLote = lote.map(async (itemControle) => {
          try {
            const controleId = itemControle.id || itemControle.controle_id;
            
            if (!controleId) {
              return this.enriquecerComDadosLocais(itemControle);
            }

            // ✅ BUSCAR DADOS COMPLETOS DO CONTROLE VIA API
            const response = await fetch(`${apiUrl}/controle/${controleId}/uc-detalhes`, {
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              }
            });

            if (response.ok) {
              const data = await response.json();
              
              if (data.success && data.data) {
                return {
                  ...itemControle,
                  // Dados da UC da tabela unidades_consumidoras
                  consumoMedioReal: data.data.consumo_medio || 0,
                  apelidoReal: data.data.apelido || '',
                  // Descontos do controle_clube
                  economiaReal: this.extrairValorNumerico(data.data.desconto_tarifa),
                  bandeiraReal: this.extrairValorNumerico(data.data.desconto_bandeira)
                };
              }
            } else if (response.status === 429) {
              console.warn('⚠️ Rate limit atingido, usando dados locais');
            }

            // Se não conseguiu via API ou rate limit, usar dados locais
            return this.enriquecerComDadosLocais(itemControle);

          } catch (error) {
            console.warn(`⚠️ Erro ao buscar dados do controle ${itemControle.id}:`, error);
            return this.enriquecerComDadosLocais(itemControle);
          }
        });

        const resultadosLote = await Promise.all(promessasLote);
        dadosEnriquecidos.push(...resultadosLote);

        // Aguardar antes do próximo lote
        if (i + batchSize < dadosControle.length) {
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }

      console.log(`✅ Dados enriquecidos: ${dadosEnriquecidos.length} registros processados`);
      return dadosEnriquecidos;

    } catch (error) {
      console.error('❌ Erro ao buscar dados das UCs:', error);
      // Em caso de erro, tentar enriquecer com dados locais
      return dadosControle.map(item => this.enriquecerComDadosLocais(item));
    }
  }

  /**
   * 📊 ENRIQUECER COM DADOS LOCAIS - FALLBACK
   */
  enriquecerComDadosLocais(itemControle) {
    return {
      ...itemControle,
      consumoMedioReal: itemControle.consumoMedio || itemControle.consumo_medio || 0,
      apelidoReal: itemControle.apelido || itemControle.apelido_uc || '',
      economiaReal: this.extrairValorNumerico(
        itemControle.economia || 
        itemControle.economiaPercentual || 
        itemControle.descontoTarifa || 
        itemControle.desconto_tarifa || 
        0
      ),
      bandeiraReal: this.extrairValorNumerico(
        itemControle.bandeira || 
        itemControle.bandeiraPercentual || 
        itemControle.descontoBandeira || 
        itemControle.desconto_bandeira || 
        0
      )
    };
  }

  /**
   * 📊 EXTRAIR VALOR NUMÉRICO DE DESCONTO
   */
  extrairValorNumerico(valor) {
    if (!valor) return 0;
    
    if (typeof valor === 'number') return valor;
    
    if (typeof valor === 'string') {
      // Remove % e espaços, converte para número
      const numero = parseFloat(valor.replace(/[%\s]/g, ''));
      return isNaN(numero) ? 0 : numero;
    }
    
    return 0;
  }

  /**
   * 💸 CALCULAR REPASSE CORRIGIDO - COM COMISSÃO 25%
   */
  calcularRepasseCorrigido(item) {
    const consumo = parseFloat(item.consumoMedioReal || item.consumoMedio || item.consumo_medio || 0);
    const economia = parseFloat(item.economiaReal || item.economia || 0);
    const valorEstimadoKwh = 0.65;
    
    // Calcular economia em reais
    const economiaReais = (consumo * valorEstimadoKwh) * (economia / 100);
    
    // ✅ COMISSÃO DE 25%
    const comissao = 25;
    const repasse = economiaReais * (comissao / 100);
    
    return repasse;
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
        const dataItem = new Date(item.data || item.dataProposta || item.data_proposta);
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
      ['Versão', '2.2 - Com Datas Relacionadas'],
      ['Observações', tipo === 'prospec' 
        ? 'Dados expandidos por UC com Data de Entrada no Controle' 
        : 'Consumo médio da UC real, Descontos do controle_clube, Data da Proposta, Comissão: 25%']
    ];

    const worksheetMeta = window.XLSX.utils.aoa_to_sheet(metadados);
    worksheetMeta['!cols'] = [{ width: 20 }, { width: 50 }];
    
    window.XLSX.utils.book_append_sheet(workbook, worksheetMeta, 'Metadados');
  }

  // =====================================
  // 🔧 MÉTODOS UTILITÁRIOS
  // =====================================

  formatarDataParaExcel(data) {
    if (!data) return '';
    const dataObj = new Date(data);
    if (isNaN(dataObj.getTime())) return '';
    return dataObj.toLocaleDateString('pt-BR');
  }

  formatarNumero(valor) {
    const num = parseFloat(valor);
    return isNaN(num) ? 0 : num;
  }

  formatarPercentual(valor) {
    const num = parseFloat(valor);
    return isNaN(num) ? '0%' : `${num}%`;
  }

  formatarMoeda(valor) {
    const num = parseFloat(valor);
    if (isNaN(num)) return 'R$ 0,00';
    return `R$ ${num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  getTimestamp() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    
    return `${year}${month}${day}_${hours}${minutes}`;
  }
}

// ✅ EXPORTAR INSTÂNCIA SINGLETON
const exportExcelService = new ExportExcelService();
export default exportExcelService;