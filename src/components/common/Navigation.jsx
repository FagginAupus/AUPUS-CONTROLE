// src/components/common/Navigation.jsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Navigation.css';

const Navigation = () => {
  const location = useLocation();
  const { hasPermission } = useAuth();

  const navItems = [
    { 
      path: '/', 
      icon: '🏠', 
      label: 'Início',
      permission: null // Todos podem acessar
    },
    { 
      path: '/nova-proposta', 
      icon: '📝', 
      label: 'Nova Proposta',
      permission: 'nova-proposta'
    },
    { 
      path: '/prospec', 
      icon: '📊', 
      label: 'PROSPEC',
      permission: 'prospec'
    },
    { 
      path: '/controle', 
      icon: '✅', 
      label: 'CONTROLE',
      permission: 'controle'
    },
    { 
      path: '/ugs', 
      icon: '🏢', 
      label: 'Unidades Geradoras',
      permission: 'ugs'
    }
  ];

  // Filtrar itens baseado nas permissões
  const visibleItems = navItems.filter(item => 
    !item.permission || hasPermission(item.permission)
  );

  return (
    <nav className="main-navigation">
      <ul className="nav-menu">
        {visibleItems.map(item => (
          <li key={item.path}>
            <Link 
              to={item.path} 
              className={location.pathname === item.path ? 'active' : ''}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default Navigation;