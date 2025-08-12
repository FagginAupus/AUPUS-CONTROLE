// src/components/common/ApiStatusAlert.jsx
import React, { useState, useEffect } from 'react';
import storageService from '../../services/storageService';
import './ApiStatusAlert.css';

const ApiStatusAlert = () => {
    const [apiStatus, setApiStatus] = useState({ connected: null, message: '' });
    const [showAlert, setShowAlert] = useState(false);
    const [retryCount, setRetryCount] = useState(0);

    const checkApiStatus = async () => {
        try {
            const status = await storageService.checkApiConnection();
            setApiStatus(status);
            
            if (!status.connected) {
                setShowAlert(true);
            } else {
                setShowAlert(false);
                setRetryCount(0);
            }
        } catch (error) {
            setApiStatus({
                connected: false,
                message: 'Erro ao verificar conexão com a API'
            });
            setShowAlert(true);
        }
    };

    const handleRetry = () => {
        setRetryCount(prev => prev + 1);
        checkApiStatus();
    };

    const handleDismiss = () => {
        setShowAlert(false);
    };

    useEffect(() => {
        // Verificar status inicial
        checkApiStatus();

        // Verificar periodicamente (a cada 30 segundos)
        const interval = setInterval(checkApiStatus, 30000);

        return () => clearInterval(interval);
    }, []);

    if (!showAlert || apiStatus.connected === null) {
        return null;
    }

    return (
        <div className="api-status-alert">
            <div className="api-status-alert-content">
                <div className="api-status-icon">
                    ⚠️
                </div>
                <div className="api-status-message">
                    <h4>Problemas de Conexão</h4>
                    <p>{apiStatus.message}</p>
                    <p className="api-status-info">
                        O sistema não conseguiu conectar com o servidor. 
                        Verifique sua conexão com a internet e tente novamente.
                    </p>
                    {retryCount > 0 && (
                        <p className="api-retry-info">
                            Tentativas de reconexão: {retryCount}
                        </p>
                    )}
                </div>
                <div className="api-status-actions">
                    <button 
                        className="btn-retry" 
                        onClick={handleRetry}
                        disabled={retryCount >= 5}
                    >
                        {retryCount >= 5 ? 'Muitas tentativas' : 'Tentar Novamente'}
                    </button>
                    <button 
                        className="btn-dismiss" 
                        onClick={handleDismiss}
                    >
                        Dispensar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ApiStatusAlert;