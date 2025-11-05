// src/services/pdfGenerator.js - GERADOR DE PDF VIA HTML COM IMAGENS EMBEDADAS
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Globe, Mail, Smartphone } from 'lucide-react';

class PDFGenerator {
  constructor() {
    this.initialized = true;
    this.imagensBase64 = {}; // Cache de imagens em Base64
  }

  // Renderizar ícone Lucide React como SVG string
  getIconSVG(iconName) {
    try {
      let IconComponent;

      switch(iconName) {
        case 'globe':
          IconComponent = Globe;
          break;
        case 'mail':
          IconComponent = Mail;
          break;
        case 'phone':
          IconComponent = Smartphone;
          break;
        default:
          return '';
      }

      // Renderizar o componente React como string HTML
      const svgString = renderToStaticMarkup(
        React.createElement(IconComponent, {
          size: 16,
          color: '#2c3e50',
          strokeWidth: 2
        })
      );

      return svgString;
    } catch (error) {
      console.error('Erro ao renderizar ícone:', error);
      // Fallback para emoji se falhar
      const fallbacks = {
        globe: '🌐',
        mail: '✉️',
        phone: '📱'
      };
      return fallbacks[iconName] || '';
    }
  }

  // Calcular fator de escala baseado no número de UCs
  calcularScaleFactor(numUCs) {
    // Escala progressiva MUITO conservadora para garantir que SEMPRE cabe em 1 página
    // IMPORTANTE: Valores mínimos para não estourar a página
    // 1-3 UCs: 1.05x (apenas 5% maior)
    // 4-6 UCs: 1.02x (apenas 2% maior)
    // 7-10 UCs: 1.0x (padrão)
    if (numUCs <= 3) return 1.05;
    if (numUCs <= 6) return 1.02;
    return 1.0;
  }

  // Carregar imagem e converter para Base64
  async carregarImagemComoBase64(caminho) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = function() {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);

