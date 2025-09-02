// src/context/AuthContext.jsx - CORRIGIDO PARA INTEGRAÇÃO COM API
import React, { createContext, useContext, useState, useEffect } from 'react';
import storageService from '../services/storageService';

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

  // Verificar se há usuário salvo ao inicializar
  useEffect(() => {
    const initAuth = () => {
      try {
        // ✅ CORRIGIDO: Usar 'aupus_token' consistentemente
        const savedUser = localStorage.getItem('user');
        const savedToken = localStorage.getItem('aupus_token');
        
        console.log('🔍 Verificando sessão salva:', {
          hasUser: !!savedUser,
          hasToken: !!savedToken,
          tokenLength: savedToken ? savedToken.length : 0
        });
        
        if (savedUser && savedToken) {
          const userData = JSON.parse(savedUser);
          
          // ✅ CONFIGURAR TOKEN NO APISERVICE ANTES DE DEFINIR USUÁRIO
          apiService.setToken(savedToken);
  
          setUser(userData);
          setIsAuthenticated(true);
          
          console.log('✅ Usuário restaurado do localStorage:', userData.name || userData.nome);
          console.log('✅ Token configurado no apiService');
          
          // ✅ VERIFICAR SE O TOKEN AINDA É VÁLIDO
          // Fazer uma verificação rápida sem forçar logout se falhar
          setTimeout(async () => {
            try {
              await apiService.get('/auth/me');
              console.log('✅ Token validado com sucesso na inicialização');
            } catch (error) {
              console.log('⚠️ Token pode ter expirado, mas mantendo sessão. Será verificado pelo sistema automático.');
            }
          }, 1000);
          
        } else {
          console.log('ℹ️ Nenhuma sessão salva encontrada');
          // Limpar qualquer dado inconsistente
          localStorage.removeItem('user');
          localStorage.removeItem('aupus_token');
          apiService.clearToken();
        }
      } catch (error) {
        console.error('❌ Erro ao restaurar sessão:', error);
        // Limpar dados corrompidos mas não forçar logout imediato
        localStorage.removeItem('user');
        localStorage.removeItem('aupus_token');
        apiService.clearToken();
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    console.log('🔐 Iniciando login...');
    
    try {
      // CORREÇÃO: Chamar login do storageService diretamente
      const userData = await storageService.login(email, password);
      
      if (userData && userData.id) {
        setUser(userData);
        setIsAuthenticated(true);
        console.log('✅ Login realizado com sucesso:', userData.name || userData.nome);
        return { success: true, user: userData };
      }
      
      throw new Error('Login falhou - usuário inválido');
      
    } catch (error) {
      console.error('❌ Erro no login:', error);
      return { success: false, message: error.message || 'Erro interno do sistema' };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      console.log('🚪 Fazendo logout...');
      
      // Usar logout do storageService (que já limpa corretamente)
      storageService.logout();
      
      // Resetar estado
      setUser(null);
      setIsAuthenticated(false);
      setTeamCache([]); // Limpar cache da equipe
      
      console.log('✅ Logout realizado com sucesso');
      return { success: true };
      
    } catch (error) {
      console.error('❌ Erro no logout:', error);
      
      // Forçar limpeza mesmo com erro - ✅ USAR CHAVES CORRETAS
      setUser(null);
      setIsAuthenticated(false);
      setTeamCache([]);
      
      // ✅ LIMPAR COM CHAVES CONSISTENTES
      localStorage.removeItem('user');
      localStorage.removeItem('aupus_token');  // ← CORRIGIDO: era 'token'
      apiService.clearToken();
      
      return { success: false, message: error.message };
    }
  };

  const updateUser = (userData) => {
    try {
      setUser(userData);
      // ✅ SALVAR USUÁRIO ATUALIZADO NO LOCALSTORAGE
      localStorage.setItem('user', JSON.stringify(userData));
      console.log('👤 Dados do usuário atualizados e salvos no localStorage');
    } catch (error) {
      console.error('❌ Erro ao atualizar usuário:', error);
    }
  };

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

  // Função para verificar se pode acessar uma página
  const canAccessPage = (pageName) => {
    if (!user) {
      return false;
    }

    // ✅ LÓGICA SIMPLIFICADA - baseada no role
    const pagePermissions = {
      'dashboard': true, // Todos podem acessar dashboard
      'prospec': ['admin', 'consultor', 'gerente', 'vendedor'].includes(user.role),
      'controle': ['admin', 'consultor', 'gerente'].includes(user.role),
      'ugs': ['admin'].includes(user.role), // Apenas admin
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

  // Função para criar usuário (simplificada)
  const createUser = async (userData) => {
    try {
      if (!canCreateUser(userData.role)) {
        throw new Error('Você não tem permissão para criar este tipo de usuário');
      }

      // Por enquanto, simular criação
      console.log('👤 Criando usuário:', userData);
      
      return { 
        success: true, 
        message: 'Usuário criado com sucesso (simulado)' 
      };
      
    } catch (error) {
      console.error('❌ Erro ao criar usuário:', error);
      return { 
        success: false, 
        message: error.message 
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