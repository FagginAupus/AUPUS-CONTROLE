// src/components/relatorios/DashboardExecutivo.jsx
import React, { useState, useEffect } from 'react';
import { BarChart3, FileText, TrendingUp, Settings, Trophy, Calendar, CheckCircle, Factory } from 'lucide-react';
import apiService from '../../services/apiService';
import CardMetrica from './CardMetrica';
import GraficoLinha from './GraficoLinha';
import GraficoPizza from './GraficoPizza';
import TabelaRanking from './TabelaRanking';

const DashboardExecutivo = ({ filters, loading, setLoading, onNotification }) => {
  const [dados, setDados] = useState({
    metricas_gerais: {},
    evolucao_mensal: [],
    top_consultores: [],
    status_distribuicao: []
  });

  useEffect(() => {
    carregarDados();
  }, [filters]);

  const carregarDados = async () => {
    try {
      setLoading(true);

      const response = await apiService.get('/relatorios/dashboard-executivo', {
        params: {
          data_inicio: filters.dataInicio,
          data_fim: filters.dataFim
        }
      });

      if (response.success) {
        setDados(response.data);
      } else {
        onNotification('Erro ao carregar dashboard executivo', 'error');
      }
    } catch (error) {
      console.error('Erro ao carregar dashboard:', error);
      onNotification('Erro ao carregar dados do dashboard', 'error');
    } finally {
      setLoading(false);
    }
  };

  const { metricas_gerais, evolucao_mensal, top_consultores, status_distribuicao } = dados;

  // Preparar dados para gráficos
  const dadosEvolucao = evolucao_mensal.map(item => ({
    periodo: item.periodo,
    total: item.total,
    fechadas: item.fechadas,
    taxa_conversao: item.taxa_conversao
  }));

  const dadosStatus = status_distribuicao.map(item => ({
    name: item.status_proposta || 'Não definido',
    value: item.quantidade,
    percentual: item.percentual
  }));

  // Colunas para ranking de consultores
  const colunasRanking = [
    {
      key: 'consultor',
      label: 'Consultor',
      sortable: true,
      align: 'left'
    },
    {
      key: 'total_propostas',
      label: 'Total',
      sortable: true,
      align: 'center',
      tipo: 'numero'
    },
    {
      key: 'fechadas',
      label: 'Fechadas',
      sortable: true,
      align: 'center',
      tipo: 'numero'
    },
    {
      key: 'ticket_medio',
      label: 'Ticket Médio',
      sortable: true,
      align: 'right',
      tipo: 'moeda'
    }
  ];

  return (
    <div className="dashboard-executivo">
      {/* Métricas Principais */}
      <section className="metricas-principais">
        <h2><BarChart3 className="inline-icon" size={16} /> Visão Geral</h2>
        <div className="cards-grid">
          <CardMetrica
            titulo="Total de Propostas"
            valor={metricas_gerais.total_propostas}
            icone={<FileText className="inline-icon" size={16} />}
            corFundo="#e3f2fd"
            loading={loading}
          />

          <CardMetrica
            titulo="Propostas Fechadas"
            valor={metricas_gerais.propostas_fechadas}
            icone={<CheckCircle className="inline-icon" size={16} />}
            corFundo="#e8f5e8"
            loading={loading}
          />

          <CardMetrica
            titulo="Taxa de Conversão"
            valor={`${metricas_gerais.taxa_conversao || 0}%`}
            icone={<TrendingUp className="inline-icon" size={16} />}
            corFundo="#fff3e0"
            loading={loading}
          />

          <CardMetrica
            titulo="No Controle"
            valor={metricas_gerais.total_controle}
            icone={<Settings className="inline-icon" size={16} />}
            corFundo="#f3e5f5"
            loading={loading}
          />

          <CardMetrica
            titulo="UGs Disponíveis"
            valor={metricas_gerais.total_ugs}
            icone={<Factory className="inline-icon" size={16} />}
            corFundo="#e0f2f1"
            loading={loading}
          />
        </div>
      </section>

      {/* Gráficos */}
      <section className="graficos-dashboard">
        <div className="graficos-grid">
          {/* Evolução Mensal */}
          <div className="grafico-item">
            <GraficoLinha
              dados={dadosEvolucao}
              titulo="Evolução de Propostas"
              altura={350}
              linhas={[
                { key: 'total', cor: '#8884d8', nome: 'Total de Propostas' },
                { key: 'fechadas', cor: '#82ca9d', nome: 'Propostas Fechadas' }
              ]}
              xAxisKey="periodo"
              loading={loading}
            />
          </div>

          {/* Distribuição por Status */}
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
        </div>
      </section>

      {/* Top Consultores */}
      <section className="ranking-consultores">
        <TabelaRanking
          dados={top_consultores}
          colunas={colunasRanking}
          titulo="Top 5 Consultores"
          iconeColuna={<Trophy className="inline-icon" size={16} />}
          loading={loading}
          maxHeight="300px"
          showPagination={false}
        />
      </section>

      {/* Taxa de Conversão por Período */}
      {dadosEvolucao.length > 0 && (
        <section className="conversao-periodo">
          <GraficoLinha
            dados={dadosEvolucao}
            titulo="Taxa de Conversão por Período"
            altura={300}
            linhas={[
              { key: 'taxa_conversao', cor: '#ff7c7c', nome: 'Taxa de Conversão (%)' }
            ]}
            xAxisKey="periodo"
            loading={loading}
            formatoTooltip={(value) => `${value.toFixed(1)}%`}
          />
        </section>
      )}

      {/* Resumo do Período */}
      <section className="resumo-periodo">
        <div className="resumo-card">
          <h3><Calendar className="inline-icon" size={16} /> Resumo do Período</h3>
          <div className="resumo-content">
            <div className="resumo-item">
              <strong>Período analisado:</strong>
              <span>{filters.dataInicio} até {filters.dataFim}</span>
            </div>

            <div className="resumo-item">
              <strong>Performance:</strong>
              <span>
                {metricas_gerais.propostas_fechadas} de {metricas_gerais.total_propostas} propostas fechadas
                ({metricas_gerais.taxa_conversao}% de conversão)
              </span>
            </div>

            <div className="resumo-item">
              <strong>Melhor mês:</strong>
              <span>
                {dadosEvolucao.length > 0
                  ? dadosEvolucao.reduce((melhor, atual) =>
                    atual.taxa_conversao > melhor.taxa_conversao ? atual : melhor
                  ).periodo
                  : 'N/A'
                }
              </span>
            </div>

            <div className="resumo-item">
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
          </div>
        </div>
      </section>
    </div>
  );
};

export default DashboardExecutivo;