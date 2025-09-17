// src/context/DataContext.jsx - Context centralizado SIMPLIFICADO (sem loops)
import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from './AuthContext';
import { useNotification } from './NotificationContext';
import apiService from '../services/apiService';

const DataContext = createContext();

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData deve ser usado dentro de DataProvider');
  }
  return context;
};

export const DataProvider = ({ children }) => {
  const { user } = useAuth();
  const { showNotification } = useNotification();
  
  // Ref para controlar se já foi inicializado
  const initializedRef = useRef(false);
  const loadingRef = useRef(false);
  const lastLoadTimestamp = useRef({});

  // ========================================
  // ESTADOS DOS DADOS
  // ========================================

  const [propostas, setPropostas] = useState({
    data: [],
    page: 1,
    lastPage: 1,
    perPage: 50,
    total: 0,
    hasMore: true,
    loading: false,
    error: null,
    filters: {
      consultor: '',
      status: '',
      busca: '',
      dataInicio: '',
      dataFim: ''
    }
  });

  const [controle, setControle] = useState({
    data: [],
    page: 1,
    lastPage: 1,
    perPage: 'all',
    total: 0,
    hasMore: true,
    loading: false,
    error: null,
    filters: {
      consultor: '',
      ug: '',
      busca: ''
    }
  });

  const [ugs, setUgs] = useState({
    data: [],
    loading: false,
    error: null,
    filters: {
      busca: ''
    }
  });

  const [dashboard, setDashboard] = useState({
    statistics: {
      totalPropostas: 0,
      aguardando: 0,
      fechadas: 0,
      propostasValidas: 0,    // ✅ NOVO
      canceladas: 0,          // ✅ NOVO
      totalControle: 0,
      totalUGs: 0,
      statusTroca: {
        esteira: 0,      
        emAndamento: 0,
        associado: 0    
      }
    },
    loading: false,
    error: null,
    lastUpdated: 0
  });

  // Cache timestamps para invalidação
  const [cacheTimestamps, setCacheTimestamps] = useState({
    propostas: 0,
    controle: 0,
    ugs: 0,
    dashboard: 0
  });

  // ========================================
  // FUNÇÃO PARA CALCULAR ESTATÍSTICAS
  // ========================================

  const updateDashboardStats = useCallback((propostasData, controleData, ugsData) => {
    // Usar dados passados como parâmetro ou usar os estados atuais
    const currentPropostas = propostasData || propostas.data;
    const currentControle = controleData || controle.data;
    const currentUgs = ugsData || ugs.data;

    // Calcular status da troca de titularidade
    const statusTroca = {
      esteira: currentControle.filter(item => {
        const status = item.status_troca || item.statusTroca || 'Esteira';
        return status === 'Esteira';
      }).length,
      
      emAndamento: currentControle.filter(item => {
        const status = item.status_troca || item.statusTroca || 'Esteira';
        return status === 'Em andamento'; // ✅ CORRETO: 'Em andamento' (com 'E' maiúsculo)
      }).length,
      
      associado: currentControle.filter(item => {
        const status = item.status_troca || item.statusTroca || 'Esteira';
        return status === 'Associado';
      }).length
    };

    // Debug: Mostrar distribuição de status
    const statusDistribution = currentControle.reduce((acc, item) => {
      const status = item.status_troca || item.statusTroca || 'Esteira';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});
    

    const canceladas = currentPropostas.filter(p => p.status === 'Cancelada').length;
    const propostasValidas = currentPropostas.length - canceladas;
    
    const stats = {
      totalPropostas: currentPropostas.length,
      aguardando: currentPropostas.filter(p => p.status === 'Aguardando').length,
      fechadas: currentPropostas.filter(p => p.status === 'Fechada').length,
      propostasValidas: propostasValidas,
      canceladas: canceladas,
      totalControle: currentControle.length,
      totalUGs: currentUgs.length,
      statusTroca // ✅ Status corrigidos
    };

    setDashboard(prev => ({
      ...prev,
      statistics: stats,
      lastUpdated: Date.now()
    }));

    console.log('✅ Estatísticas atualizadas:', stats);
  }, [propostas.data, controle.data, ugs.data]);

  // ========================================
  // FUNÇÕES DE CARREGAMENTO - PROPOSTAS
  // ========================================

  const loadPropostas = useCallback(async (page = 1, filters = {}, forceReload = false) => {
    if (!user?.id) return;

    const cacheTimeout = 60000; // 1 minuto
    const now = Date.now();
    const isExpired = (now - cacheTimestamps.propostas) > cacheTimeout;

    if (!forceReload && !isExpired && propostas.data.length > 0 && page === 1) {
      console.log('📋 Usando cache de propostas');
      return;
    }

    try {
      setPropostas(prev => ({ ...prev, loading: true, error: null }));
      console.log(`📡 Carregando propostas - Página ${page} - Role: ${user.role}`);

      const params = {
        page,
        per_page: propostas.perPage,
        ...filters
      };

      const response = await apiService.getPropostas(params);

      if (response?.success && response?.data) {
        const newData = page === 1 ? response.data : [...propostas.data, ...response.data];

        setPropostas(prev => ({
          ...prev,
          data: newData,
          page: response.current_page || page,
          lastPage: response.last_page || 1,
          total: response.total || response.data.length,
          hasMore: (response.current_page || page) < (response.last_page || 1),
          loading: false,
          error: null,
          filters: filters
        }));

        setCacheTimestamps(prev => ({
          ...prev,
          propostas: now
        }));

        console.log(`✅ ${response.data.length} propostas carregadas`);
        
        // Atualizar estatísticas após carregar - passar os novos dados
        setTimeout(() => updateDashboardStats(newData), 100);
      }

    } catch (error) {
      console.error('❌ Erro ao carregar propostas:', error);
      setPropostas(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Erro ao carregar propostas'
      }));
      showNotification('Erro ao carregar propostas: ' + error.message, 'error');
    }
  }, [user?.id, user?.role, propostas.perPage, showNotification, cacheTimestamps.propostas, updateDashboardStats]);

  // ========================================
  // FUNÇÕES DE CARREGAMENTO - CONTROLE
  // ========================================

  const loadControle = useCallback(async (page = 1, filters = {}, forceReload = false) => {
    if (!user?.id) return;

    const cacheTimeout = 60000;
    const now = Date.now();
    const isExpired = (now - cacheTimestamps.controle) > cacheTimeout;

    if (!forceReload && !isExpired && controle.data.length > 0 && page === 1) {
      console.log('📋 Usando cache de controle');
      return;
    }

    try {
      setControle(prev => ({ ...prev, loading: true, error: null }));
      console.log(`📡 Carregando controle - Página ${page} - Role: ${user.role}`);

      const params = {
        page,
        per_page: controle.perPage,
        ...filters
      };

      const response = await apiService.getControle(params);

      if (response?.success && response?.data) {
        const newData = page === 1 ? response.data : [...controle.data, ...response.data];

        setControle(prev => ({
          ...prev,
          data: newData,
          page: response.current_page || page,
          lastPage: response.last_page || 1,
          total: response.total || response.data.length,
          hasMore: (response.current_page || page) < (response.last_page || 1),
          loading: false,
          error: null,
          filters: filters
        }));

        setCacheTimestamps(prev => ({
          ...prev,
          controle: now
        }));

        console.log(`✅ ${response.data.length} controles carregados`);
        
        // Atualizar estatísticas após carregar - passar os novos dados
        setTimeout(() => updateDashboardStats(null, newData), 100);
      }

    } catch (error) {
      console.error('❌ Erro ao carregar controle:', error);
      setControle(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Erro ao carregar controle'
      }));
      showNotification('Erro ao carregar controle: ' + error.message, 'error');
    }
  }, [user?.id, user?.role, controle.perPage, showNotification, cacheTimestamps.controle, updateDashboardStats]);

  // Adicione junto com os outros estados
  const [calibragem, setCalibragem] = useState({
    valor: 0,
    loading: false,
    error: null,
    lastLoaded: 0
  });

  // Adicione esta função de carregamento
  const loadCalibragem = useCallback(async (forceReload = false) => {
    if (!user?.id || user.role !== 'admin') return;

    const cacheTimeout = 300000; // 5 minutos
    const now = Date.now();
    const isExpired = (now - calibragem.lastLoaded) > cacheTimeout;

    if (!forceReload && !isExpired && calibragem.valor !== null) {
      console.log('📐 Usando calibragem do cache');
      return calibragem.valor;
    }

    try {
      setCalibragem(prev => ({ ...prev, loading: true, error: null }));
      
      const response = await apiService.get('/configuracoes/calibragem-global/value');
      
      if (response?.success && response?.valor !== undefined) {
        const valor = parseFloat(response.valor) || 0;
        setCalibragem({
          valor,
          loading: false,
          error: null,
          lastLoaded: now
        });
        console.log('✅ Calibragem carregada com sucesso:', valor);
        return valor;
      } else {
        setCalibragem(prev => ({ 
          ...prev, 
          valor: 0, 
          loading: false, 
          lastLoaded: now 
        }));
        return 0;
      }
    } catch (error) {
      console.error('❌ Erro ao carregar calibragem:', error);
      setCalibragem(prev => ({ 
        ...prev, 
        loading: false, 
        error: error.message,
        valor: 0,
        lastLoaded: now 
      }));
      return 0;
    }
  }, [user?.id, user?.role, calibragem.lastLoaded, calibragem.valor]);

  // ========================================
  // FUNÇÕES DE CARREGAMENTO - UGS
  // ========================================
  
  const loadUgs = useCallback(async (filters = {}, forceReload = false) => {
    console.log('📡 Carregando UGs - Role:', user?.role);
    // ADICIONAR ESTAS LINHAS:
    const now = Date.now();
    const lastLoad = lastLoadTimestamp.current['ugs'] || 0;
    
    if (!forceReload && (now - lastLoad) < 1000) {
      console.log('⏳ UGs - Debounce ativo, ignorando chamada');
      return;
    }
    
    if (ugs.loading) {
      console.log('⏳ UGs - Já carregando, ignorando');
      return;
    }

    lastLoadTimestamp.current['ugs'] = now;
    
    if (!user?.id || user.role !== 'admin') {
      console.log('⚠️ UGs disponíveis apenas para admin');
      return;
    }

    const cacheTimeout = 120000;
    const isExpired = (now - cacheTimestamps.ugs) > cacheTimeout;

    if (!forceReload && !isExpired && ugs.data.length > 0) {
      console.log('📋 Usando cache de UGs');
      return;
    }

    try {
      setUgs(prev => ({ ...prev, loading: true, error: null }));
      console.log(`📡 Carregando UGs - Role: ${user.role}`);

      const response = await apiService.getUGs(filters);

      if (response?.success && response?.data) {
        setUgs(prev => ({
          ...prev,
          data: response.data,
          loading: false,
          error: null,
          filters: filters
        }));

        setCacheTimestamps(prev => ({
          ...prev,
          ugs: now
        }));

        console.log(`✅ ${response.data.length} UGs carregadas`);
        
        // Atualizar estatísticas após carregar - passar os novos dados
        setTimeout(() => updateDashboardStats(null, null, response.data), 100);
      }

    } catch (error) {
      console.error('❌ Erro ao carregar UGs:', error);
      setUgs(prev => ({
        ...prev,
        loading: false,
        error: error.message || 'Erro ao carregar UGs'
      }));
      showNotification('Erro ao carregar UGs: ' + error.message, 'error');
    }
  }, [user?.id, user?.role, cacheTimestamps.ugs, showNotification, updateDashboardStats]);

  // ========================================
  // FUNÇÃO DE CARREGAMENTO DO DASHBOARD
  // ========================================

  const loadDashboard = useCallback(async (forceReload = false) => {
    if (!user?.id) return;

    console.log('📊 Carregando dashboard...');
    setDashboard(prev => ({ ...prev, loading: true }));
    
    updateDashboardStats();
    
    setDashboard(prev => ({ ...prev, loading: false }));
    return dashboard.statistics;
  }, [user?.id, updateDashboardStats, dashboard.statistics]);

  // ========================================
  // FUNÇÕES DE INVALIDAÇÃO
  // ========================================

  const invalidateCache = useCallback((type) => {
    console.log(`🗑️ Invalidando cache: ${type}`);
    setCacheTimestamps(prev => ({ ...prev, [type]: 0 }));
  }, []);

  const invalidateAll = useCallback(() => {
    console.log('🗑️ Invalidando todos os caches');
    setCacheTimestamps({
      propostas: 0,
      controle: 0,
      ugs: 0,
      dashboard: 0
    });
  }, []);

  // ========================================
  // FUNÇÕES PARA CRUD
  // ========================================

  const afterCreateProposta = useCallback(() => {
    invalidateCache('propostas');
    invalidateCache('dashboard');
  }, [invalidateCache]);

  const afterUpdateProposta = useCallback(() => {
    invalidateCache('propostas');
    invalidateCache('dashboard');
  }, [invalidateCache]);

  const afterDeleteProposta = useCallback(() => {
    invalidateCache('propostas');
    invalidateCache('dashboard');
  }, [invalidateCache]);

  const afterCreateUg = useCallback(() => {
    invalidateCache('ugs');
    
    // ✅ ADICIONAR: Forçar reload imediatamente
    setTimeout(() => {
      loadUgs({}, true); // true = forceReload
    }, 100);
  }, [invalidateCache, loadUgs]);

  const afterCreateUser = useCallback(() => {
    invalidateCache('dashboard');
  }, [invalidateCache]);

  // ========================================
  // CARREGAMENTO INICIAL - SIMPLIFICADO
  // ========================================

  useEffect(() => {
    if (user?.id && !initializedRef.current && !loadingRef.current) {
      console.log(`🚀 DataContext inicializando para usuário: ${user.name} (${user.role})`);
      
      initializedRef.current = true;
      loadingRef.current = true;
      
      const initData = async () => {
        try {
          let finalPropostas = [];
          let finalControle = [];
          let finalUgs = [];

          // Carregar propostas
          const propostasResponse = await apiService.getPropostas({
            page: 1,
            per_page: propostas.perPage
          });
          
          if (propostasResponse?.success && propostasResponse?.data) {
            finalPropostas = propostasResponse.data;
            setPropostas(prev => ({
              ...prev,
              data: finalPropostas,
              loading: false,
              total: propostasResponse.total || finalPropostas.length
            }));
            console.log(`✅ ${finalPropostas.length} propostas carregadas na inicialização`);
          }
          
          // Carregar controle se permitido
          if (['admin', 'consultor', 'gerente'].includes(user.role)) {
            const controleResponse = await apiService.getControle({
              page: 1,
              per_page: controle.perPage
            });
            
            if (controleResponse?.success && controleResponse?.data) {
              finalControle = controleResponse.data;
              setControle(prev => ({
                ...prev,
                data: finalControle,
                loading: false,
                total: controleResponse.total || finalControle.length
              }));
              console.log(`✅ ${finalControle.length} controles carregados na inicialização`);
            }
          }
          
          // Carregar UGs se admin
          if (user.role === 'admin') {
            const ugsResponse = await apiService.getUGs({});
            
            if (ugsResponse?.success && ugsResponse?.data) {
              finalUgs = ugsResponse.data;
              setUgs(prev => ({
                ...prev,
                data: finalUgs,
                loading: false
              }));
              console.log(`✅ ${finalUgs.length} UGs carregadas na inicialização`);
            }
          }

          // Atualizar estatísticas com todos os dados carregados
          setTimeout(() => {
            updateDashboardStats(finalPropostas, finalControle, finalUgs);
            loadingRef.current = false;
            console.log('🎯 Inicialização completa!');
          }, 200);
          
        } catch (error) {
          console.error('❌ Erro na inicialização:', error);
          loadingRef.current = false;
        }
      };

      initData();
    }
  }, [user?.id, user?.role]);

  // ADICIONAR este useEffect:
  useEffect(() => {
    initializedRef.current = false;
    loadingRef.current = false;
    lastLoadTimestamp.current = {};
  }, [user?.id]);


  // ========================================
  // PROVIDER VALUE
  // ========================================

  const value = {
    // Estados dos dados
    propostas,
    controle,
    ugs,
    dashboard,
    calibragem, // ✅ ADICIONAR
    
    // Funções de carregamento
    loadPropostas,
    loadControle, 
    loadUgs,
    loadDashboard,
    loadCalibragem,
      
    // Funções de invalidação
    invalidateCache,
    invalidateAll,
    
    // Hooks para CRUD
    afterCreateProposta,
    afterUpdateProposta,
    afterDeleteProposta,
    afterCreateUg,
    afterCreateUser,
    
    // Utilidades
    isLoading: propostas.loading || controle.loading || ugs.loading || dashboard.loading,
    hasAnyError: !!(propostas.error || controle.error || ugs.error || dashboard.error),
    initialized: initializedRef.current
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};