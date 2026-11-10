export const storage = {
  runExclusive(key, callback) {
    return typeof navigator !== 'undefined' && navigator.locks
      ? navigator.locks.request(`floody:${key}`, callback)
      : callback();
  },
  subscribe(key, callback) {
    if (typeof window === 'undefined') return () => {};
    const onStorage = event => {
      if (event.storageArea === window.localStorage && (event.key === key || event.key === null)) callback();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  },
  async getItem(key) { return globalThis.localStorage.getItem(key); },
  async setItem(key, value) { globalThis.localStorage.setItem(key, value); },
  async removeItem(key) { globalThis.localStorage.removeItem(key); },
};
