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

const tabs = [
  { id: 'dashboard', label: 'Painel', icon: 'dashboard' },
  { id: 'map', label: 'Mapa', icon: 'map' },
  { id: 'vehicles', label: 'Garagem', icon: 'directions_car' },
  { id: 'report', label: 'Relatar', icon: 'report' },
];

function GuestEntry({ theme, toggleTheme, onLogin }) {
  const [name, setName] = useState('');
  const { colors, styles } = useNativeTheme();
  return <Page centered>
    <Card>
      <View style={local.toolbar}>
        <Text style={styles.title}>≈ floody</Text>
        <Button title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'} icon={theme === 'dark' ? 'light_mode' : 'dark_mode'} variant="tonal" onPress={toggleTheme} />
      </View>
      <Text accessibilityRole="header" style={styles.title}>Entenda o entorno. Planeje seu caminho.</Text>
      <Text style={styles.text}>Consulte avisos oficiais, estimativas de chuva e o mapa da região.</Text>
      <View style={[local.notice, { backgroundColor: colors.official }]}>
        <Text style={[styles.muted, { color: colors.onOfficial }]}>Modo local. Relatos e veículos ficam neste dispositivo. Sem autenticação ou publicação de ocorrências.</Text>
      </View>
      <Field label="Seu nome (opcional)" value={name} onChangeText={setName} maxLength={60} autoComplete="given-name" />
      <Button title="Continuar no modo local" onPress={() => onLogin(name)} />
    </Card>
  </Page>;
}

function NativeShell({ theme, toggleTheme }) {
  const { user, login, logout } = useAuth();
  const { colors, styles } = useNativeTheme();
  const [tab, setTab] = useState('dashboard');
  const [center, setCenter] = useState([-8.05428, -34.8813]);
  return <SafeAreaView style={[styles.fill, { backgroundColor: colors.background }]}>
    <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
    {!user ? <GuestEntry theme={theme} toggleTheme={toggleTheme} onLogin={login} /> : <>
      <View style={local.header}>
        <Text style={styles.title}>≈ floody</Text>
        <View style={local.actions}>
          <Button title={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'} icon={theme === 'dark' ? 'light_mode' : 'dark_mode'} iconOnly variant="tonal" onPress={toggleTheme} />
          <Button title="Sair" icon="logout" variant="subtle" accessibilityLabel="Sair do modo local" onPress={() => { setTab('dashboard'); logout(); }} />
        </View>
      </View>
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
  nav: { flexDirection: 'row', paddingHorizontal: 6, paddingVertical: 6 },
  tab: { flex: 1, minHeight: 54, justifyContent: 'center', alignItems: 'center', gap: 3, paddingHorizontal: 2 },
  indicator: { minWidth: 48, paddingVertical: 2, borderRadius: 24, alignItems: 'center' },
  tabLabel: { fontSize: 12, textAlign: 'center' },
});
