// src/pages/UGsPage.jsx
import React, { useState, useEffect } from 'react';
import Header from '../components/common/Header';
import Navigation from '../components/common/Navigation';
import { useNotification } from '../context/NotificationContext';
import './UGsPage.css';

const UGsPage = () => {
  const [ugs, setUGs] = useState([]);
  const [ugsFiltradas, setUGsFiltradas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [ugEditando, setUGEditando] = useState(null);
  const [filtros, setFiltros] = useState({
    nome: '',
    status: '',
    capacidadeMin: '',
    capacidadeMax: ''
  });
  const [formData, setFormData] = useState({
    nomeUsina: '',
    potenciaCA: '',
    potenciaCC: '',
    fatorCapacidade: '',
    capacidadeCalculada: ''
  });

  const { showNotification } = useNotification();

  useEffect(() => {
    carregarUGs();
  }, []);

  useEffect(() => {
    aplicarFiltros();
  }, [ugs, filtros]);

  const carregarUGs = async () => {
    try {
      setLoading(true);
      
      // Simular carregamento
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Dados mock de UGs com campos originais
      const ugsMock = [
        {
          id: 1,
          nomeUsina: 'Usina Solar Goiânia I',
          potenciaCA: 4.8,
          potenciaCC: 5.2,
          fatorCapacidade: 35.0,
          capacidade: 1310.4,
          media: 1250,
          calibrado: 1350,
          clientesVinculados: 25
        },
        {
          id: 2,
          nomeUsina: 'Usina Solar Brasília II',
          potenciaCA: 3.6,
          potenciaCC: 4.0,
          fatorCapacidade: 32.5,
          capacidade: 936.0,
          media: 890,
          calibrado: 920,
          clientesVinculados: 18
        },
        {
          id: 3,
          nomeUsina: 'Usina Solar Anápolis III',
          potenciaCA: 6.0,
          potenciaCC: 6.5,
          fatorCapacidade: 38.0,
          capacidade: 1774.8,
          media: 0,
          calibrado: 0,
          clientesVinculados: 0
        }
      ];

      setUGs(ugsMock);
      showNotification(`${ugsMock.length} UGs carregadas com sucesso!`, 'success');
    } catch (error) {
      console.error('Erro ao carregar UGs:', error);
      showNotification('Erro ao carregar UGs', 'error');
    } finally {
      setLoading(false);
    }
  };

  const aplicarFiltros = () => {
    let resultado = [...ugs];

    if (filtros.nome) {
      resultado = resultado.filter(ug => 
        ug.nomeUsina.toLowerCase().includes(filtros.nome.toLowerCase())
      );
    }

    if (filtros.status) {
      resultado = resultado.filter(ug => ug.status === filtros.status);
    }

    if (filtros.capacidadeMin) {
      resultado = resultado.filter(ug => ug.capacidade >= parseFloat(filtros.capacidadeMin));
    }

    if (filtros.capacidadeMax) {
      resultado = resultado.filter(ug => ug.capacidade <= parseFloat(filtros.capacidadeMax));
    }

    setUGsFiltradas(resultado);
  };

  const handleFiltroChange = (campo, valor) => {
    setFiltros(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  const limparFiltros = () => {
    setFiltros({
      nome: '',
      status: '',
      capacidadeMin: '',
      capacidadeMax: ''
    });
  };

  const calcularCapacidade = () => {
    const potenciaCC = parseFloat(formData.potenciaCC) || 0;
    const fatorCapacidade = parseFloat(formData.fatorCapacidade) || 0;
    
    if (potenciaCC > 0 && fatorCapacidade > 0) {
      const capacidade = 720 * potenciaCC * (fatorCapacidade / 100);
      setFormData(prev => ({
        ...prev,
        capacidadeCalculada: capacidade.toFixed(2) + ' MWh'
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        capacidadeCalculada: ''
      }));
    }
  };

  const abrirModal = (ug = null) => {
    if (ug) {
      setUGEditando(ug);
      setFormData({
        nomeUsina: ug.nomeUsina,
        potenciaCA: ug.potenciaCA.toString(),
        potenciaCC: ug.potenciaCC.toString(),
        fatorCapacidade: ug.fatorCapacidade.toString(),
        capacidadeCalculada: ug.capacidade.toFixed(2) + ' MWh'
      });
    } else {
      setUGEditando(null);
      setFormData({
        nomeUsina: '',
        potenciaCA: '',
        potenciaCC: '',
        fatorCapacidade: '',
        capacidadeCalculada: ''
      });
    }
    setShowModal(true);
  };

  const fecharModal = () => {
    setShowModal(false);
    setUGEditando(null);
  };

  const handleFormChange = (campo, valor) => {
    setFormData(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  const salvarUG = async () => {
    try {
      if (!formData.nomeUsina || !formData.potenciaCA || !formData.potenciaCC || !formData.fatorCapacidade) {
        showNotification('Preencha todos os campos obrigatórios!', 'error');
        return;
      }

      const potenciaCA = parseFloat(formData.potenciaCA);
      const potenciaCC = parseFloat(formData.potenciaCC);
      const fatorCapacidade = parseFloat(formData.fatorCapacidade);
      
      if (isNaN(potenciaCA) || potenciaCA <= 0) {
        showNotification('Potência CA deve ser um número válido!', 'error');
        return;
      }
      
      if (isNaN(potenciaCC) || potenciaCC <= 0) {
        showNotification('Potência CC deve ser um número válido!', 'error');
        return;
      }
      
      if (isNaN(fatorCapacidade) || fatorCapacidade <= 0 || fatorCapacidade > 100) {
        showNotification('Fator de Capacidade deve ser entre 0 e 100!', 'error');
        return;
      }

      // Calcular capacidade
      const capacidade = 720 * potenciaCC * (fatorCapacidade / 100);

      await new Promise(resolve => setTimeout(resolve, 500));

      if (ugEditando) {
        const novasUGs = ugs.map(ug => 
          ug.id === ugEditando.id 
            ? { 
                ...ug, 
                nomeUsina: formData.nomeUsina,
                potenciaCA,
                potenciaCC,
                fatorCapacidade,
                capacidade
              }
            : ug
        );
        setUGs(novasUGs);
        showNotification('UG atualizada com sucesso!', 'success');
      } else {
        const novaUG = {
          id: Date.now(),
          nomeUsina: formData.nomeUsina,
          potenciaCA,
          potenciaCC,
          fatorCapacidade,
          capacidade,
          media: 0,
          calibrado: 0,
          clientesVinculados: 0
        };
        setUGs(prev => [...prev, novaUG]);
        showNotification('UG criada com sucesso!', 'success');
      }

      fecharModal();
    } catch (error) {
      console.error('Erro ao salvar UG:', error);
      showNotification('Erro ao salvar UG', 'error');
    }
  };

  const excluirUG = async (ug) => {
    if (!window.confirm(`Tem certeza que deseja excluir a UG "${ug.nomeUsina}"?`)) {
      return;
    }

    try {
      if (ug.clientesVinculados > 0) {
        showNotification(
          `Não é possível excluir. Esta UG possui ${ug.clientesVinculados} clientes vinculados.`, 
          'error'
        );
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      const novasUGs = ugs.filter(u => u.id !== ug.id);
      setUGs(novasUGs);
      showNotification('UG excluída com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao excluir UG:', error);
      showNotification('Erro ao excluir UG', 'error');
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Ativa': return 'status-ativa';
      case 'Em Construção': return 'status-construcao';
      case 'Planejada': return 'status-planejada';
      case 'Inativa': return 'status-inativa';
      default: return 'status-default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Ativa': return '🟢';
      case 'Em Construção': return '🟡';
      case 'Planejada': return '🔵';
      case 'Inativa': return '🔴';
      default: return '⚪';
    }
  };

  const baixarPDF = async (item) => {
    try {
      showNotification('📄 Gerando PDF da proposta...', 'info');
      
      // Buscar todas as UCs da mesma proposta
      const todasUCs = dados.filter(p => p.numeroProposta === item.numeroProposta);
      
      // Reconstroir dados da proposta igual ao sistema original
      const dadosProposta = {
        numeroProposta: item.numeroProposta,
        nomeCliente: item.nomeCliente,
        data: item.data,
        celular: item.telefone,
        consultor: item.consultor,
        recorrencia: item.recorrencia,
        descontoTarifa: item.descontoTarifa,
        descontoBandeira: item.descontoBandeira,
        status: item.status,
        ucs: todasUCs.map(uc => ({
          distribuidora: 'Equatorial',
          numeroUC: uc.numeroUC,
          apelido: uc.apelido,
          ligacao: uc.ligacao,
          consumo: uc.media
        })),
        // Benefícios padrão como no sistema original
        beneficios: [
          { numero: 1, texto: `Economia de até ${Math.round((item.descontoTarifa || 0.2) * 100)}% na tarifa de energia elétrica, sem impostos` },
          { numero: 2, texto: `Economia de até ${Math.round((item.descontoBandeira || 0.2) * 100)}% no valor referente à bandeira tarifária, sem impostos` },
          { numero: 3, texto: 'Isenção de taxa de adesão' },
          { numero: 4, texto: 'Não há cobrança de taxa de cancelamento' },
          { numero: 5, texto: 'Não há fidelidade contratual' },
          { numero: 6, texto: 'O cliente pode cancelar a qualquer momento' },
          { numero: 7, texto: 'Atendimento personalizado' },
          { numero: 8, texto: 'Suporte técnico especializado' },
          { numero: 9, texto: 'Economia imediata na primeira fatura' }
        ]
      };
      
      // Tentar usar a função global como no sistema original
      if (typeof window.gerarPDFProposta === 'function') {
        await window.gerarPDFProposta(dadosProposta, true);
      } else if (typeof window.baixarPDFProposta === 'function') {
        await window.baixarPDFProposta(dadosProposta);
      } else {
        throw new Error('Gerador de PDF não disponível');
      }
      
      showNotification('PDF baixado com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      showNotification('Erro ao gerar PDF: ' + error.message, 'error');
    }
  };

  const editarItem = (index) => {
    // Implementar edição se necessário
    showNotification('Função de edição em desenvolvimento', 'info');
  };

  const calcularEstatisticas = () => {
    const total = ugs.length;
    const ativas = ugs.filter(ug => ug.clientesVinculados > 0).length;
    const capacidadeTotal = ugs.reduce((acc, ug) => acc + ug.capacidade, 0);
    const potenciaCATotalUG = ugs.reduce((acc, ug) => acc + ug.potenciaCA, 0);
    
    return { total, ativas, capacidadeTotal, potenciaCATotalUG };
  };

  const stats = calcularEstatisticas();

  return (
    <div className="page-container">
      <div className="container">
        <Header 
          title="UNIDADES GERADORAS" 
          subtitle="Gestão de Usinas Solares" 
          icon="🏢" 
        />
        
        <Navigation />

        {/* Estatísticas Rápidas */}
        <section className="quick-stats">
          <div className="stat-card">
            <div className="stat-icon">🏢</div>
            <div className="stat-info">
              <div className="stat-value">{stats.total}</div>
              <div className="stat-label">Total de UGs</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🟢</div>
            <div className="stat-info">
              <div className="stat-value">{stats.ativas}</div>
              <div className="stat-label">UGs Ativas</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⚡</div>
            <div className="stat-info">
              <div className="stat-value">{stats.capacidadeTotal.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</div>
              <div className="stat-label">Capacidade Total</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🔌</div>
            <div className="stat-info">
              <div className="stat-value">{stats.potenciaCATotalUG.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</div>
              <div className="stat-label">Potência CA Total</div>
            </div>
          </div>
        </section>

        {/* Filtros */}
        <section className="filters-section">
          <div className="section-header">
            <h2>🔍 Filtros</h2>
            <div className="section-actions">
              <button className="btn btn-secondary" onClick={limparFiltros}>
                🧹 Limpar
              </button>
              <button className="btn btn-primary" onClick={() => abrirModal()}>
                ➕ Nova UG
              </button>
            </div>
          </div>
          
          <div className="filters-grid">
            <div className="filter-group">
              <label>Nome da Usina:</label>
              <input
                type="text"
                value={filtros.nome}
                onChange={(e) => handleFiltroChange('nome', e.target.value)}
                placeholder="Digite o nome..."
              />
            </div>
            
            <div className="filter-group">
              <label>Status:</label>
              <select
                value={filtros.status}
                onChange={(e) => handleFiltroChange('status', e.target.value)}
              >
                <option value="">Todos</option>
                <option value="Ativa">Ativa</option>
                <option value="Em Construção">Em Construção</option>
                <option value="Planejada">Planejada</option>
                <option value="Inativa">Inativa</option>
              </select>
            </div>
            
            <div className="filter-group">
              <label>Potência CA Mín (MW):</label>
              <input
                type="number"
                value={filtros.capacidadeMin}
                onChange={(e) => handleFiltroChange('capacidadeMin', e.target.value)}
                placeholder="0"
                min="0"
                step="0.1"
              />
            </div>
            
            <div className="filter-group">
              <label>Potência CA Máx (MW):</label>
              <input
                type="number"
                value={filtros.capacidadeMax}
                onChange={(e) => handleFiltroChange('capacidadeMax', e.target.value)}
                placeholder="9999"
                min="0"
                step="0.1"
              />
            </div>
          </div>
        </section>

        {/* Tabela de UGs */}
        <section className="data-section">
          <div className="table-header">
            <h2>📋 Lista de UGs ({ugsFiltradas.length})</h2>
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Carregando UGs...</p>
            </div>
          ) : ugsFiltradas.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🏢</div>
              <h3>Nenhuma UG encontrada</h3>
              <p>Não há UGs cadastradas ou que atendam aos filtros aplicados.</p>
              <button className="btn btn-primary" onClick={() => abrirModal()}>
                ➕ Cadastrar primeira UG
              </button>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Usina</th>
                    <th>Potência CA (MW)</th>
                    <th>Potência CC (MW)</th>
                    <th>Fator Capacidade</th>
                    <th>Capacidade (MWh)</th>
                    <th>Média (kWh)</th>
                    <th>Calibragem (kWh)</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {ugsFiltradas.map(ug => (
                    <tr key={ug.id}>
                      <td>
                        <div className="ug-name">
                          <strong>{ug.nomeUsina}</strong>
                          {ug.clientesVinculados > 0 && (
                            <small className="clients-indicator" title={`${ug.clientesVinculados} clientes`}>
                              👥 {ug.clientesVinculados}
                            </small>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="power-value">
                          {ug.potenciaCA.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td>
                        <span className="power-value">
                          {ug.potenciaCC.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td>
                        <span className="factor-value">
                          {ug.fatorCapacidade.toFixed(1)}%
                        </span>
                      </td>
                      <td>
                        <span className="capacity-value">
                          {ug.capacidade.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
                        </span>
                      </td>
                      <td>
                        <span className={`media-value ${ug.media > 0 ? 'has-data' : 'no-data'}`}>
                          {ug.media > 0 ? ug.media.toLocaleString('pt-BR') : '-'}
                        </span>
                      </td>
                      <td>
                        <span className={`calibragem-value ${ug.calibrado > 0 ? 'has-data' : 'no-data'}`}>
                          {ug.calibrado > 0 ? ug.calibrado.toLocaleString('pt-BR') : '-'}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions">
                          <button 
                            className="action-btn edit" 
                            onClick={() => abrirModal(ug)}
                            title="Editar UG"
                          >
                            ✏️
                          </button>
                          <button 
                            className="action-btn delete" 
                            onClick={() => excluirUG(ug)}
                            title="Excluir UG"
                            disabled={ug.clientesVinculados > 0}
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      {/* Modal de UG */}
      {showModal && (
        <div className="modal-overlay" onClick={fecharModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{ugEditando ? '✏️ Editar UG' : '➕ Nova UG'}</h3>
              <button className="modal-close" onClick={fecharModal}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Nome da Usina *</label>
                  <input
                    type="text"
                    value={formData.nomeUsina}
                    onChange={(e) => handleFormChange('nomeUsina', e.target.value)}
                    placeholder="Ex: Usina Solar Goiânia I"
                  />
                </div>
                
                <div className="form-group">
                  <label>Potência CA (MW) *</label>
                  <input
                    type="number"
                    value={formData.potenciaCA}
                    onChange={(e) => handleFormChange('potenciaCA', e.target.value)}
                    placeholder="Ex: 4.8"
                    min="0"
                    step="0.01"
                  />
                </div>
                
                <div className="form-group">
                  <label>Potência CC (MW) *</label>
                  <input
                    type="number"
                    value={formData.potenciaCC}
                    onChange={(e) => {
                      handleFormChange('potenciaCC', e.target.value);
                      calcularCapacidade();
                    }}
                    placeholder="Ex: 5.2"
                    min="0"
                    step="0.01"
                  />
                </div>
                
                <div className="form-group">
                  <label>Fator de Capacidade (%) *</label>
                  <input
                    type="number"
                    value={formData.fatorCapacidade}
                    onChange={(e) => {
                      handleFormChange('fatorCapacidade', e.target.value);
                      calcularCapacidade();
                    }}
                    placeholder="Ex: 35"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </div>
                
                <div className="form-group">
                  <label>Capacidade (MWh) - Calculada Automaticamente</label>
                  <input
                    type="text"
                    value={formData.capacidadeCalculada}
                    readOnly
                    style={{
                      background: '#f8f9fa',
                      color: '#666',
                      fontWeight: '600'
                    }}
                    placeholder="Será calculada automaticamente"
                  />
                </div>
              </div>
            </div>
            
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={fecharModal}>
                Cancelar
              </button>
              <button className="btn btn-primary" onClick={salvarUG}>
                {ugEditando ? 'Atualizar' : 'Criar'} UG
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UGsPage;