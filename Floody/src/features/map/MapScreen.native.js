import React, { useEffect, useRef, useState } from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
import OpenStreetMap from './components/OpenStreetMap.native';
import { Button, Card, Field, Page, useNativeTheme } from '../../components/native/ui';
import { useLocation } from '../../hooks/useLocation';
import { resolveAddress } from './services/geocodingService';
import { getDrivingRoute } from './services/routingService';
import { getCurrentPrecipitation, precipitationDetails } from '../dashboard/services/weatherService';
import { classifyHazard } from '../dashboard/indicators';
import { listReports } from '../reports/services/reportService';

const layers = [['flood', 'Relatos locais'], ['streets', 'Ruas'], ['satellite', 'Satélite']];

export default function MapScreen({ center }) {
  const { colors, styles } = useNativeTheme();
  const { height } = useWindowDimensions();
  const mounted = useRef(true);
  const [layer, setLayer] = useState('streets');
  const [reports, setReports] = useState([]);
  const [gpsOrigin, setGpsOrigin] = useState(null);
  const [originText, setOriginText] = useState('');
  const [destination, setDestination] = useState('');
  const [route, setRoute] = useState(null);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  const [reportError, setReportError] = useState('');
  const { getCurrentLocation } = useLocation();
  useEffect(() => {
    mounted.current = true;
    listReports().then(data => { if (mounted.current) setReports(data); })
      .catch(() => { if (mounted.current) setReportError('Não foi possível ler os relatos locais.'); });
    return () => { mounted.current = false; };
  }, []);

  async function locate() {
    if (busy) return;
    setBusy('gps');
    setError('');
    setRoute(null);
    setGpsOrigin(null);
    try {
      const coords = await getCurrentLocation();
      if (!mounted.current) return;
      setGpsOrigin(coords);
      setOriginText('Minha localização atual');
    } catch (err) {
      if (mounted.current) {
        setOriginText(current => current === 'Minha localização atual' ? '' : current);
        setError(err.message);
      }
    } finally { if (mounted.current) setBusy(null); }
  }

  async function calculate() {
    if (busy || !destination.trim()) return;
    setBusy('route');
    setError('');
    setRoute(null);
    try {
      const start = gpsOrigin || (originText.trim() ? await resolveAddress(originText) : await getCurrentLocation());
      if (!start) throw new Error('Origem não encontrada. Informe rua e cidade.');
      const end = await resolveAddress(destination);
      if (!end) throw new Error('Destino não encontrado. Informe rua e cidade.');
      const result = await getDrivingRoute(start, end);
      const rain = await getCurrentPrecipitation(...end, { withDetails: true }).catch(() => null);
      if (!mounted.current) return;
      setRoute({
        start, end, rain,
        coordinates: result.geometry.coordinates.map(([longitude, latitude]) => [latitude, longitude]),
        distance: (result.distance / 1000).toFixed(1),
        minutes: Math.round(result.duration / 60),
      });
    } catch (err) { if (mounted.current) setError(err.message); }
    finally { if (mounted.current) setBusy(null); }
  }

  const rainDetails = route?.rain && precipitationDetails(route.rain);
  const markers = reports
    .filter(report => report.status === 'Aprovado' && Number.isFinite(report.latitude) && Number.isFinite(report.longitude)
      && Math.abs(report.latitude) <= 90 && Math.abs(report.longitude) <= 180)
    .map(report => ({ coords: [report.latitude, report.longitude], label: report.location_label, kind: report.hazard_type, flood: classifyHazard(report) === 'flood' }))
    .filter(marker => layer !== 'flood' || marker.flood);

  return <Page title="Mapa e rotas">
    <View style={{ gap: 8 }}>
      <View style={styles.row}>{layers.map(([id, label]) =>
        <Button key={id} title={label} selected={layer === id} onPress={() => setLayer(id)} />
      )}</View>
      <View style={{ height: Math.min(440, Math.max(200, height * .32)), borderRadius: 24, overflow: 'hidden', backgroundColor: colors.card }}>
        <OpenStreetMap center={center} origin={route?.start || gpsOrigin} destination={route?.end} route={route?.coordinates} markers={markers} satellite={layer === 'satellite'} />
      </View>
      <Text style={styles.muted}>Registros locais aprovados. Áreas sem marcações também podem apresentar risco.</Text>
      {reportError ? <Text accessibilityRole="alert" style={styles.text}>{reportError}</Text> : null}
    </View>
    <Card>
      <Text accessibilityRole="header" style={styles.heading}>Planejar rota</Text>
      <Text style={styles.muted}>Traçado viário do OSRM. Não considera alagamentos nem garante passagem segura. Sem orientação curva a curva.</Text>
      <Field label="Origem" value={originText} placeholder="Rua e cidade ou localização do GPS" editable={!busy} onChangeText={text => { setOriginText(text); setGpsOrigin(null); setRoute(null); }} />
      <Button title={busy === 'gps' ? 'Obtendo localização…' : 'Usar minha localização'} icon="my_location" variant="tonal" disabled={Boolean(busy)} onPress={locate} />
      {gpsOrigin && <Text style={styles.muted}>Posição obtida para a origem. Sem acompanhamento em tempo real.</Text>}
      <Field label="Destino (rua e cidade)" value={destination} editable={!busy} onChangeText={text => { setDestination(text); setRoute(null); }} returnKeyType="search" onSubmitEditing={calculate} />
      <Button title={busy === 'route' ? 'Calculando…' : 'Calcular rota'} icon="route" disabled={Boolean(busy) || !destination.trim()} onPress={calculate} />
      {error ? <Text accessibilityRole="alert" style={styles.text}>{error}</Text> : null}
      {route && <View style={{ gap: 8 }}>
        <Text accessibilityRole="header" style={styles.heading}>Rota calculada</Text>
        <Text style={styles.text}>{route.distance} km · {route.minutes} min</Text>
        <Text style={styles.muted}>Precipitação modelada no destino (Open-Meteo) · {route.rain == null ? 'Indisponível' : route.rain.amountMm.toLocaleString('pt-BR') + ' mm'}</Text>
        {rainDetails && <Text style={styles.muted}>Acumulado em {rainDetails.period} · {rainDetails.time} (Recife){rainDetails.stale ? ' · estimativa desatualizada' : ''}</Text>}
        <Button title="Limpar rota" variant="subtle" onPress={() => { setRoute(null); setDestination(''); }} />
      </View>}
    </Card>
  </Page>;
}
