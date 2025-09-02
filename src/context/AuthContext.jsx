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
  const login = async (email, password) => { // ← ALTERAR PARÂMETROS
    try {
      setLoading(true);
      
      const response = await apiService.post('/auth/login', { email, password });
      
      if (response.success && response.user && response.token) {
        const { user: userData, token } = response;
        
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

  const checkDefaultPassword = async () => {
    try {
      const response = await apiService.get('/auth/check-default-password');
      return response.data?.has_default_password || false;
    } catch (error) {
      console.error('Erro ao verificar senha padrão:', error);
      return false;
    }
  };


  const logout = async () => {
    try {
      console.log('🚪 Realizando logout...');
      
      // DEFINIR FLAG ANTES de qualquer operação
      window.isLoggingOut = true;
      
      // Limpar dados locais IMEDIATAMENTE
      setUser(null);
      setIsAuthenticated(false);
      setTeamCache([]);
      
      localStorage.removeItem('user');
      localStorage.removeItem('aupus_token');
      apiService.clearToken();
      
      // Logout do servidor em background (sem aguardar)
      apiService.post('/auth/logout').catch(() => {
        console.log('Logout do servidor falhou, mas logout local concluído');
      });
      
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
    
    if (window.isLoggingOut) {
      console.log('🚪 Logout em andamento, não carregando equipe');
      return [];
    }

    if (teamCache.length === 0 && user?.id && isAuthenticated) {
      console.log('⚠️ Cache vazio, disparando refresh da equipe...');
      // Não aguardar o refresh, apenas disparar
      refreshTeam().catch(err => console.error('Erro no refresh automático:', err));
    }
    
    // ✅ FALLBACK INTELIGENTE BASEADO NO ROLE
    if (teamCache.length === 0 && user) {
      console.log('⚠️ getMyTeam: Cache vazio, retornando fallback baseado no role');
      
      // Para admin, tentar buscar do localStorage como fallback
      if (user.role === 'admin') {
        try {
          const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
          if (usuarios.length > 0) {
            console.log(`👥 getMyTeam (admin fallback): ${usuarios.length} usuários do localStorage`);
            return usuarios;
          }
        } catch (e) {
          console.warn('Erro ao ler usuarios do localStorage:', e);
        }
      }
      
      // Fallback final: apenas o usuário atual
      return [user];
    }
    
    return teamCache.filter(Boolean);
  };

  const refreshTeam = async () => {
    try {
      if (!user?.id || !isAuthenticated) {
        console.log('⚠️ refreshTeam: Usuário não autenticado, limpando cache');
        setTeamCache([]);
        return [];
      }

      console.log('🔄 Buscando equipe da API para:', user.role);
      const response = await apiService.getTeam();
      
      if (!response || !response.success) {
        console.warn('⚠️ API não retornou equipe válida:', response);
        const fallback = [user];
        setTeamCache(fallback);
        return fallback;
      }

      let usuarios = response.data || [];
      
      // ✅ MAPEAR USUÁRIOS COM MANAGER_ID
      const usuariosFormatados = usuarios.map(usuario => ({
        id: usuario.id,
        name: usuario.name || usuario.nome,
        email: usuario.email,
        role: usuario.role,
        manager_id: usuario.manager_id,
        status: usuario.status_display || 'Ativo',
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
      console.log(`✅ Equipe atualizada: ${usuariosFormatados.length} membros`, usuariosFormatados);
      return usuariosFormatados;
      
    } catch (error) {
      console.error('❌ Erro ao buscar equipe:', error);
      const fallback = [user].filter(Boolean);
      setTeamCache(fallback);
      return fallback;
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
    checkDefaultPassword, 
    
    // Funções de equipe
    getMyTeam,
    refreshTeam,
    
    // Funções de permissão
    canAccessPage,
    canCreateUser,
    
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