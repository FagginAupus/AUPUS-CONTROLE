// src/components/common/Navigation.jsx - Atualizada com ícones Lucide React
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
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
  Users
} from 'lucide-react';
import './Navigation.css';

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, canAccessPage, logout } = useAuth();

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
  // TEMPORARIAMENTE COMENTADO
  // { 
  //   id: 'relatorios', 
  //   label: 'RELATÓRIOS', 
  //   icon: FileBarChart,
  //   path: '/relatorios',
  //   requiredPage: 'relatorios'
  // }
  ];

  // Filtrar itens baseado nas permissões do usuário
  const visibleMenuItems = menuItems.filter(item => {
    if (!item.requiredPage) return true;
    return canAccessPage(item.requiredPage);
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
      gerente: Users,
      vendedor: User
    };
    return icons[role] || User;
  };

  const getRoleLabel = (role) => {
    const labels = {
      admin: 'Administrador',
      consultor: 'Consultor',
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
            return (
              <button
                key={item.id}
                onClick={() => handleNavigation(item.path)}
                className={`nav-item ${isActive(item) ? 'active' : ''}`}
                title={item.label}
                data-id={item.id}
              >
                <span className="nav-icon">
                  <IconComponent size={20} />
                </span>
                <span className="nav-label">{item.label}</span>
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