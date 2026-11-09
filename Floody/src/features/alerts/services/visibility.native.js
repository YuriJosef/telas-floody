import { AppState } from 'react-native';
export function subscribeToAlertVisibility(callback) {
  const subscription = AppState.addEventListener('change', state => { if (state === 'active') callback(); });
  return () => subscription.remove();
}
