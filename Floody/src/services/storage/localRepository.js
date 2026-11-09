import { storage } from './storage';
let pending = Promise.resolve();
export async function readList(key) {
  const value = await storage.getItem(key);
  if (!value) return [];
  const data = JSON.parse(value);
  if (!Array.isArray(data)) throw new Error('Dados locais inválidos.');
  return data;
}
// Serialize read-modify-write operations to avoid losing concurrent submissions.
export function changeList(key, update) {
  const operation = pending.then(async () => {
    const next = update(await readList(key));
    await storage.setItem(key, JSON.stringify(next));
    return next;
  });
  pending = operation.catch(() => {});
  return operation;
}
export function localId() { return `${Date.now()}-${Math.random().toString(36).slice(2)}`; }
