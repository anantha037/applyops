global.window = { dispatchEvent: () => {} };
global.localStorage = {
  store: {},
  getItem(key) { return this.store[key] || null },
  setItem(key, val) { this.store[key] = val },
  removeItem(key) { delete this.store[key] }
};

// Simulate import.meta.env
global.import = { meta: { env: { VITE_API_BASE_URL: 'http://localhost' } } };

import('./test_interceptor.mjs');
