import { useCallback, useMemo, useState } from 'react';
import {
  createInitialState, getAvailablePolicies, validateSelection, advanceTurn,
  getPolicy, ENDINGS,
  type WorldState, type Policy, type GameEvent, type Ending,
} from '@earth-alliance/engine';

export interface ClimatePoint {
  year: number;
  temperature: number;
  co2: number;
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
  ending: Ending | null;
  reset(): void;
}

function snapshot(state: WorldState): ClimatePoint {
  return { year: state.year, temperature: state.climate.temperatureAnomaly, co2: state.climate.co2Concentration };
}

export function useGame(): GameController {
  const [state, setState] = useState<WorldState>(() => createInitialState());
  const [selected, setSelected] = useState<string[]>([]);
  const [lastEvents, setLastEvents] = useState<GameEvent[]>([]);
  const [history, setHistory] = useState<ClimatePoint[]>(() => [snapshot(createInitialState())]);

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
    const { state: next, events } = advanceTurn(state, selected);
    setState(next);
    setLastEvents(events);
    setHistory((h) => [...h, snapshot(next)]);
    setSelected([]);
  }, [state, selected]);

  const ending = state.status === 'ended' && state.endingId ? ENDINGS[state.endingId] ?? null : null;

  const reset = useCallback(() => {
    const fresh = createInitialState();
    setState(fresh);
    setSelected([]);
    setLastEvents([]);
    setHistory([snapshot(fresh)]);
  }, []);

  return {
    state, available, selected, isSelected, togglePolicy, selectionCost,
    validationReason, canEndTurn, endTurn, lastEvents, history, ending, reset,
  };
}
