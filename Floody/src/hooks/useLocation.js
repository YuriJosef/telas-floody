import { useCallback } from 'react';
import * as Location from 'expo-location';
async function requirePermission() {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== 'granted') throw new Error('Permita o acesso à localização nas configurações do dispositivo.');
}
export function useLocation() {
  const getCurrentLocation = useCallback(async () => {
    await requirePermission();
    const { coords } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    return [coords.latitude, coords.longitude];
  }, []);
  // Same fix, plus the reported horizontal accuracy in metres (null when the platform gives none).
  const getCurrentPosition = useCallback(async () => {
    await requirePermission();
    const { coords } = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
    return { coords: [coords.latitude, coords.longitude], accuracy: Number.isFinite(coords.accuracy) ? coords.accuracy : null };
  }, []);
  const watchLocation = useCallback(async (callback) => {
    await requirePermission();
    return Location.watchPositionAsync({ accuracy: Location.Accuracy.High, distanceInterval: 15 }, ({ coords }) => callback([coords.latitude, coords.longitude]));
  }, []);
  return { getCurrentLocation, getCurrentPosition, watchLocation };
}
