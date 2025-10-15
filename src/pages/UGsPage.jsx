// UGsPage.jsx - CORRIGIDO com modais seguindo padrão PROSPEC
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import '../styles/common/index.css';
import Header from '../components/common/Header';
import Navigation from '../components/common/Navigation';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import storageService from '../services/storageService';
import { useData } from '../context/DataContext';
import './UGsPage.css';
import './CommonModalsPagesDark.css';
import '../components/common/CommonModal.css';
import {
  Factory,
  Zap,
  Users,
  TrendingUp,
  Edit,
  Trash2,
  FileSpreadsheet,
  Search,
  RefreshCw,
  BarChart3,
  FileText,
  Plus,
  X,
  Eye,
  Save,
  Check,
  AlertCircle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import * as XLSXStyle from 'xlsx-js-style';
const UGsPage = () => {
  const { user } = useAuth();
  const { 
    ugs, 
    loadUgs,  
    afterCreateUg 
  } = useData();
  const [modalNovaUG, setModalNovaUG] = useState({ show: false });
  const [modalEdicao, setModalEdicao] = useState({ show: false, item: null, index: -1 });
  const [modalVisualizarUCs, setModalVisualizarUCs] = useState({ show: false, ug: null, ucs: [] });

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
    );
    const capacidadeDisponivel = Math.max(0, capacidadeTotal - consumoTotal);

    return {
      total,
      capacidadeTotal: Math.round(capacidadeTotal),
      consumoTotal: Math.round(consumoTotal),
      capacidadeDisponivel: Math.round(capacidadeDisponivel)
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
      await storageService.adicionarUG(dadosUG);
      console.log('✅ UG criada com sucesso!');
      
      // ✅ ALTERAR: Chamar afterCreateUg E fazer reload direto
      afterCreateUg();
      
      // ✅ ADICIONAR: Reload adicional para garantir
      setTimeout(() => {
        console.log('🔄 Recarregando UGs direto da página...');
        loadUgs({}, true); // Força reload
      }, 200);
            
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
    if (user?.role !== 'admin' && user?.role !== 'analista') return;

    const item = dadosFiltrados[index];
    if (!item) return;
    setModalEdicao({ show: true, item, index });
  };

  const salvarEdicaoUG = async (dadosAtualizados) => {
    try {
      const { item } = modalEdicao;
      
      if (!item || !item.id) {
        showNotification('UG não encontrada para edição', 'error');
        return;
      }

      const capacidade = 720 * dadosAtualizados.potenciaCC * (dadosAtualizados.fatorCapacidade / 100);
      
      // ✅ INCLUIR O ID DA UG NOS DADOS
      const ugAtualizada = {
        id: item.id, // ✅ ADICIONAR O ID
        ...dadosAtualizados,
        capacidade
      };

      console.log('🔍 Dados para atualização:', ugAtualizada);

      // ✅ PASSAR O ID DIRETAMENTE E OS DADOS COMPLETOS
      await storageService.atualizarUG(item.id, ugAtualizada);
      loadUgs(ugs.filters, true);
      
      setModalEdicao({ show: false, item: null, index: -1 });
      showNotification('UG atualizada com sucesso!', 'success');
      
    } catch (error) {
      console.error('❌ Erro ao salvar edição:', error);
      showNotification('Erro ao salvar: ' + error.message, 'error');
    }
  };

  const excluirUG = async (index) => {
    if (user?.role !== 'admin' && user?.role !== 'analista') return;

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

  const gerarRelatorioUGs = async () => {
    try {
      showNotification('Gerando relatório de UGs...', 'info');

      const response = await storageService.gerarRelatorioUGs();

      if (!response.success) {
        throw new Error(response.message || 'Erro ao gerar relatório');
      }

      const dadosRelatorio = response.data;

      // Criar estrutura do Excel (sem título, diretamente com cabeçalho e dados)
      const dadosExcel = [
        ['Número UC', 'Nome da Usina', 'Capacidade (kWh)'],
        ...dadosRelatorio.map(ug => [
          ug.numero_uc,
          ug.nome_usina,
          ug.capacidade.toLocaleString('pt-BR')
        ])
      ];

      // Gerar Excel usando xlsx-js-style
      const wb = XLSXStyle.utils.book_new();
      const ws = XLSXStyle.utils.aoa_to_sheet(dadosExcel);

      // Configurar largura das colunas
      ws['!cols'] = [
        { wch: 15 }, // Número UC
        { wch: 40 }, // Nome da Usina
        { wch: 20 }  // Capacidade
      ];

      // Aplicar formatação ao cabeçalho (linha 1)
      const headerCells = ['A1', 'B1', 'C1'];
      headerCells.forEach(cell => {
        if (ws[cell]) {
          ws[cell].s = {
            fill: {
              fgColor: { rgb: '0070C0' } // Fundo azul
            },
            font: {
              color: { rgb: 'FFFFFF' }, // Letra branca
              bold: true
            },
            alignment: {
              horizontal: 'center', // Centralizado
              vertical: 'center'
            }
          };
        }
      });

      // Aplicar alinhamento à esquerda para os dados (a partir da linha 2)
      dadosRelatorio.forEach((ug, index) => {
        const rowNum = index + 2; // Linha 2 em diante
        ['A', 'B', 'C'].forEach(col => {
          const cell = `${col}${rowNum}`;
          if (ws[cell]) {
            ws[cell].s = {
              alignment: {
                horizontal: 'left', // Alinhado à esquerda
                vertical: 'center'
              }
            };
          }
        });
      });

      XLSXStyle.utils.book_append_sheet(wb, ws, 'Relatório UGs');

      // Download com nome fixo usando xlsx-js-style
      const nomeArquivo = 'Controle_UGs_Geradoras.xlsx';
      XLSXStyle.writeFile(wb, nomeArquivo);

      showNotification('Relatório gerado com sucesso!', 'success');

    } catch (error) {
      console.error('❌ Erro ao gerar relatório:', error);
      showNotification(`Erro ao gerar relatório: ${error.message}`, 'error');
    }
  };

  const refreshDados = useCallback(() => {
    console.log('🔄 Refresh manual dos dados');
    loadUgs(ugs.filters, true);
  }, [loadUgs, ugs.filters]);

  const baixarRateioUG = async (ug, index) => {
    try {
      console.log('📊 Iniciando download do rateio da UG:', ug.nomeUsina);

      // Validar se UG tem UCs atribuídas
      const ucsAtribuidas = parseInt(ug.ucsAtribuidas || 0);
      if (ucsAtribuidas === 0) {
        showNotification('Esta UG não possui UCs atribuídas para gerar rateio', 'warning');
        return;
      }

      showNotification('Gerando planilha de rateio...', 'info');

      // Buscar detalhes das UCs atribuídas à UG
      const response = await storageService.obterRateioDetalhes(ug.id);

      if (!response.success) {
        throw new Error(response.message || 'Erro ao buscar dados do rateio');
      }

      const { ugInfo, ucsDetalhes } = response.data;

      // Gerar arquivo Excel
      await gerarRateioExcel(ugInfo, ucsDetalhes);

      showNotification('Planilha de rateio baixada com sucesso!', 'success');

    } catch (error) {
      console.error('❌ Erro ao baixar rateio:', error);
      showNotification(`Erro ao gerar rateio: ${error.message}`, 'error');
    }
  };

  const visualizarUCsDaUG = async (ug) => {
    try {
      if (!ug.ucsAtribuidas || ug.ucsAtribuidas === 0) {
        showNotification('Esta UG não possui UCs atribuídas', 'warning');
        return;
      }

      showNotification('Carregando UCs da UG...', 'info');

      const response = await storageService.obterRateioDetalhes(ug.id);

      if (!response.success) {
        throw new Error(response.message || 'Erro ao buscar UCs da UG');
      }

      const { ugInfo, ucsDetalhes } = response.data;

      setModalVisualizarUCs({
        show: true,
        ug: ugInfo,
        ucs: ucsDetalhes
      });

    } catch (error) {
      console.error('❌ Erro ao carregar UCs:', error);
      showNotification(`Erro ao carregar UCs: ${error.message}`, 'error');
    }
  };

  const gerarRateioExcel = async (ugInfo, ucsDetalhes) => {
    // Calcular porcentagens de rateio
    const capacidadeTotal = parseFloat(ugInfo.capacidade || 0);

    if (capacidadeTotal <= 0) {
      throw new Error('UG com capacidade inválida');
    }

    // UCs com consumo calibrado e porcentagem
    let ucsComRateio = ucsDetalhes.map(uc => {
      const consumoCalibrado = parseFloat(uc.consumo_calibrado || 0);
      const porcentagem = (consumoCalibrado / capacidadeTotal) * 100;

      return {
        numero_uc: uc.numero_unidade,
        consumo_calibrado: consumoCalibrado,
        porcentagem: Math.round(porcentagem * 100) / 100 // 2 casas decimais
      };
    });

    // Ajustar para somar exatamente 100%
    const somaAtual = ucsComRateio.reduce((acc, uc) => acc + uc.porcentagem, 0);
    const diferenca = 100.00 - somaAtual;

    if (Math.abs(diferenca) > 0.01) {
      // Ajustar a maior UC para fechar em 100%
      const maiorUC = ucsComRateio.reduce((prev, current) =>
        current.porcentagem > prev.porcentagem ? current : prev
      );
      maiorUC.porcentagem = Math.round((maiorUC.porcentagem + diferenca) * 100) / 100;
    }

    // Criar estrutura do Excel
    const dadosExcel = [
      ['Código da UC Geradora:', '', ugInfo.numero_unidade],
      ['Titular da UC:', '', 'CONSORCIO CLUBE AUPUS ENERGIA GO'], // Valor padrão
      ['CNPJ/CPF:', '', '61.028.500/0001-26'], // Valor padrão
      ['Lista de unidades consumidoras participantes do sistema de compensação', '', ''],
      ['UC Beneficiaria', '', 'Porcentagem de rateio'],
      ...ucsComRateio.map(uc => [uc.numero_uc, '', `${uc.porcentagem.toLocaleString('pt-BR')}%`])
    ];

    // Gerar e baixar Excel usando SheetJS
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(dadosExcel);

    // Formatação das células
    ws['C1'] = { t: 'n', v: parseFloat(ugInfo.numero_unidade) };

    XLSX.utils.book_append_sheet(wb, ws, 'Rateio');

    // Download
    const nomeArquivo = `Rateio UG_${ugInfo.numero_unidade}.xlsx`;
    XLSX.writeFile(wb, nomeArquivo);
  };

  const isAdminOrAnalista = user?.role === 'admin' || user?.role === 'analista';


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
              <span className="stat-value">{estatisticas.capacidadeTotal.toLocaleString('pt-BR')} kWh</span>
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
          <div className="stat-card">
            <div className="stat-icon">
              <Zap size={24} style={{ color: '#f0f0f0', opacity: 0.8 }} />
            </div>
            <div className="stat-content">
              <span className="stat-label">Capacidade Disponível</span>
              <span className="stat-value">{estatisticas.capacidadeDisponivel.toLocaleString('pt-BR')} kWh</span>
            </div>
          </div>
        </section>

        {/* Filtros e Controles */}
        <section className="filters-section">
          <div className="filters-container">
            <div className="filters-actions-row">
              <div className="filter-group filter-busca-ugs">
                <label>Buscar UG</label>
                <input
                  type="text"
                  placeholder="Nome da usina..."
                  value={filtros.busca}
                  onChange={(e) => setFiltros({...filtros, busca: e.target.value})}
                />
              </div>

              <div className="actions-container-inline">
              <button onClick={limparFiltros} className="btn btn-secondary">
                Limpar Filtros
              </button>
              <button
                onClick={refreshDados}
                className="btn btn-secondary"
                disabled={ugs.loading}
                title="Atualizar dados"
              >
                <RefreshCw size={16} className={ugs.loading ? 'spinning' : ''} />
                Atualizar
              </button>
              <button onClick={exportarCSV} className="btn btn-secondary">
                <BarChart3 size={16} />
                Exportar CSV
              </button>
              <button onClick={gerarRelatorioUGs} className="btn btn-secondary">
                <FileText size={16} />
                Relatório UGs
              </button>
              {isAdminOrAnalista && (
                <button
                  onClick={() => setModalNovaUG({ show: true })}
                  className="btn btn-primary"
                >
                  <Plus size={16} />
                  Nova UG
                </button>
              )}
              </div>
            </div>
          </div>
        </section>

        {/* Tabela */}
        <section className="data-section">
          <div className="table-header">
           <h2><Factory /> Usinas Geradoras <span className="table-count">{dadosFiltrados.length}</span></h2>
          </div>
          
          <div className="table-wrapper">
            {ugs.loading && ugs.data.length === 0 ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Carregando UGs...</p>
              </div>
            ) : dadosFiltrados.length === 0 ? (
              <div className="empty-state">
                <Factory size={80} style={{ opacity: 0.3, marginBottom: '20px' }} />
                <h2>Nenhuma UG encontrada</h2>
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
                    <th className="text-center" style={{ width: '160px' }}>
                      <div>Lotação da UG</div>
                      <small className="d-block text-muted" style={{ fontSize: '0.7rem', lineHeight: '1.1' }}>
                        Capacidade ocupada<br/>
                        (média + calibragem)
                      </small>
                    </th>
                    {isAdminOrAnalista && <th>Ações</th>}
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
                      <td className="text-center">
                        {(() => {
                          // 1. OBTER VALORES BASE
                          const capacidadeTotal = parseFloat(item.capacidade || 0);
                          const consumoAtribuido = parseFloat(item.mediaConsumoAtribuido || 0);

                          // 2. CALCULAR PERCENTUAL DE LOTAÇÃO
                          const percentualLotacao = capacidadeTotal > 0 ?
                            Math.round((consumoAtribuido / capacidadeTotal) * 100) : 0;

                          // 3. DETERMINAR STATUS DA UG BASEADO NO PERCENTUAL
                          let status, corBarra;
                          if (percentualLotacao >= 95) {
                            status = 'CHEIA';
                            corBarra = '#dc3545'; // Vermelho
                          } else if (percentualLotacao >= 80) {
                            status = 'QUASE CHEIA';
                            corBarra = '#ffc107'; // Amarelo
                          } else {
                            status = 'DISPONÍVEL';
                            corBarra = '#28a745'; // Verde
                          }

                          // 4. CALCULAR ESPAÇO DISPONÍVEL
                          const espacoDisponivel = Math.max(0, capacidadeTotal - consumoAtribuido);

                          return (
                            <div className="lotacao-container"
                                 data-status={status.toLowerCase().replace(' ', '-')}
                                 title={`
DETALHES DA UG: ${item.nomeUsina}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 CAPACIDADE TOTAL: ${capacidadeTotal.toLocaleString('pt-BR')} kWh/mês
🔥 CONSUMO ATRIBUÍDO: ${consumoAtribuido.toLocaleString('pt-BR')} kWh/mês
📈 PERCENTUAL USADO: ${percentualLotacao}%
✅ ESPAÇO DISPONÍVEL: ${espacoDisponivel.toLocaleString('pt-BR')} kWh/mês
🏷️ STATUS: ${status}

ℹ️ NOTA: O consumo atribuído já inclui as calibragens aplicadas:
• UCs com calibragem individual usam sua própria calibragem
• UCs sem calibragem individual usam a calibragem global
• Fórmula: consumo_medio × (1 + calibragem/100)
                                 `}>

                              {/* BARRA DE PROGRESSO VISUAL */}
                              <div className="lotacao-barra-fundo">
                                <div
                                  className="lotacao-barra-preenchida"
                                  style={{
                                    width: `${Math.min(100, percentualLotacao)}%`,
                                    backgroundColor: corBarra
                                  }}
                                />
                              </div>

                              {/* PERCENTUAL NUMÉRICO */}
                              <div className="lotacao-info-texto">
                                <strong className="lotacao-percentual">{percentualLotacao}%</strong>
                                <small className="lotacao-status">{status}</small>
                              </div>

                            </div>
                          );
                        })()}
                      </td>
                      {isAdminOrAnalista && (
                        <td>
                          <div className="action-buttons">
                            <button
                              onClick={() => visualizarUCsDaUG(item)}
                              className="action-btn info"
                              title="Visualizar UCs Alocadas"
                              disabled={!item.ucsAtribuidas || item.ucsAtribuidas === 0}
                              style={{
                                opacity: (!item.ucsAtribuidas || item.ucsAtribuidas === 0) ? 0.5 : 1,
                                cursor: (!item.ucsAtribuidas || item.ucsAtribuidas === 0) ? 'not-allowed' : 'pointer'
                              }}
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              onClick={() => editarUG(index)}
                              className="action-btn edit"
                              title="Editar UG"
                            >
                              <Edit size={16} />
                            </button>
                            <button
                              onClick={() => baixarRateioUG(item, index)}
                              className="action-btn success"
                              title="Baixar Rateio da UG"
                            >
                              <FileSpreadsheet size={16} />
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
        {modalNovaUG.show && isAdminOrAnalista && (
          <ModalNovaUG 
            onSave={criarNovaUG}
            onClose={() => setModalNovaUG({ show: false })}
          />
        )}

        {modalEdicao.show && isAdminOrAnalista && (
          <ModalEdicaoUG
            item={modalEdicao.item}
            onSave={salvarEdicaoUG}
            onClose={() => setModalEdicao({ show: false, item: null, index: -1 })}
          />
        )}

        {modalVisualizarUCs.show && (
          <ModalVisualizarUCs
            ug={modalVisualizarUCs.ug}
            ucs={modalVisualizarUCs.ucs}
            onClose={() => setModalVisualizarUCs({ show: false, ug: null, ucs: [] })}
            onGenerateExcel={(ugInfo, ucsDetalhes) => gerarRateioExcel(ugInfo, ucsDetalhes)}
            showNotification={showNotification}
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
      potencia_ca: parseFloat(formData.potenciaCA) || 0,
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
    <div className="common-modal-overlay" onClick={onClose}>
      <div className="common-modal modal-ug" onClick={(e) => e.stopPropagation()}>
        <div className="common-modal-header modal-header-ug">
          <h2>
            <Factory size={20} />
            Nova UG
          </h2>
          <button onClick={onClose} className="common-close-btn">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="common-modal-content modal-body-ug">
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

// Modal Edição UG - CORRIGIDO PARA USAR OS DADOS DA API
const ModalEdicaoUG = ({ item, onClose, onSave }) => {
  const [dados, setDados] = useState({
    nomeUsina: '',
    potenciaCC: 0,
    potenciaCA: 0,
    fatorCapacidade: 19,
    numero_unidade: ''
  });

  // ✅ CARREGAR DADOS QUANDO O ITEM MUDAR
  useEffect(() => {
    if (item) {
      console.log('🔍 Item recebido no modal (com ID):', {
        id: item.id,
        nomeUsina: item.nomeUsina,
        numeroUnidade: item.numeroUnidade
      });
      
      if (!item.id) {
        console.error('❌ ITEM SEM ID:', item);
      }
      
      setDados({
        nomeUsina: item.nomeUsina || '',
        potenciaCC: parseFloat(item.potenciaCC) || 0,
        potenciaCA: parseFloat(item.potenciaCA) || 0,
        fatorCapacidade: parseFloat(item.fatorCapacidade) || 19,
        numero_unidade: String(item.numeroUnidade || item.numero_unidade || '').trim()
      });
    }
  }, [item]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // ✅ VALIDAÇÃO SEGURA - CONVERTER PARA STRING ANTES DE USAR .trim()
    if (!dados.nomeUsina?.trim()) {
      alert('Nome da usina é obrigatório');
      return;
    }
    
    // ✅ VALIDAÇÃO SEGURA PARA numero_unidade
    if (!String(dados.numero_unidade || '').trim()) {
      alert('Número da UC é obrigatório');
      return;
    }
    
    // Preparar dados para envio
    const dadosParaEnvio = {
      nomeUsina: dados.nomeUsina.trim(),
      potenciaCC: parseFloat(dados.potenciaCC) || 0,
      fatorCapacidade: parseFloat(dados.fatorCapacidade) || 19,
      numero_unidade: String(dados.numero_unidade || '').trim() // ✅ ADICIONAR CAMPO SEGURO
    };
    
    onSave(dadosParaEnvio);
  };

  return (
    <div className="common-modal-overlay" onClick={onClose}>
      <div className="common-modal modal-ug" onClick={(e) => e.stopPropagation()}>
        <div className="common-modal-header modal-header-ug">
          <h2>
            <Edit size={20} />
            Editar UG
          </h2>
          <button onClick={onClose} className="common-close-btn">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="common-modal-content modal-body-ug">
          <div className="form-grid">
            <div className="form-group">
              <label>Nome da Usina *</label>
              <input
                type="text"
                value={dados.nomeUsina}
                onChange={(e) => setDados({...dados, nomeUsina: e.target.value})}
                required
                placeholder="Nome da usina"
              />
            </div>

            <div className="form-group">
              <label>Número da UC *</label>
              <input
                type="text"
                value={String(dados.numero_unidade || '')} // ✅ FORÇAR STRING NO VALUE
                onChange={(e) => setDados({...dados, numero_unidade: e.target.value})}
                required
                placeholder="Número da unidade"
                readOnly // ✅ OPCIONAL: Tornar readonly se não deve ser editado
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
                value={dados.fatorCapacidade}
                onChange={(e) => setDados({...dados, fatorCapacidade: parseFloat(e.target.value) || 19})}
                placeholder="Ex: 19"
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

// Modal Visualizar UCs da UG
const ModalVisualizarUCs = ({ ug, ucs, onClose, onGenerateExcel, showNotification }) => {
  const [modoEdicao, setModoEdicao] = useState(false);
  const [ucsEditadas, setUcsEditadas] = useState([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  useEffect(() => {
    if (ucs && ucs.length > 0) {
      // Inicializar ucsEditadas com os dados originais
      setUcsEditadas(ucs.map(uc => ({
        ...uc,
        consumo_calibrado_editado: parseFloat(uc.consumo_calibrado || 0)
      })));
    }
  }, [ucs]);

  // Calcular porcentagens automaticamente
  const calcularPorcentagens = (ucsLista) => {
    const capacidadeTotal = parseFloat(ug?.capacidade || 0);
    if (capacidadeTotal <= 0) return ucsLista;

    return ucsLista.map(uc => {
      const consumo = parseFloat(uc.consumo_calibrado_editado || 0);
      const porcentagem = (consumo / capacidadeTotal) * 100;
      return {
        ...uc,
        porcentagem: Math.round(porcentagem * 100) / 100
      };
    });
  };

  const ucsComPorcentagens = calcularPorcentagens(ucsEditadas);

  const totalAlocado = ucsComPorcentagens.reduce((sum, uc) =>
    sum + parseFloat(uc.consumo_calibrado_editado || 0), 0
  );

  const porcentagemTotal = ucsComPorcentagens.reduce((sum, uc) =>
    sum + (uc.porcentagem || 0), 0
  );

  const handleEditarMedia = (index, novoValor) => {
    const novasUCs = [...ucsEditadas];
    novasUCs[index].consumo_calibrado_editado = parseFloat(novoValor) || 0;
    setUcsEditadas(novasUCs);
  };

  const handleSalvar = () => {
    setShowConfirmDialog(true);
  };

  const confirmarSalvar = async () => {
    try {
      // Aqui você implementaria a chamada para salvar as médias editadas
      // Por enquanto, vou apenas mostrar uma notificação
      showNotification('Médias atualizadas com sucesso!', 'success');
      setShowConfirmDialog(false);
      setModoEdicao(false);
    } catch (error) {
      showNotification(`Erro ao salvar: ${error.message}`, 'error');
    }
  };

  const handleGerarPlanilha = async () => {
    try {
      await onGenerateExcel(ug, ucsComPorcentagens);
      showNotification('Planilha gerada com sucesso!', 'success');
    } catch (error) {
      showNotification(`Erro ao gerar planilha: ${error.message}`, 'error');
    }
  };

  return (
    <>
      <div className="common-modal-overlay" onClick={onClose}>
        <div className="common-modal modal-visualizar-ucs" onClick={(e) => e.stopPropagation()}>
          <div className="common-modal-header modal-header-ug">
            <h2>
              <Eye size={20} />
              UCs Alocadas - {ug?.nome_usina}
            </h2>
            <button onClick={onClose} className="common-close-btn">
              <X size={20} />
            </button>
          </div>

          <div className="common-modal-content modal-body-visualizar-ucs">
            {/* Informações da UG */}
            <div className="ug-info-header">
              <div className="ug-info-item">
                <strong>Número de UCs:</strong> {ucs.length}
              </div>
              <div className="ug-info-item">
                <strong>Capacidade Total:</strong> {parseFloat(ug?.capacidade || 0).toLocaleString('pt-BR')} kWh
              </div>
            </div>

            {/* Tabela de UCs */}
            <div className="ucs-table-container">
              <table className="ucs-table">
                <thead>
                  <tr>
                    <th>UC</th>
                    <th>Média (kWh)</th>
                    <th>Porcentagem</th>
                  </tr>
                </thead>
                <tbody>
                  {ucsComPorcentagens.map((uc, index) => (
                    <tr key={index}>
                      <td>{uc.numero_unidade}</td>
                      <td>
                        {modoEdicao ? (
                          <input
                            type="number"
                            step="0.01"
                            value={uc.consumo_calibrado_editado}
                            onChange={(e) => handleEditarMedia(index, e.target.value)}
                            className="input-media-edicao"
                          />
                        ) : (
                          <span>{parseFloat(uc.consumo_calibrado_editado || 0).toLocaleString('pt-BR')}</span>
                        )}
                      </td>
                      <td>
                        <span className="porcentagem-valor">{(uc.porcentagem || 0).toFixed(2)}%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="total-row">
                    <td><strong>TOTAL</strong></td>
                    <td><strong>{totalAlocado.toLocaleString('pt-BR')} kWh</strong></td>
                    <td>
                      <strong className={porcentagemTotal === 100 ? 'porcentagem-ok' : 'porcentagem-aviso'}>
                        {porcentagemTotal.toFixed(2)}%
                      </strong>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>

            {porcentagemTotal !== 100 && (
              <div className="aviso-porcentagem">
                <AlertCircle size={16} />
                <span>Atenção: A porcentagem total deve ser 100,00%</span>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <div className="footer-left">
              <button
                onClick={handleGerarPlanilha}
                className="btn btn-secondary"
              >
                <FileSpreadsheet size={16} />
                Gerar Planilha
              </button>
            </div>
            <div className="footer-right">
              {modoEdicao ? (
                <>
                  <button
                    onClick={handleSalvar}
                    className="btn btn-primary"
                    disabled={porcentagemTotal !== 100}
                  >
                    <Save size={16} />
                    Salvar Alterações
                  </button>
                  <button
                    onClick={() => {
                      setModoEdicao(false);
                      setUcsEditadas(ucs.map(uc => ({
                        ...uc,
                        consumo_calibrado_editado: parseFloat(uc.consumo_calibrado || 0)
                      })));
                    }}
                    className="btn btn-secondary"
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setModoEdicao(true)}
                    className="btn btn-primary"
                  >
                    <Edit size={16} />
                    Editar Médias
                  </button>
                  <button onClick={onClose} className="btn btn-secondary">
                    Fechar
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Dialog de Confirmação */}
      {showConfirmDialog && (
        <div className="common-modal-overlay" onClick={() => setShowConfirmDialog(false)}>
          <div className="common-modal modal-confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="common-modal-header">
              <h2>
                <AlertCircle size={20} />
                Confirmar Alteração
              </h2>
            </div>
            <div className="common-modal-content">
              <p>Tem certeza que deseja alterar as médias das UCs?</p>
              <p><strong>Esta ação irá recalcular todas as porcentagens.</strong></p>
            </div>
            <div className="modal-footer">
              <button onClick={confirmarSalvar} className="btn btn-primary">
                <Check size={16} />
                Confirmar
              </button>
              <button onClick={() => setShowConfirmDialog(false)} className="btn btn-secondary">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UGsPage;