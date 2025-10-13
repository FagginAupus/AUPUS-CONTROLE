import React, { useState, useEffect } from 'react';
import { Calendar, User, Download, X, Filter, Clock } from 'lucide-react';
import './common/CommonModal.css';

const ModalFiltrosExportacao = ({ isOpen, onClose, onExportar, tipo, consultores = [] }) => {
  const [filtros, setFiltros] = useState({
    dataInicio: '',
    dataFim: '',
    consultor: '',
    statusTroca: '',
    usarFiltroData: true
  });

  useEffect(() => {
    if (isOpen) {
      // Resetar filtros ao abrir
      const hoje = new Date();
      const primeiroDiaAno = new Date(hoje.getFullYear(), 0, 1);

      setFiltros({
        dataInicio: primeiroDiaAno.toISOString().split('T')[0],
        dataFim: hoje.toISOString().split('T')[0],
        consultor: '',
        statusTroca: '',
        usarFiltroData: true
      });
    }
  }, [isOpen]);

  const handleSubmit = () => {
    // ✅ CORREÇÃO: Validar datas apenas se o filtro de data estiver ativo
    if (filtros.usarFiltroData) {
      if (!filtros.dataInicio || !filtros.dataFim) {
        alert('Por favor, selecione o período para exportação');
        return;
      }

      if (new Date(filtros.dataInicio) > new Date(filtros.dataFim)) {
        alert('A data inicial não pode ser maior que a data final');
        return;
      }
    }

    // ✅ Passar filtros sem datas se usarFiltroData for false
    const filtrosParaExportar = {
      ...filtros,
      dataInicio: filtros.usarFiltroData ? filtros.dataInicio : null,
      dataFim: filtros.usarFiltroData ? filtros.dataFim : null
    };

    onExportar(filtrosParaExportar);
    onClose();
  };

  const handleInputChange = (campo, valor) => {
    setFiltros(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  if (!isOpen) return null;

  const tituloTipo = tipo === 'prospec' ? 'Prospecção' : 'Controle';
  const descricaoData = tipo === 'prospec' 
    ? 'Filtrar por data da proposta' 
    : 'Filtrar por data de entrada no controle';

  return (
    <div className="common-modal-overlay" onClick={onClose}>
      <div className="common-modal" onClick={(e) => e.stopPropagation()}>
        <div className="common-modal-header">
          <h2>
            <Filter size={20} />
            Exportar {tituloTipo}
          </h2>
          <button className="common-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="common-modal-content">
          <div className="common-modal-section">
            <h3>
              <Calendar size={18} />
              Período
            </h3>

            {/* Checkbox para habilitar/desabilitar filtro de data */}
            <div className="common-field" style={{ marginBottom: '16px' }}>
              <label style={{ cursor: 'pointer', userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={filtros.usarFiltroData}
                  onChange={(e) => handleInputChange('usarFiltroData', e.target.checked)}
                  style={{ marginRight: '8px', width: 'auto', cursor: 'pointer', accentColor: '#3b82f6' }}
                />
                <span>Filtrar por período de data</span>
              </label>
            </div>

            {filtros.usarFiltroData && (
              <>
                <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem', marginBottom: '16px' }}>
                  {descricaoData}
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="common-field">
                    <label>Data Inicial</label>
                    <input
                      type="date"
                      value={filtros.dataInicio}
                      onChange={(e) => handleInputChange('dataInicio', e.target.value)}
                      className="common-input"
                      required
                    />
                  </div>

                  <div className="common-field">
                    <label>Data Final</label>
                    <input
                      type="date"
                      value={filtros.dataFim}
                      onChange={(e) => handleInputChange('dataFim', e.target.value)}
                      className="common-input"
                      required
                    />
                  </div>
                </div>
              </>
            )}

            {!filtros.usarFiltroData && (
              <div className="common-info-box warning">
                ⚠️ Todos os registros serão exportados sem filtro de data
              </div>
            )}
          </div>

          <div className="common-modal-section">
            <h3>
              <User size={18} />
              Consultor
            </h3>
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem', marginBottom: '16px' }}>
              Deixe em branco para exportar todos
            </p>

            <div className="common-field">
              <select
                value={filtros.consultor}
                onChange={(e) => handleInputChange('consultor', e.target.value)}
                className="common-select"
              >
                <option value="">Todos os consultores</option>
                {consultores.map((consultor, index) => (
                  <option key={index} value={consultor}>
                    {consultor}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Filtro por Status de Troca (apenas para Controle) */}
          {tipo === 'controle' && (
            <div className="common-modal-section">
              <h3>
                <Clock size={18} />
                Status de Troca
              </h3>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem', marginBottom: '16px' }}>
                Filtrar por status da troca de titularidade
              </p>

              <div className="common-field">
                <select
                  value={filtros.statusTroca}
                  onChange={(e) => handleInputChange('statusTroca', e.target.value)}
                  className="common-select"
                >
                  <option value="">Todos os status</option>
                  <option value="Esteira">Esteira</option>
                  <option value="Em andamento">Em andamento</option>
                  <option value="Associado">Associado</option>
                </select>
              </div>
            </div>
          )}

        </div>

        <div className="common-modal-footer">
          <button type="button" onClick={onClose} className="common-btn common-btn-secondary">
            Cancelar
          </button>
          <button type="button" onClick={handleSubmit} className="common-btn common-btn-success">
            <Download size={16} />
            Exportar XML
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalFiltrosExportacao;
