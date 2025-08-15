// src/pages/ControlePage.jsx - Com modal UG corrigido seguindo padrão PROSPEC
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Header from '../components/common/Header';
import Navigation from '../components/common/Navigation';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import storageService from '../services/storageService';
import apiService from '../services/apiService';
import './ControlePage.css';

const ControlePage = () => {
  const { user, getMyTeam, getConsultorName } = useAuth();
  const [dados, setDados] = useState([]);
  const [dadosFiltrados, setDadosFiltrados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ugsDisponiveis, setUgsDisponiveis] = useState([]);
  const [modalUG, setModalUG] = useState({ show: false, item: null, index: -1 });
  const [calibragemGlobal, setCalibragemGlobal] = useState(0);
  const [calibragemAplicada, setCalibragemAplicada] = useState(0);
  const [ugSelecionada, setUgSelecionada] = useState(''); // Estado para controlar o select
  
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
  const debouncedFiltros = useMemo(() => filtros, [
    filtros.consultor,
    filtros.ug,
    filtros.busca
  ]);

  const isAdmin = user?.role === 'admin';
  const mostrarCalibragem = isAdmin;

  const carregarDados = useCallback(async () => {
    try {
      setLoading(true);
      
      console.log('📥 Carregando dados do controle...');
      
      console.log('🔄 Buscando dados do controle...');
      const dadosControle = await storageService.getControle();
      console.log('✅ Dados controle carregados:', dadosControle?.length);
      
      console.log('🔄 Buscando propostas originais...');

      const response = await apiService.get('/propostas');
      let propostas = [];
      if (response?.data?.data && Array.isArray(response.data.data)) {
          propostas = response.data.data;
      } else if (response?.data && Array.isArray(response.data)) {
          propostas = response.data;
      }

// Mapear propostas do backend
const propostasMapeadas = propostas.map(proposta => 
    storageService.mapearPropostaDoBackend(proposta)
).filter(Boolean);

console.log('✅ Propostas originais carregadas:', propostasMapeadas?.length);

      console.log('🔍 DEBUG - Dados recebidos:', {
        totalPropostas: propostas.length,
        totalControles: dadosControle.length,
        primeiraPropostaSample: propostas[0]
      });

      console.log('🔄 Iniciando filtro das propostas...');
      
      // ✅ TODAS as propostas que têm UCs (não importa o status geral)
      const propostasComUCs = propostas.filter(proposta => 
          proposta.unidades_consumidoras?.length > 0  // ✅ NOME CORRETO (com underscore)
      );

      console.log(`📋 ${propostasComUCs.length} propostas com UCs encontradas`);
      
      console.log('🔄 Processando UCs individuais...');
      
      // Expandir propostas para UCs individuais
      let dadosExpandidos = [];
      propostasComUCs.forEach(proposta => {
        if (proposta.unidades_consumidoras?.length > 0) {  // ✅ CORRIGIR AQUI TAMBÉM
            proposta.unidades_consumidoras.forEach(uc => {   // ✅ E AQUI
                  // ✅ SÓ INCLUIR UCs QUE ESTÃO FECHADAS (individual)
                  const statusUC = uc.status || 'Aguardando';
                  
                  console.log(`🔍 Processando UC:`, {
                    proposta: proposta.numeroProposta,
                    numeroUC: uc.numero_unidade || uc.numeroUC,
                    status: statusUC,
                    seraIncluida: statusUC === 'Fechada'
                  });
                  
                  if (statusUC !== 'Fechada') {
                      console.log(`⏭️ Pulando UC ${uc.numero_unidade || uc.numeroUC} - Status: ${statusUC}`);
                      return;
                  }
                  
                  console.log(`✅ UC incluída no controle!`);
                  
                  // Encontrar controle correspondente
                  const controleCorrespondente = dadosControle.find(ctrl => 
                      ctrl.proposta_id === proposta.id && ctrl.uc_id === uc.id
                  );

                  dadosExpandidos.push({
                      id: `${proposta.id}-${uc.numero_unidade || uc.numeroUC}`,
                      numeroProposta: proposta.numeroProposta,
                      nomeCliente: proposta.nomeCliente,
                      consultor: proposta.consultor,
                      data: proposta.data,
                      
                      // Dados da UC específica
                      numeroUC: uc.numero_unidade || uc.numeroUC,
                      apelido: uc.apelido,
                      media: uc.consumo_medio || uc.media,
                      distribuidora: uc.distribuidora,
                      ligacao: uc.ligacao,
                      status: statusUC,
                      
                      // Dados de controle (se existir)
                      ug: controleCorrespondente?.unidade_geradora?.nome_usina || null,
                      calibragem: controleCorrespondente?.calibragem || 0,
                      valor_calibrado: controleCorrespondente?.valor_calibrado || null,
                      controle_id: controleCorrespondente?.id || null
                  });
              });
          }
      });

      console.log(`🔍 Total de UCs expandidas: ${dadosExpandidos.length}`);

      let dadosFiltradosPorEquipe = [];

      if (user?.role === 'admin') {
        dadosFiltradosPorEquipe = dadosExpandidos.map(item => ({
          ...item,
          consultor: getConsultorName(item.consultor)
        }));
      } else {
        const teamNames = getMyTeam().map(member => member.name);
        dadosFiltradosPorEquipe = dadosExpandidos.filter(item => 
          teamNames.includes(item.consultor)
        );
      }
      
      const dadosComIds = dadosFiltradosPorEquipe.map((item, index) => ({
        ...item,
        id: item.id || `${item.numeroProposta}-${item.numeroUC}-${index}-${Date.now()}`
      }));
      
      console.log(`🎯 Total final de dados para exibir: ${dadosComIds.length}`);
      
      setDados(dadosComIds);
      setDadosFiltrados(dadosComIds);
      
      atualizarEstatisticas(dadosComIds);
      
      if (dadosComIds.length === 0) {
        showNotification('Nenhuma proposta no controle para sua equipe.', 'info');
      } else {
        showNotification(`${dadosComIds.length} propostas carregadas no controle!`, 'success');
      }
      
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
      showNotification('Erro ao carregar dados: ' + error.message, 'error');
      setDados([]);
      setDadosFiltrados([]);
    } finally {
      setLoading(false);
    }
  }, [loading, user?.id]);
  
  const carregarUGs = useCallback(async () => {
    if (loading) return; // ✅ Evitar chamadas simultâneas
    
    try {
      if (!isAdmin) return; // Só admin pode gerenciar UGs
      
      const ugs = await storageService.getUGs();
      setUgsDisponiveis(ugs);
    } catch (error) {
      console.error('❌ Erro ao carregar UGs:', error);
      showNotification('Erro ao carregar UGs', 'error');
    }
  }, [loading, isAdmin, showNotification]); // ✅ Adicionar 'loading' nas dependências

  const filtrarDados = useCallback(() => {
    let dadosFiltrados = dados;

    if (filtros.consultor) {
      dadosFiltrados = dadosFiltrados.filter(item =>
        item.consultor?.toLowerCase().includes(filtros.consultor.toLowerCase())
      );
    }

    if (filtros.ug) {
      if (filtros.ug === 'sem-ug') {
        dadosFiltrados = dadosFiltrados.filter(item => !item.ug);
      } else {
        dadosFiltrados = dadosFiltrados.filter(item => item.ug === filtros.ug);
      }
    }

    if (filtros.busca) {
      const busca = filtros.busca.toLowerCase();
      dadosFiltrados = dadosFiltrados.filter(item =>
        item.nomeCliente?.toLowerCase().includes(busca) ||
        item.numeroProposta?.toLowerCase().includes(busca) ||
        item.numeroUC?.toLowerCase().includes(busca) ||
        item.apelido?.toLowerCase().includes(busca)
      );
    }

    setDadosFiltrados(dadosFiltrados);
  }, [dados, filtros]);

  const atualizarEstatisticas = (dados) => {
    const stats = {
      total: dados.length,
      comUG: dados.filter(item => item.ug).length,
      semUG: dados.filter(item => !item.ug).length,
      calibradas: dados.filter(item => item.calibragem && parseFloat(item.calibragem) > 0).length
    };
    setEstatisticas(stats);
  };

  const calcularValorCalibrado = (media, calibragem) => {
    if (!media || !calibragem) return 0;
    const mediaNum = parseFloat(media);
    const calibragemNum = parseFloat(calibragem);
    return mediaNum + (mediaNum * calibragemNum / 100);
  };

  useEffect(() => {
    let isMounted = true;
    
    const loadData = async () => {
      if (!isMounted || !user?.id) return; // ✅ CORRIGIDO: só verificar user?.id
      
      console.log('🚀 ControlePage - Iniciando carregamento de dados...');
      
      try {
        await carregarDados();
        await carregarUGs();
      } catch (error) {
        console.error('❌ ControlePage - Erro ao carregar:', error);
      }
    };
    
    loadData();
    
    return () => {
      isMounted = false;
    };
  }, [user?.id]);

  useEffect(() => {
    filtrarDados();
  }, [debouncedFiltros, dados]);

  const editarUG = (index) => {
    if (!isAdmin) return;
    
    const item = dadosFiltrados[index];
    if (!item) return;
    setModalUG({ show: true, item, index });
  };

  const salvarUG = async (ugSelecionada) => {
    try {
      const { item } = modalUG;
      
      const indexReal = dados.findIndex(p => p.id === item.id);
      
      if (indexReal === -1) {
        showNotification('Item não encontrado', 'error');
        return;
      }

      const dadosAtualizados = {
        ...item,
        ug: ugSelecionada
      };

      const propostaAtual = dados.find(p => p.id === item.id);
      if (!propostaAtual) {
        throw new Error('Proposta não encontrada');
      }

      await storageService.atualizarProposta(item.id, {
        ...propostaAtual, // ✅ USAR propostaAtual
        ug: ugSelecionada // ✅ SIMPLES: só atualizar a UG
      });
      await carregarDados();
      
      setModalUG({ show: false, item: null, index: -1 });
      showNotification('UG atribuída com sucesso!', 'success');
      
    } catch (error) {
      console.error('❌ Erro ao salvar UG:', error);
      showNotification('Erro ao salvar: ' + error.message, 'error');
    }
  };

  const aplicarCalibragem = async () => {
    if (!isAdmin) return;
    
    if (calibragemGlobal <= 0) {
      showNotification('Informe um valor de calibragem válido', 'warning');
      return;
    }

    if (!window.confirm(`Aplicar calibragem de ${calibragemGlobal}% a todas as propostas?`)) {
      return;
    }

    try {
      // Aplicar calibragem a todos os dados
      const dadosComCalibragem = dados.map(item => ({
        ...item,
        calibragem: calibragemGlobal
      }));

      // Salvar cada item individualmente
      for (let i = 0; i < dadosComCalibragem.length; i++) {
        await storageService.atualizarControle(i, dadosComCalibragem[i]);
      }

      setCalibragemAplicada(calibragemGlobal);
      await carregarDados();
      
      showNotification(`Calibragem de ${calibragemGlobal}% aplicada com sucesso!`, 'success');
      
    } catch (error) {
      console.error('❌ Erro ao aplicar calibragem:', error);
      showNotification('Erro ao aplicar calibragem: ' + error.message, 'error');
    }
  };

  const exportarDados = async () => {
    try {
      await storageService.exportarParaCSV('controle');
      showNotification('Dados exportados com sucesso!', 'success');
    } catch (error) {
      console.error('❌ Erro ao exportar:', error);
      showNotification('Erro ao exportar: ' + error.message, 'error');
    }
  };

  // Obter listas únicas para filtros
  const consultoresUnicos = [...new Set(dados.map(item => item.consultor).filter(Boolean))];
  const ugsUnicas = [...new Set(dados.map(item => item.ug).filter(Boolean))];

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
                <div className="calibragem-group">
                  <label>Calibragem Global (%):</label>
                  <input
                    type="number"
                    value={calibragemGlobal}
                    onChange={(e) => setCalibragemGlobal(parseFloat(e.target.value) || 0)}
                    placeholder="Ex: 10"
                  />
                  <button onClick={aplicarCalibragem} className="btn btn-primary">
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
            {loading ? (
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
                      {/* ALTERAÇÃO: Coluna de calibragem só aparece para admin */}
                      {mostrarCalibragem && <th>Calibrada (kWh)</th>}
                      {isAdmin && <th>Ações</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {dadosFiltrados.map((item, index) => {
                      const valorCalibrado = calcularValorCalibrado(item.media, calibragemAplicada);
                      
                      return (
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
                          {/* ALTERAÇÃO: Coluna de calibragem só aparece para admin */}
                          {mostrarCalibragem && (
                            <td>
                              {calibragemAplicada > 0 && item.media ? (
                                <div className="calibragem-info">
                                  <span className="calibragem-resultado">
                                    {valorCalibrado.toFixed(0)}
                                  </span>
                                  <small style={{color: '#666', fontSize: '0.8rem'}}>
                                    (+{calibragemAplicada}%)
                                  </small>
                                </div>
                              ) : (
                                <span className="sem-calibragem">Sem calibragem</span>
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
                      );
                    })}
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