// src/components/relatorios/AnalisePropostas.jsx
import React, { useState, useEffect } from 'react';
import { FileText, BarChart3, DollarSign, Clock, Lightbulb, Gem, Zap } from 'lucide-react';
import apiService from '../../services/apiService';
import CardMetrica from './CardMetrica';
import GraficoPizza from './GraficoPizza';
import TabelaRanking from './TabelaRanking';

const AnalisePropostas = ({ filters, loading, setLoading, onNotification }) => {
  const [dados, setDados] = useState({
    status_distribuicao: [],
    funil_conversao: {},
    tempo_medio_status: [],
    analise_valores: {}
  });

  useEffect(() => {
    carregarDados();
  }, [filters]);

  const carregarDados = async () => {
    try {
      setLoading(true);

      const response = await apiService.get('/relatorios/analise-propostas', {
        params: {
          data_inicio: filters.dataInicio,
          data_fim: filters.dataFim
        }
      });

      if (response.success) {
        setDados(response.data);
      } else {
        onNotification('Erro ao carregar análise de propostas', 'error');
      }
    } catch (error) {
      console.error('Erro ao carregar análise:', error);
      onNotification('Erro ao carregar dados da análise', 'error');
    } finally {
      setLoading(false);
    }
  };

  const { status_distribuicao, funil_conversao, tempo_medio_status, analise_valores } = dados;

  // Preparar dados para gráficos
  const dadosStatus = status_distribuicao.map(item => ({
    name: item.status_proposta || 'Não definido',
    value: item.quantidade,
    valor_medio: item.valor_medio,
    consumo_medio: item.consumo_medio
  }));

  const dadosFunil = [
    { name: 'Total Prospects', value: funil_conversao.total_prospects || 0 },
    { name: 'Em Negociação', value: funil_conversao.em_negociacao || 0 },
    { name: 'Aprovação Pendente', value: funil_conversao.aprovacao_pendente || 0 },
    { name: 'Fechadas', value: funil_conversao.fechadas || 0 },
    { name: 'Perdidas', value: funil_conversao.perdidas || 0 }
  ];

  const colunasTempo = [
    { key: 'status_proposta', label: 'Status', sortable: true, align: 'left' },
    { key: 'dias_medio', label: 'Tempo Médio (dias)', sortable: true, align: 'center', tipo: 'numero' }
  ];

  return (
    <div className="analise-propostas">
      <section className="metricas-propostas">
        <h2><FileText className="inline-icon" size={16} /> Análise de Propostas</h2>

        <div className="cards-grid">
          <CardMetrica
            titulo="Total de Propostas"
            valor={analise_valores.total}
            icone={<BarChart3 className="inline-icon" size={16} />}
            corFundo="#e3f2fd"
            loading={loading}
          />

          <CardMetrica
            titulo="Valor Médio"
            valor={`R$ ${analise_valores.valor_medio?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}`}
            icone={<DollarSign className="inline-icon" size={16} />}
            corFundo="#e8f5e8"
            loading={loading}
          />

          <CardMetrica
            titulo="Valor Total"
            valor={`R$ ${analise_valores.valor_total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}`}
            icone={<Gem className="inline-icon" size={16} />}
            corFundo="#fff3e0"
            loading={loading}
          />

          <CardMetrica
            titulo="Consumo Médio"
            valor={`${analise_valores.consumo_medio?.toFixed(0) || 0} kWh`}
            icone={<Zap className="inline-icon" size={16} />}
            corFundo="#f3e5f5"
            loading={loading}
          />
        </div>
      </section>

      <section className="graficos-analise">
        <div className="graficos-grid">
          <div className="grafico-item">
            <GraficoPizza
              dados={dadosStatus}
              titulo="Distribuição por Status"
              altura={350}
              dataKey="value"
              nameKey="name"
              loading={loading}
              cores={['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8']}
            />
          </div>

          <div className="grafico-item">
            <GraficoPizza
              dados={dadosFunil.filter(item => item.value > 0)}
              titulo="Funil de Conversão"
              altura={350}
              dataKey="value"
              nameKey="name"
              loading={loading}
              cores={['#82ca9d', '#8884d8', '#ffc658', '#ff7c7c', '#8dd1e1']}
            />
          </div>
        </div>
      </section>

      <section className="tempo-status">
        <TabelaRanking
          dados={tempo_medio_status.map(item => ({
            ...item,
            dias_medio: Math.round(item.dias_medio || 0)
          }))}
          colunas={colunasTempo}
          titulo="Tempo Médio por Status"
          iconeColuna={<Clock className="inline-icon" size={16} />}
          loading={loading}
          showPagination={false}
        />
      </section>

      <section className="insights-analise">
        <div className="insights-card">
          <h3><Lightbulb className="inline-icon" size={16} /> Insights da Análise</h3>
          <div className="insights-content">
            <div className="insight-item">
              <strong>Status predominante:</strong>
              <span>
                {dadosStatus.length > 0
                  ? dadosStatus.reduce((maior, atual) =>
                    atual.value > maior.value ? atual : maior
                  ).name
                  : 'N/A'
                }
              </span>
            </div>

            <div className="insight-item">
              <strong>Ticket médio vs máximo:</strong>
              <span>
                Diferença de {analise_valores.valor_maximo && analise_valores.valor_medio
                  ? `R$ ${(analise_valores.valor_maximo - analise_valores.valor_medio).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                  : 'N/A'
                }
              </span>
            </div>

            <div className="insight-item">
              <strong>Eficiência do funil:</strong>
              <span>
                {funil_conversao.total_prospects && funil_conversao.fechadas
                  ? `${((funil_conversao.fechadas / funil_conversao.total_prospects) * 100).toFixed(1)}% de conversão`
                  : 'N/A'
                }
              </span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AnalisePropostas;