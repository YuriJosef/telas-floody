import { readList, changeList, localId } from '../../../services/storage/localRepository';
import { storage } from '../../../services/storage/storage';
const listeners = new Set();
const reportKey = 'floody_reports';
const isText = value => typeof value === 'string' && value.trim().length > 0;
const hasCoordinates = report => Number.isFinite(report.latitude) && Math.abs(report.latitude) <= 90
  && Number.isFinite(report.longitude) && Math.abs(report.longitude) <= 180;

function checkReportList(items) {
  if (items.some(report => !report || !isText(report.id) || !hasCoordinates(report)
      || !isText(report.description) || report.description.length > 2000 || !isText(report.location_label)
      || !isText(report.hazard_type) || !isText(report.status)
      || typeof report.occurred_at !== 'string' || !Number.isFinite(Date.parse(report.occurred_at)))) {
    throw new Error('Dados de relatos locais inválidos.');
  }
  return items;
}

export const listReports = async () => checkReportList(await readList(reportKey));
export const listLocalReports = listReports;
export function subscribeToReports(callback) {
  listeners.add(callback);
  const unsubscribe = storage.subscribe?.(reportKey, callback);
  return () => { listeners.delete(callback); unsubscribe?.(); };
}
export async function createReport(report) {
  if (!report || !hasCoordinates(report)) throw new Error('Localização inválida.');
  if (!isText(report.description) || report.description.length > 2000 || !isText(report.location_label) || !isText(report.hazard_type)) {
    throw new Error('Preencha local, tipo e descrição (até 2000 caracteres).');
  }
  await changeList(reportKey, items => [...checkReportList(items), {
    latitude: report.latitude, longitude: report.longitude,
    description: report.description.trim(), location_label: report.location_label.trim(), hazard_type: report.hazard_type.trim(),
    id: localId(), author_id: 'local-device', status: 'Pendente', occurred_at: new Date().toISOString(),
  }]);
  listeners.forEach(callback => callback());
}
// Approval must be implemented by an authenticated server, never by a client role.
export async function updateReportStatus() { throw new Error('Moderação requer um backend autenticado.'); }
