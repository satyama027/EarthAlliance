import { createStore, del, get, keys, set } from 'idb-keyval';
import type { SaveStore } from './types.js';

export const DEFAULT_SAVE_DB = 'earth-alliance';
const SAVE_OBJECT_STORE = 'saves';

/**
 * Browser saves in IndexedDB (ADR-0001): async, a large quota, and structured-clone storage —
 * a full ~500 KB game is stored as an object, no JSON round-trip. Each slot is one key.
 */
export function createIndexedDbSaveStore(dbName: string = DEFAULT_SAVE_DB): SaveStore {
  const store = createStore(dbName, SAVE_OBJECT_STORE);
  return {
    read: (slot) => get(slot, store),
    write: (slot, save) => set(slot, save, store),
    remove: (slot) => del(slot, store),
    list: async () => (await keys(store)).map(String),
  };
}
