import { useCallback, useMemo, useState } from 'react';
import {
  createInitialState, getAvailablePolicies, validateSelection, advanceTurn,
  getPolicy, ENDINGS,
  type WorldState, type Policy, type GameEvent, type Ending, type TurnDiagnostics,
} from '@earth-alliance/engine';

export interface ClimatePoint {
  year: number;
  temperature: number;
  co2: number;
}

/**
 * A full snapshot of one turn for the Turn Log. `diagnostics` is null for the
 * initial baseline (turn 0), which has no prior turn to compare against. Retaining
 * past `state` objects is safe: the engine never mutates a state it has returned.
 */
export interface TurnRecord {
  turn: number;
  year: number;
  state: WorldState;
  diagnostics: TurnDiagnostics | null;
}

export interface GameController {
  state: WorldState;
  available: Policy[];
  selected: string[];
  isSelected(id: string): boolean;
  togglePolicy(id: string): void;
  selectionCost: { politicalCapital: number; money: number };
  validationReason: string | null;
  canEndTurn: boolean;
  endTurn(): void;
  lastEvents: GameEvent[];
  history: ClimatePoint[];
  turnLog: TurnRecord[];
  ending: Ending | null;
  reset(): void;
}

function snapshot(state: WorldState): ClimatePoint {
  return { year: state.year, temperature: state.climate.temperatureAnomaly, co2: state.climate.co2Concentration };
}

function baselineRecord(state: WorldState): TurnRecord {
  return { turn: state.turn, year: state.year, state, diagnostics: null };
}

export function useGame(): GameController {
  const [state, setState] = useState<WorldState>(() => createInitialState());
  const [selected, setSelected] = useState<string[]>([]);
  const [lastEvents, setLastEvents] = useState<GameEvent[]>([]);
  const [history, setHistory] = useState<ClimatePoint[]>(() => [snapshot(state)]);
  const [turnLog, setTurnLog] = useState<TurnRecord[]>(() => [baselineRecord(state)]);

  const available = useMemo(() => getAvailablePolicies(state), [state]);

  const isSelected = useCallback((id: string) => selected.includes(id), [selected]);

  const togglePolicy = useCallback((id: string) => {
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }, []);

  const selectionCost = useMemo(() => {
    return selected.reduce(
      (acc, id) => {
        const p = getPolicy(id);
        if (p) { acc.politicalCapital += p.cost.politicalCapital; acc.money += p.cost.money; }
        return acc;
      },
      { politicalCapital: 0, money: 0 },
    );
  }, [selected]);

  const validation = useMemo(() => validateSelection(state, selected), [state, selected]);
  const canEndTurn = state.status === 'playing' && validation.ok;
  const validationReason = validation.ok ? null : (validation.reason ?? 'Invalid selection');

  const endTurn = useCallback(() => {
    if (state.status === 'ended') return;              // mirror engine guard; never throw
    const check = validateSelection(state, selected);
    if (!check.ok) return;
    const { state: next, events, diagnostics } = advanceTurn(state, selected);
    setState(next);
    setLastEvents(events);
    setHistory((h) => [...h, snapshot(next)]);
    setTurnLog((log) => [...log, { turn: next.turn, year: next.year, state: next, diagnostics }]);
    setSelected([]);
  }, [state, selected]);

  const ending = state.status === 'ended' && state.endingId ? ENDINGS[state.endingId] ?? null : null;

  const reset = useCallback(() => {
    const fresh = createInitialState();
    setState(fresh);
    setSelected([]);
    setLastEvents([]);
    setHistory([snapshot(fresh)]);
    setTurnLog([baselineRecord(fresh)]);
  }, []);

  return {
    state, available, selected, isSelected, togglePolicy, selectionCost,
    validationReason, canEndTurn, endTurn, lastEvents, history, turnLog, ending, reset,
  };
}
