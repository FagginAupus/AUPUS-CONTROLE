// src/components/relatorios/ControleClube.jsx
import React, { useState, useEffect } from 'react';
import { Settings, BarChart3, AlertTriangle, Home, Factory } from 'lucide-react';
import apiService from '../../services/apiService';
import CardMetrica from './CardMetrica';
import GraficoPizza from './GraficoPizza';
import TabelaRanking from './TabelaRanking';

const ControleClube = ({ filters, loading, setLoading, onNotification }) => {
  const [dados, setDados] = useState({
    status_troca: [],
    capacidade: {},
    performance_calibragem: [],
    alertas: []
  });

  useEffect(() => {
    carregarDados();
  }, [filters]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/relatorios/controle-clube');
      if (response.success) {
        setDados(response.data);
      }
    } catch (error) {
      onNotification('Erro ao carregar controle clube', 'error');
    } finally {
      setLoading(false);
    }
  };

  const { status_troca, capacidade, performance_calibragem, alertas } = dados;

  return (
    <div className="controle-clube">
      <h2><Settings className="inline-icon" size={16} /> Controle Clube</h2>

      <div className="cards-grid">
        <CardMetrica
          titulo="Total de UCs"
          valor={capacidade.total_ucs}
          icone={<Home className="inline-icon" size={16} />}
          corFundo="#e3f2fd"
          loading={loading}
        />
        <CardMetrica
          titulo="UGs Disponíveis"
          valor={capacidade.ugs_disponiveis}
          icone={<Factory className="inline-icon" size={16} />}
          corFundo="#e8f5e8"
          loading={loading}
        />
        <CardMetrica
          titulo="Ocupação"
          valor={`${capacidade.ocupacao_percentual || 0}%`}
          icone={<BarChart3 className="inline-icon" size={16} />}
          corFundo="#fff3e0"
          loading={loading}
        />
      </div>

      {alertas.length > 0 && (
        <section className="alertas">
          <h3><AlertTriangle className="inline-icon" size={16} /> Alertas Operacionais</h3>
          <div className="alertas-list">
            {alertas.map((alerta, index) => (
              <div key={index} className={`alerta-item ${alerta.tipo}`}>
                <div className="alerta-header">
                  <strong>{alerta.titulo}</strong>
                  <span className="alerta-quantidade">{alerta.quantidade}</span>
                </div>
                <p>{alerta.descricao}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export default ControleClube;