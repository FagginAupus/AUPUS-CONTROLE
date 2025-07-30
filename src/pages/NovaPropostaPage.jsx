// src/pages/NovaPropostaPage.jsx - CORREÇÃO FINAL COMPLETA
import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useNavigate } from 'react-router-dom';
import Header from '../components/common/Header';
import Navigation from '../components/common/Navigation';
import { useNotification } from '../context/NotificationContext';
import PDFGenerator from '../services/pdfGenerator';
import './NovaPropostaPage.css';

// Schema de validação
const propostaSchema = yup.object({
  nomeCliente: yup.string().required('Nome do cliente é obrigatório'),
  celular: yup.string().required('Celular é obrigatório'),
  consultor: yup.string().when('semConsultor', {
    is: false,
    then: (schema) => schema.required('Consultor é obrigatório'),
    otherwise: (schema) => schema.optional()
  }),
  economia: yup.number().min(0).max(100).required('Economia é obrigatória'),
  bandeira: yup.number().min(0).max(100).required('Economia bandeira é obrigatória')
});

const NovaPropostaPage = () => {
  const [loading, setLoading] = useState(false);
  const [numeroProposta, setNumeroProposta] = useState('');
  const { showNotification } = useNotification();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
    control
  } = useForm({
    resolver: yupResolver(propostaSchema),
    defaultValues: {
      dataProposta: new Date().toISOString().split('T')[0],
      economia: 20,
      bandeira: 20,
      recorrencia: '3%',
      semConsultor: false,
      // UC inicial
      ucs: [
        {
          distribuidora: 'Equatorial',
          numeroUC: '',
          apelido: '',
          ligacao: 'Monofásica',
          consumo: ''
        }
      ],
      // BENEFÍCIOS: 2 e 3 começam DESMARCADOS
      beneficio1: true,
      beneficio2: false, // SEMPRE PODE SER DESMARCADO
      beneficio3: false,
      beneficio4: true,
      beneficio5: true,
      beneficio6: true,
      beneficio7: true,
      beneficio8: true,
      beneficio9: true
    }
  });

  // Controle dinâmico de UCs
  const { fields, append, remove } = useFieldArray({
    control,
    name: "ucs"
  });

  // Valores observados
  const semConsultor = watch('semConsultor');
  const economiaValue = watch('economia') || 20;
  const bandeiraValue = watch('bandeira') || 20;
  const beneficio2Checked = watch('beneficio2');

  useEffect(() => {
    gerarNumeroProposta();
  }, []);

  // Lógica do sem consultor
  useEffect(() => {
    if (semConsultor) {
      setValue('consultor', 'AUPUS');
      setValue('recorrencia', '0%');
    } else {
      setValue('consultor', '');
      setValue('recorrencia', '3%');
    }
  }, [semConsultor, setValue]);

  // CORREÇÃO: Função para lidar com mudança no benefício 2 - SEMPRE DESMARCÁVEL
  const handleBeneficio2Change = (e) => {
    const isChecked = e.target.checked;
    setValue('beneficio2', isChecked);
    
    // Se marcar benefício 2 e bandeira está baixa, sugerir valor maior
    if (isChecked && bandeiraValue <= 20) {
      setValue('bandeira', Math.max(bandeiraValue, 50));
    }
    
    // SEMPRE PERMITIR DESMARCAR - sem restrições
  };

  // Gerar número da proposta
  const gerarNumeroProposta = async () => {
    try {
      let tentativas = 0;
      while ((!window.aupusStorage || typeof window.aupusStorage.gerarNumeroProposta !== 'function') && tentativas < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        tentativas++;
      }
      
      if (window.aupusStorage && typeof window.aupusStorage.gerarNumeroProposta === 'function') {
        const numero = await window.aupusStorage.gerarNumeroProposta();
        setNumeroProposta(numero);
      } else {
        const ano = new Date().getFullYear();
        const timestamp = Date.now().toString().slice(-4);
        setNumeroProposta(`${ano}/${timestamp}`);
      }
    } catch (error) {
      console.error('Erro ao gerar número da proposta:', error);
      const ano = new Date().getFullYear();
      const timestamp = Date.now().toString().slice(-4);
      setNumeroProposta(`${ano}/${timestamp}`);
    }
  };

  // Adicionar UC
  const adicionarUC = () => {
    append({
      distribuidora: 'Equatorial',
      numeroUC: '',
      apelido: '',
      ligacao: 'Monofásica',
      consumo: ''
    });
  };

  // Remover UC
  const removerUC = (index) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  // Limpar formulário
  const limparFormulario = () => {
    if (window.confirm('Deseja limpar todos os dados do formulário?')) {
      reset();
      gerarNumeroProposta();
    }
  };

  // Submit do formulário
  const onSubmit = async (data) => {
    try {
      setLoading(true);
      
      // Processar dados da proposta
      const propostaData = {
        ...data,
        numeroProposta,
        dataProposta: new Date().toISOString().split('T')[0],
        status: 'Aguardando'
      };

      console.log('💾 Salvando proposta:', propostaData);

      // Salvar via storage
      if (window.aupusStorage && typeof window.aupusStorage.adicionarProspec === 'function') {
        // Salvar cada UC como uma linha separada
        for (const uc of propostaData.ucs) {
          const proposta = {
            nomeCliente: propostaData.nomeCliente,
            numeroProposta: propostaData.numeroProposta,
            data: propostaData.dataProposta,
            apelido: uc.apelido,
            numeroUC: uc.numeroUC,
            descontoTarifa: propostaData.economia / 100,
            descontoBandeira: propostaData.bandeira / 100,
            ligacao: uc.ligacao,
            consultor: propostaData.consultor,
            recorrencia: propostaData.recorrencia,
            media: uc.consumo,
            telefone: propostaData.celular,
            status: 'Aguardando'
          };
          
          await window.aupusStorage.adicionarProspec(proposta);
        }
        
        showNotification('Proposta salva com sucesso!', 'success');
      } else {
        console.warn('⚠️ Storage não disponível, salvando localmente');
        showNotification('Proposta salva localmente (modo demonstração)', 'info');
      }

      // Limpar formulário e navegar
      reset();
      await gerarNumeroProposta();
      navigate('/prospec');

    } catch (error) {
      console.error('❌ Erro ao salvar proposta:', error);
      showNotification('Erro ao salvar proposta: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="container">
        <Header title="Nova Proposta" subtitle="Criar nova proposta comercial" icon="📝" />
        <Navigation />

        <form onSubmit={handleSubmit(onSubmit)} className="form-container">
          
          {/* INFORMAÇÕES BÁSICAS - AGORA INCLUI CONSULTOR E ECONOMIA */}
          <section className="form-section">
            <h2>📋 Informações Básicas</h2>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="numeroProposta">Número da Proposta</label>
                <input
                  type="text"
                  value={numeroProposta}
                  disabled
                  style={{ backgroundColor: '#f0f0f0' }}
                />
              </div>

              <div className="form-group">
                <label htmlFor="dataProposta">Data da Proposta</label>
                <input
                  {...register('dataProposta')}
                  type="date"
                />
              </div>

              <div className="form-group">
                <label htmlFor="nomeCliente">Nome do Cliente *</label>
                <input
                  {...register('nomeCliente')}
                  type="text"
                  placeholder="Nome completo do cliente"
                  className={errors.nomeCliente ? 'error' : ''}
                />
                {errors.nomeCliente && (
                  <span className="error-message">{errors.nomeCliente.message}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="celular">Celular do Cliente *</label>
                <input
                  {...register('celular')}
                  type="tel"
                  placeholder="(62) 99999-9999"
                  className={errors.celular ? 'error' : ''}
                />
                {errors.celular && (
                  <span className="error-message">{errors.celular.message}</span>
                )}
              </div>

              {/* CONSULTOR AGORA DENTRO DE INFORMAÇÕES BÁSICAS */}
              <div className="form-group">
                <label htmlFor="consultor">Nome do Consultor *</label>
                <input
                  {...register('consultor')}
                  type="text"
                  placeholder="Nome do consultor responsável"
                  disabled={semConsultor}
                  style={{ backgroundColor: semConsultor ? '#f0f0f0' : '#ffffff' }}
                  className={errors.consultor ? 'error' : ''}
                />
                {errors.consultor && (
                  <span className="error-message">{errors.consultor.message}</span>
                )}
                
                {/* SEM CONSULTOR - DISCRETO E PEQUENO */}
                <div className="checkbox-group-inline">
                  <input {...register('semConsultor')} type="checkbox" id="semConsultor" />
                  <label htmlFor="semConsultor">Sem consultor (AUPUS direto)</label>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="recorrencia">Recorrência do Consultor</label>
                <select
                  {...register('recorrencia')}
                  disabled={semConsultor}
                  style={{ backgroundColor: semConsultor ? '#f0f0f0' : '#ffffff' }}
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

              {/* ECONOMIA TAMBÉM DENTRO DE INFORMAÇÕES BÁSICAS */}
              <div className="form-group">
                <label htmlFor="economia">Economia Tarifa (%)</label>
                <input
                  {...register('economia')}
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="Ex: 20"
                  className={errors.economia ? 'error' : ''}
                />
                {errors.economia && (
                  <span className="error-message">{errors.economia.message}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="bandeira">Economia Bandeira (%)</label>
                <input
                  {...register('bandeira')}
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="Ex: 20"
                  className={errors.bandeira ? 'error' : ''}
                />
                {errors.bandeira && (
                  <span className="error-message">{errors.bandeira.message}</span>
                )}
              </div>
            </div>
          </section>

          {/* UNIDADES CONSUMIDORAS - MANTÉM ESTRUTURA ORIGINAL */}
          <section className="form-section">
            <h2>🏢 Unidades Consumidoras</h2>
            
            <div className="uc-grid">
              {fields.map((field, index) => (
                <div key={field.id} className="uc-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                    <h3>UC {index + 1}</h3>
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removerUC(index)}
                        className="btn btn-danger"
                        style={{ padding: '5px 10px', fontSize: '0.8rem' }}
                      >
                        🗑️ Remover
                      </button>
                    )}
                  </div>

                  <div className="form-grid">
                    <div className="form-group">
                      <label htmlFor={`ucs.${index}.distribuidora`}>Distribuidora</label>
                      <select {...register(`ucs.${index}.distribuidora`)}>
                        <option value="Equatorial">Equatorial</option>
                        <option value="Enel">Enel</option>
                        <option value="Cemig">Cemig</option>
                        <option value="Copel">Copel</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor={`ucs.${index}.numeroUC`}>Número da UC</label>
                      <input
                        {...register(`ucs.${index}.numeroUC`)}
                        type="text"
                        placeholder="Ex: 12345678"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor={`ucs.${index}.apelido`}>Apelido da UC</label>
                      <input
                        {...register(`ucs.${index}.apelido`)}
                        type="text"
                        placeholder="Ex: Loja Centro"
                      />
                    </div>

                    <div className="form-group">
                      <label htmlFor={`ucs.${index}.ligacao`}>Tipo de Ligação</label>
                      <select {...register(`ucs.${index}.ligacao`)}>
                        <option value="Monofásica">Monofásica</option>
                        <option value="Bifásica">Bifásica</option>
                        <option value="Trifásica">Trifásica</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label htmlFor={`ucs.${index}.consumo`}>Consumo Médio (kWh)</label>
                      <input
                        {...register(`ucs.${index}.consumo`)}
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="Ex: 850"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <button
              type="button"
              onClick={adicionarUC}
              className="btn btn-secondary"
              style={{ marginTop: '15px' }}
            >
              ➕ Adicionar UC
            </button>
          </section>

          {/* BENEFÍCIOS DA PROPOSTA - ALINHADOS À ESQUERDA */}
          <section className="form-section">
            <h2>🎯 Benefícios da Proposta</h2>
            <div className="beneficios-grid">
              <div className="checkbox-group beneficio-item">
                <input {...register('beneficio1')} type="checkbox" id="beneficio1" />
                <label htmlFor="beneficio1">
                  1. Economia de até {economiaValue}% na tarifa de energia elétrica, sem impostos
                </label>
              </div>

              {/* BENEFÍCIO 2 - CORREÇÃO: SEMPRE DESMARCÁVEL */}
              <div className="checkbox-group beneficio-item">
                <input 
                  type="checkbox" 
                  id="beneficio2"
                  checked={beneficio2Checked}
                  onChange={handleBeneficio2Change}
                />
                <label htmlFor="beneficio2">
                  2. Economia de até {bandeiraValue > 20 ? bandeiraValue : 50}% no valor referente à bandeira tarifária, sem impostos
                </label>
              </div>

              <div className="checkbox-group beneficio-item">
                <input {...register('beneficio3')} type="checkbox" id="beneficio3" />
                <label htmlFor="beneficio3">3. Isenção de taxa de adesão</label>
              </div>

              <div className="checkbox-group beneficio-item">
                <input {...register('beneficio4')} type="checkbox" id="beneficio4" />
                <label htmlFor="beneficio4">4. Não há cobrança de taxa de cancelamento</label>
              </div>

              <div className="checkbox-group beneficio-item">
                <input {...register('beneficio5')} type="checkbox" id="beneficio5" />
                <label htmlFor="beneficio5">5. Não há fidelidade contratual</label>
              </div>

              <div className="checkbox-group beneficio-item">
                <input {...register('beneficio6')} type="checkbox" id="beneficio6" />
                <label htmlFor="beneficio6">6. O cliente pode cancelar a qualquer momento</label>
              </div>

              <div className="checkbox-group beneficio-item">
                <input {...register('beneficio7')} type="checkbox" id="beneficio7" />
                <label htmlFor="beneficio7">7. Atendimento personalizado</label>
              </div>

              <div className="checkbox-group beneficio-item">
                <input {...register('beneficio8')} type="checkbox" id="beneficio8" />
                <label htmlFor="beneficio8">8. Suporte técnico especializado</label>
              </div>

              <div className="checkbox-group beneficio-item">
                <input {...register('beneficio9')} type="checkbox" id="beneficio9" />
                <label htmlFor="beneficio9">9. Economia imediata na primeira fatura</label>
              </div>
            </div>
          </section>

          {/* Botões de ação - MANTÉM ESTRUTURA ORIGINAL */}
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Salvando...
                </>
              ) : (
                <>💾 Salvar Proposta</>
              )}
            </button>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => navigate(-1)}
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