// src/components/common/Header.jsx - Atualizada com logo e notificações
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Zap, ScrollText, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import NotificationIcon from './NotificationIcon';
import SettingsModal from './SettingsModal';
import './Header.css';

const Header = ({ title, subtitle, icon: IconComponent }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);


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
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="header-icon-btn"
          title="Configurações"
        >
          <Settings size={20} />
        </button>
        {user?.role === 'admin' && (
          <button
            onClick={() => navigate('/logs')}
            className="header-icon-btn"
            title="Logs do Sistema"
          >
            <ScrollText size={20} />
          </button>
        )}
        <NotificationIcon />
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </header>
  );
};

export default Header;