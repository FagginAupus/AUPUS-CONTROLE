// src/context/ThemeContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  // Temas disponíveis
  const themes = {
    'dark-gray': {
      id: 'dark-gray',
      name: 'Dark Cinza',
      description: 'Tema escuro com tons de cinza'
    },
    'dark-blue': {
      id: 'dark-blue',
      name: 'Dark Azul',
      description: 'Tema escuro com tons de azul'
    }
    // Futuramente adicionar 'light-gray' e 'light-blue'
  };

  // Carregar tema salvo no localStorage ou usar dark-gray como padrão
  const [currentTheme, setCurrentTheme] = useState(() => {
    const savedTheme = localStorage.getItem('app-theme');
    return savedTheme && themes[savedTheme] ? savedTheme : 'dark-gray';
  });

  // Aplicar classe no body quando o tema mudar
  useEffect(() => {
    // Remover todas as classes de tema
    Object.keys(themes).forEach(themeId => {
      document.body.classList.remove(`theme-${themeId}`);
    });

    // Adicionar classe do tema atual
    document.body.classList.add(`theme-${currentTheme}`);

    // Salvar no localStorage
    localStorage.setItem('app-theme', currentTheme);

    console.log('🎨 Tema alterado para:', themes[currentTheme].name);
  }, [currentTheme]);

  const changeTheme = (themeId) => {
    if (themes[themeId]) {
      setCurrentTheme(themeId);
    } else {
      console.error('Tema não encontrado:', themeId);
    }
  };

  const value = {
    currentTheme,
    themes,
    changeTheme,
    isDark: currentTheme.startsWith('dark'),
    isBlueTheme: currentTheme.includes('blue'),
    getThemeInfo: () => themes[currentTheme]
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeContext;
