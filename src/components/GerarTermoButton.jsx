// src/components/GerarTermoButton.jsx - VERSÃO CORRIGIDA BACKEND
import React, { useState, useEffect } from 'react';
import { FileText, Send, Clock, CheckCircle, AlertTriangle, ExternalLink } from 'lucide-react';
import './GerarTermoButton.css';

const GerarTermoButton = ({ 
  proposta, 
  dados, 
  onSalvarAntes,
  disabled = false,
  className = '' 
}) => {
  const [loading, setLoading] = useState(false);
  const [statusDocumento, setStatusDocumento] = useState(null);
  const [loadingStatus, setLoadingStatus] = useState(false);

  // Verificar se todos os campos obrigatórios estão preenchidos
  const camposObrigatorios = [
    'nomeCliente',
    'numeroUC', 
    'enderecoUC',
    'tipoDocumento',
    'nomeRepresentante',
    'enderecoRepresentante',
    'emailRepresentante',
    'descontoTarifa', 
    'logradouroUC'
  ];

  // Verificar campos específicos por tipo de documento
  const camposEspecificos = dados.tipoDocumento === 'CPF' 
    ? ['cpf'] 
    : ['cnpj', 'razaoSocial'];

  const todosCamposPreenchidos = [
    ...camposObrigatorios,
    ...camposEspecificos
  ].every(campo => {
    const valor = dados[campo];
    return valor !== undefined && valor !== null && valor !== '';
  });

  // Buscar status do documento ao montar componente
  useEffect(() => {
    if (proposta?.id) {
      buscarStatusDocumento();
    }
  }, [proposta?.id]);

  const buscarStatusDocumento = async () => {
    if (!proposta?.id) return;
    
    setLoadingStatus(true);
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/documentos/propostas/${proposta.id}/status`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('aupus_token')}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const result = await response.json();
        setStatusDocumento(result.documento);
      } else if (response.status === 404) {
        setStatusDocumento(null);
      }
    } catch (error) {
      console.error('❌ Erro ao buscar status do documento:', error);
    } finally {
      setLoadingStatus(false);
    }
  };

  const gerarTermo = async () => {
    if (!todosCamposPreenchidos) {
      alert('Preencha todos os campos obrigatórios antes de gerar o termo de adesão.');
      return;
    }

    setLoading(true);
    try {
      // 1. Salvar dados antes de gerar o termo
      console.log('💾 Salvando dados antes de gerar termo...');
      if (onSalvarAntes) {
        await onSalvarAntes(dados);
      }

      // 2. CHAMADA CORRETA PARA O NOVO ENDPOINT
      console.log('🚀 Enviando para processamento completo no backend...');
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/documentos/propostas/${proposta.id}/gerar-termo-completo`,
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
        console.log('✅ Termo gerado com sucesso no backend:', result.documento);
        
        setStatusDocumento(result.documento);
        alert(`✅ ${result.message}\n\nEnviado para: ${result.documento.email_signatario || dados.emailRepresentante}`);

        if (result.documento.link_assinatura && 
              window.confirm('Deseja abrir o link de assinatura agora?')) {
          window.open(result.documento.link_assinatura, '_blank');
        }

      } else {
        console.error('❌ Erro na resposta do backend:', result);
        
        if (response.status === 409) {
          alert(`⚠️ ${result.message}`);
          if (result.documento) {
            setStatusDocumento(result.documento);
          }
        } else {
          alert(`❌ Erro: ${result.message}`);
        }
      }

    } catch (error) {
      console.error('❌ Erro interno:', error);
      alert('❌ Erro interno ao gerar termo. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const abrirLinkAssinatura = () => {
    if (statusDocumento?.link_assinatura) {
      window.open(statusDocumento.link_assinatura, '_blank');
    }
  };

  const obterIconeStatus = () => {
    if (loadingStatus) return <Clock size={16} className="animate-spin" />;
    if (!statusDocumento) return <FileText size={16} />;
    
    switch (statusDocumento.status) {
      case 'Aguardando Assinatura':
        return <Clock size={16} className="text-warning" />;
      case 'Assinado':
        return <CheckCircle size={16} className="text-success" />;
      case 'Rejeitado':
        return <AlertTriangle size={16} className="text-danger" />;
      default:
        return <FileText size={16} />;
    }
  };

  const obterTextoStatus = () => {
    if (loadingStatus) return 'Verificando...';
    if (!statusDocumento) return 'Gerar Termo';
    
    return statusDocumento.status;
  };

  const obterClasseStatus = () => {
    if (!statusDocumento) return 'btn-primary';
    
    switch (statusDocumento.status) {
      case 'Aguardando Assinatura':
        return 'btn-warning';
      case 'Assinado':
        return 'btn-success';
      case 'Rejeitado':
        return 'btn-danger';
      default:
        return 'btn-secondary';
    }
  };

  return (
    <div className={`gerar-termo-container ${className}`}>
      <button
        type="button"
        onClick={statusDocumento ? abrirLinkAssinatura : gerarTermo}
        disabled={disabled || loading || loadingStatus || (!statusDocumento && !todosCamposPreenchidos)}
        className={`btn ${obterClasseStatus()} ${loading ? 'loading' : ''}`}
      >
        {loading ? (
          <>
            <Clock size={16} className="animate-spin" />
            <span className="ml-1">Processando no servidor...</span>
          </>
        ) : (
          <>
            {obterIconeStatus()}
            <span className="ml-1">{obterTextoStatus()}</span>
          </>
        )}
      </button>
      
      {!todosCamposPreenchidos && (
        <div className="campos-faltantes text-danger">
          <small>⚠️ Preencha todos os campos obrigatórios primeiro</small>
        </div>
      )}
      
      {statusDocumento && (
        <div className="status-info text-muted">
          <small>
            {statusDocumento.progresso && `Progresso: ${statusDocumento.progresso} • `}
            {statusDocumento.criado_em && `Criado: ${statusDocumento.criado_em}`}
          </small>
        </div>
      )}
    </div>
  );
};

export default GerarTermoButton;