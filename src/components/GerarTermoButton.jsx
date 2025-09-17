// src/components/GerarTermoButton.jsx - NOVO FLUXO SEPARADO

import React, { useState, useEffect } from 'react';
import { FileText, Send, Eye, X, Loader, Mail, MessageCircle, Download } from 'lucide-react';
import './GerarTermoButton.css';

const GerarTermoButton = ({ 
  dados, 
  onSalvarAntes, 
  onClose,
  statusDocumento: statusDocumentoProp, 
  setStatusDocumento: setStatusDocumentoProp 
}) => {
  const [statusDocumentoLocal, setStatusDocumentoLocal] = useState(null);
  const statusDocumento = statusDocumentoProp || statusDocumentoLocal;
  const setStatusDocumento = setStatusDocumentoProp || setStatusDocumentoLocal;
  const [loading, setLoading] = useState(false);
  const [etapa, setEtapa] = useState('inicial'); 
  const [pdfGerado, setPdfGerado] = useState(null);
  const [mostrarOpcoesEnvio, setMostrarOpcoesEnvio] = useState(false);
  const [envioWhatsApp, setEnvioWhatsApp] = useState(false);
  const [envioEmail, setEnvioEmail] = useState(true);
  const [mostrarUploadManual, setMostrarUploadManual] = useState(false);
  const [arquivoUpload, setArquivoUpload] = useState(null);

  useEffect(() => {
    if (!dados?.propostaId) return;

    const verificarEstado = async () => {
      try {
        // 1. Verificar PDF temporário
        const pdfTempResponse = await fetch(
          `${process.env.REACT_APP_API_URL}/documentos/propostas/${dados.propostaId}/pdf-temporario`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('aupus_token')}`,
            }
          }
        );

        if (pdfTempResponse.ok) {
          const result = await pdfTempResponse.json();
          if (result.success) {
            console.log('📄 PDF temporário encontrado:', result.pdf);
            setPdfGerado(result.pdf);
            setEtapa('pdf-gerado');
            return;
          }
        }

        // 2. Se não tem PDF temporário, verificar documento enviado
        const statusResponse = await fetch(
          `${process.env.REACT_APP_API_URL}/documentos/propostas/${dados.propostaId}/status`,  // ✅ GET /status
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('aupus_token')}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (statusResponse.ok) {
          const result = await statusResponse.json();
          if (result.success && result.documento) {
            console.log('📄 Documento existente encontrado:', result.documento);
            setStatusDocumento(result.documento);
          }
        }

      } catch (error) {
        console.error('Erro ao verificar estado:', error);
      }
    };

    verificarEstado();
  }, [dados?.propostaId, setStatusDocumento]);

  useEffect(() => {
    const buscarStatusDocumento = async () => {
      if (!dados?.propostaId) return;

      try {
        const response = await fetch(
          `${process.env.REACT_APP_API_URL}/documentos/propostas/${dados.propostaId}/status`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('aupus_token')}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (response.ok) {
          const result = await response.json();
          if (result.success && result.documento) {
            console.log('📄 Documento existente encontrado:', result.documento);
            
            // ✅ VERIFICAR SE setStatusDocumento É FUNÇÃO
            if (typeof setStatusDocumento === 'function') {
              setStatusDocumento(result.documento);
            } else {
              console.error('setStatusDocumento não é uma função:', setStatusDocumento);
            }
          }
        }
      } catch (error) {
        console.error('Erro ao buscar status do documento:', error);
      }
    };

    buscarStatusDocumento();
  }, [dados?.propostaId, setStatusDocumento]);

    // Determinar etapa atual baseada no status do documento
    useEffect(() => {
      if (statusDocumento) {
        if (statusDocumento.status === 'signed' || statusDocumento.status === 'SIGNED' || statusDocumento.status === 'Assinado') {
          setEtapa('assinado');
        } else if (
          statusDocumento.status === 'rejected' || 
          statusDocumento.status === 'REJECTED' || 
          statusDocumento.status === 'Rejeitado'
        ) {
          // ✅ NOVA ETAPA: Documento foi rejeitado
          setEtapa('rejeitado');
        } else if (
          statusDocumento.status === 'pending' || 
          statusDocumento.status === 'PENDING' || 
          statusDocumento.status === 'Pendente' ||
          statusDocumento.status === 'Aguardando Assinatura'
        ) {
          setEtapa('pendente-assinatura');
        } else {
          setEtapa('inicial');
        }
      } else if (pdfGerado) {
        setEtapa('pdf-gerado');
      } else {
        setEtapa('inicial');
      }
    }, [statusDocumento, pdfGerado]);

  // NOVO useEffect - Lógica automática de checkboxes baseada nos campos preenchidos
  useEffect(() => {
    const emailPreenchido = dados?.emailRepresentante && dados.emailRepresentante.trim() !== '';
    const whatsappPreenchido = dados?.whatsappRepresentante && dados.whatsappRepresentante.trim() !== '';
    
    if (emailPreenchido && whatsappPreenchido) {
      // Ambos preenchidos - preferir WhatsApp
      setEnvioWhatsApp(true);
      setEnvioEmail(false);
    } else if (emailPreenchido && !whatsappPreenchido) {
      // Só email preenchido
      setEnvioEmail(true);
      setEnvioWhatsApp(false);
    } else if (!emailPreenchido && whatsappPreenchido) {
      // Só WhatsApp preenchido
      setEnvioWhatsApp(true);
      setEnvioEmail(false);
    } else {
      // Nenhum preenchido - deixar ambos desmarcados
      setEnvioEmail(false);
      setEnvioWhatsApp(false);
    }
  }, [dados?.emailRepresentante, dados?.whatsappRepresentante]);

  console.log('DEBUG GerarTermoButton:', {
    etapa,
    pdfGerado,
    statusDocumento,
  });

  

  // NOVA FUNÇÃO: Gerar PDF apenas (sem enviar) - USANDO ENDPOINTS DEFINITIVOS
  const gerarPdfApenas = async () => {
    if (!dados.nomeRepresentante || dados.nomeRepresentante.trim() === '') {
      alert('❌ É necessário informar o nome do representante para gerar o termo.');
      return;
    }

    if (!dados.nomeCliente || dados.nomeCliente.trim() === '') {
      alert('❌ É necessário informar o nome do cliente para gerar o termo.');
      return;
    }

    setLoading(true);
    try {
      // Salvar dados antes se necessário
      if (onSalvarAntes) {
        await onSalvarAntes({
          ...dados,
          termoAdesao: null // Limpar termo antigo
        });
      }

      console.log('📄 Gerando PDF apenas...');
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/documentos/propostas/${dados.propostaId}/gerar-pdf-apenas`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('aupus_token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(dados)
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        if (result.requires_frontend_processing) {
          // PDF precisa ser processado no frontend
          console.log('📤 Processando PDF no frontend...');
          await processarPDFNoFrontend(result.dados, result.template_url);
        } else {
          // PDF foi gerado no backend
          console.log('✅ PDF gerado no backend:', result.pdf);
          setPdfGerado(result.pdf);
          setEtapa('pdf-gerado');
          alert('✅ PDF gerado com sucesso! Você pode visualizá-lo antes de enviar.');
        }
      } else {
        console.error('❌ Erro ao gerar PDF:', result);
        alert(`❌ Erro: ${result.message}`);
      }

    } catch (error) {
      console.error('❌ Erro interno:', error);
      alert('❌ Erro interno ao gerar PDF. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const enviarParaAutentique = async () => {
    if (!pdfGerado && !statusDocumento) {
      alert('Gere o PDF primeiro antes de enviar.');
      return;
    }

    // Validação para envio Autentique - só validar campo se checkbox marcado
    if (envioEmail) {
      if (!dados.emailRepresentante || dados.emailRepresentante.trim() === '') {
        alert('❌ Para enviar por E-mail, é necessário informar o email do representante');
        return;
      }
    }

    if (envioWhatsApp) {
      if (!dados.whatsappRepresentante || dados.whatsappRepresentante.trim() === '') {
        alert('❌ Para enviar por WhatsApp, é necessário informar o número do representante');
        return;
      }
      
      const telefone = dados.whatsappRepresentante.replace(/\D/g, '');
      if (telefone.length < 10 || telefone.length > 13) {
        alert('❌ Formato de WhatsApp inválido. Use: (11) 99999-9999');
        return;
      }
    }

    if (!envioEmail && !envioWhatsApp) {
      alert('❌ Selecione pelo menos uma forma de envio');
      return;
    }

    // Resto da função continua igual...
    setLoading(true);
    try {
      console.log('📤 Enviando PDF para Autentique...');
      
      const dadosEnvio = {
        ...dados,
        nome_arquivo_temp: pdfGerado?.nome,
        enviar_whatsapp: envioWhatsApp,
        enviar_email: envioEmail
      };

      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/documentos/propostas/${dados.propostaId}/enviar-para-autentique`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('aupus_token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(dadosEnvio)
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        console.log('✅ Enviado para Autentique:', result.documento);
        
        const documento = result.documento;
        
        let mensagemSucesso = `✅ ${result.message}`;
        
        if (documento.canais_envio_texto) {
          mensagemSucesso += `\n\n📤 Enviado via: ${documento.canais_envio_texto}`;
        }
        
        if (documento.destinatario_exibicao) {
          const isEmail = documento.destinatario_exibicao.includes('@');
          const tipoPara = isEmail ? '📧 Para' : '📱 Para';
          mensagemSucesso += `\n${tipoPara}: ${documento.destinatario_exibicao}`;
        }
        
        alert(mensagemSucesso);

        if (documento.link_assinatura && 
            window.confirm('Deseja abrir o link de assinatura agora?')) {
          window.open(documento.link_assinatura, '_blank');
        }
        
        setStatusDocumento(documento);
        setEtapa('pendente-assinatura');
        setPdfGerado(null);
        
        if (onClose && typeof onClose === 'function') {
          setTimeout(() => onClose(), 2000);
        }
        
      } else {
        console.error('❌ Erro ao enviar:', result);
        alert(`❌ Erro: ${result.message || 'Erro desconhecido'}`);
      }

    } catch (error) {
      console.error('❌ Erro interno:', error);
      alert('❌ Erro interno. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const resetarDocumentoRejeitado = async () => {
    if (!dados?.propostaId) return;

    if (!window.confirm('Deseja gerar um novo termo? O documento rejeitado será removido.')) {
      return;
    }

    setLoading(true);
    try {
      console.log('🔄 Resetando documento rejeitado...');
      
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/documentos/propostas/${dados.propostaId}/resetar-rejeitado`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('aupus_token')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        console.log('✅ Documento rejeitado resetado:', result);
        
        // Resetar estado completamente
        setStatusDocumento(null);
        setPdfGerado(null);
        setEtapa('inicial');
        setMostrarOpcoesEnvio(false);
        
        alert(`✅ ${result.message}`);

      } else {
        console.error('❌ Erro ao resetar:', result);
        alert(`❌ Erro: ${result.message || 'Erro desconhecido'}`);
      }

    } catch (error) {
      console.error('❌ Erro interno:', error);
      alert('❌ Erro interno. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };
  // NOVA FUNÇÃO: Cancelar documento na Autentique

  const cancelarDocumento = async () => {
    if (!statusDocumento) return;

    if (!window.confirm('Tem certeza que deseja cancelar o termo enviado? O cliente não poderá mais assiná-lo.')) {
      return;
    }

    setLoading(true);
    try {
      console.log('🚫 Cancelando documento pendente...', {
        proposta_id: dados.propostaId,
        documento_id: statusDocumento.id
      });
      
      // ✅ USAR A ROTA QUE JÁ EXISTE E FUNCIONA
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/documentos/propostas/${dados.propostaId}/cancelar-pendente`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('aupus_token')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        console.log('✅ Documento cancelado:', result);
        
        // Resetar estado completamente
        setStatusDocumento(null);
        setPdfGerado(null);
        setEtapa('inicial');
        setMostrarOpcoesEnvio(false);
        
        alert(`✅ ${result.message} Agora você pode gerar um novo termo.`);

      } else {
        console.error('❌ Erro ao cancelar:', result);
        
        // Tratar erros específicos
        if (response.status === 404) {
          alert('⚠️ Nenhum documento pendente encontrado. O termo pode já ter sido assinado ou cancelado.');
          // Resetar estado mesmo assim
          setStatusDocumento(null);
          setPdfGerado(null);
          setEtapa('inicial');
        } else {
          alert(`❌ Erro ao cancelar: ${result.message}`);
        }
      }

    } catch (error) {
      console.error('❌ Erro interno ao cancelar:', error);
      alert('❌ Erro interno ao cancelar documento. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Função para processar PDF no frontend (caso necessário)
  const processarPDFNoFrontend = async (dadosPDF, templateUrl) => {
    try {
      // Aqui seria implementada a lógica de preenchimento com pdf-lib
      // Por enquanto, vamos simular
      console.log('🔄 Processamento no frontend ainda não implementado');
      alert('⚠️ Processamento no frontend ainda não está disponível. Use o PDFtk no servidor.');
    } catch (error) {
      console.error('❌ Erro ao processar PDF no frontend:', error);
      alert('❌ Erro ao processar PDF no frontend.');
    }
  };

  // Visualizar PDF gerado ou enviado
  const visualizarPDFTermo = async () => {
    console.log('📄 Visualizando PDF - Debug:', {
      pdfGerado: !!pdfGerado,
      pdfGerado_url: pdfGerado?.url,
      statusDocumento: !!statusDocumento,
      etapa,
      propostaId: dados?.propostaId
    });

    try {
      // ✅ PRIORIDADE 1: PDF temporário (se ainda existir)
      if (pdfGerado?.url) {
        console.log('📄 Usando PDF temporário:', pdfGerado.url);
        window.open(pdfGerado.url, '_blank');
        return;
      }

      // ✅ PRIORIDADE 2: Buscar PDF original do servidor
      if (statusDocumento && dados?.propostaId) {
        console.log('📄 Buscando PDF original do servidor...');
        
        try {
          const response = await fetch(
            `${process.env.REACT_APP_API_URL}/documentos/propostas/${dados.propostaId}/pdf-original`,
            {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('aupus_token')}`
              }
            }
          );

          if (response.ok) {
            console.log('✅ PDF encontrado no servidor');
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const newWindow = window.open(url, '_blank');
            
            // Limpar URL após um tempo
            setTimeout(() => window.URL.revokeObjectURL(url), 10000);
            
            if (!newWindow) {
              alert('Pop-up bloqueado. Permita pop-ups para visualizar o PDF.');
            }
            return;
          } else {
            console.warn('⚠️ PDF não encontrado no servidor (status:', response.status, ')');
          }
        } catch (serverError) {
          console.warn('⚠️ Erro ao buscar PDF do servidor:', serverError.message);
        }
      }

      // ✅ PRIORIDADE 3: Tentar regenerar PDF temporariamente
      if (dados?.propostaId) {
        console.log('🔄 Tentando regenerar PDF para visualização...');
        
        try {
          const regenerarResponse = await fetch(
            `${process.env.REACT_APP_API_URL}/documentos/propostas/${dados.propostaId}/gerar-pdf-apenas`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('aupus_token')}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(dados)
            }
          );

          if (regenerarResponse.ok) {
            const result = await regenerarResponse.json();
            if (result.success && result.pdf?.url) {
              console.log('✅ PDF regenerado para visualização');
              window.open(result.pdf.url, '_blank');
              return;
            }
          }
        } catch (regenError) {
          console.warn('⚠️ Erro ao regenerar PDF:', regenError.message);
        }
      }

      // ✅ FALLBACK: Mensagem amigável
      alert('⚠️ PDF não disponível para visualização no momento. Tente fechar e abrir o modal novamente.');

    } catch (error) {
      console.error('❌ Erro ao visualizar PDF:', error);
      alert('❌ Erro ao abrir PDF. Tente novamente em alguns segundos.');
    }
  };

  const visualizarPDFAssinado = async () => {
    if (!dados?.propostaId) {
      alert('❌ ID da proposta não encontrado.');
      return;
    }

    setLoading(true);
    try {
      console.log('📥 Buscando PDF assinado da proposta:', dados.propostaId);
      
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/documentos/propostas/${dados.propostaId}/pdf-assinado`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('aupus_token')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const result = await response.json();

      if (response.ok && result.success && result.documento?.url) {
        console.log('✅ PDF assinado encontrado:', result.documento);
        console.log('🔍 Fonte:', result.source); // 'autentique' | 'local_cache'
        
        // Abrir PDF em nova aba
        window.open(result.documento.url, '_blank');
        
      } else if (result.needs_manual_upload) {
        // Caso especial: documento histórico precisa de upload
        console.log('📋 Upload manual necessário');
        setMostrarUploadManual(true);
        
      } else {
        console.error('❌ Erro ao buscar PDF assinado:', result);
        alert(`❌ ${result.message || 'Erro ao buscar documento assinado.'}`);
      }

    } catch (error) {
      console.error('❌ Erro interno ao buscar PDF assinado:', error);
      alert('❌ Erro interno. Verifique sua conexão e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const uploadTermoManual = async () => {
    if (!arquivoUpload) {
      alert('Selecione um arquivo PDF primeiro.');
      return;
    }

    const formData = new FormData();
    formData.append('arquivo', arquivoUpload);

    setLoading(true);
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/documentos/propostas/${dados.propostaId}/upload-termo-assinado`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('aupus_token')}`
          },
          body: formData
        }
      );

      const result = await response.json();

      if (response.ok && result.success) {
        alert('✅ Termo assinado enviado com sucesso!');
        setMostrarUploadManual(false);
        setArquivoUpload(null);
        
        // Abrir o PDF enviado
        if (result.documento?.url) {
          window.open(result.documento.url, '_blank');
        }
      } else {
        alert(`❌ Erro: ${result.message}`);
      }

    } catch (error) {
      console.error('❌ Erro no upload:', error);
      alert('❌ Erro interno no upload.');
    } finally {
      setLoading(false);
    }
  };

  // Campos obrigatórios faltantes
  const camposFaltantes = [];
  if (!dados?.nomeRepresentante) camposFaltantes.push('Nome do Representante');
  if (!dados?.nomeCliente) camposFaltantes.push('Nome do Cliente');

  // RENDERIZAÇÃO BASEADA NA ETAPA
  return (
    <div className="gerar-termo-container">
        
      {/* ETAPA INICIAL - Nenhum termo gerado */}
      {etapa === 'inicial' && (
        <>
          {(!dados?.nomeRepresentante || !dados?.nomeCliente) && (
            <div className="campos-faltantes">
              <strong>Campos obrigatórios:</strong> {camposFaltantes.join(', ')}
            </div>
          )}
          
          <button
            onClick={gerarPdfApenas}
            disabled={loading || !dados?.nomeRepresentante || !dados?.nomeCliente}
            className={`btn btn-primary ${loading ? 'loading' : ''}`}
          >
            {loading ? (
              <>
                <Loader className="animate-spin" size={16} />
                Gerando PDF...
              </>
            ) : (
              <>
                <FileText size={16} />
                Gerar Termo de Adesão
              </>
            )}
          </button>
        </>
      )}

      {/* ETAPA PDF GERADO - Mostrar opções de visualizar e enviar */}
      {etapa === 'pdf-gerado' && pdfGerado && (
        <>
          <div className="status-info text-success">
            <strong>✅ PDF gerado:</strong> {pdfGerado.nome}
            <br />
            <small>Tamanho: {Math.round(pdfGerado.tamanho / 1024)} KB | {pdfGerado.gerado_em}</small>
          </div>

          <button
            onClick={visualizarPDFTermo}
            className="btn btn-warning"
          >
            <Eye size={16} />
            Visualizar PDF
          </button>

          <button
            onClick={(e) => {
              e.preventDefault(); // Prevenir submit do form
              e.stopPropagation(); // Prevenir propagação
              setMostrarOpcoesEnvio(!mostrarOpcoesEnvio);
            }}
            className="btn btn-success"
          >
            <Send size={16} />
            Enviar para Assinatura
          </button>

          {mostrarOpcoesEnvio && (
            <div className="opcoes-envio">
              <h5>Como enviar?</h5>
              <p className="opcoes-help">Selecione apenas uma opção:</p>
              
              {/* Checkbox Email - com ícone Lucide */}
              <label 
                className={`checkbox-label-custom ${envioEmail ? 'checked' : ''} ${(!dados?.emailRepresentante || dados.emailRepresentante.trim() === '') ? 'disabled' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  // Só permitir clicar se campo estiver preenchido
                  if (dados?.emailRepresentante && dados.emailRepresentante.trim() !== '') {
                    setEnvioEmail(true);
                    setEnvioWhatsApp(false); // Desmarcar o outro
                  }
                }}
              >
                <div className="checkbox-container-custom">
                  <input
                    type="checkbox"
                    checked={envioEmail}
                    onChange={() => {}} // Desabilitado - usar apenas o onClick do label
                    className="checkbox-input-hidden"
                    id="envio-email"
                    disabled={!dados?.emailRepresentante || dados.emailRepresentante.trim() === ''}
                  />
                  <div className={`checkbox-visual-custom ${envioEmail ? 'checked' : ''}`}>
                    {envioEmail && (
                      <svg 
                        width="12" 
                        height="12" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20,6 9,17 4,12"></polyline>
                      </svg>
                    )}
                  </div>
                </div>
                <div className="checkbox-content-custom">
                  <Mail size={16} className="checkbox-icon-custom" />
                  <span className="checkbox-text-custom">
                    E-mail
                    {(!dados?.emailRepresentante || dados.emailRepresentante.trim() === '') && 
                      <small style={{color: '#dc3545', marginLeft: '8px'}}>(campo não preenchido)</small>
                    }
                  </span>
                </div>
              </label>
              
              {/* Checkbox WhatsApp - com ícone Lucide */}
              <label 
                className={`checkbox-label-custom ${envioWhatsApp ? 'checked' : ''} ${(!dados?.whatsappRepresentante || dados.whatsappRepresentante.trim() === '') ? 'disabled' : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  // Só permitir clicar se campo estiver preenchido
                  if (dados?.whatsappRepresentante && dados.whatsappRepresentante.trim() !== '') {
                    setEnvioWhatsApp(true);
                    setEnvioEmail(false); // Desmarcar o outro
                  }
                }}
              >
                <div className="checkbox-container-custom">
                  <input
                    type="checkbox"
                    checked={envioWhatsApp}
                    onChange={() => {}} // Desabilitado - usar apenas o onClick do label
                    className="checkbox-input-hidden"
                    id="envio-whatsapp"
                    disabled={!dados?.whatsappRepresentante || dados.whatsappRepresentante.trim() === ''}
                  />
                  <div className={`checkbox-visual-custom ${envioWhatsApp ? 'checked' : ''}`}>
                    {envioWhatsApp && (
                      <svg 
                        width="12" 
                        height="12" 
                        viewBox="0 0 24 24" 
                        fill="none" 
                        stroke="currentColor" 
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20,6 9,17 4,12"></polyline>
                      </svg>
                    )}
                  </div>
                </div>
                <div className="checkbox-content-custom">
                  <MessageCircle size={16} className="checkbox-icon-custom" />
                  <span className="checkbox-text-custom">
                    WhatsApp
                    {(!dados?.whatsappRepresentante || dados.whatsappRepresentante.trim() === '') && 
                      <small style={{color: '#dc3545', marginLeft: '8px'}}>(campo não preenchido)</small>
                    }
                  </span>
                </div>
              </label>
              
              {/* Validação visual - ATUALIZADA */}
              {!envioEmail && !envioWhatsApp && (
                <div className="opcoes-erro">
                  <X size={14} />
                  <span>
                    {(!dados?.emailRepresentante || dados.emailRepresentante.trim() === '') && (!dados?.whatsappRepresentante || dados.whatsappRepresentante.trim() === '') ?
                      'Preencha pelo menos um dos campos (E-mail ou WhatsApp) para enviar' :
                      'Selecione uma opção de envio'
                    }
                  </span>
                </div>
              )}

              {/* REMOVER a mensagem de duplo envio - não vai mais acontecer */}
              {(envioEmail || envioWhatsApp) && (
                <div className="opcoes-sucesso">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20,6 9,17 4,12"></polyline>
                  </svg>
                  <span>
                    Será enviado por {envioEmail ? 'E-mail' : 'WhatsApp'}
                  </span>
                </div>
              )}
                                
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  enviarParaAutentique();
                }}
                disabled={loading || (!envioEmail && !envioWhatsApp)}
                className={`btn btn-primary ${loading ? 'loading' : ''} ${(!envioEmail && !envioWhatsApp) ? 'btn-disabled' : ''}`}
              >
                {loading ? (
                  <>
                    <Loader className="animate-spin" size={16} />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Confirmar Envio
                    {envioEmail ? ' (E-mail)' : envioWhatsApp ? ' (WhatsApp)' : ''}
                  </>
                )}
              </button>
            </div>
          )}


          <button
            onClick={() => {
              setPdfGerado(null);
              setEtapa('inicial');
            }}
            className="btn btn-secondary"
          >
            🔄 Gerar Novamente
          </button>
        </>
      )}

      {/* ETAPA PENDENTE - Aguardando assinatura */}
      {etapa === 'pendente-assinatura' && statusDocumento && (
        <>
          <div className="status-info">
            <div className="status-header">
              <strong>⏳ Aguardando Assinatura</strong>
              <span className="status-badge pendente">
                {statusDocumento.status_label || statusDocumento.status || 'Pendente'}
              </span>
            </div>
            
            <div className="status-details">
              {/* ✅ VERIFICAR SE É DUPLO ENVIO */}
              {statusDocumento.duplo_envio || (statusDocumento.envio_email && statusDocumento.envio_whatsapp) ? (
                // ✅ DUPLO ENVIO - Mostrar ambos os canais
                <>
                  <p><strong>📤 Enviado simultaneamente via:</strong> E-mail e WhatsApp</p>
                  <p><strong>📧 E-mail:</strong> {statusDocumento.signer_email || statusDocumento.email_signatario}</p>
                  <p><strong>📱 WhatsApp:</strong> {statusDocumento.whatsapp_formatado || dados?.whatsappRepresentante}</p>
                  
                  {statusDocumento.total_signatarios > 1 && (
                    <p><strong>🔗 Links criados:</strong> {statusDocumento.total_signatarios} (um para cada canal)</p>
                  )}
                  
                  <div className="duplo-envio-info">
                    <small>ℹ️ O cliente pode assinar através de qualquer um dos dois canais. Ambos os links são válidos e independentes.</small>
                  </div>
                </>
              ) : statusDocumento.envio_whatsapp && !statusDocumento.envio_email ? (
                // ENVIADO APENAS POR WHATSAPP
                <>
                  <p><strong>📱 Enviado por WhatsApp para:</strong> {statusDocumento.whatsapp_formatado || statusDocumento.destinatario_exibicao}</p>
                  <p><small>ℹ️ Cliente receberá o link de assinatura via WhatsApp</small></p>
                </>
              ) : (
                // ENVIADO APENAS POR EMAIL (padrão)
                <>
                  <p><strong>📧 Enviado por E-mail para:</strong> {statusDocumento.signer_email || statusDocumento.email_signatario}</p>
                </>
              )}
              
              <p><strong>📅 Enviado em:</strong> {statusDocumento.criado_em}</p>
              
              {statusDocumento.link_assinatura && (
                <p><strong>🔗 Link(s) de assinatura</strong> disponível(eis) e ativo(s)</p>
              )}
            </div>
          </div>

          {/* ✅ CSS para destacar informações de duplo envio */}
          <style jsx>{`
            .duplo-envio-info {
              margin-top: 12px;
              padding: 8px 12px;
              background: #e7f3ff;
              border: 1px solid #b3d9ff;
              border-radius: 6px;
              color: #0066cc;
            }
            
            .duplo-envio-info small {
              font-size: 12px;
              line-height: 1.4;
            }
          `}</style>

          <div className="acoes-documento">
            {/* Manter os botões existentes */}
            <button
              onClick={visualizarPDFTermo}
              className="btn btn-info"
              title="Visualizar o termo que foi enviado ao cliente"
            >
              <Eye size={16} />
              Ver Termo Enviado
            </button>

            {statusDocumento.link_assinatura && (
              <button
                onClick={() => window.open(statusDocumento.link_assinatura, '_blank')}
                className="btn btn-success"
                title={statusDocumento.duplo_envio ? 
                  "Abrir um dos links de assinatura (cliente pode usar qualquer um)" :
                  "Abrir link de assinatura (mesmo link que o cliente recebeu)"
                }
              >
                <FileText size={16} />
                {statusDocumento.duplo_envio ? 'Ver Links' : 'Link de Assinatura'}
              </button>
            )}

            <button
              onClick={cancelarDocumento}
              disabled={loading}
              className={`btn btn-danger ${loading ? 'loading' : ''}`}
              title={statusDocumento.duplo_envio ? 
                "Cancelar todos os links de assinatura enviados ao cliente" :
                "Cancelar link de assinatura enviado ao cliente"
              }
            >
              {loading ? (
                <>
                  <Loader className="animate-spin" size={16} />
                  Cancelando...
                </>
              ) : (
                <>
                  <X size={16} />
                  {statusDocumento.duplo_envio ? 'Cancelar Links' : 'Cancelar Link'}
                </>
              )}
            </button>
          </div>
        </>
      )}

      {/* ✅ NOVA ETAPA REJEITADO - Documento foi rejeitado pelo cliente */}
      {etapa === 'rejeitado' && statusDocumento && (
        <>
          <div className="status-info">
            <div className="status-header">
              <strong>❌ Documento Rejeitado</strong>
              <span className="status-badge rejeitado">
                {statusDocumento.status_label || 'Rejeitado'}
              </span>
            </div>
            
            <div className="status-details">
              <p><strong>👤 Rejeitado por:</strong> {statusDocumento.email_signatario || 'Cliente'}</p>
              <p><strong>📅 Rejeitado em:</strong> {statusDocumento.updated_at ? new Date(statusDocumento.updated_at).toLocaleString('pt-BR') : 'Data não disponível'}</p>
              
              {statusDocumento.rejection_reason && (
                <div className="rejection-reason">
                  <p><strong>📝 Motivo da rejeição:</strong></p>
                  <div className="reason-text">{statusDocumento.rejection_reason}</div>
                </div>
              )}
            </div>
            
            <div className="rejection-info">
              <small>
                ℹ️ O cliente rejeitou a assinatura do documento. 
                Você pode gerar um novo termo com as informações atualizadas.
              </small>
            </div>
          </div>

          <div className="acoes-documento">
            <button
              onClick={resetarDocumentoRejeitado}
              disabled={loading}
              className={`btn btn-primary ${loading ? 'loading' : ''}`}
            >
              {loading ? (
                <>
                  <Loader className="animate-spin" size={16} />
                  Resetando...
                </>
              ) : (
                <>
                  <FileText size={16} />
                  Gerar Novo Termo
                </>
              )}
            </button>
          </div>
        </>
      )}
      
      {/* ETAPA ASSINADO - com upload manual */}
      {etapa === 'assinado' && statusDocumento && (
        <>
          <div className="status-info">
            <div className="status-header">
              <strong>✅ Documento Assinado</strong>
              <span className="status-badge assinado">
                {statusDocumento.status_label || 'Assinado'}
              </span>
            </div>
            
            <div className="status-details">
              <p><strong>👤 Assinado por:</strong> {statusDocumento.email_signatario || 'Cliente'}</p>
              <p><strong>📅 Assinado em:</strong> {statusDocumento.data_assinatura || statusDocumento.updated_at}</p>
            </div>
          </div>

          <div className="acoes-documento">
            <button
              onClick={visualizarPDFAssinado}
              disabled={loading}
              className={`btn btn-success ${loading ? 'loading' : ''}`}
            >
              {loading ? (
                <>
                  <Loader className="animate-spin" size={16} />
                  Carregando...
                </>
              ) : (
                <>
                  <Eye size={16} />
                  Ver Documento Assinado
                </>
              )}
            </button>
          </div>

          {/* MODAL DE UPLOAD MANUAL */}
          {mostrarUploadManual && (
            <div className="upload-manual-container">
              <h5>📄 Upload do Termo Assinado</h5>
              <p>Este documento foi assinado antes da implementação digital. Por favor, faça o upload do termo assinado:</p>
              
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setArquivoUpload(e.target.files[0])}
                className="upload-input"
              />
              
              <div className="upload-actions">
                <button
                  onClick={uploadTermoManual}
                  disabled={!arquivoUpload || loading}
                  className="btn btn-primary"
                >
                  {loading ? 'Enviando...' : 'Enviar Termo'}
                </button>
                
                <button
                  onClick={() => {
                    setMostrarUploadManual(false);
                    setArquivoUpload(null);
                  }}
                  className="btn btn-secondary"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default GerarTermoButton;