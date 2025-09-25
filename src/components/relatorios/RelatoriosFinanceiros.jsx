// src/components/relatorios/RelatoriosFinanceiros.jsx
import React, { useState, useEffect } from 'react';
import { DollarSign, Gem } from 'lucide-react';
import apiService from '../../services/apiService';
import CardMetrica from './CardMetrica';
import TabelaRanking from './TabelaRanking';

const RelatoriosFinanceiros = ({ filters, loading, setLoading, onNotification }) => {
  const [dados, setDados] = useState({
    pipeline: [],
    comissoes: [],
    roi_canal: []
  });

  useEffect(() => {
    carregarDados();
  }, [filters]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/relatorios/financeiro', {
        params: { data_inicio: filters.dataInicio, data_fim: filters.dataFim }
      });
      if (response.success) {
        setDados(response.data);
      }
    } catch (error) {
      onNotification('Erro ao carregar relatórios financeiros', 'error');
    } finally {
      setLoading(false);
    }
  };

  const totalPipeline = dados.pipeline.reduce((sum, item) => sum + (item.valor_total || 0), 0);

  return (
    <div className="relatorios-financeiros">
      <h2><DollarSign className="inline-icon" size={16} /> Relatórios Financeiros</h2>

      <div className="cards-grid">
        <CardMetrica
          titulo="Pipeline Total"
          valor={`R$ ${totalPipeline.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icone={<Gem className="inline-icon" size={16} />}
          corFundo="#e3f2fd"
          loading={loading}
        />
      </div>

      <TabelaRanking
        dados={dados.comissoes}
        colunas={[
          { key: 'consultor', label: 'Consultor', sortable: true },
          { key: 'total_ucs', label: 'UCs', sortable: true, tipo: 'numero' },
          { key: 'comissao_estimada', label: 'Comissão Estimada', sortable: true, tipo: 'moeda' }
        ]}
        titulo="Simulação de Comissões"
        loading={loading}
      />
    </div>
  );
};

export default RelatoriosFinanceiros;