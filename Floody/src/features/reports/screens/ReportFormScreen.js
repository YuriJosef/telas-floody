import { GeoapifyAttribution } from '../../map/components/AddressAutocomplete.web';
import React, { useState } from 'react';
export default function ReportFormScreen({ form, onChange, coords, loadingGPS, locationNotice, onGPS, onSubmit }) {
  const [sending, setSending] = useState(false);
  const change = (field, value) => onChange({ ...form, [field]: value }, field);
  return <section className="scrollable-tab form-page">
    <header className="page-heading compact"><p className="source-label">Registro neste dispositivo</p><h1>Relatar uma ocorrência</h1><p>Registre o que você observou. O relato será salvo localmente, com status pendente, sem publicação.</p></header>
    <form className="form-card auth-form" onSubmit={async event => { event.preventDefault(); if (sending) return; setSending(true); try { await onSubmit(event); } finally { setSending(false); } }}>
      <label className="input-group">Tipo de ocorrência<select value={form.tipo} onChange={e => change('tipo', e.target.value)}><option>Alagamento Intransitável</option><option>Buraco na via</option><option>Obra</option><option>Trânsito</option></select></label>
      <div className="location-step"><h2>Local da observação</h2><p className="caption" id="report-location-help">O GPS vincula uma posição ao relato. As coordenadas são enviadas à Geoapify para buscar o endereço. Se editar o local, obtenha a localização novamente.</p>
        <button type="button" className="btn-action-secondary" disabled={loadingGPS} onClick={onGPS}>{loadingGPS ? 'Obtendo localização…' : 'Usar minha localização'}</button>
        <p className="caption" role="status">{coords ? 'Posição obtida para este relato.' : 'Aguardando uma posição do GPS para salvar.'}</p>
        <label className="input-group">Local<input required aria-describedby="report-location-help" value={form.local} maxLength={500} onChange={e => change('local', e.target.value)} /></label>
        {locationNotice && <p className="caption" role="status">{locationNotice}</p>}
        <GeoapifyAttribution />
      </div>
      <label className="input-group">Descrição<textarea required rows={4} maxLength={2000} placeholder="Descreva o que observou no local" value={form.descricao} onChange={e => change('descricao', e.target.value)} /></label>
      <button className="btn-primary" disabled={!coords || loadingGPS || sending}>{sending ? 'Salvando…' : 'Salvar relato local'}</button>
    </form>
  </section>;
}
