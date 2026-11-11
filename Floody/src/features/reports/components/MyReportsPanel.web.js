import React from 'react';
import InlineAlert from '../../../components/feedback/InlineAlert';
import { formatDateTime } from '../../../utils/formatters';
import { ownStatusLabel } from '../constants';
import { useMyReports } from '../hooks/useMyReports';

export default function MyReportsPanel({ user }) {
  const mine = useMyReports(user);
  if (!mine.enabled) return null;
  return <section className="reports-panel my-reports" aria-labelledby="my-reports-title">
    <header className="section-heading"><div><p className="source-label">Sua conta</p><h2 id="my-reports-title">Meus relatos</h2>
      <p className="caption">Relatos enviados por esta conta. Ao retirar um relato, ele deixa de ser público imediatamente.</p></div></header>
    {mine.error && <InlineAlert onDismiss={mine.dismissError}>{mine.error}</InlineAlert>}
    {mine.notice && <p className="status-chip" role="status">{mine.notice}</p>}
    {mine.loading && !mine.reports.length ? <p role="status">Carregando seus relatos…</p>
      : !mine.reports.length ? <p className="caption">Você ainda não enviou relatos com esta conta.</p>
      : mine.reports.map(report => {
        const confirming = mine.confirmingId === report.id;
        const pending = mine.pendingId === report.id;
        return <article className="report-row my-report-row" key={report.id} aria-busy={pending}>
          <div className="report-disclosure">
            <strong>{report.location_label}</strong>
            <span>{report.hazard_type} · {ownStatusLabel(report.status)} · {formatDateTime(report.occurred_at)}</span>
          </div>
          {report.withdrawable && !confirming && <div className="my-report-actions">
            <button type="button" className="btn-action-secondary" disabled={Boolean(mine.pendingId)} onClick={() => mine.requestWithdraw(report.id)}
              aria-label={`Retirar relato: ${report.hazard_type}, ${report.location_label}`}>Retirar</button>
          </div>}
          {confirming && <div className="report-details" role="group" aria-label="Confirmar retirada">
            <p className="caption">Retirar este relato? Ele deixa de aparecer para outros usuários imediatamente e não pode ser restaurado.</p>
            <div className="my-report-actions">
              <button type="button" className="btn-danger" disabled={pending} onClick={() => mine.confirmWithdraw(report.id)}>{pending ? 'Retirando…' : 'Confirmar retirada'}</button>
              <button type="button" className="btn-action-secondary" disabled={pending} onClick={mine.cancelWithdraw}>Cancelar</button>
            </div>
          </div>}
        </article>;
      })}
  </section>;
}
