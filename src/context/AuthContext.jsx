// src/context/AuthContext.jsx - Sistema de autenticação com hierarquia de usuários - ATUALIZADO
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

  // Verificar se há usuário logado ao inicializar
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Verificar se há token válido
        const token = localStorage.getItem('aupus_token');
        if (token) {
          // Tentar obter usuário atual da API ou localStorage
          const userData = await storageService.getCurrentUser();
          if (userData) {
            setUser(userData);
            setIsAuthenticated(true);
            console.log('✅ Usuário restaurado:', userData.nome || userData.name);
          }
        }
      } catch (error) {
        console.warn('⚠️ Erro ao restaurar sessão:', error);
        // Limpar dados inválidos
        localStorage.removeItem('aupus_user');
        localStorage.removeItem('aupus_token');
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Função para fazer login
  const login = async (username, password) => {
    try {
      setLoading(true);
      console.log('🔐 Iniciando login...');
      
      // Tentar login via storageService (que usa API ou localStorage)
      const credentials = { email: username, password };
      const result = await storageService.login(credentials);
      
      if (result.success) {
        const userData = result.user || result.data?.user;
        setUser(userData);
        setIsAuthenticated(true);
        console.log('✅ Login realizado com sucesso:', userData.nome || userData.name);
        return { success: true, user: userData };
      }
      
      // Se falhou na API, tentar método local original (fallback)
      return await loginLocal(username, password);
      
    } catch (error) {
      console.error('❌ Erro no login:', error);
      return { success: false, message: error.message || 'Erro interno do sistema' };
    } finally {
      setLoading(false);
    }
  };

  // Método de login local (fallback para compatibilidade)
  const loginLocal = async (username, password) => {
    try {
      // Verificar usuário admin padrão
      if (username === 'admin' && password === '123') {
        const adminUser = {
          id: 'admin',
          username: 'admin',
          name: 'Administrador',
          nome: 'Administrador', // Para compatibilidade com API
          email: 'admin@aupus.com',
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
      const users = getUsersFromStorage();
      const foundUser = users.find(u => 
        (u.username === username || u.email === username) && u.password === password
      );
      
      if (foundUser) {
        // Não salvar a senha no contexto
        const { password: _, ...userWithoutPassword } = foundUser;
        
        setUser(userWithoutPassword);
        setIsAuthenticated(true);
        localStorage.setItem('aupus_user', JSON.stringify(userWithoutPassword));
        console.log('✅ Login local realizado:', userWithoutPassword.name);
        return { success: true, user: userWithoutPassword };
      }

      return { success: false, message: 'Usuário ou senha inválidos' };
      
    } catch (error) {
      console.error('❌ Erro no login local:', error);
      return { success: false, message: 'Erro interno do sistema' };
    }
  };

  // Função para fazer logout
  const logout = async () => {
    try {
      console.log('🚪 Iniciando logout...');
      
      // Fazer logout via storageService
      await storageService.logout();
      
      // Limpar estado local
      setUser(null);
      setIsAuthenticated(false);
      
      console.log('✅ Logout realizado com sucesso');
    } catch (error) {
      console.error('❌ Erro no logout:', error);
      // Mesmo com erro, limpar dados locais
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('aupus_user');
      localStorage.removeItem('aupus_token');
    }
  };

  // Função para criar usuário (consultor, gerente, vendedor)
  const createUser = async (userData) => {
    try {
      // Verificar se usuário atual tem permissão
      if (!canCreateUser(userData.role)) {
        throw new Error('Você não tem permissão para criar este tipo de usuário');
      }

      // Se API estiver disponível, tentar criar via API
      if (storageService.useAPI) {
        try {
          const result = await apiService.criarUsuario(userData);
          console.log('✅ Usuário criado via API:', result);
          return result;
        } catch (error) {
          console.warn('⚠️ Falha na API, criando localmente:', error);
        }
      }

      // Fallback para criação local
      return await createUserLocal(userData);
      
    } catch (error) {
      console.error('❌ Erro ao criar usuário:', error);
      throw error;
    }
  };

  // Criação local de usuário (fallback)
  const createUserLocal = async (userData) => {
    const users = getUsersFromStorage();
    
    // Verificar se username já existe
    if (users.find(u => u.username === userData.username)) {
      throw new Error('Nome de usuário já existe');
    }

    // Definir permissões baseadas no role
    const permissions = getPermissionsByRole(userData.role);
    
    const newUser = {
      id: Date.now().toString(),
      username: userData.username,
      password: userData.password,
      name: userData.name,
      email: userData.email || `${userData.username}@aupus.com`,
      role: userData.role,
      permissions,
      createdBy: user.id,
      createdAt: new Date().toISOString(),
      subordinates: [],
      managerId: userData.managerId || null // ID do gerente para vendedores
    };

    users.push(newUser);
    saveUsersToStorage(users);

    // Adicionar aos subordinados do usuário atual ou do gerente
    const supervisorId = userData.managerId || user.id;
    addSubordinateToUser(supervisorId, newUser.id);

    console.log('✅ Usuário criado localmente:', newUser.name);
    return newUser;
  };

  // Função para verificar se pode criar usuário
  const canCreateUser = (role) => {
    if (!user) return false;
    
    switch (user.role) {
      case 'admin':
        return ['consultor', 'gerente'].includes(role);
      case 'consultor':
        return ['gerente', 'vendedor'].includes(role);
      case 'gerente':
        return role === 'vendedor';
      default:
        return false;
    }
  };

  // Verificar permissão
  const hasPermission = (permission) => {
    if (!user) return false;
    if (user.role === 'admin') return true; // Admin tem todas as permissões
    return user.permissions?.[permission] || false;
  };

  // Verificar acesso a página
  const canAccessPage = (page) => {
    if (!user) return false;
    
    switch (page) {
      case 'dashboard':
        return true; // Todos podem acessar dashboard
      case 'prospec':
      case 'controle':
        return ['admin', 'consultor', 'gerente', 'vendedor'].includes(user.role);
      case 'ugs':
        return user.role === 'admin';
      case 'relatorios':
        return ['admin', 'consultor', 'gerente'].includes(user.role);
      default:
        return false;
    }
  };

  // Obter IDs da equipe
  const getMyTeamIds = () => {
    if (!user) return [];
    
    if (user.role === 'admin') {
      // Admin vê todos
      const users = getUsersFromStorage();
      return users.map(u => u.id);
    }
    
    // Incluir o próprio usuário + subordinados
    return [user.id, ...(user.subordinates || [])];
  };

  // Obter dados da equipe
  const getMyTeam = async () => {
    try {
      // Se API disponível, buscar da API
      if (storageService.useAPI) {
        try {
          const teamData = await storageService.getTeam();
          return teamData;
        } catch (error) {
          console.warn('⚠️ Falha na API, usando dados locais:', error);
        }
      }
      
      // Fallback para dados locais
      return getMyTeamLocal();
      
    } catch (error) {
      console.error('❌ Erro ao obter equipe:', error);
      return [];
    }
  };

  // Obter equipe local (fallback)
  const getMyTeamLocal = () => {
    if (!user) return [];
    
    const users = getUsersFromStorage();
    const teamIds = getMyTeamIds();
    
    return users
      .filter(u => teamIds.includes(u.id))
      .map(u => ({
        id: u.id,
        name: u.name,
        username: u.username,
        role: u.role,
        email: u.email
      }));
  };

  // Funções auxiliares (mantidas do código original)
  const getUsersFromStorage = () => {
    try {
      const users = localStorage.getItem('aupus_users');
      return users ? JSON.parse(users) : [];
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
      return [];
    }
  };

  const saveUsersToStorage = (users) => {
    try {
      localStorage.setItem('aupus_users', JSON.stringify(users));
    } catch (error) {
      console.error('Erro ao salvar usuários:', error);
    }
  };

  const getPermissionsByRole = (role) => {
    switch (role) {
      case 'admin':
        return {
          canCreateConsultors: true,
          canAccessAll: true,
          canManageUGs: true,
          canManageCalibration: true,
          canSeeAllData: true
        };
      case 'consultor':
        return {
          canCreateConsultors: false,
          canAccessAll: false,
          canManageUGs: false,
          canManageCalibration: true,
          canSeeAllData: false
        };
      default:
        return {
          canCreateConsultors: false,
          canAccessAll: false,
          canManageUGs: false,
          canManageCalibration: false,
          canSeeAllData: false
        };
    }
  };

  const addSubordinateToUser = (supervisorId, subordinateId) => {
    const users = getUsersFromStorage();
    const supervisor = users.find(u => u.id === supervisorId);
    
    if (supervisor) {
      if (!supervisor.subordinates) supervisor.subordinates = [];
      if (!supervisor.subordinates.includes(subordinateId)) {
        supervisor.subordinates.push(subordinateId);
        saveUsersToStorage(users);
      }
    }
  };

  // Obter nome do consultor responsável para uma proposta
  const getConsultorName = (propostaConsultor) => {
    if (user?.role !== 'admin') {
      return propostaConsultor; // Para não-admins, mostrar quem realmente fez
    }

    // Para admin, encontrar o consultor responsável
    const users = getUsersFromStorage();
    const autor = users.find(u => u.name === propostaConsultor || u.username === propostaConsultor);
    
    if (!autor) return propostaConsultor;

    // Se o autor é um consultor, retornar ele mesmo
    if (autor.role === 'consultor') {
      return autor.name;
    }

    // Se é gerente ou vendedor, encontrar o consultor responsável
    const findConsultor = (userId) => {
      const currentUser = users.find(u => u.id === userId);
      if (!currentUser) return null;
      
      if (currentUser.role === 'consultor') {
        return currentUser.name;
      }
      
      if (currentUser.createdBy) {
        return findConsultor(currentUser.createdBy);
      }
      
      return null;
    };

    const consultorName = findConsultor(autor.id);
    return consultorName || propostaConsultor;
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    logout,
    createUser,
    canCreateUser,
    hasPermission,
    canAccessPage,
    getMyTeamIds,
    getMyTeam,
    getConsultorName
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};