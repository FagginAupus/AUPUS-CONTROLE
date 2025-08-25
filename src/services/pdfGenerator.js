// src/services/pdfGenerator.js - GERADOR PDF REUTILIZÁVEL
class PDFGenerator {
  constructor() {
    this.jsPDFLoaded = false;
  }

  // Carregar jsPDF se não estiver disponível
  async loadJsPDF() {
    if (this.jsPDFLoaded && window.jspdf) {
      return true;
    }

    try {
      if (!window.jspdf) {
        console.log('📥 Carregando jsPDF...');
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
          script.onload = resolve;
          script.onerror = () => reject(new Error('Falha ao carregar jsPDF'));
          document.head.appendChild(script);
        });
      }
      
      this.jsPDFLoaded = true;
      console.log('✅ jsPDF carregado com sucesso');
      return true;
    } catch (error) {
      console.error('❌ Erro ao carregar jsPDF:', error);
      throw new Error('Não foi possível carregar o gerador de PDF');
    }
  }

  // Função principal para gerar PDF
  async gerarPDF(dadosProposta, autoDownload = true) {
    try {
      console.log('📄 Iniciando geração de PDF...', dadosProposta.numeroProposta);
      
      // Carregar jsPDF
      await this.loadJsPDF();
      
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF('p', 'mm', 'a4');

      // Gerar conteúdo do PDF
      this.criarLayoutPDF(doc, dadosProposta);

      // Gerar nome do arquivo
      const nomeArquivo = this.gerarNomeArquivo(dadosProposta);

      // Baixar automaticamente se solicitado
      if (autoDownload) {
        doc.save(nomeArquivo);
        console.log('✅ PDF baixado:', nomeArquivo);
      }

      return {
        nomeArquivo,
        pdfBlob: doc.output('blob'),
        pdfDataUri: doc.output('datauristring'),
        success: true
      };

    } catch (error) {
      console.error('❌ Erro ao gerar PDF:', error);
      throw error;
    }
  }

  // Criar layout do PDF
  criarLayoutPDF(doc, dados) {
    // Cores do tema
    const corAzul = [44, 62, 80];
    const corVerde = [76, 175, 80];
    const corTexto = [60, 60, 60];

    let y = 10;

    // === CABEÇALHO ===
    y = this.adicionarCabecalho(doc, y, corAzul);

    // === INFORMAÇÕES DO CLIENTE ===
    y = this.adicionarInformacoesCliente(doc, dados, y, corTexto);

    // === PLANO ECONOMIA ===
    y = this.adicionarPlanoEconomia(doc, dados, y, corTexto);

    // === UNIDADES CONSUMIDORAS ===
    if (dados.ucs && dados.ucs.length > 0) {
      y = this.adicionarUCs(doc, dados.ucs, y, corTexto);
    }

    // === BENEFÍCIOS ===
    if (dados.beneficios && dados.beneficios.length > 0) {
      y = this.adicionarBeneficios(doc, dados.beneficios, y, corTexto);
    }

    // === RODAPÉ ===
    this.adicionarRodape(doc);
  }

  // Adicionar cabeçalho
  adicionarCabecalho(doc, y, corAzul) {
    doc.setFillColor(...corAzul);
    doc.rect(0, 0, 210, 20, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Projeção de eficiência econômica', 20, 13);

    return 28;
  }

  // Adicionar informações do cliente
  adicionarInformacoesCliente(doc, dados, y, corTexto) {
    doc.setTextColor(...corTexto);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Cliente', 20, y);
    y += 15;

    // Card do cliente
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(1);
    doc.rect(20, y, 170, 18, 'S');

    y += 6;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');

    // Linha 1
    doc.setFont('helvetica', 'bold');
    doc.text('Nome:', 25, y);
    doc.setFont('helvetica', 'normal');
    doc.text(dados.nomeCliente || '', 45, y);

    doc.setFont('helvetica', 'bold');
    doc.text('Proposta:', 125, y);
    doc.setFont('helvetica', 'normal');
    doc.text(dados.numeroProposta || '', 148, y);

    y += 5;

    // Linha 2
    doc.setFont('helvetica', 'bold');
    doc.text('Telefone:', 25, y);
    doc.setFont('helvetica', 'normal');
    doc.text(dados.celular || '', 45, y);

    doc.setFont('helvetica', 'bold');
    doc.text('Data:', 125, y);
    doc.setFont('helvetica', 'normal');
    const dataFormatada = dados.data ? new Date(dados.data).toLocaleDateString('pt-BR') : '';
    doc.text(dataFormatada, 138, y);

    return y + 25;
  }

  // Adicionar plano economia
  adicionarPlanoEconomia(doc, dados, y, corTexto) {
    doc.setTextColor(...corTexto);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Plano Economia', 20, y);
    y += 15;

    doc.setDrawColor(220, 220, 220);
    doc.rect(20, y, 170, 15, 'S');

    y += 6;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');

    const descontoTarifa = Math.round((dados.descontoTarifa || 0.2) * 100);
    const descontoBandeira = Math.round((dados.descontoBandeira || 0.2) * 100);

    doc.setFont('helvetica', 'bold');
    doc.text('Desconto Tarifa:', 25, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${descontoTarifa}%`, 65, y);

    doc.setFont('helvetica', 'bold');
    doc.text('Desconto Bandeira:', 100, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${descontoBandeira}%`, 145, y);

    return y + 25;
  }

  // Adicionar UCs
  adicionarUCs(doc, ucs, y, corTexto) {
    doc.setTextColor(...corTexto);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Unidades Consumidoras', 20, y);
    y += 10;

    ucs.forEach((uc, index) => {
      // Verificar se precisa de nova página
      if (y > 250) {
        doc.addPage();
        y = 20;
      }

      y += 5;
      doc.setDrawColor(220, 220, 220);
      doc.rect(20, y, 170, 12, 'S');

      y += 4;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(`UC ${index + 1}:`, 25, y);
      doc.setFont('helvetica', 'normal');
      doc.text(uc.apelido || `UC ${index + 1}`, 40, y);

      doc.setFont('helvetica', 'bold');
      doc.text('Número:', 100, y);
      doc.setFont('helvetica', 'normal');
      doc.text(uc.numeroUC || '', 120, y);

      y += 4;
      doc.setFont('helvetica', 'bold');
      doc.text('Ligação:', 25, y);
      doc.setFont('helvetica', 'normal');
      doc.text(uc.ligacao || 'Monofásica', 45, y);

      doc.setFont('helvetica', 'bold');
      doc.text('Consumo:', 100, y);
      doc.setFont('helvetica', 'normal');
      doc.text(`${uc.consumo || 0} kWh`, 125, y);

      y += 8;
    });

    return y + 10;
  }

  // Adicionar benefícios
  adicionarBeneficios(doc, beneficios, y, corTexto) {
    doc.setTextColor(...corTexto);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Benefícios', 20, y);
    y += 10;

    beneficios.forEach(beneficio => {
      // Verificar se precisa de nova página
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...corTexto);
      
      // Quebrar texto longo em múltiplas linhas
      const textoCompleto = `${beneficio.numero}. ${beneficio.texto}`;
      const linhas = doc.splitTextToSize(textoCompleto, 170);
      
      linhas.forEach(linha => {
        doc.text(linha, 25, y);
        y += 4;
      });
      
      y += 2;
    });

    return y;
  }

  // Adicionar rodapé
  adicionarRodape(doc) {
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text('Aupus Energia - Soluções em Energia Solar', 20, 285);
      doc.text(`Página ${i} de ${pageCount}`, 170, 285);
    }
  }

  // Gerar nome do arquivo
  gerarNomeArquivo(dados) {
    const proposta = dados.numeroProposta?.replace(/[/\\]/g, '_') || 'Proposta';
    const cliente = dados.nomeCliente?.replace(/[^a-zA-Z0-9]/g, '_') || 'Cliente';
    const timestamp = new Date().toISOString().slice(0, 10);
    
    return `${proposta}_${cliente}_${timestamp}.pdf`;
  }

  // ADICIONAR AQUI - Formatar dados para PDF
  formatarDadosParaPDF(proposta) {
    // Normalizar dados vindos de diferentes fontes
    return {
      numeroProposta: proposta.numero_proposta || proposta.numeroProposta,
      nomeCliente: proposta.nome_cliente || proposta.nomeCliente,
      consultor: proposta.consultor,
      data: proposta.data_proposta || proposta.data,
      descontoTarifa: parseFloat(proposta.desconto_tarifa || proposta.descontoTarifa) || 0.2,
      descontoBandeira: parseFloat(proposta.desconto_bandeira || proposta.descontoBandeira) || 0.2,
      observacoes: proposta.observacoes || '',
      ucs: this.formatarUCs(proposta.unidades_consumidoras || proposta.ucs || []),
      beneficios: this.formatarBeneficios(proposta.beneficios || [])
    };
  }

  // Formatar UCs para o PDF
  formatarUCs(ucs) {
    if (typeof ucs === 'string') {
      try {
        ucs = JSON.parse(ucs);
      } catch (e) {
        return [];
      }
    }
    
    if (!Array.isArray(ucs)) return [];
    
    return ucs.map(uc => ({
      apelido: uc.apelido || uc.numero_unidade || 'UC',
      numeroUC: uc.numero_unidade || uc.numeroUC || '',
      ligacao: uc.ligacao || uc.tipo_ligacao || 'Monofásica',
      consumo: uc.consumo_medio || uc.consumo || 0
    }));
  }

  // Formatar benefícios para o PDF
  formatarBeneficios(beneficios) {
    if (typeof beneficios === 'string') {
      try {
        beneficios = JSON.parse(beneficios);
      } catch (e) {
        return [];
      }
    }
    
    if (!Array.isArray(beneficios)) return [];
    
    return beneficios.map((beneficio, index) => ({
      numero: beneficio.numero || (index + 1),
      texto: beneficio.texto || beneficio.toString()
    }));
  }

  // Método estático para facilitar o uso
  static async baixarPDF(dadosProposta, autoDownload = true) {
    const generator = new PDFGenerator();
    return await generator.gerarPDF(dadosProposta, autoDownload);
  }

  // Método estático melhorado
  static async baixarPDFDeProposta(proposta, autoDownload = true) {
    const generator = new PDFGenerator();
    const dadosFormatados = generator.formatarDadosParaPDF(proposta);
    return await generator.gerarPDF(dadosFormatados, autoDownload);
  }

  // Método estático para facilitar o uso
  static async baixarPDF(dadosProposta, autoDownload = true) {
    const generator = new PDFGenerator();
    return await generator.gerarPDF(dadosProposta, autoDownload);
  }
}

// Exportar para uso em outros arquivos
export default PDFGenerator;

// Também disponibilizar globalmente para compatibilidade
if (typeof window !== 'undefined') {
  window.PDFGenerator = PDFGenerator;
}