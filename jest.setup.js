// Avoid teardown crash when React test-renderer reports errors in Node (no real window)
if (typeof globalThis.window !== 'undefined' && typeof globalThis.window.dispatchEvent !== 'function') {
  globalThis.window.dispatchEvent = () => {};
}
