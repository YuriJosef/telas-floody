import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Page, Card, Field, Button, styles } from '../../../components/native/ui';
import { useLocation } from '../../../hooks/useLocation';
import { reverseGeocode } from '../../map/services/geocodingService';
import { createReport } from '../services/reportService';
export default function ReportScreen() {
  const [kind, setKind] = useState('Alagamento Intransitável');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [coords, setCoords] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const { getCurrentLocation } = useLocation();
  async function locate() {
    setBusy(true); setMessage('');
    try { const value = await getCurrentLocation(); setCoords(value); const address = await reverseGeocode(...value).catch(() => null); setLocation(address || value.map(n => n.toFixed(5)).join(', ')); }
    catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  async function save() {
    if (!coords || busy) return;
    setBusy(true); setMessage('');
    try { await createReport({ latitude: coords[0], longitude: coords[1], hazard_type: kind, description: description.trim(), location_label: location.trim() }); setDescription(''); setLocation(''); setCoords(null); setMessage('Relato salvo neste dispositivo, pendente de moderação.'); }
    catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  return <Page title="Reportar perigo"><Text style={styles.muted}>Relatos ficam neste dispositivo. Eles não são publicados ou enviados a autoridades.</Text><Card><Text style={styles.text}>Tipo de ocorrência</Text><View style={{ gap: 8 }}>{['Alagamento Intransitável', 'Buraco na via', 'Obra', 'Trânsito'].map(value => <Button key={value} title={value} selected={kind === value} onPress={() => setKind(value)} />)}</View><Button title={busy ? 'Aguarde…' : 'Obter localização GPS'} disabled={busy} onPress={locate} /><Field label="Local da ocorrência" value={location} editable={!busy} onChangeText={setLocation} maxLength={500} /><Text style={styles.muted}>A posição GPS será associada ao relato; o campo acima descreve esse local.</Text><Field label="Descrição" value={description} editable={!busy} onChangeText={setDescription} multiline maxLength={2000} /><Button title="Salvar relato local" disabled={busy || !coords || !description.trim() || !location.trim()} onPress={save} /></Card>{message ? <Text accessibilityLiveRegion="polite" style={styles.text}>{message}</Text> : null}</Page>;
}
