import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import DashboardScreen from './features/dashboard/DashboardScreen.native';
import MapScreen from './features/map/MapScreen.native';
import ReportScreen from './features/reports/screens/ReportScreen.native';
import VehiclesScreen from './features/profile/VehiclesScreen.native';
import { Button, colors, styles } from './components/native/ui';
const tabs = [{ id: 'dashboard', label: 'Painel' }, { id: 'map', label: 'Mapa' }, { id: 'vehicles', label: 'Garagem' }, { id: 'report', label: 'Relatar' }];
function NativeShell() {
  const [tab, setTab] = useState('dashboard');
  const [center, setCenter] = useState([-8.05428, -34.8813]);
  return <SafeAreaView style={local.root}><StatusBar style="light" /><View style={local.header}><Text accessibilityRole="header" style={styles.title}>Floody</Text><Text style={styles.muted}>Modo local · sem publicação de relatos</Text></View><View style={styles.fill}>{tab === 'dashboard' && <DashboardScreen onMap={coords => { setCenter(coords); setTab('map'); }} />}{tab === 'map' && <MapScreen center={center} />}{tab === 'vehicles' && <VehiclesScreen />}{tab === 'report' && <ReportScreen />}</View><View style={local.nav}><ScrollView horizontal contentContainerStyle={local.tabs}>{tabs.map(item => <View key={item.id} style={local.tab}><Button title={item.label} selected={tab === item.id} onPress={() => setTab(item.id)} /></View>)}</ScrollView></View></SafeAreaView>;
}
export default function App() { return <SafeAreaProvider><NativeShell /></SafeAreaProvider>; }
const local = StyleSheet.create({ root: { flex: 1, backgroundColor: colors.background }, header: { padding: 16, borderBottomWidth: 1, borderColor: colors.border, gap: 4 }, nav: { borderTopWidth: 1, borderColor: colors.border }, tabs: { flexGrow: 1, padding: 8, gap: 8 }, tab: { flex: 1, minWidth: 72 } });
