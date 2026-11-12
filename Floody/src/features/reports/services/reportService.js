import { randomUUID } from 'expo-crypto';
import { readList } from '../../../services/storage/localRepository';
import { storage } from '../../../services/storage/storage';
import { supabase } from '../../../services/supabase/client';
import { isAppActive, subscribeAppActivity } from '../../../services/appActivity';
import { hazardLabel, LEGACY_LABEL, REPORT_STATUS, UNVERIFIED_LABEL } from '../constants';

// Reports are created and read only through the server's controlled functions (ARCHITECTURE.md §3).
// Legacy reports saved by Floody 2.0 stay on the device, read-only; they are never uploaded.
const legacyKey = 'floody_reports';
// Written on every local change so other tabs of the same browser refresh at once (storage event).
const changeKey = 'floody_reports_changed';
// Changes made on other devices arrive by polling: every 30 s, only while the app is visible/active.
const POLL_MS = 30000;
const listeners = new Set();
let poller = null;
let stopSync = null;
// Reports this device withdrew: hidden from the public list at once, before any refresh returns.
const withdrawnIds = new Set();
// Bumped by every change; an in-flight read started before a change is never reused after it.
let generation = 0;
const inflight = new Map();

const isText = value => typeof value === 'string' && value.trim().length > 0;
const validPoint = (lat, lon) => Number.isFinite(lat) && Math.abs(lat) <= 90 && Number.isFinite(lon) && Math.abs(lon) <= 180;

export class ReportSubmissionError extends Error {
  constructor(message, code, retryable = false) {
    super(message);
    this.code = code;
    this.retryable = retryable;
  }
}

export const newSubmissionId = () => randomUUID();
export const isReportBackendConfigured = () => Boolean(supabase);

function requireBackend() {
  if (!supabase) throw new ReportSubmissionError('Serviço de relatos não configurado neste aplicativo.', 'NOT_CONFIGURED');
  return supabase;
}

// One request per data set at a time: overlapping polls and listeners share the in-flight read.
function shared(key, fetcher) {
  const current = inflight.get(key);
  if (current && current.generation === generation) return current.promise;
  const entry = { generation, promise: null };
  entry.promise = fetcher().finally(() => { if (inflight.get(key) === entry) inflight.delete(key); });
  inflight.set(key, entry);
  return entry.promise;
}

function refreshAll() { listeners.forEach(callback => callback()); }

// A report was created or withdrawn on this device: invalidate reads, refresh every view, tell other tabs.
function changed() {
  generation++;
  refreshAll();
  if (storage.subscribe) storage.setItem(changeKey, String(Date.now())).catch(() => {});
}

function startPolling() {
  if (!poller && isAppActive()) poller = setInterval(() => { if (isAppActive()) refreshAll(); }, POLL_MS);
}
function stopPolling() {
  if (poller) { clearInterval(poller); poller = null; }
}
function startSync() {
  startPolling();
  const stopActivity = subscribeAppActivity(active => {
    if (active) { refreshAll(); startPolling(); } else stopPolling();
  });
  const stopCrossTab = storage.subscribe?.(changeKey, () => { generation++; refreshAll(); });
  const stopLegacy = storage.subscribe?.(legacyKey, refreshAll);
  return () => { stopPolling(); stopActivity(); stopCrossTab?.(); stopLegacy?.(); };
}

function fromServer(row) {
  if (!row || !isText(row.id) || !validPoint(row.latitude, row.longitude) || !isText(row.description)) return null;
  return {
    id: row.id,
    latitude: row.latitude,
    longitude: row.longitude,
    description: row.description,
    location_label: isText(row.location_label) ? row.location_label : 'Local informado pelo autor',
    hazard_code: row.hazard_type,
    hazard_type: hazardLabel(row.hazard_type),
    location_source: row.location_source,
    status: REPORT_STATUS.published,
    status_label: UNVERIFIED_LABEL,
    occurred_at: row.observed_at,
    expires_at: row.expires_at,
  };
}

async function listLegacyReports() {
  try {
    const items = await readList(legacyKey);
    return items.filter(item => item && isText(item.id) && validPoint(item.latitude, item.longitude) && isText(item.description))
      .map(item => ({ ...item, status: REPORT_STATUS.legacyLocal, status_label: LEGACY_LABEL }));
  } catch {
    return []; // Corrupt legacy data is left untouched in storage and not shown.
  }
}

export async function listPublishedReports() {
  const client = requireBackend();
  const rows = await shared('published', async () => {
    const { data, error } = await client.rpc('list_published_reports');
    if (error) throw new Error('Não foi possível carregar os relatos publicados. Verifique a conexão.');
    return Array.isArray(data) ? data : [];
  });
  return rows.map(fromServer).filter(report => report && !withdrawnIds.has(report.id));
}

