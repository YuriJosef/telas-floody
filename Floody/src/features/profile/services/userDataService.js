import { readList, changeList, localId } from '../../../services/storage/localRepository';
const vehicleKey = 'floody_vehicles';
const hasVehicleDetails = vehicle => vehicle
  && typeof vehicle.make === 'string' && vehicle.make.trim()
  && typeof vehicle.model === 'string' && vehicle.model.trim()
  && Number.isFinite(vehicle.ground_clearance_cm) && vehicle.ground_clearance_cm > 0 && vehicle.ground_clearance_cm <= 150;

function checkVehicles(items) {
  if (items.some(item => !hasVehicleDetails(item) || typeof item.id !== 'string')) throw new Error('Dados de veículos locais inválidos.');
  return items;
}

export const listVehicles = async () => checkVehicles(await readList(vehicleKey));
export function createVehicle(vehicle) {
  if (!hasVehicleDetails(vehicle)) throw new Error('Preencha marca, modelo e altura entre 0 e 150 cm.');
  return changeList(vehicleKey, items => [...checkVehicles(items), {
    make: vehicle.make.trim(), model: vehicle.model.trim(), ground_clearance_cm: vehicle.ground_clearance_cm, id: localId(),
  }]);
}
export const listFavoriteReportIds = () => readList('floody_favorites');
export const setFavoriteReport = (id, selected) => changeList('floody_favorites', items => selected ? [...new Set([...items, id])] : items.filter(item => item !== id));
