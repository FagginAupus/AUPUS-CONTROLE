// src/components/ChangePasswordModal.jsx
import React, { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import apiService from '../services/apiService';

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
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div className="modal-content" style={{ maxWidth: '400px', background: 'white' }}>
        <div className="modal-header" style={{ background: '#dc3545', color: 'white', padding: '20px' }}>
          <h3 style={{ margin: 0, color: 'white' }}>
            <Lock size={20} style={{ marginRight: '8px' }} />
            Alterar Senha Obrigatório
          </h3>
        </div>
        
        <div className="modal-body" style={{ padding: '24px', background: 'white' }}>
          <div style={{ marginBottom: '20px', padding: '15px', background: '#fff3cd', border: '1px solid #ffeaa7', borderRadius: '6px' }}>
            <p style={{ margin: 0, color: '#856404', fontSize: '14px' }}>
              ⚠️ Você está usando a senha padrão. Por segurança, é obrigatório alterá-la antes de continuar.
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333' }}>
                Nova Senha *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? "text" : "password"}
                  name="new_password"
                  value={formData.new_password}
                  onChange={handleChange}
                  placeholder="Digite a nova senha (mín. 6 caracteres)"
                  style={{
                    width: '100%',
                    padding: '12px 40px 12px 15px',
                    border: `2px solid ${errors.new_password ? '#dc3545' : '#e9ecef'}`,
                    borderRadius: '6px',
                    fontSize: '14px',
                    background: 'white',
                    color: '#333'
                  }}
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#666',
                    cursor: 'pointer'
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.new_password && (
                <span style={{ color: '#dc3545', fontSize: '12px' }}>{errors.new_password}</span>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#333' }}>
                Confirmar Nova Senha *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="new_password_confirmation"
                  value={formData.new_password_confirmation}
                  onChange={handleChange}
                  placeholder="Digite a nova senha novamente"
                  style={{
                    width: '100%',
                    padding: '12px 40px 12px 15px',
                    border: `2px solid ${errors.new_password_confirmation ? '#dc3545' : '#e9ecef'}`,
                    borderRadius: '6px',
                    fontSize: '14px',
                    background: 'white',
                    color: '#333'
                  }}
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#666',
                    cursor: 'pointer'
                  }}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.new_password_confirmation && (
                <span style={{ color: '#dc3545', fontSize: '12px' }}>{errors.new_password_confirmation}</span>
              )}
            </div>

            {errors.general && (
              <div style={{ marginBottom: '20px', padding: '10px', background: '#f8d7da', color: '#721c24', borderRadius: '4px', fontSize: '14px' }}>
                {errors.general}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '12px 24px',
                  background: loading ? '#ccc' : '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                {loading ? 'Salvando...' : 'Alterar Senha'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChangePasswordModal;