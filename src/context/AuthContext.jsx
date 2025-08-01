// src/context/AuthContext.js - Sistema de autenticação com hierarquia de usuários
import React, { createContext, useContext, useState, useEffect } from 'react';

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
    const savedUser = localStorage.getItem('aupus_user');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Erro ao carregar usuário salvo:', error);
        localStorage.removeItem('aupus_user');
      }
    }
    setLoading(false);
  }, []);

  // Função para fazer login
  const login = async (username, password) => {
    try {
      setLoading(true);
      
      // Verificar usuário admin padrão
      if (username === 'admin' && password === '123') {
        const adminUser = {
          id: 'admin',
          username: 'admin',
          name: 'Administrador',
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
        return { success: true, user: adminUser };
      }

      // Verificar usuários cadastrados
      const users = getUsersFromStorage();
      const foundUser = users.find(u => u.username === username && u.password === password);
      
      if (foundUser) {
        // Não salvar a senha no contexto
        const { password: _, ...userWithoutPassword } = foundUser;
        
        setUser(userWithoutPassword);
        setIsAuthenticated(true);
        localStorage.setItem('aupus_user', JSON.stringify(userWithoutPassword));
        return { success: true, user: userWithoutPassword };
      }

      return { success: false, message: 'Usuário ou senha inválidos' };
      
    } catch (error) {
      console.error('Erro no login:', error);
      return { success: false, message: 'Erro interno do sistema' };
    } finally {
      setLoading(false);
    }
  };

  // Função para fazer logout
  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('aupus_user');
  };

  // Função para criar usuário (consultor, gerente, vendedor)
  const createUser = async (userData) => {
    try {
      // Verificar se usuário atual tem permissão
      if (!canCreateUser(userData.role)) {
        throw new Error('Você não tem permissão para criar este tipo de usuário');
      }

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
      addSubordinate(newUser.id, supervisorId);

      return { success: true, user: newUser };
      
    } catch (error) {
      console.error('Erro ao criar usuário:', error);
      return { success: false, message: error.message };
    }
  };

  // Verificar se pode criar usuário
  const canCreateUser = (role) => {
    if (!user) return false;
    
    switch (user.role) {
      case 'admin':
        return role === 'consultor';
      case 'consultor':
        return ['gerente', 'vendedor'].includes(role);
      case 'gerente':
        return role === 'vendedor';
      default:
        return false;
    }
  };

  // Definir permissões por role
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
          canManageCalibration: false,
          canSeeAllData: false,
          canCreateManagers: true,
          canCreateSellers: true
        };
      case 'gerente':
        return {
          canCreateConsultors: false,
          canAccessAll: false,
          canManageUGs: false,
          canManageCalibration: false,
          canSeeAllData: false,
          canCreateManagers: false,
          canCreateSellers: true
        };
      case 'vendedor':
        return {
          canCreateConsultors: false,
          canAccessAll: false,
          canManageUGs: false,
          canManageCalibration: false,
          canSeeAllData: false,
          canCreateManagers: false,
          canCreateSellers: false
        };
      default:
        return {};
    }
  };

  // Adicionar subordinado
  const addSubordinate = (subordinateId, supervisorId = null) => {
    const users = getUsersFromStorage();
    const targetSupervisorId = supervisorId || user.id;
    const userIndex = users.findIndex(u => u.id === targetSupervisorId);
    
    if (userIndex !== -1) {
      if (!users[userIndex].subordinates) {
        users[userIndex].subordinates = [];
      }
      users[userIndex].subordinates.push(subordinateId);
      saveUsersToStorage(users);
      
      // Atualizar contexto local apenas se for o usuário atual
      if (targetSupervisorId === user.id) {
        setUser(prev => ({
          ...prev,
          subordinates: [...(prev.subordinates || []), subordinateId]
        }));
      }
    }
  };

  // Obter todos os IDs de funcionários sob responsabilidade do usuário atual
  const getMyTeamIds = () => {
    if (!user) return [];
    
    const users = getUsersFromStorage();
    
    if (user.role === 'admin') {
      // Admin vê todos os usuários (exceto ele mesmo)
      return users.filter(u => u.id !== user.id).map(u => u.id);
    }

    const teamIds = [user.id]; // Sempre incluir o próprio usuário

    // Função recursiva para buscar subordinados
    const getSubordinatesRecursively = (userId) => {
      const currentUser = users.find(u => u.id === userId);
      if (!currentUser || !currentUser.subordinates) return [];

      const directSubordinates = currentUser.subordinates;
      let allSubordinates = [...directSubordinates];

      // Para cada subordinado direto, buscar seus subordinados
      directSubordinates.forEach(subId => {
        allSubordinates = [...allSubordinates, ...getSubordinatesRecursively(subId)];
      });

      return allSubordinates;
    };

    const allSubordinates = getSubordinatesRecursively(user.id);
    teamIds.push(...allSubordinates);

    return [...new Set(teamIds)]; // Remover duplicados
  };

  // Obter usuários da equipe com dados completos
  const getMyTeam = () => {
    const teamIds = getMyTeamIds();
    const users = getUsersFromStorage();
    return users.filter(u => teamIds.includes(u.id));
  };

  // Verificar se usuário tem acesso a uma funcionalidade
  const hasPermission = (permission) => {
    return user?.permissions?.[permission] || false;
  };

  // Verificar se pode acessar página
  const canAccessPage = (page) => {
    if (!user) return false;
    
    // Admin pode acessar tudo
    if (user.role === 'admin') return true;
    
    // Páginas restritas por role
    switch (page) {
      case 'ugs':
        return user.role === 'admin';
      case 'controle':
        // ALTERAÇÃO: Controle apenas para admin e consultor
        return ['admin', 'consultor'].includes(user.role);
      case 'dashboard':
      case 'prospec':
      case 'relatorios':
        return ['admin', 'consultor', 'gerente', 'vendedor'].includes(user.role);
      default:
        return true;
    }
  };

  // Funções auxiliares para localStorage
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