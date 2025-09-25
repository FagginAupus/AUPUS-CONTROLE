// src/components/relatorios/CardMetrica.jsx
import React from 'react';
import { TrendingUp, TrendingDown, ArrowRight, Hand } from 'lucide-react';

const CardMetrica = ({
  titulo,
  valor,
  icone,
  corFundo = '#ffffff',
  corTexto = '#333333',
  subtitulo,
  tendencia,
  loading = false,
  onClick,
  className = ''
}) => {
  const formatarValor = (val) => {
    if (loading) return '...';
    if (val === null || val === undefined) return 'N/A';

    // Se for número, formatar adequadamente
    if (typeof val === 'number') {
      if (val > 1000000) {
        return `${(val / 1000000).toFixed(1)}M`;
      }
      if (val > 1000) {
        return `${(val / 1000).toFixed(1)}K`;
      }
      return val.toLocaleString('pt-BR');
    }

    return val;
  };

  const getTendenciaIcon = () => {
    if (!tendencia) return null;

    if (tendencia > 0) {
      return <span className="tendencia-positiva"><TrendingUp className="inline-icon" size={16} /> +{tendencia.toFixed(1)}%</span>;
    } else if (tendencia < 0) {
      return <span className="tendencia-negativa"><TrendingDown className="inline-icon" size={16} /> {tendencia.toFixed(1)}%</span>;
    }
    return <span className="tendencia-neutra"><ArrowRight className="inline-icon" size={16} /> {tendencia.toFixed(1)}%</span>;
  };

  return (
    <div
      className={`card-metrica ${className} ${onClick ? 'clickable' : ''} ${loading ? 'loading' : ''}`}
      style={{ backgroundColor: corFundo, color: corTexto }}
      onClick={onClick}
    >
      {loading && (
        <div className="card-loading-overlay">
          <div className="loading-spinner-small"></div>
        </div>
      )}

      <div className="card-header">
        {icone && <div className="card-icon">{icone}</div>}
        <div className="card-title-container">
          <h4 className="card-title">{titulo}</h4>
          {subtitulo && <p className="card-subtitle">{subtitulo}</p>}
        </div>
      </div>

      <div className="card-body">
        <div className="card-value">
          {formatarValor(valor)}
        </div>

        {tendencia !== undefined && (
          <div className="card-tendencia">
            {getTendenciaIcon()}
          </div>
        )}
      </div>

      {onClick && (
        <div className="card-footer">
          <span className="click-indicator"><Hand className="inline-icon" size={16} /> Clique para detalhes</span>
        </div>
      )}
    </div>
  );
};

export default CardMetrica;