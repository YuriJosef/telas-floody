import { env } from '../../../config/env';
import { requestJson } from '../../../services/api/externalClient';
export const listVehicleMakes = () => requestJson(`${env.vehicleCatalogUrl}/carros/marcas`);
export const listVehicleModels = async (make) => (await requestJson(`${env.vehicleCatalogUrl}/carros/marcas/${encodeURIComponent(make)}/modelos`)).modelos;
