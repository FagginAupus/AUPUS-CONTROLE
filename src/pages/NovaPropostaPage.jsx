// src/pages/NovaPropostaPage.jsx - 5 INPUTS UC EM UMA LINHA + UCs EM LINHAS SEPARADAS + BENEFÍCIOS CORRIGIDOS
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import Header from '../components/common/Header';
import Navigation from '../components/common/Navigation';
import { useNotification } from '../context/NotificationContext';
import storageService from '../services/storageService';
import './NovaPropostaPage.css';

// Schema de validação
const schema = yup.object({
  nomeCliente: yup.string().required('Nome do cliente é obrigatório'),
  celular: yup.string().required('Celular é obrigatório'),
  consultor: yup.string().required('Consultor é obrigatório'),
  economia: yup.number().min(0).max(100).required('Economia é obrigatória'),
  bandeira: yup.number().min(0).max(100).required('Economia bandeira é obrigatória'),
  recorrencia: yup.string().required('Recorrência é obrigatória'),
  ucs: yup.array().of(
    yup.object({
      distribuidora: yup.string().required('Distribuidora é obrigatória'),
      numeroUC: yup.string().required('Número da UC é obrigatório'),
      apelido: yup.string().required('Apelido é obrigatório'),
      ligacao: yup.string().required('Tipo de ligação é obrigatório'),
      consumo: yup.number().min(0).required('Consumo é obrigatório')
    })
  ).min(1, 'Pelo menos uma UC é obrigatória')
});

