// src/components/SessionWarningModal.jsx
import React, { useEffect, useState } from 'react';
import { Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import './common/CommonModal.css';

const SessionWarningModal = ({ 
  isOpen, 
  timeLeft, 
  isInGracePeriod,
  onExtendSession, 
  onLogout 
}) => {
  const [countdown, setCountdown] = useState(timeLeft);

  useEffect(() => {
    setCountdown(timeLeft);
  }, [timeLeft]);

  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          onLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 60000); // Atualizar a cada minuto

    return () => clearInterval(interval);
  }, [isOpen, onLogout]);

  if (!isOpen) return null;

  const formatTime = (minutes) => {
    if (minutes < 60) {
      return `${minutes} minuto${minutes !== 1 ? 's' : ''}`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="common-modal-overlay">
      <div className="common-modal small" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="common-modal-header">
          <h2>
            <AlertTriangle size={24} />
            Sessão Expirando
          </h2>
        </div>

        {/* Conteúdo */}
        <div className="common-modal-content">
          <div className="common-modal-section">
            {/* Status da Sessão */}
            <div className="common-message warning" style={{ marginBottom: '16px' }}>
              <Clock size={20} />
              <div>
                <div style={{ fontWeight: 600 }}>
                  Tempo restante: {formatTime(countdown)}
                </div>
                {isInGracePeriod && (
                  <div style={{ fontSize: '0.85rem', marginTop: '4px', opacity: 0.9 }}>
                    ✏️ Edição em andamento - período de proteção ativo
                  </div>
                )}
              </div>
            </div>

            {/* Explicação */}
            <p style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: '12px' }}>
              Sua sessão será encerrada automaticamente por segurança após
              período de inatividade.
            </p>
            {isInGracePeriod ? (
              <p style={{ color: '#fbbf24', fontWeight: 500 }}>
                Como você está editando, você tem alguns minutos extras
                para finalizar seu trabalho.
              </p>
            ) : (
              <p style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                Clique em "Continuar Trabalhando" para estender sua sessão
                por mais 2 horas.
              </p>
            )}

            {/* Barra de Progresso */}
            <div style={{ marginTop: '20px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.75rem',
                color: 'rgba(255, 255, 255, 0.6)',
                marginBottom: '8px'
              }}>
                <span>Tempo da sessão</span>
                <span>{Math.round((countdown / 30) * 100)}%</span>
              </div>
              <div style={{
                width: '100%',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '999px',
                height: '8px',
                overflow: 'hidden'
              }}>
                <div
                  style={{
                    height: '100%',
                    borderRadius: '999px',
                    transition: 'all 0.3s ease',
                    width: `${Math.max(5, (countdown / 30) * 100)}%`,
                    background: countdown <= 5
                      ? 'linear-gradient(90deg, #ef4444, #dc2626)'
                      : countdown <= 15
                      ? 'linear-gradient(90deg, #fbbf24, #f59e0b)'
                      : 'linear-gradient(90deg, #10b981, #059669)'
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="common-modal-footer">
          <button
            onClick={onLogout}
            className="common-btn common-btn-secondary"
          >
            Fazer Logout
          </button>
          <button
            onClick={onExtendSession}
            className="common-btn common-btn-success"
          >
            <RefreshCw size={16} />
            Continuar Trabalhando
          </button>
        </div>
      </div>
    </div>
  );
};

export default SessionWarningModal;