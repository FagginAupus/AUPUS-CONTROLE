// src/pages/Login.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import './LoginPage.css';

const Login = () => {
  const [credentials, setCredentials] = useState({
    usuario: '',
    senha: ''
  });
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const { showNotification } = useNotification();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Simulação de login - você pode customizar aqui
      if (credentials.usuario && credentials.senha) {
        const userData = {
          nome: credentials.usuario,
          email: `${credentials.usuario}@aupus.com`,
          permissoes: ['admin']
        };
        
        login(userData);
        showNotification('Login realizado com sucesso!', 'success');
        navigate('/dashboard');
      } else {
        showNotification('Preencha usuário e senha', 'error');
      }
    } catch (error) {
      showNotification('Erro no login: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h1>⚡ AUPUS ENERGIA</h1>
          <p>Sistema de Gestão de Propostas</p>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Usuário</label>
            <input
              type="text"
              value={credentials.usuario}
              onChange={(e) => setCredentials({...credentials, usuario: e.target.value})}
              placeholder="Digite seu usuário"
              required
            />
          </div>
          
          <div className="form-group">
            <label>Senha</label>
            <input
              type="password"
              value={credentials.senha}
              onChange={(e) => setCredentials({...credentials, senha: e.target.value})}
              placeholder="Digite sua senha"
              required
            />
          </div>
          
          <button 
            type="submit" 
            className="login-btn"
            disabled={loading}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        
        <div className="login-footer">
          <p>Desenvolvido por AUPUS ENERGIA</p>
        </div>
      </div>
    </div>
  );
};

export default Login;