const NovaPropostaPage = () => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const [loading, setLoading] = useState(false);
  const [numeroProposta, setNumeroProposta] = useState('');

  const { register, handleSubmit, control, formState: { errors }, reset, watch, setValue } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      dataProposta: new Date().toISOString().split('T')[0],
      economia: 20,
      bandeira: 20,
      recorrencia: '3%',
      ucs: [
        {
          distribuidora: 'Equatorial',
          numeroUC: '',
          apelido: '',
          ligacao: 'Trifásica',
          consumo: 0
        }
      ],
      // Benefícios padrão marcados
      beneficio1: true,
      beneficio4: true,
      beneficio5: true,
      beneficio6: true,
      beneficio7: true,
      beneficio9: true
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'ucs'
  });

  // Gerar número da proposta
  const gerarNumeroProposta = async () => {
    try {
      const numero = await storageService.gerarNumeroProposta();
      setNumeroProposta(numero);
    } catch (error) {
      console.error('Erro ao gerar número:', error);
      const fallback = `${new Date().getFullYear()}/${Date.now().toString().slice(-4)}`;
      setNumeroProposta(fallback);
    }
  };

  useEffect(() => {
    gerarNumeroProposta();
  }, []);

  const adicionarUC = () => {
    append({
      distribuidora: 'Equatorial',
      numeroUC: '',
      apelido: '',
      ligacao: 'Trifásica',
      consumo: 0
    });
  };

  const removerUC = (index) => {
    if (fields.length > 1) {
      remove(index);
    } else {
      showNotification('É necessário pelo menos uma UC', 'warning');
    }
  };

  const voltar = () => {
    navigate('/prospec');
  };

  const limparFormulario = () => {
    if (window.confirm('Deseja realmente limpar o formulário?')) {
      reset();
      gerarNumeroProposta();
      showNotification('Formulário limpo com sucesso!', 'info');
    }
  };

  const onSubmit = async (data) => {
    try {
      setLoading(true);

      // Criar proposta para cada UC
      for (let i = 0; i < data.ucs.length; i++) {
        const uc = data.ucs[i];
        
        const proposta = {
          id: `${numeroProposta}-${uc.numeroUC}-${Date.now()}-${i}`,
          numeroProposta,
          data: data.dataProposta,
          nomeCliente: data.nomeCliente,
          celular: data.celular,
          consultor: data.consultor,
          recorrencia: data.recorrencia,
          descontoTarifa: data.economia / 100,
          descontoBandeira: data.bandeira / 100,
          distribuidora: uc.distribuidora,
          numeroUC: uc.numeroUC,
          apelido: uc.apelido,
          ligacao: uc.ligacao,
          media: parseInt(uc.consumo),
          telefone: data.celular,
          status: 'Aguardando',
          // Benefícios
          beneficios: {
            beneficio1: data.beneficio1,
            beneficio2: data.beneficio2,
            beneficio3: data.beneficio3,
            beneficio4: data.beneficio4,
            beneficio5: data.beneficio5,
            beneficio6: data.beneficio6,
            beneficio7: data.beneficio7,
            beneficio8: data.beneficio8,
            beneficio9: data.beneficio9
          }
        };

        await storageService.adicionarProspec(proposta);
      }

      showNotification(`Proposta ${numeroProposta} criada com sucesso!`, 'success');
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
          
          {/* INFORMAÇÕES BÁSICAS */}
          <section className="form-section">
            <h2>📋 Informações Básicas</h2>
            <div className="form-grid">
              <div className="form-group">
                <label>Número da Proposta</label>
                <input
                  type="text"
                  value={numeroProposta}
                  disabled
                  style={{ backgroundColor: '#f0f0f0' }}
                />
              </div>

              <div className="form-group">
                <label>Data da Proposta</label>
                <input {...register('dataProposta')} type="date" />
              </div>

              <div className="form-group">
                <label>Nome do Cliente *</label>
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
                <label>Celular do Cliente *</label>
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
            </div>
          </section>

          {/* CONSULTOR E ECONOMIA */}
          <section className="form-section">
            <h2>💼 Consultor e Economia</h2>
            <div className="form-grid">
              <div className="form-group">
                <label>Nome do Consultor *</label>
                <input
                  {...register('consultor')}
                  type="text"
                  placeholder="Nome do consultor responsável"
                  className={errors.consultor ? 'error' : ''}
                />
                {errors.consultor && (
                  <span className="error-message">{errors.consultor.message}</span>
                )}
              </div>

              <div className="form-group">
                <label>Recorrência do Consultor</label>
                <select {...register('recorrencia')}>
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
                <label>Economia Tarifa (%)</label>
                <input
                  {...register('economia')}
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="20"
                />
              </div>

              <div className="form-group">
                <label>Economia Bandeira (%)</label>
                <input
                  {...register('bandeira')}
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  placeholder="20"
                />
              </div>
            </div>
          </section>

          {/* UNIDADES CONSUMIDORAS */}
          <section className="form-section">
            <h2>🏢 Unidades Consumidoras</h2>
            <div className="ucs-list">
              {fields.map((field, index) => (
                <div key={field.id} className="uc-row">
                  <div className="uc-header">
                    <h3>UC {index + 1}</h3>
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removerUC(index)}
                        className="btn-remove-uc"
                      >
                        🗑️ Remover
                      </button>
                    )}
                  </div>
                  
                  <div className="uc-inputs-row">
                    <div className="form-group">
                      <label>Distribuidora</label>
                      <select {...register(`ucs.${index}.distribuidora`)}>
                        <option value="Equatorial">Equatorial</option>
                        <option value="Enel">Enel</option>
                        <option value="Cemig">Cemig</option>
                        <option value="Copel">Copel</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Número da UC</label>
                      <input
                        {...register(`ucs.${index}.numeroUC`)}
                        type="text"
                        placeholder="Ex: 12345678"
                      />
                    </div>

                    <div className="form-group">
                      <label>Apelido da UC</label>
                      <input
                        {...register(`ucs.${index}.apelido`)}
                        type="text"
                        placeholder="Ex: Loja Centro"
                      />
                    </div>

                    <div className="form-group">
                      <label>Tipo de Ligação</label>
                      <select {...register(`ucs.${index}.ligacao`)}>
                        <option value="Monofásica">Monofásica</option>
                        <option value="Bifásica">Bifásica</option>
                        <option value="Trifásica">Trifásica</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Consumo Médio (kWh)</label>
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
              className="btn-add-uc"
            >
              ➕ Adicionar UC
            </button>
          </section>

          {/* BENEFÍCIOS DA PROPOSTA - ALINHADOS À ESQUERDA COM TEXTOS CORRETOS */}
          <section className="form-section">
            <h2>🎯 Benefícios da Proposta</h2>
            <div className="beneficios-container">
              <div className="checkbox-group beneficio-item">
                <input {...register('beneficio1')} type="checkbox" id="beneficio1" />
                <label htmlFor="beneficio1">1. A Aupus Energia irá oferecer uma economia de até 20% no valor da energia elétrica, sem impostos</label>
              </div>

              <div className="checkbox-group beneficio-item">
                <input {...register('beneficio2')} type="checkbox" id="beneficio2" />
                <label htmlFor="beneficio2">2. A Aupus Energia irá oferecer uma economia de até 50% nos valor referente a bandeira tarifária, sem impostos</label>
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
                <label htmlFor="beneficio8">8. Energia 100% renovável</label>
              </div>

              <div className="checkbox-group beneficio-item">
                <input {...register('beneficio9')} type="checkbox" id="beneficio9" />
                <label htmlFor="beneficio9">9. Economia imediata na primeira fatura</label>
              </div>
            </div>
          </section>

          {/* Botões de ação */}
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? '⏳ Salvando...' : '💾 Salvar Proposta'}
            </button>
            
            <button type="button" onClick={voltar} className="btn btn-secondary">
              ← Voltar
            </button>
            
            <button type="button" onClick={limparFormulario} className="btn btn-secondary">
              🗑️ Limpar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NovaPropostaPage;