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

  // Verificar se há usuário salvo ao inicializar
  useEffect(() => {
    const initAuth = () => {
      try {
        const savedUser = localStorage.getItem('user'); // Usar 'user' como no storageService
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

  // Carregar usuários para admins
  useEffect(() => {
    const loadUsers = async () => {
      if (user && isAuthenticated) {
        try {
          console.log('👥 Carregando usuários para admin...');
          const response = await apiService.getUsuarios();
          
          if (response?.success && response?.data) {
            let usuarios = [];
            
            // Verificar se data é paginado ou array direto
            if (response.data.data && Array.isArray(response.data.data)) {
              // Resposta paginada
              usuarios = response.data.data;
            } else if (Array.isArray(response.data)) {
              // Array direto
              usuarios = response.data;
            } else {
              console.warn('⚠️ Estrutura de usuários inesperada:', response.data);
              return;
            }
            
            const usuariosFormatados = usuarios.map(usuario => ({
              id: usuario.id,
              name: usuario.nome || usuario.name,
              email: usuario.email,
              role: usuario.role,
              status: usuario.status,
              telefone: usuario.telefone
            }));
            
            localStorage.setItem('usuarios', JSON.stringify(usuariosFormatados));
            console.log(`✅ ${usuariosFormatados.length} usuários carregados na inicialização`);
          }
        } catch (error) {
          console.error('❌ Erro ao carregar usuários na inicialização:', error);
        }
      }
    };

    loadUsers();
  }, [user?.role, isAuthenticated]);

  const loadTeamFromAPI = async () => {
    try {
      console.log('👥 Carregando equipe da API...');
      const response = await apiService.getUsuarios();
      
      if (response?.success && response?.data) {
        let usuarios = [];
        
        // Verificar se data é paginado ou array direto
        if (response.data.data && Array.isArray(response.data.data)) {
          usuarios = response.data.data;
        } else if (Array.isArray(response.data)) {
          usuarios = response.data;
        }
        
        const usuariosFormatados = usuarios.map(usuario => ({
          id: usuario.id,
          name: usuario.nome || usuario.name,
          email: usuario.email,
          role: usuario.role,
          status: usuario.status,
          telefone: usuario.telefone
        }));
        
        localStorage.setItem('usuarios', JSON.stringify(usuariosFormatados));
        console.log(`✅ ${usuariosFormatados.length} usuários carregados para equipe`);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar equipe da API:', error);
    }
  };

  
  const login = async (email, password) => {
    setLoading(true);
    console.log('🔐 Iniciando login...');
    
    try {
      // CORREÇÃO: storageService.login retorna userData diretamente, não um objeto {success, user}
      const userData = await storageService.login(email, password);
      
      console.log('🔐 AuthContext - Resposta do storageService:', userData);
      
      // CORREÇÃO: storageService.login retorna userData ou lança erro
      if (userData && (userData.id || userData.name || userData.nome)) {
        console.log('✅ AuthContext - Definindo usuário:', userData);
        setUser(userData);
        setIsAuthenticated(true);
        console.log('✅ AuthContext - Estados atualizados');
        return { success: true, user: userData };
      }
      
      // Se chegou aqui, userData é inválido
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
      
      // Usar logout do storageService
      storageService.logout();
      
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

  const getMyTeam = () => {
    try {
      if (!user?.id) return [];

      if (user.role === 'admin') {
        const usuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
        return usuarios;
      }

      // ✅ CORREÇÃO: Filtrar por manager_id, não por role
      const todosUsuarios = JSON.parse(localStorage.getItem('usuarios') || '[]');
      
      // Subordinados diretos (onde manager_id = user.id)
      const subordinadosDirectos = todosUsuarios.filter(u => u.manager_id === user.id);
      
      console.log(`👥 getMyTeam (${user.role}): ${subordinadosDirectos.length} subordinados diretos`);
      return [...subordinadosDirectos, user]; // Incluir usuário atual
      
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
      // ✅ CORREÇÃO: Determinar manager_id automaticamente
      let managerId = null;
      
      if (userData.role === 'gerente' || userData.role === 'vendedor') {
        // Se for gerente/vendedor, o manager é o usuário logado
        managerId = user.id;
      }
      
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
        manager_id: managerId  
      });


      if (response?.success) {
        console.log('✅ Usuário criado com sucesso:', response);
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