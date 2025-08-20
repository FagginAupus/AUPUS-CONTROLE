// src/pages/ControlePage.jsx - Com modal UG corrigido seguindo padrão PROSPEC
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Header from '../components/common/Header';
import Navigation from '../components/common/Navigation';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import storageService from '../services/storageService';
import apiService from '../services/apiService';
import { useData } from '../context/DataContext';
import './ControlePage.css';

const ControlePage = () => {
  const { user, getMyTeam, getConsultorName } = useAuth();
  const { 
    controle, 
    loadControle 
  } = useData();

  const [ugsDisponiveis, setUgsDisponiveis] = useState([]);
  const [modalUG, setModalUG] = useState({ show: false, item: null, index: -1 });
  const [calibragemGlobal, setCalibragemGlobal] = useState(0);

  const [filtros, setFiltros] = useState({
    consultor: '',
    ug: '',
    busca: ''
  });

  const [estatisticas, setEstatisticas] = useState({
    total: 0,
    comUG: 0,
    semUG: 0,
    calibradas: 0
  });

  const { showNotification } = useNotification();
  const debouncedFiltros = useMemo(() => filtros, [filtros]);

  const isAdmin = user?.role === 'admin';

  console.log('🔍 Debug apiService:', {
    apiServiceDisponivel: !!apiService,
    temMetodoAtualizar: typeof apiService.atualizarConfiguracao,
    temMetodoGet: typeof apiService.getConfiguracao
  });
  
  const carregarUGs = useCallback(async () => {
    if (controle.loading) return;
    
    try {
      if (!isAdmin) return;
      
      const ugs = await storageService.getUGs();
      setUgsDisponiveis(ugs);
    } catch (error) {
      console.error('❌ Erro ao carregar UGs:', error);
      showNotification('Erro ao carregar UGs', 'error');
    }
  }, [controle.loading, isAdmin, showNotification]);

  const dadosFiltrados = useMemo(() => {
    let dados = controle.data || [];

    if (filtros.consultor) {
      dados = dados.filter(item =>
        item.consultor?.toLowerCase().includes(filtros.consultor.toLowerCase())
      );
    }

    if (filtros.ug) {
      if (filtros.ug === 'sem-ug') {
        dados = dados.filter(item => !item.ug);
      } else {
        dados = dados.filter(item => item.ug === filtros.ug);
      }
    }

    if (filtros.busca) {
      const busca = filtros.busca.toLowerCase();
      dados = dados.filter(item =>
        item.nomeCliente?.toLowerCase().includes(busca) ||
        item.numeroProposta?.toLowerCase().includes(busca) ||
        item.numeroUC?.toLowerCase().includes(busca) ||
        item.apelido?.toLowerCase().includes(busca)
      );
    }

    return dados;
  }, [controle.data, filtros]);

  const calcularValorCalibrado = useCallback((media, calibragem) => {
    if (!media || !calibragem || calibragem === 0) return 0;
    
    const mediaNum = parseFloat(media);
    const calibragemNum = parseFloat(calibragem);
    return mediaNum * (1 + calibragemNum / 100);
  }, []);

  const editarUG = useCallback((index) => {
    if (!isAdmin) return;
    
    const item = dadosFiltrados[index];
    if (!item) return;
    setModalUG({ show: true, item, index });
  }, [isAdmin, dadosFiltrados]);

  const salvarUG = useCallback(async (ugSelecionada) => {
    try {
      const { item } = modalUG;
      
      const propostaAtual = controle.data.find(p => p.id === item.id);
      if (!propostaAtual) {
        throw new Error('Proposta não encontrada');
      }

      await storageService.atualizarProposta(item.id, {
        ...propostaAtual,
        ug: ugSelecionada
      });
      
      loadControle(1, controle.filters, true);

      setModalUG({ show: false, item: null, index: -1 });
      showNotification('UG atribuída com sucesso!', 'success');
      
    } catch (error) {
      console.error('❌ Erro ao salvar UG:', error);
      showNotification('Erro ao salvar: ' + error.message, 'error');
    }
  }, [modalUG, controle.data, showNotification, loadControle, controle.filters]);

  const refreshDados = useCallback(() => {
    console.log('🔄 Refresh manual dos dados');
    loadControle(1, controle.filters, true);
  }, [loadControle, controle.filters]);

  const aplicarCalibragem = useCallback(async () => {
    console.log('🔄 aplicarCalibragem chamada!');
    console.log('🔍 Debug - isAdmin:', isAdmin);
    console.log('🔍 Debug - calibragemGlobal:', calibragemGlobal);
    
    if (!isAdmin) {
      console.log('❌ Usuário não é admin');
      return;
    }
    
    // ✅ CORREÇÃO: Permitir valor 0 e verificar se é um número válido
    if (calibragemGlobal < 0 || calibragemGlobal > 100) {
      console.log('❌ Calibragem inválida:', calibragemGlobal);
      showNotification('Calibragem deve estar entre 0 e 100%', 'warning');
      return;
    }

    // ✅ CORREÇÃO: Permitir aplicar mesmo com valor 0
    console.log('🔄 Mostrando confirmação...');
    const mensagem = calibragemGlobal === 0 
      ? `Resetar calibragem global para 0% (remover calibragem)?`
      : `Aplicar calibragem de ${calibragemGlobal}% como padrão global do sistema?`;
      
    if (!window.confirm(mensagem)) {
      console.log('❌ Usuário cancelou');
      return;
    }

    try {
      console.log('🔄 Iniciando chamada para API...');
      
      // Salvar a calibragem global nas configurações do sistema
      const response = await apiService.atualizarConfiguracao('calibragem_global', calibragemGlobal);
      
      console.log('✅ Resposta da API:', response);
      
      const mensagemSucesso = calibragemGlobal === 0 
        ? 'Calibragem global resetada para 0%!'
        : `Calibragem global de ${calibragemGlobal}% salva com sucesso!`;
        
      showNotification(mensagemSucesso, 'success');
      
    } catch (error) {
      console.error('❌ Erro ao aplicar calibragem:', error);
      showNotification('Erro ao aplicar calibragem: ' + error.message, 'error');
    }
  }, [isAdmin, calibragemGlobal, showNotification]);

  const exportarDados = useCallback(async () => {
    try {
      await storageService.exportarParaCSV('controle');
      showNotification('Dados exportados com sucesso!', 'success');
    } catch (error) {
      console.error('❌ Erro ao exportar:', error);
      showNotification('Erro ao exportar: ' + error.message, 'error');
    }
  }, [showNotification]);

  // Obter listas únicas para filtros
  const consultoresUnicos = useMemo(() => 
    [...new Set((controle.data || []).map(item => item.consultor).filter(Boolean))], 
    [controle.data]
  );
  const ugsUnicas = useMemo(() => 
    [...new Set((controle.data || []).map(item => item.ug).filter(Boolean))], 
    [controle.data]
  );

  return (
    <div className="page-container">
      <div className="container">
        <Header 
          title="CONTROLE" 
          subtitle="Propostas Fechadas e UGs" 
          icon="⚙️" 
        />
        
        <Navigation />

        {/* Estatísticas Rápidas */}
        <section className="quick-stats">
          <div className="stat-card">
            <span className="stat-label">Total</span>
            <span className="stat-value">{estatisticas.total}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Com UG</span>
            <span className="stat-value">{estatisticas.comUG}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Sem UG</span>
            <span className="stat-value">{estatisticas.semUG}</span>
          </div>
          {isAdmin && (
            <div className="stat-card">
              <span className="stat-label">Calibradas</span>
              <span className="stat-value">{estatisticas.calibradas}</span>
            </div>
          )}
        </section>

        {/* Filtros */}
        <section className="filters-section">
          <div className="filters-container">
            <div className="filters-grid">
              <div className="filter-group">
                <label>Consultor:</label>
                <select
                  value={filtros.consultor}
                  onChange={(e) => setFiltros(prev => ({ ...prev, consultor: e.target.value }))}
                >
                  <option value="">Todos</option>
                  {consultoresUnicos.map(consultor => (
                    <option key={consultor} value={consultor}>{consultor}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>UG:</label>
                <select
                  value={filtros.ug}
                  onChange={(e) => setFiltros(prev => ({ ...prev, ug: e.target.value }))}
                >
                  <option value="">Todas</option>
                  <option value="sem-ug">Sem UG</option>
                  {ugsUnicas.map(ug => (
                    <option key={ug} value={ug}>{ug}</option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Buscar:</label>
                <input
                  type="text"
                  placeholder="Cliente, proposta ou UC..."
                  value={filtros.busca}
                  onChange={(e) => setFiltros(prev => ({ ...prev, busca: e.target.value }))}
                />
              </div>
            </div>

            {isAdmin && (
              <div className="calibragem-controls">
                <button 
                  onClick={refreshDados}
                  className="btn btn-secondary"
                  disabled={controle.loading}
                  title="Atualizar dados"
                >
                  {controle.loading ? '🔄' : '⟳'} Atualizar
                </button>
                <div className="calibragem-group">
                  <label>Calibragem Global (%):</label>
                  <input
                    type="number"
                    step="0.01"
                    value={calibragemGlobal}
                    onChange={(e) => setCalibragemGlobal(parseFloat(e.target.value) || 0)}
                    placeholder="Ex: 10"
                  />
                  <button 
                    onClick={aplicarCalibragem} 
                    className="btn btn-primary"
                    disabled={calibragemGlobal < 0 || calibragemGlobal > 100} // ✅ CORREÇÃO: Não desabilitar para valor 0
                  >
                    Aplicar Calibragem
                  </button>
                </div>
                <button onClick={exportarDados} className="btn btn-secondary">
                  📊 Exportar Dados
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Tabela */}
        <section className="table-section">
          <div className="table-container">
            {controle.loading && controle.data.length === 0 ? (
              <div className="loading-container">
                <div className="loading-spinner"></div>
                <p>Carregando dados...</p>
              </div>
            ) : dadosFiltrados.length === 0 ? (
              <div className="empty-state">
                <span className="empty-icon">📋</span>
                <h3>Nenhuma proposta no controle</h3>
                <p>As propostas fechadas aparecerão aqui automaticamente.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th>Proposta</th>
                      <th>Cliente</th>
                      <th>UC</th>
                      <th>Consultor</th>
                      <th>Distribuidora</th>
                      <th>UG</th>
                      <th>Média (kWh)</th>
                      {/* Coluna Calibrada - só aparece para admin */}
                      {isAdmin && <th>Calibrada (kWh)</th>}
                      {isAdmin && <th>Ações</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {dadosFiltrados.map((item, index) => (
                      <tr key={item.id || index}>
                        <td>
                          <span className="proposta-numero">{item.numeroProposta}</span>
                        </td>
                        <td>
                          <strong>{item.nomeCliente}</strong>
                          <br />
                          <small style={{color: '#666'}}>{item.celular}</small>
                        </td>
                        <td>
                          <span className="uc-numero">{item.numeroUC}</span>
                          {item.apelido && (
                            <>
                              <br />
                              <small style={{color: '#666'}}>{item.apelido}</small>
                            </>
                          )}
                        </td>
                        <td>
                          <span className="consultor-nome">{item.consultor}</span>
                        </td>
                        <td>
                          <span className="distribuidora-nome">{item.distribuidora}</span>
                        </td>
                        <td>
                          {item.ug ? (
                            <span className="ug-atribuida">{item.ug}</span>
                          ) : (
                            <span className="sem-ug">Sem UG</span>
                          )}
                        </td>
                        <td>
                          <span className="media-valor">
                            {item.media ? parseFloat(item.media).toFixed(0) : '0'}
                          </span>
                        </td>
                        {/* Valor calibrado - só para admin */}
                        {isAdmin && (
                          <td>
                            {calibragemGlobal !== 0 && item.media ? (
                              <div className="calibragem-info">
                                <div className="calibragem-calculada">
                                  {calcularValorCalibrado(item.media, calibragemGlobal).toFixed(0)} kWh
                                  <br />
                                  <small style={{color: '#4CAF50', fontWeight: '600'}}>
                                    ({calibragemGlobal > 0 ? '+' : ''}{calibragemGlobal}% aplicado)
                                  </small>
                                </div>
                              </div>
                            ) : (
                              <div className="sem-calibragem">
                                {calibragemGlobal === 0 ? 'Sem calibragem' : '-'}
                              </div>
                            )}
                          </td>
                        )}
                        {isAdmin && (
                          <td>
                            <button
                              onClick={() => editarUG(index)}
                              className="btn btn-small btn-secondary"
                              title="Editar UG"
                            >
                              ✏️ UG
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>

        {/* Modal UG - Apenas para admin */}
        {modalUG.show && isAdmin && (
          <ModalUG 
            item={modalUG.item}
            ugsDisponiveis={ugsDisponiveis}
            onSave={salvarUG}
            onClose={() => setModalUG({ show: false, item: null, index: -1 })}
          />
        )}
      </div>
    </div>
  );
};

// Modal para seleção de UG
const ModalUG = ({ item, ugsDisponiveis, onSave, onClose }) => {
  const [ugSelecionada, setUgSelecionada] = useState(item.ug || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(ugSelecionada);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>🏭 Atribuir UG</h3>
          <button onClick={onClose} className="btn btn-close">✕</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="proposta-info">
            <p><strong>Cliente:</strong> {item.nomeCliente}</p>
            <p><strong>UC:</strong> {item.numeroUC}</p>
            <p><strong>Proposta:</strong> {item.numeroProposta}</p>
          </div>
          
          <div className="form-group">
            <label>Selecionar UG:</label>
            <select
              value={ugSelecionada}
              onChange={(e) => setUgSelecionada(e.target.value)}
              required
            >
              <option value="">Escolha uma UG...</option>
              {ugsDisponiveis.map((ug, index) => (
                <option key={index} value={ug.nomeUsina}>
                  {ug.nomeUsina} - {ug.potenciaCA}kW
                </option>
              ))}
            </select>
          </div>
          
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              💾 Salvar UG
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ControlePage;