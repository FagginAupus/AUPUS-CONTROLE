// src/context/AuthContext.jsx - CORREÇÃO COMPLETA
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
  const [teamCache, setTeamCache] = useState([]);

  // ========================================
  // 🔧 INICIALIZAÇÃO
  // ========================================
  useEffect(() => {
    const initAuth = async () => {
      try {
        console.log('🔍 Inicializando autenticação...');
        
        const savedUser = localStorage.getItem('user');
        const savedToken = localStorage.getItem('aupus_token');
        
        console.log('🔍 Dados salvos encontrados:', {
          hasUser: !!savedUser,
          hasToken: !!savedToken,
          tokenLength: savedToken ? savedToken.length : 0
        });
        
        if (savedUser && savedToken) {
          try {
            const userData = JSON.parse(savedUser);
            
            // Configurar token primeiro
            apiService.setToken(savedToken);
            
            // Definir usuário e estado
            setUser(userData);
            setIsAuthenticated(true);
            
            console.log('✅ Sessão restaurada:', {
              userId: userData.id,
              userName: userData.name || userData.nome,
              userRole: userData.role
            });
            
          } catch (parseError) {
            console.error('❌ Erro ao processar dados salvos:', parseError);
            // Limpar dados corrompidos
            localStorage.removeItem('user');
            localStorage.removeItem('aupus_token');
            apiService.clearToken();
          }
        } else {
          console.log('ℹ️ Nenhuma sessão salva encontrada');
          // Limpar restos inconsistentes
          localStorage.removeItem('user');
          localStorage.removeItem('aupus_token');
          apiService.clearToken();
        }
      } catch (error) {
        console.error('❌ Erro na inicialização da autenticação:', error);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // ========================================
  // 🔐 FUNÇÕES DE AUTENTICAÇÃO
  // ========================================
  const login = async (credentials) => {
    try {
      setLoading(true);
      
      const response = await apiService.post('/auth/login', credentials);
      
      if (response.success && response.data) {
        const { user: userData, token } = response.data;
        
        // Configurar token
        apiService.setToken(token);
        localStorage.setItem('aupus_token', token);
        localStorage.setItem('user', JSON.stringify(userData));
        
        // Atualizar estado
        setUser(userData);
        setIsAuthenticated(true);
        
        console.log('✅ Login realizado com sucesso:', userData.name || userData.nome);
        
        return { success: true, user: userData };
      } else {
        return { success: false, message: response.message || 'Erro no login' };
      }
      
    } catch (error) {
      console.error('❌ Erro no login:', error);
      return { success: false, message: error.message || 'Erro interno' };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      console.log('🚪 Realizando logout...');
      
      // Tentar fazer logout no servidor
      try {
        await apiService.post('/auth/logout');
      } catch (error) {
        console.log('⚠️ Erro no logout do servidor:', error.message);
      }
      
      // Limpar dados locais
      setUser(null);
      setIsAuthenticated(false);
      setTeamCache([]);
      
      localStorage.removeItem('user');
      localStorage.removeItem('aupus_token');
      apiService.clearToken();
      
      console.log('✅ Logout realizado com sucesso');
      
      return { success: true };
      
    } catch (error) {
      console.error('❌ Erro no logout:', error);
      
      // Forçar limpeza mesmo com erro
      setUser(null);
      setIsAuthenticated(false);
      setTeamCache([]);
      
      localStorage.removeItem('user');
      localStorage.removeItem('aupus_token');
      apiService.clearToken();
      
      return { success: false, message: error.message };
    }
  };

  // ========================================
  // 👥 FUNÇÕES DE EQUIPE
  // ========================================
  const getMyTeam = () => {
    try {
      if (!user) {
        console.log('⚠️ getMyTeam: Usuário não logado');
        return [];
      }

      // Para admin, retornar todos os usuários
      if (user.role === 'admin') {
        const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
        console.log(`👥 getMyTeam (admin): ${usuarios.length} usuários`);
        return usuarios;
      }

      // Para outros usuários, verificar subordinados
      if (user.subordinates && user.subordinates.length > 0) {
        console.log(`👥 getMyTeam: ${user.subordinates.length} subordinados`);
        return user.subordinates;
      }

      console.log('⚠️ getMyTeam: Equipe vazia, retornando apenas usuário atual');
      return [user];

    } catch (error) {
      console.error('❌ Erro ao obter equipe:', error);
      return [user].filter(Boolean);
    }
  };

  const refreshTeam = async () => {
    try {
      console.log('🔄 Atualizando cache da equipe...');
      
      if (user?.role === 'admin') {
        // Para admin, carregar todos os usuários
        const response = await apiService.get('/usuarios');
        if (response.success && response.data) {
          localStorage.setItem('usuarios', JSON.stringify(response.data));
          setTeamCache(response.data);
          console.log(`✅ Cache da equipe atualizado: ${response.data.length} usuários`);
        }
      } else if (user?.id) {
        // Para outros usuários, carregar subordinados
        const response = await apiService.get(`/usuarios/${user.id}/subordinados`);
        if (response.success && response.data) {
          const updatedUser = { ...user, subordinates: response.data };
          setUser(updatedUser);
          localStorage.setItem('user', JSON.stringify(updatedUser));
          setTeamCache(response.data);
          console.log(`✅ Subordinados atualizados: ${response.data.length} membros`);
        }
      }
    } catch (error) {
      console.error('❌ Erro ao atualizar equipe:', error);
    }
  };

  // ========================================
  // 🔧 FUNÇÕES AUXILIARES
  // ========================================
  const updateUser = (userData) => {
    try {
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      console.log('👤 Dados do usuário atualizados');
    } catch (error) {
      console.error('❌ Erro ao atualizar usuário:', error);
    }
  };

  const canAccessPage = (pageName) => {
    if (!user) return false;
    
    const permissions = {
      'dashboard': true,
      'prospec': ['admin', 'consultor', 'gerente', 'vendedor'].includes(user.role),
      'controle': ['admin', 'consultor', 'gerente'].includes(user.role),
      'ugs': ['admin'].includes(user.role),
      'relatorios': ['admin', 'consultor', 'gerente'].includes(user.role)
    };
    
    return permissions[pageName] || false;
  };

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

  // ========================================
  // 🆕 FUNÇÃO PARA CRIAR USUÁRIO (ESTAVA FALTANDO NO VALUE!)
  // ========================================
  const createUser = async (userData) => {
    try {
      if (!canCreateUser(userData.role)) {
        throw new Error('Você não tem permissão para criar este tipo de usuário');
      }

      console.log('👤 Criando usuário:', userData);
      
      // Fazer chamada para API
      const response = await apiService.post('/usuarios', {
        ...userData,
        manager_id: userData.role === 'vendedor' && userData.manager_id ? userData.manager_id : user.id
      });
      
      if (response.success && response.data) {
        console.log('✅ Usuário criado com sucesso:', response.data);
        
        // Atualizar cache da equipe
        await refreshTeam();
        
        return { 
          success: true, 
          message: `${userData.role.charAt(0).toUpperCase() + userData.role.slice(1)} criado(a) com sucesso!`,
          data: response.data
        };
      } else {
        return {
          success: false,
          message: response.message || 'Erro ao criar usuário'
        };
      }
      
    } catch (error) {
      console.error('❌ Erro ao criar usuário:', error);
      return { 
        success: false, 
        message: error.message || 'Erro interno ao criar usuário'
      };
    }
  };

  const getConsultorName = (consultorId) => {
    const team = getMyTeam();
    const consultor = team.find(member => 
      member.id === consultorId || 
      member.name === consultorId ||
      member.email === consultorId
    );
    return consultor?.name || consultorId || 'Desconhecido';
  };

  // ========================================
  // 📊 VALUE DO CONTEXT - CORRIGIDO COM createUser
  // ========================================
  const value = {
    user,
    isAuthenticated,
    loading,
    teamCache,
    
    // Funções principais
    login,
    logout,
    updateUser,
    
    // Funções de equipe
    getMyTeam,
    refreshTeam,
    
    // Funções de permissão
    canAccessPage,
    canCreateUser,
    
    // ⭐ FUNÇÃO QUE ESTAVA FALTANDO!
    createUser,
    
    // Utilitários
    getConsultorName
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;