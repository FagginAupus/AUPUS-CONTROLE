// src/pages/UGsPage.jsx - Com cálculo de calibragem corrigido
import React, { useState, useEffect, useCallback } from 'react';
import Header from '../components/common/Header';
import Navigation from '../components/common/Navigation';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import storageService from '../services/storageService';

const UGsPage = () => {
  const { user } = useAuth();
  const [dados, setDados] = useState([]);
  const [dadosFiltrados, setDadosFiltrados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [calibragemGlobal, setCalibragemGlobal] = useState(0);
  const [calibragemAplicada, setCalibragemAplicada] = useState(0); // Valor realmente aplicado
  const [modalNovaUG, setModalNovaUG] = useState({ show: false });
  const [modalEdicao, setModalEdicao] = useState({ show: false, item: null, index: -1 });
  
  const [filtros, setFiltros] = useState({
    busca: '',
    status: ''
  });

  const [estatisticas, setEstatisticas] = useState({
    total: 0,
    calibradas: 0,
    naoCalibradas: 0,
    capacidadeTotal: 0
  });

  const { showNotification } = useNotification();

  const carregarDados = useCallback(async () => {
    try {
      setLoading(true);
      
      const ugs = await storageService.getUGs();
      const controle = await storageService.getControle();
      
      // Calcular médias e UCs por UG
      const ugsComCalculos = ugs.map(ug => {
        // Encontrar UCs desta UG
        const ucsDestaUG = controle.filter(uc => uc.ug === ug.nomeUsina);
        
        // Calcular média das UCs desta UG
        const mediaTotal = ucsDestaUG.reduce((soma, uc) => soma + (parseFloat(uc.media) || 0), 0);
        const mediaUG = ucsDestaUG.length > 0 ? Math.round(mediaTotal / ucsDestaUG.length) : 0;
        
        return {
          ...ug,
          media: mediaUG,
          ucsAtribuidas: ucsDestaUG.length,
          mediaTotal: Math.round(mediaTotal) // Para cálculo de calibragem
        };
      });
      
      setDados(ugsComCalculos);
      setDadosFiltrados(ugsComCalculos);
      
      // Carregar calibragem global
      const calibragem = storageService.getCalibragemGlobal();
      setCalibragemGlobal(calibragem);
      setCalibragemAplicada(calibragem); // Também definir como aplicada
      
      // Atualizar estatísticas
      atualizarEstatisticas(ugsComCalculos);
      
      if (ugsComCalculos.length === 0) {
        showNotification('Nenhuma UG cadastrada ainda.', 'info');
      } else {
        showNotification(`${ugsComCalculos.length} UGs carregadas!`, 'success');
      }
      
    } catch (error) {
      console.error('❌ Erro ao carregar UGs:', error);
      showNotification('Erro ao carregar UGs: ' + error.message, 'error');
      setDados([]);
      setDadosFiltrados([]);
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  const filtrarDados = useCallback(() => {
    let dadosFiltrados = dados;

    if (filtros.busca) {
      const busca = filtros.busca.toLowerCase();
      dadosFiltrados = dadosFiltrados.filter(item =>
        item.nomeUsina?.toLowerCase().includes(busca)
      );
    }

    if (filtros.status) {
      if (filtros.status === 'calibradas') {
        dadosFiltrados = dadosFiltrados.filter(item => item.calibrado);
      } else if (filtros.status === 'nao-calibradas') {
        dadosFiltrados = dadosFiltrados.filter(item => !item.calibrado);
      }
    }

    setDadosFiltrados(dadosFiltrados);
    atualizarEstatisticas(dadosFiltrados);
  }, [dados, filtros]);

  const atualizarEstatisticas = (dadosFiltrados) => {
    const total = dadosFiltrados.length;
    const calibradas = dadosFiltrados.filter(item => item.calibrado).length;
    const naoCalibradas = total - calibradas;
    const capacidadeTotal = dadosFiltrados.reduce((soma, item) => soma + (parseFloat(item.capacidade) || 0), 0);

    setEstatisticas({
      total,
      calibradas,
      naoCalibradas,
      capacidadeTotal: Math.round(capacidadeTotal)
    });
  };

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  useEffect(() => {
    filtrarDados();
  }, [filtrarDados]);

  const limparFiltros = () => {
    setFiltros({
      busca: '',
      status: ''
    });
  };

  const criarNovaUG = async (dadosUG) => {
    if (user?.role !== 'admin') {
      showNotification('Apenas administradores podem criar UGs', 'warning');
      return;
    }

    try {
      if (!dadosUG.nomeUsina?.trim()) {
        showNotification('Nome da usina é obrigatório', 'error');
        return;
      }

      const capacidade = 720 * dadosUG.potenciaCC * (dadosUG.fatorCapacidade / 100);
      
      const novaUG = {
        ...dadosUG,
        capacidade,
        media: 0,
        calibragem: 0,
        ucsAtribuidas: 0,
        calibrado: false,
        dataCadastro: new Date().toISOString(),
        id: Date.now().toString()
      };

      await storageService.adicionarUG(novaUG);
      await carregarDados();
      
      setModalNovaUG({ show: false });
      showNotification(`UG "${dadosUG.nomeUsina}" criada com sucesso!`, 'success');
      
    } catch (error) {
      console.error('❌ Erro ao criar UG:', error);
      showNotification('Erro ao criar UG: ' + error.message, 'error');
    }
  };

  const editarUG = (index) => {
    const item = dadosFiltrados[index];
    if (!item) return;
    setModalEdicao({ show: true, item, index });
  };

  const salvarEdicaoUG = async (dadosAtualizados) => {
    try {
      const { item } = modalEdicao;
      
      const indexReal = dados.findIndex(ug => ug.id === item.id);
      
      if (indexReal === -1) {
        showNotification('UG não encontrada para edição', 'error');
        return;
      }

      if (dadosAtualizados.potenciaCC || dadosAtualizados.fatorCapacidade) {
        const potenciaCC = dadosAtualizados.potenciaCC || item.potenciaCC;
        const fatorCapacidade = dadosAtualizados.fatorCapacidade || item.fatorCapacidade;
        dadosAtualizados.capacidade = 720 * potenciaCC * (fatorCapacidade / 100);
      }

      await storageService.atualizarUG(indexReal, dadosAtualizados);
      await carregarDados();
      
      setModalEdicao({ show: false, item: null, index: -1 });
      showNotification('UG atualizada com sucesso!', 'success');
      
    } catch (error) {
      console.error('❌ Erro ao salvar edição:', error);
      showNotification('Erro ao salvar: ' + error.message, 'error');
    }
  };

  const removerUG = async (index) => {
    const item = dadosFiltrados[index];
    
    if ((item.ucsAtribuidas || 0) > 0) {
      showNotification(
        `Não é possível excluir a UG "${item.nomeUsina}" pois ela possui ${item.ucsAtribuidas} UC(s) atribuída(s).`,
        'warning'
      );
      return;
    }

    const confirmacao = window.confirm(
      `Tem certeza que deseja excluir a UG "${item.nomeUsina}"?\n\nEsta ação não pode ser desfeita.`
    );
    
    if (!confirmacao) return;

    try {
      const indexReal = dados.findIndex(ug => ug.id === item.id);
      
      if (indexReal === -1) {
        showNotification('UG não encontrada para exclusão', 'error');
        return;
      }

      await storageService.removerUG(indexReal);
      await carregarDados();
      
      showNotification(`UG "${item.nomeUsina}" removida com sucesso!`, 'success');
      
    } catch (error) {
      console.error('❌ Erro ao remover UG:', error);
      showNotification('Erro ao remover UG: ' + error.message, 'error');
    }
  };

  const exportarDados = async () => {
    try {
      await storageService.exportarParaCSV('ugs');
      showNotification('Dados de UGs exportados com sucesso!', 'success');
    } catch (error) {
      console.error('❌ Erro ao exportar:', error);
      showNotification('Erro ao exportar: ' + error.message, 'error');
    }
  };

  // Função para calcular valor calibrado baseado na média total da UG
  const calcularValorCalibrado = (mediaTotal, calibragem) => {
    if (!mediaTotal || mediaTotal === 0) return 0;
    if (!calibragem || calibragem === 0) return mediaTotal;
    
    const multiplicador = 1 + (calibragem / 100);
    return Math.round(mediaTotal * multiplicador);
  };

  // Função para aplicar calibragem (só para admin)
  const aplicarCalibragemGlobal = async () => {
    if (user?.role !== 'admin') return;
    
    if (calibragemGlobal === 0) {
      showNotification('Digite um valor de calibragem diferente de zero', 'warning');
      return;
    }

    try {
      // Salvar a calibragem
      storageService.setCalibragemGlobal(calibragemGlobal);
      
      // Aplicar calibragem global
      await storageService.aplicarCalibragemGlobal(calibragemGlobal);
      
      // Atualizar o valor aplicado para refletir na tabela
      setCalibragemAplicada(calibragemGlobal);
      
      await carregarDados();
      
      showNotification(`Calibragem de ${calibragemGlobal}% aplicada em todas as UGs!`, 'success');
      
    } catch (error) {
      console.error('❌ Erro na calibragem global:', error);
      showNotification('Erro na calibragem: ' + error.message, 'error');
    }
  };

  // Verificar se é admin
  const isAdmin = user?.role === 'admin';

  return (
    <div className="page-container">
      <div className="container">
        <Header 
          title="UNIDADES GERADORAS" 
          subtitle="Cadastro e Gestão de UGs" 
          icon="🏭" 
        />
        
        <Navigation />

        {/* Estatísticas */}
        <section className="quick-stats">
          <div className="stat-card">
            <span className="stat-label">Total UGs</span>
            <span className="stat-value">{estatisticas.total}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Calibradas</span>
            <span className="stat-value">{estatisticas.calibradas}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Não Calibradas</span>
            <span className="stat-value">{estatisticas.naoCalibradas}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Capacidade Total</span>
            <span className="stat-value">{estatisticas.capacidadeTotal.toLocaleString('pt-BR')} MWh</span>
          </div>
        </section>

        {/* Filtros e Controles */}
        <section className="filters-section">
          <div className="filters-container">
            <div className="filters-grid">
              <div className="filter-group">
                <label>Buscar UG</label>
                <input
                  type="text"
                  placeholder="🔍 Nome da usina..."
                  value={filtros.busca}
                  onChange={(e) => setFiltros({...filtros, busca: e.target.value})}
                />
              </div>
              
              <div className="filter-group">
                <label>Status</label>
                <select
                  value={filtros.status}
                  onChange={(e) => setFiltros({...filtros, status: e.target.value})}
                >
                  <option value="">Todos</option>
                  <option value="calibradas">Calibradas</option>
                  <option value="nao-calibradas">Não Calibradas</option>
                </select>
              </div>
            </div>

            <div className="actions-container">
              <button onClick={limparFiltros} className="btn btn-secondary">
                Limpar Filtros
              </button>
              {isAdmin && (
                <button 
                  onClick={() => setModalNovaUG({ show: true })} 
                  className="btn btn-success"
                >
                  ➕ Nova UG
                </button>
              )}
              <button onClick={exportarDados} className="btn btn-primary">
                📊 Exportar CSV
              </button>
            </div>
          </div>
        </section>

        {/* Tabela */}
        <section className="table-section">
          <div className="table-container">
            <div className="table-header">
              <h2>Unidades Geradoras</h2>
              <div className="table-header-right">
                <span className="table-count">{dadosFiltrados.length} registros</span>
                {isAdmin && (
                  <div className="calibragem-controls-compact">
                    <input
                      id="calibragemGlobalUGs"
                      type="number"
                      value={calibragemGlobal}
                      onChange={(e) => setCalibragemGlobal(parseFloat(e.target.value) || 0)}
                      min="0"
                      max="200"
                      step="0.1"
                      placeholder="0"
                      className="calibragem-input-compact"
                      title="Percentual de calibragem"
                    />
                    <span className="calibragem-percent-compact">%</span>
                    <button 
                      onClick={aplicarCalibragemGlobal}
                      className="calibragem-apply-compact"
                      disabled={calibragemGlobal === 0}
                      title="Aplicar calibragem"
                    >
                      Aplicar
                    </button>
                  </div>
                )}
              </div>
            </div>

            {loading ? (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Carregando UGs...</p>
              </div>
            ) : dadosFiltrados.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🏭</div>
                <h3>Nenhuma UG encontrada</h3>
                <p>Não há unidades geradoras que correspondam aos filtros aplicados.</p>
                {isAdmin && (
                  <button 
                    onClick={() => setModalNovaUG({ show: true })} 
                    className="btn btn-primary"
                  >
                    ➕ Cadastrar Primeira UG
                  </button>
                )}
              </div>
            ) : (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Nome da Usina</th>
                      <th>Potência CA (MW)</th>
                      <th>Potência CC (MW)</th>
                      <th>Fator Capacidade</th>
                      <th>Capacidade (MWh)</th>
                      <th>UCs Atribuídas</th>
                      <th>Média (kWh)</th>
                      <th>Calibragem (kWh)</th>
                      {isAdmin && <th>Ações</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {dadosFiltrados.map((item, index) => {
                      const valorCalibrado = calcularValorCalibrado(item.mediaTotal || 0, calibragemAplicada);
                      
                      return (
                        <tr key={item.id}>
                          <td>
                            <strong>{item.nomeUsina}</strong>
                          </td>
                          <td className="text-right">
                            {parseFloat(item.potenciaCA || 0).toFixed(2)} MW
                          </td>
                          <td className="text-right">
                            {parseFloat(item.potenciaCC || 0).toFixed(2)} MW
                          </td>
                          <td className="text-right">
                            {parseFloat(item.fatorCapacidade || 0).toFixed(3)}
                          </td>
                          <td className="text-right">
                            {parseFloat(item.capacidade || 0).toFixed(2)} MWh
                          </td>
                          <td className="text-center">
                            {item.ucsAtribuidas > 0 ? (
                              <span className="ucs-atribuidas">
                                {item.ucsAtribuidas}
                              </span>
                            ) : (
                              <span style={{color: '#999'}}>0</span>
                            )}
                          </td>
                          <td className="text-right">
                            {item.mediaTotal > 0 ? (
                              <span className="media-calculada">
                                {Math.round(item.mediaTotal).toLocaleString('pt-BR')} kWh
                              </span>
                            ) : (
                              <span style={{color: '#999'}}>0 kWh</span>
                            )}
                          </td>
                          <td className="text-right">
                            {calibragemAplicada > 0 && item.mediaTotal > 0 ? (
                              <div className="calibragem-info">
                                <span className="calibragem-calculada">
                                  {valorCalibrado.toLocaleString('pt-BR')} kWh
                                </span>
                                <small style={{color: '#666', fontSize: '0.75rem'}}>
                                  (+{calibragemAplicada}%)
                                </small>
                              </div>
                            ) : (
                              <span className="sem-calibragem">Sem calibragem</span>
                            )}
                          </td>
                          {isAdmin && (
                            <td>
                              <div className="table-actions">
                                <button
                                  onClick={() => editarUG(index)}
                                  className="btn btn-small btn-secondary"
                                  title="Editar UG"
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => removerUG(index)}
                                  className="btn btn-small btn-danger"
                                  title="Excluir UG"
                                  disabled={item.ucsAtribuidas > 0}
                                >
                                  🗑️
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Modal Nova UG */}
        {modalNovaUG.show && (
          <ModalNovaUG 
            onClose={() => setModalNovaUG({ show: false })}
            onSave={criarNovaUG}
          />
        )}

        {/* Modal Edição */}
        {modalEdicao.show && (
          <ModalEdicaoUG 
            item={modalEdicao.item}
            onClose={() => setModalEdicao({ show: false, item: null, index: -1 })}
            onSave={salvarEdicaoUG}
          />
        )}
      </div>
    </div>
  );
};

// Modal Nova UG
const ModalNovaUG = ({ onClose, onSave }) => {
  const [dados, setDados] = useState({
    nomeUsina: '',
    potenciaCA: 0,
    potenciaCC: 0,
    fatorCapacidade: 0.25
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(dados);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Nova Unidade Geradora</h3>
          <button onClick={onClose} className="btn btn-close">✕</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-grid">
            <div className="form-group">
              <label>Nome da Usina *</label>
              <input
                type="text"
                value={dados.nomeUsina}
                onChange={(e) => setDados({...dados, nomeUsina: e.target.value})}
                required
                placeholder="Ex: UG Solar Norte"
              />
            </div>

            <div className="form-group">
              <label>Potência CA (MW)</label>
              <input
                type="number"
                step="0.01"
                value={dados.potenciaCA}
                onChange={(e) => setDados({...dados, potenciaCA: parseFloat(e.target.value) || 0})}
                placeholder="0.00"
              />
            </div>

            <div className="form-group">
              <label>Potência CC (MW) *</label>
              <input
                type="number"
                step="0.01"
                value={dados.potenciaCC}
                onChange={(e) => setDados({...dados, potenciaCC: parseFloat(e.target.value) || 0})}
                required
                placeholder="0.00"
              />
            </div>

            <div className="form-group">
              <label>Fator de Capacidade *</label>
              <input
                type="number"
                step="0.001"
                min="0"
                max="1"
                value={dados.fatorCapacidade}
                onChange={(e) => setDados({...dados, fatorCapacidade: parseFloat(e.target.value) || 0})}
                required
                placeholder="0.250"
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="submit" className="btn btn-primary">
              Criar UG
            </button>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Modal Edição UG
const ModalEdicaoUG = ({ item, onClose, onSave }) => {
  const [dados, setDados] = useState({
    nomeUsina: item?.nomeUsina || '',
    potenciaCA: item?.potenciaCA || 0,
    potenciaCC: item?.potenciaCC || 0,
    fatorCapacidade: item?.fatorCapacidade || 0.25
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(dados);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Editar UG</h3>
          <button onClick={onClose} className="btn btn-close">✕</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-grid">
            <div className="form-group">
              <label>Nome da Usina *</label>
              <input
                type="text"
                value={dados.nomeUsina}
                onChange={(e) => setDados({...dados, nomeUsina: e.target.value})}
                required
              />
            </div>

            <div className="form-group">
              <label>Potência CA (MW)</label>
              <input
                type="number"
                step="0.01"
                value={dados.potenciaCA}
                onChange={(e) => setDados({...dados, potenciaCA: parseFloat(e.target.value) || 0})}
              />
            </div>

            <div className="form-group">
              <label>Potência CC (MW) *</label>
              <input
                type="number"
                step="0.01"
                value={dados.potenciaCC}
                onChange={(e) => setDados({...dados, potenciaCC: parseFloat(e.target.value) || 0})}
                required
              />
            </div>

            <div className="form-group">
              <label>Fator de Capacidade *</label>
              <input
                type="number"
                step="0.001"
                min="0"
                max="1"
                value={dados.fatorCapacidade}
                onChange={(e) => setDados({...dados, fatorCapacidade: parseFloat(e.target.value) || 0})}
                required
              />
            </div>
          </div>

          <div className="info-section">
            <p><strong>UCs Atribuídas:</strong> {item?.ucsAtribuidas || 0}</p>
            <p><strong>Capacidade Calculada:</strong> {(720 * dados.potenciaCC * (dados.fatorCapacidade / 100)).toFixed(2)} MWh</p>
          </div>

          <div className="modal-footer">
            <button type="submit" className="btn btn-primary">
              Salvar Alterações
            </button>
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UGsPage;