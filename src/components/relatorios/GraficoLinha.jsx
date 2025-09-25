// src/components/relatorios/GraficoLinha.jsx
import React from 'react';
import { TrendingUp, BarChart3 } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const GraficoLinha = ({
  dados = [],
  titulo = 'Gráfico de Linha',
  altura = 300,
  linhas = [{ key: 'value', cor: '#8884d8', nome: 'Série 1' }],
  xAxisKey = 'name',
  loading = false,
  mostrarGrid = true,
  mostrarLegenda = true,
  formatoTooltip = null
}) => {
  const formatarValor = (value, name) => {
    if (formatoTooltip) {
      return formatoTooltip(value, name);
    }

    if (typeof value === 'number') {
      if (name?.toLowerCase().includes('taxa') || name?.toLowerCase().includes('percentual')) {
        return `${value.toFixed(1)}%`;
      }
      if (name?.toLowerCase().includes('valor') || name?.toLowerCase().includes('receita')) {
        return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
      }
      return value.toLocaleString('pt-BR');
    }

    return value;
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{`${label}`}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              <span className="tooltip-item">
                {entry.name}: {formatarValor(entry.value, entry.name)}
              </span>
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="grafico-container loading">
        <div className="grafico-header">
          <h3><TrendingUp className="inline-icon" size={16} /> {titulo}</h3>
        </div>
        <div className="loading-chart">
          <div className="loading-spinner"></div>
          <p>Carregando gráfico...</p>
        </div>
      </div>
    );
  }

  if (!dados.length) {
    return (
      <div className="grafico-container empty">
        <div className="grafico-header">
          <h3><TrendingUp className="inline-icon" size={16} /> {titulo}</h3>
        </div>
        <div className="empty-chart">
          <p><BarChart3 className="inline-icon" size={16} /> Nenhum dado disponível para o período selecionado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grafico-container">
      <div className="grafico-header">
        <h3><TrendingUp className="inline-icon" size={16} /> {titulo}</h3>
        <div className="grafico-info">
          <span>{dados.length} pontos de dados</span>
        </div>
      </div>

      <div className="grafico-content" style={{ height: altura }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={dados} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            {mostrarGrid && <CartesianGrid strokeDasharray="3 3" />}

            <XAxis
              dataKey={xAxisKey}
              tick={{ fontSize: 12 }}
              angle={dados.length > 10 ? -45 : 0}
              textAnchor={dados.length > 10 ? 'end' : 'middle'}
              height={dados.length > 10 ? 60 : 30}
            />

            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => formatarValor(value)}
            />

            <Tooltip content={<CustomTooltip />} />

            {mostrarLegenda && <Legend />}

            {linhas.map((linha, index) => (
              <Line
                key={index}
                type="monotone"
                dataKey={linha.key}
                stroke={linha.cor}
                strokeWidth={2}
                dot={{ fill: linha.cor, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6 }}
                name={linha.nome}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legenda personalizada com estatísticas */}
      <div className="grafico-stats">
        {linhas.map((linha, index) => {
          const valores = dados.map(d => d[linha.key]).filter(v => v !== null && v !== undefined);
          if (!valores.length) return null;

          const max = Math.max(...valores);
          const min = Math.min(...valores);
          const avg = valores.reduce((sum, v) => sum + v, 0) / valores.length;

          return (
            <div key={index} className="stat-item">
              <div className="stat-header" style={{ color: linha.cor }}>
                <strong>{linha.nome}</strong>
              </div>
              <div className="stat-values">
                <span>Máx: {formatarValor(max, linha.nome)}</span>
                <span>Mín: {formatarValor(min, linha.nome)}</span>
                <span>Média: {formatarValor(avg, linha.nome)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default GraficoLinha;