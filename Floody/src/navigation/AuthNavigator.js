import React, { useState } from 'react';
export default function AuthNavigator({ onLogin, onToggleTheme }) {
  const [name, setName] = useState('');
  return <main className="auth-wrapper"><button className="theme-toggle-floating" onClick={onToggleTheme}>Alternar tema</button><section className="auth-card"><h1>Floody</h1><p>Monitoramento e rotas</p><p className="local-notice">Modo local: relatos e veículos ficam apenas neste navegador. Não há autenticação nem publicação de ocorrências.</p><form className="auth-form" onSubmit={event => { event.preventDefault(); onLogin(name); }}><label className="input-group">Como podemos chamar você?<input maxLength={60} autoComplete="given-name" value={name} onChange={event => setName(event.target.value)} /></label><button className="btn-primary">Continuar no modo local</button></form></section></main>;
}
