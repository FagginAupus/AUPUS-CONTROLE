// src/services/pdfGenerator.js - GERADOR PDF COM LAYOUT OTIMIZADO
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

  // Criar layout otimizado do PDF
  criarLayoutPDF(doc, dados) {
    // Cores do tema
    const corAzul = [44, 62, 80];
    const corVerde = [76, 175, 80];
    const corTexto = [60, 60, 60];

    // Faixa preta preenchendo toda a página
    doc.setDrawColor(...corAzul);
    doc.setLineWidth(7);
    doc.rect(1, 1, 208, 295, 'S');

    let y = 10;

    // === CABEÇALHO COM LOGO ===
    y = this.adicionarCabecalhoComLogo(doc, y, corAzul);

    // === INFORMAÇÕES DO CLIENTE (COMPACTO) ===
    y = this.adicionarInformacoesClienteCompacto(doc, dados, y, corTexto);

    // === PLANO ECONOMIA (COMPACTO) ===
    y = this.adicionarPlanoEconomiaCompacto(doc, dados, y, corTexto);

    // === TABELA DE UNIDADES CONSUMIDORAS (ESPAÇO FIXO) ===
    if (dados.ucs && dados.ucs.length > 0) {
      y = this.adicionarTabelaUCs(doc, dados.ucs, y, corTexto);
    }

    // === GRÁFICO ECONOMIA 5 ANOS ===
    if (dados.ucs && dados.ucs.length > 0 && dados.tarifaTributos) {
      y = this.adicionarEconomia5Anos(doc, dados, y, corTexto, corVerde);
    }

    // === BENEFÍCIOS (ESPAÇO FIXO) ===
    if (dados.beneficios && dados.beneficios.length > 0) {
      y = this.adicionarBeneficiosCompactos(doc, dados.beneficios, y, corTexto);
    }

    // === RODAPÉ ===
    this.adicionarRodape(doc);
  }

  // Cabeçalho com logo
  adicionarCabecalhoComLogo(doc, y, corAzul) {
    // Fundo azul
    doc.setFillColor(...corAzul);
    doc.rect(0, 0, 210, 18, 'F');

    // Carregar logo
    try {
      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      
      logoImg.onload = function() {
        try {
          doc.addImage(logoImg, 'PNG', 10, 4, 30, 10);
          console.log('✅ Logo carregada com sucesso!');
        } catch (error) {
          console.warn('Erro ao adicionar logo:', error);
        }
      };
      
      logoImg.onerror = function() {
        // Fallback se logo não carregar
        console.error('❌ Erro ao carregar logo de: /Logo.png');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('AUPUS', 15, 12);
      };
      
      logoImg.src = '/Logo.png';
      
      // Tentar carregar imediatamente se já estiver em cache
      if (logoImg.complete && logoImg.naturalHeight !== 0) {
        doc.addImage(logoImg, 'PNG', 10, 4, 30, 10);
      }
      
    } catch (error) {
      // Fallback
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('AUPUS', 15, 12);
    }

    // Título
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Projeção de eficiência econômica', 60, 12);

    return 25;
  }

  // Informações do cliente - versão compacta
  adicionarInformacoesClienteCompacto(doc, dados, y, corTexto) {
    doc.setTextColor(...corTexto);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Cliente', 20, y);
    y += 6; 



    y += 7; // Centralizado verticalmente (12/2 + altura_fonte/2)
    doc.setFontSize(9); // Aumentado de 8 para 9
    doc.setFont('helvetica', 'normal');

    // Uma linha só com os três dados
    doc.setFont('helvetica', 'bold');
    doc.text('Nome:', 25, y);
    doc.setFont('helvetica', 'normal');
    doc.text(dados.nomeCliente || '', 42, y);

    doc.setFont('helvetica', 'bold');
    doc.text('Proposta:', 110, y);
    doc.setFont('helvetica', 'normal');
    doc.text(dados.numeroProposta || '', 133, y);

    doc.setFont('helvetica', 'bold');
    doc.text('Data:', 155, y);
    doc.setFont('helvetica', 'normal');
    const dataFormatada = dados.data ? new Date(dados.data).toLocaleDateString('pt-BR') : '';
    doc.text(dataFormatada, 168, y);

    doc.setDrawColor(160, 160, 160);
    doc.setLineWidth(0.5);
    doc.line(20, y + 8, 190, y + 8);

    return y + 15;
  }

  // Plano economia - versão compacta
  adicionarPlanoEconomiaCompacto(doc, dados, y, corTexto) {
    doc.setTextColor(...corTexto);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Plano Economia', 20, y);
    y += 6; // Reduzido de 8 para 6

    y += 6; // Centralizado verticalmente (10/2 + altura_fonte/2)
    doc.setFontSize(9); // Aumentado de 8 para 9
    doc.setFont('helvetica', 'normal');

    const descontoTarifa = Math.round((dados.descontoTarifa || 0.2) * 100);
    const descontoBandeira = Math.round((dados.descontoBandeira || 0.2) * 100);

    // Uma linha com os dois descontos
    doc.setFont('helvetica', 'bold');
    doc.text('Desconto Tarifa:', 25, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${descontoTarifa}%`, 70, y);

    doc.setFont('helvetica', 'bold');
    doc.text('Desconto Bandeira:', 100, y);
    doc.setFont('helvetica', 'normal');
    doc.text(`${descontoBandeira}%`, 150, y);

    doc.setDrawColor(160, 160, 160);
    doc.setLineWidth(0.5);
    doc.line(20, y + 8, 190, y + 8);

    return y + 15;
  }

  // Tabela de UCs - espaço dinâmico baseado no conteúdo
  adicionarTabelaUCs(doc, ucs, y, corTexto) {
    doc.setTextColor(...corTexto);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Unidades Consumidoras', 20, y);
    y += 6;

    const linhaAltura = 4;
    const maxLinhas = 10;
    const ucsParaMostrar = ucs.slice(0, maxLinhas);
    const qtdLinhas = ucsParaMostrar.length;

    doc.setFillColor(70, 100, 130); // Azul mais claro
    doc.rect(20, y, 170, 6, 'F');

    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255); // MOVER ESTA LINHA PARA DEPOIS do setFont

    doc.text('Nome/Apelido', 22, y + 4);
    doc.text('Número UC', 75, y + 4);
    doc.text('Ligação', 125, y + 4);
    doc.text('Consumo (kWh)', 155, y + 4);

    doc.setTextColor(...corTexto);

    y += 6;

    // Calcular tamanho da fonte baseado na quantidade de UCs
    let fontSize = 8; // Dados
    if (ucs.length > 8) fontSize = 7;
    if (ucs.length > 12) fontSize = 6;

    doc.setFontSize(fontSize);
    doc.setFont('helvetica', 'normal');

    // Linhas da tabela (apenas as necessárias)
    ucsParaMostrar.forEach((uc, index) => {
      // Linha alternada
      if (index % 2 === 1) {
        doc.setFillColor(248, 248, 248);
        doc.rect(20, y, 170, linhaAltura, 'F');
      }

      // Dados da UC
      const nomeUC = (uc.apelido || `UC ${index + 1}`).substring(0, 20);
      const numeroUC = (uc.numeroUC || '').toString().substring(0, 15);
      const ligacao = (uc.ligacao || 'N/I').substring(0, 10);
      const consumo = (uc.consumo || 0).toString();

      doc.text(nomeUC, 22, y + 3);
      doc.text(numeroUC, 75, y + 3);
      doc.text(ligacao, 125, y + 3);
      doc.text(consumo, 155, y + 3);

      y += linhaAltura;
    });

    // Mostrar aviso se houver mais UCs que o espaço disponível
    if (ucs.length > maxLinhas) {
      doc.setFontSize(6);
      doc.setTextColor(180, 0, 0);
      doc.text(`+ ${ucs.length - maxLinhas} unidades adicionais`, 22, y + 2);
      y += 4;
    }

    // Adicionar linha cinza
    doc.setDrawColor(160, 160, 160);
    doc.setLineWidth(0.5);
    doc.line(20, y + 8, 190, y + 8);

    return y + 15;
  }

  // Calcular economia por UC para os próximos 5 anos
  calcularEconomia5Anos(uc, tarifaTributos, descontoTarifa, inflacao) {
    const consumo = parseFloat(uc.consumo) || 0;
    const tarifa = parseFloat(tarifaTributos) || 0.8;
    const desconto = parseFloat(descontoTarifa) || 0.2;
    const inflacaoDecimal = parseFloat(inflacao) || 0.02;

    if (consumo === 0 || tarifa === 0) {
      return Array(5).fill(0);
    }

    const economiaMensal = consumo * tarifa * desconto;
    const economias = [];
    let economiaAno = economiaMensal * 12;
    
    for (let ano = 1; ano <= 5; ano++) {
      economias.push(economiaAno);
      economiaAno = economiaAno * (1 + inflacaoDecimal);
    }

    return economias;
  }

  calcularEconomiaConsolidada(ucs, tarifaTributos, descontoTarifa, inflacao) {
    const economiasConsolidadas = Array(5).fill(0);
    
    ucs.forEach(uc => {
      const economiaUC = this.calcularEconomia5Anos(uc, tarifaTributos, descontoTarifa, inflacao);
      economiaUC.forEach((valor, index) => {
        economiasConsolidadas[index] += valor;
      });
    });

    return {
      economiasPorAno: economiasConsolidadas,
      economiaTotal: economiasConsolidadas.reduce((total, valor) => total + valor, 0)
    };
  }

  adicionarEconomia5Anos(doc, dados, y, corTexto, corVerde) {
    if (!dados.ucs || dados.ucs.length === 0 || !dados.tarifaTributos) {
      return y;
    }

    const economiaData = this.calcularEconomiaConsolidada(
      dados.ucs,
      dados.tarifaTributos,
      dados.descontoTarifa,
      dados.inflacao
    );

    // Título
    doc.setTextColor(...corTexto);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Economia nos próximos cinco anos', 20, y);
    y += 6; 

    // Gráfico compacto
    const graficoDados = {
      x: 20,
      y: y,
      largura: 170,
      altura: 50
    };

    const valorMaximo = Math.max(...economiaData.economiasPorAno);
    const alturaMaximaBarra = graficoDados.altura - 15;
    const larguraBarra = 25;
    const espacoEntre = 5;
    const inicioX = graficoDados.x + 15;

    // Fundo do gráfico
    doc.setDrawColor(240, 240, 240);
    doc.setFillColor(250, 250, 250);
    doc.rect(graficoDados.x, graficoDados.y, graficoDados.largura, graficoDados.altura, 'F');

    // Desenhar barras
    economiaData.economiasPorAno.forEach((valor, index) => {
      const alturaRelativa = valorMaximo > 0 ? (valor / valorMaximo) * alturaMaximaBarra : 0;
      const x = inicioX + (index * (larguraBarra + espacoEntre));
      const y_barra = graficoDados.y + graficoDados.altura - 10 - alturaRelativa;

      // Barra
      doc.setFillColor(44, 62, 80); // Cor azul direta
      doc.rect(x, y_barra, larguraBarra, alturaRelativa, 'F');

      // Contorno
      doc.setDrawColor(30, 50, 70); // Azul mais escuro para contorno
      doc.rect(x, y_barra, larguraBarra, alturaRelativa, 'S');

      // Label do ano
      doc.setTextColor(...corTexto);
      doc.setFontSize(8); // Aumentado de 7 para 8
      doc.setFont('helvetica', 'normal');
      doc.text(`Ano ${index + 1}`, x + 3, graficoDados.y + graficoDados.altura - 3);

      // Valor exato
      if (alturaRelativa > 8) {
        doc.setFontSize(6); // Aumentado de 5 para 6
        doc.setTextColor(255, 255, 255);
        const valorFormatado = valor.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        });
        doc.text(valorFormatado, x + 1, y_barra + 5);
      }
    });

    y = graficoDados.y + graficoDados.altura + 5;

    // Economia total
    doc.setTextColor(...corVerde);
    doc.setFontSize(11); // Aumentado de 9 para 11
    doc.setFont('helvetica', 'bold');
    
    const economiaFormatada = economiaData.economiaTotal.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });

    doc.text(`Economia Total: ${economiaFormatada}`, 20, y);

    doc.setDrawColor(160, 160, 160);
    doc.setLineWidth(0.5);
    doc.line(20, y + 8, 190, y + 8);

    return y + 15;
  }

  // Benefícios compactos - espaço fixo para até 10 benefícios
  adicionarBeneficiosCompactos(doc, beneficios, y, corTexto) {
    doc.setTextColor(...corTexto);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Benefícios', 20, y);
    y += 6; 

    // Espaço fixo para benefícios
    const maxBeneficios = 10;
    const alturaPorBeneficio = 4;
    const beneficiosParaMostrar = beneficios.slice(0, maxBeneficios);

    // Calcular tamanho da fonte baseado na quantidade
    let fontSize = 8; // Aumentado de 7 para 8
    if (beneficios.length > 8) fontSize = 7;
    if (beneficios.length > 12) fontSize = 6;

    doc.setFontSize(fontSize);
    doc.setFont('helvetica', 'normal');

    beneficiosParaMostrar.forEach((beneficio, index) => {
      // Texto completo do benefício
      const numeroTexto = `${beneficio.numero || index + 1}.`;
      let textoCompleto = beneficio.texto || beneficio.toString();
      
      // Usar splitTextToSize para quebrar o texto automaticamente em linhas
      const textoFinal = numeroTexto + ' ' + textoCompleto;
      const linhas = doc.splitTextToSize(textoFinal, 170); // Largura máxima de 170mm
      
      // Desenhar cada linha
      linhas.forEach((linha) => {
        // Verificar se ainda há espaço na página
        if (y > 270) {
          return; // Parar se chegou no final da página
        }
        
        doc.text(linha, 25, y);
        y += alturaPorBeneficio;
      });
      
      // Adicionar pequeno espaço entre benefícios
      y += 1;
    });

    // Mostrar aviso se houver mais benefícios
    if (beneficios.length > maxBeneficios) {
      doc.setFontSize(7);
      doc.setTextColor(180, 0, 0);
      doc.text(`+ ${beneficios.length - maxBeneficios} benefícios adicionais`, 25, y);
      y += 3;
    }

    return y + 5;
  }

  // Rodapé
  adicionarRodape(doc) {
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      
      // Primeira parte em fonte normal
      doc.setFont('helvetica', 'bold');
      doc.text('Aupus Energia - ', 20, 285);
      
      // Segunda parte em fonte cursiva (simulando a fonte especial)
      doc.setFont('helvetica', 'italic');
      doc.text('Interligando você com o futuro!', 75, 285);
      
      // Número da página
      doc.setFont('helvetica', 'normal');
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

  // Formatar dados para PDF
  formatarDadosParaPDF(proposta) {
    return {
      numeroProposta: proposta.numero_proposta || proposta.numeroProposta,
      nomeCliente: proposta.nome_cliente || proposta.nomeCliente,
      consultor: proposta.consultor,
      data: proposta.data_proposta || proposta.data,
      descontoTarifa: parseFloat(proposta.desconto_tarifa || proposta.descontoTarifa) || 0.2,
      descontoBandeira: parseFloat(proposta.desconto_bandeira || proposta.descontoBandeira) || 0.2,
      tarifaTributos: parseFloat(proposta.tarifa_tributos || proposta.tarifaTributos) || 0.8,
      inflacao: parseFloat(proposta.inflacao) || 0.02,
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

  // Métodos estáticos
  static async baixarPDF(dadosProposta, autoDownload = true) {
    const generator = new PDFGenerator();
    return await generator.gerarPDF(dadosProposta, autoDownload);
  }

  static async baixarPDFDeProposta(proposta, autoDownload = true) {
    const generator = new PDFGenerator();
    const dadosFormatados = generator.formatarDadosParaPDF(proposta);
    return await generator.gerarPDF(dadosFormatados, autoDownload);
  }
}

// Exportar para uso em outros arquivos
export default PDFGenerator;

// Disponibilizar globalmente para compatibilidade
if (typeof window !== 'undefined') {
  window.PDFGenerator = PDFGenerator;
}