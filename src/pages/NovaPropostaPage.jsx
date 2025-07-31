// src/pages/NovaPropostaPage.jsx - Corrigida com seleção de consultores baseada em roles
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import Header from '../components/common/Header';
import Navigation from '../components/common/Navigation';
import { useNotification } from '../context/NotificationContext';
import { useAuth } from '../context/AuthContext';
import storageService from '../services/storageService';
import './NovaPropostaPage.css';

// Schema de validação
const schema = yup.object({
  dataProposta: yup.date().required('Data é obrigatória'),
  nomeCliente: yup.string().required('Nome do cliente é obrigatório'),
  celular: yup.string().required('Celular é obrigatório'),
  consultor: yup.string().required('Consultor é obrigatório'),
  recorrencia: yup.string().required('Recorrência é obrigatória'),
  economia: yup.number().min(0).max(100).required('Economia tarifa é obrigatória'),
  bandeira: yup.number().min(0).max(100).required('Economia bandeira é obrigatória'),
  ucs: yup.array().of(
    yup.object({
      distribuidora: yup.string().required('Distribuidora é obrigatória'),
      numeroUC: yup.string().required('Número da UC é obrigatório'),
      apelido: yup.string().required('Apelido é obrigatório'),
      ligacao: yup.string().required('Tipo de ligação é obrigatório'),
      consumo: yup.number().min(1).required('Consumo é obrigatório')
    })
  ).min(1, 'Pelo menos uma UC é obrigatória')
});

