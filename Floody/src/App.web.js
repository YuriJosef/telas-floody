import React, { useState, useEffect } from 'react';
import MainApp from './features/app/MainApp.web';
import Icons from './components/icons/Icons';
import { storage } from './services/storage/storage';
import { AuthProvider, useAuth } from './store/AuthContext';
import AppNavigator from './navigation/AppNavigator';
import AuthNavigator from './navigation/AuthNavigator';
function AppContent() {
  const { user, loading: authLoading, login, logout } = useAuth();
  const [theme, setTheme] = useState('dark');
  const [themeLoaded, setThemeLoaded] = useState(false);

  useEffect(() => {
    if (typeof document !== 'undefined') document.title = 'Floody - Sistema Global de Monitoramento e Navegação';
  }, []);

  useEffect(() => {
    let active = true;
    storage.getItem('floody_theme')
      .then((savedTheme) => {
        if (active && (savedTheme === 'light' || savedTheme === 'dark')) setTheme(savedTheme);
      })
      .catch(() => {})
      .finally(() => { if (active) setThemeLoaded(true); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!themeLoaded) return;
    if (typeof document !== 'undefined') document.documentElement.setAttribute('data-theme', theme);
    storage.setItem('floody_theme', theme).catch(() => {});
  }, [theme, themeLoaded]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error(error);
    }
  };

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  return (
    <>
      <AppNavigator
        loading={authLoading}
        authenticated={Boolean(user)}
        auth={<AuthNavigator onLogin={login} theme={theme} onToggleTheme={toggleTheme} icons={Icons} />}
        app={user && <MainApp user={user} onLogout={handleLogout} theme={theme} onToggleTheme={toggleTheme} />}
      />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
