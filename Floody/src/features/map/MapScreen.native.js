import GeoapifyAttribution from './components/GeoapifyAttribution.native';
import React, { useEffect, useRef, useState } from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
import OpenStreetMap from './components/OpenStreetMap.native';
import AddressAutocomplete from './components/AddressAutocomplete.native';
import { Button, Card, Page, ProviderLink, useNativeTheme } from '../../components/native/ui';
import { useLocation } from '../../hooks/useLocation';
import { useLatestRequest } from '../../hooks/useLatestRequest';
import { env } from '../../config/env';
import { MAP_CREDITS_URL, MAP_CORRECTION_URL, tileSource } from './services/tileSource';
import { GeocodingError, resolveAddress } from './services/geocodingService';
import { getDrivingRoute } from './services/routingService';
import { usePrecipitationDetails } from '../dashboard/hooks/usePrecipitationDetails';
import { getCurrentPrecipitation } from '../dashboard/services/weatherService';
import { classifyHazard } from '../dashboard/indicators';
import { listPublishedReports, subscribeToReports, withoutExpired } from '../reports/services/reportService';
import { UNVERIFIED_LABEL } from '../reports/constants';

const layers = [['flood', 'Relatos'], ['streets', 'Ruas'], ['satellite', 'Satélite']];

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
  // Coordinates of an address picked from the suggestions; cleared whenever the text changes.
  const [originCoords, setOriginCoords] = useState(null);
  const [destinationCoords, setDestinationCoords] = useState(null);
  const [route, setRoute] = useState(null);
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  const [reportError, setReportError] = useState('');
  const { getCurrentLocation } = useLocation();
  const { start: startRequest, cancel: cancelRequest } = useLatestRequest();
  useEffect(() => {
    mounted.current = true;
    let latest = 0; // Only the newest load may update the markers.
    const load = () => {
      const request = ++latest;
      return listPublishedReports().then(data => { if (mounted.current && request === latest) { setReports(data); setReportError(''); } })
        .catch(error => {
          if (!mounted.current || request !== latest) return;
          setReportError(error.message);
          setReports(current => withoutExpired(current)); // Stale markers whose 48 h lifetime ended are removed.
        });
    };
    load();
    const unsubscribe = subscribeToReports(load);
    return () => { mounted.current = false; unsubscribe(); };
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
      setOriginCoords(null);
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
      const start = gpsOrigin || originCoords || (acquiringGPS ? await getCurrentLocation() : await resolveAddress(originText, signal));
      if (signal.aborted) return;
      acquiringGPS = false;
      if (!start) {
        setError('Origem não encontrada. Informe rua e cidade.');
        return;
      }
      const end = destinationCoords || await resolveAddress(destination, signal);
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
    .filter(report => Number.isFinite(report.latitude) && Number.isFinite(report.longitude)
      && Math.abs(report.latitude) <= 90 && Math.abs(report.longitude) <= 180)
    .map(report => ({ coords: [report.latitude, report.longitude], label: report.location_label, kind: `${report.hazard_type} · ${UNVERIFIED_LABEL}`, flood: classifyHazard(report) === 'flood' }))
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
      <Text style={styles.muted}>Relatos de usuários, não verificados, publicados nas últimas 48 h. Áreas sem marcações também podem apresentar risco.</Text>
      {reportError ? <Text accessibilityRole="alert" style={styles.text}>{reportError}</Text> : null}
    </View>
    <Card>
      <Text accessibilityRole="header" style={styles.heading}>Planejar rota</Text>
      <Text style={styles.muted}>Traçado viário do <ProviderLink url="https://project-osrm.org/">OSRM</ProviderLink> · <ProviderLink url={MAP_CREDITS_URL}>© OpenStreetMap</ProviderLink> · <ProviderLink url={MAP_CORRECTION_URL}>Corrigir mapa</ProviderLink>. Não considera alagamentos nem garante passagem segura. Sem orientação curva a curva.</Text>
      <AddressAutocomplete label="Origem" value={originText} placeholder="Rua e cidade ou localização do GPS" editable={!busy} selected={Boolean(gpsOrigin || originCoords)}
        onChangeText={text => { setOriginText(text); setGpsOrigin(null); setOriginCoords(null); clearRoute(); }}
        onSelect={match => { setOriginText(match.display_name); setGpsOrigin(null); setOriginCoords([match.lat, match.lon]); clearRoute(); }} />
      <Text style={styles.muted}>Se a origem estiver vazia, o cálculo solicitará o GPS. Origem e destino são enviados ao serviço de rotas.</Text>
      <Button title={busy === 'gps' ? 'Obtendo localização…' : 'Usar minha localização'} icon="my_location" variant="tonal" disabled={Boolean(busy)} onPress={locate} />
      {gpsOrigin && <Text style={styles.muted}>Posição obtida para a origem. Sem acompanhamento em tempo real.</Text>}
      <AddressAutocomplete label="Destino (rua e cidade)" value={destination} editable={!busy} selected={Boolean(destinationCoords)}
        onChangeText={text => { setDestination(text); setDestinationCoords(null); clearRoute(); }}
        onSelect={match => { setDestination(match.display_name); setDestinationCoords([match.lat, match.lon]); clearRoute(); }}
        returnKeyType="search" onSubmitEditing={calculate} />
      <Button title={busy === 'route' ? 'Calculando…' : 'Calcular rota'} icon="route" disabled={Boolean(busy) || !destination.trim()} onPress={calculate} />
      <GeoapifyAttribution />
      {error ? <Text accessibilityRole="alert" style={styles.text}>{error}</Text> : null}
      {route && <View style={{ gap: 8 }}>
        <Text accessibilityRole="header" style={styles.heading}>Rota calculada</Text>
        <Text style={styles.text}>{route.distance} km · {route.minutes} min</Text>
        <Text style={styles.muted}>Precipitação modelada no destino (<ProviderLink url="https://open-meteo.com/">Open-Meteo</ProviderLink>, <ProviderLink url="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</ProviderLink>) · {route.rain ? route.rain.amountMm.toLocaleString('pt-BR') + ' mm' : route.rain === undefined ? 'Consultando…' : 'Indisponível'}</Text>
        {rainDetails && <Text style={styles.muted}>Acumulado em {rainDetails.period} · {rainDetails.time} (Recife){rainDetails.stale ? ' · estimativa desatualizada' : ''}</Text>}
        <Button title="Limpar rota" variant="subtle" onPress={() => { clearRoute(); setDestination(''); setDestinationCoords(null); }} />
      </View>}
    </Card>
  </Page>;
}
