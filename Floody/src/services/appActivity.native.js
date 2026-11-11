import { AppState } from 'react-native';

// Whether the app is in the foreground, for pausing background work.
export function isAppActive() {
  return AppState.currentState === 'active' || AppState.currentState == null;
}

export function subscribeAppActivity(callback) {
  const subscription = AppState.addEventListener('change', state => callback(state === 'active'));
  return () => subscription.remove();
}
