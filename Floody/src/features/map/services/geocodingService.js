import { env } from '../../../config/env';
import { buildUrl, requestJson } from '../../../services/api/externalClient';
export function searchAddresses(query, signal) {
  if (query.trim().length < 3) return Promise.resolve([]);
  return requestJson(buildUrl(`${env.geocodingUrl}/search`, { q: query, format: 'jsonv2', countrycodes: 'br', limit: 5 }), signal);
}
export async function resolveAddress(query) {
  const [first] = await searchAddresses(query);
  return first ? [Number(first.lat), Number(first.lon)] : null;
}
export async function reverseGeocode(lat, lon) {
  return (await requestJson(buildUrl(`${env.geocodingUrl}/reverse`, { lat, lon, format: 'jsonv2' }))).display_name;
}
