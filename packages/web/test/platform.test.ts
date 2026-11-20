import { createInitialState } from '@earth-alliance/engine';
import { createSave } from '../src/save/saveGame.js';
import { createMemorySaveStore } from '../src/platform/memory.js';
import { createIndexedDbSaveStore } from '../src/platform/indexedDb.js';
import { createPlatform } from '../src/platform/index.js';
import type { SaveStore } from '../src/platform/types.js';

const state = createInitialState();
const save = createSave(
  { turnLog: [{ turn: 0, year: 2025, state, diagnostics: null }], moves: [] },
  { appVersion: 'test', now: new Date('2026-11-20T00:00:00Z') },
);

let dbCounter = 0;
const stores: Array<[string, () => SaveStore]> = [
  ['memory', () => createMemorySaveStore()],
  // A fresh database per test so suites never see each other's slots.
  ['IndexedDB', () => createIndexedDbSaveStore(`ea-test-${++dbCounter}`)],
];

describe.each(stores)('%s SaveStore', (_name, make) => {
  it('reads back undefined for an empty slot', async () => {
    expect(await make().read('autosave')).toBeUndefined();
  });

  it('writes and reads a save in a slot', async () => {
    const store = make();
    await store.write('autosave', save);
    expect(await store.read('autosave')).toEqual(save);
  });

  it('stores a copy, not the live object', async () => {
    const store = make();
    const mine = structuredClone(save);
    await store.write('slot', mine);
    mine.appVersion = 'mutated after write';
    expect(await store.read('slot')).toEqual(save);
  });

  it('overwrites a slot', async () => {
    const store = make();
    await store.write('autosave', save);
    await store.write('autosave', { ...save, appVersion: 'second' });
    expect(await store.read('autosave')).toMatchObject({ appVersion: 'second' });
  });

  it('lists and removes slots', async () => {
    const store = make();
    await store.write('a', save);
    await store.write('b', save);
    expect((await store.list()).sort()).toEqual(['a', 'b']);
    await store.remove('a');
    expect(await store.list()).toEqual(['b']);
    expect(await store.read('a')).toBeUndefined();
  });

  it('treats removing an empty slot as a no-op', async () => {
    await expect(make().remove('nothing-here')).resolves.toBeUndefined();
  });
});

describe('createPlatform', () => {
  it('defaults to the web platform', () => {
    expect(createPlatform().kind).toBe('web');
  });

  it('persists web saves in IndexedDB when the browser has it', async () => {
    const platform = createPlatform('web');
    await platform.saves.write('probe', save);
    // A second store over the same default database sees the write → it really hit IndexedDB.
    expect(await createIndexedDbSaveStore().read('probe')).toEqual(save);
    await platform.saves.remove('probe');
  });

  it('falls back to in-memory saves when IndexedDB is unavailable', async () => {
    const platform = createPlatform('web', { indexedDB: undefined });
    await platform.saves.write('probe', save);
    expect(await platform.saves.read('probe')).toEqual(save);
    expect(await createIndexedDbSaveStore().read('probe')).toBeUndefined();
  });

  it('rejects an unknown platform with a helpful message', () => {
    expect(() => createPlatform('toaster')).toThrow(/unknown platform "toaster"/i);
  });
});
