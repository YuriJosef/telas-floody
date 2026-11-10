import { useEffect, useState } from 'react';

function isVisible() {
  return typeof document === 'undefined' || document.visibilityState !== 'hidden';
}

export function useForeground() {
  const [foreground, setForeground] = useState(isVisible);
  useEffect(() => {
    const update = () => setForeground(isVisible());
    document.addEventListener('visibilitychange', update);
    update();
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  return foreground;
}
