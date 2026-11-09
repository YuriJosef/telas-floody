import React from 'react';
export default function AppNavigator({ loading, authenticated, auth, app }) {
  return loading ? <p role="status">Carregando…</p> : authenticated ? app : auth;
}
