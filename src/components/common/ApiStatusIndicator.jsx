// src/components/common/ApiStatusIndicator.jsx - Indicador de status da API
import React, { useState, useEffect } from 'react';
import apiService from '../../services/apiService';
import storageService from '../../services/storageService';

const ApiStatusIndicator = () => {
  const [apiStatus, setApiStatus] = useState('checking');
  const [lastCheck, setLastCheck] = useState(null);

  useEffect(() => {
    checkApiStatus();
    
    // Verificar status a cada 30 segundos
    const interval = setInterval(checkApiStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const checkApiStatus = async () => {
    try {
      await apiService.healthCheck();
      setApiStatus('online');
      setLastCheck(new Date());
      
      // Se estava offline, ativar modo API
      if (!storageService.useAPI) {
        storageService.setMode(true);
      }
    } catch (error) {
      setApiStatus('offline');
      setLastCheck(new Date());
      
      // Ativar modo localStorage
      storageService.setMode(false);
    }
  };

  const getStatusConfig = () => {
    switch (apiStatus) {
      case 'online':
        return {
          color: '#4CAF50',
          backgroundColor: '#E8F5E8',
          icon: '🟢',
          text: 'API Online',
          description: 'Conectado ao servidor'
        };
      case 'offline':
        return {
          color: '#FF9800',
          backgroundColor: '#FFF3E0',
          icon: '🟠',
          text: 'Modo Offline',
          description: 'Usando dados locais'
        };
      default:
        return {
          color: '#9E9E9E',
          backgroundColor: '#F5F5F5',
          icon: '🔍',
          text: 'Verificando...',
          description: 'Testando conexão'
        };
    }
  };

  const config = getStatusConfig();

  const handleClick = () => {
    checkApiStatus();
  };

  return (
    <div
      onClick={handleClick}
      style={{
        position: 'fixed',
        top: '10px',
        right: '10px',
        padding: '8px 12px',
        backgroundColor: config.backgroundColor,
        color: config.color,
        border: `1px solid ${config.color}`,
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: 'bold',
        zIndex: 1000,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        transition: 'all 0.3s ease',
        userSelect: 'none',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}
      title={`${config.description}${lastCheck ? `\nÚltima verificação: ${lastCheck.toLocaleTimeString()}` : ''}\nClique para verificar novamente`}
    >
      <span>{config.icon}</span>
      <span>{config.text}</span>
      {apiStatus === 'checking' && (
        <div
          style={{
            width: '12px',
            height: '12px',
            border: '2px solid transparent',
            borderTop: `2px solid ${config.color}`,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}
        />
      )}
      
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ApiStatusIndicator;