// Simple storage wrapper using localStorage
const STORE_KEY = 'family_recipes_v1';

export const Storage = {
  load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Failed to load storage', e);
      return [];
    }
  },
  save(items) {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save storage', e);
    }
  },
  clear() {
    localStorage.removeItem(STORE_KEY);
  }
};
