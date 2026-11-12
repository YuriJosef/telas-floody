import React, { useState } from 'react';
import { useAuth } from '../store/AuthContext';

export default function AuthNavigator({ onLogin, onToggleTheme, theme, icons }) {
  const { signIn, signUp, resendConfirmation, backendConfigured } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [canResend, setCanResend] = useState(false);
  const ThemeIcon = theme === 'dark' ? icons.Sun : icons.Moon;

  async function run(action) {
    if (busy) return;
    if (!email.trim() || (action !== 'resend' && !password)) { setMessage('Informe e-mail e senha.'); return; }
    setBusy(true); setMessage('');
    try {
      if (action === 'signin') {
        const result = await signIn(email, password);
        if (result.error) { setMessage(result.error); setCanResend(Boolean(result.unconfirmed)); }
      } else if (action === 'signup') {
        const result = await signUp(email, password);
        if (result.error) setMessage(result.error);
        else if (result.confirmationSent) { setMessage(`Enviamos um link de confirmação para ${email.trim()}. Depois de confirmar, volte e toque em "Entrar".`); setCanResend(true); }
      } else {
        const result = await resendConfirmation(email);
        setMessage(result.error || 'Novo link de confirmação enviado, se o e-mail tiver cadastro pendente.');
      }
    } finally { setBusy(false); }
  }

  return <main className="auth-wrapper">
    <section className="auth-card">
      <div className="entry-toolbar">
        <div className="brand"><span className="brand-mark" aria-hidden="true">≈</span><strong>floody</strong></div>
        <button type="button" className="icon-button" onClick={onToggleTheme} aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}><ThemeIcon /></button>
      </div>
      <header className="entry-heading"><p className="source-label">Chuva, avisos e caminhos</p><h1>Entenda o entorno.<br />Planeje seu caminho.</h1></header>
      <p>Consulte avisos oficiais, estimativas de chuva, o mapa da região e relatos de outros usuários.</p>
      <p className="local-notice">Relatos de usuários não são verificados pelo Floody nem por autoridades. Para enviar um relato, entre com uma conta de e-mail confirmado.</p>
      <form className="auth-form" onSubmit={event => { event.preventDefault(); onLogin(name); }}>
        <label className="input-group">Como podemos chamar você? <span className="caption">Opcional</span><input maxLength={60} autoComplete="given-name" value={name} onChange={event => setName(event.target.value)} /></label>
        <button className="btn-primary">Continuar sem conta</button>
      </form>
      {backendConfigured ? <form className="auth-form" aria-labelledby="account-title" onSubmit={event => { event.preventDefault(); run('signin'); }}>
        <h2 id="account-title">Entrar ou criar conta</h2>
        <label className="input-group">E-mail<input type="email" required autoComplete="email" value={email} maxLength={254} onChange={event => setEmail(event.target.value)} /></label>
        <label className="input-group">Senha <span className="caption">Mínimo de 8 caracteres</span><input type="password" required minLength={8} autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} /></label>
        <button className="btn-primary" disabled={busy}>{busy ? 'Aguarde…' : 'Entrar'}</button>
        <button type="button" className="btn-action-secondary" disabled={busy} onClick={() => run('signup')}>Criar conta</button>
        {canResend && <button type="button" className="btn-action-secondary" disabled={busy} onClick={() => run('resend')}>Reenviar e-mail de confirmação</button>}
        {message && <p className="caption" role="status">{message}</p>}
      </form> : <p className="caption">Contas e envio de relatos indisponíveis: o serviço de relatos não está configurado neste aplicativo.</p>}
    </section>
  </main>;
}
