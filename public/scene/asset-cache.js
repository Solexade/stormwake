// Cache source promises, not mutable instances. Failed loads can be retried.
export function createAssetCache(load) {
  const pending = new Map();
  return key => {
    if (!pending.has(key)) {
      const request = Promise.resolve().then(() => load(key)).catch(error => {
        pending.delete(key);
        throw error;
      });
      pending.set(key, request);
    }
    return pending.get(key);
  };
}
