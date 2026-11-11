// User-facing (pt-BR) messages for Supabase Auth errors. Never includes tokens or passwords.
export function authMessage(error) {
  const text = `${error?.code ?? ''} ${error?.message ?? ''}`.toLowerCase();
  if (text.includes('email_not_confirmed') || text.includes('not confirmed')) return 'Confirme seu e-mail pelo link que enviamos antes de entrar.';
  if (text.includes('invalid_credentials') || text.includes('invalid login')) return 'E-mail ou senha incorretos.';
  if (text.includes('user_already_exists') || text.includes('already registered')) return 'Este e-mail já tem conta. Use "Entrar".';
  if (text.includes('weak_password') || text.includes('password should')) return 'Use uma senha com pelo menos 8 caracteres.';
  if (text.includes('rate') || text.includes('429')) return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
  if (text.includes('email_address_invalid') || text.includes('invalid email')) return 'Informe um e-mail válido.';
  // The request never reached the account service (offline, blocked, or a server address this device cannot reach).
  if (error?.name === 'AuthRetryableFetchError' || error?.status === 0 || /network request failed|failed to fetch|load failed|networkerror|fetch failed/.test(text)) {
    return 'Não foi possível conectar ao serviço de contas. Verifique a internet e tente novamente.';
  }
  // Unknown failures show their code (never a token or password) so the cause can be identified.
  const code = typeof error?.code === 'string' && /^[a-z0-9_]{2,64}$/i.test(error.code) ? error.code
    : Number.isInteger(error?.status) ? `HTTP ${error.status}` : null;
  return code ? `Não foi possível concluir (${code}). Tente novamente.` : 'Não foi possível concluir. Tente novamente.';
}
