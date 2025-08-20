// src/context/DataContext.jsx - Context centralizado com paginação e hierarquia
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
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
    perPage: 50,
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

  // Cache timestamps para invalidação
  const [cacheTimestamps, setCacheTimestamps] = useState({
    propostas: 0,
    controle: 0,
    ugs: 0
  });

  // ========================================
  // FUNÇÕES DE CARREGAMENTO - PROPOSTAS
  // ========================================

  const loadPropostas = useCallback(async (page = 1, filters = {}, forceReload = false) => {
    if (!user?.id) return;

    const cacheTimeout = 60000; // 1 minuto
    const now = Date.now();
    const isExpired = (now - cacheTimestamps.propostas) > cacheTimeout;

    // Se não força reload e cache não expirou, não carregar
    if (!forceReload && !isExpired && propostas.data.length > 0 && page === 1) {
      console.log('📋 Usando cache de propostas');
      return;
    }

    try {
      setPropostas(prev => ({ ...prev, loading: true, error: null }));
      console.log(`📡 Carregando propostas - Página ${page} - Role: ${user.role}`);

      // Preparar filtros com hierarquia automática aplicada no backend
      const params = {
        page,
        per_page: propostas.perPage,
        ...filters
      };

      const response = await apiService.get('/propostas', { params });

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

        // Atualizar timestamp do cache
        setCacheTimestamps(prev => ({
          ...prev,
          propostas: now
        }));

        console.log(`✅ ${response.data.length} propostas carregadas (${user.role})`);
      } else {
        throw new Error('Resposta inválida da API');
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
  }, [user, propostas.perPage, propostas.data, cacheTimestamps.propostas, showNotification]);

  // ========================================
  // FUNÇÕES DE CARREGAMENTO - CONTROLE
  // ========================================

  const loadControle = useCallback(async (page = 1, filters = {}, forceReload = false) => {
    if (!user?.id) return;

    const cacheTimeout = 60000; // 1 minuto
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

      const response = await apiService.get('/controle', { params });

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

        console.log(`✅ ${response.data.length} controles carregados (${user.role})`);
      } else {
        throw new Error('Resposta inválida da API');
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
  }, [user, controle.perPage, controle.data, cacheTimestamps.controle, showNotification]);

  // ========================================
  // FUNÇÕES DE CARREGAMENTO - UGS
  // ========================================

  const loadUgs = useCallback(async (filters = {}, forceReload = false) => {
    if (!user?.id || user.role !== 'admin') {
      console.log('⚠️ UGs disponíveis apenas para admin');
      return;
    }

    const cacheTimeout = 120000; // 2 minutos (UGs mudam menos)
    const now = Date.now();
    const isExpired = (now - cacheTimestamps.ugs) > cacheTimeout;

    if (!forceReload && !isExpired && ugs.data.length > 0) {
      console.log('📋 Usando cache de UGs');
      return;
    }

    try {
      setUgs(prev => ({ ...prev, loading: true, error: null }));
      console.log('📡 Carregando UGs - Admin');

      const params = {
        ...filters
      };

      const response = await apiService.get('/ugs', { params });

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
      } else {
        throw new Error('Resposta inválida da API');
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
  }, [user, cacheTimestamps.ugs, showNotification]);

  // ========================================
  // FUNÇÕES DE INVALIDAÇÃO DE CACHE
  // ========================================

  const invalidateCache = useCallback((type) => {
    console.log(`🗑️ Invalidando cache: ${type}`);
    setCacheTimestamps(prev => ({
      ...prev,
      [type]: 0
    }));

    // Resetar dados correspondentes
    if (type === 'propostas') {
      setPropostas(prev => ({
        ...prev,
        data: [],
        page: 1,
        hasMore: true,
        total: 0
      }));
    } else if (type === 'controle') {
      setControle(prev => ({
        ...prev,
        data: [],
        page: 1,
        hasMore: true,
        total: 0
      }));
    } else if (type === 'ugs') {
      setUgs(prev => ({
        ...prev,
        data: []
      }));
    }
  }, []);

  const invalidateAll = useCallback(() => {
    console.log('🗑️ Invalidando todos os caches');
    setCacheTimestamps({
      propostas: 0,
      controle: 0,
      ugs: 0
    });

    setPropostas(prev => ({ ...prev, data: [], page: 1, hasMore: true, total: 0 }));
    setControle(prev => ({ ...prev, data: [], page: 1, hasMore: true, total: 0 }));
    setUgs(prev => ({ ...prev, data: [] }));
  }, []);

  // ========================================
  // FUNÇÕES PARA CRUD (INVALIDAÇÃO INTELIGENTE)
  // ========================================

  const afterCreateProposta = useCallback(() => {
    console.log('✅ Proposta criada - Invalidando cache de propostas');
    invalidateCache('propostas');
    loadPropostas(1, propostas.filters, true);
  }, [invalidateCache, loadPropostas, propostas.filters]);

  const afterUpdateProposta = useCallback(() => {
    console.log('✅ Proposta atualizada - Invalidando cache de propostas');
    invalidateCache('propostas');
    // Controle também pode ser afetado se proposta mudou de status
    invalidateCache('controle');
  }, [invalidateCache]);

  const afterDeleteProposta = useCallback(() => {
    console.log('✅ Proposta excluída - Invalidando caches relacionados');
    invalidateCache('propostas');
    invalidateCache('controle');
  }, [invalidateCache]);

  const afterCreateUg = useCallback(() => {
    console.log('✅ UG criada - Invalidando cache de UGs');
    invalidateCache('ugs');
    loadUgs(ugs.filters, true);
  }, [invalidateCache, loadUgs, ugs.filters]);

  // ========================================
  // CARREGAMENTO INICIAL
  // ========================================

  useEffect(() => {
    if (user?.id) {
      console.log(`🚀 DataContext inicializando para usuário: ${user.name} (${user.role})`);
      
      // Carregar dados baseado nas permissões do usuário
      loadPropostas(1, {}, true);
      
      if (['admin', 'consultor', 'gerente'].includes(user.role)) {
        loadControle(1, {}, true);
      }
      
      if (user.role === 'admin') {
        loadUgs({}, true);
      }
    }
  }, [user?.id, user?.role]);

  // ========================================
  // PROVIDER VALUE
  // ========================================

  const value = {
    // Estados dos dados
    propostas,
    controle,
    ugs,
    
    // Funções de carregamento
    loadPropostas,
    loadControle, 
    loadUgs,
    
    // Funções de invalidação
    invalidateCache,
    invalidateAll,
    
    // Hooks para CRUD
    afterCreateProposta,
    afterUpdateProposta,
    afterDeleteProposta,
    afterCreateUg,
    
    // Utilidades
    isLoading: propostas.loading || controle.loading || ugs.loading,
    hasAnyError: !!(propostas.error || controle.error || ugs.error)
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};