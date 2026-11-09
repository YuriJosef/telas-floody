import GeoapifyAttribution from '../../map/components/GeoapifyAttribution.native';
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Page, Card, Field, Button, useNativeTheme } from '../../../components/native/ui';
import { useLocation } from '../../../hooks/useLocation';
import { reverseGeocode } from '../../map/services/geocodingService';
import { createReport } from '../services/reportService';
export default function ReportScreen({ onDone }) {
  const { colors, styles } = useNativeTheme();
  const [kind, setKind] = useState('Alagamento Intransitável');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [coords, setCoords] = useState(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState('');
  const { getCurrentLocation } = useLocation();
  async function locate() {
    setBusy(true); setMessage(''); setCoords(null);
    try {
      const value = await getCurrentLocation();
      const address = await reverseGeocode(...value).catch(error => {
        setMessage(error.message + ' As coordenadas continuam disponíveis para o relato.');
        return null;
      });
      setCoords(value);
      setLocation(address || value.map(n => n.toFixed(5)).join(', '));
    }
    catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  async function save() {
    if (!coords || busy) return;
    setBusy(true); setMessage('');
    try { await createReport({ latitude: coords[0], longitude: coords[1], hazard_type: kind, description: description.trim(), location_label: location.trim() }); setDescription(''); setLocation(''); setCoords(null); setSaved(true); }
    catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  if (saved) return <Page title="Relato salvo neste dispositivo">
    <Card style={{ backgroundColor: colors.official }}>
      <Text style={[styles.text, { color: colors.onOfficial }]}>Seu registro está com status pendente. Ele não foi publicado nem enviado a serviços de emergência.</Text>
      <Button title="Voltar ao painel" icon="check_circle" onPress={onDone} />
    </Card>
  </Page>;
  return <Page title="Relatar uma ocorrência"><Text style={styles.muted}>Relatos ficam neste dispositivo. Eles não são publicados ou enviados a autoridades.</Text><Card><Text style={styles.text}>Tipo de ocorrência</Text><View style={styles.row}>{['Alagamento Intransitável', 'Buraco na via', 'Obra', 'Trânsito'].map(value => <Button key={value} title={value} selected={kind === value} onPress={() => setKind(value)} />)}</View><Button title={busy ? 'Aguarde…' : 'Obter localização GPS'} icon="my_location" disabled={busy} onPress={locate} /><Field label="Local da ocorrência" value={location} editable={!busy} onChangeText={text => { setLocation(text); setCoords(null); }} maxLength={500} /><Text accessibilityLiveRegion="polite" style={styles.muted}>{coords ? 'Posição obtida para este relato.' : 'Use o GPS para vincular uma posição. Se editar o local, obtenha a localização novamente.'}</Text><GeoapifyAttribution /><Field label="Descrição" value={description} editable={!busy} onChangeText={setDescription} multiline maxLength={2000} /><Button title="Salvar relato local" icon="save" disabled={busy || !coords || !description.trim() || !location.trim()} onPress={save} /></Card>{message ? <Text accessibilityLiveRegion="polite" style={styles.text}>{message}</Text> : null}</Page>;
}