// Published reports from the server followed by this device's legacy, never-published reports.
// If the published list cannot be loaded (backend not configured, network or server failure), the
// call still rejects so the failure is shown, but the error carries the legacy reports in `partial`:
// they live on this device and must stay readable without the server.
export async function listReports() {
  const [published, legacy] = await Promise.allSettled([listPublishedReports(), listLegacyReports()]);
  const local = legacy.status === 'fulfilled' ? legacy.value : [];
  if (published.status === 'rejected') {
    // A fresh error: the original may be shared by concurrent readers of the same in-flight request.
    const reason = published.reason;
    throw Object.assign(new Error(reason?.message || 'Não foi possível carregar os relatos publicados.'),
      { code: reason?.code, partial: local });
  }
  return [...published.value, ...local];
}
export const listLocalReports = listLegacyReports;

// Views register here to reload after local changes, on returning to the foreground, on changes from
// other tabs, and on the 30 s poll. Polling runs only while at least one view is mounted.
export function subscribeToReports(callback) {
  listeners.add(callback);
  if (!stopSync) stopSync = startSync();
  return () => {
    if (listeners.delete(callback) && !listeners.size && stopSync) { stopSync(); stopSync = null; }
  };
}

const fieldNames = {
  hazard_type: 'tipo de ocorrência', description: 'descrição', location_label: 'local', latitude: 'localização',
  longitude: 'localização', location_source: 'origem da localização', gps_accuracy_m: 'precisão do GPS', observed_at: 'horário da observação',
};

function rejection(result) {
  const code = result?.code;
  switch (code) {
    case 'AUTH_REQUIRED': return new ReportSubmissionError('Entre na sua conta para enviar o relato.', code);
    case 'EMAIL_NOT_VERIFIED': return new ReportSubmissionError('Confirme seu e-mail antes de enviar relatos. Depois de confirmar, entre novamente.', code);
    case 'FORBIDDEN': return new ReportSubmissionError('Sua conta não pode enviar relatos no momento.', code);
    case 'VALIDATION_FAILED': {
      const fields = [...new Set((result.details?.fields ?? []).map(field => fieldNames[field] ?? field))];
      return new ReportSubmissionError(`Revise o relato: ${fields.join(', ') || 'dados inválidos'}.`, code);
    }
    case 'OBSERVED_AT_IN_FUTURE': return new ReportSubmissionError('O relógio do aparelho parece adiantado. Ajuste a hora e obtenha a localização novamente.', code);
    case 'OBSERVATION_TOO_OLD': return new ReportSubmissionError('A observação tem mais de 6 horas e não pode ser publicada. Obtenha a localização novamente para registrar uma nova observação.', code);
    case 'OUTSIDE_SERVICE_AREA': return new ReportSubmissionError('O Floody aceita relatos apenas dentro da Região Metropolitana do Recife.', code);
    case 'RATE_LIMITED': {
      const minutes = Math.max(1, Math.ceil((Number(result.details?.retry_after_s) || 60) / 60));
      return new ReportSubmissionError(`Limite de envios atingido. Tente novamente em cerca de ${minutes} min.`, code, true);
    }
    case 'SERVICE_UNAVAILABLE': return new ReportSubmissionError('O serviço de relatos está temporariamente indisponível. Tente novamente mais tarde.', code, true);
    case 'IDEMPOTENCY_CONFLICT': return new ReportSubmissionError('Este relato já havia sido enviado com outro conteúdo. Confira os relatos publicados antes de enviar de novo.', code);
    default: return new ReportSubmissionError('Não foi possível confirmar o envio. Verifique a conexão e toque em enviar novamente; o mesmo relato não será duplicado.', 'UNKNOWN', true);
  }
}

