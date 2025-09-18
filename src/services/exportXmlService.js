// src/services/exportXmlService.js

/**
 * 📁 SERVIÇO DE EXPORTAÇÃO XML
 * Converte dados para XML e realiza download
 */
class ExportXmlService {
  
  /**
   * ✅ EXPORTAR PROSPECÇÃO POR UC PARA XML
   * Cada linha representa uma UC individual com dados da proposta
   */
  async exportarProspecParaXml(dados, filtros) {
    try {
      console.log('📊 Iniciando exportação de prospecção:', {
        totalRegistros: dados.length,
        filtros: filtros
      });

      // ✅ APLICAR FILTROS
      const dadosFiltrados = this.aplicarFiltrosProspec(dados, filtros);
      
      console.log(`📋 Total após filtros: ${dadosFiltrados.length} registros`);

      // ✅ ESTRUTURAR DADOS POR UC
      const registrosPorUC = dadosFiltrados.map(item => {
        const valorUC = this.calcularValorUC(item);
        
        return {
          // Dados da Proposta
          id_proposta: item.propostaId || item.id || '',
          numero_proposta: item.numeroProposta || '',
          data_proposta: this.formatarData(item.data || item.dataProposta),
          nome_cliente: item.nomeCliente || '',
          consultor: item.consultor || '',
          status_proposta: item.status || 'Aguardando',
          
          // Dados da UC
          numero_uc: item.numeroUC || item.numero_unidade || '',
          apelido_uc: item.apelido || '',
          consumo_medio: item.consumoMedio || 0,
          valor_uc: valorUC,
          
          // Descontos
          desconto_tarifa: item.descontoTarifa || 0,
          desconto_bandeira: item.descontoBandeira || 0,
          
          // Observações
          observacoes: item.observacoes || '',
          
          // Benefícios (JSON para string)
          beneficios: this.processarBeneficios(item.beneficios),
          
          // Recorrência
          recorrencia: item.recorrencia || ''
        };
      });

      // ✅ GERAR XML
      const xmlContent = this.gerarXmlProspec(registrosPorUC, filtros);
      
      // ✅ DOWNLOAD
      this.downloadXml(xmlContent, `prospecacao_por_uc_${this.getTimestamp()}.xml`);
      
      return {
        success: true,
        totalRegistros: registrosPorUC.length,
        arquivo: `prospecacao_por_uc_${this.getTimestamp()}.xml`
      };

    } catch (error) {
      console.error('❌ Erro na exportação de prospecção:', error);
      throw new Error(`Erro ao exportar prospecção: ${error.message}`);
    }
  }

  /**
   * ✅ EXPORTAR CONTROLE PARA XML
   * Dados específicos da tabela controle_clube com relacionamentos
   */
  async exportarControleParaXml(dados, filtros) {
    try {
      console.log('⚙️ Iniciando exportação de controle:', {
        totalRegistros: dados.length,
        filtros: filtros
      });

      // ✅ APLICAR FILTROS
      const dadosFiltrados = this.aplicarFiltrosControle(dados, filtros);
      
      console.log(`📋 Total após filtros: ${dadosFiltrados.length} registros`);

      // ✅ PROCESSAR DADOS DO CONTROLE
      const registrosControle = dadosFiltrados.map(item => {
        const comissaoPadrao = 25; // 25% padrão
        const economia = parseFloat(item.economia || item.valor_calibrado || 0);
        const bandeira = parseFloat(item.bandeira || item.desconto_bandeira || 0);
        const consumoMedio = parseFloat(item.consumoMedio || item.consumo_medio || 0);
        
        // Fórmula: repasse = consumo_médio × (1-economia) × comissão
        const repasse = consumoMedio * (1 - economia / 100) * (comissaoPadrao / 100);

        return {
          // Dados do Controle
          id_controle: item.id || item.controle_id || '',
          consultor_nome: item.consultorNome || item.consultor || '',
          
          // Dados da UC
          numero_uc: item.numeroUC || item.numero_unidade || '',
          apelido_uc: item.apelido || '',
          
          // Valores financeiros
          economia_percentual: economia,
          desconto_bandeira: bandeira,
          consumo_medio: consumoMedio,
          contribuicao: '', // Campo vazio conforme solicitado
          comissao_percentual: comissaoPadrao,
          repasse_calculado: repasse.toFixed(2),
          
          // Datas
          data_entrada_controle: this.formatarData(item.dataEntradaControle || item.data_entrada_controle),
          status_troca: item.statusTroca || item.status_troca || '',
          data_titularidade: item.statusTroca === 'Associado' 
            ? this.formatarData(item.dataTitularidade || item.data_titularidade)
            : '' // Só exibir se status = "Associado"
        };
      });

      // ✅ GERAR XML
      const xmlContent = this.gerarXmlControle(registrosControle, filtros);
      
      // ✅ DOWNLOAD
      this.downloadXml(xmlContent, `controle_clube_${this.getTimestamp()}.xml`);
      
      return {
        success: true,
        totalRegistros: registrosControle.length,
        arquivo: `controle_clube_${this.getTimestamp()}.xml`
      };

    } catch (error) {
      console.error('❌ Erro na exportação de controle:', error);
      throw new Error(`Erro ao exportar controle: ${error.message}`);
    }
  }

