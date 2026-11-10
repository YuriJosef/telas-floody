import { useCallback, useEffect, useRef } from 'react';

// One request slot per interaction. Abort on replacement and unmount.
export function useLatestRequest() {
  const current = useRef(null);
  const cancel = useCallback(() => {
    current.current?.abort();
    current.current = null;
  }, []);
  const start = useCallback(() => {
    cancel();
    const controller = new AbortController();
    current.current = controller;
    return controller.signal;
  }, [cancel]);
  useEffect(() => cancel, [cancel]);
  return { start, cancel };
}
