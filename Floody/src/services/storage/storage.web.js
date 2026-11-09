export const storage = {
  async getItem(key) { return globalThis.localStorage.getItem(key); },
  async setItem(key, value) { globalThis.localStorage.setItem(key, value); },
  async removeItem(key) { globalThis.localStorage.removeItem(key); },
};
