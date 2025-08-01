// NovaPropostaPage.jsx - CORRIGIDO
import React, { useState, useEffect } from 'react';
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
      // Benefícios padrão (todos desmarcados inicialmente)
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

  // Carregar consultores disponíveis baseado no role
  const carregarConsultores = () => {
    try {
      const team = getMyTeam();
      
      if (user?.role === 'admin') {
        // Admin vê todos os consultores + sem consultor
        const consultores = team.filter(member => member.role === 'consultor').map(member => member.name);
        setConsultoresDisponiveis([...consultores, 'Sem consultor (AUPUS direto)']);
        
      } else if (user?.role === 'consultor') {
        // Consultor vê ele mesmo + seus funcionários diretos e indiretos
        const consultorNome = user.name;
        const funcionarios = team.filter(member => 
          member.role === 'gerente' || member.role === 'vendedor'
        ).map(member => member.name);
        setConsultoresDisponiveis([consultorNome, ...funcionarios]);
        
      } else if (user?.role === 'gerente') {
        // Gerente vê ele mesmo + seus vendedores diretos
        const gerenteNome = user.name;
        const vendedores = team.filter(member => 
          member.role === 'vendedor'
        ).map(member => member.name);
        setConsultoresDisponiveis([gerenteNome, ...vendedores]);
        
      } else if (user?.role === 'vendedor') {
        // Vendedor vê apenas ele mesmo
        setConsultoresDisponiveis([user.name]);
        setValue('consultor', user.name); // Pré-selecionar automaticamente
      }
    } catch (error) {
      console.error('Erro ao carregar consultores:', error);
      setConsultoresDisponiveis([user?.name || 'Erro']);
    }
  };

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
  }, []);

  // Handle consultor change - LÓGICA CORRIGIDA
  useEffect(() => {
    if (watchConsultor === 'Sem consultor (AUPUS direto)') {
      setValue('recorrencia', '0%'); // AUTOMÁTICO 0%
    } else if (watchConsultor && watchConsultor !== 'Sem consultor (AUPUS direto)') {
      setValue('recorrencia', '3%'); // Voltar para 3% quando selecionar consultor
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
        ucs: [{ distribuidora: '', numeroUC: '', apelido: '', ligacao: '', consumo: '' }]
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

  const onSubmit = async (data) => {
    try {
      setLoading(true);

      // Criar proposta para cada UC
      for (let i = 0; i < data.ucs.length; i++) {
        const uc = data.ucs[i];
        
        // Ajustar nome do consultor
        let consultorFinal = data.consultor;
        if (data.consultor === 'Sem consultor (AUPUS direto)') {
          consultorFinal = 'AUPUS';
        }
        
        const proposta = {
          id: `${numeroProposta}-${uc.numeroUC}-${Date.now()}-${i}`,
          numeroProposta,
          data: data.dataProposta,
          nomeCliente: data.nomeCliente,
          celular: data.celular,
          consultor: consultorFinal,
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
            beneficio1: data.beneficio1 || false,
            beneficio2: data.beneficio2 || false,
            beneficio3: data.beneficio3 || false,
            beneficio4: data.beneficio4 || false,
            beneficio5: data.beneficio5 || false,
            beneficio6: data.beneficio6 || false,
            beneficio7: data.beneficio7 || false,
            beneficio8: data.beneficio8 || false
          },
          beneficiosAdicionais: beneficiosAdicionais.filter(b => b.trim())
        };

        await storageService.adicionarProspec(proposta);
      }

      showNotification(`Proposta ${numeroProposta} criada com sucesso!`, 'success');
      reset();
      setBeneficiosAdicionais([]);
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
          
          {/* INFORMAÇÕES BÁSICAS - LAYOUT CORRIGIDO */}
          <section className="form-section">
            <h2>📋 Informações Básicas</h2>
            
            {/* Primeira linha - 4 campos uniformes */}
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

            {/* Segunda linha - Consultor e Configurações baseado no role */}
            <div className="form-grid-uniform">
              <div className="form-group">
                <label>Nome do Consultor *</label>
                {user?.role === 'vendedor' ? (
                  // Vendedor: Input desabilitado com o próprio nome
                  <input
                    type="text"
                    value={user.name}
                    disabled
                    style={{ backgroundColor: '#f0f0f0' }}
                  />
                ) : (
                  // Outros roles: Select com opções baseadas nas regras
                  <select 
                    {...register('consultor', { required: 'Consultor é obrigatório' })} 
                    className={errors.consultor ? 'error' : ''}
                  >
                    <option value="">Selecione um consultor...</option>
                    {consultoresDisponiveis.map((consultor, index) => (
                      <option key={index} value={consultor}>
                        {consultor}
                      </option>
                    ))}
                  </select>
                )}
                {errors.consultor && <span className="error-message">{errors.consultor.message}</span>}
              </div>
              
              {/* Recorrência: Visível apenas para Admin e Consultor */}
              {(user?.role === 'admin' || user?.role === 'consultor') && (
                <div className="form-group">
                  <label>Recorrência do Consultor</label>
                  <select 
                    {...register('recorrencia')} 
                    disabled={watchConsultor === 'Sem consultor (AUPUS direto)'}
                    style={{ 
                      backgroundColor: watchConsultor === 'Sem consultor (AUPUS direto)' ? '#f0f0f0' : '#ffffff',
                      cursor: watchConsultor === 'Sem consultor (AUPUS direto)' ? 'not-allowed' : 'pointer'
                    }}
                  >
                    <option value="0%">0%</option>
                    <option value="3%">3%</option>
                    <option value="5%">5%</option>
                    <option value="7%">7%</option>
                    <option value="10%">10%</option>
                  </select>
                </div>
              )}

              <div className="form-group">
                <label>Economia Tarifa (%)</label>
                <input 
                  {...register('economia', { min: 0, max: 100 })} 
                  type="number" 
                  step="0.1"
                  placeholder="20"
                />
              </div>

              <div className="form-group">
                <label>Economia Bandeira (%)</label>
                <input 
                  {...register('bandeira', { min: 0, max: 100 })} 
                  type="number"
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
                        onClick={() => remove(index)}
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
                        <option value="">Selecione...</option>
                        <option value="ENEL GO">ENEL GO</option>
                        <option value="ENEL CE">ENEL CE</option>
                        <option value="ENERGISA">ENERGISA</option>
                        <option value="EQUATORIAL">EQUATORIAL</option>
                        <option value="CEMIG">CEMIG</option>
                        <option value="COPEL">COPEL</option>
                        <option value="CELPE">CELPE</option>
                        <option value="COELBA">COELBA</option>
                        <option value="LIGHT">LIGHT</option>
                        <option value="CPFL">CPFL</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Número UC</label>
                      <input 
                        {...register(`ucs.${index}.numeroUC`)} 
                        type="text" 
                        placeholder="Ex: 12345678"
                      />
                    </div>

                    <div className="form-group">
                      <label>Apelido UC</label>
                      <input 
                        {...register(`ucs.${index}.apelido`)} 
                        type="text" 
                        placeholder="Nome familiar"
                      />
                    </div>

                    <div className="form-group">
                      <label>Ligação</label>
                      <select {...register(`ucs.${index}.ligacao`)}>
                        <option value="">Selecione...</option>
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
                        placeholder="Ex: 350"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="uc-actions">
              <button
                type="button"
                onClick={() => append({ distribuidora: '', numeroUC: '', apelido: '', ligacao: '', consumo: '' })}
                className="btn btn-secondary"
              >
                ➕ Adicionar UC
              </button>
            </div>
          </section>

          {/* BENEFÍCIOS */}
          <section className="form-section">
            <h2>🎁 Benefícios Inclusos</h2>
            
            <div className="beneficios-grid">
              <div className="beneficio-item">
                <input 
                  {...register('beneficio1')} 
                  type="checkbox" 
                  id="beneficio1"
                  defaultChecked
                />
                <label htmlFor="beneficio1">
                  Isenção de taxa de adesão
                </label>
              </div>

              <div className="beneficio-item">
                <input 
                  {...register('beneficio2')} 
                  type="checkbox" 
                  id="beneficio2"
                  defaultChecked
                />
                <label htmlFor="beneficio2">
                  Não há cobrança de taxa de cancelamento
                </label>
              </div>

              <div className="beneficio-item">
                <input 
                  {...register('beneficio3')} 
                  type="checkbox" 
                  id="beneficio3"
                  defaultChecked
                />
                <label htmlFor="beneficio3">
                  Não há fidelidade contratual
                </label>
              </div>

              <div className="beneficio-item">
                <input 
                  {...register('beneficio4')} 
                  type="checkbox" 
                  id="beneficio4"
                  defaultChecked
                />
                <label htmlFor="beneficio4">
                  O cliente pode cancelar a qualquer momento
                </label>
              </div>

              <div className="beneficio-item">
                <input 
                  {...register('beneficio5')} 
                  type="checkbox" 
                  id="beneficio5"
                  defaultChecked
                />
                <label htmlFor="beneficio5">
                  Suporte técnico especializado
                </label>
              </div>

              <div className="beneficio-item">
                <input 
                  {...register('beneficio6')} 
                  type="checkbox" 
                  id="beneficio6"
                  defaultChecked
                />
                <label htmlFor="beneficio6">
                  Monitoramento 24/7 do sistema
                </label>
              </div>

              <div className="beneficio-item">
                <input 
                  {...register('beneficio7')} 
                  type="checkbox" 
                  id="beneficio7"
                  defaultChecked
                />
                <label htmlFor="beneficio7">
                  Relatórios mensais de economia
                </label>
              </div>

              <div className="beneficio-item">
                <input 
                  {...register('beneficio8')} 
                  type="checkbox" 
                  id="beneficio8"
                  defaultChecked
                />
                <label htmlFor="beneficio8">
                  Desconto direto na conta de energia
                </label>
              </div>
            </div>

            {/* Benefícios Adicionais */}
            <div className="beneficios-adicionais">
              <h3>Benefícios Personalizados</h3>
              
              {beneficiosAdicionais.map((beneficio, index) => (
                <div key={index} className="beneficio-adicional">
                  <input
                    type="text"
                    value={beneficio}
                    onChange={(e) => atualizarBeneficioAdicional(index, e.target.value)}
                    placeholder="Digite um benefício personalizado..."
                  />
                  <button
                    type="button"
                    onClick={() => removerBeneficioAdicional(index)}
                    className="btn btn-danger btn-sm"
                  >
                    🗑️
                  </button>
                </div>
              ))}
              
              <button
                type="button"
                onClick={adicionarBeneficioAdicional}
                className="btn btn-secondary btn-sm"
              >
                ➕ Adicionar Benefício
              </button>
            </div>
          </section>

          {/* AÇÕES DO FORMULÁRIO */}
          <div className="form-actions">
            <button
              type="button"
              onClick={limparFormulario}
              className="btn btn-secondary"
              disabled={loading}
            >
              🗑️ Limpar Formulário
            </button>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? '⏳ Salvando...' : '💾 Salvar Proposta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NovaPropostaPage;