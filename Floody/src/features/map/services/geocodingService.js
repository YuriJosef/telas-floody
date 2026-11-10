import { env } from '../../../config/env';
import { buildUrl, requestJson } from '../../../services/api/externalClient';
import { createGeocodingRateGate } from './geocodingRateGate';

const endpoint = 'https://api.geoapify.com/v1/geocode';
const brazilSearch = { filter: 'countrycode:br', bias: 'proximity:-34.8813,-8.05428' };
const rateGate = createGeocodingRateGate();
const quotaMessage = 'Limite de consultas de endereço atingido. Tente novamente mais tarde.';

export class GeocodingError extends Error {}

export function normalizeAddressQuery(query) {
  return query.trim().replace(/\s+/g, ' ');
}

export function hasAddressQuery(query) {
  return (query.match(/[\p{L}\p{N}]/gu)?.length ?? 0) >= 3;
}

function validCoordinate(value, bound) {
  return Number.isFinite(value) && Math.abs(value) <= bound;
}

const textValue = value => typeof value === 'string' ? value.trim() : '';

function normalizeFeature(feature) {
  const point = feature?.geometry;
  if (point?.type !== 'Point' || !Array.isArray(point.coordinates)) return null;
  const [lon, lat] = point.coordinates;
  if (!validCoordinate(lat, 90) || !validCoordinate(lon, 180)) return null;
  const p = feature.properties ?? {};
  const street = textValue(p.street);
  const houseNumber = textValue(p.housenumber);
  const neighborhood = textValue(p.suburb) || textValue(p.district) || textValue(p.neighbourhood);
  const city = textValue(p.city) || textValue(p.town) || textValue(p.village);
  const state = textValue(p.state);
  const country = textValue(p.country);
  const display_name = textValue(p.formatted)
    || [p.address_line1, p.address_line2].map(textValue).filter(Boolean).join(', ')
    || [textValue(p.name) || street, houseNumber, neighborhood, city, state, country].filter(Boolean).join(', ');
  if (!display_name) return null;
  return { display_name, lat, lon, street, houseNumber, neighborhood, city, state, country, id: textValue(p.place_id) };
}

async function geocode(operation, params, signal) {
  const apiKey = env.geoapifyApiKey.trim();
  if (!apiKey) {
    throw new GeocodingError('Busca de endereços não configurada. Defina a chave Geoapify em Floody/.env.local.');
  }
  if (signal?.aborted) throw new GeocodingError('Consulta de endereço cancelada.');
  if (!rateGate.claim()) throw new GeocodingError(quotaMessage);
  let data;
  try {
    data = await requestJson(buildUrl(`${endpoint}/${operation}`, { ...params, lang: 'pt', format: 'geojson', apiKey }), signal, { cache: 'no-store' });
  } catch (error) {
    // Provider or fetch errors can include the authenticated URL. Surface only safe messages.
    if (error?.status === 429) rateGate.coolDown(error.retryAfter);
    if (signal?.aborted) throw new GeocodingError('Consulta de endereço cancelada.');
    if (error?.status === 401 || error?.status === 403) {
      throw new GeocodingError('A Geoapify recusou a consulta. Verifique a chave e suas restrições.');
    }
    if (error?.status === 429) {
      throw new GeocodingError(quotaMessage);
    }
    throw new GeocodingError('Busca de endereços indisponível. Tente novamente mais tarde.');
  }
  if (data?.type !== 'FeatureCollection' || !Array.isArray(data.features)) {
    throw new GeocodingError('Resposta de endereços inválida. Tente novamente mais tarde.');
  }
  const results = data.features.map(normalizeFeature).filter(Boolean);
  if (data.features.length && !results.length) {
    throw new GeocodingError('Resposta de endereços inválida. Tente novamente mais tarde.');
  }
  return results;
}

export async function searchAddresses(query, signal) {
  const text = normalizeAddressQuery(query);
  if (!hasAddressQuery(text)) return [];
  const matches = await geocode('autocomplete', { text, ...brazilSearch, limit: 5 }, signal);
  return matches.slice(0, 5);
}

export async function resolveAddress(query, signal) {
  const text = normalizeAddressQuery(query);
  if (!hasAddressQuery(text)) return null;
  const [first] = await geocode('search', { text, ...brazilSearch, limit: 1 }, signal);
  return first ? [first.lat, first.lon] : null;
}

export async function reverseGeocode(lat, lon, signal) {
  if (!validCoordinate(lat, 90) || !validCoordinate(lon, 180)) {
    throw new GeocodingError('Coordenadas inválidas para consultar o endereço.');
  }
  const [first] = await geocode('reverse', { lat, lon, limit: 1 }, signal);
  return first?.display_name ?? null;
}
