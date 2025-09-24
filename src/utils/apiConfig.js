// src/utils/apiConfig.js
// Helper para configuração da API - evita hardcode de URLs

const getApiUrl = () => {
  const apiUrl = process.env.REACT_APP_API_URL;
  
  if (!apiUrl) {
    console.error('❌ REACT_APP_API_URL não está definida!');
    console.error('📋 Variáveis disponíveis:', 
      Object.keys(process.env).filter(key => key.startsWith('REACT_APP_'))
    );
    throw new Error('REACT_APP_API_URL é obrigatória');
  }
  
  return apiUrl;
};

const getApiBaseUrl = () => {
  return getApiUrl().replace(/\/api$/, '');
};

export { getApiUrl, getApiBaseUrl };
