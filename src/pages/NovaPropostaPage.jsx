// src/pages/NovaPropostaPage.jsx - CORRIGIDO COMPLETO
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import Header from '../components/common/Header';
import Navigation from '../components/common/Navigation';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import storageService from '../services/storageService';
import './NovaPropostaPage.css';

const NovaPropostaPage = () => {
  const navigate = useNavigate();
  const { user, getMyTeam } = useAuth();
  const { showNotification } = useNotification();
  const [loading, setLoading] = useState(false);
  const [numeroProposta, setNumeroProposta] = useState('');
  const [beneficiosAdicionais, setBeneficiosAdicionais] = useState([]);
  const [consultoresDisponiveis, setConsultoresDisponiveis] = useState([]);

  const { register, control, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm({
    defaultValues: {
      dataProposta: new Date().toISOString().split('T')[0],
      consultor: '',
      recorrencia: '3%',
      economia: 20,
      bandeira: 20,
      ucs: [{ distribuidora: '', numeroUC: '', apelido: '', ligacao: '', consumo: '' }],
      // Benefícios padrão
      beneficio1: false,
      beneficio2: false,
      beneficio3: false,
      beneficio4: false,
      beneficio5: false,
      beneficio6: false,
      beneficio7: false,
      beneficio8: false
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'ucs'
  });

  const watchConsultor = watch('consultor');

  // Carregar consultores disponíveis
  const carregarConsultores = useCallback(() => {
    try {
      const team = getMyTeam();
      
      if (user?.role === 'admin') {
        const consultores = team.filter(member => member.role === 'consultor').map(member => member.name);
        setConsultoresDisponiveis([...consultores, 'Sem consultor (AUPUS direto)']);
      } else if (user?.role === 'consultor') {
        const consultorNome = user.name;
        const funcionarios = team.filter(member => 
          member.role === 'gerente' || member.role === 'vendedor'
        ).map(member => member.name);
        setConsultoresDisponiveis([consultorNome, ...funcionarios]);
      } else if (user?.role === 'gerente') {
        const gerenteNome = user.name;
        const vendedores = team.filter(member => 
          member.role === 'vendedor'
        ).map(member => member.name);
        setConsultoresDisponiveis([gerenteNome, ...vendedores]);
      } else if (user?.role === 'vendedor') {
        setConsultoresDisponiveis([user.name]);
        setValue('consultor', user.name);
      }
    } catch (error) {
      console.error('Erro ao carregar consultores:', error);
      setConsultoresDisponiveis([user?.name || 'Erro']);
    }
  }, [getMyTeam, user, setValue]);

  // Gerar número da proposta
  const gerarNumeroProposta = async () => {
    try {
      const dados = await storageService.getProspec();
      const ano = new Date().getFullYear();
      const proximoNumero = dados.length + 1;
      const numero = `${ano}/${proximoNumero.toString().padStart(3, '0')}`;
      setNumeroProposta(numero);
    } catch (error) {
      console.error('Erro ao gerar número:', error);
      const timestamp = Date.now().toString().slice(-4);
      setNumeroProposta(`${new Date().getFullYear()}/${timestamp}`);
    }
  };

  useEffect(() => {
    gerarNumeroProposta();
    carregarConsultores();
  }, [carregarConsultores]);

  // Handle consultor change
  useEffect(() => {
    if (watchConsultor === 'Sem consultor (AUPUS direto)') {
      setValue('recorrencia', '0%');
    } else if (watchConsultor && watchConsultor !== 'Sem consultor (AUPUS direto)') {
      setValue('recorrencia', '3%');
    }
  }, [watchConsultor, setValue]);

  const limparFormulario = () => {
    if (window.confirm('Deseja limpar todos os dados do formulário?')) {
      reset({
        dataProposta: new Date().toISOString().split('T')[0],
        consultor: '',
        recorrencia: '3%',
        economia: 20,
        bandeira: 20,
        ucs: [{ distribuidora: '', numeroUC: '', apelido: '', ligacao: '', consumo: '' }],
        beneficio1: false,
        beneficio2: false,
        beneficio3: false,
        beneficio4: false,
        beneficio5: false,
        beneficio6: false,
        beneficio7: false,
        beneficio8: false
      });
      setBeneficiosAdicionais([]);
      gerarNumeroProposta();
      showNotification('Formulário limpo com sucesso!', 'info');
    }
  };

  const adicionarBeneficioAdicional = () => {
    setBeneficiosAdicionais([...beneficiosAdicionais, '']);
  };

  const atualizarBeneficioAdicional = (index, valor) => {
    const novos = [...beneficiosAdicionais];
    novos[index] = valor;
    setBeneficiosAdicionais(novos);
  };

  const removerBeneficioAdicional = (index) => {
    setBeneficiosAdicionais(beneficiosAdicionais.filter((_, i) => i !== index));
  };

  // FUNÇÃO PRINCIPAL - COMPLETA E CORRIGIDA
  const onSubmit = async (data) => {
    try {
      setLoading(true);

      // Ajustar nome do consultor
      let consultorFinal = data.consultor;
      if (data.consultor === 'Sem consultor (AUPUS direto)') {
        consultorFinal = 'AUPUS';
      }

      // Preparar benefícios como array
      const beneficiosArray = [];
      if (data.beneficio1) beneficiosArray.push('Sem custo de adesão');
      if (data.beneficio2) beneficiosArray.push('Sem fidelidade');
      if (data.beneficio3) beneficiosArray.push('Energia 100% renovável');
      if (data.beneficio4) beneficiosArray.push('Suporte técnico especializado');
      if (data.beneficio5) beneficiosArray.push('Portal do cliente');
      if (data.beneficio6) beneficiosArray.push('Relatórios mensais');
      if (data.beneficio7) beneficiosArray.push('Compensação garantida');
      if (data.beneficio8) beneficiosArray.push('Desconto na bandeira tarifária');
      
      // Adicionar benefícios extras
      beneficiosAdicionais.forEach(beneficio => {
        if (beneficio.trim()) {
          beneficiosArray.push(beneficio.trim());
        }
      });

      // Preparar unidades consumidoras no formato esperado pelo backend
      const unidadesConsumidoras = data.ucs.map(uc => ({
        numero_unidade: parseInt(uc.numeroUC),
        apelido: uc.apelido || `UC ${uc.numeroUC}`,
        ligacao: uc.ligacao || '',
        consumo_medio: parseInt(uc.consumo) || 0,
        distribuidora: uc.distribuidora || ''
      }));

      // ESTRUTURA CORRETA PARA O BACKEND - SEM telefone, email, endereco
      const propostaParaBackend = {
        nomeCliente: data.nomeCliente,
        consultor: consultorFinal,
        dataProposta: data.dataProposta,
        numeroProposta: numeroProposta,
        // REMOVIDOS: telefone, email, endereco
        status: 'Aguardando',
        economia: data.economia || 0,
        bandeira: data.bandeira || 0,
        recorrencia: data.recorrencia,
        beneficiosAdicionais: beneficiosArray, // Usar beneficiosAdicionais para compatibilidade
        unidadesConsumidoras: unidadesConsumidoras.length > 0 ? unidadesConsumidoras : [],
        observacoes: `Proposta criada via sistema web. ${data.observacoes || ''}`.trim()
      };

      console.log('📤 Enviando proposta para o backend (SEM telefone/email/endereco):', propostaParaBackend);

      // Tentar salvar via API
      const result = await storageService.adicionarProspec(propostaParaBackend);

      console.log('✅ Proposta salva com sucesso:', result);
      
      showNotification(`Proposta ${numeroProposta} criada com sucesso!`, 'success');
      
      // Limpar formulário e navegar
      reset();
      setBeneficiosAdicionais([]);
      await gerarNumeroProposta();
      navigate('/prospec');

    } catch (error) {
      console.error('❌ Erro ao salvar proposta:', error);
      
      // Determinar mensagem de erro baseada no tipo de erro
      let errorMessage = 'Erro inesperado ao salvar proposta';
      
      if (error.message) {
        // Verificar tipos específicos de erro
        if (error.message.includes('Call to undefined method')) {
          errorMessage = 'Erro no servidor: Problema de configuração do backend Laravel';
        } else if (error.message.includes('500')) {
          errorMessage = 'Erro interno do servidor: Verifique se o backend está funcionando';
        } else if (error.message.includes('404')) {
          errorMessage = 'Rota não encontrada: Verifique se a API está configurada corretamente';
        } else if (error.message.includes('Network Error') || error.message.includes('fetch')) {
          errorMessage = 'Erro de conexão: Verifique sua internet e se o servidor está rodando';
        } else if (error.message.includes('401')) {
          errorMessage = 'Não autorizado: Faça login novamente';
        } else if (error.message.includes('403')) {
          errorMessage = 'Sem permissão para executar esta ação';
        } else if (error.message.includes('422')) {
          errorMessage = 'Dados inválidos: Verifique os campos obrigatórios';
        } else {
          errorMessage = `Erro: ${error.message}`;
        }
      }
      
      showNotification(errorMessage, 'error');
      
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
            
            {/* Primeira linha */}
            <div className="form-grid-uniform">
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
                <input 
                  {...register('dataProposta')} 
                  type="date" 
                  className={errors.dataProposta ? 'error' : ''}
                />
              </div>

              <div className="form-group">
                <label>Nome do Cliente *</label>
                <input 
                  {...register('nomeCliente', { required: 'Nome é obrigatório' })} 
                  type="text" 
                  placeholder="Nome completo do cliente"
                  className={errors.nomeCliente ? 'error' : ''}
                />
                {errors.nomeCliente && <span className="error-message">{errors.nomeCliente.message}</span>}
              </div>

              <div className="form-group">
                <label>Celular do Cliente *</label>
                <input 
                  {...register('celular', { required: 'Celular é obrigatório' })} 
                  type="tel" 
                  placeholder="(62) 99999-9999"
                  className={errors.celular ? 'error' : ''}
                />
                {errors.celular && <span className="error-message">{errors.celular.message}</span>}
              </div>
            </div>

            {/* Segunda linha */}
            <div className="form-grid-uniform">
              <div className="form-group">
                <label>Nome do Consultor *</label>
                {user?.role === 'vendedor' ? (
                  <input
                    type="text"
                    value={user.name}
                    disabled
                    style={{ backgroundColor: '#f0f0f0' }}
                  />
                ) : (
                  <select 
                    {...register('consultor', { required: 'Consultor é obrigatório' })}
                    className={errors.consultor ? 'error' : ''}
                  >
                    <option value="">Selecione o consultor...</option>
                    {consultoresDisponiveis.map(consultor => (
                      <option key={consultor} value={consultor}>
                        {consultor}
                      </option>
                    ))}
                  </select>
                )}
                {errors.consultor && <span className="error-message">{errors.consultor.message}</span>}
              </div>

              <div className="form-group">
                <label>Recorrência</label>
                <input 
                  {...register('recorrencia')} 
                  type="text" 
                  style={{ backgroundColor: watchConsultor === 'Sem consultor (AUPUS direto)' ? '#f0f0f0' : 'white' }}
                  readOnly={watchConsultor === 'Sem consultor (AUPUS direto)'}
                />
              </div>

              <div className="form-group">
                <label>Desconto Tarifa (%)</label>
                <input 
                  {...register('economia', { 
                    required: 'Campo obrigatório',
                    min: { value: 0, message: 'Valor mínimo 0' },
                    max: { value: 100, message: 'Valor máximo 100' }
                  })}
                  type="number" 
                  step="0.01"
                  min="0" 
                  max="100"
                  className={errors.economia ? 'error' : ''}
                />
                {errors.economia && <span className="error-message">{errors.economia.message}</span>}
              </div>

              <div className="form-group">
                <label>Desconto Bandeira (%)</label>
                <input 
                  {...register('bandeira', { 
                    required: 'Campo obrigatório',
                    min: { value: 0, message: 'Valor mínimo 0' },
                    max: { value: 100, message: 'Valor máximo 100' }
                  })}
                  type="number" 
                  step="0.01"
                  min="0" 
                  max="100"
                  className={errors.bandeira ? 'error' : ''}
                />
                {errors.bandeira && <span className="error-message">{errors.bandeira.message}</span>}
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
                    <h3>Unidade {index + 1}</h3>
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="btn-remove-uc"
                      >
                        ❌ Remover
                      </button>
                    )}
                  </div>

                  <div className="uc-inputs-row">
                    <div className="form-group">
                      <label>Distribuidora</label>
                      <select {...register(`ucs.${index}.distribuidora`)}>
                        <option value="">Selecione...</option>
                        <option value="ENEL GO">ENEL GO</option>
                        <option value="EQUATORIAL GO">EQUATORIAL GO</option>
                        <option value="NEOENERGIA">NEOENERGIA</option>
                        <option value="CEMIG">CEMIG</option>
                        <option value="CPFL">CPFL</option>
                        <option value="LIGHT">LIGHT</option>
                        <option value="OUTRAS">OUTRAS</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Número UC</label>
                      <input 
                        {...register(`ucs.${index}.numeroUC`)} 
                        type="text" 
                        placeholder="Ex: 123456789"
                      />
                    </div>

                    <div className="form-group">
                      <label>Apelido</label>
                      <input 
                        {...register(`ucs.${index}.apelido`)} 
                        type="text" 
                        placeholder="Ex: Casa, Loja..."
                      />
                    </div>

                    <div className="form-group">
                      <label>Ligação</label>
                      <select {...register(`ucs.${index}.ligacao`)}>
                        <option value="">Selecione...</option>
                        <option value="MONOFÁSICA">MONOFÁSICA</option>
                        <option value="BIFÁSICA">BIFÁSICA</option>
                        <option value="TRIFÁSICA">TRIFÁSICA</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Consumo (kWh)</label>
                      <input 
                        {...register(`ucs.${index}.consumo`)} 
                        type="number" 
                        min="0"
                        placeholder="Ex: 500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => append({ distribuidora: '', numeroUC: '', apelido: '', ligacao: '', consumo: '' })}
              className="btn btn-secondary"
            >
              + Adicionar Unidade Consumidora
            </button>
          </section>

          {/* BENEFÍCIOS */}
          <section className="form-section">
            <h2>💰 Benefícios Inclusos</h2>
            
            <div className="beneficios-grid">
              <div className="beneficio-item">
                <input 
                  {...register('beneficio1')} 
                  type="checkbox" 
                  id="beneficio1"
                />
                <label htmlFor="beneficio1">Sem custo de adesão</label>
              </div>

              <div className="beneficio-item">
                <input 
                  {...register('beneficio2')} 
                  type="checkbox" 
                  id="beneficio2"
                />
                <label htmlFor="beneficio2">Sem fidelidade</label>
              </div>

              <div className="beneficio-item">
                <input 
                  {...register('beneficio3')} 
                  type="checkbox" 
                  id="beneficio3"
                />
                <label htmlFor="beneficio3">Energia 100% renovável</label>
              </div>

              <div className="beneficio-item">
                <input 
                  {...register('beneficio4')} 
                  type="checkbox" 
                  id="beneficio4"
                />
                <label htmlFor="beneficio4">Suporte técnico especializado</label>
              </div>

              <div className="beneficio-item">
                <input 
                  {...register('beneficio5')} 
                  type="checkbox" 
                  id="beneficio5"
                />
                <label htmlFor="beneficio5">Portal do cliente</label>
              </div>

              <div className="beneficio-item">
                <input 
                  {...register('beneficio6')} 
                  type="checkbox" 
                  id="beneficio6"
                />
                <label htmlFor="beneficio6">Relatórios mensais</label>
              </div>

              <div className="beneficio-item">
                <input 
                  {...register('beneficio7')} 
                  type="checkbox" 
                  id="beneficio7"
                />
                <label htmlFor="beneficio7">Compensação garantida</label>
              </div>

              <div className="beneficio-item">
                <input 
                  {...register('beneficio8')} 
                  type="checkbox" 
                  id="beneficio8"
                />
                <label htmlFor="beneficio8">Desconto na bandeira tarifária</label>
              </div>
            </div>

            {/* Benefícios Adicionais */}
            <div className="beneficios-adicionais">
              <h3>Benefícios Extras</h3>
              
              {beneficiosAdicionais.map((beneficio, index) => (
                <div key={index} className="beneficio-adicional">
                  <input
                    type="text"
                    value={beneficio}
                    onChange={(e) => atualizarBeneficioAdicional(index, e.target.value)}
                    placeholder="Digite o benefício adicional"
                  />
                  <button
                    type="button"
                    onClick={() => removerBeneficioAdicional(index)}
                    className="btn-remove"
                  >
                    ❌
                  </button>
                </div>
              ))}

              <button
                type="button"
                onClick={adicionarBeneficioAdicional}
                className="btn btn-secondary"
              >
                + Adicionar Benefício Extra
              </button>
            </div>
          </section>

          {/* BOTÕES DE AÇÃO */}
          <section className="form-actions">
            <div className="actions-container">
              <button
                type="button"
                onClick={limparFormulario}
                className="btn btn-secondary"
                disabled={loading}
              >
                🧹 Limpar Formulário
              </button>

              <div className="primary-actions">
                <button
                  type="button"
                  onClick={() => navigate('/prospec')}
                  className="btn btn-outline"
                  disabled={loading}
                >
                  ← Voltar
                </button>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="loading-spinner">⏳</span>
                      Salvando...
                    </>
                  ) : (
                    <>
                      💾 Salvar Proposta
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>
        </form>

        {/* Loading Overlay */}
        {loading && (
          <div className="loading-overlay">
            <div className="loading-content">
              <div className="loading-spinner">⏳</div>
              <p>Salvando proposta...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NovaPropostaPage;