import React, { createContext, useContext, useState } from 'react';
const AuthContext = createContext(null);
// Local guest mode only: no passwords, tokens or client-side administrator roles.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const login = async (name = 'Visitante') => setUser({ id: 'local-device', nome: String(name).trim().slice(0, 60) || 'Visitante', tipo: 'condutor' });
  const logout = async () => setUser(null);
  return <AuthContext.Provider value={{ user, loading: false, login, logout }}>{children}</AuthContext.Provider>;
}
export const useAuth = () => useContext(AuthContext);
