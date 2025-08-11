// src/context/AuthContext.jsx - Context de autenticação corrigido para usar email
import React, { createContext, useContext, useState, useEffect } from 'react';
import { storageService } from '../services/storageService';

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
        const savedUser = localStorage.getItem('aupus_user');
        const savedToken = localStorage.getItem('aupus_token');
        
        if (savedUser && savedToken) {
          const userData = JSON.parse(savedUser);
          setUser(userData);
          setIsAuthenticated(true);
          console.log('👤 Usuário restaurado do localStorage:', userData.nome || userData.name);
        }
      } catch (error) {
        console.error('❌ Erro ao restaurar sessão:', error);
        // Limpar dados corrompidos
        localStorage.removeItem('aupus_user');
        localStorage.removeItem('aupus_token');
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email, password) => {  // Mudado de username para email
    setLoading(true);
    console.log('🔐 Iniciando login...');
    
    try {
      // Tentar login via API primeiro
      const credentials = { email, password };  // Enviando email em vez de username
      const result = await storageService.login(credentials);
      
      if (result.success) {
        const userData = result.user;
        setUser(userData);
        setIsAuthenticated(true);
        console.log('✅ Login realizado com sucesso:', userData.nome || userData.name);
        return { success: true, user: userData };
      }
      
      // Se falhou na API, tentar método local original (fallback)
      return await loginLocal(email, password);  // Mudado de username para email
      
    } catch (error) {
      console.error('❌ Erro no login:', error);
      return { success: false, message: error.message || 'Erro interno do sistema' };
    } finally {
      setLoading(false);
    }
  };

  // Método de login local (fallback para compatibilidade)
  const loginLocal = async (email, password) => {  // Mudado de username para email
    try {
      // Verificar usuário admin padrão (mantendo por compatibilidade)
      if (email === 'admin@aupus.com' && password === '123') {  // Usando email em vez de username
        const adminUser = {
          id: 'admin',
          email: 'admin@aupus.com',
          name: 'Administrador',
          nome: 'Administrador', // Para compatibilidade com API
          role: 'admin',
          permissions: {
            canCreateConsultors: true,
            canAccessAll: true,
            canManageUGs: true,
            canManageCalibration: true,
            canSeeAllData: true
          },
          createdBy: null,
          subordinates: []
        };
        
        setUser(adminUser);
        setIsAuthenticated(true);
        localStorage.setItem('aupus_user', JSON.stringify(adminUser));
        console.log('✅ Login admin local realizado');
        return { success: true, user: adminUser };
      }

      // Verificar usuários cadastrados localmente
      const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
      const usuario = usuarios.find(u => 
        u.email === email && u.password === password  // Mudado de username para email
      );

      if (usuario) {
        const userData = {
          ...usuario,
          nome: usuario.name || usuario.nome
        };
        
        setUser(userData);
        setIsAuthenticated(true);
        localStorage.setItem('aupus_user', JSON.stringify(userData));
        console.log('✅ Login local realizado:', userData.nome);
        return { success: true, user: userData };
      }

      return { 
        success: false, 
        message: 'Email ou senha incorretos'  // Mudou mensagem de erro
      };

    } catch (error) {
      console.error('❌ Erro no login local:', error);
      return { 
        success: false, 
        message: 'Erro no sistema de autenticação local' 
      };
    }
  };

  const logout = async () => {
    try {
      console.log('🚪 Fazendo logout...');
      
      // Limpar dados locais
      localStorage.removeItem('aupus_user');
      localStorage.removeItem('aupus_token');
      
      // Resetar estado
      setUser(null);
      setIsAuthenticated(false);
      
      console.log('✅ Logout realizado com sucesso');
      return { success: true };
      
    } catch (error) {
      console.error('❌ Erro no logout:', error);
      
      // Forçar limpeza mesmo com erro
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('aupus_user');
      localStorage.removeItem('aupus_token');
      
      return { success: false, message: error.message };
    }
  };

  const updateUser = (userData) => {
    try {
      setUser(userData);
      localStorage.setItem('aupus_user', JSON.stringify(userData));
      console.log('👤 Dados do usuário atualizados');
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
    if (!user || !user.permissions) {
      return false;
    }

    const pagePermissions = {
      'dashboard': true, // Todos podem acessar dashboard
      'prospec': user.permissions.canAccessReports || user.permissions.canAccessAll || user.role === 'admin',
      'controle': user.permissions.canAccessReports || user.permissions.canAccessAll || user.role === 'admin',
      'ugs': user.permissions.canManageUGs || user.role === 'admin',
      'relatorios': user.permissions.canAccessReports || user.permissions.canAccessAll || user.role === 'admin'
    };

    return pagePermissions[pageName] || false;
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
    createUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};