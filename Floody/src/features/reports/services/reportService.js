import { readList, changeList, localId } from '../../../services/storage/localRepository';
const listeners = new Set();
export const listReports = () => readList('floody_reports');
export const listLocalReports = listReports;
export function subscribeToReports(callback) { listeners.add(callback); return () => listeners.delete(callback); }
export async function createReport(report) {
  if (!Number.isFinite(report.latitude) || Math.abs(report.latitude) > 90 || !Number.isFinite(report.longitude) || Math.abs(report.longitude) > 180) throw new Error('Localização inválida.');
  if (!report.description?.trim() || !report.location_label?.trim() || !report.hazard_type?.trim() || report.description.length > 2000) throw new Error('Preencha local, tipo e descrição (até 2000 caracteres).');
  await changeList('floody_reports', items => [...items, { ...report, id: localId(), author_id: 'local-device', status: 'Pendente', occurred_at: new Date().toISOString() }]);
  listeners.forEach(callback => callback());
}
// Approval must be implemented by an authenticated server, never by a client role.
export async function updateReportStatus() { throw new Error('Moderação requer um backend autenticado.'); }
