import OfficialAlertsPanel from '../alerts/components/OfficialAlertsPanel.native';
import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { Page, Card, Button, styles } from '../../components/native/ui';
import { LOCAL_AREA_PROFILES } from './indicators';
import { getCurrentPrecipitation } from './services/weatherService';
import { listReports, subscribeToReports } from '../reports/services/reportService';
export default function DashboardScreen({ onMap }) {
  const [area, setArea] = useState(LOCAL_AREA_PROFILES[0]);
  const [weather, setWeather] = useState({ loading: true });
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
    setWeather({ loading: true });
    getCurrentPrecipitation(...area.coords).then(rain => { if (active) setWeather({ rain }); }).catch(() => { if (active) setWeather({ error: 'Meteorologia indisponível. Tente novamente mais tarde.' }); });
    return () => { active = false; };
  }, [area]);
  return <Page title="Central de monitoramento"><Card><Text style={styles.text}>{area.name}</Text><Text accessibilityLiveRegion="polite" style={styles.text}>{weather.loading ? 'Consultando chuva…' : weather.error || `Precipitação atual: ${weather.rain} mm`}</Text><Text style={styles.muted}>Fonte: Open-Meteo. Não use este dado isoladamente para decidir atravessar uma área alagada.</Text><Button title="Ver mapa e rota" onPress={() => onMap(area.coords)} /></Card><OfficialAlertsPanel /><Text style={styles.muted}>Selecione a região da chuva</Text>{LOCAL_AREA_PROFILES.map(item => <Button key={item.name} title={item.name} selected={area.name === item.name} onPress={() => setArea(item)} />)}<Card><Text style={styles.text}>Meus relatos locais ({reports.length})</Text>{error ? <Text accessibilityRole="alert" style={styles.text}>{error}</Text> : null}{reports.length === 0 && <Text style={styles.muted}>Nenhum relato salvo.</Text>}{reports.map(report => <Text key={report.id} style={styles.muted}>{report.location_label}: {report.hazard_type} · {report.status}</Text>)}</Card></Page>;
}