          // Converter para Base64
          const dataURL = canvas.toDataURL('image/png');
          console.log(`✅ Imagem ${caminho} convertida para Base64`);
          resolve(dataURL);
        } catch (error) {
          console.error(`❌ Erro ao converter ${caminho}:`, error);
          reject(error);
        }
      };

      img.onerror = () => {
        console.error(`❌ Erro ao carregar imagem: ${caminho}`);
        reject(new Error(`Falha ao carregar: ${caminho}`));
      };

      img.src = caminho;
    });
  }

  // Carregar todas as imagens necessárias
  async carregarTodasImagens() {
    try {
      console.log('🖼️ Carregando imagens...');

      const [logoBase64, sloganBase64, ondaBase64] = await Promise.all([
        this.carregarImagemComoBase64('/Logo.png'),
        this.carregarImagemComoBase64('/Frase_interligando.png'),
        this.carregarImagemComoBase64('/Onda.png')
      ]);

      this.imagensBase64 = {
        logo: logoBase64,
        slogan: sloganBase64,
        onda: ondaBase64
      };

      console.log('✅ Todas as imagens carregadas e convertidas para Base64');
      return true;
    } catch (error) {
      console.warn('⚠️ Erro ao carregar algumas imagens:', error);
      // Continuar mesmo com erro - usar fallbacks
      return false;
    }
  }

  // Carregar biblioteca html2canvas
  async loadHtml2Canvas() {
    if (window.html2canvas) {
      return true;
    }

    try {
      console.log('📥 Carregando html2canvas...');
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        script.onload = resolve;
        script.onerror = () => reject(new Error('Falha ao carregar html2canvas'));
        document.head.appendChild(script);
      });
      console.log('✅ html2canvas carregado com sucesso');
      return true;
    } catch (error) {
      console.error('❌ Erro ao carregar html2canvas:', error);
      throw new Error('Não foi possível carregar html2canvas');
    }
  }

  // Carregar jsPDF (já usado no projeto)
  async loadJsPDF() {
    if (window.jspdf) {
      return true;
    }

    try {
      console.log('📥 Carregando jsPDF...');
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = resolve;
        script.onerror = () => reject(new Error('Falha ao carregar jsPDF'));
        document.head.appendChild(script);
      });
      console.log('✅ jsPDF carregado com sucesso');
      return true;
    } catch (error) {
      console.error('❌ Erro ao carregar jsPDF:', error);
      throw new Error('Não foi possível carregar jsPDF');
    }
  }

  // Função principal para gerar PDF a partir do HTML
  async gerarHTML(dadosProposta, autoDownload = true) {
    let iframe = null;
    let overlay = null;

    try {
      console.log('📄 Iniciando geração de PDF via HTML...', dadosProposta.numeroProposta);

      // Mostrar overlay de loading
      overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.8);
        z-index: 999999;
        display: flex;
        justify-content: center;
        align-items: center;
        color: white;
        font-size: 20px;
        font-family: Arial, sans-serif;
      `;
      overlay.innerHTML = '<div>📄 Gerando PDF...</div>';
      document.body.appendChild(overlay);

      // Carregar bibliotecas
      await Promise.all([
        this.loadJsPDF(),
        this.loadHtml2Canvas()
      ]);

      // Carregar imagens
      await this.carregarTodasImagens();

      // Criar HTML completo
      const htmlContent = await this.criarLayoutHTML(dadosProposta);

      // Criar iframe invisível
      iframe = document.createElement('iframe');
      iframe.style.cssText = `
        position: fixed;
        top: -10000px;
        left: -10000px;
        width: 210mm;
        height: 297mm;
        border: none;
        background: white;
      `;
      document.body.appendChild(iframe);

      // Escrever HTML no iframe
      const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
      iframeDoc.open();
      iframeDoc.write(htmlContent);
      iframeDoc.close();

      console.log('📸 Aguardando renderização...');
      await new Promise(resolve => setTimeout(resolve, 1000));

      const pageContainer = iframeDoc.querySelector('.page-container');
      if (!pageContainer) {
        throw new Error('Elemento .page-container não encontrado');
      }

      console.log('📸 Capturando HTML como imagem...');

      // Capturar usando html2canvas
      const canvas = await window.html2canvas(pageContainer, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false
      });

      console.log('✅ Captura concluída. Gerando PDF...');

      // Criar PDF
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
        compress: true
      });

      // Calcular dimensões
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Adicionar imagem
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);

      // Nome do arquivo
      const nomeArquivo = this.gerarNomeArquivo(dadosProposta);

      // Baixar
      if (autoDownload) {
        pdf.save(nomeArquivo);
        console.log('✅ PDF baixado:', nomeArquivo);
      }

      // Limpar
      if (iframe && document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
      if (overlay && document.body.contains(overlay)) {
        document.body.removeChild(overlay);
      }

      return {
        nomeArquivo,
        pdfBlob: pdf.output('blob'),
        success: true
      };

    } catch (error) {
      console.error('❌ Erro ao gerar PDF:', error);

      // Limpar em caso de erro
      if (iframe && document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
      if (overlay && document.body.contains(overlay)) {
        document.body.removeChild(overlay);
      }

      throw error;
    }
  }

  // Criar layout HTML completo
  async criarLayoutHTML(dados) {
    // Calcular número de UCs para responsividade
    const numUCs = dados.ucs ? dados.ucs.length : 0;
    const scaleFactor = this.calcularScaleFactor(numUCs);

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Proposta ${dados.numeroProposta} - ${dados.nomeCliente}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Helvetica', 'Arial', sans-serif;
      background: white;
      color: #3c3c3c;
      padding: 0;
      margin: 0;
    }

    /* CSS Responsivo baseado em ${numUCs} UCs - Scale: ${scaleFactor.toFixed(2)} */
    :root {
      --scale-factor: ${scaleFactor};
    }

    .page-container {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      background: white;
      position: relative;
      padding: 0;
      padding-bottom: 70px; /* Espaço para rodapé - REDUZIDO */
      border: 0; /* SEM BORDAS */
      border-top: 15px solid #2c3e50; /* APENAS BORDA SUPERIOR */
    }

    /* Cabeçalho - RESPONSIVO */
    .header {
      background: #2c3e50;
      padding: calc(8px * var(--scale-factor)) 20px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: calc(45px * var(--scale-factor));
    }

    .header img {
      height: calc(38px * var(--scale-factor));
      width: auto;
    }

    .header h1 {
      color: white;
      font-size: calc(15px * var(--scale-factor));
      font-weight: bold;
      margin-left: 15px;
    }

    /* Seções - RESPONSIVAS */
    .section {
      padding: calc(8px * var(--scale-factor)) calc(25px * var(--scale-factor)) calc(10px * var(--scale-factor)) calc(25px * var(--scale-factor));
      border-bottom: 1px solid #d0d0d0;
    }

    .section-title {
      font-size: calc(13px * var(--scale-factor));
      font-weight: bold;
      color: #2c3e50;
      margin-bottom: calc(6px * var(--scale-factor));
      padding-bottom: calc(4px * var(--scale-factor));
      border-bottom: 2px solid #4caf50;
      display: inline-block;
      padding-right: 15px;
    }

    /* Informações do Cliente - RESPONSIVO */
    .client-info {
      display: flex;
      gap: calc(25px * var(--scale-factor));
      font-size: calc(10px * var(--scale-factor));
      margin-top: calc(4px * var(--scale-factor));
      background: #f8f9fa;
      padding: calc(8px * var(--scale-factor)) calc(12px * var(--scale-factor));
      border-radius: 3px;
      border-left: 3px solid #2c3e50;
    }

    .client-info .field {
      display: flex;
      gap: 6px;
      align-items: center;
    }

    .client-info .label {
      font-weight: bold;
      color: #2c3e50;
    }

    .client-info .field span:not(.label) {
      color: #444;
    }

    /* Plano Economia - RESPONSIVO */
    .economy-plan {
      display: flex;
      align-items: center;
      gap: calc(40px * var(--scale-factor));
      margin-top: calc(4px * var(--scale-factor));
      background: linear-gradient(135deg, #f0f9f4 0%, #e8f5e9 100%);
      padding: calc(10px * var(--scale-factor)) calc(15px * var(--scale-factor));
      border-radius: 4px;
      border: 2px solid #4caf50;
    }

    .economy-value {
      display: flex;
      align-items: center;
      gap: calc(10px * var(--scale-factor));
    }

    .economy-value .label {
      font-weight: bold;
      font-size: calc(11px * var(--scale-factor));
      color: #2c3e50;
    }

    .economy-value .value {
      font-size: calc(26px * var(--scale-factor));
      font-weight: bold;
      color: #2e7d32;
      text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
    }

    .fidelity {
      display: flex;
      align-items: center;
      gap: calc(8px * var(--scale-factor));
      background: white;
      padding: calc(6px * var(--scale-factor)) calc(12px * var(--scale-factor));
      border-radius: 3px;
      border: 1px solid #ddd;
    }

    .fidelity .label {
      font-weight: bold;
      font-size: calc(11px * var(--scale-factor));
      color: #2c3e50;
    }

    .fidelity .value {
      font-size: calc(12px * var(--scale-factor));
      font-weight: bold;
      color: #d32f2f;
    }

    /* Tabela de UCs - RESPONSIVA */
    .uc-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: calc(6px * var(--scale-factor));
      font-size: calc(9px * var(--scale-factor));
      table-layout: fixed;
    }

    .uc-table thead {
      background: #46648a;
      color: white;
    }

    .uc-table th {
      padding: calc(5px * var(--scale-factor)) calc(3px * var(--scale-factor));
      text-align: left;
      font-weight: bold;
      font-size: calc(8px * var(--scale-factor));
    }

    /* Larguras específicas das colunas */
    .uc-table th:nth-child(1),
    .uc-table td:nth-child(1) {
      width: 22%; /* Nome - AUMENTADO */
    }

    .uc-table th:nth-child(2),
    .uc-table td:nth-child(2) {
      width: 13%; /* Consumo - REDUZIDO */
    }

    .uc-table th:nth-child(3),
    .uc-table td:nth-child(3) {
      width: 12%; /* Sem Assinatura - REDUZIDO */
    }

    .uc-table th:nth-child(4),
    .uc-table td:nth-child(4) {
      width: 12%; /* Com Assinatura - REDUZIDO */
    }

    .uc-table th:nth-child(5),
    .uc-table td:nth-child(5) {
      width: 10%; /* Taxa Fixa - REDUZIDO */
    }

    .uc-table th:nth-child(6),
    .uc-table td:nth-child(6) {
      width: 15%; /* Economia Mensal */
    }

    .uc-table th:nth-child(7),
    .uc-table td:nth-child(7) {
      width: 16%; /* Economia Anual */
    }

    .uc-table tbody tr:nth-child(even) {
      background: #f8f8f8;
    }

    .uc-table td {
      padding: calc(4px * var(--scale-factor)) calc(3px * var(--scale-factor));
      font-size: calc(9px * var(--scale-factor));
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Gráfico Economia 5 Anos - RESPONSIVO */
    .chart-container {
      margin-top: calc(8px * var(--scale-factor));
      background: linear-gradient(to bottom, #f5f5f5 0%, #fafafa 100%);
      padding: calc(12px * var(--scale-factor));
      border-radius: 4px;
      border: 1px solid #e0e0e0;
      box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }

    .bars-container {
      display: flex;
      justify-content: space-around;
      align-items: flex-end;
      height: calc(140px * var(--scale-factor));
      margin-bottom: calc(10px * var(--scale-factor));
      position: relative;
      border-bottom: 2px solid #2c3e50;
      padding-bottom: calc(8px * var(--scale-factor));
    }

    .bar-wrapper {
      text-align: center;
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      height: 100%;
    }

    .bar {
      background: linear-gradient(to top, #1e3a5f 0%, #2c3e50 100%);
      border: 2px solid #1e324a;
      width: 75%;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px 4px 0 0;
      box-shadow: 0 -2px 8px rgba(0,0,0,0.15);
      transition: all 0.3s ease;
      /* Altura definida inline para cada barra */
    }

    .bar-value {
      color: white;
      font-weight: bold;
      font-size: calc(9px * var(--scale-factor));
      text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
    }

    .bar-label {
      margin-top: calc(6px * var(--scale-factor));
      font-weight: bold;
      font-size: calc(10px * var(--scale-factor));
      color: #2c3e50;
      background: white;
      padding: calc(3px * var(--scale-factor)) calc(6px * var(--scale-factor));
      border-radius: 3px;
      border: 1px solid #ddd;
    }

    .total-economy {
      font-size: calc(13px * var(--scale-factor));
      font-weight: bold;
      color: #2e7d32;
      text-align: center;
      margin-top: calc(10px * var(--scale-factor));
      padding: calc(8px * var(--scale-factor));
      background: white;
      border-radius: 4px;
      border: 2px solid #4caf50;
    }

    /* Benefícios - RESPONSIVO */
    .benefits-list {
      margin-top: calc(6px * var(--scale-factor));
      padding-left: calc(18px * var(--scale-factor));
    }

    .benefits-list li {
      margin-bottom: calc(4px * var(--scale-factor));
      font-size: calc(10px * var(--scale-factor));
      line-height: 1.4;
    }

    /* Rodapé */
    .footer {
      position: absolute;
      bottom: 25px;
      left: 40px;
      right: 40px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 11px;
    }

    .footer-contacts {
      text-align: left;
    }

    .footer-contacts p {
      margin: 4px 0;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .footer-contacts svg {
      width: 16px;
      height: 16px;
      flex-shrink: 0;
      vertical-align: middle;
    }

    .footer-slogan {
      text-align: center;
      flex: 1;
    }

    .footer-slogan img {
      max-width: 350px;
      height: auto;
    }

    .footer-wave {
      text-align: right;
    }

    .footer-wave img {
      max-width: 100px;
      height: auto;
    }

    @media print {
      .page-container {
        border: 12px solid #2c3e50;
        margin: 0;
        width: 210mm;
        min-height: 297mm;
      }

      body {
        margin: 0;
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="page-container">

    <!-- Cabeçalho -->
    <div class="header">
      ${this.imagensBase64.logo
        ? `<img src="${this.imagensBase64.logo}" alt="AUPUS Logo">`
        : '<div style="color: white; font-weight: bold; font-size: 16px;">AUPUS</div>'
      }
      <h1>Projeção de eficiência econômica</h1>
    </div>

    <!-- Informações do Cliente -->
    <div class="section">
      <div class="section-title">Cliente</div>
      <div class="client-info">
        <div class="field">
          <span class="label">Nome:</span>
          <span>${dados.nomeCliente || ''}</span>
        </div>
        <div class="field">
          <span class="label">Proposta:</span>
          <span>${dados.numeroProposta || ''}</span>
        </div>
        <div class="field">
          <span class="label">Data:</span>
          <span>${this.formatarData(dados.data)}</span>
        </div>
      </div>
    </div>

    <!-- Plano Economia -->
    <div class="section">
      <div class="section-title">Plano Economia</div>
      <div class="economy-plan">
        <div class="economy-value">
          <span class="label">Economia Esperada:</span>
          <span class="value">${this.calcularDescontoPercentual(dados.descontoTarifa)}%</span>
        </div>
        <div class="fidelity">
          <span class="label">Fidelidade:</span>
          <span class="value">NÃO</span>
        </div>
      </div>
    </div>

    <!-- Tabela de Unidades Consumidoras -->
    ${this.gerarTabelaUCs(dados.ucs, dados.tarifaTributos, dados.descontoTarifa)}

    <!-- Gráfico Economia 5 Anos -->
    ${this.gerarGraficoEconomia(dados)}

    <!-- Benefícios -->
    ${this.gerarBeneficios(dados.beneficios)}

    <!-- Rodapé -->
    <div class="footer">
      <div class="footer-contacts">
        <p>${this.getIconSVG('globe')} www.aupusenergia.com.br</p>
        <p>${this.getIconSVG('mail')} smart@aupusenergia.com.br</p>
        <p>${this.getIconSVG('phone')} (62) 9 9654-7888</p>
      </div>
      <div class="footer-slogan">
        ${this.imagensBase64.slogan
          ? `<img src="${this.imagensBase64.slogan}" alt="Interligando você com o futuro!">`
          : '<p style="color: #4caf50; font-style: italic; font-size: 14px;">Interligando você com o futuro!</p>'
        }
      </div>
      <div class="footer-wave">
        ${this.imagensBase64.onda
          ? `<img src="${this.imagensBase64.onda}" alt="Onda">`
          : ''
        }
      </div>
    </div>

  </div>
</body>
</html>`;

    return html;
  }

  // Gerar tabela de UCs
  gerarTabelaUCs(ucs, tarifaTributos, descontoTarifa) {
    if (!ucs || ucs.length === 0) return '';

    const maxLinhas = 18;
    const ucsParaMostrar = ucs.slice(0, maxLinhas);

    let html = `
    <div class="section">
      <div class="section-title">Unidades Consumidoras</div>
      <table class="uc-table">
        <thead>
          <tr>
            <th>Nome</th>
            <th>Consumo</th>
            <th>Sem<br>Assinatura</th>
            <th>Com<br>Assinatura</th>
            <th>Taxa<br>Fixa</th>
            <th>Economia<br>Mensal</th>
            <th>Economia<br>Anual</th>
          </tr>
        </thead>
        <tbody>`;

    ucsParaMostrar.forEach((uc, index) => {
      const consumo = parseFloat(uc.consumo) || 0;
      const tarifa = parseFloat(tarifaTributos) || 0.8;
      const desconto = parseFloat(descontoTarifa) || 0.2;

      const semAssinatura = consumo * tarifa;
      const economiaMensal = consumo * tarifa * desconto;
      const economiaAnual = economiaMensal * 12;
      const comAssinatura = consumo * tarifa * (1 - desconto);
      const taxaFixa = this.calcularTaxaFixa(uc.ligacao);

      const nomeUC = (uc.apelido || `UC ${index + 1}`).substring(0, 25); // AUMENTADO de 12 para 25

      // Formatar valores em reais com separadores de milhares
      const formatarReais = (valor) => {
        return valor.toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });
      };

      html += `
          <tr>
            <td>${nomeUC}</td>
            <td>${consumo.toFixed(0)} kWh</td>
            <td>R$ ${formatarReais(semAssinatura)}</td>
            <td>R$ ${formatarReais(comAssinatura)}</td>
            <td>R$ ${formatarReais(taxaFixa)}</td>
            <td>R$ ${formatarReais(economiaMensal)}</td>
            <td>R$ ${formatarReais(economiaAnual)}</td>
          </tr>`;
    });

    html += `
        </tbody>
      </table>`;

    if (ucs.length > maxLinhas) {
      html += `<p style="color: #b40000; font-size: 10px; margin-top: 5px;">+ ${ucs.length - maxLinhas} unidades adicionais</p>`;
    }

    html += `</div>`;

    return html;
  }

  // Calcular taxa fixa
  calcularTaxaFixa(ligacao) {
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
  }

  // Gerar gráfico de economia 5 anos - CORRIGIDO COM LIMITE E MODERAÇÃO E RESPONSIVO
  gerarGraficoEconomia(dados) {
    if (!dados.ucs || dados.ucs.length === 0 || !dados.tarifaTributos) {
      return '';
    }

    const economiaData = this.calcularEconomiaConsolidada(
      dados.ucs,
      dados.tarifaTributos,
      dados.descontoTarifa,
      dados.inflacao
    );

    // Calcular scale factor para responsividade
    const numUCs = dados.ucs ? dados.ucs.length : 0;
    const scaleFactor = this.calcularScaleFactor(numUCs);

    const valorMaximo = Math.max(...economiaData.economiasPorAno);
    const valorMinimo = Math.min(...economiaData.economiasPorAno);
    const alturaContainer = 140 * scaleFactor; // pixels - responsivo baseado em UCs
    const alturaMinima = 30 * scaleFactor; // pixels - altura mínima da barra (responsiva)
    const alturaMaximaPermitida = alturaContainer - (10 * scaleFactor); // Deixar margem no topo

    let html = `
    <div class="section">
      <div class="section-title">Economia nos próximos cinco anos</div>
      <div class="chart-container">
        <div class="bars-container">`;

    economiaData.economiasPorAno.forEach((valor, index) => {
      // Calcular altura proporcional com diferença moderada
      const espacoDisponivel = alturaMaximaPermitida - alturaMinima;

      // Normalizar valores com dampening para moderar a diferença visual
      // 40% base + 60% variável = diferença mais suave entre anos
      const range = valorMaximo - valorMinimo;
      const valorNormalizado = range > 0 ? (valor - valorMinimo) / range : 0;
      const valorDampened = 0.4 + (valorNormalizado * 0.6); // Dampening factor

      const alturaRelativa = valorDampened * espacoDisponivel;
      const alturaFinal = Math.min(alturaMinima + alturaRelativa, alturaMaximaPermitida); // Garantir que não ultrapassa

      // Log para debug
      console.log(`Ano ${index + 1}: Valor=${valor}, AlturaFinal=${alturaFinal}px (max: ${alturaMaximaPermitida}px)`);

      const valorFormatado = valor.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      });

      html += `
          <div class="bar-wrapper">
            <div class="bar" style="height: ${alturaFinal}px !important; min-height: ${alturaFinal}px !important; max-height: ${alturaFinal}px !important;">
              <span class="bar-value">${valorFormatado}</span>
            </div>
            <div class="bar-label">Ano ${index + 1}</div>
          </div>`;
    });

    const economiaFormatada = economiaData.economiaTotal.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    });

    html += `
        </div>
        <div class="total-economy">Economia Total: ${economiaFormatada}</div>
      </div>
    </div>`;

    return html;
  }

  // Calcular economia consolidada
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

  // Calcular economia por UC para 5 anos
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

  // Gerar benefícios
  gerarBeneficios(beneficios) {
    if (!beneficios || beneficios.length === 0) {
      return '';
    }

    const maxBeneficios = 10;
    const beneficiosParaMostrar = beneficios.slice(0, maxBeneficios);

    let html = `
    <div class="section">
      <div class="section-title">Informações e Benefícios</div>
      <ul class="benefits-list">`;

    beneficiosParaMostrar.forEach((beneficio, index) => {
      const numero = beneficio.numero || index + 1;
      const texto = beneficio.texto || beneficio.toString();
      html += `<li>${numero}. ${texto}</li>`;
    });

    html += `</ul>`;

    if (beneficios.length > maxBeneficios) {
      html += `<p style="color: #b40000; font-size: 10px; margin-top: 5px;">+ ${beneficios.length - maxBeneficios} benefícios adicionais</p>`;
    }

    html += `</div>`;

    return html;
  }

  // Formatar data - corrigido para evitar problemas de timezone
  formatarData(data) {
    if (!data) return '';
    try {
      // Extrair apenas a parte da data (YYYY-MM-DD) ignorando timezone
      const dataString = data.toString();

      // Se a data estiver no formato ISO (YYYY-MM-DD ou YYYY-MM-DDTHH:mm:ss)
      if (dataString.includes('-')) {
        const [ano, mes, dia] = dataString.split('T')[0].split('-');
        return `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${ano}`;
      }

      // Fallback para formato padrão
      return new Date(data).toLocaleDateString('pt-BR');
    } catch (error) {
      console.error('Erro ao formatar data:', error);
      return '';
    }
  }

  // Calcular desconto percentual
  calcularDescontoPercentual(desconto) {
    return Math.round((desconto || 0.2) * 100);
  }

  // Gerar nome do arquivo
  gerarNomeArquivo(dados) {
    const proposta = dados.numeroProposta?.replace(/[/\\]/g, '_') || 'Proposta';
    const cliente = dados.nomeCliente?.replace(/[^a-zA-Z0-9]/g, '_') || 'Cliente';
    const timestamp = new Date().toISOString().slice(0, 10);

    return `${proposta}_${cliente}_${timestamp}.pdf`;
  }

  // Formatar dados para HTML
  formatarDadosParaHTML(proposta) {
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

  // Formatar UCs para HTML
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

  // Formatar benefícios para HTML
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
    return await generator.gerarHTML(dadosProposta, autoDownload);
  }

  static async baixarPDFDeProposta(proposta, autoDownload = true) {
    const generator = new PDFGenerator();
    const dadosFormatados = generator.formatarDadosParaHTML(proposta);
    return await generator.gerarHTML(dadosFormatados, autoDownload);
  }
}

// Exportar para uso em outros arquivos
export default PDFGenerator;

// Disponibilizar globalmente para compatibilidade
if (typeof window !== 'undefined') {
  window.PDFGenerator = PDFGenerator;
}
