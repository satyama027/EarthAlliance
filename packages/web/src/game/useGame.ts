import { useCallback, useMemo, useState } from 'react';
import {
  createInitialState, validateSelection, advanceTurn, ENDINGS,
  type WorldState, type GameEvent, type Ending, type TurnDiagnostics, type PolicySelection,
} from '@earth-alliance/engine';
import { stagedCostNow, upkeepNextTurn } from './policyView.js';

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
  reset(): void;
}

const snapshot = (s: WorldState): ClimatePoint =>
  ({ year: s.year, temperature: s.climate.temperatureAnomaly, co2: s.climate.co2Concentration });
const baselineRecord = (s: WorldState): TurnRecord => ({ turn: s.turn, year: s.year, state: s, diagnostics: null });
const same = (a: PolicySelection, policyId: string, regionId: string) =>
  a.policyId === policyId && a.regionId === regionId;

export function useGame(): GameController {
  const [state, setState] = useState<WorldState>(() => createInitialState());
  const [staged, setStaged] = useState<PolicySelection[]>([]);
  const [cancels, setCancels] = useState<PolicySelection[]>([]);
  const [lastEvents, setLastEvents] = useState<GameEvent[]>([]);
  const [history, setHistory] = useState<ClimatePoint[]>(() => [snapshot(state)]);
  const [turnLog, setTurnLog] = useState<TurnRecord[]>(() => [baselineRecord(state)]);

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
    setHistory((h) => [...h, snapshot(next)]);
    setTurnLog((log) => [...log, { turn: next.turn, year: next.year, state: next, diagnostics }]);
    setStaged([]);
    setCancels([]);
  }, [state, staged, cancels]);

  const ending = state.status === 'ended' && state.endingId ? ENDINGS[state.endingId] ?? null : null;

  const reset = useCallback(() => {
    const fresh = createInitialState();
    setState(fresh);
    setStaged([]);
    setCancels([]);
    setLastEvents([]);
    setHistory([snapshot(fresh)]);
    setTurnLog([baselineRecord(fresh)]);
  }, []);

  return {
    state, staged, cancels, stage, unstage, toggleCancel,
    costNow, upkeepNext, validationReason, canEndTurn, endTurn,
    lastEvents, history, turnLog, ending, reset,
  };
}
