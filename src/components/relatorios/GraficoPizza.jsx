// src/components/relatorios/GraficoPizza.jsx
import React, { useState } from 'react';
import { PieChart as PieChartIcon, BarChart3 } from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend
} from 'recharts';

const GraficoPizza = ({
  dados = [],
  titulo = 'Gráfico de Pizza',
  altura = 300,
  dataKey = 'value',
  nameKey = 'name',
  loading = false,
  cores = [
    '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c',
    '#8dd1e1', '#d084d0', '#ffb347', '#87ceeb'
  ],
  mostrarLegenda = true,
  mostrarPercentual = true,
  raioInterno = 0,
  formatoTooltip = null
}) => {
  const [activeIndex, setActiveIndex] = useState(-1);

  const dadosFormatados = dados.map((item, index) => ({
    ...item,
    fill: cores[index % cores.length]
  }));

  const total = dadosFormatados.reduce((sum, item) => sum + (item[dataKey] || 0), 0);

  const formatarValor = (value, context = '') => {
    if (formatoTooltip && context === 'tooltip') {
      return formatoTooltip(value);
    }

    if (typeof value === 'number') {
      if (context === 'percentual') {
        return `${((value / total) * 100).toFixed(1)}%`;
      }
      if (titulo.toLowerCase().includes('valor') || titulo.toLowerCase().includes('receita')) {
        return `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
      }
      return value.toLocaleString('pt-BR');
    }

    return value;
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{data[nameKey]}</p>
          <p className="tooltip-value">
            Valor: {formatarValor(data[dataKey], 'tooltip')}
          </p>
          <p className="tooltip-percent">
            Percentual: {formatarValor(data[dataKey], 'percentual')}
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (!mostrarPercentual || percent < 0.05) return null; // Não mostrar se menor que 5%

    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize="12"
        fontWeight="bold"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  const onPieEnter = (_, index) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(-1);
  };

  if (loading) {
    return (
      <div className="grafico-container loading">
        <div className="grafico-header">
          <h3><PieChartIcon className="inline-icon" size={16} /> {titulo}</h3>
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
          <h3><PieChartIcon className="inline-icon" size={16} /> {titulo}</h3>
        </div>
        <div className="empty-chart">
          <p><BarChart3 className="inline-icon" size={16} /> Nenhum dado disponível para exibir</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grafico-container">
      <div className="grafico-header">
        <h3><PieChartIcon className="inline-icon" size={16} /> {titulo}</h3>
        <div className="grafico-info">
          <span>Total: {formatarValor(total)}</span>
        </div>
      </div>

      <div className="grafico-content" style={{ height: altura }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={dadosFormatados}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={CustomLabel}
              outerRadius={altura / 2 - 20}
              innerRadius={raioInterno}
              fill="#8884d8"
              dataKey={dataKey}
              onMouseEnter={onPieEnter}
              onMouseLeave={onPieLeave}
            >
              {dadosFormatados.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.fill}
                  stroke={activeIndex === index ? '#333' : 'none'}
                  strokeWidth={activeIndex === index ? 2 : 0}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            {mostrarLegenda && (
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value, entry) => (
                  <span style={{ color: entry.color }}>
                    {value}
                  </span>
                )}
              />
            )}
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Lista detalhada dos dados */}
      <div className="grafico-detalhes">
        <div className="detalhes-grid">
          {dadosFormatados
            .sort((a, b) => b[dataKey] - a[dataKey])
            .map((item, index) => (
              <div key={index} className="detalhe-item">
                <div
                  className="detalhe-cor"
                  style={{ backgroundColor: item.fill }}
                ></div>
                <div className="detalhe-info">
                  <div className="detalhe-nome">{item[nameKey]}</div>
                  <div className="detalhe-valor">
                    {formatarValor(item[dataKey])} ({formatarValor(item[dataKey], 'percentual')})
                  </div>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default GraficoPizza;