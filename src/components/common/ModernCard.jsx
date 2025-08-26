// src/components/common/ModernCard.jsx
import React from 'react';
import './ModernCard.css';

const ModernCard = ({ 
  title, 
  subtitle, 
  value, 
  icon, 
  trend, 
  trendValue, 
  className = '',
  children,
  onClick
}) => {
  return (
    <div 
      className={`modern-card ${className} ${onClick ? 'clickable' : ''}`}
      onClick={onClick}
    >
      {icon && (
        <div className="card-icon">
          {icon}
        </div>
      )}
      
      <div className="card-content">
        {title && <h3 className="card-title">{title}</h3>}
        {subtitle && <p className="card-subtitle">{subtitle}</p>}
        {value && <div className="card-value">{value}</div>}
        
        {trend && (
          <div className={`card-trend ${trend}`}>
            <span className="trend-icon">
              {trend === 'up' ? '📈' : '📉'}
            </span>
            {trendValue && <span className="trend-value">{trendValue}</span>}
          </div>
        )}
        
        {children}
      </div>
    </div>
  );
};

export default ModernCard;