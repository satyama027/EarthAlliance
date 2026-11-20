import { act, renderHook } from '@testing-library/react';
import { POLICY_CATALOG } from '@earth-alliance/engine';
import { useGame } from '../src/game/useGame.js';
import { AUTOSAVE_SLOT, createSave, readSave, SAVE_SCHEMA_VERSION } from '../src/save/saveGame.js';
import { createMemorySaveStore } from '../src/platform/memory.js';
import type { SaveStore } from '../src/platform/types.js';

const REGION = 'north-america';
const buildout = POLICY_CATALOG.find((p) => p.funding === 'buildout')!.id;
const NOW = new Date('2026-11-20T12:00:00Z');

describe('useGame — moves', () => {
  it('records what was committed on each End Turn', () => {
    const { result } = renderHook(() => useGame());
    expect(result.current.moves).toEqual([]);
    act(() => result.current.stage(buildout, REGION));
    act(() => result.current.endTurn());
    act(() => result.current.toggleCancel(buildout, REGION));
    act(() => result.current.endTurn());
    expect(result.current.moves).toEqual([
      { selections: [{ policyId: buildout, regionId: REGION }], cancellations: [] },
      { selections: [], cancellations: [{ policyId: buildout, regionId: REGION }] },
    ]);
  });

  it('clears the moves on reset', () => {
    const { result } = renderHook(() => useGame());
    act(() => result.current.endTurn());
    act(() => result.current.reset());
    expect(result.current.moves).toEqual([]);
  });
});

describe('useGame — toSave / loadSave', () => {
  it('captures the current game as a save', () => {
    const { result } = renderHook(() => useGame({ appVersion: '9.9.9', now: () => NOW }));
    act(() => result.current.stage(buildout, REGION));
    act(() => result.current.endTurn());
    const save = result.current.toSave();
    expect(save).toMatchObject({ schemaVersion: SAVE_SCHEMA_VERSION, appVersion: '9.9.9', savedAt: NOW.toISOString() });
    expect(save.turnLog).toBe(result.current.turnLog);
    expect(save.moves).toBe(result.current.moves);
  });

  it('restores state, history, turn log and moves, and clears this-turn staging', () => {
    const source = renderHook(() => useGame());
    act(() => source.result.current.stage(buildout, REGION));
    act(() => source.result.current.endTurn());
    act(() => source.result.current.endTurn());
    const save = source.result.current.toSave();

    const { result } = renderHook(() => useGame());
    act(() => result.current.stage(buildout, 'europe'));
    act(() => result.current.loadSave(save));

    expect(result.current.state).toEqual(source.result.current.state);
    expect(result.current.turnLog).toEqual(source.result.current.turnLog);
    expect(result.current.history).toEqual(source.result.current.history);
    expect(result.current.moves).toEqual(source.result.current.moves);
    expect(result.current.staged).toEqual([]);
    expect(result.current.cancels).toEqual([]);
    expect(result.current.lastEvents).toEqual([]); // loading must not replay turn sounds
  });

  it('continues a loaded game exactly as the original would have', () => {
    const original = renderHook(() => useGame());
    act(() => original.result.current.stage(buildout, REGION));
    act(() => original.result.current.endTurn());
    const save = structuredClone(original.result.current.toSave()); // as if read back from storage

    const loaded = renderHook(() => useGame());
    act(() => loaded.result.current.loadSave(save));

    act(() => original.result.current.endTurn());
    act(() => loaded.result.current.endTurn());
    expect(loaded.result.current.state).toEqual(original.result.current.state);
  });
});

describe('useGame — autosave', () => {
  it('autosaves after every End Turn', async () => {
    const saves = createMemorySaveStore();
    const { result } = renderHook(() => useGame({ saves, now: () => NOW }));
    act(() => result.current.stage(buildout, REGION));
    act(() => result.current.endTurn());

    await vi.waitFor(async () => {
      const read = await readSave(saves, AUTOSAVE_SLOT);
      expect(read).toEqual({ ok: true, save: expect.objectContaining({ savedAt: NOW.toISOString() }) });
      if (read?.ok) expect(read.save.turnLog).toHaveLength(2);
    });

    act(() => result.current.endTurn());
    await vi.waitFor(async () => {
      const read = await readSave(saves, AUTOSAVE_SLOT);
      if (!read?.ok) throw new Error('autosave missing');
      expect(read.save.turnLog).toHaveLength(3);
      expect(read.save.moves).toHaveLength(2);
    });
  });

  it('does not overwrite an earlier autosave just by starting up', async () => {
    const saves = createMemorySaveStore();
    const earlier = renderHook(() => useGame());
    act(() => earlier.result.current.endTurn());
    const previous = earlier.result.current.toSave();
    await saves.write(AUTOSAVE_SLOT, previous);

    renderHook(() => useGame({ saves }));
    await new Promise((r) => setTimeout(r, 20));
    expect(await saves.read(AUTOSAVE_SLOT)).toEqual(previous);
  });

  it('clears the autosave when the player starts over', async () => {
    const saves = createMemorySaveStore();
    const { result } = renderHook(() => useGame({ saves }));
    act(() => result.current.endTurn());
    await vi.waitFor(async () => expect(await saves.read(AUTOSAVE_SLOT)).toBeDefined());
    act(() => result.current.reset());
    await vi.waitFor(async () => expect(await saves.read(AUTOSAVE_SLOT)).toBeUndefined());
  });

  it('keeps playing when saving fails', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const broken: SaveStore = {
      ...createMemorySaveStore(),
      write: () => Promise.reject(new Error('quota exceeded')),
    };
    const { result } = renderHook(() => useGame({ saves: broken }));
    act(() => result.current.endTurn());
    expect(result.current.state.turn).toBe(1);
    await vi.waitFor(() => expect(warn).toHaveBeenCalledWith(expect.stringMatching(/autosave/i), expect.any(Error)));
    warn.mockRestore();
  });

  it('writes a save that a fresh game can load', async () => {
    const saves = createMemorySaveStore();
    const { result } = renderHook(() => useGame({ saves }));
    act(() => result.current.endTurn());
    await vi.waitFor(async () => expect(await saves.read(AUTOSAVE_SLOT)).toBeDefined());
    const read = await readSave(saves, AUTOSAVE_SLOT);
    expect(read?.ok).toBe(true);
    // The stored copy equals what toSave() builds from the live game.
    if (read?.ok) expect(read.save).toEqual(createSave(result.current, { appVersion: read.save.appVersion, now: new Date(read.save.savedAt) }));
  });
});
