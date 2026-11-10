import { env } from '../../../config/env';
import { requestJson } from '../../../services/api/externalClient';
function validateCatalog(items) {
  if (!Array.isArray(items) || items.some(item => !item
      || !(Number.isFinite(item.codigo) || (typeof item.codigo === 'string' && item.codigo.trim()))
      || typeof item.nome !== 'string' || !item.nome.trim())) {
    throw new Error('Resposta do catálogo de veículos inválida.');
  }
  return items;
}

export async function listVehicleMakes(signal) {
  const items = validateCatalog(await requestJson(`${env.vehicleCatalogUrl}/carros/marcas`, signal));
  return items.map(item => ({ ...item, codigo: String(item.codigo) }));
}

export async function listVehicleModels(make, signal) {
  const data = await requestJson(`${env.vehicleCatalogUrl}/carros/marcas/${encodeURIComponent(make)}/modelos`, signal);
  return validateCatalog(data?.modelos);
}
