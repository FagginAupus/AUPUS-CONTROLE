// src/components/SessionWarningModal.jsx
import React, { useEffect, useState } from 'react';
import { Clock, AlertTriangle, RefreshCw } from 'lucide-react';

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 border border-gray-200">
        {/* Header */}
        <div className="flex items-center gap-3 p-6 border-b border-gray-200">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Sessão Expirando
            </h3>
            <p className="text-sm text-gray-600">
              Sua sessão será encerrada em breve
            </p>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="p-6 space-y-4">
          {/* Status da Sessão */}
          <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <Clock className="w-5 h-5 text-amber-600" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                Tempo restante: {formatTime(countdown)}
              </p>
              {isInGracePeriod && (
                <p className="text-xs text-amber-600 mt-1">
                  ✏️ Edição em andamento - período de proteção ativo
                </p>
              )}
            </div>
          </div>

          {/* Explicação */}
          <div className="text-sm text-gray-600 space-y-2">
            <p>
              Sua sessão será encerrada automaticamente por segurança após 
              período de inatividade.
            </p>
            {isInGracePeriod ? (
              <p className="text-amber-700 font-medium">
                Como você está editando, você tem alguns minutos extras 
                para finalizar seu trabalho.
              </p>
            ) : (
              <p>
                Clique em "Continuar Trabalhando" para estender sua sessão 
                por mais 2 horas.
              </p>
            )}
          </div>

          {/* Barra de Progresso */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-500">
              <span>Tempo da sessão</span>
              <span>{Math.round((countdown / 30) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  countdown <= 5 
                    ? 'bg-red-500' 
                    : countdown <= 15 
                    ? 'bg-amber-500' 
                    : 'bg-green-500'
                }`}
                style={{ width: `${Math.max(5, (countdown / 30) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="flex gap-3 p-6 border-t border-gray-200">
          <button
            onClick={onLogout}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-colors"
          >
            Fazer Logout
          </button>
          <button
            onClick={onExtendSession}
            className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Continuar Trabalhando
          </button>
        </div>

        {/* Footer com informações */}
        <div className="px-6 pb-4">
          <p className="text-xs text-gray-500 text-center">
            Por motivos de segurança, sessões inativas são encerradas automaticamente
          </p>
        </div>
      </div>
    </div>
  );
};

export default SessionWarningModal;