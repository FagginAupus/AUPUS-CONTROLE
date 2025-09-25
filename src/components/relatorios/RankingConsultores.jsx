// src/components/relatorios/RankingConsultores.jsx
import React, { useState, useEffect } from 'react';
import { Trophy, BarChart3, FileText, TrendingUp, DollarSign, X, Users, Target, CheckCircle, Calendar, Medal, User, Lightbulb, Zap, Gem } from 'lucide-react';
import apiService from '../../services/apiService';
import CardMetrica from './CardMetrica';
import TabelaRanking from './TabelaRanking';
import GraficoLinha from './GraficoLinha';

const RankingConsultores = ({ filters, loading, setLoading, onNotification }) => {
  const [dados, setDados] = useState({
    ranking: [],
    periodo: '',
    total_consultores: 0
  });
  const [consultorSelecionado, setConsultorSelecionado] = useState(null);
  const [detalhesConsultor, setDetalhesConsultor] = useState(null);

  useEffect(() => {
    carregarDados();
  }, [filters]);

  const carregarDados = async () => {
    try {
      setLoading(true);

      const response = await apiService.get('/relatorios/ranking-consultores', {
        params: {
          data_inicio: filters.dataInicio,
          data_fim: filters.dataFim,
          limit: 50
        }
      });

      if (response.success) {
        setDados(response.data);
      } else {
        onNotification('Erro ao carregar ranking de consultores', 'error');
      }
    } catch (error) {
      console.error('Erro ao carregar ranking:', error);
      onNotification('Erro ao carregar dados do ranking', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleConsultorClick = async (consultor) => {
    setConsultorSelecionado(consultor);

    // Aqui poderia carregar dados detalhados do consultor
    // Por enquanto, vamos usar os dados já disponíveis
    setDetalhesConsultor(consultor);
  };

  // Colunas da tabela de ranking
  const colunas = [
    {
      key: 'posicao',
      label: 'Posição',
      sortable: false,
      align: 'center',
      render: (value, row, index) => {
        const medalhas = [<Medal className="medal gold" size={20} />, <Medal className="medal silver" size={20} />, <Medal className="medal bronze" size={20} />];
        return (
          <span className={`posicao posicao-${index + 1}`}>
            {index < 3 ? medalhas[index] : `${index + 1}º`}
          </span>
        );
      }
    },
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
      key: 'taxa_conversao',
      label: 'Conversão',
      sortable: true,
      align: 'center',
      tipo: 'percentual'
    },
    {
      key: 'ticket_medio',
      label: 'Ticket Médio',
      sortable: true,
      align: 'right',
      tipo: 'moeda'
    },
    {
      key: 'valor_total',
      label: 'Volume Total',
      sortable: true,
      align: 'right',
      tipo: 'moeda'
    },
    {
      key: 'propostas_por_dia',
      label: 'Prod/Dia',
      sortable: true,
      align: 'center',
      render: (value) => value ? value.toFixed(1) : '0'
    }
  ];

  // Métricas do top 3
  const top3 = dados.ranking.slice(0, 3);
  const totalFechadas = dados.ranking.reduce((sum, c) => sum + c.fechadas, 0);
  const melhorTaxa = dados.ranking.length > 0
    ? Math.max(...dados.ranking.map(c => c.taxa_conversao))
    : 0;

  return (
    <div className="ranking-consultores">
      {/* Métricas do Ranking */}
      <section className="metricas-ranking">
        <h2><Trophy className="inline-icon" size={16} /> Ranking de Consultores</h2>

        <div className="cards-grid">
          <CardMetrica
            titulo="Total de Consultores"
            valor={dados.total_consultores}
            icone={<Users className="inline-icon" size={16} />}
            corFundo="#e3f2fd"
            loading={loading}
          />

          <CardMetrica
            titulo="Melhor Taxa de Conversão"
            valor={`${melhorTaxa.toFixed(1)}%`}
            icone={<Target className="inline-icon" size={16} />}
            corFundo="#e8f5e8"
            loading={loading}
          />

          <CardMetrica
            titulo="Total de Fechamentos"
            valor={totalFechadas}
            icone={<CheckCircle className="inline-icon" size={16} />}
            corFundo="#fff3e0"
            loading={loading}
          />

          <CardMetrica
            titulo="Período"
            valor={dados.periodo}
            icone={<Calendar className="inline-icon" size={16} />}
            corFundo="#f3e5f5"
            loading={loading}
          />
        </div>
      </section>

      {/* Pódio - Top 3 */}
      {top3.length > 0 && (
        <section className="podio">
          <h3><Trophy className="inline-icon" size={16} /> Pódio dos Campeões</h3>
          <div className="podio-container">
            {/* 2º Lugar */}
            {top3[1] && (
              <div className="podio-item segundo">
                <div className="podio-medalha"><Medal className="medal silver" size={24} /></div>
                <div className="podio-info">
                  <div className="podio-nome">{top3[1].consultor}</div>
                  <div className="podio-stats">
                    <span>{top3[1].fechadas} fechadas</span>
                    <span>{top3[1].taxa_conversao.toFixed(1)}% conversão</span>
                  </div>
                </div>
              </div>
            )}

            {/* 1º Lugar */}
            {top3[0] && (
              <div className="podio-item primeiro">
                <div className="podio-medalha"><Medal className="medal gold" size={24} /></div>
                <div className="podio-info">
                  <div className="podio-nome">{top3[0].consultor}</div>
                  <div className="podio-stats">
                    <span>{top3[0].fechadas} fechadas</span>
                    <span>{top3[0].taxa_conversao.toFixed(1)}% conversão</span>
                  </div>
                </div>
              </div>
            )}

            {/* 3º Lugar */}
            {top3[2] && (
              <div className="podio-item terceiro">
                <div className="podio-medalha"><Medal className="medal bronze" size={24} /></div>
                <div className="podio-info">
                  <div className="podio-nome">{top3[2].consultor}</div>
                  <div className="podio-stats">
                    <span>{top3[2].fechadas} fechadas</span>
                    <span>{top3[2].taxa_conversao.toFixed(1)}% conversão</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Tabela Completa de Ranking */}
      <section className="tabela-ranking-completa">
        <TabelaRanking
          dados={dados.ranking}
          colunas={colunas}
          titulo={`Ranking Completo (${dados.total_consultores} consultores)`}
          iconeColuna={<BarChart3 className="inline-icon" size={16} />}
          loading={loading}
          onRowClick={handleConsultorClick}
          showPagination={true}
          itemsPerPage={15}
        />
      </section>

      {/* Detalhes do Consultor Selecionado */}
      {consultorSelecionado && detalhesConsultor && (
        <section className="detalhes-consultor">
          <div className="detalhes-header">
            <h3><User className="inline-icon" size={16} /> Detalhes: {consultorSelecionado.consultor}</h3>
            <button
              className="btn-fechar"
              onClick={() => {
                setConsultorSelecionado(null);
                setDetalhesConsultor(null);
              }}
            >
              <X className="inline-icon" size={16} />
            </button>
          </div>

          <div className="detalhes-content">
            <div className="detalhes-grid">
              <CardMetrica
                titulo="Total de Propostas"
                valor={detalhesConsultor.total_propostas}
                icone={<FileText className="inline-icon" size={16} />}
                corFundo="#e3f2fd"
              />

              <CardMetrica
                titulo="Propostas Fechadas"
                valor={detalhesConsultor.fechadas}
                icone={<CheckCircle className="inline-icon" size={16} />}
                corFundo="#e8f5e8"
              />

              <CardMetrica
                titulo="Taxa de Conversão"
                valor={`${detalhesConsultor.taxa_conversao.toFixed(1)}%`}
                icone={<Target className="inline-icon" size={16} />}
                corFundo="#fff3e0"
              />

              <CardMetrica
                titulo="Ticket Médio"
                valor={`R$ ${detalhesConsultor.ticket_medio?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}`}
                icone={<DollarSign className="inline-icon" size={16} />}
                corFundo="#f3e5f5"
              />

              <CardMetrica
                titulo="Volume Total"
                valor={`R$ ${detalhesConsultor.valor_total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}`}
                icone={<TrendingUp className="inline-icon" size={16} />}
                corFundo="#e0f2f1"
              />

              <CardMetrica
                titulo="Produtividade Diária"
                valor={`${detalhesConsultor.propostas_por_dia?.toFixed(1) || '0'} props/dia`}
                icone={<Zap className="inline-icon" size={16} />}
                corFundo="#fce4ec"
              />
            </div>

            <div className="detalhes-insights">
              <h4><Lightbulb className="inline-icon" size={16} /> Insights</h4>
              <div className="insights-list">
                <div className="insight-item">
                  <strong>Performance:</strong>
                  {detalhesConsultor.taxa_conversao >= 30
                    ? ' Excelente taxa de conversão!'
                    : detalhesConsultor.taxa_conversao >= 20
                      ? ' Boa performance!'
                      : ' Potencial de melhoria na conversão'
                  }
                </div>

                <div className="insight-item">
                  <strong>Produtividade:</strong>
                  {detalhesConsultor.propostas_por_dia >= 2
                    ? ' Alta produtividade diária!'
                    : detalhesConsultor.propostas_por_dia >= 1
                      ? ' Produtividade adequada'
                      : ' Oportunidade para aumentar volume'
                  }
                </div>

                <div className="insight-item">
                  <strong>Ticket Médio:</strong>
                  {detalhesConsultor.ticket_medio >= 500
                    ? ' Foco em clientes premium!'
                    : detalhesConsultor.ticket_medio >= 300
                      ? ' Ticket médio equilibrado'
                      : ' Oportunidade para ticket médio maior'
                  }
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Comparativo de Performance */}
      {dados.ranking.length > 0 && (
        <section className="comparativo-performance">
          <GraficoLinha
            dados={dados.ranking.slice(0, 10).map((consultor, index) => ({
              consultor: consultor.consultor,
              fechadas: consultor.fechadas,
              taxa_conversao: consultor.taxa_conversao,
              posicao: index + 1
            }))}
            titulo="Top 10 - Fechamentos vs Taxa de Conversão"
            altura={400}
            linhas={[
              { key: 'fechadas', cor: '#8884d8', nome: 'Propostas Fechadas' },
              { key: 'taxa_conversao', cor: '#82ca9d', nome: 'Taxa de Conversão (%)' }
            ]}
            xAxisKey="consultor"
            loading={loading}
          />
        </section>
      )}
    </div>
  );
};

export default RankingConsultores;