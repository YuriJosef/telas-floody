import React, { useEffect, useState } from 'react';
import { Pressable, Text, View, StyleSheet, useColorScheme } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import googleSansFlex from '../assets/fonts/GoogleSansFlex.ttf';
import MaterialIcon from './components/native/MaterialIcon.native';
import DashboardScreen from './features/dashboard/DashboardScreen.native';
import MapScreen from './features/map/MapScreen.native';
import ReportScreen from './features/reports/screens/ReportScreen.native';
import VehiclesScreen from './features/profile/VehiclesScreen.native';
import { Button, Card, Field, NativeTheme, Page, useNativeTheme } from './components/native/ui';
import { AuthProvider, useAuth } from './store/AuthContext';
import { storage } from './services/storage/storage';
import { env } from './config/env';
import { isLoopbackUrl } from './services/supabase/createSupabase';

// Development only: a bundle built against a local Supabase cannot sign in from a physical phone.
const localBackendInDev = process.env.NODE_ENV !== 'production' && isLoopbackUrl(env.supabaseUrl);

const tabs = [
  { id: 'dashboard', label: 'Painel', icon: 'dashboard' },
  { id: 'map', label: 'Mapa', icon: 'map' },
  { id: 'vehicles', label: 'Garagem', icon: 'directions_car' },
  { id: 'report', label: 'Relatar', icon: 'report' },
];

function GuestEntry({ theme, toggleTheme, onLogin }) {
  const { signIn, signUp, resendConfirmation, backendConfigured } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [canResend, setCanResend] = useState(false);
  const { colors, styles } = useNativeTheme();
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
  return <Page centered>
    <Card>
      <View style={local.toolbar}>
        <Text style={styles.title}>≈ floody</Text>
        <Button title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'} icon={theme === 'dark' ? 'light_mode' : 'dark_mode'} variant="tonal" onPress={toggleTheme} />
      </View>
      <Text accessibilityRole="header" style={styles.title}>Entenda o entorno. Planeje seu caminho.</Text>
      <Text style={styles.text}>Consulte avisos oficiais, estimativas de chuva, o mapa da região e relatos de outros usuários.</Text>
      <View style={[local.notice, { backgroundColor: colors.official }]}>
        <Text style={[styles.muted, { color: colors.onOfficial }]}>Relatos de usuários não são verificados pelo Floody nem por autoridades. Para enviar um relato, entre com uma conta de e-mail confirmado.</Text>
      </View>
      <Field label="Seu nome (opcional)" value={name} onChangeText={setName} maxLength={60} autoComplete="given-name" />
      <Button title="Continuar sem conta" onPress={() => onLogin(name)} />
    </Card>
    {backendConfigured ? <Card>
      <Text accessibilityRole="header" style={styles.heading}>Entrar ou criar conta</Text>
      {localBackendInDev && <Text accessibilityRole="alert" style={styles.text}>Modo de desenvolvimento: este pacote usa um servidor Supabase local ({env.supabaseUrl}), que um celular não alcança. Recarregue o app pelo servidor configurado para o projeto real.</Text>}
      <Field label="E-mail" value={email} onChangeText={setEmail} maxLength={254} autoCapitalize="none" autoComplete="email" keyboardType="email-address" />
      <Field label="Senha (mínimo de 8 caracteres)" value={password} onChangeText={setPassword} secureTextEntry={!showPassword} autoCapitalize="none" autoCorrect={false} autoComplete="password" textContentType="password" />
      <Button title={showPassword ? 'Ocultar senha' : 'Mostrar senha'} variant="subtle" onPress={() => setShowPassword(value => !value)}
        accessibilityLabel={showPassword ? 'Ocultar senha' : 'Mostrar senha'} accessibilityState={{ checked: showPassword }} />
      <Button title={busy ? 'Aguarde…' : 'Entrar'} disabled={busy} onPress={() => run('signin')} />
      <Button title="Criar conta" variant="tonal" disabled={busy} onPress={() => run('signup')} />
      {canResend && <Button title="Reenviar e-mail de confirmação" variant="subtle" disabled={busy} onPress={() => run('resend')} />}
      {message ? <Text accessibilityLiveRegion="polite" style={styles.muted}>{message}</Text> : null}
    </Card> : <Text style={styles.muted}>Contas e envio de relatos indisponíveis: o serviço de relatos não está configurado neste aplicativo.</Text>}
  </Page>;
}

