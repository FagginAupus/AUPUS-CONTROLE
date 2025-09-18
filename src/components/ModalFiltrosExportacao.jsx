import React, { useState, useEffect } from 'react';
import { Calendar, User, Download, X, Filter } from 'lucide-react';

const ModalFiltrosExportacao = ({ isOpen, onClose, onExportar, tipo, consultores = [] }) => {
  const [filtros, setFiltros] = useState({
    dataInicio: '',
    dataFim: '',
    consultor: ''
  });

  useEffect(() => {
    if (isOpen) {
      // Resetar filtros ao abrir
      const hoje = new Date();
      const primeiroDiaAno = new Date(hoje.getFullYear(), 0, 1);
      
      setFiltros({
        dataInicio: primeiroDiaAno.toISOString().split('T')[0],
        dataFim: hoje.toISOString().split('T')[0],
        consultor: ''
      });
    }
  }, [isOpen]);

  const handleSubmit = () => {
    if (!filtros.dataInicio || !filtros.dataFim) {
      alert('Por favor, selecione o período para exportação');
      return;
    }

    if (new Date(filtros.dataInicio) > new Date(filtros.dataFim)) {
      alert('A data inicial não pode ser maior que a data final');
      return;
    }

    onExportar(filtros);
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <Filter size={20} />
            Exportar {tituloTipo}
          </h2>
          <button className="modal-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="export-form">
          <div className="form-section">
            <h3>
              <Calendar size={16} />
              Período
            </h3>
            <p className="form-description">{descricaoData}</p>
            
            <div className="date-range">
              <div className="form-group">
                <label>Data Inicial</label>
                <input
                  type="date"
                  value={filtros.dataInicio}
                  onChange={(e) => handleInputChange('dataInicio', e.target.value)}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Data Final</label>
                <input
                  type="date"
                  value={filtros.dataFim}
                  onChange={(e) => handleInputChange('dataFim', e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h3>
              <User size={16} />
              Consultor
            </h3>
            <p className="form-description">Deixe em branco para exportar todos</p>
            
            <div className="form-group">
              <select
                value={filtros.consultor}
                onChange={(e) => handleInputChange('consultor', e.target.value)}
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

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">
              Cancelar
            </button>
            <button type="button" onClick={handleSubmit} className="btn btn-success">
              <Download size={16} />
              Exportar XML
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal-content {
          background: #1e1e1e;
          border-radius: 12px;
          width: 100%;
          max-width: 500px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          border: 1px solid #333;
        }

        .modal-header {
          padding: 24px 24px 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #333;
          margin-bottom: 24px;
        }

        .modal-header h2 {
          color: #e0e0e0;
          font-size: 20px;
          font-weight: 600;
          margin: 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .modal-close {
          background: transparent;
          border: none;
          color: #888;
          padding: 4px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .modal-close:hover {
          color: #e0e0e0;
          background: #333;
        }

        .export-form {
          padding: 0 24px 24px;
        }

        .form-section {
          margin-bottom: 24px;
        }

        .form-section h3 {
          color: #e0e0e0;
          font-size: 16px;
          font-weight: 600;
          margin: 0 0 8px 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .form-description {
          color: #888;
          font-size: 14px;
          margin: 0 0 16px 0;
          line-height: 1.4;
        }

        .date-range {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
        }

        .form-group label {
          color: #ccc;
          font-size: 14px;
          font-weight: 500;
          margin-bottom: 6px;
        }

        .form-group input,
        .form-group select {
          background: #2a2a2a;
          border: 1px solid #444;
          border-radius: 8px;
          padding: 12px;
          color: #e0e0e0;
          font-size: 14px;
          transition: all 0.2s ease;
        }

        .form-group input:focus,
        .form-group select:focus {
          outline: none;
          border-color: #4285f4;
          box-shadow: 0 0 0 3px rgba(66, 133, 244, 0.1);
        }

        .form-group select {
          cursor: pointer;
        }

        .form-group option {
          background: #2a2a2a;
          color: #e0e0e0;
        }

        .modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 32px;
          padding-top: 24px;
          border-top: 1px solid #333;
        }

        .btn {
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 6px;
          border: none;
        }

        .btn-secondary {
          background: #444;
          color: #ccc;
        }

        .btn-secondary:hover {
          background: #555;
          color: #e0e0e0;
        }

        .btn-success {
          background: #28a745;
          color: white;
        }

        .btn-success:hover {
          background: #218838;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(40, 167, 69, 0.3);
        }

        @media (max-width: 600px) {
          .modal-content {
            margin: 10px;
            max-width: none;
          }

          .date-range {
            grid-template-columns: 1fr;
          }

          .modal-actions {
            flex-direction: column-reverse;
          }

          .btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};

export default ModalFiltrosExportacao;