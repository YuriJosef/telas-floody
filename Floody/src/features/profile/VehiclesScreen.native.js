import React, { useEffect, useState } from 'react';
import { FlatList, Modal, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Page, Card, Field, Button, useNativeTheme } from '../../components/native/ui';
import { createVehicle, listVehicles } from './services/userDataService';
import { listVehicleMakes, listVehicleModels } from './services/vehicleCatalogService';

function CatalogPicker({ mode, items, loading, error, onClose, onSelect }) {
  const { colors, styles } = useNativeTheme();
  const [query, setQuery] = useState('');
  const matches = items.filter(item => item.nome.toLocaleLowerCase('pt-BR').includes(query.trim().toLocaleLowerCase('pt-BR')));
  return <Modal visible onRequestClose={onClose} presentationStyle="pageSheet">
    <SafeAreaView style={[styles.fill, { padding: 16, gap: 12, backgroundColor: colors.background }]}>
      <Text accessibilityRole="header" style={styles.heading}>{mode === 'make' ? 'Marcas do catálogo FIPE' : 'Modelos do catálogo FIPE'}</Text>
      <Button title="Fechar catálogo" variant="subtle" onPress={onClose} />
      <Field label="Filtrar catálogo" value={query} onChangeText={setQuery} />
      {loading ? <Text accessibilityLiveRegion="polite" style={styles.muted}>Consultando catálogo…</Text>
        : error ? <Text accessibilityRole="alert" style={styles.text}>{error}</Text>
        : <FlatList data={matches} keyExtractor={item => String(item.codigo)} keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ gap: 6, paddingBottom: 12 }}
          ListEmptyComponent={<Text style={styles.muted}>Nenhum resultado encontrado.</Text>}
          renderItem={({ item }) => <Button title={item.nome} variant="subtle" onPress={() => onSelect(item)} />} />}
    </SafeAreaView>
  </Modal>;
}

export default function VehiclesScreen() {
  const { colors, styles } = useNativeTheme();
  const [vehicles, setVehicles] = useState([]);
  const [picker, setPicker] = useState(null);
  const [catalog, setCatalog] = useState(null);
  const [selectedMake, setSelectedMake] = useState(null);
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [height, setHeight] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => { let active = true; listVehicles().then(data => { if (active) setVehicles(data); }).catch(error => { if (active) setMessage(error.message); }); return () => { active = false; }; }, []);
  useEffect(() => {
    if (!picker) return;
    const controller = new AbortController();
    const { signal } = controller;
    const request = picker.mode === 'make' ? listVehicleMakes(signal) : listVehicleModels(picker.make.codigo, signal);
    request.then(items => {
      if (!signal.aborted) setCatalog({ picker, items });
    }).catch(() => {
      if (!signal.aborted) setCatalog({ picker, error: 'Catálogo indisponível. Você ainda pode preencher os dados manualmente.' });
    });
    return () => controller.abort();
  }, [picker]);

  function select(item) {
    if (picker.mode === 'make') {
      setSelectedMake(item);
      setMake(item.nome);
      setModel('');
      setPicker({ mode: 'model', make: item });
    } else {
      setModel(item.nome);
      setPicker(null);
    }
  }
  async function save() {
    if (busy) return; setBusy(true); setMessage('');
    try { await createVehicle({ make: make.trim(), model: model.trim(), ground_clearance_cm: Number(height.replace(',', '.')) }); setVehicles(await listVehicles()); setMake(''); setSelectedMake(null); setModel(''); setHeight(''); setMessage('Veículo salvo.'); }
    catch (error) { setMessage(error.message); }
    finally { setBusy(false); }
  }
  const currentCatalog = catalog?.picker === picker ? catalog : null;
  return <Page title="Sua garagem">
    <Text style={styles.muted}>Veículos salvos apenas neste dispositivo.</Text>
    <Card>
      <Text accessibilityRole="header" style={styles.heading}>Adicionar veículo</Text>
      <Button title="Consultar catálogo FIPE" icon="directions_car" variant="tonal" disabled={busy} onPress={() => setPicker({ mode: 'make' })} />
      {selectedMake && <Button title="Escolher modelo no catálogo" variant="subtle" disabled={busy} onPress={() => setPicker({ mode: 'model', make: selectedMake })} />}
      <Field label="Marca" value={make} onChangeText={text => { setMake(text); setSelectedMake(null); setModel(''); }} maxLength={80} editable={!busy} />
      <Field label="Modelo" value={model} onChangeText={setModel} maxLength={120} editable={!busy} />
      <Field label="Vão livre do solo (cm)" value={height} onChangeText={setHeight} keyboardType="decimal-pad" maxLength={6} editable={!busy} />
      <Text style={styles.muted}>Consulte a especificação do veículo. Esta medida não indica profundidade segura para atravessar água.</Text>
      <Button title={busy ? 'Salvando…' : 'Salvar veículo'} icon="save" disabled={busy || !make.trim() || !model.trim() || !height} onPress={save} />
      {message ? <Text accessibilityLiveRegion="polite" style={styles.text}>{message}</Text> : null}
    </Card>
    <Text accessibilityRole="header" style={styles.heading}>Veículos neste dispositivo</Text>
    {vehicles.length === 0 && <Text style={styles.muted}>Nenhum veículo cadastrado.</Text>}
    {vehicles.map(vehicle => <Card key={vehicle.id} style={{ backgroundColor: colors.surface, borderRadius: 12 }}>
      <Text style={styles.text}>{vehicle.make} · {vehicle.model}</Text>
      <Text style={styles.muted}>Vão livre do solo: {vehicle.ground_clearance_cm} cm</Text>
    </Card>)}
    {picker && <CatalogPicker key={picker.mode} mode={picker.mode} items={currentCatalog?.items ?? []}
      loading={!currentCatalog} error={currentCatalog?.error} onSelect={select} onClose={() => setPicker(null)} />}
  </Page>;
}
