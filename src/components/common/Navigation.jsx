// src/components/common/Navigation.jsx - Com Nova Proposta no menu horizontal
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Navigation.css';

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, canAccessPage, logout } = useAuth();

  const menuItems = [
    { 
      id: 'inicio', 
      label: 'INÍCIO', 
      icon: '', // ← REMOVER emoji
      path: '/',
      paths: ['/', '/dashboard'],
      requiredPage: 'dashboard'
    },
    { 
      id: 'nova-proposta', 
      label: 'NOVA PROPOSTA', 
      icon: '', // ← REMOVER emoji
      path: '/nova-proposta',
      requiredPage: 'prospec'
    },
    { 
      id: 'prospec', 
      label: 'PROSPEC', 
      icon: '', // ← REMOVER emoji
      path: '/prospec',
      requiredPage: 'prospec'
    },
    { 
      id: 'controle', 
      label: 'CONTROLE', 
      icon: '', // ← REMOVER emoji
      path: '/controle',
      requiredPage: 'controle'
    },
    { 
      id: 'ugs', 
      label: 'UGs', 
      icon: '', // ← REMOVER emoji
      path: '/ugs',
      requiredPage: 'ugs'
    },
    { 
      id: 'relatorios', 
      label: 'RELATÓRIOS', 
      icon: '', // ← REMOVER emoji
      path: '/relatorios',
      requiredPage: 'relatorios'
    }
  ];

  // Filtrar itens baseado nas permissões do usuário
  const visibleMenuItems = menuItems.filter(item => {
    if (!item.requiredPage) return true;
    return canAccessPage(item.requiredPage);
  });

  const isActive = (item) => {
    if (item.paths) {
      return item.paths.includes(location.pathname);
    }
    return location.pathname === item.path;
  };

  const handleNavigation = (path) => {
    navigate(path);
  };

  const handleLogout = () => {
    if (window.confirm('Deseja realmente sair do sistema?')) {
      logout();
      navigate('/login');
    }
  };

  const getRoleIcon = (role) => {
    const icons = {
      admin: '👑',
      consultor: '👔',
      gerente: '👨‍💼',
      vendedor: '👨‍💻'
    };
    return icons[role] || '👤';
  };

  const getRoleLabel = (role) => {
    const labels = {
      admin: 'Administrador',
      consultor: 'Consultor',
      gerente: 'Gerente',
      vendedor: 'Vendedor'
    };
    return labels[role] || role;
  };

  return (
    <nav className="navigation">
      <div className="nav-container">
        {/* Menu Items */}
        <div className="nav-menu">
          {visibleMenuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavigation(item.path)}
              className={`nav-item ${isActive(item) ? 'active' : ''}`}
              title={item.label} // Para tooltip em mobile
              data-id={item.id}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Apenas Logout */}
        <div className="nav-user">
          <button onClick={handleLogout} className="logout-btn" title="Sair do sistema">
            <span className="logout-icon">🚪</span>
            <span className="logout-label">Sair</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;