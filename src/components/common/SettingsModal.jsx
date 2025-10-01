// src/components/common/SettingsModal.jsx
import React, { useState } from 'react';
import { X, User, Mail, Shield, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import apiService from '../../services/apiService';
import './SettingsModal.css';

const SettingsModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    new_password_confirmation: ''
  });

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
    setMessage({ type: '', text: '' });
  };

  const handleSubmitPassword = async (e) => {
    e.preventDefault();

    // Validações
    if (!passwordData.current_password || !passwordData.new_password || !passwordData.new_password_confirmation) {
      setMessage({ type: 'error', text: 'Preencha todos os campos' });
      return;
    }

    if (passwordData.new_password !== passwordData.new_password_confirmation) {
      setMessage({ type: 'error', text: 'As senhas não coincidem' });
      return;
    }

    if (passwordData.new_password.length < 6) {
      setMessage({ type: 'error', text: 'A nova senha deve ter no mínimo 6 caracteres' });
      return;
    }

    try {
      setLoading(true);
      const response = await apiService.post('/auth/change-password', passwordData);

      if (response.success) {
        setMessage({ type: 'success', text: 'Senha alterada com sucesso!' });
        setPasswordData({
          current_password: '',
          new_password: '',
          new_password_confirmation: ''
        });
        setTimeout(() => {
          onClose();
        }, 2000);
      } else {
        setMessage({ type: 'error', text: response.message || 'Erro ao alterar senha' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Erro ao alterar senha' });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="settings-modal-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={(e) => e.stopPropagation()}>
        <div className="settings-modal-header">
          <h2>Configurações</h2>
          <button className="settings-close-btn" onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className="settings-tabs">
          <button
            className={`settings-tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <User size={18} />
            Perfil
          </button>
          <button
            className={`settings-tab ${activeTab === 'password' ? 'active' : ''}`}
            onClick={() => setActiveTab('password')}
          >
            <Lock size={18} />
            Alterar Senha
          </button>
        </div>

        <div className="settings-content">
          {activeTab === 'profile' && (
            <div className="settings-section">
              <h3>Informações do Perfil</h3>

              <div className="settings-field">
                <label>
                  <User size={18} />
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={user?.name || user?.nome || ''}
                  disabled
                  className="settings-input disabled"
                />
              </div>

              <div className="settings-field">
                <label>
                  <Mail size={18} />
                  Email
                </label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="settings-input disabled"
                />
              </div>

              <div className="settings-field">
                <label>
                  <Shield size={18} />
                  Nível de Acesso
                </label>
                <input
                  type="text"
                  value={user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : ''}
                  disabled
                  className="settings-input disabled"
                />
              </div>

              <p className="settings-info">
                Para alterar suas informações de perfil, entre em contato com o administrador do sistema.
              </p>
            </div>
          )}

          {activeTab === 'password' && (
            <div className="settings-section">
              <h3>Alterar Senha</h3>

              <form onSubmit={handleSubmitPassword}>
                <div className="settings-field">
                  <label>
                    <Lock size={18} />
                    Senha Atual
                  </label>
                  <div className="password-input-wrapper">
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      name="current_password"
                      value={passwordData.current_password}
                      onChange={handlePasswordChange}
                      className="settings-input"
                      placeholder="Digite sua senha atual"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="settings-field">
                  <label>
                    <Lock size={18} />
                    Nova Senha
                  </label>
                  <div className="password-input-wrapper">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      name="new_password"
                      value={passwordData.new_password}
                      onChange={handlePasswordChange}
                      className="settings-input"
                      placeholder="Digite a nova senha (mínimo 6 caracteres)"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className="settings-field">
                  <label>
                    <Lock size={18} />
                    Confirmar Nova Senha
                  </label>
                  <div className="password-input-wrapper">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      name="new_password_confirmation"
                      value={passwordData.new_password_confirmation}
                      onChange={handlePasswordChange}
                      className="settings-input"
                      placeholder="Digite a nova senha novamente"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                {message.text && (
                  <div className={`settings-message ${message.type}`}>
                    {message.text}
                  </div>
                )}

                <button
                  type="submit"
                  className="settings-submit-btn"
                  disabled={loading}
                >
                  {loading ? 'Alterando...' : 'Alterar Senha'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
