// src/pages/LoginPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import authService from '../services/authService';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import './LoginPage.css';

// Ícones simples (substitutos do lucide-react para não complicar)
const EyeIcon = () => <span>👁️</span>;
const EyeOffIcon = () => <span>🙈</span>;
const UserIcon = () => <span>👤</span>;
const LockIcon = () => <span>🔒</span>;
const ZapIcon = () => <span>⚡</span>;

// Schema de validação
const loginSchema = yup.object({
  username: yup
    .string()
    .required('Nome de usuário é obrigatório')
    .min(3, 'Mínimo de 3 caracteres'),
  password: yup
    .string()
    .required('Senha é obrigatória')
    .min(4, 'Mínimo de 4 caracteres')
});

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { showNotification } = useNotification();

  const from = location.state?.from?.pathname || '/';

  const {
    register,
    handleSubmit,
    formState: { errors },
    setFocus
  } = useForm({
    resolver: yupResolver(loginSchema),
    defaultValues: {
      username: '',
      password: ''
    }
  });

  useEffect(() => {
    setFocus('username');
  }, [setFocus]);

  const onSubmit = async (data) => {
    setIsLoading(true);
    
    try {
      const result = await authService.login(data.username, data.password);
      
      if (result.success) {
        login(result.user);
        showNotification(`Bem-vindo, ${result.user.name}!`, 'success');
        navigate(from, { replace: true });
      }
    } catch (error) {
      showNotification(error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(prev => !prev);
  };

  const handleDemoLogin = async (userType) => {
    setIsLoading(true);
    
    const demoUsers = {
      admin: { username: 'admin', password: 'aupus2025' },
      consultor: { username: 'consultor1', password: '123456' },
      operador: { username: 'operador', password: 'op2025' }
    };

    try {
      const demoUser = demoUsers[userType];
      const result = await authService.login(demoUser.username, demoUser.password);
      
      if (result.success) {
        login(result.user);
        showNotification(`Login demo como ${result.user.name}`, 'success');
        navigate(from, { replace: true });
      }
    } catch (error) {
      showNotification(error.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      {/* Background animado */}
      <div className="login-background">
        <div className="bg-gradient"></div>
        <div className="bg-pattern"></div>
      </div>

      {/* Conteúdo principal */}
      <div className="login-content">
        {/* Logo e Título */}
        <div className="login-header">
          <div className="logo-container">
            <ZapIcon />
            <h1 className="logo-text">
              AUPUS <span className="logo-accent">ENERGIA</span>
            </h1>
          </div>
          <p className="login-subtitle">Sistema de Gestão de Propostas</p>
        </div>

        {/* Formulário de Login */}
        <div className="login-form-container">
          <form onSubmit={handleSubmit(onSubmit)} className="login-form">
            <h2 className="form-title">Acesso ao Sistema</h2>

            {/* Campo Username */}
            <div className="form-group">
              <label htmlFor="username" className="form-label">
                <UserIcon />
                Nome de Usuário
              </label>
              <input
                {...register('username')}
                type="text"
                id="username"
                className={`form-input ${errors.username ? 'error' : ''}`}
                placeholder="Digite seu usuário"
                disabled={isLoading}
              />
              {errors.username && (
                <span className="error-message">{errors.username.message}</span>
              )}
            </div>

            {/* Campo Password */}
            <div className="form-group">
              <label htmlFor="password" className="form-label">
                <LockIcon />
                Senha
              </label>
              <div className="password-container">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  className={`form-input ${errors.password ? 'error' : ''}`}
                  placeholder="Digite sua senha"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={togglePasswordVisibility}
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {errors.password && (
                <span className="error-message">{errors.password.message}</span>
              )}
            </div>

            {/* Botão de Login */}
            <button
              type="submit"
              className={`login-button ${isLoading ? 'loading' : ''}`}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="spinner"></div>
                  Entrando...
                </>
              ) : (
                <>
                  <ZapIcon />
                  Entrar no Sistema
                </>
              )}
            </button>
          </form>

          {/* Logins Demo */}
          <div className="demo-section">
            <div className="demo-divider">
              <span>Logins de Demonstração</span>
            </div>
            
            <div className="demo-buttons">
              <button
                onClick={() => handleDemoLogin('admin')}
                className="demo-button admin"
                disabled={isLoading}
              >
                👑 Admin
              </button>
              <button
                onClick={() => handleDemoLogin('consultor')}
                className="demo-button consultor"
                disabled={isLoading}
              >
                👤 Consultor
              </button>
              <button
                onClick={() => handleDemoLogin('operador')}
                className="demo-button operador"
                disabled={isLoading}
              >
                ⚙️ Operador
              </button>
            </div>

            <div className="demo-info">
              <h4>Credenciais de Teste:</h4>
              <div className="credentials-grid">
                <div className="credential-item">
                  <strong>Admin:</strong> admin / aupus2025
                </div>
                <div className="credential-item">
                  <strong>Consultor:</strong> consultor1 / 123456
                </div>
                <div className="credential-item">
                  <strong>Operador:</strong> operador / op2025
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="login-footer">
          <p>&copy; 2025 Aupus Energia - Sistema de Gestão</p>
          <p className="version">Versão React 1.0.0</p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;