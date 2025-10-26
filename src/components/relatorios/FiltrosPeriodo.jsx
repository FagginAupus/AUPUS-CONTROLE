// src/components/relatorios/FiltrosPeriodo.jsx
import React, { useState, useEffect } from 'react';
import { Search, FileText, Settings, RefreshCw, Calendar, User, BarChart3 } from 'lucide-react';
import apiService from '../../services/apiService';
import './FiltrosPeriodo.css';

const FiltrosPeriodo = ({ filters, onFilterChange, loading }) => {
  const [consultores, setConsultores] = useState([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    loadConsultores();
  }, []);

  const loadConsultores = async () => {
    try {
      const response = await apiService.get('/usuarios');
      console.log('✅ Resposta completa da API usuarios:', response);

      let users = [];

      if (response.success) {
        // Tentar diferentes estruturas de resposta
        if (Array.isArray(response.data)) {
          users = response.data;
        } else if (response.data && Array.isArray(response.data.data)) {
          // Caso paginado
          users = response.data.data;
        } else if (response.data && Array.isArray(response.data.users)) {
          // Caso wrapped em 'users'
          users = response.data.users;
        } else {
          console.error('Estrutura de dados não reconhecida:', response.data);
          setConsultores([]);
          return;
        }

        const consultores = users.filter(user =>
          ['consultor', 'gerente', 'admin', 'analista'].includes(user.role)
        );

        console.log('✅ Consultores filtrados:', consultores);
        setConsultores(consultores);
      } else {
        console.error('API retornou success: false:', response);
        setConsultores([]);
      }
    } catch (error) {
      console.error('Erro ao carregar consultores:', error);
      setConsultores([]);
    }
  };

  const handleInputChange = (field, value) => {
    onFilterChange({ [field]: value });
  };

  const presetPeriods = [
    { label: 'Últimos 7 dias', days: 7 },
    { label: 'Últimos 30 dias', days: 30 },
    { label: 'Últimos 90 dias', days: 90 },
    { label: 'Este mês', current: 'month' },
    { label: 'Este ano', current: 'year' }
  ];

  const setPeriod = (preset) => {
    let startDate, endDate = new Date();

    if (preset.days) {
      startDate = new Date(Date.now() - preset.days * 24 * 60 * 60 * 1000);
    } else if (preset.current === 'month') {
      startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
    } else if (preset.current === 'year') {
      startDate = new Date(endDate.getFullYear(), 0, 1);
    }

    onFilterChange({
      dataInicio: startDate.toISOString().split('T')[0],
      dataFim: endDate.toISOString().split('T')[0]
    });
  };

  const clearFilters = () => {
    onFilterChange({
      dataInicio: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      dataFim: new Date().toISOString().split('T')[0],
      consultor: '',
      status: ''
    });
  };

  const statusOptions = [
    { value: '', label: 'Todos os status' },
    { value: 'nova', label: 'Nova' },
    { value: 'em_negociacao', label: 'Em Negociação' },
    { value: 'aprovacao_pendente', label: 'Aprovação Pendente' },
    { value: 'fechada', label: 'Fechada' },
    { value: 'perdida', label: 'Perdida' }
  ];

  return (
    <div className="filtros-periodo">
      <div className="filtros-header">
        <h3><Search className="inline-icon" size={16} /> Filtros do Relatório</h3>
        <div className="filtros-actions">
          <button
            className="btn-toggle-advanced"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? <><FileText className="inline-icon" size={16} /> Filtros Simples</> : <><Settings className="inline-icon" size={16} /> Filtros Avançados</>}
          </button>
          <button
            className="btn-clear-filters"
            onClick={clearFilters}
            disabled={loading}
          >
            <RefreshCw className="inline-icon" size={16} /> Limpar
          </button>
        </div>
      </div>

      <div className="filtros-content">
        {/* Filtros Básicos */}
        <div className="filtros-basicos">
          <div className="filter-group">
            <label><Calendar className="inline-icon" size={16} /> Período:</label>
            <div className="date-inputs">
              <input
                type="date"
                value={filters.dataInicio}
                onChange={(e) => handleInputChange('dataInicio', e.target.value)}
                disabled={loading}
                max={filters.dataFim}
              />
              <span>até</span>
              <input
                type="date"
                value={filters.dataFim}
                onChange={(e) => handleInputChange('dataFim', e.target.value)}
                disabled={loading}
                min={filters.dataInicio}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          <div className="preset-periods">
            {presetPeriods.map((preset, index) => (
              <button
                key={index}
                className="preset-button"
                onClick={() => setPeriod(preset)}
                disabled={loading}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filtros Avançados */}
        {showAdvanced && (
          <div className="filtros-avancados">
            <div className="filter-group">
              <label><User className="inline-icon" size={16} /> Consultor:</label>
              <select
                value={filters.consultor}
                onChange={(e) => handleInputChange('consultor', e.target.value)}
                disabled={loading}
              >
                <option value="">Todos os consultores</option>
                {consultores.map(consultor => (
                  <option key={consultor.id} value={consultor.id}>
                    {consultor.name} ({consultor.role})
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label><BarChart3 className="inline-icon" size={16} /> Status:</label>
              <select
                value={filters.status}
                onChange={(e) => handleInputChange('status', e.target.value)}
                disabled={loading}
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Informações do Filtro */}
        <div className="filter-info">
          <div className="info-item">
            <strong>Período:</strong> {filters.dataInicio} até {filters.dataFim}
          </div>
          {filters.consultor && (
            <div className="info-item">
              <strong>Consultor:</strong> {consultores.find(c => c.id === filters.consultor)?.name || filters.consultor}
            </div>
          )}
          {filters.status && (
            <div className="info-item">
              <strong>Status:</strong> {statusOptions.find(s => s.value === filters.status)?.label}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FiltrosPeriodo;