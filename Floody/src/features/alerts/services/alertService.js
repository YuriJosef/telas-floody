import { env } from '../../../config/env';
import { requestJson } from '../../../services/api/externalClient';
import { storage } from '../../../services/storage/storage';

export const ALERT_REFRESH_MS = 10 * 60 * 1000;
export const ALERT_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const CACHE_KEY = 'floody_official_alerts_v1';
let inFlight = null;
let memory = null;
let lastFailure = 0;

// INMET's unzoned dates in this feed are expressed in Brasília time, not device time.
export function parseAlertDate(value) {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  const unzoned = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})(:\d{2})?$/.exec(text);
  const timestamp = Date.parse(unzoned ? `${unzoned[1]}T${unzoned[2]}${unzoned[3] || ':00'}-03:00` : text);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null;
}
const strings = value => Array.isArray(value) ? value.filter(item => typeof item === 'string').map(item => item.trim()).filter(Boolean) : [];
function detailUrl(value) {
  try { const url = new URL(value); if (url.protocol === 'https:' && url.hostname === 'radarmeteorologico.com.br') return url.toString(); } catch {}
  return 'https://avisos.inmet.gov.br/';
}
export function normalizeAlertFeed(payload, fetchedAt = Date.now()) {
  if (!payload || !Array.isArray(payload.alertas)) throw new Error('Formato de alertas inesperado.');
  const unique = new Map();
  for (const item of payload.alertas) {
    if (!item || typeof item !== 'object') throw new Error('Alerta inválido na resposta do provedor.');
    const startsAt = parseAlertDate(item.inicio);
    const endsAt = parseAlertDate(item.fim);
    const id = typeof item.id === 'string' || typeof item.id === 'number' ? String(item.id) : '';
    const municipalityCodes = Array.isArray(item.geocodes) ? item.geocodes.map(String).filter(code => /^\d{7}$/.test(code)) : [];
    const states = strings(item.estados).filter(uf => /^[A-Z]{2}$/.test(uf));
    if (!id || !item.evento?.trim() || !item.severidade?.trim() || !startsAt || !endsAt || endsAt <= startsAt || !states.length || !municipalityCodes.length) throw new Error('Alerta sem validade ou abrangência verificável.');
    unique.set(id, {
      id, issuer: 'INMET', provider: 'RadarMeteorológico', event: item.evento.trim(), severity: item.severidade.trim(),
      level: [1, 2, 3].includes(Number(item.nivel)) ? Number(item.nivel) : 0,
      startsAt, endsAt, states, municipalityCodes,
      risks: strings(item.riscos), instructions: strings(item.instrucoes), url: detailUrl(item.url),
    });
  }
  return { version: 1, endpoint: env.alertsUrl, fetchedAt, providerUpdatedAt: parseAlertDate(payload.atualizado_em), alerts: [...unique.values()] };
}
export function selectAlerts(alerts, scope, now = Date.now()) {
  return alerts.filter(alert => Date.parse(alert.endsAt) > now)
    .filter(alert => !scope.uf || alert.states.includes(scope.uf))
    .filter(alert => !scope.municipalityCode || alert.municipalityCodes.includes(scope.municipalityCode))
    .sort((a, b) => {
      const scheduled = Number(Date.parse(a.startsAt) > now) - Number(Date.parse(b.startsAt) > now);
      return scheduled || b.level - a.level || a.startsAt.localeCompare(b.startsAt);
    });
}
function validCache(value, now) {
  return value?.version === 1 && value.endpoint === env.alertsUrl
    && Number.isFinite(value.fetchedAt) && value.fetchedAt <= now
    && now - value.fetchedAt <= ALERT_CACHE_MAX_AGE_MS
    && Array.isArray(value.alerts) && value.alerts.every(item => item && typeof item.id === 'string'
      && Number.isFinite(Date.parse(item.startsAt)) && Number.isFinite(Date.parse(item.endsAt))
      && Array.isArray(item.states) && Array.isArray(item.municipalityCodes)
      && Array.isArray(item.risks) && Array.isArray(item.instructions));
}
async function collect() {
  const now = Date.now();
  if (!memory) {
    try { const cached = JSON.parse(await storage.getItem(CACHE_KEY)); if (validCache(cached, now)) memory = cached; } catch { /* Cache failure must not prevent an online lookup. */ }
  }
  if (memory && !validCache(memory, now)) memory = null;
  if (memory && now - memory.fetchedAt < ALERT_REFRESH_MS) return { snapshot: memory, error: null };
  if (lastFailure && now - lastFailure < 60000) return { snapshot: memory, error: 'Não foi possível consultar o provedor. Nova tentativa em até um minuto.' };
  try {
    const payload = await requestJson(env.alertsUrl);
    const snapshot = normalizeAlertFeed(payload, Date.now());
    memory = snapshot; lastFailure = 0;
    try { await storage.setItem(CACHE_KEY, JSON.stringify(snapshot)); } catch { /* Live data remains usable without persistent storage. */ }
    return { snapshot, error: null };
  } catch {
    lastFailure = Date.now();
    return { snapshot: memory, error: 'Consulta de alertas indisponível. Verifique sua conexão ou consulte o INMET.' };
  }
}
export function getAlertFeed() {
  if (!inFlight) inFlight = collect().finally(() => { inFlight = null; });
  return inFlight;
}
