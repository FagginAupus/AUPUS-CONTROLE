// src/components/GerarTermoButton.jsx - NOVO FLUXO SEPARADO

import React, { useState, useEffect } from 'react';
import { FileText, Send, Eye, X, Loader } from 'lucide-react';
import './GerarTermoButton.css';

const GerarTermoButton = ({ 
  dados, 
  onSalvarAntes, 
  statusDocumento: statusDocumentoProp, 
  setStatusDocumento: setStatusDocumentoProp 
}) => {
  const [statusDocumentoLocal, setStatusDocumentoLocal] = useState(null);
  const statusDocumento = statusDocumentoProp || statusDocumentoLocal;
  const setStatusDocumento = setStatusDocumentoProp || setStatusDocumentoLocal;
  const [loading, setLoading] = useState(false);
  const [etapa, setEtapa] = useState('inicial'); // 'inicial', 'pdf-gerado', 'pendente-assinatura', 'assinado'
  const [pdfGerado, setPdfGerado] = useState(null);
  const [mostrarOpcoesEnvio, setMostrarOpcoesEnvio] = useState(false);
  const [envioWhatsApp, setEnvioWhatsApp] = useState(false);
  const [envioEmail, setEnvioEmail] = useState(true);

  useEffect(() => {
    if (!dados?.propostaId) return;

    const buscarStatusDocumento = async () => {
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
            setStatusDocumento(result.documento);
          }
        }
      } catch (error) {
        console.error('Erro ao buscar status do documento:', error);
      }
    };

    const verificarEstado = async () => {
      // Primeiro verificar se há PDF temporário
      try {
        const pdfTempResponse = await fetch(
          `${process.env.REACT_APP_API_URL}/documentos/propostas/${dados.propostaId}/pdf-temporario`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('aupus_token')}`,
            }
          }
        );

        if (pdfTempResponse.ok) {
          const result = await pdfTempResponse.json(); // ← CORRIGIR: era 'response'
          if (result.success) {
            console.log('📄 PDF temporário encontrado:', result.pdf);
            setPdfGerado(result.pdf);
            setEtapa('pdf-gerado');
            return; // Se encontrou PDF temporário, não buscar status
          }
        }
      } catch (error) {
        console.log('Nenhum PDF temporário encontrado');
      }

      // Se não tem PDF temporário, buscar status de documento enviado
      await buscarStatusDocumento(); // ← CORRIGIR: função estava dentro do escopo
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
        if (statusDocumento.status === 'SIGNED' || statusDocumento.status === 'Assinado') {
          setEtapa('assinado');
        } else if (
          statusDocumento.status === 'PENDING' || 
          statusDocumento.status === 'Pendente' ||
          statusDocumento.status === 'Aguardando Assinatura' // ← ADICIONAR ESTA LINHA
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

  const todosCamposPreenchidos = Boolean(dados?.nomeRepresentante) && 
                               Boolean(dados?.emailRepresentante) && 
                               Boolean(dados?.whatsappRepresentante);

  console.log('DEBUG GerarTermoButton:', {
    etapa,
    pdfGerado,
    statusDocumento,
    todosCamposPreenchidos
  });

  

  // NOVA FUNÇÃO: Gerar PDF apenas (sem enviar) - USANDO ENDPOINTS DEFINITIVOS
  const gerarPdfApenas = async () => {
    if (!todosCamposPreenchidos) {
      alert('Preencha todos os campos obrigatórios antes de gerar o termo.');
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

  // NOVA FUNÇÃO: Enviar PDF para Autentique - USANDO ENDPOINT DEFINITIVO
  const enviarParaAutentique = async () => {
    if (!pdfGerado && !statusDocumento) {
      alert('Gere o PDF primeiro antes de enviar.');
      return;
    }

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
        
        setStatusDocumento(result.documento);
        setPdfGerado(null); // Limpar PDF temporário
        setMostrarOpcoesEnvio(false);
        setEtapa('pendente-assinatura');
        
        const canaisEnvio = [];
        if (envioEmail) canaisEnvio.push('E-mail');
        if (envioWhatsApp) canaisEnvio.push('WhatsApp');
        
        alert(`✅ ${result.message}\n\nEnviado via: ${canaisEnvio.join(' e ')}\nPara: ${result.documento.email_signatario}`);

        if (result.documento.link_assinatura && 
            window.confirm('Deseja abrir o link de assinatura agora?')) {
          window.open(result.documento.link_assinatura, '_blank');
        }

      } else {
        console.error('❌ Erro ao enviar:', result);
        if (response.status === 409) {
          alert(`⚠️ ${result.message}`);
          if (result.documento) {
            setStatusDocumento(result.documento);
            setEtapa('pendente-assinatura');
          }
        } else {
          alert(`❌ Erro: ${result.message}`);
        }
      }

    } catch (error) {
      console.error('❌ Erro interno:', error);
      alert('❌ Erro interno ao enviar. Tente novamente.');
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
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/documentos/${statusDocumento.id}/cancelar`,
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
        console.log('✅ Documento cancelado');
        setStatusDocumento(null);
        setPdfGerado(null);
        setEtapa('inicial');
        alert('✅ Documento cancelado com sucesso. Agora você pode gerar um novo termo.');
      } else {
        alert(`❌ Erro ao cancelar: ${result.message}`);
      }

    } catch (error) {
      console.error('❌ Erro ao cancelar:', error);
      alert('❌ Erro interno ao cancelar documento.');
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
  const visualizarPDFTermo = () => {
    if (pdfGerado?.url) {
      // PDF temporário gerado - usar URL direta do backend
      window.open(pdfGerado.url, '_blank');
    } else if (statusDocumento?.pdf_url) {
      // PDF enviado para Autentique - usar URL do status
      window.open(statusDocumento.pdf_url, '_blank');
    } else {
      alert('URL do PDF não encontrada');
    }
  };

  // Campos obrigatórios faltantes
  const camposFaltantes = [];
  if (!dados?.nomeRepresentante) camposFaltantes.push('Nome do Representante');
  if (!dados?.emailRepresentante) camposFaltantes.push('Email do receptor do Termo');
  if (!dados?.whatsappRepresentante) camposFaltantes.push('WhatsApp do receptor do Termo');

  // RENDERIZAÇÃO BASEADA NA ETAPA
  return (
    <div className="gerar-termo-container">
        
      {/* ETAPA INICIAL - Nenhum termo gerado */}
      {etapa === 'inicial' && (
        <>
          {!todosCamposPreenchidos && (
            <div className="campos-faltantes">
              <strong>Campos obrigatórios:</strong> {camposFaltantes.join(', ')}
            </div>
          )}
          
          <button
            onClick={gerarPdfApenas}
            disabled={loading || !todosCamposPreenchidos}
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
              <h5>📤 Como enviar?</h5>
              <label>
                <input
                  type="checkbox"
                  checked={envioEmail}
                  onChange={(e) => setEnvioEmail(e.target.checked)}
                />
                📧 Enviar por E-mail
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={envioWhatsApp}
                  onChange={(e) => setEnvioWhatsApp(e.target.checked)}
                />
                📱 Enviar por WhatsApp
              </label>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  enviarParaAutentique();
                }}
                disabled={loading || (!envioEmail && !envioWhatsApp)}
                className={`btn btn-primary ${loading ? 'loading' : ''}`}
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
          <div className="status-info text-warning">
            <strong>⏳ Status:</strong> {statusDocumento.status || 'Aguardando assinatura'}
            <br />
            <small>Enviado para: {statusDocumento.email_signatario}</small>
            <br />
            <small>Criado em: {statusDocumento.criado_em}</small>
          </div>

          {statusDocumento.pdf_url && (
            <button
              onClick={visualizarPDFTermo}
              className="btn btn-warning"
            >
              <Eye size={16} />
              Visualizar PDF Enviado
            </button>
          )}

          <button
            onClick={cancelarDocumento}
            disabled={loading}
            className={`btn btn-danger ${loading ? 'loading' : ''}`}
          >
            {loading ? (
              <>
                <Loader className="animate-spin" size={16} />
                Cancelando...
              </>
            ) : (
              <>
                <X size={16} />
                Cancelar Link de Assinatura
              </>
            )}
          </button>
        </>
      )}

      {/* ETAPA ASSINADO - Documento já assinado */}
      {etapa === 'assinado' && statusDocumento && (
        <>
          <div className="status-info text-success">
            <strong>✅ Termo Assinado!</strong>
            <br />
            <small>Assinado em: {statusDocumento.data_assinatura}</small>
          </div>

          <button
            onClick={visualizarPDFTermo}
            className="btn btn-success"
          >
            <Eye size={16} />
            Visualizar Termo Assinado
          </button>
        </>
      )}
    </div>
  );
};

export default GerarTermoButton;