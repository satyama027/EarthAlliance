import { useCallback, useMemo, useRef, useState } from 'react';
import {
  createInitialState, validateSelection, advanceTurn, ENDINGS,
  type WorldState, type GameEvent, type Ending, type TurnDiagnostics, type PolicySelection,
} from '@earth-alliance/engine';
import { stagedCostNow, upkeepNextTurn } from './policyView.js';
import { AUTOSAVE_SLOT, createSave, type SaveGame, type TurnMoves } from '../save/saveGame.js';
import type { SaveStore } from '../platform/types.js';
import { APP_VERSION } from '../version.js';

export interface ClimatePoint {
  year: number;
  temperature: number;
  co2: number;
}

/**
 * A full snapshot of one turn for the Turn Log. `diagnostics` is null for the
 * initial baseline (turn 0), which has no prior turn to compare against.
 */
export interface TurnRecord {
  turn: number;
  year: number;
  state: WorldState;
  diagnostics: TurnDiagnostics | null;
}

export interface GameController {
  state: WorldState;
  /** Policies staged to enact this turn (across all regions). */
  staged: PolicySelection[];
  /** Committed policies marked to stop this turn (across all regions). */
  cancels: PolicySelection[];
  stage(policyId: string, regionId: string): void;
  unstage(policyId: string, regionId: string): void;
  toggleCancel(policyId: string, regionId: string): void;
  costNow: { money: number };
  upkeepNext: number;
  validationReason: string | null;
  canEndTurn: boolean;
  endTurn(): void;
  lastEvents: GameEvent[];
  history: ClimatePoint[];
  turnLog: TurnRecord[];
  ending: Ending | null;
  /** Clears the game; also removes the autosave (the player chose to start over). */
  reset(): void;
  /** What was committed on each End Turn so far (`moves.length === turnLog.length - 1`). */
  moves: TurnMoves[];
  /** The current game as a save (ADR-0001 envelope). */
  toSave(): SaveGame;
  /** Replace the current game with a validated save (see `parseSave`). */
  loadSave(save: SaveGame): void;
}

export interface UseGameOptions {
  /** Where to autosave after every End Turn. Omit to play without persistence. */
  saves?: SaveStore;
  /** Version stamped into saves. Default: the build's `APP_VERSION`. */
  appVersion?: string;
  /** Clock for `savedAt` (injectable for tests). */
  now?: () => Date;
}

const snapshot = (s: WorldState): ClimatePoint =>
  ({ year: s.year, temperature: s.climate.temperatureAnomaly, co2: s.climate.co2Concentration });
const baselineRecord = (s: WorldState): TurnRecord => ({ turn: s.turn, year: s.year, state: s, diagnostics: null });
const same = (a: PolicySelection, policyId: string, regionId: string) =>
  a.policyId === policyId && a.regionId === regionId;

export function useGame(options: UseGameOptions = {}): GameController {
  // Read options through a ref so callbacks stay stable when callers pass fresh objects.
  const opts = useRef(options);
  opts.current = options;
  const buildSave = useCallback((turnLog: TurnRecord[], moves: TurnMoves[]): SaveGame =>
    createSave({ turnLog, moves }, {
      appVersion: opts.current.appVersion ?? APP_VERSION,
      now: (opts.current.now ?? (() => new Date()))(),
    }), []);

  const [state, setState] = useState<WorldState>(() => createInitialState());
  const [staged, setStaged] = useState<PolicySelection[]>([]);
  const [cancels, setCancels] = useState<PolicySelection[]>([]);
  const [lastEvents, setLastEvents] = useState<GameEvent[]>([]);
  const [history, setHistory] = useState<ClimatePoint[]>(() => [snapshot(state)]);
  const [turnLog, setTurnLog] = useState<TurnRecord[]>(() => [baselineRecord(state)]);
  const [moves, setMoves] = useState<TurnMoves[]>([]);

  const stage = useCallback((policyId: string, regionId: string) => {
    setStaged((cur) => (cur.some((s) => same(s, policyId, regionId)) ? cur : [...cur, { policyId, regionId }]));
  }, []);
  const unstage = useCallback((policyId: string, regionId: string) => {
    setStaged((cur) => cur.filter((s) => !same(s, policyId, regionId)));
  }, []);
  const toggleCancel = useCallback((policyId: string, regionId: string) => {
    setCancels((cur) => (cur.some((s) => same(s, policyId, regionId))
      ? cur.filter((s) => !same(s, policyId, regionId))
      : [...cur, { policyId, regionId }]));
  }, []);

  const costNow = useMemo(() => stagedCostNow(state, staged), [state, staged]);
  const upkeepNext = useMemo(() => upkeepNextTurn(state, staged, cancels), [state, staged, cancels]);

  const validation = useMemo(() => validateSelection(state, staged), [state, staged]);
  const canEndTurn = state.status === 'playing' && validation.ok;
  const validationReason = validation.ok ? null : (validation.reason ?? 'Invalid selection');

  const endTurn = useCallback(() => {
    if (state.status === 'ended') return;                 // mirror engine guard; never throw
    if (!validateSelection(state, staged).ok) return;
    const { state: next, events, diagnostics } = advanceTurn(state, staged, cancels);
    setState(next);
    setLastEvents(events);
    const nextLog = [...turnLog, { turn: next.turn, year: next.year, state: next, diagnostics }];
    const nextMoves = [...moves, { selections: staged, cancellations: cancels }];
    setHistory((h) => [...h, snapshot(next)]);
    setTurnLog(nextLog);
    setMoves(nextMoves);
    setStaged([]);
    setCancels([]);
    // Autosave is fire-and-forget: a storage failure must never interrupt play.
    const saves = opts.current.saves;
    if (saves) {
      saves.write(AUTOSAVE_SLOT, buildSave(nextLog, nextMoves))
        .catch((err: unknown) => console.warn('Earth Alliance: autosave failed', err));
    }
  }, [state, staged, cancels, turnLog, moves, buildSave]);

  const ending = state.status === 'ended' && state.endingId ? ENDINGS[state.endingId] ?? null : null;

  const reset = useCallback(() => {
    const fresh = createInitialState();
    setState(fresh);
    setStaged([]);
    setCancels([]);
    setLastEvents([]);
    setHistory([snapshot(fresh)]);
    setTurnLog([baselineRecord(fresh)]);
    setMoves([]);
    opts.current.saves?.remove(AUTOSAVE_SLOT)
      .catch((err: unknown) => console.warn('Earth Alliance: clearing autosave failed', err));
  }, []);

  const toSave = useCallback(() => buildSave(turnLog, moves), [buildSave, turnLog, moves]);

  const loadSave = useCallback((save: SaveGame) => {
    const latest = save.turnLog[save.turnLog.length - 1]!;
    setState(latest.state);
    setTurnLog(save.turnLog);
    setMoves(save.moves);
    setHistory(save.turnLog.map((r) => snapshot(r.state)));
    setStaged([]);
    setCancels([]);
    setLastEvents([]);
  }, []);

  return {
    state, staged, cancels, stage, unstage, toggleCancel,
    costNow, upkeepNext, validationReason, canEndTurn, endTurn,
    lastEvents, history, turnLog, ending, reset,
    moves, toSave, loadSave,
  };
}
