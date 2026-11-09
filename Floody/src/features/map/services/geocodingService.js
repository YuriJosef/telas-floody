import { env } from '../../../config/env';
import { buildUrl, requestJson } from '../../../services/api/externalClient';
export async function searchAddresses(query, signal) {
  if (query.trim().length < 3) return [];
  const matches = await requestJson(buildUrl(`${env.geocodingUrl}/search`, { q: query, format: 'jsonv2', countrycodes: 'br', limit: 5 }), signal);
  if (!Array.isArray(matches)) throw new Error('Resposta de endereços indisponível.');
  return matches.filter(match => {
    if (!match || typeof match.display_name !== 'string') return false;
    const valid = (value, bound) => (typeof value === 'number' || (typeof value === 'string' && value.trim() !== ''))
      && Number.isFinite(Number(value)) && Math.abs(Number(value)) <= bound;
    return valid(match.lat, 90) && valid(match.lon, 180);
  });
}
export async function resolveAddress(query) {
  const [first] = await searchAddresses(query);
  return first ? [Number(first.lat), Number(first.lon)] : null;
}
export async function reverseGeocode(lat, lon) {
  return (await requestJson(buildUrl(`${env.geocodingUrl}/reverse`, { lat, lon, format: 'jsonv2' }))).display_name;
}
