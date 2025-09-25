// src/components/common/Header.jsx - Atualizada com logo e notificações
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import NotificationIcon from './NotificationIcon';
import './Header.css';

const Header = ({ title, subtitle, icon: IconComponent }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();


  return (
    <header className="header">
      <div className="header-content">
        <div className="header-with-logo">
          <img
            src="/Logo.png"
            alt="Logo"
            className="header-logo"
          />
          <h1>
            {title}
          </h1>
        </div>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="header-actions">
        <NotificationIcon />
      </div>
    </header>
  );
};

export default Header;