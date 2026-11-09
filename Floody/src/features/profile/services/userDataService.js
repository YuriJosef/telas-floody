import { readList, changeList, localId } from '../../../services/storage/localRepository';
export const listVehicles = () => readList('floody_vehicles');
export function createVehicle(vehicle) {
  if (!vehicle.make?.trim() || !vehicle.model?.trim() || !Number.isFinite(vehicle.ground_clearance_cm) || vehicle.ground_clearance_cm <= 0 || vehicle.ground_clearance_cm > 150) throw new Error('Preencha marca, modelo e altura entre 0 e 150 cm.');
  return changeList('floody_vehicles', items => [...items, { ...vehicle, id: localId() }]);
}
export const listFavoriteReportIds = () => readList('floody_favorites');
export const setFavoriteReport = (id, selected) => changeList('floody_favorites', items => selected ? [...new Set([...items, id])] : items.filter(item => item !== id));