// Sends one report. `submissionId` must stay the same when retrying the same content, so a lost
// response never creates a duplicate. Resolves with { id, status, replayed } or throws ReportSubmissionError.
export async function createReport(report) {
  const client = requireBackend();
  if (!report || !validPoint(report.latitude, report.longitude)) throw new ReportSubmissionError('Obtenha a localização antes de enviar o relato.', 'VALIDATION_FAILED');
  if (!isText(report.description) || report.description.length > 2000) throw new ReportSubmissionError('Descreva o que observou (até 2000 caracteres).', 'VALIDATION_FAILED');
  if (!isText(report.submissionId) || !isText(report.observedAt)) throw new ReportSubmissionError('Obtenha a localização novamente antes de enviar.', 'VALIDATION_FAILED');
  let response;
  try {
    response = await client.rpc('submit_report', {
      p_client_submission_id: report.submissionId,
      p_hazard_type: report.hazardCode,
      p_description: report.description.trim(),
      p_location_label: isText(report.location_label) ? report.location_label.trim().slice(0, 200) : null,
      p_latitude: report.latitude,
      p_longitude: report.longitude,
      p_location_source: report.locationSource ?? 'gps',
      p_gps_accuracy_m: Number.isFinite(report.accuracy) ? report.accuracy : null,
      p_observed_at: report.observedAt,
    });
  } catch {
    throw rejection(null);
  }
  const { data, error } = response;
  if (error) {
    if (error.code === 'PGRST301' || error.code === '42501' || /jwt/i.test(error.message ?? '')) {
      throw new ReportSubmissionError('Sua sessão expirou. Entre novamente para enviar o relato.', 'AUTH_REQUIRED');
    }
    throw rejection(null);
  }
  if (!data?.ok) throw rejection(data);
  changed();
  return { id: data.report?.id, status: data.report?.status, replayed: Boolean(data.replayed) };
}

// The signed-in author's own reports, with their current server status (my_reports RPC).
export async function listMyReports(userId = 'current') {
  const client = requireBackend();
  const data = await shared(`mine:${userId}`, async () => {
    const { data: rows, error } = await client.rpc('my_reports');
    if (error) {
      if (error.code === 'PGRST301' || /jwt/i.test(error.message ?? '')) throw new ReportSubmissionError('Sua sessão expirou. Entre novamente.', 'AUTH_REQUIRED');
      throw new Error('Não foi possível carregar seus relatos. Verifique a conexão.');
    }
    return Array.isArray(rows) ? rows : [];
  });
  return data.filter(row => row && isText(row.id)).map(row => ({
    id: row.id,
    hazard_code: row.hazard_type,
    hazard_type: hazardLabel(row.hazard_type),
    description: row.description,
    location_label: isText(row.location_label) ? row.location_label : 'Local informado pelo autor',
    status: row.status,
    occurred_at: row.observed_at,
    expires_at: row.expires_at,
    withdrawable: ['held', 'published', 'hidden'].includes(row.status),
  }));
}

const withdrawing = new Set();

// Withdraws one of the author's reports. Ownership is enforced by the server; a report of another
// user answers NOT_FOUND. A repeated call while one is in flight is refused.
export async function withdrawReport(reportId) {
  const client = requireBackend();
  if (!isText(reportId)) throw new ReportSubmissionError('Relato inválido.', 'VALIDATION_FAILED');
  if (withdrawing.has(reportId)) throw new ReportSubmissionError('A retirada deste relato já está em andamento.', 'IN_PROGRESS');
  withdrawing.add(reportId);
  try {
    let response;
    try { response = await client.rpc('withdraw_report', { p_report_id: reportId }); }
    catch { throw new ReportSubmissionError('Não foi possível confirmar a retirada. Verifique a conexão e tente novamente.', 'UNKNOWN', true); }
    const { data, error } = response;
    if (error) {
      if (error.code === 'PGRST301' || error.code === '42501' || /jwt/i.test(error.message ?? '')) {
        throw new ReportSubmissionError('Sua sessão expirou. Entre novamente para retirar o relato.', 'AUTH_REQUIRED');
      }
      throw new ReportSubmissionError('Não foi possível confirmar a retirada. Verifique a conexão e tente novamente.', 'UNKNOWN', true);
    }
    // A retry after a lost response finds the report already withdrawn: that is the requested outcome.
    const alreadyWithdrawn = data?.code === 'CONFLICT_STATE' && data.details?.status === 'withdrawn';
    if (!data?.ok && !alreadyWithdrawn) {
      if (data?.code === 'NOT_FOUND') throw new ReportSubmissionError('Relato não encontrado nesta conta.', 'NOT_FOUND');
      if (data?.code === 'CONFLICT_STATE') throw new ReportSubmissionError('Este relato já foi encerrado e não pode mais ser retirado.', 'CONFLICT_STATE');
      if (data?.code === 'AUTH_REQUIRED') throw new ReportSubmissionError('Entre na sua conta para retirar o relato.', 'AUTH_REQUIRED');
      throw new ReportSubmissionError('Não foi possível retirar o relato.', data?.code ?? 'UNKNOWN');
    }
    withdrawnIds.add(reportId);
    changed(); // Public list, map markers and My Reports reload from the server.
    return { id: reportId, status: 'withdrawn' };
  } finally {
    withdrawing.delete(reportId);
  }
}

// Approval must be implemented by an authenticated server, never by a client role.
export async function updateReportStatus() { throw new Error('Moderação requer um backend autenticado.'); }
