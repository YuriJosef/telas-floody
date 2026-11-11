import React from 'react';
import Icons from '../icons/Icons';

const destinations = [
  { id: 'dashboard', label: 'Painel', Icon: Icons.Dashboard },
  { id: 'mapa', label: 'Mapa', Icon: Icons.Map },
  { id: 'veiculos', label: 'Garagem', Icon: Icons.Car },
  { id: 'reportar', label: 'Relatar', Icon: Icons.Alert },
];

export default function AppShell({ user, activeTab, onTabChange, theme, onToggleTheme, onLogout, children }) {
  const tabs = user.tipo === 'admin'
    ? [{ id: 'admin_reportes', label: 'Moderação', Icon: Icons.Check }]
    : destinations;
  const ThemeIcon = theme === 'dark' ? Icons.Sun : Icons.Moon;
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Ir para o conteúdo</a>
      <header className="app-header">
        <div className="brand"><span className="brand-mark" aria-hidden="true">≈</span><strong>floody</strong></div>
        <span className="brand-caption">Chuva, avisos e caminhos</span>
        <p className="account-chip" data-kind={user.guest ? 'guest' : 'account'} title={user.guest ? 'Modo visitante, sem conta' : 'Conectado a uma conta'}>
          <span className="account-dot" aria-hidden="true" />
          <span className="account-label-full" aria-hidden="true">{user.guest ? 'Visitante · sem conta' : 'Minha conta'}</span>
          <span className="account-label-short" aria-hidden="true">{user.guest ? 'Visitante' : 'Conta'}</span>
          <span className="visually-hidden">{user.guest ? 'Modo visitante, sem conta' : 'Conectado a uma conta'}</span>
        </p>
        <div className="header-actions" role="group" aria-label="Aparência e sessão">
          <button className="icon-button" onClick={onToggleTheme} aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}><ThemeIcon /></button>
          <button className="icon-button" onClick={onLogout} aria-label={user.guest ? "Voltar à tela inicial" : "Sair da conta"}><Icons.Logout /></button>
        </div>
      </header>
      <nav className="app-nav" aria-label="Navegação principal">
        {tabs.map(({ id, label, Icon }) => {
          const selected = activeTab === id || (id === 'reportar' && activeTab === 'sucesso_reporte');
          return <button key={id} aria-current={selected ? 'page' : undefined} onClick={() => onTabChange(id)}>
            <span className="nav-icon"><Icon /></span><span>{label}</span>
          </button>;
        })}
      </nav>
      <main id="main-content" className="pro-workspace" tabIndex={-1}>{children}</main>
    </div>
  );
}
