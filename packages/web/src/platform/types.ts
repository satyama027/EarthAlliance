import type { SaveGame } from '../save/saveGame.js';

/**
 * The platform port (ADR-0001). Everything that differs between the browser, the mobile
 * shell and the desktop shell sits behind this interface; the rest of the app — and the
 * engine — never branches on platform.
 */
export type PlatformKind = 'web';

/** Named save slots (e.g. `autosave`). Values are stored as copies, never live objects. */
export interface SaveStore {
  /** The raw stored value, or `undefined` for an empty slot. Validate with `parseSave`. */
  read(slot: string): Promise<unknown>;
  write(slot: string, save: SaveGame): Promise<void>;
  /** Removing an empty slot is a no-op. */
  remove(slot: string): Promise<void>;
  list(): Promise<string[]>;
}

export interface Platform {
  kind: PlatformKind;
  saves: SaveStore;
  /** Hand the save to the player as a file (browser: a download). */
  exportSave(save: SaveGame): Promise<void>;
}
