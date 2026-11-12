// Session helpers kept free of React so they can be unit-tested.

export const SIGN_OUT_FAILED = 'Não foi possível sair desta conta neste aparelho. Tente novamente.';

// The app's user object for a Supabase session. No e-mail or e-mail-derived name: the UI shows only
// "Minha conta". Whether the user may submit is decided by the server on every request.
export function accountFromSession(session) {
  const user = session?.user;
  if (!user?.id) return null;
  return { id: user.id, nome: 'Minha conta', tipo: 'condutor', guest: false, emailVerified: Boolean(user.email_confirmed_at) };
}

// Signs out this device only (`scope: 'local'`; other devices keep their sessions). The outcome is
// judged by the session actually left in storage, never by the error alone: supabase-js 2.119 removes
// the local session before contacting the server, so an offline sign-out still succeeds locally, but a
// storage failure throws and leaves the session in place.
export async function signOutThisDevice(auth) {
  try {
    await auth.signOut({ scope: 'local' });
  } catch {
    // Checked below against the stored session.
  }
  let session;
  try {
    ({ data: { session } } = await auth.getSession());
  } catch {
    return { signedOut: false, error: SIGN_OUT_FAILED };
  }
  return session ? { signedOut: false, session, error: SIGN_OUT_FAILED } : { signedOut: true };
}
