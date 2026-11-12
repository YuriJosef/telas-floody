import GeoapifyAttribution from '../map/components/GeoapifyAttribution.native';
import MaterialIcon from '../../components/native/MaterialIcon.native';
import OfficialAlertsPanel from '../alerts/components/OfficialAlertsPanel.native';
import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Page, Card, Button, ProviderLink, useNativeTheme } from '../../components/native/ui';
import AddressAutocomplete from '../map/components/AddressAutocomplete.native';
import { useForeground } from '../../hooks/useForeground';
import { useLatestRequest } from '../../hooks/useLatestRequest';
import { usePrecipitationDetails } from './hooks/usePrecipitationDetails';
import { resolveAddress } from '../map/services/geocodingService';
import { LOCAL_AREA_PROFILES } from './indicators';
import { getCurrentPrecipitation, WEATHER_REFRESH_MS } from './services/weatherService';
import { listReports, subscribeToReports } from '../reports/services/reportService';
export default function DashboardScreen({ onMap }) {
  const { colors, styles } = useNativeTheme();
  const [area, setArea] = useState({ name: 'Recife, PE', coords: [-8.05428, -34.8813] });
  const [weather, setWeather] = useState({ loading: true });
  const [query, setQuery] = useState('');
  // Address chosen from the suggestions; kept while the field still shows its name.
  const [picked, setPicked] = useState(null);
  const foreground = useForeground();
  const { start: startLookup, cancel: cancelLookup } = useLatestRequest();
  const [reports, setReports] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    let latest = 0; // Only the newest load may update the list.
    const load = () => {
      const request = ++latest;
      return listReports().then(data => { if (active && request === latest) { setReports(data); setError(''); } })
        .catch(error => {
          if (!active || request !== latest) return;
          setError(error.message);
          // Nothing loaded yet: still show this device's legacy reports. A failed refresh keeps the last list.
          if (error.partial) setReports(current => current.length ? current : error.partial);
        });
    };
    load(); const unsubscribe = subscribeToReports(load);
    return () => { active = false; unsubscribe(); };
  }, []);
  useEffect(() => {
    if (!area.coords || !foreground) return;
    const controller = new AbortController();
    const { signal } = controller;
    let pending = false;
    async function refresh() {
      if (pending) return;
      pending = true;
      try {
        const rain = await getCurrentPrecipitation(...area.coords, { withDetails: true, signal });
        if (!signal.aborted) setWeather({ area, rain });
      } catch {
        if (!signal.aborted) setWeather({ area, error: 'Precipitação indisponível. Tente consultar novamente.' });
      } finally {
        pending = false;
      }
    }
    refresh();
    const timer = setInterval(refresh, WEATHER_REFRESH_MS);
    return () => { clearInterval(timer); controller.abort(); };
  }, [area, foreground]);
  function selectAddress({ display_name: name, lat, lon }) {
    cancelLookup();
    setQuery(name);
    setPicked({ name, coords: [lat, lon] });
    setArea({ name, coords: [lat, lon] }); // The precipitation effect refetches for the new area.
  }
  async function search() {
    const name = query.trim();
    if (!name) return;
    if (picked?.name === name) { cancelLookup(); setArea({ name, coords: picked.coords }); return; }
    const signal = startLookup();
    setArea({ name, coords: null });
    setWeather({ loading: true });
    try {
      const coords = await resolveAddress(name, signal);
      if (signal.aborted) return;
      if (coords) setArea({ name, coords });
      else setWeather({ error: 'Local não encontrado. Confira o endereço ou escolha um local de Recife.' });
    } catch (error) {
      if (!signal.aborted) setWeather({ error: error.message });
    }
  }
  const loading = weather.loading || Boolean(area.coords && weather.area !== area);
  const hasReading = !loading && !weather.error && weather.rain != null;
  const reading = hasReading
    ? weather.rain.amountMm.toLocaleString('pt-BR') + ' mm'
    : loading ? 'Consultando…' : weather.error || 'Precipitação indisponível.';
  const details = usePrecipitationDetails(hasReading ? weather.rain : null);
  return <Page title="Condições da região">
    <OfficialAlertsPanel />
    <Card>
      <Text style={styles.muted}>Modelo Open-Meteo</Text>
      <View style={[styles.row, { alignItems: 'center' }]}><MaterialIcon name="rainy" color={colors.onRain} /><Text accessibilityRole="header" style={styles.heading}>Precipitação</Text></View>
      <View style={{ backgroundColor: colors.rain, padding: 16, borderTopLeftRadius: 28, borderBottomRightRadius: 28, borderTopRightRadius: 12, borderBottomLeftRadius: 12, gap: 4 }}>
        <Text style={[styles.label, { color: colors.onRain }]}>{area.name}</Text>
        <Text accessibilityLiveRegion="polite" style={[styles.text, { color: colors.onRain, minHeight: 54 }, hasReading && { fontSize: 46, lineHeight: 54, fontWeight: '700' }]}>
          {reading}
        </Text>
        <View style={{ minHeight: 60 }}>
          {details && <>
            <Text style={[styles.muted, { color: colors.onRain }]}>Acumulado modelado em {details.period}</Text>
            <Text style={[styles.muted, { color: colors.onRain }]}>Validade: {details.time} · Recife</Text>
            {details.stale && <Text style={[styles.label, { color: colors.onRain }]}>Estimativa desatualizada</Text>}
          </>}
        </View>
      </View>
      <Text style={styles.muted}>Estimativa do <ProviderLink url="https://open-meteo.com/">Open-Meteo</ProviderLink> · <ProviderLink url="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</ProviderLink>. Não mede alagamentos nem indica passagem segura.</Text>
      <AddressAutocomplete label="Consultar outro local" placeholder="Rua, bairro e cidade" value={query} selected={picked?.name === query}
        onChangeText={text => { setQuery(text); setPicked(null); }} onSelect={selectAddress} returnKeyType="search" onSubmitEditing={search} />
      <Button title="Consultar chuva" icon="search" onPress={search} disabled={!query.trim() || loading} />
      <GeoapifyAttribution />
      <Text style={styles.label}>Locais de Recife</Text>
      <View style={{ gap: 6 }}>{[0, 2].map(start =>
        <View key={start} style={{ flexDirection: 'row', gap: 6 }}>
          {LOCAL_AREA_PROFILES.slice(start, start + 2).map(item =>
            <Button key={item.name} title={item.name} selected={area.name === item.name}
              style={{ flex: 1, minHeight: 64, paddingHorizontal: 8, paddingVertical: 8 }}
              labelStyle={{ fontSize: 14 }}
              onPress={() => { cancelLookup(); setArea({ ...item }); }} />
          )}
        </View>
      )}</View>
      <Button title="Ver mapa e rota" icon="map" variant="tonal" disabled={!area.coords} onPress={() => onMap(area.coords)} />
    </Card>
    <Text accessibilityRole="header" style={styles.heading}>Relatos recentes</Text>
    <Text style={styles.muted}>Relatos de usuários, não verificados, publicados nas últimas 48 horas, e registros antigos salvos só neste dispositivo.</Text>
    {error ? <Text accessibilityRole="alert" style={styles.text}>{error}</Text> : reports.length === 0 && <Text style={styles.muted}>Nenhum relato publicado no momento. A ausência de relatos não confirma ausência de risco.</Text>}
    {reports.map(report => <Card key={report.id} style={{ borderRadius: 12, backgroundColor: colors.local }}>
      <Text style={[styles.text, { color: colors.onLocal }]}>{report.location_label}</Text>
      <Text style={[styles.muted, { color: colors.onLocal }]}>{report.hazard_type} · {report.status_label}</Text>
    </Card>)}
  </Page>;
}
