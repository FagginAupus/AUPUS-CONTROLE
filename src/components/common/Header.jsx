// src/components/common/Header.jsx - Atualizada com ícones Lucide React
import React from 'react';
import { Zap } from 'lucide-react';
import './Header.css';

const Header = ({ title, subtitle, icon: IconComponent }) => {
  return (
    <header className="header">
      <div className="header-content">
        <h1>
          {title}
        </h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
    </header>
  );
};

export default Header;