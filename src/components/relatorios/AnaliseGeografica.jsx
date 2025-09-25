// src/components/relatorios/AnaliseGeografica.jsx
import React, { useState, useEffect } from 'react';
import apiService from '../../services/apiService';
import TabelaRanking from './TabelaRanking';
import { Globe } from 'lucide-react';

const AnaliseGeografica = ({ filters, loading, setLoading, onNotification }) => {
  const [dados, setDados] = useState({
    por_distribuidora: [],
    por_estado: []
  });

  useEffect(() => {
    carregarDados();
  }, [filters]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/relatorios/geografico', {
        params: { data_inicio: filters.dataInicio, data_fim: filters.dataFim }
      });
      if (response.success) {
        setDados(response.data);
      }
    } catch (error) {
      onNotification('Erro ao carregar análise geográfica', 'error');
    } finally {
      setLoading(false);
    }
  };

  const colunasDistribuidora = [
    { key: 'distribuidora', label: 'Distribuidora', sortable: true },
    { key: 'total_propostas', label: 'Total', sortable: true, tipo: 'numero' },
    { key: 'fechadas', label: 'Fechadas', sortable: true, tipo: 'numero' },
    { key: 'ticket_medio', label: 'Ticket Médio', sortable: true, tipo: 'moeda' }
  ];

  const colunasEstado = [
    { key: 'estado', label: 'Estado', sortable: true },
    { key: 'total_propostas', label: 'Total', sortable: true, tipo: 'numero' },
    { key: 'fechadas', label: 'Fechadas', sortable: true, tipo: 'numero' },
    { key: 'taxa_conversao', label: 'Conversão', sortable: true, tipo: 'percentual' }
  ];

  return (
    <div className="analise-geografica">
      <h2><Globe className="inline-icon" /> Análise Geográfica</h2>

      <TabelaRanking
        dados={dados.por_distribuidora}
        colunas={colunasDistribuidora}
        titulo="Performance por Distribuidora"
        loading={loading}
      />

      <TabelaRanking
        dados={dados.por_estado}
        colunas={colunasEstado}
        titulo="Performance por Estado"
        loading={loading}
      />
    </div>
  );
};

export default AnaliseGeografica;