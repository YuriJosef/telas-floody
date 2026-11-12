import React from 'react';
import { Text, View } from 'react-native';
import { Button, Card, useNativeTheme } from '../../../components/native/ui';
import { formatDateTime } from '../../../utils/formatters';
import { ownStatusLabel } from '../constants';
import { useMyReports } from '../hooks/useMyReports';

export default function MyReportsPanel({ user }) {
  const { colors, styles } = useNativeTheme();
  const mine = useMyReports(user);
  if (!mine.enabled) return null;
  return <View style={{ gap: 8 }}>
    <Text accessibilityRole="header" style={styles.heading}>Meus relatos</Text>
    <Text style={styles.muted}>Relatos enviados por esta conta. Ao retirar um relato, ele deixa de ser público imediatamente.</Text>
    {mine.error ? <Text accessibilityRole="alert" style={styles.text}>{mine.error}</Text> : null}
    {mine.notice ? <Text accessibilityLiveRegion="polite" style={styles.text}>{mine.notice}</Text> : null}
    {mine.loading && !mine.reports.length ? <Text style={styles.muted}>Carregando seus relatos…</Text>
      : !mine.reports.length ? <Text style={styles.muted}>Você ainda não enviou relatos com esta conta.</Text>
      : mine.reports.map(report => {
        const confirming = mine.confirmingId === report.id;
        const pending = mine.pendingId === report.id;
        return <Card key={report.id} style={{ borderRadius: 12, backgroundColor: colors.local }}>
          <Text style={[styles.text, { color: colors.onLocal }]}>{report.location_label}</Text>
          <Text style={[styles.muted, { color: colors.onLocal }]}>{report.hazard_type} · {ownStatusLabel(report.status)} · {formatDateTime(report.occurred_at)}</Text>
          {report.withdrawable && !confirming && <Button title="Retirar" variant="tonal" disabled={Boolean(mine.pendingId)}
            accessibilityLabel={`Retirar relato: ${report.hazard_type}, ${report.location_label}`} onPress={() => mine.requestWithdraw(report.id)} />}
          {confirming && <View style={{ gap: 8 }}>
            <Text style={[styles.text, { color: colors.onLocal }]}>Retirar este relato? Ele deixa de aparecer para outros usuários imediatamente e não pode ser restaurado.</Text>
            <Button title={pending ? 'Retirando…' : 'Confirmar retirada'} disabled={pending} onPress={() => mine.confirmWithdraw(report.id)} />
            <Button title="Cancelar" variant="subtle" disabled={pending} onPress={mine.cancelWithdraw} />
          </View>}
        </Card>;
      })}
  </View>;
}
