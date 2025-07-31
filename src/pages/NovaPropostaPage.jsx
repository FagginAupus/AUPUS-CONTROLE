// NovaPropostaPage.jsx - CORRIGIDA com lógica de consultor baseada no role
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
  const [semConsultor, setSemConsultor] = useState(false);
  const [beneficiosAdicionais, setBeneficiosAdicionais] = useState([]);
  const [consultoresDisponiveis, setConsultoresDisponiveis] = useState([]);

  const { register, control, handleSubmit, watch, setValue, reset, formState: { errors } } = useForm({
    defaultValues: {
      dataProposta: new Date().toISOString().split('T')[0],
      consultor: '',
      recorrencia: '0%', // Padrão 0%
      economia: 20,
      bandeira: 20,
      ucs: [{ distribuidora: '', numeroUC: '', apelido: '', ligacao: '', consumo: '' }],
      // Benefícios padrão (todos marcados inicialmente)
      beneficio1: true,
      beneficio2: true,
      beneficio3: true,
      beneficio4: true,
      beneficio5: true,
      beneficio6: true,
      beneficio7: true,
      beneficio8: true
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'ucs'
  });

  const watchSemConsultor = watch('semConsultor');
  const watchRecorrencia = watch('recorrencia');

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

  // Carregar consultores disponíveis baseado no role do usuário
  const carregarConsultoresDisponiveis = () => {
    const team = getMyTeam();
    let consultores = [];

    switch (user?.role) {
      case 'admin':
        // Admin vê todos os consultores cadastrados + opção AUPUS
        consultores = team.filter(member => member.role === 'consultor');
        break;
      
      case 'consultor':
        // Consultor vê ele mesmo, gerentes dele e vendedores dele
        consultores = team.filter(member => 
          member.role === 'consultor' || 
          member.role === 'gerente' || 
          member.role === 'vendedor'
        );
        break;
      
      case 'gerente':
        // Gerente vê ele mesmo e os vendedores dele
        consultores = team.filter(member => 
          member.role === 'gerente' || 
          member.role === 'vendedor'
        );
        break;
      
      case 'vendedor':
        // Vendedor só vê ele mesmo (fixo)
        consultores = team.filter(member => member.id === user.id);
        break;
      
      default:
        consultores = [];
    }

    setConsultoresDisponiveis(consultores);

    // Se é vendedor, fixar o nome dele
    if (user?.role === 'vendedor' && consultores.length > 0) {
      setValue('consultor', consultores[0].name);
    }
  };

  useEffect(() => {
    gerarNumeroProposta();
    carregarConsultoresDisponiveis();
  }, []);

  // Handle sem consultor - RECORRÊNCIA AUTOMÁTICA 0% (apenas para admin)
  useEffect(() => {
    if (watchSemConsultor && user?.role === 'admin') {
      setValue('consultor', 'AUPUS');
      setValue('recorrencia', '0%'); // AUTOMÁTICO 0%
    } else if (!watchSemConsultor) {
      setValue('consultor', '');
      setValue('recorrencia', '3%');
    }
  }, [watchSemConsultor, setValue, user?.role]);

  const limparFormulario = () => {
    if (window.confirm('Deseja limpar todos os dados do formulário?')) {
      reset({
        dataProposta: new Date().toISOString().split('T')[0],
        recorrencia: '0%', // Padrão 0%
        economia: 20,
        bandeira: 20,
        ucs: [{ distribuidora: '', numeroUC: '', apelido: '', ligacao: '', consumo: '' }],
        // Benefícios padrão (todos marcados)
        beneficio1: true,
        beneficio2: true,
        beneficio3: true,
        beneficio4: true,
        beneficio5: true,
        beneficio6: true,
        beneficio7: true,
        beneficio8: true
      });
      setSemConsultor(false);
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
      setSemConsultor(false);
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
        <Header 
          title="NOVA PROPOSTA" 
          subtitle={`Proposta Nº ${numeroProposta}`} 
          icon="📝" 
        />
        
        <Navigation />

        <style jsx>{`
          .form-grid-4-cols {
            display: grid !important;
            grid-template-columns: 200px 160px 1fr 180px !important;
            gap: 15px !important;
            align-items: start !important;
            width: 100% !important;
            margin-bottom: 20px !important;
          }
          
          .form-grid-4-cols .form-group {
            width: 100% !important;
            min-width: 0 !important;
          }
          
          .form-grid-4-cols .form-group input,
          .form-grid-4-cols .form-group select {
            width: 100% !important;
            box-sizing: border-box !important;
            min-width: 0 !important;
          }
          
          .checkbox-group-inline {
            margin-top: 8px !important;
            position: relative !important;
            white-space: nowrap !important;
          }
          
          @media (max-width: 1000px) {
            .form-grid-4-cols {
              grid-template-columns: 180px 140px 1fr 160px !important;
              gap: 12px !important;
            }
          }
          
          @media (max-width: 768px) {
            .form-grid-4-cols {
              grid-template-columns: 1fr !important;
              gap: 15px !important;
            }
          }
        `}</style>

        <form onSubmit={handleSubmit(onSubmit)} className="nova-proposta-form">
          {/* INFORMAÇÕES BÁSICAS - TUDO JUNTO */}
          <section className="form-section">
            <h2>📋 Informações Básicas</h2>
            
            {/* Primeira linha: Número, Data, Nome, Celular - FORÇAR 4 COLUNAS */}
            <div className="form-grid-4-cols">
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

            {/* Segunda linha: Consultor, Recorrência, Economia Tarifa, Economia Bandeira - FORÇAR 4 COLUNAS */}
            <div className="form-grid-4-cols">
              <div className="form-group">
                <label>Nome do Consultor *</label>
                {user?.role === 'vendedor' ? (
                  // Para vendedor, campo fixo
                  <input
                    type="text"
                    value={user.name}
                    disabled
                    style={{ backgroundColor: '#f0f0f0' }}
                  />
                ) : (
                  // Para outros roles, select com opções apropriadas
                  <select
                    {...register('consultor', { required: 'Consultor é obrigatório' })}
                    disabled={semConsultor}
                    style={{ backgroundColor: semConsultor ? '#f0f0f0' : '#ffffff' }}
                    className={errors.consultor ? 'error' : ''}
                  >
                    <option value="">Selecione o consultor...</option>
                    {consultoresDisponiveis.map(consultor => (
                      <option key={consultor.id} value={consultor.name}>
                        {consultor.name} ({consultor.role})
                      </option>
                    ))}
                  </select>
                )}
                {errors.consultor && <span className="error-message">{errors.consultor.message}</span>}
                
                {/* Checkbox AUPUS apenas para admin - ABAIXO do campo consultor */}
                {user?.role === 'admin' && (
                  <div className="checkbox-group-inline" style={{ marginTop: '8px' }}>
                    <input 
                      type="checkbox" 
                      id="semConsultor" 
                      checked={semConsultor}
                      onChange={(e) => setSemConsultor(e.target.checked)}
                    />
                    <label htmlFor="semConsultor">Sem consultor (AUPUS direto)</label>
                  </div>
                )}
              </div>
              
              <div className="form-group">
                <label>Recorrência do Consultor</label>
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
              
              <div className="form-group">
                <label>Economia Tarifa (%)</label>
                <input 
                  {...register('economia', { min: 0, max: 100 })} 
                  type="number" 
                  step="0.1" 
                  min="0" 
                  max="100"
                />
              </div>
              
              <div className="form-group">
                <label>Economia Bandeira (%)</label>
                <input 
                  {...register('bandeira', { min: 0, max: 100 })} 
                  type="number" 
                  step="0.1" 
                  min="0" 
                  max="100"
                />
              </div>
            </div>
          </section>

          {/* UNIDADES CONSUMIDORAS - LAYOUT MELHORADO */}
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
                        ❌ Remover
                      </button>
                    )}
                  </div>
                  
                  {/* 5 INPUTS EM UMA LINHA - LAYOUT CORRIGIDO */}
                  <div className="uc-inputs-row">
                    <div className="form-group">
                      <label>Distribuidora</label>
                      <select {...register(`ucs.${index}.distribuidora`)}>
                        <option value="">Selecione...</option>
                        <option value="Equatorial">Equatorial</option>
                        <option value="ENEL">ENEL</option>
                        <option value="CEMIG">CEMIG</option>
                        <option value="CPFL">CPFL</option>
                        <option value="Light">Light</option>
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label>Número UC</label>
                      <input
                        {...register(`ucs.${index}.numeroUC`)}
                        type="text"
                        placeholder="12345678"
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Apelido</label>
                      <input
                        {...register(`ucs.${index}.apelido`)}
                        type="text"
                        placeholder="Casa Principal"
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
                      <label>Consumo (kWh)</label>
                      <input
                        {...register(`ucs.${index}.consumo`)}
                        type="number"
                        placeholder="500"
                        min="0"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* BOTÃO ADICIONAR UC ABAIXO DOS INPUTS */}
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

          {/* INFORMAÇÕES IMPORTANTES (BENEFÍCIOS) - MELHORADO */}
          <section className="form-section">
            <h2>ℹ️ Informações Importantes</h2>
            
            <div className="beneficios-grid">
              <div className="beneficio-item">
                <input {...register('beneficio1')} type="checkbox" id="beneficio1" />
                <label htmlFor="beneficio1">Os benefícios econômicos foram calculados com base nas tarifas de energia, sem impostos</label>
              </div>
              
              <div className="beneficio-item">
                <input {...register('beneficio2')} type="checkbox" id="beneficio2" />
                <label htmlFor="beneficio2">A titularidade da fatura será transferida para o Consórcio Clube Aupus</label>
              </div>
              
              <div className="beneficio-item">
                <input {...register('beneficio3')} type="checkbox" id="beneficio3" />
                <label htmlFor="beneficio3">A Aupus Energia fornecerá consultoria energética para o condomínio</label>
              </div>
              
              <div className="beneficio-item">
                <input {...register('beneficio4')} type="checkbox" id="beneficio4" />
                <label htmlFor="beneficio4">Todo o processo será conduzido pela Aupus Energia, não se preocupe</label>
              </div>
              
              <div className="beneficio-item">
                <input {...register('beneficio5')} type="checkbox" id="beneficio5" />
                <label htmlFor="beneficio5">Você irá pagar DOIS boletos, sendo um boleto mínimo para Equatorial e o outro sendo Aluguel da Usina para Aupus Energia</label>
              </div>
              
              <div className="beneficio-item">
                <input {...register('beneficio6')} type="checkbox" id="beneficio6" />
                <label htmlFor="beneficio6">Contamos com uma moderna plataforma para te oferecer uma experiência única!</label>
              </div>
              
              <div className="beneficio-item">
                <input {...register('beneficio7')} type="checkbox" id="beneficio7" />
                <label htmlFor="beneficio7">A proposta se aplica para todos os condôminos que tiverem interesse</label>
              </div>
              
              <div className="beneficio-item">
                <input {...register('beneficio8')} type="checkbox" id="beneficio8" />
                <label htmlFor="beneficio8">Não há fidelidade contratual - o cliente pode cancelar a qualquer momento</label>
              </div>
            </div>

            {/* BENEFÍCIOS ADICIONAIS */}
            {beneficiosAdicionais.length > 0 && (
              <div className="beneficios-adicionais">
                <h3>Benefícios Adicionais</h3>
                
                {beneficiosAdicionais.map((beneficio, index) => (
                  <div key={index} className="beneficio-adicional">
                    <input
                      type="text"
                      value={beneficio}
                      onChange={(e) => atualizarBeneficioAdicional(index, e.target.value)}
                      placeholder="Digite um benefício adicional..."
                    />
                    <button
                      type="button"
                      onClick={() => removerBeneficioAdicional(index)}
                      className="btn-remove-beneficio"
                    >
                      ❌
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            <button
              type="button"
              onClick={adicionarBeneficioAdicional}
              className="btn btn-secondary"
            >
              ➕ Adicionar Benefício
            </button>
          </section>

          {/* AÇÕES */}
          <div className="form-actions">
            <button 
              type="submit" 
              disabled={loading} 
              className="btn btn-primary"
            >
              {loading ? '⏳ Salvando...' : '💾 Salvar Proposta'}
            </button>
            
            <button 
              type="button" 
              onClick={limparFormulario} 
              className="btn btn-secondary"
            >
              🗑️ Limpar Formulário
            </button>
            
            <button 
              type="button" 
              onClick={() => navigate('/prospec')} 
              className="btn btn-secondary"
            >
              ⬅️ Voltar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NovaPropostaPage;