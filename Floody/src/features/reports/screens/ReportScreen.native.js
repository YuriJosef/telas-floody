import GeoapifyAttribution from '../../map/components/GeoapifyAttribution.native';
import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { Page, Card, Field, Button, useNativeTheme } from '../../../components/native/ui';
import { useLatestRequest } from '../../../hooks/useLatestRequest';
import { useLocation } from '../../../hooks/useLocation';
import { useAuth } from '../../../store/AuthContext';
import { reverseGeocode } from '../../map/services/geocodingService';
import { createReport, newSubmissionId } from '../services/reportService';
import { DEFAULT_HAZARD, HAZARDS } from '../constants';
import MyReportsPanel from '../components/MyReportsPanel.native';
export default function ReportScreen({ onDone }) {
  const { colors, styles } = useNativeTheme();
  const { user, logout } = useAuth();
  const [kind, setKind] = useState(DEFAULT_HAZARD);
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [coords, setCoords] = useState(null);
  // Observation time and idempotency key; the key changes whenever the content changes.
  const [meta, setMeta] = useState(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(null);
  const [message, setMessage] = useState('');
  const { getCurrentLocation } = useLocation();
  const { start: startLocation } = useLatestRequest();
  const canSubmit = Boolean(user && !user.guest);
  const renewKey = () => setMeta(current => current && { ...current, submissionId: newSubmissionId() });
  async function locate() {
    const signal = startLocation();
    setBusy(true); setMessage(''); setCoords(null); setMeta(null);
    try {
      const value = await getCurrentLocation();
      if (signal.aborted) return;
      const observedAt = new Date().toISOString();
      const address = await reverseGeocode(...value, signal).catch(error => {
        if (!signal.aborted) setMessage(error.message + ' As coordenadas continuam disponíveis para o relato.');
        return null;
      });
      if (signal.aborted) return;
      setCoords(value);
      setMeta({ submissionId: newSubmissionId(), observedAt });
      setLocation(address || value.map(n => n.toFixed(5)).join(', '));
    }
    catch { if (!signal.aborted) setMessage('Não foi possível obter a posição. Confira a permissão de localização.'); }
    finally { if (!signal.aborted) setBusy(false); }
  }
  async function save() {
    if (!coords || !meta || busy || !canSubmit) return;
    setBusy(true); setMessage('');
    try {
      const result = await createReport({ latitude: coords[0], longitude: coords[1], hazardCode: kind, description: description.trim(), location_label: location.trim(),
        locationSource: 'gps', submissionId: meta.submissionId, observedAt: meta.observedAt });
      setDescription(''); setLocation(''); setCoords(null); setMeta(null); setSaved(result);
    }
    catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  if (saved) return <Page title={saved.status === 'held' ? 'Relato recebido para revisão' : 'Relato publicado como não verificado'}>
    <Card style={{ backgroundColor: colors.official }}>
      <Text style={[styles.text, { color: colors.onOfficial }]}>{saved.status === 'held'
        ? 'O relato foi armazenado, mas ficou retido para revisão e não está público. Ele não foi enviado a serviços de emergência.'
        : 'Outros usuários podem vê-lo no mapa por até 48 horas, marcado como relato não verificado. Ele não foi enviado a serviços de emergência.'}</Text>
      <Button title="Voltar ao painel" icon="check_circle" onPress={onDone} />
    </Card>
  </Page>;
  return <Page title="Relatar uma ocorrência"><Text style={styles.muted}>Relatos aceitos ficam visíveis para outros usuários por até 48 horas, marcados como não verificados. Só são aceitos na Região Metropolitana do Recife e não são enviados a autoridades.</Text>
    {!canSubmit && <Card style={{ backgroundColor: colors.official }}><Text style={[styles.text, { color: colors.onOfficial }]}>Para enviar relatos, entre com uma conta de e-mail confirmado.</Text><Button title="Entrar ou criar conta" icon="report" onPress={logout} /></Card>}
    <Card><Text style={styles.text}>Tipo de ocorrência</Text><View style={styles.row}>{HAZARDS.map(item => <Button key={item.code} title={item.label} selected={kind === item.code} onPress={() => { setKind(item.code); renewKey(); }} />)}</View><Button title={busy ? 'Aguarde…' : 'Obter localização GPS'} icon="my_location" disabled={busy} onPress={locate} /><Field label="Local da ocorrência" value={location} editable={!busy} onChangeText={text => { setLocation(text); setCoords(null); setMeta(null); }} maxLength={200} /><Text accessibilityLiveRegion="polite" style={styles.muted}>{coords ? 'Posição e horário da observação obtidos para este relato.' : 'O GPS vincula uma posição e o horário da observação ao relato e envia as coordenadas à Geoapify para buscar o endereço. Se editar o local, obtenha a localização novamente.'}</Text><GeoapifyAttribution /><Field label="Descrição" value={description} editable={!busy} onChangeText={text => { setDescription(text); renewKey(); }} multiline maxLength={2000} /><Button title={busy ? 'Enviando…' : 'Enviar relato'} icon="save" disabled={busy || !canSubmit || !coords || !description.trim() || !location.trim()} onPress={save} /></Card>{message ? <Text accessibilityLiveRegion="polite" style={styles.text}>{message}</Text> : null}<MyReportsPanel user={user} /></Page>;
}