const NovaPropostaPage = () => {
  const navigate = useNavigate();
  const { showNotification } = useNotification();
  const { user, getMyTeam } = useAuth();
  
  const [numeroProposta, setNumeroProposta] = useState('');
  const [loading, setLoading] = useState(false);
  const [consultoresDisponiveis, setConsultoresDisponiveis] = useState([]);

  const { 
    register, 
    control, 
    handleSubmit, 
    formState: { errors }, 
    reset, 
    watch,
    setValue
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      dataProposta: new Date().toISOString().split('T')[0],
      recorrencia: '3%',
      economia: 20,
      bandeira: 20,
      ucs: [{ distribuidora: '', numeroUC: '', apelido: '', ligacao: '', consumo: '' }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'ucs'
  });

  // Carregar consultores disponíveis baseado no role do usuário
  useEffect(() => {
    carregarConsultoresDisponiveis();
    gerarNumeroProposta();
  }, [user]);

  const carregarConsultoresDisponiveis = () => {
    if (!user) return;

    let opcoes = [];

    switch (user.role) {
      case 'admin':
        // Admin vê apenas consultores ou "sem consultor" (AUPUS)
        const todosUsuarios = JSON.parse(localStorage.getItem('aupus_users') || '[]');
        const consultores = todosUsuarios.filter(u => u.role === 'consultor');
        opcoes = [
          { value: 'AUPUS', label: 'Sem consultor (AUPUS)' },
          ...consultores.map(c => ({ value: c.name, label: c.name }))
        ];
        break;

      case 'consultor':
        // Consultor vê ele mesmo, seus gerentes e vendedores
        const equipeConsultor = getMyTeam();
        opcoes = [
          { value: user.name, label: `${user.name} (Você)` },
          ...equipeConsultor
            .filter(m => ['gerente', 'vendedor'].includes(m.role))
            .map(m => ({ value: m.name, label: `${m.name} (${getRoleLabel(m.role)})` }))
        ];
        break;

      case 'gerente':
        // Gerente vê seus vendedores ou ele próprio
        const equipeGerente = getMyTeam();
        opcoes = [
          { value: user.name, label: `${user.name} (Você)` },
          ...equipeGerente
            .filter(m => m.role === 'vendedor')
            .map(m => ({ value: m.name, label: `${m.name} (Vendedor)` }))
        ];
        break;

      case 'vendedor':
        // Vendedor fica ele mesmo, automaticamente
        opcoes = [{ value: user.name, label: `${user.name} (Você)` }];
        // Definir automaticamente o vendedor
        setValue('consultor', user.name);
        break;

      default:
        opcoes = [{ value: 'AUPUS', label: 'Sem consultor (AUPUS)' }];
    }

    setConsultoresDisponiveis(opcoes);
  };

  const getRoleLabel = (role) => {
    const labels = {
      admin: 'Administrador',
      consultor: 'Consultor',
      gerente: 'Gerente',
      vendedor: 'Vendedor'
    };
    return labels[role] || role;
  };

  const gerarNumeroProposta = async () => {
    try {
      const numero = await storageService.gerarNumeroProposta();
      setNumeroProposta(numero);
    } catch (error) {
      console.error('Erro ao gerar número da proposta:', error);
      const ano = new Date().getFullYear();
      const timestamp = Date.now().toString().slice(-4);
      setNumeroProposta(`${ano}/${timestamp}`);
    }
  };

  const adicionarUC = () => {
    append({ distribuidora: '', numeroUC: '', apelido: '', ligacao: '', consumo: '' });
  };

  const removerUC = (index) => {
    if (fields.length > 1) {
      remove(index);
    } else {
      showNotification('Deve haver pelo menos uma UC', 'error');
    }
  };

  const limparFormulario = () => {
    if (window.confirm('Deseja limpar todos os dados do formulário?')) {
      reset({
        dataProposta: new Date().toISOString().split('T')[0],
        recorrencia: '3%',
        economia: 20,
        bandeira: 20,
        ucs: [{ distribuidora: '', numeroUC: '', apelido: '', ligacao: '', consumo: '' }]
      });
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
            beneficio1: data.beneficio1 || false,
            beneficio2: data.beneficio2 || false,
            beneficio3: data.beneficio3 || false,
            beneficio4: data.beneficio4 || false,
            beneficio5: data.beneficio5 || false,
            beneficio6: data.beneficio6 || false,
            beneficio7: data.beneficio7 || false,
            beneficio8: data.beneficio8 || false,
            beneficio9: data.beneficio9 || false
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
                <input 
                  {...register('dataProposta')} 
                  type="date" 
                  className={errors.dataProposta ? 'error' : ''}
                />
                {errors.dataProposta && (
                  <span className="error-message">{errors.dataProposta.message}</span>
                )}
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
                <label>Consultor Responsável *</label>
                <select
                  {...register('consultor')}
                  className={errors.consultor ? 'error' : ''}
                  disabled={user?.role === 'vendedor'} // Vendedor não pode alterar
                >
                  <option value="">Selecione um consultor</option>
                  {consultoresDisponiveis.map(consultor => (
                    <option key={consultor.value} value={consultor.value}>
                      {consultor.label}
                    </option>
                  ))}
                </select>
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
                  className={errors.economia ? 'error' : ''}
                />
                {errors.economia && (
                  <span className="error-message">{errors.economia.message}</span>
                )}
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
                  className={errors.bandeira ? 'error' : ''}
                />
                {errors.bandeira && (
                  <span className="error-message">{errors.bandeira.message}</span>
                )}
              </div>
            </div>
          </section>

          {/* UNIDADES CONSUMIDORAS */}
          <section className="form-section">
            <h2>🏢 Unidades Consumidoras</h2>
            <div className="ucs-header">
              <p>Adicione as unidades consumidoras da proposta</p>
              <button
                type="button"
                onClick={adicionarUC}
                className="btn btn-primary"
              >
                ➕ Adicionar UC
              </button>
            </div>

            {fields.map((field, index) => (
              <div key={field.id} className="uc-card">
                <div className="uc-header">
                  <h3>UC {index + 1}</h3>
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removerUC(index)}
                      className="btn btn-danger btn-small"
                    >
                      🗑️ Remover
                    </button>
                  )}
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label>Distribuidora *</label>
                    <select 
                      {...register(`ucs.${index}.distribuidora`)}
                      className={errors.ucs?.[index]?.distribuidora ? 'error' : ''}
                    >
                      <option value="">Selecione a distribuidora</option>
                      <option value="CELG">CELG-D (Goiás)</option>
                      <option value="CEMIG">CEMIG (Minas Gerais)</option>
                      <option value="COPEL">COPEL (Paraná)</option>
                      <option value="CPFL">CPFL (São Paulo)</option>
                      <option value="LIGHT">LIGHT (Rio de Janeiro)</option>
                      <option value="COELBA">COELBA (Bahia)</option>
                      <option value="COELCE">COELCE (Ceará)</option>
                      <option value="CELPE">CELPE (Pernambuco)</option>
                      <option value="ENERGISA">ENERGISA</option>
                      <option value="ENEL">ENEL</option>
                      <option value="EQUATORIAL">EQUATORIAL</option>
                      <option value="OUTRAS">Outras</option>
                    </select>
                    {errors.ucs?.[index]?.distribuidora && (
                      <span className="error-message">{errors.ucs[index].distribuidora.message}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Número da UC *</label>
                    <input
                      {...register(`ucs.${index}.numeroUC`)}
                      type="text"
                      placeholder="Ex: 123456789"
                      className={errors.ucs?.[index]?.numeroUC ? 'error' : ''}
                    />
                    {errors.ucs?.[index]?.numeroUC && (
                      <span className="error-message">{errors.ucs[index].numeroUC.message}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Apelido da UC *</label>
                    <input
                      {...register(`ucs.${index}.apelido`)}
                      type="text"
                      placeholder="Ex: Matriz, Filial 1, etc."
                      className={errors.ucs?.[index]?.apelido ? 'error' : ''}
                    />
                    {errors.ucs?.[index]?.apelido && (
                      <span className="error-message">{errors.ucs[index].apelido.message}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Tipo de Ligação *</label>
                    <select 
                      {...register(`ucs.${index}.ligacao`)}
                      className={errors.ucs?.[index]?.ligacao ? 'error' : ''}
                    >
                      <option value="">Selecione o tipo</option>
                      <option value="Monofásico">Monofásico</option>
                      <option value="Bifásico">Bifásico</option>
                      <option value="Trifásico">Trifásico</option>
                    </select>
                    {errors.ucs?.[index]?.ligacao && (
                      <span className="error-message">{errors.ucs[index].ligacao.message}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label>Consumo Médio (kWh) *</label>
                    <input
                      {...register(`ucs.${index}.consumo`)}
                      type="number"
                      min="1"
                      placeholder="Ex: 500"
                      className={errors.ucs?.[index]?.consumo ? 'error' : ''}
                    />
                    {errors.ucs?.[index]?.consumo && (
                      <span className="error-message">{errors.ucs[index].consumo.message}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </section>

          {/* BENEFÍCIOS EXTRAS */}
          <section className="form-section">
            <h2>🎁 Benefícios Inclusos</h2>
            <div className="beneficios-grid">
              <label className="checkbox-item">
                <input {...register('beneficio1')} type="checkbox" />
                <span>1. Economia de até 20% na conta de energia</span>
              </label>
              
              <label className="checkbox-item">
                <input {...register('beneficio2')} type="checkbox" />
                <span>2. Redução de R$ 50,00 nos custos de bandeira</span>
              </label>
              
              <label className="checkbox-item">
                <input {...register('beneficio3')} type="checkbox" />
                <span>3. Acompanhamento mensal do consumo</span>
              </label>
              
              <label className="checkbox-item">
                <input {...register('beneficio4')} type="checkbox" />
                <span>4. Suporte técnico 24/7</span>
              </label>
              
              <label className="checkbox-item">
                <input {...register('beneficio5')} type="checkbox" />
                <span>5. Relatórios de economia detalhados</span>
              </label>
              
              <label className="checkbox-item">
                <input {...register('beneficio6')} type="checkbox" />
                <span>6. Migração sem custos</span>
              </label>
              
              <label className="checkbox-item">
                <input {...register('beneficio7')} type="checkbox" />
                <span>7. Energia 100% renovável</span>
              </label>
              
              <label className="checkbox-item">
                <input {...register('beneficio8')} type="checkbox" />
                <span>8. Sem taxa de adesão</span>
              </label>
              
              <label className="checkbox-item">
                <input {...register('beneficio9')} type="checkbox" />
                <span>9. Cancelamento sem multa</span>
              </label>
            </div>
          </section>

          {/* BOTÕES DE AÇÃO */}
          <div className="form-actions">
            <button
              type="button"
              onClick={limparFormulario}
              className="btn btn-secondary"
              disabled={loading}
            >
              🗑️ Limpar
            </button>
            
            <button
              type="button"
              onClick={() => navigate('/prospec')}
              className="btn btn-secondary"
              disabled={loading}
            >
              ❌ Cancelar
            </button>
            
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading}
            >
              {loading ? '💾 Salvando...' : '💾 Salvar Proposta'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NovaPropostaPage;