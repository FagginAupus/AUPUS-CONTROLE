// src/pages/ProspecPage.jsx - IMPLEMENTAÇÃO COMPLETA DA EDIÇÃO
import React, { useState, useEffect } from 'react';
import Header from '../components/common/Header';
import Navigation from '../components/common/Navigation';
import { useNotification } from '../context/NotificationContext';
import PDFGenerator from '../services/pdfGenerator';
import './ProspecPage.css';

const ProspecPage = () => {
  const [dados, setDados] = useState([]);
  const [dadosFiltrados, setDadosFiltrados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalEdicao, setModalEdicao] = useState({ show: false, item: null, index: -1 });
  
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
      
      console.log('🔍 Verificando scripts necessários...');
      
      // Aguardar scripts do sistema serem carregados
      let tentativas = 0;
      const maxTentativas = 30; // 3 segundos máximo
      
      while (tentativas < maxTentativas) {
        if (window.aupusStorage && typeof window.aupusStorage.getProspec === 'function') {
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
        tentativas++;
      }

      if (!window.aupusStorage || typeof window.aupusStorage.getProspec !== 'function') {
        console.warn('⚠️ aupusStorage não carregou, criando dados de demonstração');
        
        // Criar dados mock com IDs únicos
        const timestamp = Date.now();
        const dadosMock = [
          {
            id: `demo-1-${timestamp}`,
            nomeCliente: 'João Silva',
            numeroProposta: '2025/0001',
            data: '2025-07-20',
            apelido: 'Loja Centro',
            numeroUC: '12345678',
            descontoTarifa: 0.20,
            descontoBandeira: 0.15,
            ligacao: 'Trifásica',
            consultor: 'Maria Santos',
            recorrencia: '3%',
            media: 850,
            telefone: '(62) 99999-9999',
            status: 'Aguardando'
          },
          {
            id: `demo-2-${timestamp + 1000}`,
            nomeCliente: 'Empresa ABC',
            numeroProposta: '2025/0002',
            data: '2025-07-21',
            apelido: 'Matriz',
            numeroUC: '87654321',
            descontoTarifa: 0.25,
            descontoBandeira: 0.20,
            ligacao: 'Trifásica',
            consultor: 'João Silva',
            recorrencia: '5%',
            media: 1200,
            telefone: '(62) 88888-8888',
            status: 'Fechado'
          }
        ];
        
        setDados(dadosMock);
        setDadosFiltrados(dadosMock);
        showNotification('Modo demonstração ativo. Crie propostas para ver dados reais.', 'info');
        return;
      }

      // Se storage disponível, carregar dados reais
      console.log('✅ aupusStorage disponível, carregando dados reais...');
      const dadosProspec = await window.aupusStorage.getProspec();
      const dadosArray = Array.isArray(dadosProspec) ? dadosProspec : [];
      
      // Garantir IDs únicos para cada item
      const dadosComIds = dadosArray.map((item, index) => ({
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

  // FUNÇÃO PARA EDITAR ITEM - IMPLEMENTADA
  const editarItem = (index) => {
    const item = dadosFiltrados[index];
    if (!item) return;

    setModalEdicao({ show: true, item, index });
  };

  // FUNÇÃO PARA SALVAR EDIÇÃO
  const salvarEdicao = async (dadosAtualizados) => {
    try {
      const { item, index } = modalEdicao;
      
      // Encontrar o índice real no array principal
      const indexReal = dados.findIndex(p => p.id === item.id);
      
      if (indexReal === -1) {
        showNotification('Item não encontrado para edição', 'error');
        return;
      }

      if (window.aupusStorage && typeof window.aupusStorage.atualizarProspec === 'function') {
        // Atualizar no storage
        await window.aupusStorage.atualizarProspec(indexReal, dadosAtualizados);
        
        // Sincronizar com aba CONTROLE se status mudou
        const statusAnterior = item.status;
        const novoStatus = dadosAtualizados.status;
        
        if (statusAnterior !== novoStatus && window.aupusStorage.sincronizarStatusFechado) {
          await window.aupusStorage.sincronizarStatusFechado(item.numeroProposta, novoStatus);
        }
        
        // Recarregar dados
        await carregarDados();
        showNotification('Proposta atualizada com sucesso!', 'success');
      } else {
        // Fallback para modo demonstração
        const novosDados = [...dados];
        novosDados[indexReal] = { ...item, ...dadosAtualizados };
        setDados(novosDados);
        showNotification('Dados atualizados (modo demonstração)', 'success');
      }
      
      setModalEdicao({ show: false, item: null, index: -1 });
      
    } catch (error) {
      console.error('❌ Erro ao salvar edição:', error);
      showNotification('Erro ao salvar: ' + error.message, 'error');
    }
  };

  // FUNÇÃO EXCLUIR ITEM
  const excluirItem = async (index) => {
    const item = dadosFiltrados[index];
    if (!item) return;

    if (!window.confirm(`Deseja realmente excluir a proposta de ${item.nomeCliente} (${item.apelido})?`)) {
      return;
    }

    try {
      // Encontrar o índice real no array principal
      const indexReal = dados.findIndex(p => p.id === item.id);
      
      if (indexReal === -1) {
        showNotification('Item não encontrado para exclusão', 'error');
        return;
      }

      if (window.aupusStorage && typeof window.aupusStorage.removerProspec === 'function') {
        // Remover do controle se status for Fechado
        if (item.status === 'Fechado' && window.aupusStorage.removerControle) {
          await window.aupusStorage.removerControle(item.numeroProposta, item.numeroUC);
        }
        
        // Remover do PROSPEC
        await window.aupusStorage.removerProspec(indexReal);
        
        // Recarregar dados
        await carregarDados();
        showNotification('Proposta excluída com sucesso!', 'success');
      } else {
        // Fallback para modo demonstração
        const novosDados = dados.filter(d => d.id !== item.id);
        setDados(novosDados);
        showNotification('Proposta excluída (modo demonstração)', 'success');
      }
      
    } catch (error) {
      console.error('❌ Erro ao excluir:', error);
      showNotification('Erro ao excluir: ' + error.message, 'error');
    }
  };

  // FUNÇÃO BAIXAR PDF - USANDO SERVIÇO PDF
  const baixarPDFItem = async (index) => {
    const item = dadosFiltrados[index];
    if (!item) {
      showNotification('Item não encontrado', 'error');
      return;
    }

    try {
      console.log('📄 Iniciando download do PDF para:', item.nomeCliente);
      showNotification('📄 Gerando PDF da proposta...', 'info');

      // Buscar todas as UCs da mesma proposta
      const todasUCs = dados.filter(p => p.numeroProposta === item.numeroProposta);

      // Reconstruir dados da proposta para o PDF
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

      // Gerar PDF usando o serviço
      const resultado = await PDFGenerator.baixarPDF(dadosProposta, true);
      
      if (resultado) {
        showNotification('📄 PDF baixado com sucesso!', 'success');
        console.log('✅ PDF gerado:', resultado.nomeArquivo);
      }

    } catch (error) {
      console.error('❌ Erro ao gerar PDF:', error);
      showNotification('Erro ao gerar PDF: ' + error.message, 'error');
    }
  };

  const exportarCSV = async () => {
    try {
      if (window.aupusStorage && typeof window.aupusStorage.exportarParaCSV === 'function') {
        await window.aupusStorage.exportarParaCSV('prospec');
        showNotification('Dados exportados com sucesso!', 'success');
      } else {
        showNotification('Função de exportação não disponível', 'warning');
      }
    } catch (error) {
      console.error('❌ Erro ao exportar:', error);
      showNotification('Erro ao exportar: ' + error.message, 'error');
    }
  };

  const formatarData = (data) => {
    return new Date(data).toLocaleDateString('pt-BR');
  };

  const formatarPercentual = (valor) => {
    return ((valor || 0) * 100).toFixed(1) + '%';
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Aguardando': return 'status-aguardando';
      case 'Fechado': return 'status-fechado';
      default: return 'status-default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Aguardando': return '⏳';
      case 'Fechado': return '✅';
      default: return '❓';
    }
  };

  return (
    <div className="page-container">
      <div className="container">
        <Header 
          title="PROSPEC" 
          subtitle="Prospector de Energia" 
          icon="📊" 
        />
        
        <Navigation />

        {/* Estatísticas */}
        <section className="stats-section">
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-value">{dadosFiltrados.length}</div>
              <div className="stat-label">Total</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{dadosFiltrados.filter(item => item.status === 'Aguardando').length}</div>
              <div className="stat-label">Aguardando</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{dadosFiltrados.filter(item => item.status === 'Fechado').length}</div>
              <div className="stat-label">Fechadas</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">
                {dadosFiltrados.length > 0 
                  ? Math.round(dadosFiltrados.reduce((soma, item) => soma + (parseFloat(item.media) || 0), 0) / dadosFiltrados.length)
                  : 0
                } kWh
              </div>
              <div className="stat-label">Média Consumo</div>
            </div>
          </div>
        </section>

        {/* Filtros */}
        <section className="filters-section">
          <div className="filters-grid">
            <div className="filter-group">
              <label htmlFor="filtroConsultor">Consultor</label>
              <select
                id="filtroConsultor"
                value={filtros.consultor}
                onChange={(e) => setFiltros(prev => ({ ...prev, consultor: e.target.value }))}
              >
                <option value="">Todos os consultores</option>
                {[...new Set(dados.map(item => item.consultor))].filter(Boolean).sort().map(consultor => (
                  <option key={consultor} value={consultor}>{consultor}</option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="filtroStatus">Status</label>
              <select
                id="filtroStatus"
                value={filtros.status}
                onChange={(e) => setFiltros(prev => ({ ...prev, status: e.target.value }))}
              >
                <option value="">Todos os status</option>
                <option value="Aguardando">Aguardando</option>
                <option value="Fechado">Fechado</option>
              </select>
            </div>

            <div className="filter-group">
              <label htmlFor="filtroBusca">Buscar</label>
              <input
                type="text"
                id="filtroBusca"
                placeholder="Nome, proposta ou UC..."
                value={filtros.busca}
                onChange={(e) => setFiltros(prev => ({ ...prev, busca: e.target.value }))}
              />
            </div>
          </div>

          <div className="actions-container">
            <button className="btn btn-secondary" onClick={limparFiltros}>
              🗑️ Limpar Filtros
            </button>
            <button className="btn btn-secondary" onClick={exportarCSV}>
              📥 Exportar CSV
            </button>
            <button className="btn btn-primary" onClick={carregarDados}>
              🔄 Atualizar
            </button>
          </div>
        </section>

        {/* Tabela */}
        <section className="data-section">
          <div className="table-header">
            <h2>Propostas ({dadosFiltrados.length})</h2>
          </div>

          {loading ? (
            <div className="loading-state">
              <div className="spinner"></div>
              <p>Carregando propostas...</p>
            </div>
          ) : dadosFiltrados.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <h3>Nenhuma proposta encontrada</h3>
              <p>Ajuste os filtros ou crie uma nova proposta</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Nº Proposta</th>
                    <th>Data</th>
                    <th>Apelido</th>
                    <th>UC</th>
                    <th>Desc. Tarifa</th>
                    <th>Desc. Bandeira</th>
                    <th>Ligação</th>
                    <th>Consultor</th>
                    <th>Recorrência</th>
                    <th>Média (kWh)</th>
                    <th>Telefone</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {dadosFiltrados.map((item, index) => (
                    <tr key={item.id}>
                      <td><strong>{item.nomeCliente || '-'}</strong></td>
                      <td>{item.numeroProposta || '-'}</td>
                      <td className="data">{item.data ? formatarData(item.data) : '-'}</td>
                      <td>{item.apelido || '-'}</td>
                      <td>{item.numeroUC || '-'}</td>
                      <td className="valor">{formatarPercentual(item.descontoTarifa)}</td>
                      <td className="valor">{formatarPercentual(item.descontoBandeira)}</td>
                      <td>{item.ligacao || '-'}</td>
                      <td><strong>{item.consultor || '-'}</strong></td>
                      <td className="valor">{item.recorrencia || '-'}</td>
                      <td className="valor">{(item.media || 0).toLocaleString('pt-BR')} kWh</td>
                      <td className="data">{item.telefone || '-'}</td>
                      <td>
                        <span className={`status ${getStatusClass(item.status)}`}>
                          {getStatusIcon(item.status)} {item.status}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions">
                          <button
                            onClick={() => editarItem(index)}
                            className="action-btn edit"
                            title="Editar proposta"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => baixarPDFItem(index)}
                            className="action-btn pdf"
                            title="Baixar PDF"
                          >
                            📄
                          </button>
                          <button
                            onClick={() => excluirItem(index)}
                            className="action-btn delete"
                            title="Excluir proposta"
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

      {/* Modal de Edição */}
      {modalEdicao.show && (
        <ModalEdicao
          item={modalEdicao.item}
          onClose={() => setModalEdicao({ show: false, item: null, index: -1 })}
          onSave={salvarEdicao}
        />
      )}
    </div>
  );
};

// Componente Modal de Edição
const ModalEdicao = ({ item, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    nomeCliente: item?.nomeCliente || '',
    apelido: item?.apelido || '',
    numeroUC: item?.numeroUC || '',
    descontoTarifa: Math.round((item?.descontoTarifa || 0) * 100),
    descontoBandeira: Math.round((item?.descontoBandeira || 0) * 100),
    ligacao: item?.ligacao || 'Monofásica',
    consultor: item?.consultor || '',
    recorrencia: item?.recorrencia || '3%',
    media: item?.media || 0,
    telefone: item?.telefone || '',
    status: item?.status || 'Aguardando'
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    // Converter percentuais para decimal
    const dadosAtualizados = {
      ...formData,
      descontoTarifa: parseFloat(formData.descontoTarifa) / 100,
      descontoBandeira: parseFloat(formData.descontoBandeira) / 100,
      media: parseFloat(formData.media)
    };
    
    onSave(dadosAtualizados);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Editar Proposta</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="editNomeCliente">Nome Cliente</label>
              <input
                type="text"
                id="editNomeCliente"
                name="nomeCliente"
                value={formData.nomeCliente}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="editApelido">Apelido</label>
              <input
                type="text"
                id="editApelido"
                name="apelido"
                value={formData.apelido}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="editNumeroUC">Número UC</label>
              <input
                type="text"
                id="editNumeroUC"
                name="numeroUC"
                value={formData.numeroUC}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="editDescontoTarifa">Desconto Tarifa (%)</label>
              <input
                type="number"
                id="editDescontoTarifa"
                name="descontoTarifa"
                min="0"
                max="100"
                step="0.1"
                value={formData.descontoTarifa}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="editDescontoBandeira">Desconto Bandeira (%)</label>
              <input
                type="number"
                id="editDescontoBandeira"
                name="descontoBandeira"
                min="0"
                max="100"
                step="0.1"
                value={formData.descontoBandeira}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="editLigacao">Ligação</label>
              <select
                id="editLigacao"
                name="ligacao"
                value={formData.ligacao}
                onChange={handleChange}
                required
              >
                <option value="Monofásica">Monofásica</option>
                <option value="Bifásica">Bifásica</option>
                <option value="Trifásica">Trifásica</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="editConsultor">Consultor</label>
              <input
                type="text"
                id="editConsultor"
                name="consultor"
                value={formData.consultor}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="editRecorrencia">Recorrência</label>
              <select
                id="editRecorrencia"
                name="recorrencia"
                value={formData.recorrencia}
                onChange={handleChange}
                required
              >
                <option value="0%">0%</option>
                <option value="1%">1%</option>
                <option value="2%">2%</option>
                <option value="3%">3%</option>
                <option value="4%">4%</option>
                <option value="5%">5%</option>
                <option value="6%">6%</option>
                <option value="7%">7%</option>
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="editMedia">Média (kWh)</label>
              <input
                type="number"
                id="editMedia"
                name="media"
                min="0"
                step="0.01"
                value={formData.media}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="editTelefone">Telefone</label>
              <input
                type="tel"
                id="editTelefone"
                name="telefone"
                value={formData.telefone}
                onChange={handleChange}
                required
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="editStatus">Status</label>
              <select
                id="editStatus"
                name="status"
                value={formData.status}
                onChange={handleChange}
                required
              >
                <option value="Aguardando">Aguardando</option>
                <option value="Fechado">Fechado</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="modal-footer">
          <button className="btn btn-primary" onClick={handleSave}>
            💾 Salvar
          </button>
          <button className="btn btn-secondary" onClick={onClose}>
            ❌ Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProspecPage;