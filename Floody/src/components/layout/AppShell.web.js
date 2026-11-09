import React from 'react';
import Icons from '../icons/Icons';
const driverTabs = [
  { id: 'dashboard', label: 'Central ao vivo', mobile: 'Painel', Icon: Icons.Dashboard },
  { id: 'mapa', label: 'Mapa de risco e rota', mobile: 'Mapa', Icon: Icons.Map },
  { id: 'veiculos', label: 'Meus veículos', mobile: 'Garagem', Icon: Icons.Car },
  { id: 'reportar', label: 'Reportar perigo', mobile: 'Alertar', Icon: Icons.Alert },
];
export default function AppShell({ user, activeTab, onTabChange, theme, onToggleTheme, onLogout, children }) {
  const tabs = user.tipo === 'admin' ? [{ id: 'admin_reportes', label: 'Validar ocorrências', mobile: 'Moderação', Icon: Icons.Check }] : driverTabs;
  const isSelected = id => activeTab === id || (id === 'reportar' && activeTab === 'sucesso_reporte');
  const ThemeIcon = theme === 'dark' ? Icons.Sun : Icons.Moon;
  return <div className="floody-pro-layout">
    <header className="mobile-header"><div className="mobile-logo"><h3>Floody</h3></div><div style={{ display: 'flex', gap: 8 }}><button onClick={onToggleTheme} className="mobile-logout-btn" aria-label="Alternar tema"><ThemeIcon /></button><button onClick={onLogout} className="mobile-logout-btn" aria-label="Sair"><Icons.Logout /></button></div></header>
    <aside className="pro-sidebar"><div className="logo-container"><h2>Floody</h2></div><nav className="pro-nav" aria-label="Navegação principal">{tabs.map(({ id, label, Icon }) => <button key={id} className={`nav-item ${isSelected(id) ? 'active' : ''}`} aria-current={isSelected(id) ? 'page' : undefined} onClick={() => onTabChange(id)}><Icon />{label}</button>)}</nav><div><button className="theme-toggle-btn" onClick={onToggleTheme}><span>Aparência</span><ThemeIcon /></button><div className="user-profile"><div className="user-info"><strong>{user.nome}</strong><span>Modo local</span></div><button className="logout-btn" onClick={onLogout} aria-label="Sair"><Icons.Logout /></button></div></div></aside>
    <main className="pro-workspace">{children}</main>
    <nav className="mobile-bottom-nav" aria-label="Navegação móvel">{tabs.map(({ id, mobile, Icon }) => <button key={id} className={`bottom-nav-item ${isSelected(id) ? 'active' : ''}`} aria-current={isSelected(id) ? 'page' : undefined} onClick={() => onTabChange(id)}><Icon /><span>{mobile}</span></button>)}</nav>
  </div>;
}
