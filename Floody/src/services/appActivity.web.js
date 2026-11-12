// Whether the page is visible, for pausing background work in hidden tabs.
export function isAppActive() {
  return typeof document === 'undefined' || document.visibilityState !== 'hidden';
}

export function subscribeAppActivity(callback) {
  if (typeof document === 'undefined') return () => {};
  const listener = () => callback(isAppActive());
  document.addEventListener('visibilitychange', listener);
  return () => document.removeEventListener('visibilitychange', listener);
}
