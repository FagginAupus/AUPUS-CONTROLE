// src/components/common/Header.jsx
import React from 'react';
import './Header.css';

const Header = ({ title, subtitle, icon }) => {
  return (
    <header className="header">
      <div className="header-content">
        <h1>
          <span className="header-icon" style={{ color: 'white' }}>{icon}</span> 
          {title}
        </h1>
        <p>{subtitle}</p>
      </div>
    </header>
  );
};

export default Header;