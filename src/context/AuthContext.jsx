// src/context/AuthContext.jsx
import React, { createContext, useContext, useReducer, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext();

// Estados da autenticação
const authInitialState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  sessionInfo: null
};

// Reducer para gerenciar estado da auth
const authReducer = (state, action) => {
  switch (action.type) {
    case 'AUTH_LOADING':
      return {
        ...state,
        isLoading: action.payload
      };

    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false
      };

    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        sessionInfo: null
      };

    case 'UPDATE_SESSION_INFO':
      return {
        ...state,
        sessionInfo: action.payload
      };

    case 'AUTH_ERROR':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        sessionInfo: null
      };

    default:
      return state;
  }
};

export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, authInitialState);

  // Verificar autenticação ao carregar a aplicação
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Verificar se usuário está autenticado
  const checkAuthStatus = async () => {
    try {
      dispatch({ type: 'AUTH_LOADING', payload: true });

      if (authService.isAuthenticated()) {
        const userData = authService.getUserData();
        const sessionInfo = authService.getSessionInfo();

        if (userData && sessionInfo && sessionInfo.isValid) {
          dispatch({ type: 'LOGIN_SUCCESS', payload: userData });
          dispatch({ type: 'UPDATE_SESSION_INFO', payload: sessionInfo });
        } else {
          // Sessão inválida, fazer logout
          authService.logout();
          dispatch({ type: 'AUTH_ERROR' });
        }
      } else {
        dispatch({ type: 'AUTH_ERROR' });
      }
    } catch (error) {
      console.error('❌ Erro ao verificar autenticação:', error);
      dispatch({ type: 'AUTH_ERROR' });
    } finally {
      dispatch({ type: 'AUTH_LOADING', payload: false });
    }
  };

  // Fazer login
  const login = async (userData) => {
    try {
      dispatch({ type: 'LOGIN_SUCCESS', payload: userData });
      const sessionInfo = authService.getSessionInfo();
      dispatch({ type: 'UPDATE_SESSION_INFO', payload: sessionInfo });
    } catch (error) {
      console.error('❌ Erro no login:', error);
      throw error;
    }
  };

  // Fazer logout
  const logout = async () => {
    try {
      authService.logout();
      dispatch({ type: 'LOGOUT' });
    } catch (error) {
      console.error('❌ Erro no logout:', error);
      // Mesmo com erro, limpar estado local
      dispatch({ type: 'LOGOUT' });
    }
  };

  // Verificar permissão
  const hasPermission = (permission) => {
    return authService.hasPermission(permission);
  };

  // Renovar sessão
  const renewSession = async () => {
    try {
      await authService.renewSession();
      const sessionInfo = authService.getSessionInfo();
      dispatch({ type: 'UPDATE_SESSION_INFO', payload: sessionInfo });
      return true;
    } catch (error) {
      console.error('❌ Erro ao renovar sessão:', error);
      logout();
      return false;
    }
  };

  // Valor do contexto
  const contextValue = {
    // Estado
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    isLoading: state.isLoading,
    sessionInfo: state.sessionInfo,

    // Ações
    login,
    logout,
    checkAuthStatus,
    hasPermission,
    renewSession
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook personalizado para usar o contexto
export const useAuth = () => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }

  return context;
};

export default AuthContext;