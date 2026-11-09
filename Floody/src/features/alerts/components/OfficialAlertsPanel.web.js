import React, { useState } from 'react';
import { useOfficialAlerts } from '../hooks/useOfficialAlerts';
import { ALERT_SCOPES, formatAlertDate } from '../scopes';

export default function OfficialAlertsPanel() {
  const [scopeId, setScopeId] = useState('recife');
  const scope = ALERT_SCOPES.find(item => item.id === scopeId);
  const { snapshot, alerts, error, loading, stale, refresh, now } = useOfficialAlerts(scope);
  const statusTitle = !snapshot
    ? loading ? 'Consultando avisos…' : 'Consulta indisponível'
    : stale ? 'Última consulta em cache'
    : alerts.length ? `${alerts.length} ${alerts.length === 1 ? 'aviso retornado' : 'avisos retornados'}`
    : 'Nenhum aviso retornado';

  return (
    <section className="official-alerts" aria-labelledby="official-alerts-title">
      <header className="official-alerts-header">
        <div><p className="source-label">Informação oficial</p><h2 id="official-alerts-title">Avisos do INMET</h2></div>
        <span className="source-monogram" aria-hidden="true">IN</span>
      </header>
      <label className="input-group alert-region">Região dos avisos
        <select value={scopeId} onChange={event => setScopeId(event.target.value)}>
          {ALERT_SCOPES.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </label>
      <div className="alert-summary" aria-live="polite" aria-busy={loading}>
        <h3>{statusTitle}</h3>
        {error && <p role="alert">{error} {snapshot ? 'Os avisos em cache podem ter sido alterados ou cancelados.' : 'Não foi possível verificar se há avisos.'}</p>}
        {stale && <p>Dados em cache, sem confirmação atual do provedor.</p>}
        {snapshot && !alerts.length && <p>{stale ? 'Nenhum aviso não expirado no cache.' : `Para ${scope.label} na última coleta.`} Isso não confirma ausência de risco.</p>}
        {snapshot && <p className="collection-time">Coleta em {formatAlertDate(snapshot.fetchedAt)}</p>}
      </div>
      <div className="official-alert-list">
        {alerts.map(alert => (
          <article key={alert.id} className={`official-alert level-${alert.level}`}>
            <header><h3>{alert.event}</h3><strong>{alert.severity}</strong></header>
            <p>{Date.parse(alert.startsAt) > now ? 'Previsto' : 'Em vigor'}{stale ? ' · cópia em cache' : ''} · INMET #{alert.id}</p>
            <p>De {formatAlertDate(alert.startsAt)} até {formatAlertDate(alert.endsAt)}</p>
            {alert.risks.map((risk, index) => <p key={index}>{risk}</p>)}
            {alert.instructions.length > 0 && <details><summary>Orientações do aviso</summary><ul>{alert.instructions.map((text, index) => <li key={index}>{text}</li>)}</ul></details>}
            <a href={alert.url} target="_blank" rel="noopener noreferrer">Consultar aviso na fonte</a>
          </article>
        ))}
      </div>
      <button type="button" className="btn-primary alert-refresh" disabled={loading} onClick={refresh}>
        <span aria-hidden="true">↻</span>{loading ? 'Consultando…' : 'Verificar atualização'}
      </button>
      <p className="alerts-caption">Avisos regionais não confirmam alagamento em uma rua.</p>
      <details className="source-details">
        <summary>Fontes e abrangência</summary>
        <p>Fonte emissora <a href="https://avisos.inmet.gov.br/" target="_blank" rel="noopener noreferrer">INMET</a>. Distribuição <a href="https://radarmeteorologico.com.br" target="_blank" rel="noopener noreferrer">RadarMeteorológico</a>.</p>
        <p>Este filtro é independente da busca de endereço e do mapa. Consulta a cada 10 minutos com esta tela aberta. Sem notificações em segundo plano.</p>
        {snapshot?.providerUpdatedAt && <p>Atualização do provedor em {formatAlertDate(snapshot.providerUpdatedAt)}</p>}
      </details>
    </section>
  );
}
