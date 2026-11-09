import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import OpenStreetMap from './components/OpenStreetMap.native';
import { Button, Field, styles } from '../../components/native/ui';
import { useLocation } from '../../hooks/useLocation';
import { resolveAddress } from './services/geocodingService';
import { getDrivingRoute } from './services/routingService';
export default function MapScreen({ center }) {
  const mounted = useRef(true);
  const [origin, setOrigin] = useState(null);
  const [destination, setDestination] = useState('');
  const [route, setRoute] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const { getCurrentLocation } = useLocation();
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  async function locate() {
    setBusy(true); setError('');
    try { const coords = await getCurrentLocation(); if (!mounted.current) return; setOrigin(coords); setRoute(null); }
    catch (err) { if (mounted.current) setError(err.message); }
    finally { if (mounted.current) setBusy(false); }
  }
  async function calculate() {
    setBusy(true); setError(''); setRoute(null);
    try {
      const start = origin || await getCurrentLocation();
      const end = await resolveAddress(destination.trim());
      if (!end) throw new Error('Destino não encontrado. Informe rua e cidade.');
      const result = await getDrivingRoute(start, end);
      const coordinates = result.geometry.coordinates.map(([longitude, latitude]) => [latitude, longitude]);
      if (!mounted.current) return;
      setOrigin(start); setRoute({ coordinates, end, distance: (result.distance / 1000).toFixed(1), minutes: Math.round(result.duration / 60) });
    } catch (err) { if (mounted.current) setError(err.message); }
    finally { if (mounted.current) setBusy(false); }
  }
  return <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}><View style={local.map}><OpenStreetMap center={center} origin={origin} destination={route?.end} route={route?.coordinates} /></View><ScrollView style={local.panel} contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled"><Text accessibilityRole="header" style={styles.title}>Mapa e rota</Text><Field label="Destino (rua e cidade)" value={destination} onChangeText={text => { setDestination(text); setRoute(null); }} returnKeyType="search" onSubmitEditing={() => { if (!busy && destination.trim()) calculate(); }} /><Button title={busy ? 'Aguarde…' : 'Usar minha localização'} disabled={busy} onPress={locate} /><Button title="Calcular rota" disabled={busy || !destination.trim()} onPress={calculate} />{error ? <Text accessibilityRole="alert" style={styles.text}>{error}</Text> : null}{route && <><Text style={styles.text}>{route.distance} km · {route.minutes} min</Text><Button title="Limpar rota" onPress={() => setRoute(null)} /></>}<Text style={styles.muted}>Rota viária do OSRM. Não considera alagamentos e não garante passagem segura. Sem orientação curva a curva.</Text></ScrollView></KeyboardAvoidingView>;
}
const local = StyleSheet.create({ map: { flex: 1, minHeight: 140 }, panel: { flexGrow: 0, maxHeight: '55%', backgroundColor: '#151c2c' } });
