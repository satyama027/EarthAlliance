import { createInitialState, advanceTurn, POLICY_CATALOG } from '@earth-alliance/engine';
import type { TurnRecord } from '../src/game/useGame.js';
import {
  SAVE_SCHEMA_VERSION, createSave, parseSave, serializeSave, readSave,
  type SaveGame, type TurnMoves,
} from '../src/save/saveGame.js';
import { createMemorySaveStore } from '../src/platform/memory.js';

const REGION = 'north-america';
const buildout = POLICY_CATALOG.find((p) => p.funding === 'buildout')!.id;

/** Play `n` turns through the real engine, returning the log + moves useGame would hold. */
function play(n: number): { turnLog: TurnRecord[]; moves: TurnMoves[] } {
  let state = createInitialState();
  const turnLog: TurnRecord[] = [{ turn: state.turn, year: state.year, state, diagnostics: null }];
  const moves: TurnMoves[] = [];
  for (let i = 0; i < n; i++) {
    const selections = i === 0 ? [{ policyId: buildout, regionId: REGION }] : [];
    const r = advanceTurn(state, selections, []);
    state = r.state;
    turnLog.push({ turn: state.turn, year: state.year, state, diagnostics: r.diagnostics });
    moves.push({ selections, cancellations: [] });
  }
  return { turnLog, moves };
}

const meta = { appVersion: '1.2.3', now: new Date('2026-11-20T10:00:00Z') };

describe('createSave', () => {
  it('wraps the game in a versioned envelope', () => {
    const game = play(2);
    const save = createSave(game, meta);
    expect(save.schemaVersion).toBe(SAVE_SCHEMA_VERSION);
    expect(save.appVersion).toBe('1.2.3');
    expect(save.savedAt).toBe('2026-11-20T10:00:00.000Z');
    expect(save.turnLog).toBe(game.turnLog);
    expect(save.moves).toBe(game.moves);
  });

  it('records the starting seed so the moves can be replayed deterministically', () => {
    const game = play(2);
    const save = createSave(game, meta);
    expect(save.seed).toBe(game.turnLog[0]!.state.rngSeed);
  });
});

describe('parseSave', () => {
  const valid = (): SaveGame => createSave(play(2), meta);

  it('round-trips a save through its JSON text', () => {
    const save = valid();
    const result = parseSave(serializeSave(save));
    expect(result).toEqual({ ok: true, save: JSON.parse(serializeSave(save)) });
  });

  it('accepts an already-parsed object (as IndexedDB returns it)', () => {
    const save = valid();
    const result = parseSave(save);
    expect(result.ok).toBe(true);
  });

  it('rejects text that is not JSON', () => {
    expect(parseSave('{not json')).toEqual({ ok: false, reason: expect.stringMatching(/not valid JSON/i) });
  });

  it.each([null, 42, 'just a string', [1, 2]])('rejects a non-object (%j)', (raw) => {
    const result = parseSave(typeof raw === 'string' ? JSON.stringify(raw) : raw);
    expect(result.ok).toBe(false);
  });

  it('rejects an object with no schema version', () => {
    const { schemaVersion: _drop, ...rest } = valid();
    expect(parseSave(rest)).toEqual({ ok: false, reason: expect.stringMatching(/not an Earth Alliance save/i) });
  });

  it('rejects a save written by a newer version of the game', () => {
    const save = { ...valid(), schemaVersion: SAVE_SCHEMA_VERSION + 1 };
    expect(parseSave(save)).toEqual({ ok: false, reason: expect.stringMatching(/newer version/i) });
  });

  it('upgrades an old save through each migration step in order', () => {
    const current = valid();
    // Pretend the current format is v3 and this save is v1 with the turn log under an old name.
    const { turnLog, ...rest } = current;
    const v1 = { ...rest, schemaVersion: 1, history: turnLog };
    const migrations = {
      1: (s: Record<string, unknown>) => {
        const { history, ...r } = s;
        return { ...r, turnLog: history, schemaVersion: 2 };
      },
      2: (s: Record<string, unknown>) => ({ ...s, appVersion: `${String(s.appVersion)}+migrated`, schemaVersion: 3 }),
    };
    const result = parseSave(v1, { currentVersion: 3, migrations });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.save.schemaVersion).toBe(3);
    expect(result.save.turnLog).toEqual(turnLog);
    expect(result.save.appVersion).toBe('1.2.3+migrated');
  });

  it('rejects an old save when a migration step is missing', () => {
    const save = { ...valid(), schemaVersion: 1 };
    const result = parseSave(save, { currentVersion: 2, migrations: {} });
    expect(result).toEqual({ ok: false, reason: expect.stringMatching(/cannot upgrade/i) });
  });

  it('rejects an empty turn log', () => {
    const save = { ...valid(), turnLog: [], moves: [] };
    expect(parseSave(save)).toEqual({ ok: false, reason: expect.stringMatching(/turn log/i) });
  });

  it('rejects a turn record without a world state', () => {
    const save = valid();
    const broken = { ...save, turnLog: [save.turnLog[0], { turn: 1, year: 2030, diagnostics: null }, save.turnLog[2]] };
    expect(parseSave(broken)).toEqual({ ok: false, reason: expect.stringMatching(/turn log/i) });
  });

  it('rejects moves that do not line up with the turns played', () => {
    const save = valid();
    const broken = { ...save, moves: save.moves.slice(1) };
    expect(parseSave(broken)).toEqual({ ok: false, reason: expect.stringMatching(/moves/i) });
  });

  it('rejects a malformed move', () => {
    const save = valid();
    const broken = { ...save, moves: [save.moves[0], { selections: 'nope' }] };
    expect(parseSave(broken)).toEqual({ ok: false, reason: expect.stringMatching(/moves/i) });
  });
});

describe('readSave', () => {
  it('returns null for an empty slot', async () => {
    const store = createMemorySaveStore();
    expect(await readSave(store, 'autosave')).toBeNull();
  });

  it('reads and validates a stored save', async () => {
    const store = createMemorySaveStore();
    const save = createSave(play(1), meta);
    await store.write('slot-1', save);
    expect(await readSave(store, 'slot-1')).toEqual({ ok: true, save });
  });
});
