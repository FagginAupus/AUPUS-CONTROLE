// src/context/AuthContext.jsx - CORREÇÃO COMPLETA DEFINITIVA
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
  // 🔧 INICIALIZAÇÃO CORRIGIDA
  // ========================================
  useEffect(() => {
    const initAuth = async () => {
      try {
        console.log('🔍 Inicializando autenticação...');
        
        // ✅ USAR CHAVE CONSISTENTE 'aupus_token'
        const savedUser = localStorage.getItem('user');
        const savedToken = localStorage.getItem('aupus_token');
        
        console.log('🔍 Dados salvos encontrados:', {
          hasUser: !!savedUser,
          hasToken: !!savedToken,
          tokenLength: savedToken ? savedToken.length : 0,
          userPreview: savedUser ? JSON.parse(savedUser).name || JSON.parse(savedUser).nome : 'N/A'
        });
        
        if (savedUser && savedToken) {
          try {
            const userData = JSON.parse(savedUser);
            
            // ✅ CONFIGURAR TOKEN NO APISERVICE PRIMEIRO
            apiService.setToken(savedToken);
            
            // ✅ DEFINIR USUÁRIO E ESTADO
            setUser(userData);
            setIsAuthenticated(true);
            
            console.log('✅ Sessão restaurada:', {
              userId: userData.id,
              userName: userData.name || userData.nome,
              userRole: userData.role
            });
            
            // ✅ VALIDAÇÃO OPCIONAL DO TOKEN (sem forçar logout)
            setTimeout(async () => {
              try {
                const validation = await apiService.get('/auth/me');
                console.log('✅ Token validado na inicialização:', validation.success);
              } catch (error) {
                console.log('⚠️ Validação de token falhou, mas mantendo sessão:', error.message);
                // Não forçar logout - deixar o sistema de timeout tratar
              }
            }, 2000); // 2 segundos de delay
            
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
          localStorage.removeItem('token'); // Limpar versão antiga também
          apiService.clearToken();
        }
      } catch (error) {
        console.error('❌ Erro na inicialização da autenticação:', error);
        // Reset completo em caso de erro
        setUser(null);
        setIsAuthenticated(false);
        localStorage.clear(); // Limpar tudo se houver problema grave
        apiService.clearToken();
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  // ========================================
  // 🔄 ATUALIZAÇÃO DA EQUIPE
  // ========================================
  useEffect(() => {
    if (user && isAuthenticated) {
      // ✅ AGUARDAR UM POUCO PARA A API ESTAR PRONTA
      const timer = setTimeout(() => {
        refreshTeam();
      }, 1000);
      
      return () => clearTimeout(timer);
    } else {
      setTeamCache([]);
    }
  }, [user?.id, isAuthenticated]);

  // ========================================
  // 👥 FUNÇÕES DE EQUIPE
  // ========================================
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

  const getMyTeam = () => {
    // ✅ VERIFICAR SE CACHE ESTÁ VAZIO E TENTAR REFRESH
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

  // ========================================
  // 🔐 FUNÇÕES DE AUTENTICAÇÃO
  // ========================================
  const login = async (email, password) => {
    setLoading(true);
    console.log('🔐 Iniciando login...');
    
    try {
      const userData = await storageService.login(email, password);
      
      if (userData && userData.id) {
        setUser(userData);
        setIsAuthenticated(true);
        
        // Atualizar equipe após login
        setTimeout(() => refreshTeam(), 500);
        
        console.log('✅ Login realizado com sucesso:', userData.name || userData.nome);
        return { success: true, user: userData };
      }
      
      throw new Error('Login falhou - dados de usuário inválidos');
      
    } catch (error) {
      console.error('❌ Erro no login:', error);
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
      
      // Usar logout do storageService
      storageService.logout();
      
      // Reset completo do estado
      setUser(null);
      setIsAuthenticated(false);
      setTeamCache([]);
      
      console.log('✅ Logout realizado com sucesso');
      return { success: true };
      
    } catch (error) {
      console.error('❌ Erro no logout:', error);
      
      // Forçar limpeza mesmo com erro
      setUser(null);
      setIsAuthenticated(false);
      setTeamCache([]);
      
      // ✅ LIMPAR TODAS AS VARIAÇÕES DE TOKEN
      localStorage.removeItem('user');
      localStorage.removeItem('aupus_token');
      localStorage.removeItem('token'); // Versão antiga também
      apiService.clearToken();
      
      return { success: false, message: error.message };
    }
  };

  // ========================================
  // 🛡️ FUNÇÕES DE PERMISSÃO
  // ========================================
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

  const updateUser = (userData) => {
    try {
      setUser(userData);
      localStorage.setItem('user', JSON.stringify(userData));
      console.log('👤 Dados do usuário atualizados');
    } catch (error) {
      console.error('❌ Erro ao atualizar usuário:', error);
    }
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
  // 📊 VALUE DO CONTEXT
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
    
    // Utilitários
    getConsultorName: (consultorId) => {
      const team = getMyTeam();
      const consultor = team.find(member => 
        member.id === consultorId || 
        member.name === consultorId ||
        member.email === consultorId
      );
      return consultor?.name || consultorId || 'Desconhecido';
    }
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};