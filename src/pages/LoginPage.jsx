// src/pages/LoginPage.jsx - CORRIGIDO PARA NAVEGAÇÃO AUTOMÁTICA
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import './LoginPage.css';

const LoginPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated, user } = useAuth();
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  // CORREÇÃO: Redirecionar quando isAuthenticated mudar
  useEffect(() => {
    console.log('👤 LoginPage - isAuthenticated:', isAuthenticated, 'user:', user?.name);
    
    if (isAuthenticated && user) {
      console.log('🔄 Redirecionando para dashboard...');
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      showNotification('Preencha todos os campos', 'warning');
      return;
    }

    // Validação básica de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      showNotification('Digite um email válido', 'warning');
      return;
    }

    setLoading(true);
    console.log('🔐 LoginPage - Iniciando processo de login...');

    try {
      const result = await login(formData.email, formData.password);
      console.log('🔐 LoginPage - Resultado do login:', result);
      
      if (result.success) {
        console.log('✅ LoginPage - Login bem-sucedido, usuário:', result.user);
        showNotification(`Bem-vindo(a), ${result.user.name || result.user.nome}!`, 'success');
        
        // CORREÇÃO: Navegação imediata se ainda não foi redirecionado
        setTimeout(() => {
          if (!isAuthenticated) {
            console.log('🔄 LoginPage - Forçando navegação manual...');
            navigate('/dashboard', { replace: true });
          }
        }, 100);
      } else {
        console.log('❌ LoginPage - Falha no login:', result.message);
        showNotification(result.message || 'Email ou senha incorretos', 'error');
      }
    } catch (error) {
      console.error('❌ LoginPage - Erro no login:', error);
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

  // Pré-preencher com dados de teste - REMOVIDO

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
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              onKeyPress={handleKeyPress}
              placeholder="Digite seu email"
              autoComplete="email"
              disabled={loading}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Senha</label>
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
              'Entrar'
            )}
          </button>
        </form>

        <div className="login-info">
          <div className="info-section">
            <h4>Tipos de Acesso:</h4>
            <div className="access-types">
              <div className="access-type">
                <span className="access-name">Administrador</span>
                <span className="access-desc">Acesso completo ao sistema</span>
              </div>
              <div className="access-type">
                <span className="access-name">Consultor</span>
                <span className="access-desc">Gestão de equipe e propostas</span>
              </div>
              <div className="access-type">
                <span className="access-name">Gerente</span>
                <span className="access-desc">Supervisão de vendedores</span>
              </div>
              <div className="access-type">
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