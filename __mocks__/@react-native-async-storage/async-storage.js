// Mock for Jest tests (no native module)
const store = new Map();

export default {
  getItem: jest.fn((key) => Promise.resolve(store.get(key) ?? null)),
  setItem: jest.fn((key, value) => {
    store.set(key, value);
    return Promise.resolve();
  }),
  removeItem: jest.fn((key) => {
    store.delete(key);
    return Promise.resolve();
  }),
  clear: jest.fn(() => {
    store.clear();
    return Promise.resolve();
  }),
  getAllKeys: jest.fn(() => Promise.resolve([...store.keys()])),
};
