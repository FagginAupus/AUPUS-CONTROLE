// src/components/common/Navigation.jsx - Atualizada com ícones Lucide React
import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import apiService from '../../services/apiService';
import {
  Home,
  Plus,
  FileSearch,
  Settings,
  Zap,
  FileBarChart,
  LogOut,
  Crown,
  Briefcase,
  User,
  Users,
  ScrollText,
  UserCheck
} from 'lucide-react';
import './Navigation.css';

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, canAccessPage, logout } = useAuth();
  const [pendentesValidacao, setPendentesValidacao] = useState(0);

  // Verificar se usuário é admin ou analista
  const isAdminOrAnalista = user?.role === 'admin' || user?.role === 'analista';

  // Carregar contagem de pendentes de validação
  const carregarPendentesValidacao = useCallback(async () => {
    if (!isAdminOrAnalista) return;

    try {
      const response = await apiService.request('/associados/pendentes-validacao');
      if (response.success) {
        setPendentesValidacao(response.data?.length || 0);
      }
    } catch (error) {
      console.error('Erro ao carregar pendentes de validação:', error);
    }
  }, [isAdminOrAnalista]);

  // Carregar pendentes ao montar e a cada 60 segundos
  useEffect(() => {
    carregarPendentesValidacao();

    const interval = setInterval(carregarPendentesValidacao, 60000);
    return () => clearInterval(interval);
  }, [carregarPendentesValidacao]);

  const menuItems = [
    { 
      id: 'inicio', 
      label: 'INÍCIO', 
      icon: Home,
      path: '/',
      paths: ['/', '/dashboard'],
      requiredPage: 'dashboard'
    },
    { 
      id: 'nova-proposta', 
      label: 'NOVA PROPOSTA', 
      icon: Plus,
      path: '/nova-proposta',
      requiredPage: 'prospec'
    },
    {
      id: 'prospec',
      label: 'PROSPEC',
      icon: FileSearch,
      path: '/prospec',
      requiredPage: 'prospec'
    },
    {
      id: 'validacao-associados',
      label: 'VALIDAR',
      icon: UserCheck,
      path: '/validacao-associados',
      requiredPage: null,
      adminOrAnalista: true,
      hasBadge: true
    },
    {
      id: 'associados',
      label: 'ASSOCIADOS',
      icon: Users,
      path: '/associados',
      requiredPage: null,
      adminOrAnalista: true
    },
    {
      id: 'controle',
      label: 'CONTROLE',
      icon: Settings,
      path: '/controle',
      requiredPage: 'controle'
    },
    {
      id: 'ugs',
      label: 'UGs',
      icon: Zap,
      path: '/ugs',
      requiredPage: 'ugs'
    },
    {
      id: 'relatorios',
      label: 'RELATÓRIOS',
      icon: FileBarChart,
      path: '/relatorios',
      requiredPage: 'relatorios'
    }
  ];

  // Filtrar itens baseado nas permissões do usuário
  const visibleMenuItems = menuItems.filter(item => {
    // Se é admin only, verificar se o usuário é admin
    if (item.adminOnly) {
      return user?.role === 'admin';
    }

    // Se é admin ou analista only
    if (item.adminOrAnalista) {
      return isAdminOrAnalista;
    }

    // Se tem página requerida, verificar permissão
    if (item.requiredPage) {
      return canAccessPage(item.requiredPage);
    }

    // Caso contrário, mostrar o item
    return true;
  });

  const isActive = (item) => {
    if (item.paths) {
      return item.paths.includes(location.pathname);
    }
    return location.pathname === item.path;
  };

  const handleNavigation = (path) => {
    navigate(path);
  };

  const handleLogout = async () => {
    if (window.confirm('Deseja realmente sair do sistema?')) {
      try {
        // NÃO aguardar o logout completar
        logout();
        
        // Redirecionamento IMEDIATO
        window.location.href = '/login';
      } catch (error) {
        console.error('Erro no logout:', error);
        window.location.href = '/login';
      }
    }
  };

  const getRoleIcon = (role) => {
    const icons = {
      admin: Crown,
      consultor: Briefcase,
      analista: FileBarChart,
      gerente: Users,
      vendedor: User
    };
    return icons[role] || User;
  };

  const getRoleLabel = (role) => {
    const labels = {
      admin: 'Administrador',
      consultor: 'Consultor',
      analista: 'Analista',
      gerente: 'Gerente',
      vendedor: 'Vendedor'
    };
    return labels[role] || role;
  };

  const RoleIcon = getRoleIcon(user?.role);

  return (
    <nav className="navigation">
      <div className="nav-container">
        {/* Menu Items */}
        <div className="nav-menu">
          {visibleMenuItems.map((item) => {
            const IconComponent = item.icon;
            const badgeCount = item.hasBadge ? pendentesValidacao : 0;

            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.path)}
                className={`nav-item ${isActive(item) ? 'active' : ''} ${badgeCount > 0 ? 'has-badge' : ''}`}
                title={item.label}
                data-id={item.id}
              >
                <span className="nav-icon">
                  <IconComponent size={20} />
                </span>
                <span className="nav-label">{item.label}</span>
                {badgeCount > 0 && (
                  <span className="nav-badge">{badgeCount > 99 ? '99+' : badgeCount}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* User Info e Logout */}
        <div className="nav-user">  
          <button onClick={handleLogout} className="logout-btn" title="Sair do sistema">
            <span className="logout-icon">
              <LogOut size={18} />
            </span>
            <span className="logout-label">Sair</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;

{/* Apenas Logout */}
        <div className="nav-user">
          
        </div>