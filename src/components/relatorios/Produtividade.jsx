// src/components/relatorios/Produtividade.jsx
import React, { useState, useEffect } from 'react';
import { TrendingUp, AlertTriangle } from 'lucide-react';
import apiService from '../../services/apiService';
import TabelaRanking from './TabelaRanking';

const Produtividade = ({ filters, loading, setLoading, onNotification }) => {
  const [dados, setDados] = useState({
    ciclo_vendas: [],
    gargalos: []
  });

  useEffect(() => {
    carregarDados();
  }, [filters]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/relatorios/produtividade', {
        params: { data_inicio: filters.dataInicio, data_fim: filters.dataFim }
      });
      if (response.success) {
        setDados(response.data);
      }
    } catch (error) {
      onNotification('Erro ao carregar produtividade', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="produtividade">
      <h2><TrendingUp className="inline-icon" size={16} /> Produtividade</h2>

      <TabelaRanking
        dados={dados.ciclo_vendas}
        colunas={[
          { key: 'consultor', label: 'Consultor', sortable: true },
          { key: 'ciclo_medio_dias', label: 'Ciclo Médio (dias)', sortable: true, tipo: 'numero' },
          { key: 'fechadas', label: 'Fechadas', sortable: true, tipo: 'numero' }
        ]}
        titulo="Ciclo de Vendas"
        loading={loading}
      />

      <TabelaRanking
        dados={dados.gargalos}
        colunas={[
          { key: 'status_proposta', label: 'Status', sortable: true },
          { key: 'quantidade', label: 'Quantidade', sortable: true, tipo: 'numero' },
          { key: 'dias_medio_parado', label: 'Dias Parado (média)', sortable: true, tipo: 'numero' }
        ]}
        titulo="Gargalos Identificados"
        iconeColuna={<AlertTriangle className="inline-icon" size={16} />}
        loading={loading}
      />
    </div>
  );
};

export default Produtividade;