// src/components/relatorios/TabelaRanking.jsx
import React, { useState } from 'react';
import { Trophy, BarChart3, ArrowUpDown, ArrowUp, ArrowDown, ChevronLeft, ChevronRight } from 'lucide-react';

const TabelaRanking = ({
  dados = [],
  colunas = [],
  loading = false,
  titulo = "Ranking",
  iconeColuna = <Trophy className="inline-icon" size={16} />,
  onRowClick = null,
  maxHeight = "400px",
  showPagination = true,
  itemsPerPage = 10
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Ordenação
  const sortedData = React.useMemo(() => {
    if (!sortConfig.key) return dados;

    return [...dados].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      if (aValue === null || aValue === undefined) return 1;
      if (bValue === null || bValue === undefined) return -1;

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      const aStr = String(aValue).toLowerCase();
      const bStr = String(bValue).toLowerCase();

      if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [dados, sortConfig]);

  // Paginação
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = showPagination
    ? sortedData.slice(startIndex, startIndex + itemsPerPage)
    : sortedData;

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const formatValue = (value, tipo = 'text') => {
    if (value === null || value === undefined) return 'N/A';

    switch (tipo) {
      case 'numero':
        return typeof value === 'number' ? value.toLocaleString('pt-BR') : value;
      case 'moeda':
        return typeof value === 'number' ? `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : value;
      case 'percentual':
        return typeof value === 'number' ? `${value.toFixed(1)}%` : value;
      case 'posicao':
        return `${value}º`;
      default:
        return value;
    }
  };

  const getSortIcon = (columnKey) => {
    if (sortConfig.key !== columnKey) return <ArrowUpDown className="inline-icon" size={14} />;
    return sortConfig.direction === 'asc' ? <ArrowUp className="inline-icon" size={14} /> : <ArrowDown className="inline-icon" size={14} />;
  };

  if (loading) {
    return (
      <div className="tabela-ranking loading">
        <div className="table-header">
          <h3>{iconeColuna} {titulo}</h3>
        </div>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Carregando dados do ranking...</p>
        </div>
      </div>
    );
  }

  if (!dados.length) {
    return (
      <div className="tabela-ranking empty">
        <div className="table-header">
          <h3>{iconeColuna} {titulo}</h3>
        </div>
        <div className="empty-state">
          <p><BarChart3 className="inline-icon" size={16} /> Nenhum dado encontrado para o período selecionado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="tabela-ranking">
      <div className="table-header">
        <h3>{iconeColuna} {titulo}</h3>
        <div className="table-info">
          <span>Total: {dados.length} registros</span>
          {showPagination && (
            <span>Página {currentPage} de {totalPages}</span>
          )}
        </div>
      </div>

      <div className="table-container" style={{ maxHeight }}>
        <table className="ranking-table">
          <thead>
            <tr>
              {colunas.map((coluna, index) => (
                <th
                  key={index}
                  className={`${coluna.sortable ? 'sortable' : ''} align-${coluna.align || 'left'}`}
                  onClick={coluna.sortable ? () => handleSort(coluna.key) : null}
                >
                  <div className="th-content">
                    <span>{coluna.label}</span>
                    {coluna.sortable && (
                      <span className="sort-icon">
                        {getSortIcon(coluna.key)}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className={`${onRowClick ? 'clickable' : ''} ${rowIndex < 3 ? `top-${rowIndex + 1}` : ''}`}
                onClick={onRowClick ? () => onRowClick(row) : null}
              >
                {colunas.map((coluna, colIndex) => (
                  <td key={colIndex} className={`align-${coluna.align || 'left'}`}>
                    {coluna.render
                      ? coluna.render(row[coluna.key], row, rowIndex)
                      : formatValue(row[coluna.key], coluna.tipo)
                    }
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showPagination && totalPages > 1 && (
        <div className="table-pagination">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="inline-icon" size={16} /> Anterior
          </button>

          <div className="pagination-info">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(page =>
                page === 1 ||
                page === totalPages ||
                Math.abs(page - currentPage) <= 2
              )
              .map((page, index, array) => (
                <React.Fragment key={page}>
                  {index > 0 && array[index - 1] < page - 1 && (
                    <span className="pagination-ellipsis">...</span>
                  )}
                  <button
                    className={currentPage === page ? 'active' : ''}
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </button>
                </React.Fragment>
              ))}
          </div>

          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
          >
            Próxima <ChevronRight className="inline-icon" size={16} />
          </button>
        </div>
      )}
    </div>
  );
};

export default TabelaRanking;