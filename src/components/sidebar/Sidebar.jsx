// src/components/sidebar/Sidebar.jsx
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.css';

const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, canAccessPage, logout } = useAuth();

  const menuItems = [
    { 
        id: 'inicio', 
        label: 'Dashboard', 
        icon: '', // ← Removido emoji
        path: '/',
        paths: ['/', '/dashboard'],
        requiredPage: 'dashboard'
    },
    { 
        id: 'nova-proposta', 
        label: 'Nova Proposta', 
        icon: '', // ← Removido emoji
        path: '/nova-proposta',
        requiredPage: 'prospec'
    },
    { 
        id: 'prospec', 
        label: 'Prospec', 
        icon: '', // ← Removido emoji
        path: '/prospec',
        requiredPage: 'prospec'
    },
    { 
        id: 'controle', 
        label: 'Controle', 
        icon: '', // ← Removido emoji
        path: '/controle',
        requiredPage: 'controle'
    },
    { 
        id: 'ugs', 
        label: 'UGs', 
        icon: '', // ← Removido emoji
        path: '/ugs',
        requiredPage: 'ugs'
    },
    { 
        id: 'relatorios', 
        label: 'Relatórios', 
        icon: '', // ← Removido emoji
        path: '/relatorios',
        requiredPage: 'relatorios'
    }
    ];

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

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
        {/* Header da Sidebar */}
        <div className="sidebar-header">
            <div className="sidebar-brand">
                <div className="brand-icon">A</div> {/* ← Mudou de ⚡ para A */}
                {!isCollapsed && <span className="brand-text">AUPUS</span>}
            </div>
            <button onClick={toggleSidebar} className="collapse-btn">
                {isCollapsed ? '→' : '←'}
            </button>
      </div>

      {/* Menu Items */}
      <nav className="sidebar-nav">
        {visibleMenuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleNavigation(item.path)}
            className={`nav-item ${isActive(item) ? 'active' : ''}`}
            title={item.label}
          >
            <span className="nav-icon">{item.icon}</span>
            {!isCollapsed && <span className="nav-label">{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* User Info */}
      <div className="sidebar-footer">
        <div className="user-info">
          <div className="user-avatar">A</div>
          {!isCollapsed && (
            <div className="user-details">
              <div className="user-name">{user?.name || user?.nome}</div>
              <div className="user-role">{user?.role}</div>
            </div>
          )}
        </div>
        <button onClick={handleLogout} className="logout-btn" title="Sair">
            Sair {/* ← Mudou de 🚪 para Sair */}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;