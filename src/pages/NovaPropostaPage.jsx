// src/pages/NovaPropostaPage.jsx
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import Header from '../components/common/Header';
import Navigation from '../components/common/Navigation';
import { useNotification } from '../context/NotificationContext';
import './NovaPropostaPage.css';

// Schema de validação
const propostaSchema = yup.object({
  nomeCliente: yup.string().required('Nome do cliente é obrigatório'),
  celular: yup.string().required('Celular é obrigatório'),
  consultor: yup.string().required('Consultor é obrigatório'),
  economia: yup.number().min(0).max(100).required('Economia é obrigatória'),
  bandeira: yup.number().min(0).max(100).required('Economia bandeira é obrigatória')
});

const NovaPropostaPage = () => {
  const [numeroUCs, setNumeroUCs] = useState(1);
  const [loading, setLoading] = useState(false);
  const [numeroProposta, setNumeroProposta] = useState('');
  const { showNotification } = useNotification();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue
  } = useForm({
    resolver: yupResolver(propostaSchema),
    defaultValues: {
      dataProposta: new Date().toISOString().split('T')[0],
      status: 'Aguardando',
      economia: 20,
      bandeira: 20,
      recorrencia: '3%',
      numeroUCs: 1
    }
  });

  const semConsultor = watch('semConsultor');
  const economiaValue = watch('economia');

  useEffect(() => {
    gerarNumeroProposta();
  }, []);

  useEffect(() => {
    if (semConsultor) {
      setValue('consultor', 'AUPUS');
      setValue('recorrencia', '0%');
    } else {
      setValue('consultor', '');
      setValue('recorrencia', '3%');
    }
  }, [semConsultor, setValue]);

  const gerarNumeroProposta = () => {
    const ano = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-4);
    setNumeroProposta(`${ano}/${timestamp}`);
  };

  const mostrarCamposUC = (numero) => {
    setNumeroUCs(numero);
  };

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      
      // Simular salvamento
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      showNotification('Proposta salva com sucesso!', 'success');
      
      // Redirecionar para PROSPEC
      setTimeout(() => {
        window.location.href = '/prospec';
      }, 1000);
      
    } catch (error) {
      showNotification('Erro ao salvar proposta', 'error');
    } finally {
      setLoading(false);
    }
  };

  const limparFormulario = () => {
    if (window.confirm('Deseja limpar todos os dados do formulário?')) {
      reset();
      gerarNumeroProposta();
      setNumeroUCs(1);
      showNotification('Formulário limpo!', 'info');
    }
  };

  return (
    <div className="page-container">
      <div className="container">
        <Header 
          title="NOVA PROPOSTA" 
          subtitle="Aupus Energia" 
          icon="📝" 
        />
        
        <Navigation />

        <form className="form-container" onSubmit={handleSubmit(onSubmit)}>
          {/* Dados Básicos */}
          <section className="form-section">
            <h2>Dados Básicos</h2>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="nomeCliente">Nome do Cliente *</label>
                <input
                  {...register('nomeCliente')}
                  type="text"
                  id="nomeCliente"
                  className={errors.nomeCliente ? 'error' : ''}
                />
                {errors.nomeCliente && <span className="error-message">{errors.nomeCliente.message}</span>}
              </div>
              
              <div className="form-group">
                <label htmlFor="dataProposta">Data da Proposta</label>
                <input
                  {...register('dataProposta')}
                  type="date"
                  id="dataProposta"
                  readOnly
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="numeroProposta">Número da Proposta</label>
                <input
                  type="text"
                  id="numeroProposta"
                  value={numeroProposta}
                  readOnly
                  style={{ background: '#f8f9fa', fontWeight: '600' }}
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="celular">Celular do Cliente *</label>
                <input
                  {...register('celular')}
                  type="tel"
                  id="celular"
                  placeholder="(11) 99999-9999"
                  className={errors.celular ? 'error' : ''}
                />
                {errors.celular && <span className="error-message">{errors.celular.message}</span>}
              </div>
            </div>
          </section>

          {/* Consultor e Configurações */}
          <section className="form-section">
            <h2>Consultor e Configurações</h2>
            
            {/* Checkbox Sem Consultor - CENTRALIZADO */}
            <div className="checkbox-group sem-consultor">
              <input
                {...register('semConsultor')}
                type="checkbox"
                id="semConsultor"
              />
              <label htmlFor="semConsultor">Sem consultor (AUPUS direto)</label>
            </div>
            
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="consultor">Nome do Consultor *</label>
                <input
                  {...register('consultor')}
                  type="text"
                  id="consultor"
                  readOnly={semConsultor}
                  style={{
                    backgroundColor: semConsultor ? '#f0f0f0' : '#ffffff'
                  }}
                  className={errors.consultor ? 'error' : ''}
                />
                {errors.consultor && <span className="error-message">{errors.consultor.message}</span>}
              </div>
              
              <div className="form-group">
                <label htmlFor="recorrencia">Recorrência do Consultor</label>
                <select
                  {...register('recorrencia')}
                  id="recorrencia"
                  disabled={semConsultor}
                  style={{
                    backgroundColor: semConsultor ? '#f0f0f0' : '#ffffff'
                  }}
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
                <label htmlFor="economia">Economia Tarifa (%)</label>
                <input
                  {...register('economia')}
                  type="number"
                  id="economia"
                  min="0"
                  max="100"
                  step="0.1"
                  className={errors.economia ? 'error' : ''}
                />
                {errors.economia && <span className="error-message">{errors.economia.message}</span>}
              </div>
              
              <div className="form-group">
                <label htmlFor="bandeira">Economia Bandeira (%)</label>
                <input
                  {...register('bandeira')}
                  type="number"
                  id="bandeira"
                  min="0"
                  max="100"
                  step="0.1"
                  className={errors.bandeira ? 'error' : ''}
                />
                {errors.bandeira && <span className="error-message">{errors.bandeira.message}</span>}
              </div>
              
              <div className="form-group">
                <label htmlFor="numeroUCs">Número de UCs</label>
                <select
                  {...register('numeroUCs')}
                  id="numeroUCs"
                  onChange={(e) => mostrarCamposUC(parseInt(e.target.value))}
                >
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                  <option value="6">6</option>
                </select>
              </div>
            </div>
          </section>

          {/* Unidades Consumidoras */}
          <section className="form-section">
            <h2>Unidades Consumidoras</h2>
            
            <div className="ucs-container">
              {Array.from({ length: numeroUCs }, (_, i) => (
                <div key={i} className="uc-card">
                  <h3>UC {i + 1}</h3>
                  <div className="form-grid">
                    <div className="form-group">
                      <label htmlFor={`apelido${i}`}>Apelido da UC *</label>
                      <input
                        {...register(`apelido${i}`, { required: true })}
                        type="text"
                        id={`apelido${i}`}
                        placeholder="Ex: Loja Centro"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor={`numeroUC${i}`}>Número da UC *</label>
                      <input
                        {...register(`numeroUC${i}`, { required: true })}
                        type="text"
                        id={`numeroUC${i}`}
                        placeholder="Ex: 12345678"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor={`ligacao${i}`}>Tipo de Ligação *</label>
                      <select
                        {...register(`ligacao${i}`, { required: true })}
                        id={`ligacao${i}`}
                      >
                        <option value="">Selecione...</option>
                        <option value="Monofásica">Monofásica</option>
                        <option value="Bifásica">Bifásica</option>
                        <option value="Trifásica">Trifásica</option>
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor={`consumo${i}`}>Consumo Médio (kWh) *</label>
                      <input
                        {...register(`consumo${i}`, { required: true })}
                        type="number"
                        id={`consumo${i}`}
                        placeholder="Ex: 500"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Benefícios - CENTRALIZADOS */}
          <section className="form-section">
            <h2>Benefícios do Plano</h2>
            
            <div className="beneficios-grid">
              <div className="checkbox-group beneficio-item">
                <input
                  {...register('beneficio1')}
                  type="checkbox"
                  id="beneficio1"
                  defaultChecked
                />
                <label htmlFor="beneficio1">1. A Aupus Energia irá oferecer uma economia de até {economiaValue || 20}% no valor da energia elétrica, sem impostos</label>
              </div>
              
              <div className="checkbox-group beneficio-item">
                <input
                  {...register('beneficio2')}
                  type="checkbox"
                  id="beneficio2"
                />
                <label htmlFor="beneficio2">2. A Aupus Energia irá oferecer uma economia de até 50% nos valor referente a bandeira tarifária, sem impostos</label>
              </div>
              
              <div className="checkbox-group beneficio-item">
                <input
                  {...register('beneficio3')}
                  type="checkbox"
                  id="beneficio3"
                />
                <label htmlFor="beneficio3">3. Isenção de taxa de adesão</label>
              </div>
              
              <div className="checkbox-group beneficio-item">
                <input
                  {...register('beneficio4')}
                  type="checkbox"
                  id="beneficio4"
                  defaultChecked
                />
                <label htmlFor="beneficio4">4. Não há cobrança de taxa de cancelamento</label>
              </div>
              
              <div className="checkbox-group beneficio-item">
                <input
                  {...register('beneficio5')}
                  type="checkbox"
                  id="beneficio5"
                  defaultChecked
                />
                <label htmlFor="beneficio5">5. Não há fidelidade contratual</label>
              </div>
              
              <div className="checkbox-group beneficio-item">
                <input
                  {...register('beneficio6')}
                  type="checkbox"
                  id="beneficio6"
                  defaultChecked
                />
                <label htmlFor="beneficio6">6. O cliente pode cancelar a qualquer momento</label>
              </div>
              
              <div className="checkbox-group beneficio-item">
                <input
                  {...register('beneficio7')}
                  type="checkbox"
                  id="beneficio7"
                  defaultChecked
                />
                <label htmlFor="beneficio7">7. Atendimento personalizado</label>
              </div>
              
              <div className="checkbox-group beneficio-item">
                <input
                  {...register('beneficio8')}
                  type="checkbox"
                  id="beneficio8"
                  defaultChecked
                />
                <label htmlFor="beneficio8">8. Suporte técnico especializado</label>
              </div>
              
              <div className="checkbox-group beneficio-item">
                <input
                  {...register('beneficio9')}
                  type="checkbox"
                  id="beneficio9"
                  defaultChecked
                />
                <label htmlFor="beneficio9">9. Economia imediata na primeira fatura</label>
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="beneficioPersonalizado">Benefício Personalizado</label>
              <textarea
                {...register('beneficioPersonalizado')}
                id="beneficioPersonalizado"
                placeholder="Digite um benefício adicional..."
              ></textarea>
            </div>
          </section>

          {/* Botões */}
          <div className="form-actions">
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="spinner"></div>
                  Salvando...
                </>
              ) : (
                <>💾 Salvar Proposta</>
              )}
            </button>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => window.history.back()}
              disabled={loading}
            >
              ↩️ Voltar
            </button>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={limparFormulario}
              disabled={loading}
            >
              🗑️ Limpar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NovaPropostaPage;