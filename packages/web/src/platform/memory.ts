import type { SaveStore } from './types.js';

/**
 * A `SaveStore` that lives only as long as the page. Used in tests and as the fallback when a
 * browser has no IndexedDB (e.g. some private-browsing modes). Copies on write and read, like
 * IndexedDB's structured clone, so callers can never alias stored data.
 */
export function createMemorySaveStore(): SaveStore {
  const slots = new Map<string, unknown>();
  return {
    read: async (slot) => (slots.has(slot) ? structuredClone(slots.get(slot)) : undefined),
    write: async (slot, save) => { slots.set(slot, structuredClone(save)); },
    remove: async (slot) => { slots.delete(slot); },
    list: async () => [...slots.keys()],
  };
}
