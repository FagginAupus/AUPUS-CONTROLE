// src/context/AuthContext.jsx - CORRIGIDO PARA SEMPRE BUSCAR DA API
import React, { createContext, useContext, useState, useEffect } from 'react';
import storageService from '../services/storageService';
import apiService from '../services/apiService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [teamCache, setTeamCache] = useState([]); // ✅ Cache da equipe

  // Verificar se há usuário salvo ao inicializar
  useEffect(() => {
    const initAuth = () => {
      try {
        const savedUser = localStorage.getItem('user');
        const savedToken = localStorage.getItem('token');
        
        if (savedUser && savedToken) {
          const userData = JSON.parse(savedUser);
          setUser(userData);
          setIsAuthenticated(true);
          console.log('👤 Usuário restaurado do localStorage:', userData.name || userData.nome);
        }
        apiService.setToken(savedToken);

      } catch (error) {
        console.error('❌ Erro ao restaurar sessão:', error);
        // Limpar dados corrompidos
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // ✅ ATUALIZAR EQUIPE QUANDO USUÁRIO MUDA
  useEffect(() => {
    if (user && isAuthenticated) {
      refreshTeam();
    } else {
      setTeamCache([]);
    }
  }, [user?.id, isAuthenticated]);

  // ✅ FUNÇÃO PARA BUSCAR EQUIPE DA API (SEMPRE ATUALIZADA)
  const refreshTeam = async () => {
    try {
      if (!user?.id || !isAuthenticated) {
        console.log('⚠️ refreshTeam: Usuário não autenticado, limpando cache');
        setTeamCache([]);
        return [];
      }

      console.log('🔄 Atualizando equipe da API para:', user.role);
      const response = await apiService.get('/usuarios/equipe');
      
      if (!response?.success || !response?.data) {
        console.warn('⚠️ API não retornou usuários válidos');
        const fallback = [user];
        setTeamCache(fallback);
        return fallback;
      }

      let usuarios = [];
      if (response.data.data && Array.isArray(response.data.data)) {
        usuarios = response.data.data;
      } else if (Array.isArray(response.data)) {
        usuarios = response.data;
      }

      // ✅ MAPEAR USUÁRIOS COM MANAGER_ID
      const usuariosFormatados = usuarios.map(usuario => ({
        id: usuario.id,
        name: usuario.nome || usuario.name,
        email: usuario.email,
        role: usuario.role,
        manager_id: usuario.manager_id,
        status: usuario.status,
        telefone: usuario.telefone
      }));

      // ✅ SEMPRE INCLUIR O USUÁRIO ATUAL SE NÃO ESTIVER NA LISTA
      const usuarioAtualNaLista = usuariosFormatados.find(u => u.id === user.id);
      if (!usuarioAtualNaLista) {
        usuariosFormatados.push({
          id: user.id,
          name: user.name || user.nome,
          email: user.email,
          role: user.role,
          manager_id: user.manager_id,
          status: 'Ativo',
          telefone: user.telefone
        });
      }

      setTeamCache(usuariosFormatados);
      console.log(`✅ Equipe atualizada: ${usuariosFormatados.length} membros`);
      return usuariosFormatados;
      
    } catch (error) {
      console.error('❌ Erro ao atualizar equipe da API:', error);
      const fallback = [user].filter(Boolean);
      setTeamCache(fallback);
      return fallback;
    }
  };

  // ✅ FUNÇÃO SÍNCRONA PARA OBTER EQUIPE (USA CACHE)
  const getMyTeam = () => {
    return teamCache.filter(Boolean);
  };

  const login = async (email, password) => {
    setLoading(true);
    console.log('🔐 Iniciando login...');
    
    try {
      const userData = await storageService.login(email, password);
      
      console.log('🔐 AuthContext - Resposta do storageService:', userData);
      
      if (userData && (userData.id || userData.name || userData.nome)) {
        console.log('✅ AuthContext - Definindo usuário:', userData);
        setUser(userData);
        setIsAuthenticated(true);
        setTimeout(() => {
          refreshTeam();
        }, 500); // Pequeno delay para garantir que o estado foi atualizado

        return { success: true, user: userData };
      }
      
      throw new Error('Dados de usuário inválidos');
      
    } catch (error) {
      console.error('❌ AuthContext - Erro no login:', error);
      setUser(null);
      setIsAuthenticated(false);
      return { success: false, message: error.message || 'Erro interno do sistema' };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      console.log('🚪 Fazendo logout...');
      
      storageService.logout();
      
      // Resetar estado
      setUser(null);
      setIsAuthenticated(false);
      setTeamCache([]); // ✅ LIMPAR CACHE DA EQUIPE
      
      console.log('✅ Logout realizado com sucesso');
      return { success: true };
      
    } catch (error) {
      console.error('❌ Erro no logout:', error);
      
      // Forçar limpeza mesmo com erro
      setUser(null);
      setIsAuthenticated(false);
      setTeamCache([]);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      
      return { success: false, message: error.message };
    }
  };

  const updateUser = (userData) => {
    try {
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      console.log('👤 Dados do usuário atualizados');
    } catch (error) {
      console.error('❌ Erro ao atualizar usuário:', error);
    }
  };

  // Função para verificar se pode acessar uma página
  const canAccessPage = (pageName) => {
    if (!user) {
      return false;
    }

    const pagePermissions = {
      'dashboard': true,
      'prospec': ['admin', 'consultor', 'gerente', 'vendedor'].includes(user.role),
      'controle': ['admin', 'consultor', 'gerente'].includes(user.role),
      'ugs': ['admin'].includes(user.role),
      'relatorios': ['admin', 'consultor', 'gerente'].includes(user.role)
    };

    return pagePermissions[pageName] || false;
  };

  // Função para obter nome do consultor
  const getConsultorName = (consultorId) => {
    const team = getMyTeam();
    const consultor = team.find(member => 
      member.id === consultorId || 
      member.name === consultorId ||
      member.email === consultorId
    );
    return consultor?.name || consultorId || 'Desconhecido';
  };

  // Função para verificar se pode criar usuário
  const canCreateUser = (role) => {
    if (!user) return false;
    
    switch (user.role) {
      case 'admin':
        return ['consultor', 'gerente', 'vendedor'].includes(role);
      case 'consultor':
        return ['gerente', 'vendedor'].includes(role);
      case 'gerente':
        return role === 'vendedor';
      default:
        return false;
    }
  };

  // ✅ FUNÇÃO PARA CRIAR USUÁRIO COM RECARREGAMENTO AUTOMÁTICO DA EQUIPE
  const createUser = async (userData) => {
    try {
      if (!canCreateUser(userData.role)) {
        throw new Error('Você não tem permissão para criar este tipo de usuário');
      }

      // ✅ DEFINIR manager_id AUTOMATICAMENTE
      let managerId = null;
      if (userData.role === 'gerente' || userData.role === 'vendedor') {
        managerId = user.id;
      }
      
      console.log('👤 Criando usuário via API:', userData);
      
      const response = await apiService.criarUsuario({
        nome: userData.nome,
        email: userData.email,
        password: userData.password,
        telefone: userData.telefone,
        cpf_cnpj: userData.cpf_cnpj,
        endereco: userData.endereco,
        cidade: userData.cidade,
        estado: userData.estado,
        cep: userData.cep,
        pix: userData.pix,
        role: userData.role,
        manager_id: managerId  // ✅ ENVIAR MANAGER_ID CORRETO
      });

      if (response?.success) {
        console.log('✅ Usuário criado com sucesso:', response);
        
        // ✅ RECARREGAR EQUIPE APÓS CRIAR USUÁRIO
        setTimeout(() => {
          refreshTeam();
        }, 1000);
        
        return response;
      } else {
        throw new Error(response?.message || 'Erro ao criar usuário');
      }
      
    } catch (error) {
      console.error('❌ Erro ao criar usuário:', error);
      return { 
        success: false, 
        message: error.message || 'Erro interno do sistema'
      };
    }
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
    updateUser,
    getMyTeam,
    refreshTeam,        
    canAccessPage,
    canCreateUser,
    createUser,
    getConsultorName
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};