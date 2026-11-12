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
    if (typeof document !== 'undefined') {
      document.title = 'Floody · Chuva, avisos e rotas';
      document.documentElement.lang = 'pt-BR';
    }
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

  const [sessionNotice, setSessionNotice] = useState('');
  // logout() never throws; a failed sign-out keeps the account and explains why.
  const handleLogout = async () => {
    const result = await logout();
    setSessionNotice(result?.error ?? '');
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
        app={user && <MainApp user={user} onLogout={handleLogout} theme={theme} onToggleTheme={toggleTheme}
          sessionNotice={sessionNotice} onDismissSessionNotice={() => setSessionNotice('')} />}
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
