import React, { useState } from 'react';
import { Linking, Modal, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Button, useNativeTheme } from '../../../components/native/ui';
import { useOfficialAlerts } from '../hooks/useOfficialAlerts';
import { ALERT_SCOPES, formatAlertDate } from '../scopes';

export default function OfficialAlertsPanel() {
  const { colors, styles } = useNativeTheme();
  const [scopeId, setScopeId] = useState('recife');
  const [choosing, setChoosing] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [linkError, setLinkError] = useState('');
  const scope = ALERT_SCOPES.find(item => item.id === scopeId);
  const { snapshot, alerts, error, loading, stale, refresh, now } = useOfficialAlerts(scope);
  const tone = { color: colors.onOfficial };
  const status = !snapshot ? (loading ? 'Consultando avisos…' : 'Consulta indisponível')
    : stale ? 'Última consulta em cache'
    : alerts.length ? `${alerts.length} ${alerts.length === 1 ? 'aviso retornado' : 'avisos retornados'}` : 'Nenhum aviso retornado';

  async function open(url) {
    try { await Linking.openURL(url); setLinkError(''); }
    catch { setLinkError('Não foi possível abrir o navegador.'); }
  }

  return <Card style={{ backgroundColor: colors.official }}>
    <Text style={[styles.label, tone]}>Informação oficial</Text>
    <Text accessibilityRole="header" style={[styles.heading, tone]}>Avisos do INMET</Text>
    <Button title={`Região: ${scope.label}`} variant="subtle" onPress={() => setChoosing(true)} />
    <Modal visible={choosing} onRequestClose={() => setChoosing(false)} presentationStyle="pageSheet">
      <SafeAreaView style={[styles.fill, { backgroundColor: colors.background, padding: 16, gap: 8 }]}>
        <Button title="Fechar regiões" onPress={() => setChoosing(false)} />
        <ScrollView contentContainerStyle={{ gap: 8 }}>
          {ALERT_SCOPES.map(item => <Button key={item.id} title={item.label} selected={item.id === scopeId}
            onPress={() => { setScopeId(item.id); setChoosing(false); }} />)}
        </ScrollView>
      </SafeAreaView>
    </Modal>
    <Text accessibilityLiveRegion="polite" style={[styles.heading, tone]}>{status}</Text>
    {error ? <Text accessibilityRole="alert" style={[styles.text, tone]}>{error} {snapshot ? 'Os avisos em cache podem ter sido alterados ou cancelados.' : 'Situação atual não verificada.'}</Text> : null}
    {snapshot && !alerts.length && <Text style={[styles.muted, tone]}>{stale ? 'Nenhum aviso não expirado no cache.' : `Para ${scope.label} na última coleta.`} Isso não confirma ausência de risco.</Text>}
    {snapshot && <Text style={[styles.muted, tone]}>Coleta em {formatAlertDate(snapshot.fetchedAt)}</Text>}
    {alerts.map(alert => <Card key={alert.id} style={{ borderRadius: 12 }}>
      <Text accessibilityRole="header" style={styles.heading}>{alert.event} · {alert.severity}</Text>
      <Text style={styles.muted}>{Date.parse(alert.startsAt) > now ? 'Previsto' : 'Em vigor'}{stale ? ' · cópia em cache' : ''} · INMET #{alert.id}</Text>
      <Text style={styles.muted}>De {formatAlertDate(alert.startsAt)} até {formatAlertDate(alert.endsAt)}</Text>
      {alert.risks.map((risk, index) => <Text key={index} style={styles.text}>{risk}</Text>)}
      {alert.instructions.length > 0 && <Text style={styles.label}>Orientações do aviso</Text>}
      {alert.instructions.map((instruction, index) => <Text key={index} style={styles.muted}>{instruction}</Text>)}
      <Button title="Consultar aviso na fonte" onPress={() => open(alert.url)} />
    </Card>)}
    <Button title={loading ? 'Consultando…' : 'Verificar atualização'} disabled={loading} onPress={refresh} />
    <Text style={[styles.muted, tone]}>Avisos regionais não confirmam alagamento em uma rua.</Text>
    <Button title={showSources ? 'Ocultar fontes' : 'Fontes e abrangência'} variant="subtle"
      accessibilityState={{ expanded: showSources }} onPress={() => setShowSources(!showSources)} />
    {showSources && <View style={{ gap: 8 }}>
      <Text style={[styles.muted, tone]}>Filtro independente do mapa e da busca de chuva. Consulta a cada 10 minutos com esta tela aberta. Sem notificações em segundo plano.</Text>
      {snapshot?.providerUpdatedAt && <Text style={[styles.muted, tone]}>Atualização do provedor em {formatAlertDate(snapshot.providerUpdatedAt)}</Text>}
      <Button title="Abrir avisos oficiais do INMET" variant="subtle" onPress={() => open('https://avisos.inmet.gov.br/')} />
      <Button title="Distribuição pelo RadarMeteorológico" variant="subtle" onPress={() => open('https://radarmeteorologico.com.br')} />
    </View>}
    {linkError ? <Text accessibilityRole="alert" style={[styles.text, tone]}>{linkError}</Text> : null}
  </Card>;
}
