// src/pages/NovaPropostaPage.jsx - LAYOUT REORGANIZADO CONFORME SOLICITADO
import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
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
      // Benefícios padrão marcados
      beneficio1: true,
      beneficio2: true,
      beneficio3: true,
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

  const semConsultor = watch('semConsultor');
  const economiaValue = watch('economia');
  const bandeiraValue = watch('bandeira');

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

  const gerarNumeroProposta = async () => {
    try {
      let tentativas = 0;
      while (!window.aupusStorage && tentativas < 30) {
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

  // Adicionar nova UC
  const adicionarUC = () => {
    append({
      distribuidora: 'Equatorial',
      numeroUC: '',
      apelido: '',
      ligacao: 'Monofásica',
      consumo: ''
    });
  };

  // Remover UC (manter sempre pelo menos uma)
  const removerUC = (index) => {
    if (fields.length > 1) {
      remove(index);
    } else {
      showNotification('Deve haver pelo menos uma UC', 'warning');
    }
  };

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      
      // Coletar dados do formulário
      const dadosCompletos = {
        nomeCliente: data.nomeCliente,
        numeroProposta: numeroProposta,
        data: data.dataProposta,
        celular: data.celular,
        consultor: data.semConsultor ? 'AUPUS' : data.consultor,
        recorrencia: data.semConsultor ? '0%' : data.recorrencia,
        descontoTarifa: data.economia / 100, // Converter para decimal
        descontoBandeira: data.bandeira / 100, // Converter para decimal
        status: 'Aguardando', // SEMPRE AGUARDANDO
        
        // UCs dinâmicas
        ucs: data.ucs.map((uc, index) => ({
          distribuidora: uc.distribuidora || 'Equatorial',
          numeroUC: uc.numeroUC || '',
          apelido: uc.apelido || `UC ${index + 1}`,
          ligacao: uc.ligacao || 'Monofásica',
          consumo: parseFloat(uc.consumo) || 0
        })),
        
        // Coletar benefícios selecionados
        beneficios: [
          ...(data.beneficio1 ? [{ numero: 1, texto: `Economia de até ${data.economia}% na tarifa de energia elétrica, sem impostos` }] : []),
          ...(data.beneficio2 ? [{ numero: 2, texto: `Economia de até ${data.bandeira}% no valor referente à bandeira tarifária, sem impostos` }] : []),
          ...(data.beneficio3 ? [{ numero: 3, texto: 'Isenção de taxa de adesão' }] : []),
          ...(data.beneficio4 ? [{ numero: 4, texto: 'Não há cobrança de taxa de cancelamento' }] : []),
          ...(data.beneficio5 ? [{ numero: 5, texto: 'Não há fidelidade contratual' }] : []),
          ...(data.beneficio6 ? [{ numero: 6, texto: 'O cliente pode cancelar a qualquer momento' }] : []),
          ...(data.beneficio7 ? [{ numero: 7, texto: 'Atendimento personalizado' }] : []),
          ...(data.beneficio8 ? [{ numero: 8, texto: 'Suporte técnico especializado' }] : []),
          ...(data.beneficio9 ? [{ numero: 9, texto: 'Economia imediata na primeira fatura' }] : []),
          ...(data.beneficioPersonalizado ? [{ numero: 10, texto: data.beneficioPersonalizado }] : [])
        ]
      };

      // 1. Salvar dados no storage (PROSPEC)
      showNotification('💾 Salvando proposta...', 'info');
      
      // Aguardar storage
      let tentativas = 0;
      while (!window.aupusStorage && tentativas < 30) {
        await new Promise(resolve => setTimeout(resolve, 100));
        tentativas++;
      }

      if (window.aupusStorage) {
        // Salvar cada UC como uma linha separada no PROSPEC
        for (const uc of dadosCompletos.ucs) {
          const proposta = {
            nomeCliente: dadosCompletos.nomeCliente,
            numeroProposta: dadosCompletos.numeroProposta,
            data: dadosCompletos.data,
            apelido: uc.apelido,
            numeroUC: uc.numeroUC,
            descontoTarifa: dadosCompletos.descontoTarifa,
            descontoBandeira: dadosCompletos.descontoBandeira,
            ligacao: uc.ligacao,
            consultor: dadosCompletos.consultor,
            recorrencia: dadosCompletos.recorrencia,
            media: uc.consumo,
            telefone: dadosCompletos.celular,
            status: dadosCompletos.status
          };
          
          await window.aupusStorage.adicionarProspec(proposta);
        }
      }

      showNotification('✅ Proposta salva com sucesso!', 'success');

      // 2. GERAR PDF AUTOMATICAMENTE
      try {
        console.log('📄 Gerando PDF da proposta automaticamente...');
        showNotification('📄 Gerando PDF da proposta...', 'info');
        
        // Usar serviço PDF reutilizável
        const resultado = await PDFGenerator.baixarPDF(dadosCompletos, true); // true = auto download
        showNotification(`📄✅ PDF baixado automaticamente: ${resultado.nomeArquivo}`, 'success');
        
      } catch (pdfError) {
        console.error('❌ Erro ao gerar PDF automaticamente:', pdfError);
        showNotification('⚠️ Proposta salva com sucesso, mas erro ao gerar PDF: ' + pdfError.message, 'warning');
        showNotification('💡 Você pode baixar o PDF manualmente na página PROSPEC', 'info');
      }
      
      // 3. Aguardar um pouco e redirecionar para PROSPEC
      setTimeout(() => {
        window.location.href = '/prospec';
      }, 2000);
      
    } catch (error) {
      console.error('❌ Erro ao salvar proposta:', error);
      showNotification('Erro ao salvar proposta: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const limparFormulario = () => {
    if (window.confirm('Deseja limpar todos os dados do formulário?')) {
      reset();
      gerarNumeroProposta();
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

          {/* CONSULTOR E ECONOMIA EM UMA LINHA HORIZONTAL */}
          <section className="form-section">
            <h2>Consultor e Economia</h2>
            
            {/* Checkbox Sem Consultor */}
            <div className="checkbox-group sem-consultor">
              <input
                {...register('semConsultor')}
                type="checkbox"
                id="semConsultor"
              />
              <label htmlFor="semConsultor">
                Sem consultor (Recorrência automática: 0%)
              </label>
            </div>

            {/* Grid horizontal para consultor e economia */}
            <div className="form-grid horizontal-split">
              {/* Coluna Consultor */}
              <div className="form-column">
                <h3>👤 Consultor</h3>
                {!semConsultor && (
                  <>
                    <div className="form-group">
                      <label htmlFor="consultor">Nome do Consultor *</label>
                      <input
                        {...register('consultor')}
                        type="text"
                        id="consultor"
                        className={errors.consultor ? 'error' : ''}
                      />
                      {errors.consultor && <span className="error-message">{errors.consultor.message}</span>}
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="recorrencia">Recorrência</label>
                      <select {...register('recorrencia')} id="recorrencia">
                        <option value="3%">3%</option>
                        <option value="5%">5%</option>
                        <option value="7%">7%</option>
                        <option value="10%">10%</option>
                      </select>
                    </div>
                  </>
                )}
                {semConsultor && (
                  <div style={{ padding: '20px', background: '#f8f9fa', borderRadius: '8px', textAlign: 'center', color: '#666' }}>
                    Consultor: AUPUS<br/>
                    Recorrência: 0%
                  </div>
                )}
              </div>

              {/* Coluna Economia */}
              <div className="form-column">
                <h3>💰 Economia</h3>
                <div className="form-group">
                  <label htmlFor="economia">Economia Tarifa (%) *</label>
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
                  <label htmlFor="bandeira">Economia Bandeira (%) *</label>
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
              </div>
            </div>
          </section>

          {/* UCs Dinâmicas */}
          <section className="form-section uc-section">
            <h2>Unidades Consumidoras</h2>
            
            {fields.map((field, index) => (
              <div key={field.id} className="uc-card">
                <div className="uc-header">
                  <h3>⚡ UC {index + 1}</h3>
                  {fields.length > 1 && (
                    <button
                      type="button"
                      className="btn-remove-uc"
                      onClick={() => removerUC(index)}
                      title="Remover UC"
                    >
                      ❌
                    </button>
                  )}
                </div>
                
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor={`ucs.${index}.distribuidora`}>Distribuidora</label>
                    <select {...register(`ucs.${index}.distribuidora`)} id={`ucs.${index}.distribuidora`}>
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
                      id={`ucs.${index}.numeroUC`}
                      placeholder="Ex: 12345678"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor={`ucs.${index}.apelido`}>Apelido da UC</label>
                    <input
                      {...register(`ucs.${index}.apelido`)}
                      type="text"
                      id={`ucs.${index}.apelido`}
                      placeholder="Ex: Casa Principal"
                    />
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor={`ucs.${index}.ligacao`}>Tipo de Ligação</label>
                    <select {...register(`ucs.${index}.ligacao`)} id={`ucs.${index}.ligacao`}>
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
                      id={`ucs.${index}.consumo`}
                      min="0"
                      step="0.01"
                      placeholder="Ex: 350"
                    />
                  </div>
                </div>
              </div>
            ))}

            {/* Botão Adicionar UC */}
            <div className="add-uc-container">
              <button
                type="button"
                className="btn btn-secondary add-uc-btn"
                onClick={adicionarUC}
              >
                ➕ Adicionar UC
              </button>
            </div>
          </section>

          {/* Benefícios */}
          <section className="form-section beneficios-section">
            <h2>Benefícios da Proposta</h2>
            <div className="beneficios-grid">
              <div className="checkbox-group beneficio-item">
                <input {...register('beneficio1')} type="checkbox" id="beneficio1" />
                <label htmlFor="beneficio1">
                  1. Economia de até {economiaValue}% na tarifa de energia elétrica, sem impostos
                </label>
              </div>

              <div className="checkbox-group beneficio-item">
                <input {...register('beneficio2')} type="checkbox" id="beneficio2" />
                <label htmlFor="beneficio2">
                  2. Economia de até {bandeiraValue}% no valor referente à bandeira tarifária, sem impostos
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

            {/* Benefício Personalizado - ALINHADO À ESQUERDA */}
            <div className="form-group beneficio-personalizado">
              <label htmlFor="beneficioPersonalizado">Benefício Personalizado</label>
              <textarea
                {...register('beneficioPersonalizado')}
                id="beneficioPersonalizado"
                placeholder="Digite um benefício adicional..."
                rows="3"
              />
            </div>
          </section>

          {/* Botões */}
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