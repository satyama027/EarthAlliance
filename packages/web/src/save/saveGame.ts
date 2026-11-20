import type { PolicySelection } from '@earth-alliance/engine';
import type { TurnRecord } from '../game/useGame.js';
import type { SaveStore } from '../platform/types.js';

/**
 * The save format (ADR-0001). Bump `SAVE_SCHEMA_VERSION` whenever the shape of a save —
 * including the engine's `WorldState` inside `turnLog` — changes incompatibly, and add a
 * `MIGRATIONS[oldVersion]` step that upgrades the previous shape by exactly one version.
 */
export const SAVE_SCHEMA_VERSION = 1;

/** The slot the game writes after every End Turn. */
export const AUTOSAVE_SLOT = 'autosave';

/** What the player committed on one End Turn — enough to replay it through the engine. */
export interface TurnMoves {
  selections: PolicySelection[];
  cancellations: PolicySelection[];
}

export interface SaveGame {
  schemaVersion: number;
  /** Game build that wrote the save (informational; compatibility is `schemaVersion`). */
  appVersion: string;
  /** ISO-8601 timestamp. */
  savedAt: string;
  /** The starting `rngSeed` — with `moves` it replays the game deterministically. */
  seed: number;
  /** One entry per turn played: `moves.length === turnLog.length - 1`. */
  moves: TurnMoves[];
  /** Baseline + one snapshot per turn: restores the game and its full history UI as-is. */
  turnLog: TurnRecord[];
}

/** Upgrades a save object from version `n` (its key) to `n + 1`. */
export type Migration = (save: Record<string, unknown>) => Record<string, unknown>;

/** No migrations yet — v1 is the first save format. */
export const MIGRATIONS: Readonly<Record<number, Migration>> = {};

export type ParseResult = { ok: true; save: SaveGame } | { ok: false; reason: string };

export function createSave(
  game: { turnLog: TurnRecord[]; moves: TurnMoves[] },
  meta: { appVersion: string; now: Date },
): SaveGame {
  const baseline = game.turnLog[0];
  if (!baseline) throw new Error('Cannot save a game with an empty turn log');
  return {
    schemaVersion: SAVE_SCHEMA_VERSION,
    appVersion: meta.appVersion,
    savedAt: meta.now.toISOString(),
    seed: baseline.state.rngSeed,
    moves: game.moves,
    turnLog: game.turnLog,
  };
}

export function serializeSave(save: SaveGame): string {
  return JSON.stringify(save);
}

const fail = (reason: string): ParseResult => ({ ok: false, reason });
const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const isSelectionList = (v: unknown): boolean =>
  Array.isArray(v) && v.every((s) => isObject(s) && typeof s.policyId === 'string' && typeof s.regionId === 'string');

function isTurnRecord(v: unknown): boolean {
  return isObject(v)
    && typeof v.turn === 'number'
    && typeof v.year === 'number'
    && isObject(v.state)
    && Array.isArray(v.state.regions)
    && (v.diagnostics === null || isObject(v.diagnostics));
}

/**
 * Validate (and, if old, migrate) anything claiming to be a save: JSON text from an imported
 * file, or the object a `SaveStore` hands back. Never throws — a bad save yields a reason the
 * UI can show. The `WorldState` inside each turn is checked structurally, not field-by-field.
 */
export function parseSave(
  raw: unknown,
  opts: { currentVersion?: number; migrations?: Readonly<Record<number, Migration>> } = {},
): ParseResult {
  const currentVersion = opts.currentVersion ?? SAVE_SCHEMA_VERSION;
  const migrations = opts.migrations ?? MIGRATIONS;

  let data: unknown = raw;
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw);
    } catch {
      return fail('This file is not valid JSON.');
    }
  }
  if (!isObject(data) || typeof data.schemaVersion !== 'number' || !Number.isInteger(data.schemaVersion) || data.schemaVersion < 1) {
    return fail('This is not an Earth Alliance save.');
  }
  if (data.schemaVersion > currentVersion) {
    return fail('This save was made by a newer version of the game.');
  }

  let save: Record<string, unknown> = data;
  for (let v = data.schemaVersion; v < currentVersion; v++) {
    const step = migrations[v];
    if (!step) return fail(`Cannot upgrade this save from format v${v}.`);
    save = step(save);
  }

  if (typeof save.appVersion !== 'string' || typeof save.savedAt !== 'string' || typeof save.seed !== 'number') {
    return fail('This save is missing its header.');
  }
  const { turnLog, moves } = save;
  if (!Array.isArray(turnLog) || turnLog.length === 0 || !turnLog.every(isTurnRecord)) {
    return fail('This save has a damaged turn log.');
  }
  if (
    !Array.isArray(moves)
    || moves.length !== turnLog.length - 1
    || !moves.every((m) => isObject(m) && isSelectionList(m.selections) && isSelectionList(m.cancellations))
  ) {
    return fail('This save has damaged moves.');
  }
  return { ok: true, save: save as unknown as SaveGame };
}

/** Read a slot and validate it. `null` means the slot is empty. */
export async function readSave(store: SaveStore, slot: string): Promise<ParseResult | null> {
  const raw = await store.read(slot);
  return raw === undefined ? null : parseSave(raw);
}
