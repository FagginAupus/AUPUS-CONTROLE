// src/pages/ProspecPage.jsx - USANDO SERVIÇO PDF
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
        
        // Criar dados mock com IDs únicos e timestamp diferente para cada
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

  // FUNÇÃO PARA EDITAR ITEM
  const editarItem = (index) => {
    const item = dadosFiltrados[index];
    if (!item) return;

    showNotification('Função de edição em desenvolvimento', 'info');
    console.log('Editando item:', item);
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
        descontoTarifa: item.descontoTarifa || 0.2,
        descontoBandeira: item.descontoBandeira || 0.2,
        status: item.status,
        ucs: todasUCs.map(uc => ({
          distribuidora: 'Equatorial',
          numeroUC: uc.numeroUC,
          apelido: uc.apelido,
          ligacao: uc.ligacao || 'Monofásica',
          consumo: uc.media || 0
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

      console.log('📊 Dados estruturados para PDF:', dadosProposta);

      // Usar serviço PDF
      const resultado = await PDFGenerator.baixarPDF(dadosProposta, true);
      showNotification(`✅ PDF baixado: ${resultado.nomeArquivo}`, 'success');

    } catch (error) {
      console.error('❌ Erro ao baixar PDF:', error);
      showNotification('Erro ao gerar PDF: ' + error.message, 'error');
    }
  };

  // Função para aplicar filtros
  const aplicarFiltros = () => {
    let dadosTemp = [...dados];

    if (filtros.consultor) {
      dadosTemp = dadosTemp.filter(item => 
        item.consultor && item.consultor.toLowerCase().includes(filtros.consultor.toLowerCase())
      );
    }

    if (filtros.status) {
      dadosTemp = dadosTemp.filter(item => item.status === filtros.status);
    }

    if (filtros.busca) {
      const busca = filtros.busca.toLowerCase();
      dadosTemp = dadosTemp.filter(item =>
        (item.nomeCliente && item.nomeCliente.toLowerCase().includes(busca)) ||
        (item.numeroProposta && item.numeroProposta.toLowerCase().includes(busca)) ||
        (item.numeroUC && item.numeroUC.toLowerCase().includes(busca))
      );
    }

    setDadosFiltrados(dadosTemp);
  };

  // Aplicar filtros quando mudarem
  useEffect(() => {
    aplicarFiltros();
  }, [filtros, dados]);

  const limparFiltros = () => {
    setFiltros({ consultor: '', status: '', busca: '' });
  };

  const exportarCSV = async () => {
    try {
      if (window.aupusStorage && window.aupusStorage.exportarParaCSV) {
        await window.aupusStorage.exportarParaCSV('prospec');
        showNotification('Dados exportados com sucesso!', 'success');
      } else {
        showNotification('Função de exportação não disponível', 'warning');
      }
    } catch (error) {
      console.error('Erro ao exportar:', error);
      showNotification('Erro ao exportar dados: ' + error.message, 'error');
    }
  };

  const calcularEstatisticas = () => {
    const total = dados.length;
    const fechados = dados.filter(item => item.status === 'Fechado').length;
    const aguardando = dados.filter(item => item.status === 'Aguardando').length;
    const mediaConsumo = dados.length > 0 
      ? (dados.reduce((acc, item) => acc + (parseFloat(item.media) || 0), 0) / dados.length).toFixed(0)
      : 0;

    return { total, fechados, aguardando, mediaConsumo };
  };

  const stats = calcularEstatisticas();

  const formatarData = (data) => {
    if (!data) return '';
    try {
      const d = new Date(data);
      return d.toLocaleDateString('pt-BR');
    } catch {
      return data;
    }
  };

  const formatarPercentual = (valor) => {
    if (!valor && valor !== 0) return '';
    try {
      return (parseFloat(valor) * 100).toFixed(1) + '%';
    } catch {
      return '';
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="container">
          <Header title="PROSPEC" subtitle="Carregando..." icon="📊" />
          <div style={{ textAlign: 'center', padding: '50px', color: 'white' }}>
            <div className="spinner" style={{ 
              margin: '0 auto 20px',
              width: '40px',
              height: '40px',
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #4CAF50',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}></div>
            Carregando dados...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="container">
        <Header 
          title="PROSPEC" 
          subtitle="Gestão de Propostas" 
          icon="📊" 
        />
        
        <Navigation />

        {/* Estatísticas Rápidas */}
        <section className="quick-stats">
          <div className="stat-card">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">Total de Propostas</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.fechados}</div>
            <div className="stat-label">Fechados</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.aguardando}</div>
            <div className="stat-label">Aguardando</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.mediaConsumo}</div>
            <div className="stat-label">Média kWh</div>
          </div>
        </section>

        {/* Filtros */}
        <section className="filters-section">
          <div className="filters-container">
            <div className="filters-grid">
              <div className="filter-group">
                <label htmlFor="filtroConsultor">Consultor</label>
                <select
                  id="filtroConsultor"
                  value={filtros.consultor}
                  onChange={(e) => setFiltros(prev => ({ ...prev, consultor: e.target.value }))}
                >
                  <option value="">Todos os consultores</option>
                  {[...new Set(dados.map(item => item.consultor).filter(Boolean))].map(consultor => (
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
          </div>
        </section>

        {/* Tabela */}
        <section className="data-section">
          <div className="table-header">
            <h2>Propostas ({dadosFiltrados.length})</h2>
          </div>

          {dadosFiltrados.length === 0 ? (
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
                    <th>Média</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {dadosFiltrados.map((item, index) => (
                    <tr key={item.id || `row-${index}-${Date.now()}`}>
                      <td>{item.nomeCliente}</td>
                      <td style={{ fontFamily: 'Courier New, monospace' }}>{item.numeroProposta}</td>
                      <td style={{ fontFamily: 'Courier New, monospace' }}>{formatarData(item.data)}</td>
                      <td>{item.apelido}</td>
                      <td style={{ fontFamily: 'Courier New, monospace' }}>{item.numeroUC}</td>
                      <td style={{ textAlign: 'center' }}>{formatarPercentual(item.descontoTarifa)}</td>
                      <td style={{ textAlign: 'center' }}>{formatarPercentual(item.descontoBandeira)}</td>
                      <td>{item.ligacao}</td>
                      <td>{item.consultor}</td>
                      <td>{item.recorrencia}</td>
                      <td style={{ textAlign: 'right' }}>{parseFloat(item.media || 0).toLocaleString('pt-BR')} kWh</td>
                      <td>
                        <span className={`status-badge ${item.status === 'Fechado' ? 'status-fechado' : 'status-aguardando'}`}>
                          {item.status}
                        </span>
                      </td>
                      <td>
                        <div className="table-actions">
                          <button 
                            className="action-btn edit" 
                            title="Editar"
                            onClick={() => editarItem(index)}
                          >
                            ✏️
                          </button>
                          <button 
                            className="action-btn view" 
                            title="Baixar PDF"
                            onClick={() => baixarPDFItem(index)}
                          >
                            📄
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
    </div>
  );
};

export default ProspecPage;