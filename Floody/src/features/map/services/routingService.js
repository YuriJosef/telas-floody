import { env } from '../../../config/env';
import { requestJson } from '../../../services/api/externalClient';
import { routeGeometry } from './routeGeometry';

export async function getDrivingRoute(start, end, signal) {
  const coords = [start, end].map(point => {
    if (!Array.isArray(point) || point.length !== 2 || !point.every(Number.isFinite)
        || Math.abs(point[0]) > 90 || Math.abs(point[1]) > 180) {
      throw new Error('Coordenadas de origem ou destino inválidas.');
    }
    const [lat, lon] = point;
    return `${lon},${lat}`;
  }).join(';');
  const data = await requestJson(`${env.routingUrl}/route/v1/driving/${coords}?overview=full&geometries=geojson`, signal);
  if (data.code !== 'Ok' || !data.routes?.[0]) throw new Error('Não foi possível calcular a rota.');
  const route = data.routes[0];
  return { ...route, positions: routeGeometry(route) };
}
