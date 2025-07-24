// src/services/authService.js
import Cookies from 'js-cookie';

class AuthService {
  constructor() {
    this.TOKEN_KEY = 'aupus_auth_token';
    this.USER_KEY = 'aupus_user_data';
    this.SESSION_DURATION = 8; // 8 horas
    
    // Usuários pré-definidos (substituto temporário do banco)
    this.users = [
      {
        id: 1,
        username: 'admin',
        password: 'aupus2025',
        name: 'Administrador',
        role: 'admin',
        permissions: ['all']
      },
      {
        id: 2,
        username: 'consultor1',
        password: '123456',
        name: 'João Silva',
        role: 'consultor',
        permissions: ['prospec', 'nova-proposta']
      },
      {
        id: 3,
        username: 'operador',
        password: 'op2025',
        name: 'Maria Santos',
        role: 'operador',
        permissions: ['prospec', 'controle', 'ugs']
      }
    ];
  }

  // Login do usuário
  async login(username, password) {
    try {
      // Simular delay de requisição
      await new Promise(resolve => setTimeout(resolve, 800));

      const user = this.users.find(u => 
        u.username === username && u.password === password
      );

      if (!user) {
        throw new Error('Usuário ou senha inválidos');
      }

      // Gerar token simples (em produção usar JWT)
      const token = this.generateToken(user);
      
      // Salvar dados de autenticação
      Cookies.set(this.TOKEN_KEY, token, { 
        expires: this.SESSION_DURATION / 24,
        secure: window.location.protocol === 'https:',
        sameSite: 'strict'
      });

      const userData = {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        permissions: user.permissions,
        loginTime: new Date().toISOString()
      };

      localStorage.setItem(this.USER_KEY, JSON.stringify(userData));

      console.log('✅ Login realizado:', userData.name);
      return { success: true, user: userData };

    } catch (error) {
      console.error('❌ Erro no login:', error.message);
      throw error;
    }
  }

  // Logout do usuário
  logout() {
    try {
      Cookies.remove(this.TOKEN_KEY);
      localStorage.removeItem(this.USER_KEY);
      
      console.log('✅ Logout realizado');
      return { success: true };
    } catch (error) {
      console.error('❌ Erro no logout:', error);
      throw error;
    }
  }

  // Verificar se usuário está autenticado
  isAuthenticated() {
    const token = Cookies.get(this.TOKEN_KEY);
    const userData = this.getUserData();
    
    return !!(token && userData);
  }

  // Obter dados do usuário logado
  getUserData() {
    try {
      const userData = localStorage.getItem(this.USER_KEY);
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('❌ Erro ao obter dados do usuário:', error);
      return null;
    }
  }

  // Verificar permissão
  hasPermission(permission) {
    const user = this.getUserData();
    if (!user) return false;
    
    // Admin tem todas as permissões
    if (user.permissions.includes('all')) return true;
    
    return user.permissions.includes(permission);
  }

  // Gerar token simples
  generateToken(user) {
    const payload = {
      userId: user.id,
      username: user.username,
      role: user.role,
      timestamp: Date.now()
    };
    
    // Em produção, usar biblioteca JWT
    return btoa(JSON.stringify(payload));
  }

  // Validar token
  validateToken(token) {
    try {
      const payload = JSON.parse(atob(token));
      const now = Date.now();
      const tokenAge = now - payload.timestamp;
      const maxAge = this.SESSION_DURATION * 60 * 60 * 1000; // 8 horas em ms
      
      return tokenAge < maxAge;
    } catch (error) {
      return false;
    }
  }

  // Obter informações da sessão
  getSessionInfo() {
    const user = this.getUserData();
    const token = Cookies.get(this.TOKEN_KEY);
    
    if (!user || !token) return null;

    try {
      const payload = JSON.parse(atob(token));
      const loginTime = new Date(payload.timestamp);
      const expiresAt = new Date(loginTime.getTime() + (this.SESSION_DURATION * 60 * 60 * 1000));
      
      return {
        user,
        loginTime,
        expiresAt,
        isValid: this.validateToken(token)
      };
    } catch (error) {
      return null;
    }
  }

  // Renovar sessão
  async renewSession() {
    const user = this.getUserData();
    if (!user) throw new Error('Usuário não autenticado');

    const userRecord = this.users.find(u => u.id === user.id);
    if (!userRecord) throw new Error('Usuário não encontrado');

    // Gerar novo token
    const newToken = this.generateToken(userRecord);
    
    Cookies.set(this.TOKEN_KEY, newToken, { 
      expires: this.SESSION_DURATION / 24,
      secure: window.location.protocol === 'https:',
      sameSite: 'strict'
    });

    console.log('✅ Sessão renovada');
    return { success: true };
  }
}

export default new AuthService();