  /**
   * ✅ APLICAR FILTROS NA PROSPECÇÃO
   */
  aplicarFiltrosProspec(dados, filtros) {
    return dados.filter(item => {
      // Filtro por data
      const dataItem = new Date(item.data || item.dataProposta);
      const dataInicio = new Date(filtros.dataInicio);
      const dataFim = new Date(filtros.dataFim);
      
      if (dataItem < dataInicio || dataItem > dataFim) {
        return false;
      }

      // Filtro por consultor
      if (filtros.consultor && item.consultor !== filtros.consultor) {
        return false;
      }

      return true;
    });
  }

  /**
   * ✅ APLICAR FILTROS NO CONTROLE
   */
  aplicarFiltrosControle(dados, filtros) {
    return dados.filter(item => {
      // Filtro por data de entrada no controle
      const dataItem = new Date(item.dataEntradaControle || item.data_entrada_controle);
      const dataInicio = new Date(filtros.dataInicio);
      const dataFim = new Date(filtros.dataFim);
      
      if (dataItem < dataInicio || dataItem > dataFim) {
        return false;
      }

      // Filtro por consultor
      if (filtros.consultor && (item.consultorNome || item.consultor) !== filtros.consultor) {
        return false;
      }

      return true;
    });
  }

  /**
   * ✅ GERAR XML DA PROSPECÇÃO
   */
  gerarXmlProspec(dados, filtros) {
    const timestamp = new Date().toISOString();
    
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<relatorio_prospeccao>\n';
    xml += `  <metadata>\n`;
    xml += `    <gerado_em>${timestamp}</gerado_em>\n`;
    xml += `    <total_registros>${dados.length}</total_registros>\n`;
    xml += `    <periodo_inicio>${filtros.dataInicio}</periodo_inicio>\n`;
    xml += `    <periodo_fim>${filtros.dataFim}</periodo_fim>\n`;
    xml += `    <consultor_filtro>${filtros.consultor || 'Todos'}</consultor_filtro>\n`;
    xml += `  </metadata>\n`;
    xml += '  <propostas_por_uc>\n';

    dados.forEach(item => {
      xml += '    <uc>\n';
      xml += `      <id_proposta>${this.escapeXml(item.id_proposta)}</id_proposta>\n`;
      xml += `      <numero_proposta>${this.escapeXml(item.numero_proposta)}</numero_proposta>\n`;
      xml += `      <data_proposta>${this.escapeXml(item.data_proposta)}</data_proposta>\n`;
      xml += `      <nome_cliente>${this.escapeXml(item.nome_cliente)}</nome_cliente>\n`;
      xml += `      <consultor>${this.escapeXml(item.consultor)}</consultor>\n`;
      xml += `      <status_proposta>${this.escapeXml(item.status_proposta)}</status_proposta>\n`;
      xml += `      <numero_uc>${this.escapeXml(item.numero_uc)}</numero_uc>\n`;
      xml += `      <apelido_uc>${this.escapeXml(item.apelido_uc)}</apelido_uc>\n`;
      xml += `      <consumo_medio>${item.consumo_medio}</consumo_medio>\n`;
      xml += `      <valor_uc>${item.valor_uc}</valor_uc>\n`;
      xml += `      <desconto_tarifa>${item.desconto_tarifa}</desconto_tarifa>\n`;
      xml += `      <desconto_bandeira>${item.desconto_bandeira}</desconto_bandeira>\n`;
      xml += `      <observacoes>${this.escapeXml(item.observacoes)}</observacoes>\n`;
      xml += `      <beneficios>${this.escapeXml(item.beneficios)}</beneficios>\n`;
      xml += `      <recorrencia>${this.escapeXml(item.recorrencia)}</recorrencia>\n`;
      xml += '    </uc>\n';
    });

    xml += '  </propostas_por_uc>\n';
    xml += '</relatorio_prospeccao>\n';

    return xml;
  }

