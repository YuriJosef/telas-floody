export const LOCAL_AREA_PROFILES = [
  { name: 'Recife Antigo', coords: [-8.0631, -34.8711] },
  { name: 'Av. Agamenon Magalhães', coords: [-8.0475, -34.8969] },
  { name: 'Boa Viagem', coords: [-8.1191, -34.8964] },
  { name: 'Centro', coords: [-8.0607, -34.8811] },
];

export function normalizeText(value) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase();
}

export function classifyHazard(report) {
  const text = normalizeText(`${report.hazard_type} ${report.description}`);
  if (/alag|enchent|intransitavel|acumulo/.test(text)) return 'flood';
  if (/transito|congestion|retencao/.test(text)) return 'traffic';
  if (/obra|interdicao/.test(text)) return 'works';
  return 'hazard';
}

export function findAreaProfile(name, coords) {
  const normalizedName = normalizeText(name);
  const matchedProfile = LOCAL_AREA_PROFILES.find((profile) =>
    normalizedName.includes(normalizeText(profile.name))
    || normalizeText(profile.name).includes(normalizedName)
  );
  if (matchedProfile) return matchedProfile;

  return LOCAL_AREA_PROFILES.reduce((closest, profile) => {
    const distance = Math.hypot(profile.coords[0] - coords[0], profile.coords[1] - coords[1]);
    const closestDistance = Math.hypot(closest.coords[0] - coords[0], closest.coords[1] - coords[1]);
    return distance < closestDistance ? profile : closest;
  }, LOCAL_AREA_PROFILES[0]);
}

export function getDistanceKm(start, end) {
  const radians = (degrees) => degrees * Math.PI / 180;
  const [startLat, startLng] = start.map(radians);
  const [endLat, endLng] = end.map(radians);
  const latitudeDelta = endLat - startLat;
  const longitudeDelta = endLng - startLng;
  const arc = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(startLat) * Math.cos(endLat) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(arc), Math.sqrt(1 - arc));
}

