// UGsPage.jsx - CORRIGIDO com modais seguindo padrão PROSPEC
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Header from '../components/common/Header';
import Navigation from '../components/common/Navigation';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import storageService from '../services/storageService';
import { useData } from '../context/DataContext';
import './UGsPage.css';
import { 
  Factory, 
  Zap, 
  Users, 
  TrendingUp,
  Edit,
  Trash2
} from 'lucide-react';
const UGsPage = () => {
  const { user } = useAuth();
  const { 
    ugs, 
    loadUgs, 
    afterCreateUg 
  } = useData();
  const [modalNovaUG, setModalNovaUG] = useState({ show: false });
  const [modalEdicao, setModalEdicao] = useState({ show: false, item: null, index: -1 });
  
  const [filtros, setFiltros] = useState({
    busca: ''
  });

  const { showNotification } = useNotification();

  const dadosFiltrados = useMemo(() => {
    let dados = ugs.data || [];

    if (filtros.busca?.trim()) {
      const busca = filtros.busca.toLowerCase().trim();
      dados = dados.filter(item =>
        item.nomeUsina?.toLowerCase().includes(busca)
      );
    }

    return dados;
  }, [ugs.data, filtros.busca]);

  const estatisticas = useMemo(() => {
    const total = dadosFiltrados.length;
    const capacidadeTotal = dadosFiltrados.reduce((soma, item) => 
      soma + (parseFloat(item.capacidade) || 0), 0
    );
    const consumoTotal = dadosFiltrados.reduce((soma, item) => 
      soma + (parseFloat(item.mediaConsumoAtribuido) || 0), 0
    ); // ✅ ADICIONAR ESTA LINHA

    return {
      total,
      capacidadeTotal: Math.round(capacidadeTotal),
      consumoTotal: Math.round(consumoTotal) // ✅ ADICIONAR ESTA LINHA
    };
  }, [dadosFiltrados]);

  const limparFiltros = () => {
    setFiltros({
      busca: ''
    });
  };

  const criarNovaUG = async (dadosUG) => {
    console.log('🚀 criarNovaUG INICIADA');
    console.log('👤 User role:', user?.role);
    
    if (user?.role !== 'admin') {
      console.log('❌ Usuário não é admin, saindo...');
      showNotification('Apenas administradores podem criar UGs', 'warning');
      return;
    }

    console.log('✅ Usuário é admin, continuando...');

    try {
      console.log('🔍 Verificando nome da usina...');
      if (!dadosUG.nome_usina?.trim()) {
        console.log('❌ Nome da usina vazio:', dadosUG.nome_usina);
        showNotification('Nome da usina é obrigatório', 'error');
        return;
      }

      console.log('✅ Nome da usina válido:', dadosUG.nome_usina);
      console.log('📝 Dados da UG ANTES de enviar:', JSON.stringify(dadosUG, null, 2));
      
      console.log('🔗 CHAMANDO storageService.adicionarUG...');
      
      await storageService.adicionarUG(dadosUG);
      console.log('✅ UG criada - Invalidando cache');
      afterCreateUg();
            
      setModalNovaUG({ show: false });
      showNotification('UG criada com sucesso!', 'success');
      
    } catch (error) {
      console.error('❌ Erro ao criar UG:', error);
      console.error('❌ Error message:', error.message);
      console.error('❌ Error stack:', error.stack);
      showNotification('Erro ao criar UG: ' + error.message, 'error');
    }
  };

  const editarUG = (index) => {
    if (user?.role !== 'admin') return;
    
    const item = dadosFiltrados[index];
    if (!item) return;
    setModalEdicao({ show: true, item, index });
  };

  const salvarEdicaoUG = async (dadosAtualizados) => {
    try {
      const { item } = modalEdicao;
      
      const indexReal = ugs.data.findIndex(ug => ug.id === item.id);
      
      if (indexReal === -1) {
        showNotification('UG não encontrada para edição', 'error');
        return;
      }

      const capacidade = 720 * dadosAtualizados.potenciaCC * (dadosAtualizados.fatorCapacidade / 100);
      const ugAtualizada = {
        ...dadosAtualizados,
        capacidade
      };

      await storageService.atualizarUG(indexReal, ugAtualizada);
      loadUgs(ugs.filters, true);
      
      setModalEdicao({ show: false, item: null, index: -1 });
      showNotification('UG atualizada com sucesso!', 'success');
      
    } catch (error) {
      console.error('❌ Erro ao salvar edição:', error);
      showNotification('Erro ao salvar: ' + error.message, 'error');
    }
  };

  const excluirUG = async (index) => {
    if (user?.role !== 'admin') return;
    
    const item = dadosFiltrados[index];
    if (!item) return;

    // Verificar se tem UCs atribuídas ANTES de mostrar o popup
    if (item.ucsAtribuidas > 0) {
      showNotification(
        `Não é possível excluir a UG "${item.nomeUsina}" pois ela possui ${item.ucsAtribuidas} UC(s) atribuída(s). Remova as UCs primeiro.`,
        'warning'
      );
      return;
    }

    if (!window.confirm(`Deseja realmente excluir a UG "${item.nomeUsina}"?`)) return;

    try {
      // ✅ CORRIGIDO: Passar o ID da UG ao invés do index
      await storageService.removerUG(item.id); // ✅ USAR item.id
      loadUgs(ugs.filters, true);

      showNotification('UG excluída com sucesso!', 'success');
      
    } catch (error) {
      console.error('❌ Erro ao excluir:', error);
      showNotification('Erro ao excluir: ' + error.message, 'error');
    }
  };


  const exportarCSV = async () => {
    try {
      await storageService.exportarParaCSV('ugs');
      showNotification('Dados exportados com sucesso!', 'success');
    } catch (error) {
      console.error('❌ Erro ao exportar:', error);
      showNotification('Erro ao exportar: ' + error.message, 'error');
    }
  };

  const refreshDados = useCallback(() => {
    console.log('🔄 Refresh manual dos dados');
    loadUgs(ugs.filters, true);
  }, [loadUgs, ugs.filters]);

  const isAdmin = user?.role === 'admin';


  return (
    <div className="page-container">
      <div className="container">
        <Header 
          title="Cadastro e Gestão de UGs" 
        />
        <Navigation />

        {/* Estatísticas */}
        <section className="quick-stats">
          <div className="stat-card">
            <div className="stat-icon">
              <Factory size={24} style={{ color: '#f0f0f0', opacity: 0.8 }} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Total UGs</span>
              <span className="stat-value">{estatisticas.total}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <TrendingUp size={24} style={{ color: '#f0f0f0', opacity: 0.8 }} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Capacidade Total</span>
              <span className="stat-value">{estatisticas.capacidadeTotal.toLocaleString('pt-BR')} MWh</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <Users size={24} style={{ color: '#f0f0f0', opacity: 0.8 }} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Consumo Atribuído</span>
              <span className="stat-value">{estatisticas.consumoTotal.toLocaleString('pt-BR')} kWh</span>
            </div>
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
            </div>

            <div className="actions-container">
              <button onClick={limparFiltros} className="btn btn-secondary">
                Limpar Filtros
              </button>
              <button 
                onClick={refreshDados}
                className="btn btn-secondary"
                disabled={ugs.loading}
                title="Atualizar dados"
              >
                {ugs.loading ? '🔄' : '⟳'} Atualizar
              </button>
              <button onClick={exportarCSV} className="btn btn-secondary">
                📊 Exportar CSV
              </button>
              {isAdmin && (
                <button 
                  onClick={() => setModalNovaUG({ show: true })} 
                  className="btn btn-primary"
                >
                  ➕ Nova UG
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Tabela */}
        <section className="data-section">
          <div className="table-header">
            <h2>📋 Lista de UGs ({dadosFiltrados.length})</h2>
          </div>
          
          <div className="table-wrapper">
            {ugs.loading && ugs.data.length === 0 ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Carregando UGs...</p>
              </div>
            ) : dadosFiltrados.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🏭</div>
                <h3>Nenhuma UG encontrada</h3>
                <p>
                  {ugs.data.length === 0
                    ? 'Não há UGs cadastradas ainda.'
                    : 'Nenhuma UG corresponde aos filtros aplicados.'
                  }
                </p>
              </div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Nome da Usina</th>
                    <th>Potência CA (kW)</th>
                    <th>Potência CC (kW)</th>
                    <th>Fator de Capacidade</th>
                    <th>Capacidade (KWh)</th>
                    <th>UCs Atribuídas</th>
                    <th>Média Total (kWh)</th>
                    {isAdmin && <th>Ações</th>}
                  </tr>
                </thead>
                <tbody>
                  {dadosFiltrados.map((item, index) => (
                    <tr key={item.id || index}>
                      <td>
                        <div className="usina-info">
                          <span className="nome-usina">{item.nomeUsina}</span>
                        </div>
                      </td>
                      <td>
                        <span className="potencia-valor">{item.potenciaCA?.toLocaleString('pt-BR') || '0'}</span>
                      </td>
                      <td>
                        <span className="potencia-valor">{item.potenciaCC?.toLocaleString('pt-BR') || '0'}</span>
                      </td>
                      <td>
                        <span className="fator-capacidade">{(item.fatorCapacidade || 0).toFixed(1)}%</span> {/* ✅ REMOVER * 100 */}
                      </td>
                      <td>
                        <span className="capacidade-valor">{(item.capacidade || 0).toLocaleString('pt-BR')}</span>
                      </td>
                      <td>
                        <span className={`ucs-count ${item.ucsAtribuidas > 0 ? 'has-ucs' : 'no-ucs'}`}>
                          {item.ucsAtribuidas || 0}
                        </span>
                      </td>
                      <td>
                        <span className="media-total">
                          {(item.mediaConsumoAtribuido || 0).toLocaleString('pt-BR')}
                        </span>
                      </td>
                      {isAdmin && (
                        <td>
                          <div className="action-buttons">
                            <button
                              onClick={() => editarUG(index)}
                              className="action-btn edit"
                              title="Editar UG"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => excluirUG(index)}
                              className="action-btn delete"
                              title="Excluir UG"
                              disabled={item.ucsAtribuidas > 0}
                              style={{
                                opacity: item.ucsAtribuidas > 0 ? 0.5 : 1,
                                cursor: item.ucsAtribuidas > 0 ? 'not-allowed' : 'pointer'
                              }}
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Modais */}
        {modalNovaUG.show && isAdmin && (
          <ModalNovaUG 
            onSave={criarNovaUG}
            onClose={() => setModalNovaUG({ show: false })}
          />
        )}

        {modalEdicao.show && isAdmin && (
          <ModalEdicaoUG 
            item={modalEdicao.item}
            onSave={salvarEdicaoUG}
            onClose={() => setModalEdicao({ show: false, item: null, index: -1 })}
          />
        )}
      </div>
    </div>
  );
};

// Modal Nova UG - COM FUNDO SÓLIDO seguindo padrão PROSPEC
const ModalNovaUG = ({ onSave, onClose }) => {
  const [formData, setFormData] = useState({
    nomeUsina: '',
    numero_unidade: '',
    potenciaCA: 0,        
    potenciaCC: 0,        
    fatorCapacidade: 19,
    localizacao: '',
    observacoes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validar campos obrigatórios
    if (!formData.nomeUsina?.trim()) {
      alert('Nome da usina é obrigatório');
      return;
    }
    
    if (!formData.numero_unidade?.trim()) {
      alert('Número da UC é obrigatório');
      return;
    }
    
    // ✅ TRANSFORMAR para snake_case que o backend espera
    const dados = {
      // ✅ CAMPOS OBRIGATÓRIOS EM SNAKE_CASE:
      nome_usina: formData.nomeUsina.trim(),                        // ✅ CORRIGIDO
      potencia_cc: parseFloat(formData.potenciaCC) || 0,            // ✅ CORRIGIDO
      fator_capacidade: parseFloat(formData.fatorCapacidade) || 19, // ✅ CORRIGIDO
      numero_unidade: String(formData.numero_unidade).trim(),       // ✅ CORRIGIDO - STRING
      apelido: formData.nomeUsina.trim(),
      
      // ✅ CAMPOS OPCIONAIS:
      localizacao: formData.localizacao?.trim() || '',
      observacoes_ug: formData.observacoes?.trim() || '',
      
      // ✅ FLAGS OBRIGATÓRIAS:
      gerador: true,
      nexus_clube: true,
      nexus_cativo: false,
      service: false,
      project: false,
      
      // ✅ CAMPOS EXTRAS:
      distribuidora: 'EQUATORIAL',
      consumo_medio: 0,
      tipo: 'UG',
      classe: 'Comercial',
      subclasse: 'Comercial',
      grupo: 'A',
      ligacao: 'Trifásico'
    };

    console.log('📝 Dados da UG TRANSFORMADOS para snake_case:', dados);
    onSave(dados);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-ug" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header modal-header-ug">
          <h3>🏭 Nova UG</h3>
          <button onClick={onClose} className="btn btn-close">✕</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body modal-body-ug">
          <div className="form-grid">
            <div className="form-group">
              <label>Nome da Usina *</label>
              <input
                type="text"
                value={formData.nomeUsina}
                onChange={(e) => setFormData({...formData, nomeUsina: e.target.value})}
                required
                placeholder="Ex: Usina Solar ABC"
              />
            </div>

            <div className="form-group">
              <label>Número da UC *</label>
              <input
                type="text"
                value={formData.numero_unidade}
                onChange={(e) => setFormData({...formData, numero_unidade: e.target.value})}
                required
                placeholder="Ex: UG001"
              />
            </div>

            <div className="form-group">
              <label>Potência CA (kW) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.potenciaCA}
                onChange={(e) => setFormData({...formData, potenciaCA: parseFloat(e.target.value) || 0})}
                required
                placeholder="Ex: 5000"
              />
            </div>

            <div className="form-group">
              <label>Potência CC (kW) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.potenciaCC}
                onChange={(e) => setFormData({...formData, potenciaCC: parseFloat(e.target.value) || 0})}
                required
                placeholder="Ex: 6000"
              />
            </div>

            <div className="form-group">
              <label>Fator de Capacidade (%)</label>
              <input
                type="number"
                step="1"
                min="0"
                max="100"
                value={formData.fatorCapacidade}
                onChange={(e) => setFormData({...formData, fatorCapacidade: parseFloat(e.target.value) || 19})}
                placeholder="Ex: 19"
              />
            </div>
          </div>

          <div className="info-ug">
            <div className="info-item">
              <strong>Capacidade estimada:</strong> {(720 * formData.potenciaCC * (formData.fatorCapacidade / 100)).toFixed(0)} kWh/mês
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

// Modal Edição UG - COM FUNDO SÓLIDO seguindo padrão PROSPEC
const ModalEdicaoUG = ({ item, onClose, onSave }) => {
  const [dados, setDados] = useState({
    nomeUsina: '',
    potenciaCA: 0,
    potenciaCC: 0,
    fatorCapacidade: 19,
    numero_unidade: ''  // ✅ ADICIONAR ESTA LINHA
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(dados);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-ug" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header modal-header-ug">
          <h3>✏️ Editar UG</h3>
          <button onClick={onClose} className="btn btn-close">✕</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body modal-body-ug">
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
              <label>Potência CA (kW) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={dados.potenciaCA}
                onChange={(e) => setDados({...dados, potenciaCA: parseFloat(e.target.value) || 0})}
                required
              />
            </div>

            <div className="form-group">
              <label>Potência CC (kW) *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={dados.potenciaCC}
                onChange={(e) => setDados({...dados, potenciaCC: parseFloat(e.target.value) || 0})}
                required
              />
            </div>

            <div className="form-group">
              <label>Fator de Capacidade</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={dados.fatorCapacidade}
                onChange={(e) => setDados({...dados, fatorCapacidade: parseFloat(e.target.value) || 19})}
              />
            </div>
          </div>

          <div className="info-ug">
            <div className="info-item">
              <strong>Capacidade estimada:</strong> {(720 * dados.potenciaCC * (dados.fatorCapacidade / 100)).toFixed(0)} kWh/mês
            </div>
            <div className="info-item">
              <strong>UCs atribuídas:</strong> {item?.ucsAtribuidas || 0}
            </div>
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