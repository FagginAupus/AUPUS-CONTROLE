// src/components/common/Header.jsx - Atualizada com logo
import React from 'react';
import { Zap } from 'lucide-react';
import './Header.css';

const Header = ({ title, subtitle, icon: IconComponent }) => {
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
    </header>
  );
};

export default Header;