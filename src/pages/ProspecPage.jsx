// src/pages/ProspecPage.jsx - SEM DADOS SIMULADOS
import React, { useState, useEffect } from 'react';
import Header from '../components/common/Header';
import Navigation from '../components/common/Navigation';
import { useNotification } from '../context/NotificationContext';
import storageService from '../services/storageService';
import PDFGenerator from '../services/pdfGenerator';
import './ProspecPage.css';

const ProspecPage = () => {
  const [dados, setDados] = useState([]);
  const [dadosFiltrados, setDadosFiltrados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalEdicao, setModalEdicao] = useState({ show: false, item: null, index: -1 });
  const [modalNovaProposta, setModalNovaProposta] = useState({ show: false });
  
  const [filtros, setFiltros] = useState({
    consultor: '',
    status: '',
    busca: ''
  });

  const { showNotification } = useNotification();

  // Carregamento inicial
  useEffect(() => {
    carregarDados();
  }, []);

  // Aplicar filtros
  useEffect(() => {
    filtrarDados();
  }, [filtros, dados]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      
      console.log('📥 Carregando dados do localStorage...');
      
      // Carregar dados reais do localStorage
      const dadosProspec = await storageService.getProspec();
      
      // Garantir IDs únicos para cada item
      const dadosComIds = dadosProspec.map((item, index) => ({
        ...item,
        id: item.id || `${item.numeroProposta}-${item.numeroUC}-${index}-${Date.now()}`
      }));
      
      setDados(dadosComIds);
      setDadosFiltrados(dadosComIds);
      
      if (dadosComIds.length === 0) {
        showNotification('Nenhuma proposta encontrada. Crie sua primeira proposta!', 'info');
      } else {
        showNotification(`${dadosComIds.length} propostas carregadas com sucesso!`, 'success');
      }
      
      console.log(`✅ ${dadosComIds.length} propostas carregadas`);
      
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
      showNotification('Erro ao carregar dados: ' + error.message, 'error');
      setDados([]);
      setDadosFiltrados([]);
    } finally {
      setLoading(false);
    }
  };

  const filtrarDados = () => {
    let dadosFiltrados = dados;

    if (filtros.consultor) {
      dadosFiltrados = dadosFiltrados.filter(item =>
        item.consultor === filtros.consultor
      );
    }

    if (filtros.status) {
      dadosFiltrados = dadosFiltrados.filter(item =>
        item.status === filtros.status
      );
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
  };

  const limparFiltros = () => {
    setFiltros({
      consultor: '',
      status: '',
      busca: ''
    });
  };

  // FUNÇÃO PARA EDITAR ITEM
  const editarItem = (index) => {
    const item = dadosFiltrados[index];
    if (!item) return;

    setModalEdicao({ show: true, item, index });
  };

  // FUNÇÃO PARA SALVAR EDIÇÃO
  const salvarEdicao = async (dadosAtualizados) => {
    try {
      const { item } = modalEdicao;
      
      // Encontrar o índice real no array principal
      const indexReal = dados.findIndex(p => p.id === item.id);
      
      if (indexReal === -1) {
        showNotification('Item não encontrado para edição', 'error');
        return;
      }

      // Atualizar no storage
      await storageService.atualizarProspec(indexReal, dadosAtualizados);
      
      // Recarregar dados
      await carregarDados();
      
      // Fechar modal
      setModalEdicao({ show: false, item: null, index: -1 });
      
      showNotification('Proposta atualizada com sucesso!', 'success');
      
    } catch (error) {
      console.error('❌ Erro ao salvar edição:', error);
      showNotification('Erro ao salvar: ' + error.message, 'error');
    }
  };

  // FUNÇÃO PARA REMOVER ITEM
  const removerItem = async (index) => {
    if (!window.confirm('Tem certeza que deseja remover esta proposta?')) {
      return;
    }

    try {
      const item = dadosFiltrados[index];
      const indexReal = dados.findIndex(p => p.id === item.id);
      
      if (indexReal === -1) {
        showNotification('Item não encontrado para remoção', 'error');
        return;
      }

      await storageService.removerProspec(indexReal);
      await carregarDados();
      
      showNotification('Proposta removida com sucesso!', 'success');
      
    } catch (error) {
      console.error('❌ Erro ao remover:', error);
      showNotification('Erro ao remover: ' + error.message, 'error');
    }
  };

  // FUNÇÃO PARA CRIAR NOVA PROPOSTA
  const criarNovaProposta = () => {
    setModalNovaProposta({ show: true });
  };

  // FUNÇÃO PARA SALVAR NOVA PROPOSTA
  const salvarNovaProposta = async (dadosProposta) => {
    try {
      // Gerar número da proposta automaticamente
      const propostas = await storageService.getProspec();
      const ultimoNumero = propostas.length > 0 
        ? Math.max(...propostas.map(p => {
            const num = parseInt(p.numeroProposta.split('/')[1] || '0');
            return isNaN(num) ? 0 : num;
          }))
        : 0;
      
      const novoNumero = ultimoNumero + 1;
      const numeroProposta = `2025/${novoNumero.toString().padStart(4, '0')}`;
      
      const novaProposta = {
        ...dadosProposta,
        numeroProposta,
        data: new Date().toISOString().split('T')[0],
        status: 'Aguardando',
        id: `${numeroProposta}-${dadosProposta.numeroUC}-${Date.now()}`
      };

      await storageService.adicionarProspec(novaProposta);
      await carregarDados();
      
      setModalNovaProposta({ show: false });
      showNotification(`Proposta ${numeroProposta} criada com sucesso!`, 'success');
      
    } catch (error) {
      console.error('❌ Erro ao criar proposta:', error);
      showNotification('Erro ao criar proposta: ' + error.message, 'error');
    }
  };

  // FUNÇÃO PARA GERAR PDF
  const gerarPDF = async (item) => {
    try {
      showNotification('Gerando PDF...', 'info');
      await PDFGenerator.gerarPDFProposta(item);
      showNotification('PDF gerado com sucesso!', 'success');
    } catch (error) {
      console.error('❌ Erro ao gerar PDF:', error);
      showNotification('Erro ao gerar PDF: ' + error.message, 'error');
    }
  };

  // FUNÇÃO PARA EXPORTAR DADOS
  const exportarDados = async () => {
    try {
      await storageService.exportarParaCSV('prospec');
      showNotification('Dados exportados com sucesso!', 'success');
    } catch (error) {
      console.error('❌ Erro ao exportar:', error);
      showNotification('Erro ao exportar: ' + error.message, 'error');
    }
  };

  // Obter lista única de consultores para filtro
  const consultoresUnicos = [...new Set(dados.map(item => item.consultor).filter(Boolean))];

  return (
    <div className="prospec-container">
      <div className="container">
        <Header 
          title="PROSPECÇÃO" 
          subtitle="Gerenciamento de Propostas" 
          icon="📋" 
        />
        
        <Navigation />

        {/* Filtros */}
        <section className="filters">
          <div className="filters-row">
            <input
              type="text"
              placeholder="🔍 Buscar por nome, proposta, UC..."
              value={filtros.busca}
              onChange={(e) => setFiltros({...filtros, busca: e.target.value})}
              className="filter-input"
            />
            
            <select
              value={filtros.consultor}
              onChange={(e) => setFiltros({...filtros, consultor: e.target.value})}
              className="filter-select"
            >
              <option value="">Todos os Consultores</option>
              {consultoresUnicos.map(consultor => (
                <option key={consultor} value={consultor}>{consultor}</option>
              ))}
            </select>
            
            <select
              value={filtros.status}
              onChange={(e) => setFiltros({...filtros, status: e.target.value})}
              className="filter-select"
            >
              <option value="">Todos os Status</option>
              <option value="Aguardando">Aguardando</option>
              <option value="Fechado">Fechado</option>
            </select>
            
            <button onClick={limparFiltros} className="clear-filters-btn">
              🗑️ Limpar
            </button>
          </div>
        </section>

        {/* Ações */}
        <section className="actions">
          <button onClick={criarNovaProposta} className="btn primary">
            ➕ Nova Proposta
          </button>
          <button onClick={exportarDados} className="btn secondary">
            📊 Exportar CSV
          </button>
          <button onClick={carregarDados} className="btn tertiary">
            🔄 Atualizar
          </button>
        </section>

        {/* Tabela de dados */}
        <section className="data-table">
          {loading ? (
            <div className="loading">Carregando propostas...</div>
          ) : dadosFiltrados.length === 0 ? (
            <div className="no-data">
              <p>📭 Nenhuma proposta encontrada</p>
              <p>Crie sua primeira proposta clicando em "Nova Proposta"</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Proposta</th>
                    <th>UC</th>
                    <th>Consultor</th>
                    <th>Status</th>
                    <th>Média (kWh)</th>
                    <th>Data</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {dadosFiltrados.map((item, index) => (
                    <tr key={item.id || index}>
                      <td>
                        <strong>{item.nomeCliente}</strong>
                        <br />
                        <small>{item.apelido}</small>
                      </td>
                      <td>{item.numeroProposta}</td>
                      <td>{item.numeroUC}</td>
                      <td>{item.consultor}</td>
                      <td>
                        <span className={`status ${item.status?.toLowerCase()}`}>
                          {item.status}
                        </span>
                      </td>
                      <td>{item.media?.toLocaleString()} kWh</td>
                      <td>{new Date(item.data).toLocaleDateString('pt-BR')}</td>
                      <td>
                        <div className="action-buttons">
                          <button 
                            onClick={() => editarItem(index)}
                            className="btn-icon edit"
                            title="Editar"
                          >
                            ✏️
                          </button>
                          <button 
                            onClick={() => gerarPDF(item)}
                            className="btn-icon pdf"
                            title="Gerar PDF"
                          >
                            📄
                          </button>
                          <button 
                            onClick={() => removerItem(index)}
                            className="btn-icon delete"
                            title="Remover"
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

        {/* Modal de Nova Proposta */}
        {modalNovaProposta.show && (
          <ModalNovaProposta 
            onSave={salvarNovaProposta}
            onClose={() => setModalNovaProposta({ show: false })}
          />
        )}

        {/* Modal de Edição */}
        {modalEdicao.show && (
          <ModalEdicao 
            item={modalEdicao.item}
            onSave={salvarEdicao}
            onClose={() => setModalEdicao({ show: false, item: null, index: -1 })}
          />
        )}
      </div>
    </div>
  );
};

// Componente Modal de Nova Proposta
const ModalNovaProposta = ({ onSave, onClose }) => {
  const [dados, setDados] = useState({
    nomeCliente: '',
    apelido: '',
    numeroUC: '',
    descontoTarifa: 0.20,
    descontoBandeira: 0.15,
    ligacao: 'Trifásica',
    consultor: '',
    recorrencia: '3%',
    media: 0,
    telefone: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validações básicas
    if (!dados.nomeCliente || !dados.numeroUC || !dados.consultor) {
      alert('Preencha os campos obrigatórios: Cliente, UC e Consultor');
      return;
    }

    onSave(dados);
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>➕ Nova Proposta</h3>
          <button onClick={onClose} className="close-btn">❌</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-row">
            <div className="form-group">
              <label>Nome do Cliente *</label>
              <input
                type="text"
                value={dados.nomeCliente}
                onChange={(e) => setDados({...dados, nomeCliente: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label>Apelido</label>
              <input
                type="text"
                value={dados.apelido}
                onChange={(e) => setDados({...dados, apelido: e.target.value})}
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Número UC *</label>
              <input
                type="text"
                value={dados.numeroUC}
                onChange={(e) => setDados({...dados, numeroUC: e.target.value})}
                required
              />
            </div>
            <div className="form-group">
              <label>Consultor *</label>
              <input
                type="text"
                value={dados.consultor}
                onChange={(e) => setDados({...dados, consultor: e.target.value})}
                required
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Média (kWh)</label>
              <input
                type="number"
                value={dados.media}
                onChange={(e) => setDados({...dados, media: parseInt(e.target.value) || 0})}
              />
            </div>
            <div className="form-group">
              <label>Telefone</label>
              <input
                type="tel"
                value={dados.telefone}
                onChange={(e) => setDados({...dados, telefone: e.target.value})}
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Desconto Tarifa</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={dados.descontoTarifa}
                onChange={(e) => setDados({...dados, descontoTarifa: parseFloat(e.target.value) || 0})}
              />
            </div>
            <div className="form-group">
              <label>Ligação</label>
              <select
                value={dados.ligacao}
                onChange={(e) => setDados({...dados, ligacao: e.target.value})}
              >
                <option value="Monofásica">Monofásica</option>
                <option value="Bifásica">Bifásica</option>
                <option value="Trifásica">Trifásica</option>
              </select>
            </div>
          </div>
          
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn secondary">
              Cancelar
            </button>
            <button type="submit" className="btn primary">
              Salvar Proposta
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Componente Modal de Edição
const ModalEdicao = ({ item, onSave, onClose }) => {
  const [dados, setDados] = useState({ ...item });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(dados);
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <div className="modal-header">
          <h3>✏️ Editar Proposta</h3>
          <button onClick={onClose} className="close-btn">❌</button>
        </div>
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-row">
            <div className="form-group">
              <label>Nome do Cliente</label>
              <input
                type="text"
                value={dados.nomeCliente || ''}
                onChange={(e) => setDados({...dados, nomeCliente: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>Status</label>
              <select
                value={dados.status || 'Aguardando'}
                onChange={(e) => setDados({...dados, status: e.target.value})}
              >
                <option value="Aguardando">Aguardando</option>
                <option value="Fechado">Fechado</option>
              </select>
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Consultor</label>
              <input
                type="text"
                value={dados.consultor || ''}
                onChange={(e) => setDados({...dados, consultor: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>Média (kWh)</label>
              <input
                type="number"
                value={dados.media || 0}
                onChange={(e) => setDados({...dados, media: parseInt(e.target.value) || 0})}
              />
            </div>
          </div>
          
          <div className="modal-footer">
            <button type="button" onClick={onClose} className="btn secondary">
              Cancelar
            </button>
            <button type="submit" className="btn primary">
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProspecPage;