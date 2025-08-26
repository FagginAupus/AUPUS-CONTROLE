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
      await this.criarLayoutPDF(doc, dadosProposta);

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
  async criarLayoutPDF(doc, dados) {
    // Cores do tema
    const corAzul = [44, 62, 80];
    const corVerde = [76, 175, 80];
    const corTexto = [60, 60, 60];

    // Faixa preta preenchendo toda a página
    doc.setDrawColor(...corAzul);
    doc.setLineWidth(12);
    doc.rect(1, 1, 208, 295, 'S');

    let y = 10;

    // === CABEÇALHO COM LOGO ===
    y = await this.adicionarCabecalhoComLogo(doc, y, corAzul);

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
    await this.adicionarRodape(doc);
  }

  // Cabeçalho com logo
  async adicionarCabecalhoComLogo(doc, y, corAzul) {
    // Fundo azul
    doc.setFillColor(...corAzul);
    doc.rect(0, 0, 210, 18, 'F');

    // Carregar logo de forma síncrona
    try {
      // Criar promise para aguardar carregamento da imagem
      const logoCarregada = await new Promise((resolve, reject) => {
        const logoImg = new Image();
        logoImg.crossOrigin = 'anonymous';
        
        logoImg.onload = function() {
          try {
            console.log('✅ Logo carregada com sucesso!');
            resolve(logoImg);
          } catch (error) {
            console.warn('Erro ao processar logo:', error);
            reject(error);
          }
        };
        
        logoImg.onerror = function() {
          console.error('❌ Erro ao carregar logo de: /Logo.png');
          reject(new Error('Logo não encontrada'));
        };
        
        // Definir timeout para evitar espera infinita
        setTimeout(() => {
          if (!logoImg.complete) {
            reject(new Error('Timeout ao carregar logo'));
          }
        }, 3000);
        
        logoImg.src = '/Logo.png';
        
        // Se já estiver carregada (cache)
        if (logoImg.complete && logoImg.naturalHeight !== 0) {
          resolve(logoImg);
        }
      });
      
      // Adicionar logo ao PDF
      // Calcular dimensões mantendo proporção
      const logoWidth = logoCarregada.naturalWidth;
      const logoHeight = logoCarregada.naturalHeight;
      const aspectRatio = logoWidth / logoHeight;

      // Definir altura desejada e calcular largura proporcional
      const alturaDesejada = 10;
      const larguraProporcional = alturaDesejada * aspectRatio;

      // Limitar largura máxima para não ocupar muito espaço
      const larguraMaxima = 35;
      const larguraFinal = Math.min(larguraProporcional, larguraMaxima);
      const alturaFinal = larguraFinal / aspectRatio;

      // Adicionar logo ao PDF mantendo proporção
      doc.addImage(logoCarregada, 'PNG', 10, 4, larguraFinal, alturaFinal);
      console.log(`📐 Logo adicionada: ${larguraFinal.toFixed(1)}x${alturaFinal.toFixed(1)}mm (aspecto: ${aspectRatio.toFixed(2)})`);
      
    } catch (error) {
      // Fallback - mostrar texto em vez da logo
      console.warn('📝 Usando fallback de texto para logo:', error.message);
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

  // Informações do cliente - versão compacta COM LETRAS MAIORES
  adicionarInformacoesClienteCompacto(doc, dados, y, corTexto) {
    doc.setTextColor(...corTexto);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Cliente', 20, y);
    y += 6; 

    y += 7;
    doc.setFontSize(11); // Aumentado de 9 para 11
    doc.setFont('helvetica', 'normal');

    // Uma linha só com os três dados - LETRAS MAIORES
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10); 
    doc.text('Nome:', 25, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.text(dados.nomeCliente || '', 42, y);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Proposta:', 110, y);
    doc.setFont('helvetica', 'normal'); 
    doc.setFontSize(10);
    doc.text(dados.numeroProposta || '', 133, y);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Data:', 155, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    const dataFormatada = dados.data ? new Date(dados.data).toLocaleDateString('pt-BR') : '';
    doc.text(dataFormatada, 168, y);

    doc.setDrawColor(160, 160, 160);
    doc.setLineWidth(0.5);
    doc.line(20, y + 8, 190, y + 8);

    return y + 15;
  }

  // Plano economia - MODIFICADO COM FIDELIDADE
  adicionarPlanoEconomiaCompacto(doc, dados, y, corTexto) {
    doc.setTextColor(...corTexto);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Plano Economia', 20, y);
    y += 6;

    y += 6;

    const descontoTarifa = Math.round((dados.descontoTarifa || 0.2) * 100);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...corTexto); // Preto para "Economia Esperada"
    doc.setFontSize(10); // Diminuído de 14 para 12
    doc.text('Economia Esperada:', 25, y);
    
    doc.setTextColor(76, 175, 80); // Verde para o valor
    doc.setFontSize(18); 
    doc.text(`${descontoTarifa}%`, 90, y);

    // Adicionar Fidelidade: NÃO ao lado
    doc.setTextColor(...corTexto); // Preto para "Fidelidade:"
    doc.setFontSize(10);
    doc.text('Fidelidade:', 120, y);
    
    doc.setTextColor(255, 0, 0); // Vermelho para "NÃO"
    doc.setFont('helvetica', 'bold');
    doc.text('NÃO', 150, y);

    // Voltar cor normal
    doc.setTextColor(...corTexto);
    doc.setDrawColor(160, 160, 160);
    doc.setLineWidth(0.5);
    doc.line(20, y + 8, 190, y + 8);

    return y + 15;
  }

  // Tabela de UCs expandida - COM LETRAS MAIORES
  adicionarTabelaUCs(doc, ucs, y, corTexto) {
    doc.setTextColor(...corTexto);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Unidades Consumidoras', 20, y);
    y += 6;

    const linhaAltura = 4;
    const maxLinhas = 10;
    const ucsParaMostrar = ucs.slice(0, maxLinhas);

    // Cabeçalho da tabela
    doc.setFillColor(70, 100, 130);
    doc.rect(20, y, 170, 10, 'F');

    doc.setFontSize(8); 
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);

    // Cabeçalho com novos nomes
    doc.text('Nome', 22, y + 3);
    doc.text('Consumo', 55, y + 3);
    doc.text('Sem', 85, y + 3);
    doc.text('Com', 110, y + 3);  
    doc.text('Taxa', 135, y + 3);
    doc.text('Economia', 155, y + 3);
    doc.text('Economia', 175, y + 3);

    // Segunda linha do cabeçalho
    doc.text('', 22, y + 7);
    doc.text('', 55, y + 7);
    doc.text('Assinatura', 85, y + 7);
    doc.text('Assinatura', 110, y + 7);
    doc.text('Fixa', 135, y + 7);
    doc.text('Mensal', 155, y + 7);
    doc.text('Anual', 175, y + 7);

    doc.setTextColor(...corTexto);
    y += 10;

    // Função para calcular taxa fixa (tarifa mínima)
    const calcularTaxaFixa = (ligacao) => {
      switch (ligacao?.toUpperCase()) {
        case 'TRIFÁSICA':
        case 'TRIFASICA':
          return 112;
        case 'BIFÁSICA':
        case 'BIFASICA':
          return 62;
        case 'MONOFÁSICA':
        case 'MONOFASICA':
        default:
          return 42;
      }
    };

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');

    // Linhas da tabela com cálculos
    ucsParaMostrar.forEach((uc, index) => {
      if (index % 2 === 1) {
        doc.setFillColor(248, 248, 248);
        doc.rect(20, y, 170, linhaAltura, 'F');
      }

      const consumo = parseFloat(uc.consumo) || 0;
      const tarifa = 0.8;
      const desconto = 0.2;
      
      // Cálculos
      const semAssinatura = consumo * tarifa; // Valor Distribuidora
      const economiaMensal = consumo * tarifa * desconto;
      const economiaAnual = economiaMensal * 12;
      const comAssinatura = consumo * tarifa * (1 - desconto); // Contribuição
      const taxaFixa = calcularTaxaFixa(uc.ligacao);

      const nomeUC = (uc.apelido || `UC ${index + 1}`).substring(0, 12);

      // Dados COM UNIDADES nas linhas
      doc.text(nomeUC, 22, y + 3);
      doc.text(`${consumo.toFixed(0)} kWh`, 55, y + 3);
      doc.text(`R$ ${semAssinatura.toFixed(0)}`, 85, y + 3);
      doc.text(`R$ ${comAssinatura.toFixed(0)}`, 110, y + 3);
      doc.text(`R$ ${taxaFixa}`, 135, y + 3);
      doc.text(`R$ ${economiaMensal.toFixed(0)}`, 155, y + 3);
      doc.text(`R$ ${economiaAnual.toFixed(0)}`, 175, y + 3);

      y += linhaAltura;
    });

    if (ucs.length > maxLinhas) {
      doc.setFontSize(6);
      doc.setTextColor(180, 0, 0);
      doc.text(`+ ${ucs.length - maxLinhas} unidades adicionais`, 22, y + 2);
      y += 4;
    }

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
      doc.setFillColor(44, 62, 80);
      doc.rect(x, y_barra, larguraBarra, alturaRelativa, 'F');

      // Contorno
      doc.setDrawColor(30, 50, 70);
      doc.rect(x, y_barra, larguraBarra, alturaRelativa, 'S');

      // Label do ano - CENTRALIZADO E MAIOR
      doc.setTextColor(...corTexto);
      doc.setFontSize(10); // Aumentado de 8 para 10
      doc.setFont('helvetica', 'bold'); // Negrito para os anos
      const textoAno = `Ano ${index + 1}`;
      const larguraTextoAno = doc.getTextWidth(textoAno);
      const xCentralizadoAno = x + (larguraBarra - larguraTextoAno) / 2;
      doc.text(textoAno, xCentralizadoAno, graficoDados.y + graficoDados.altura - 3);

      // Valor exato - FONTE MAIOR E CENTRALIZADO
      if (alturaRelativa > 8) {
        doc.setFontSize(8);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        const valorFormatado = valor.toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        });
        
        // Centralizar o valor na barra
        const larguraTextoValor = doc.getTextWidth(valorFormatado);
        const xCentralizadoValor = x + (larguraBarra - larguraTextoValor) / 2;
        doc.text(valorFormatado, xCentralizadoValor, y_barra + 6);
      }
    });

    y = graficoDados.y + graficoDados.altura + 10;

    // Economia total
    doc.setTextColor(...corVerde);
    doc.setFontSize(11);
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

  // Benefícios compactos - ALTERADO TÍTULO PARA "INFORMAÇÕES E BENEFÍCIOS"
  adicionarBeneficiosCompactos(doc, beneficios, y, corTexto) {
    // Se não há benefícios, pular esta seção
    if (!beneficios || beneficios.length === 0) {
      return y;
    }
    
    doc.setTextColor(...corTexto);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Informações e Benefícios', 20, y); // ALTERADO AQUI
    y += 6; 

    // Espaço fixo para benefícios
    const maxBeneficios = 10;
    const alturaPorBeneficio = 4;
    const beneficiosParaMostrar = beneficios.slice(0, maxBeneficios);

    // Calcular tamanho da fonte baseado na quantidade
    let fontSize = 9; 
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

  // Rodapé - MODIFICADO COM EMOJIS E IMAGEM ONDA
  async adicionarRodape(doc) {
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      
      // Contatos à esquerda - COM SÍMBOLOS SIMPLES
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(7); // Diminuído de 8 para 6

      // Posicionamento dos contatos à esquerda
      const xContatos = 15;
      let yContatos = 277; // Ajustado para baixo

      // Website 
      doc.text('site: www.aupusenergia.com.br', xContatos, yContatos);
      yContatos += 3; // Menor espaçamento

      // Email
      doc.text('email: smart@aupusenergia.com.br', xContatos, yContatos);
      yContatos += 3;

      // WhatsApp
      doc.text('whatsapp: (62) 9 9654-7888', xContatos, yContatos);
      
      // Slogan - IMAGEM CURSIVA CENTRALIZADA
      try {
        const sloganCarregado = await new Promise((resolve, reject) => {
          const sloganImg = new Image();
          sloganImg.crossOrigin = 'anonymous';
          
          sloganImg.onload = function() {
            try {
              console.log('📊 Imagem original:', {
                width: sloganImg.naturalWidth,
                height: sloganImg.naturalHeight
              });
              
              // Verificar dimensões válidas
              if (sloganImg.naturalWidth === 0 || sloganImg.naturalHeight === 0) {
                throw new Error('Dimensões inválidas');
              }
              
              // REDIMENSIONAR IMAGEM
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              
              const maxWidth = 800;
              const originalWidth = sloganImg.naturalWidth;
              const originalHeight = sloganImg.naturalHeight;
              
              let newWidth = originalWidth;
              let newHeight = originalHeight;
              
              if (originalWidth > maxWidth) {
                const ratio = maxWidth / originalWidth;
                newWidth = maxWidth;
                newHeight = originalHeight * ratio;
              }
              
              canvas.width = newWidth;
              canvas.height = newHeight;
              ctx.drawImage(sloganImg, 0, 0, newWidth, newHeight);
              
              const dataURL = canvas.toDataURL('image/png', 0.8);
              
              // Dimensões para PDF - centralizado
              const aspectRatio = newWidth / newHeight;
              const alturaDesejada = 10;
              const larguraProporcional = alturaDesejada * aspectRatio;
              const larguraMaxPDF = 100;
              const larguraFinal = Math.min(larguraProporcional, larguraMaxPDF);
              const alturaFinal = larguraFinal / aspectRatio;
              const xCentralizado = (210 - larguraFinal) / 2;
              
              console.log('📐 Dimensões finais:', {
                larguraFinal: larguraFinal.toFixed(1),
                alturaFinal: alturaFinal.toFixed(1),
                xCentralizado: xCentralizado.toFixed(1)
              });
              
              resolve({ dataURL, x: xCentralizado, y: 277, w: larguraFinal, h: alturaFinal });
              
            } catch (error) {
              console.warn('❌ Erro ao processar slogan:', error);
              reject(error);
            }
          };
          
          sloganImg.onerror = function() {
            console.error('❌ Erro ao carregar: /Frase_interligando.png');
            reject(new Error('Falha ao carregar slogan'));
          };
          
          // Timeout para evitar espera infinita
          setTimeout(() => {
            if (!sloganImg.complete) {
              reject(new Error('Timeout ao carregar slogan'));
            }
          }, 3000);
          
          console.log('🔄 Carregando slogan...');
          sloganImg.src = '/Frase_interligando.png';
        });
        
        // Adicionar imagem ao PDF
        doc.addImage(sloganCarregado.dataURL, 'PNG', sloganCarregado.x, sloganCarregado.y, sloganCarregado.w, sloganCarregado.h);
        console.log('✅ Slogan cursivo adicionado ao PDF!');
        
      } catch (error) {
        console.warn('📝 Usando fallback de texto para slogan:', error.message);
        // Fallback
        doc.setFont('times', 'italic');
        doc.setFontSize(11);
        doc.setTextColor(76, 175, 80);
        doc.text('Interligando você com o futuro!', 75, 285);
      }
      
      // Imagem onda à direita - SUBSTITUINDO PAGINAÇÃO
      try {
        const ondaCarregada = await new Promise((resolve, reject) => {
          const ondaImg = new Image();
          ondaImg.crossOrigin = 'anonymous';
          
          ondaImg.onload = function() {
            try {
              console.log('🌊 Imagem onda original:', {
                width: ondaImg.naturalWidth,
                height: ondaImg.naturalHeight
              });
              
              if (ondaImg.naturalWidth === 0 || ondaImg.naturalHeight === 0) {
                throw new Error('Dimensões inválidas');
              }
              
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              
              const maxWidth = 400;
              const originalWidth = ondaImg.naturalWidth;
              const originalHeight = ondaImg.naturalHeight;
              
              let newWidth = originalWidth;
              let newHeight = originalHeight;
              
              if (originalWidth > maxWidth) {
                const ratio = maxWidth / originalWidth;
                newWidth = maxWidth;
                newHeight = originalHeight * ratio;
              }
              
              canvas.width = newWidth;
              canvas.height = newHeight;
              ctx.drawImage(ondaImg, 0, 0, newWidth, newHeight);
              
              const dataURL = canvas.toDataURL('image/png', 0.8);
              
              // Posicionar à direita
              const aspectRatio = newWidth / newHeight;
              const alturaDesejada = 15;
              const larguraProporcional = alturaDesejada * aspectRatio;
              const larguraFinal = Math.min(larguraProporcional, 40);
              const alturaFinal = larguraFinal / aspectRatio;
              const xDireita = 210 - larguraFinal - 10; // 10mm da margem direita
              
              resolve({ dataURL, x: xDireita, y: 275, w: larguraFinal, h: alturaFinal });
              
            } catch (error) {
              console.warn('❌ Erro ao processar onda:', error);
              reject(error);
            }
          };
          
          ondaImg.onerror = function() {
            console.error('❌ Erro ao carregar: /Onda.png');
            reject(new Error('Falha ao carregar onda'));
          };
          
          setTimeout(() => {
            if (!ondaImg.complete) {
              reject(new Error('Timeout ao carregar onda'));
            }
          }, 3000);
          
          console.log('🌊 Carregando Onda...');
          ondaImg.src = '/Onda.png';
        });
        
        // Adicionar imagem onda ao PDF
        doc.addImage(ondaCarregada.dataURL, 'PNG', ondaCarregada.x, ondaCarregada.y, ondaCarregada.w, ondaCarregada.h);
        console.log('✅ Imagem onda adicionada ao PDF!');
        
      } catch (error) {
        console.warn('📝 Usando fallback para paginação:', error.message);
        // Fallback - mostrar número da página
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        doc.text(`Página ${i} de ${pageCount}`, 170, 285);
      }
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