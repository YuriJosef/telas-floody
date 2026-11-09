// Only public settings belong here. EXPO_PUBLIC values are embedded in the app.
export const env = {
  alertsUrl: process.env.EXPO_PUBLIC_ALERTS_URL || 'https://radarmeteorologico.com.br/api/v1/alertas',
  weatherUrl: process.env.EXPO_PUBLIC_WEATHER_URL || 'https://api.open-meteo.com/v1/forecast',
  geocodingUrl: process.env.EXPO_PUBLIC_GEOCODING_URL || 'https://nominatim.openstreetmap.org',
  routingUrl: process.env.EXPO_PUBLIC_ROUTING_URL || 'https://router.project-osrm.org',
  vehicleCatalogUrl: process.env.EXPO_PUBLIC_VEHICLE_CATALOG_URL || 'https://parallelum.com.br/fipe/api/v1',
  mapTilesLight: process.env.EXPO_PUBLIC_MAP_TILES_LIGHT || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  mapTilesDark: process.env.EXPO_PUBLIC_MAP_TILES_DARK || process.env.EXPO_PUBLIC_MAP_TILES_LIGHT || 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  mapTilesSatellite: process.env.EXPO_PUBLIC_MAP_TILES_SATELLITE || 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  mapMarkerIcon: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  mapMarkerIconRetina: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  mapMarkerShadow: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
};
