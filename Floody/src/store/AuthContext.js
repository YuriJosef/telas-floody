import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../services/supabase/client';
import { authMessage } from './authMessages';

const AuthContext = createContext(null);

// Guests browse without an account. Signed-in users come from Supabase Auth. Whether a user may
// submit is decided by the server on every request; `emailVerified` here is only for the UI.
// No client-side roles: `tipo` is always 'condutor'.
const guestUser = name => ({ id: 'guest', nome: String(name ?? '').trim().slice(0, 60) || 'Visitante', tipo: 'condutor', guest: true });
const accountUser = user => ({
  id: user.id,
  // No e-mail or e-mail-derived name in the app's user object: the UI shows only "Minha conta".
  nome: 'Minha conta',
  tipo: 'condutor',
  guest: false,
  emailVerified: Boolean(user.email_confirmed_at),
});

export function AuthProvider({ children }) {
  const [guest, setGuest] = useState(null);
  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(Boolean(supabase));

  useEffect(() => {
    if (!supabase) return undefined;
    let active = true;
    supabase.auth.getSession()
      .then(({ data }) => { if (active) setAccount(data.session?.user ? accountUser(data.session.user) : null); })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setAccount(session?.user ? accountUser(session.user) : null);
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);

  const login = useCallback(async name => setGuest(guestUser(name)), []);

  const signIn = useCallback(async (email, password) => {
    if (!supabase) return { error: 'Contas indisponíveis: serviço não configurado.' };
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      return error ? { error: authMessage(error), unconfirmed: /confirm/i.test(error.message ?? '') } : {};
    } catch (error) { return { error: authMessage(error) }; }
  }, []);

  const signUp = useCallback(async (email, password) => {
    if (!supabase) return { error: 'Contas indisponíveis: serviço não configurado.' };
    const emailRedirectTo = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : undefined;
    try {
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo } });
      if (error) return { error: authMessage(error) };
      // With e-mail confirmation on, no session is returned until the address is confirmed.
      return { confirmationSent: !data.session };
    } catch (error) { return { error: authMessage(error) }; }
  }, []);

  const resendConfirmation = useCallback(async email => {
    if (!supabase) return { error: 'Contas indisponíveis: serviço não configurado.' };
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim() });
      return error ? { error: authMessage(error) } : {};
    } catch (error) { return { error: authMessage(error) }; }
  }, []);

  const logout = useCallback(async () => {
    setGuest(null);
    if (supabase && account) {
      // Sign out this device only, not the user's other sessions.
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) setAccount(null);
    }
  }, [account]);

  const value = useMemo(() => ({
    user: account ?? guest,
    loading,
    backendConfigured: Boolean(supabase),
    login, logout, signIn, signUp, resendConfirmation,
  }), [account, guest, loading, login, logout, signIn, signUp, resendConfirmation]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
