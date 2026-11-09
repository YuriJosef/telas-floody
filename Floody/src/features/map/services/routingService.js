import { env } from '../../../config/env';
import { requestJson } from '../../../services/api/externalClient';
export async function getDrivingRoute(start, end) {
  const coords = [start, end].map(([lat, lon]) => `${lon},${lat}`).join(';');
  const data = await requestJson(`${env.routingUrl}/route/v1/driving/${coords}?overview=full&geometries=geojson`);
  if (data.code !== 'Ok' || !data.routes?.[0]) throw new Error('Não foi possível calcular a rota.');
  return data.routes[0];
}
