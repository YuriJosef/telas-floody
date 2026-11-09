import { env } from '../../../config/env';
import { buildUrl, requestJson } from '../../../services/api/externalClient';
export const WEATHER_REFRESH_MS = 60000;
const RECIFE_TIME_ZONE = 'America/Recife';
const recifeTime = new Intl.DateTimeFormat('pt-BR', {
  timeZone: RECIFE_TIME_ZONE, dateStyle: 'short', timeStyle: 'short',
});

export async function getCurrentPrecipitation(latitude, longitude, { withDetails = false } = {}) {
  const data = await requestJson(buildUrl(env.weatherUrl, {
    latitude, longitude, current: 'precipitation', precipitation_unit: 'mm',
    timezone: RECIFE_TIME_ZONE, timeformat: 'unixtime',
  }), undefined, { cache: 'no-store' });
  const { precipitation: amountMm, time, interval: intervalSeconds } = data.current ?? {};
  const validAt = time * 1000;
  if (!Number.isFinite(amountMm) || amountMm < 0 || data.current_units?.precipitation !== 'mm'
      || !Number.isSafeInteger(time) || time <= 0 || !Number.isFinite(new Date(validAt).getTime())
      || !Number.isSafeInteger(intervalSeconds) || intervalSeconds <= 0) {
    throw new Error('Precipitação indisponível.');
  }
  return withDetails ? { amountMm, validAt, intervalSeconds } : amountMm;
}

export function precipitationDetails(reading, now = Date.now()) {
  const { intervalSeconds, validAt } = reading;
  return {
    period: intervalSeconds % 60 === 0 ? `${intervalSeconds / 60} min` : `${intervalSeconds} s`,
    time: recifeTime.format(validAt),
    // Allow one missed model interval before flagging an old estimate.
    stale: now - validAt >= intervalSeconds * 2000,
  };
}
