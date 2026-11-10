import GeoapifyAttribution from './components/GeoapifyAttribution.native';
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
import OpenStreetMap from './components/OpenStreetMap.native';
import { Button, Card, Field, Page, ProviderLink, useNativeTheme } from '../../components/native/ui';
import { useLocation } from '../../hooks/useLocation';
import { useLatestRequest } from '../../hooks/useLatestRequest';
import { env } from '../../config/env';
import { MAP_CREDITS_URL, MAP_CORRECTION_URL, tileSource } from './services/tileSource';
import { GeocodingError, resolveAddress } from './services/geocodingService';
import { getDrivingRoute } from './services/routingService';
import { usePrecipitationDetails } from '../dashboard/hooks/usePrecipitationDetails';
import { getCurrentPrecipitation } from '../dashboard/services/weatherService';
import { classifyHazard } from '../dashboard/indicators';
import { listReports } from '../reports/services/reportService';

const layers = [['flood', 'Relatos locais'], ['streets', 'Ruas'], ['satellite', 'Satélite']];

export default function MapScreen({ center }) {
  const { colors, styles } = useNativeTheme();
  const { height } = useWindowDimensions();
  const mounted = useRef(true);
  const [layer, setLayer] = useState('streets');
  const [satelliteFallback, setSatelliteFallback] = useState(false);
  const [reports, setReports] = useState([]);
  const [gpsOrigin, setGpsOrigin] = useState(null);
  const [originText, setOriginText] = useState('');
  const [destination, setDestination] = useState('');
  const [route, setRoute] = useState(null);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  const [reportError, setReportError] = useState('');
  const { getCurrentLocation } = useLocation();
  const { start: startRequest, cancel: cancelRequest } = useLatestRequest();
  useEffect(() => {
    mounted.current = true;
    listReports().then(data => { if (mounted.current) setReports(data); })
      .catch(() => { if (mounted.current) setReportError('Não foi possível ler os relatos locais.'); });
    return () => { mounted.current = false; };
  }, []);

  async function locate() {
    if (busy) return;
    const signal = startRequest();
    setBusy('gps');
    setError('');
    setRoute(null);
    setGpsOrigin(null);
    try {
      const coords = await getCurrentLocation();
      if (signal.aborted) return;
      setGpsOrigin(coords);
      setOriginText('Minha localização atual');
    } catch {
      if (!signal.aborted) {
        setOriginText(current => current === 'Minha localização atual' ? '' : current);
        setError('Não foi possível obter a posição. Confira a permissão de localização.');
      }
    } finally { if (!signal.aborted) setBusy(null); }
  }

  function clearRoute() {
    cancelRequest();
    setRoute(null);
  }

  function fallbackFromSatellite() {
    setLayer('streets');
    setSatelliteFallback(true);
  }

  function changeLayer(id) {
    if (id === 'satellite' && !tileSource(env.mapTilesSatellite)) {
      fallbackFromSatellite();
      return;
    }
    setSatelliteFallback(false);
    setLayer(id);
  }

  async function calculate() {
    if (busy || !destination.trim()) return;
    const signal = startRequest();
    setBusy('route');
    setError('');
    setRoute(null);
    let acquiringGPS = false;
    try {
      acquiringGPS = !gpsOrigin && !originText.trim();
      const start = gpsOrigin || (acquiringGPS ? await getCurrentLocation() : await resolveAddress(originText, signal));
      if (signal.aborted) return;
      acquiringGPS = false;
      if (!start) {
        setError('Origem não encontrada. Informe rua e cidade.');
        return;
      }
      const end = await resolveAddress(destination, signal);
      if (signal.aborted) return;
      if (!end) {
        setError('Destino não encontrado. Informe rua e cidade.');
        return;
      }
      const result = await getDrivingRoute(start, end, signal);
      if (signal.aborted) return;
      const next = {
        start, end, coordinates: result.positions,
        distance: (result.distance / 1000).toFixed(1),
        minutes: Math.round(result.duration / 60),
      };
      setRoute(next);
      getCurrentPrecipitation(...end, { withDetails: true, signal }).catch(() => null).then(rain => {
        if (!signal.aborted) setRoute(current => current === next ? { ...current, rain } : current);
      });
    } catch (err) {
      if (!signal.aborted) setError(err instanceof GeocodingError ? err.message : acquiringGPS
        ? 'Não foi possível obter a posição. Confira a permissão de localização.'
        : 'Não foi possível obter uma rota viária. Tente novamente mais tarde.');
    } finally { if (!signal.aborted) setBusy(null); }
  }

  const rainDetails = usePrecipitationDetails(route?.rain);
  const markers = reports
    .filter(report => report.status === 'Aprovado' && Number.isFinite(report.latitude) && Number.isFinite(report.longitude)
      && Math.abs(report.latitude) <= 90 && Math.abs(report.longitude) <= 180)
    .map(report => ({ coords: [report.latitude, report.longitude], label: report.location_label, kind: report.hazard_type, flood: classifyHazard(report) === 'flood' }))
    .filter(marker => layer !== 'flood' || marker.flood);

  return <Page title="Mapa e rotas">
    <View style={{ gap: 8 }}>
      <View style={styles.row}>{layers.map(([id, label]) =>
        <Button key={id} title={label} selected={layer === id} onPress={() => changeLayer(id)} />
      )}</View>
      <View style={{ height: Math.min(440, Math.max(200, height * .32)), borderRadius: 24, overflow: 'hidden', backgroundColor: colors.card }}>
        <OpenStreetMap key={layer === 'satellite' ? 'satellite' : 'street'} center={center} origin={route?.start || gpsOrigin} destination={route?.end} route={route?.coordinates} markers={markers} satellite={layer === 'satellite'} onTileError={layer === 'satellite' ? fallbackFromSatellite : undefined} />
      </View>
      {satelliteFallback && <Text style={styles.muted} accessibilityLiveRegion="polite">Satélite indisponível. Exibindo mapa de ruas.</Text>}
      <Text style={styles.muted}>Registros locais aprovados. Áreas sem marcações também podem apresentar risco.</Text>
      {reportError ? <Text accessibilityRole="alert" style={styles.text}>{reportError}</Text> : null}
    </View>
    <Card>
      <Text accessibilityRole="header" style={styles.heading}>Planejar rota</Text>
      <Text style={styles.muted}>Traçado viário do <ProviderLink url="https://project-osrm.org/">OSRM</ProviderLink> · <ProviderLink url={MAP_CREDITS_URL}>© OpenStreetMap</ProviderLink> · <ProviderLink url={MAP_CORRECTION_URL}>Corrigir mapa</ProviderLink>. Não considera alagamentos nem garante passagem segura. Sem orientação curva a curva.</Text>
      <Field label="Origem" value={originText} placeholder="Rua e cidade ou localização do GPS" editable={!busy} onChangeText={text => { setOriginText(text); setGpsOrigin(null); clearRoute(); }} />
      <Text style={styles.muted}>Se a origem estiver vazia, o cálculo solicitará o GPS. Origem e destino são enviados ao serviço de rotas.</Text>
      <Button title={busy === 'gps' ? 'Obtendo localização…' : 'Usar minha localização'} icon="my_location" variant="tonal" disabled={Boolean(busy)} onPress={locate} />
      {gpsOrigin && <Text style={styles.muted}>Posição obtida para a origem. Sem acompanhamento em tempo real.</Text>}
      <Field label="Destino (rua e cidade)" value={destination} editable={!busy} onChangeText={text => { setDestination(text); clearRoute(); }} returnKeyType="search" onSubmitEditing={calculate} />
      <Button title={busy === 'route' ? 'Calculando…' : 'Calcular rota'} icon="route" disabled={Boolean(busy) || !destination.trim()} onPress={calculate} />
      <GeoapifyAttribution />
      {error ? <Text accessibilityRole="alert" style={styles.text}>{error}</Text> : null}
      {route && <View style={{ gap: 8 }}>
        <Text accessibilityRole="header" style={styles.heading}>Rota calculada</Text>
        <Text style={styles.text}>{route.distance} km · {route.minutes} min</Text>
        <Text style={styles.muted}>Precipitação modelada no destino (<ProviderLink url="https://open-meteo.com/">Open-Meteo</ProviderLink>, <ProviderLink url="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</ProviderLink>) · {route.rain ? route.rain.amountMm.toLocaleString('pt-BR') + ' mm' : route.rain === undefined ? 'Consultando…' : 'Indisponível'}</Text>
        {rainDetails && <Text style={styles.muted}>Acumulado em {rainDetails.period} · {rainDetails.time} (Recife){rainDetails.stale ? ' · estimativa desatualizada' : ''}</Text>}
        <Button title="Limpar rota" variant="subtle" onPress={() => { clearRoute(); setDestination(''); }} />
      </View>}
    </Card>
  </Page>;
}
