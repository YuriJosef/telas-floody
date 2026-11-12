import { GeoapifyAttribution } from '../../map/components/AddressAutocomplete.web';
import { IBGE_MALHAS_URL } from '../constants';
import React, { useState } from 'react';
import { HAZARDS } from '../constants';
export default function ReportFormScreen({ form, onChange, coords, loadingGPS, locationNotice, onGPS, onSubmit, canSubmit = true, onSignIn, children }) {
  const [sending, setSending] = useState(false);
  const change = (field, value) => onChange({ ...form, [field]: value }, field);
  return <section className="scrollable-tab form-page">
    <header className="page-heading compact"><p className="source-label">Relato de usuário · não verificado</p><h1>Relatar uma ocorrência</h1><p>Registre o que você observou agora, na Região Metropolitana do Recife. Relatos aceitos ficam visíveis para outros usuários por até 48 horas, marcados como não verificados. Eles não são enviados a serviços de emergência.</p><p className="caption">Área de envio: limites municipais da Malha Municipal Digital 2025, representação cartográfica, não demarcação legal. Fonte: <a href={IBGE_MALHAS_URL} target="_blank" rel="noreferrer">IBGE</a>.</p></header>
    {!canSubmit && <p className="local-notice" role="status">Para enviar relatos, entre com uma conta de e-mail confirmado. <button type="button" className="btn-action-secondary" onClick={onSignIn}>Entrar ou criar conta</button></p>}
    <form className="form-card auth-form" onSubmit={async event => { event.preventDefault(); if (sending) return; setSending(true); try { await onSubmit(event); } finally { setSending(false); } }}>
      <label className="input-group">Tipo de ocorrência<select value={form.tipo} onChange={e => change('tipo', e.target.value)}>{HAZARDS.map(item => <option key={item.code} value={item.code}>{item.label}</option>)}</select></label>
      <div className="location-step"><h2>Local da observação</h2><p className="caption" id="report-location-help">O GPS vincula uma posição e o horário da observação ao relato. As coordenadas são enviadas à Geoapify para buscar o endereço. Se editar o local, obtenha a localização novamente.</p>
        <button type="button" className="btn-action-secondary" disabled={loadingGPS} onClick={onGPS}>{loadingGPS ? 'Obtendo localização…' : 'Usar minha localização'}</button>
        <p className="caption" role="status">{coords ? 'Posição obtida para este relato.' : 'Aguardando uma posição do GPS para enviar.'}</p>
        <label className="input-group">Local<input required aria-describedby="report-location-help" value={form.local} maxLength={200} onChange={e => change('local', e.target.value)} /></label>
        {locationNotice && <p className="caption" role="status">{locationNotice}</p>}
        <GeoapifyAttribution />
      </div>
      <label className="input-group">Descrição<textarea required rows={4} maxLength={2000} placeholder="Descreva o que observou no local" value={form.descricao} onChange={e => change('descricao', e.target.value)} /></label>
      <button className="btn-primary" disabled={!canSubmit || !coords || loadingGPS || sending}>{sending ? 'Enviando…' : 'Enviar relato'}</button>
    </form>
    {children}
  </section>;
}
