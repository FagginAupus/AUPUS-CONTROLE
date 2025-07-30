// src/pages/LoginPage.jsx - Página de login com autenticação hierárquica
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import './LoginPage.css';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  // Redirecionar se já estiver logado
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.username || !formData.password) {
      showNotification('Preencha todos os campos', 'warning');
      return;
    }

    setLoading(true);

    try {
      const result = await login(formData.username, formData.password);
      
      if (result.success) {
        showNotification(`Bem-vindo(a), ${result.user.name}!`, 'success');
        navigate('/dashboard', { replace: true });
      } else {
        showNotification(result.message || 'Erro ao fazer login', 'error');
      }
    } catch (error) {
      console.error('Erro no login:', error);
      showNotification('Erro interno do sistema', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="background-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
        </div>
      </div>

      <div className="login-card">
        <div className="login-header">
          <div className="company-logo">
            <span className="logo-icon">⚡</span>
            <h1>Aupus Energia</h1>
          </div>
          <p className="login-subtitle">Sistema de Gestão Comercial</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Usuário</label>
            <div className="input-container">
              <span className="input-icon">👤</span>
              <input
                type="text"
                id="username"
                name="username"
                value={formData.username}
                onChange={handleChange}
                onKeyPress={handleKeyPress}
                placeholder="Digite seu usuário"
                autoComplete="username"
                disabled={loading}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Senha</label>
            <div className="input-container">
              <span className="input-icon">🔒</span>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                onKeyPress={handleKeyPress}
                placeholder="Digite sua senha"
                autoComplete="current-password"
                disabled={loading}
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="login-button"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="loading-spinner"></span>
                Entrando...
              </>
            ) : (
              <>
                <span className="button-icon">🚀</span>
                Entrar
              </>
            )}
          </button>
        </form>

        <div className="login-info">
          <div className="info-section">
            <h4>Tipos de Acesso:</h4>
            <div className="access-types">
              <div className="access-type">
                <span className="access-icon">👑</span>
                <span className="access-name">Administrador</span>
                <span className="access-desc">Acesso completo ao sistema</span>
              </div>
              <div className="access-type">
                <span className="access-icon">👔</span>
                <span className="access-name">Consultor</span>
                <span className="access-desc">Gestão de equipe e propostas</span>
              </div>
              <div className="access-type">
                <span className="access-icon">👨‍💼</span>
                <span className="access-name">Gerente</span>
                <span className="access-desc">Supervisão de vendedores</span>
              </div>
              <div className="access-type">
                <span className="access-icon">👨‍💻</span>
                <span className="access-name">Vendedor</span>
                <span className="access-desc">Gestão de propostas próprias</span>
              </div>
            </div>
          </div>
        </div>

        <div className="login-footer">
          <p>&copy; 2025 Aupus Energia - Entre nessa onda!</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;