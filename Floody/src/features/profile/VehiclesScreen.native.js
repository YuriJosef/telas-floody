import React, { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { Page, Card, Field, Button, styles } from '../../components/native/ui';
import { createVehicle, listVehicles } from './services/userDataService';
export default function VehiclesScreen() {
  const [vehicles, setVehicles] = useState([]);
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [height, setHeight] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => { let active = true; listVehicles().then(data => { if (active) setVehicles(data); }).catch(error => { if (active) setMessage(error.message); }); return () => { active = false; }; }, []);
  async function save() {
    if (busy) return; setBusy(true); setMessage('');
    try { await createVehicle({ make: make.trim(), model: model.trim(), ground_clearance_cm: Number(height.replace(',', '.')) }); setVehicles(await listVehicles()); setMake(''); setModel(''); setHeight(''); setMessage('Veículo salvo.'); }
    catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  return <Page title="Minha garagem"><Text style={styles.muted}>Dados armazenados apenas neste dispositivo.</Text><Card><Field label="Marca" value={make} onChangeText={setMake} maxLength={80} /><Field label="Modelo" value={model} onChangeText={setModel} maxLength={120} /><Field label="Altura do solo (cm)" value={height} onChangeText={setHeight} keyboardType="decimal-pad" maxLength={6} /><Button title={busy ? 'Salvando…' : 'Salvar veículo'} disabled={busy || !make.trim() || !model.trim() || !height} onPress={save} /></Card>{message ? <Text accessibilityLiveRegion="polite" style={styles.text}>{message}</Text> : null}{vehicles.length === 0 && <Text style={styles.muted}>Nenhum veículo cadastrado.</Text>}{vehicles.map(vehicle => <Card key={vehicle.id}><Text style={styles.text}>{vehicle.make} · {vehicle.model}</Text><Text style={styles.muted}>Altura do solo: {vehicle.ground_clearance_cm} cm</Text></Card>)}</Page>;
}
