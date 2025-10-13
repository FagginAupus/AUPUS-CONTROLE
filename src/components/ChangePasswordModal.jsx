// src/components/ChangePasswordModal.jsx
import React, { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import apiService from '../services/apiService';
import './common/CommonModal.css';

const ChangePasswordModal = ({ isOpen, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    new_password: '',
    new_password_confirmation: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validações frontend
    const newErrors = {};
    
    if (!formData.new_password || formData.new_password.length < 6) {
      newErrors.new_password = 'Senha deve ter pelo menos 6 caracteres';
    }
    
    if (formData.new_password !== formData.new_password_confirmation) {
      newErrors.new_password_confirmation = 'Senhas não conferem';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    
    try {
      const response = await apiService.post('/auth/change-default-password', formData);
      
      if (response.success) {
        onSuccess('Senha alterada com sucesso!');
        onClose();
      } else {
        setErrors({ general: response.message || 'Erro ao alterar senha' });
      }
    } catch (error) {
      setErrors({ general: 'Erro interno do sistema' });
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
    
    // Limpar erro do campo ao digitar
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="common-modal-overlay">
      <div className="common-modal small" onClick={(e) => e.stopPropagation()}>
        <div className="common-modal-header">
          <h2>
            <Lock size={20} />
            Alterar Senha Obrigatório
          </h2>
        </div>

        <div className="common-modal-content">
          <div className="common-message warning">
            ⚠️ Você está usando a senha padrão. Por segurança, é obrigatório alterá-la antes de continuar.
          </div>

          <form onSubmit={handleSubmit}>
            <div className="common-field">
              <label>
                <Lock size={18} />
                Nova Senha *
              </label>
              <div className="common-input-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  name="new_password"
                  value={formData.new_password}
                  onChange={handleChange}
                  placeholder="Digite a nova senha (mín. 6 caracteres)"
                  className="common-input"
                  disabled={loading}
                  required
                  style={errors.new_password ? { borderColor: '#ef4444' } : {}}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="common-input-icon"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.new_password && (
                <span style={{ color: '#f87171', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                  {errors.new_password}
                </span>
              )}
            </div>

            <div className="common-field">
              <label>
                <Lock size={18} />
                Confirmar Nova Senha *
              </label>
              <div className="common-input-wrapper">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="new_password_confirmation"
                  value={formData.new_password_confirmation}
                  onChange={handleChange}
                  placeholder="Digite a nova senha novamente"
                  className="common-input"
                  disabled={loading}
                  required
                  style={errors.new_password_confirmation ? { borderColor: '#ef4444' } : {}}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="common-input-icon"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.new_password_confirmation && (
                <span style={{ color: '#f87171', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>
                  {errors.new_password_confirmation}
                </span>
              )}
            </div>

            {errors.general && (
              <div className="common-message error">
                {errors.general}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="common-btn common-btn-primary"
              style={{ width: '100%', marginTop: '8px' }}
            >
              {loading ? 'Salvando...' : 'Alterar Senha'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordModal;