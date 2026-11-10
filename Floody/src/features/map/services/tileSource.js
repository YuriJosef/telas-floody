export const OPEN_MAP_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const MAP_CREDITS_URL = 'https://www.openstreetmap.org/copyright';
export const MAP_CORRECTION_URL = 'https://www.openstreetmap.org/fixthemap';
export const IMAGERY_CREDITS_URL = 'https://goto.arcgisonline.com/maps/World_Imagery';
export const CARTO_CREDITS_URL = 'https://carto.com/attributions';
const osm = `&copy; <a href="${MAP_CREDITS_URL}">OpenStreetMap</a> contributors`;

export function tileSource(template) {
  if (typeof template !== 'string' || !['{x}', '{y}', '{z}'].every(part => template.includes(part))) return null;
  try {
    const url = new URL(template.replace(/\{[xyzs]\}/g, '0'));
    if (url.protocol !== 'https:' || url.username || url.password) return null;
    const host = url.hostname;
    let attribution = 'Mapa base configurado';
    if (host === 'tile.openstreetmap.org') attribution = osm;
    else if (host === 'basemaps.cartocdn.com' || host.endsWith('.basemaps.cartocdn.com')) {
      attribution = `${osm} &middot; &copy; <a href="${CARTO_CREDITS_URL}">CARTO</a>`;
    } else if (host === 'server.arcgisonline.com' && url.pathname.includes('/World_Imagery/')) {
      attribution = `<a href="${IMAGERY_CREDITS_URL}">Esri</a>, Vantor, Earthstar Geographics, GIS User Community`;
    }
    return { url: template, attribution };
  } catch {
    return null;
  }
}
