import { downloadSave } from '../save/saveFile.js';
import { createIndexedDbSaveStore } from './indexedDb.js';
import { createMemorySaveStore } from './memory.js';
import type { Platform } from './types.js';

export type { Platform, PlatformKind, SaveStore } from './types.js';

/**
 * Build the platform adapter for this build. The kind comes from the `VITE_PLATFORM` build
 * variable (default `web`); mobile and desktop shells will add their own kinds (ADR-0001).
 * `env` is injectable so tests can simulate a browser without IndexedDB.
 */
export function createPlatform(
  kind: string = import.meta.env.VITE_PLATFORM ?? 'web',
  env: { indexedDB?: IDBFactory } = { indexedDB: globalThis.indexedDB },
): Platform {
  switch (kind) {
    case 'web':
      return {
        kind: 'web',
        saves: env.indexedDB ? createIndexedDbSaveStore() : createMemorySaveStore(),
        exportSave: async (save) => downloadSave(save),
      };
    default:
      throw new Error(`Unknown platform "${kind}" (set VITE_PLATFORM to one of: web)`);
  }
}
