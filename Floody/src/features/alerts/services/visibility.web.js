export function subscribeToAlertVisibility(callback) {
  const onVisible = () => { if (document.visibilityState === 'visible') callback(); };
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('focus', onVisible);
  return () => { document.removeEventListener('visibilitychange', onVisible); window.removeEventListener('focus', onVisible); };
}
