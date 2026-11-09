import GeoapifyAttribution from '../map/components/GeoapifyAttribution.native';
import MaterialIcon from '../../components/native/MaterialIcon.native';
import OfficialAlertsPanel from '../alerts/components/OfficialAlertsPanel.native';
import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Page, Card, Button, Field, useNativeTheme } from '../../components/native/ui';
import { resolveAddress } from '../map/services/geocodingService';
import { LOCAL_AREA_PROFILES } from './indicators';
import { getCurrentPrecipitation, precipitationDetails, WEATHER_REFRESH_MS } from './services/weatherService';
import { listReports, subscribeToReports } from '../reports/services/reportService';
export default function DashboardScreen({ onMap }) {
  const { colors, styles } = useNativeTheme();
  const [area, setArea] = useState({ name: 'Recife, PE', coords: [-8.05428, -34.8813] });
  const [weather, setWeather] = useState({ loading: true });
  const [query, setQuery] = useState('');
  const searchRevision = useRef(0);
  const [reports, setReports] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const load = () => listReports().then(data => { if (active) setReports(data); }).catch(() => { if (active) setError('Não foi possível ler os relatos locais.'); });
    load(); const unsubscribe = subscribeToReports(load);
    return () => { active = false; unsubscribe(); };
  }, []);
  useEffect(() => {
    let active = true;
    if (!area.coords) return;
    setWeather({ area, loading: true });
    const refresh = () => getCurrentPrecipitation(...area.coords, { withDetails: true })
      .then(rain => { if (active) setWeather({ area, rain }); })
      .catch(() => { if (active) setWeather({ area, error: 'Precipitação indisponível. Tente consultar novamente.' }); });
    refresh();
    const timer = setInterval(refresh, WEATHER_REFRESH_MS);
    return () => { active = false; clearInterval(timer); };
  }, [area]);
  async function search() {
    const name = query.trim();
    if (!name) return;
    const revision = ++searchRevision.current;
    setArea({ name, coords: null });
    setWeather({ loading: true });
    try {
      const coords = await resolveAddress(name);
      if (revision !== searchRevision.current) return;
      if (coords) setArea({ name, coords });
      else setWeather({ error: 'Local não encontrado. Confira o endereço ou escolha um local de Recife.' });
    } catch (error) {
      if (revision === searchRevision.current) setWeather({ error: error.message });
    }
  }
  const loading = weather.loading || Boolean(area.coords && weather.area !== area);
  const hasReading = !loading && !weather.error && weather.rain != null;
  const reading = hasReading
    ? weather.rain.amountMm.toLocaleString('pt-BR') + ' mm'
    : loading ? 'Consultando…' : weather.error || 'Precipitação indisponível.';
  const details = hasReading && precipitationDetails(weather.rain);
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
      <Text style={styles.muted}>Estimativa de chuva. Não mede alagamentos nem indica passagem segura.</Text>
      <Field label="Consultar outro local" placeholder="Rua, bairro e cidade" value={query} onChangeText={setQuery} returnKeyType="search" onSubmitEditing={search} />
      <Button title="Consultar chuva" icon="search" onPress={search} disabled={!query.trim() || loading} />
      <GeoapifyAttribution />
      <Text style={styles.label}>Locais de Recife</Text>
      <View style={{ gap: 6 }}>{[0, 2].map(start =>
        <View key={start} style={{ flexDirection: 'row', gap: 6 }}>
          {LOCAL_AREA_PROFILES.slice(start, start + 2).map(item =>
            <Button key={item.name} title={item.name} selected={area.name === item.name}
              style={{ flex: 1, minHeight: 64, paddingHorizontal: 8, paddingVertical: 8 }}
              labelStyle={{ fontSize: 14 }}
              onPress={() => { searchRevision.current++; setArea({ ...item }); }} />
          )}
        </View>
      )}</View>
      <Button title="Ver mapa e rota" icon="map" variant="tonal" disabled={!area.coords} onPress={() => onMap(area.coords)} />
    </Card>
    <Text accessibilityRole="header" style={styles.heading}>Meus relatos locais</Text>
    <Text style={styles.muted}>Registros neste dispositivo, sem publicação.</Text>
    {error ? <Text accessibilityRole="alert" style={styles.text}>{error}</Text> : reports.length === 0 && <Text style={styles.muted}>Nenhum relato salvo.</Text>}
    {reports.map(report => <Card key={report.id} style={{ borderRadius: 12, backgroundColor: colors.local }}>
      <Text style={[styles.text, { color: colors.onLocal }]}>{report.location_label}</Text>
      <Text style={[styles.muted, { color: colors.onLocal }]}>{report.hazard_type} · {report.status}</Text>
    </Card>)}
  </Page>;
}
