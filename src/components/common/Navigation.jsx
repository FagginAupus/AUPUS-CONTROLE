// src/components/common/Navigation.jsx - COM INÍCIO MARCADO DE VERDE
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './Navigation.css';

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { 
      id: 'inicio', 
      label: 'INÍCIO', 
      icon: '🏠', 
      path: '/',
      paths: ['/', '/dashboard'] // Múltiplos caminhos para o início
    },
    { 
      id: 'prospec', 
      label: 'PROSPEC', 
      icon: '📋', 
      path: '/prospec'
    },
    { 
      id: 'controle', 
      label: 'CONTROLE', 
      icon: '⚙️', 
      path: '/controle'
    },
    { 
      id: 'ugs', 
      label: 'UGs', 
      icon: '🏭', 
      path: '/ugs'
    },
    { 
      id: 'relatorios', 
      label: 'RELATÓRIOS', 
      icon: '📊', 
      path: '/relatorios'
    }
  ];

  const isActive = (item) => {
    if (item.paths) {
      return item.paths.includes(location.pathname);
    }
    return location.pathname === item.path;
  };

  const handleNavigation = (path) => {
    navigate(path);
  };

  return (
    <nav className="navigation">
      <div className="nav-container">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleNavigation(item.path)}
            className={`nav-item ${isActive(item) ? 'active' : ''}`}
          >
            <span className="nav-icon">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default Navigation;