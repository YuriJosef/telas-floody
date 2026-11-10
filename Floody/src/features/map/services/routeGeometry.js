export function routeGeometry(route) {
  const coordinates = route?.geometry?.coordinates;
  if (route?.geometry?.type !== 'LineString' || !Array.isArray(coordinates) || coordinates.length < 2 || coordinates.length > 50000
      || !Number.isFinite(route.distance) || route.distance < 0
      || !Number.isFinite(route.duration) || route.duration < 0) {
    throw new Error('Traçado de rota indisponível.');
  }
  const positions = coordinates.map(point => {
    if (!Array.isArray(point)) throw new Error('Coordenadas de rota inválidas.');
    const [longitude, latitude] = point;
    if (!Number.isFinite(latitude) || Math.abs(latitude) > 90
        || !Number.isFinite(longitude) || Math.abs(longitude) > 180) {
      throw new Error('Coordenadas de rota inválidas.');
    }
    return [latitude, longitude];
  });
  if (positions.every(([lat, lon]) => lat === positions[0][0] && lon === positions[0][1])) {
    throw new Error('Traçado de rota indisponível.');
  }
  return positions;
}