  /**
   * ✅ GERAR XML DO CONTROLE
   */
  gerarXmlControle(dados, filtros) {
    const timestamp = new Date().toISOString();
    
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<relatorio_controle>\n';
    xml += `  <metadata>\n`;
    xml += `    <gerado_em>${timestamp}</gerado_em>\n`;
    xml += `    <total_registros>${dados.length}</total_registros>\n`;
    xml += `    <periodo_inicio>${filtros.dataInicio}</periodo_inicio>\n`;
    xml += `    <periodo_fim>${filtros.dataFim}</periodo_fim>\n`;
    xml += `    <consultor_filtro>${filtros.consultor || 'Todos'}</consultor_filtro>\n`;
    xml += `  </metadata>\n`;
    xml += '  <controles>\n';

    dados.forEach(item => {
      xml += '    <controle>\n';
      xml += `      <id_controle>${this.escapeXml(item.id_controle)}</id_controle>\n`;
      xml += `      <consultor_nome>${this.escapeXml(item.consultor_nome)}</consultor_nome>\n`;
      xml += `      <numero_uc>${this.escapeXml(item.numero_uc)}</numero_uc>\n`;
      xml += `      <apelido_uc>${this.escapeXml(item.apelido_uc)}</apelido_uc>\n`;
      xml += `      <economia_percentual>${item.economia_percentual}</economia_percentual>\n`;
      xml += `      <desconto_bandeira>${item.desconto_bandeira}</desconto_bandeira>\n`;
      xml += `      <consumo_medio>${item.consumo_medio}</consumo_medio>\n`;
      xml += `      <contribuicao>${this.escapeXml(item.contribuicao)}</contribuicao>\n`;
      xml += `      <comissao_percentual>${item.comissao_percentual}</comissao_percentual>\n`;
      xml += `      <repasse_calculado>${item.repasse_calculado}</repasse_calculado>\n`;
      xml += `      <data_entrada_controle>${this.escapeXml(item.data_entrada_controle)}</data_entrada_controle>\n`;
      xml += `      <status_troca>${this.escapeXml(item.status_troca)}</status_troca>\n`;
      xml += `      <data_titularidade>${this.escapeXml(item.data_titularidade)}</data_titularidade>\n`;
      xml += '    </controle>\n';
    });

    xml += '  </controles>\n';
    xml += '</relatorio_controle>\n';

    return xml;
  }

  /**
   * ✅ UTILITÁRIOS
   */
  calcularValorUC(item) {
    // Lógica para calcular valor da UC baseado no consumo e descontos
    const consumo = parseFloat(item.consumoMedio || 0);
    const descontoTarifa = parseFloat(item.descontoTarifa || 0) / 100;
    const descontoBandeira = parseFloat(item.descontoBandeira || 0) / 100;
    
    // Valor base estimado (pode ser ajustado conforme regra de negócio)
    const valorBase = consumo * 0.65; // Exemplo: R$ 0,65 por kWh
    const economiaTotal = valorBase * (descontoTarifa + descontoBandeira);
    
    return (valorBase - economiaTotal).toFixed(2);
  }

  processarBeneficios(beneficios) {
    if (typeof beneficios === 'string') {
      try {
        const parsed = JSON.parse(beneficios);
        return Object.values(parsed).join('; ');
      } catch {
        return beneficios;
      }
    } else if (typeof beneficios === 'object' && beneficios !== null) {
      return Object.values(beneficios).join('; ');
    }
    return beneficios || '';
  }

  formatarData(data) {
    if (!data) return '';
    const date = new Date(data);
    return date.toLocaleDateString('pt-BR');
  }

  escapeXml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  downloadXml(xmlContent, filename) {
    const blob = new Blob([xmlContent], {
      type: 'application/xml; charset=utf-8'
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    window.URL.revokeObjectURL(url);
    console.log(`✅ Download iniciado: ${filename}`);
  }

  getTimestamp() {
    const now = new Date();
    return now.toISOString().split('T')[0].replace(/-/g, '');
  }
}

const exportXmlService = new ExportXmlService();
export default exportXmlService;