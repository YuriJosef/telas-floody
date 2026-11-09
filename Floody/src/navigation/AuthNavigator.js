import React, { useState } from 'react';
export default function AuthNavigator({ onLogin, onToggleTheme, theme, icons }) {
  const [name, setName] = useState('');
  const ThemeIcon = theme === 'dark' ? icons.Sun : icons.Moon;
  return <main className="auth-wrapper">
    <section className="auth-card">
      <div className="entry-toolbar">
        <div className="brand"><span className="brand-mark" aria-hidden="true">≈</span><strong>floody</strong></div>
        <button type="button" className="icon-button" onClick={onToggleTheme} aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}><ThemeIcon /></button>
      </div>
      <header className="entry-heading"><p className="source-label">Chuva, avisos e caminhos</p><h1>Entenda o entorno.<br />Planeje seu caminho.</h1></header>
      <p>Consulte avisos oficiais, estimativas de chuva e o mapa da região.</p>
      <p className="local-notice">Modo local: relatos e veículos ficam apenas neste navegador. Não há autenticação nem publicação de ocorrências.</p>
      <form className="auth-form" onSubmit={event => { event.preventDefault(); onLogin(name); }}>
        <label className="input-group">Como podemos chamar você? <span className="caption">Opcional</span><input maxLength={60} autoComplete="given-name" value={name} onChange={event => setName(event.target.value)} /></label>
        <button className="btn-primary">Continuar no modo local</button>
      </form>
    </section>
  </main>;
}