function NativeShell({ theme, toggleTheme }) {
  const { user, login, logout } = useAuth();
  const { colors, styles } = useNativeTheme();
  const [tab, setTab] = useState('dashboard');
  // A failed sign-out keeps the account (the session is still on the device) and says so.
  const [sessionNotice, setSessionNotice] = useState('');
  const [center, setCenter] = useState([-8.05428, -34.8813]);
  return <SafeAreaView style={[styles.fill, { backgroundColor: colors.background }]}>
    <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
    {!user ? <GuestEntry theme={theme} toggleTheme={toggleTheme} onLogin={login} /> : <>
      <View style={local.header}>
        <Text style={styles.title}>≈ floody</Text>
        <View style={[local.account, { backgroundColor: user.guest ? colors.surface : colors.rain }]} accessible
          accessibilityLabel={user.guest ? 'Modo visitante, sem conta' : 'Conectado a uma conta'}>
          <View style={[local.dot, { backgroundColor: user.guest ? colors.muted : colors.onRain }]} />
          <Text numberOfLines={1} style={[styles.font, local.accountText, { color: user.guest ? colors.muted : colors.onRain }]}>{user.guest ? 'Visitante · sem conta' : 'Minha conta'}</Text>
        </View>
        <View style={local.actions}>
          <Button title={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'} icon={theme === 'dark' ? 'light_mode' : 'dark_mode'} iconOnly variant="tonal" onPress={toggleTheme} />
          <Button title="Sair" icon="logout" variant="subtle" accessibilityLabel={user.guest ? 'Voltar à tela inicial' : 'Sair da conta'} onPress={() => { setTab('dashboard'); logout().then(result => setSessionNotice(result?.error ?? '')); }} />
        </View>
      </View>
      {sessionNotice ? <Text accessibilityRole="alert" accessibilityLiveRegion="polite" onPress={() => setSessionNotice('')}
        style={[styles.text, { paddingHorizontal: 16, paddingBottom: 6 }]}>{sessionNotice}</Text> : null}
      <View style={styles.fill}>
        {tab === 'dashboard' && <DashboardScreen onMap={coords => { setCenter(coords); setTab('map'); }} />}
        {tab === 'map' && <MapScreen center={center} />}
        {tab === 'vehicles' && <VehiclesScreen />}
        {tab === 'report' && <ReportScreen onDone={() => setTab('dashboard')} />}
      </View>
      <View style={[local.nav, { backgroundColor: colors.surface }]} accessibilityRole="tablist">
        {tabs.map(item => {
          const selected = tab === item.id;
          return <Pressable key={item.id} accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{ selected }} onPress={() => setTab(item.id)} style={local.tab}>
            <View style={[local.indicator, { backgroundColor: selected ? colors.rain : 'transparent' }]}>
              <MaterialIcon name={item.icon} color={selected ? colors.onRain : colors.muted} />
            </View>
            <Text style={[styles.font, local.tabLabel, { color: colors.text, fontWeight: selected ? '700' : '500' }]}>{item.label}</Text>
          </Pressable>;
        })}
      </View>
    </>}
  </SafeAreaView>;
}

export default function App() {
  const [fontLoaded] = useFonts({ GoogleSansFlex: googleSansFlex });
  const system = useColorScheme() === 'light' ? 'light' : 'dark';
  const [preference, setPreference] = useState(null);
  useEffect(() => {
    let active = true;
    storage.getItem('floody_theme').then(value => {
      if (active && (value === 'light' || value === 'dark')) setPreference(current => current ?? value);
    }).catch(() => {});
    return () => { active = false; };
  }, []);
  const theme = preference ?? system;
  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setPreference(next);
    storage.setItem('floody_theme', next).catch(() => {});
  }
  return <SafeAreaProvider><AuthProvider><NativeTheme theme={theme} fontLoaded={fontLoaded}><NativeShell theme={theme} toggleTheme={toggleTheme} /></NativeTheme></AuthProvider></SafeAreaProvider>;
}
const local = StyleSheet.create({
  toolbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 },
  notice: { padding: 12, borderRadius: 16 },
  header: { paddingHorizontal: 16, paddingVertical: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  actions: { flexDirection: 'row', gap: 4 },
  account: { flexShrink: 1, minWidth: 0, maxWidth: '50%', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  accountText: { fontSize: 12, fontWeight: '600', flexShrink: 1 },
  nav: { flexDirection: 'row', paddingHorizontal: 6, paddingVertical: 6 },
  tab: { flex: 1, minHeight: 54, justifyContent: 'center', alignItems: 'center', gap: 3, paddingHorizontal: 2 },
  indicator: { minWidth: 48, paddingVertical: 2, borderRadius: 24, alignItems: 'center' },
  tabLabel: { fontSize: 12, textAlign: 'center' },
});
