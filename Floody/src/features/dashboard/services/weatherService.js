import { env } from '../../../config/env';
import { buildUrl, requestJson } from '../../../services/api/externalClient';
export async function getCurrentPrecipitation(latitude, longitude) {
  const data = await requestJson(buildUrl(env.weatherUrl, { latitude, longitude, current: 'precipitation' }));
  const value = data.current?.precipitation;
  if (typeof value !== 'number') throw new Error('Precipitação indisponível.');
  return value;
}
