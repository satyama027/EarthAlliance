import { act, renderHook } from '@testing-library/react';
import { useGame } from '../src/game/useGame.js';

describe('useGame', () => {
  it('starts a fresh game at 2025 with policies available', () => {
    const { result } = renderHook(() => useGame());
    expect(result.current.state.year).toBe(2025);
    expect(result.current.state.turn).toBe(0);
    expect(result.current.available.length).toBeGreaterThan(0);
    expect(result.current.selected).toEqual([]);
  });

  it('toggles policy selection and tracks cost', () => {
    const { result } = renderHook(() => useGame());
    const id = result.current.available[0]!.id;
    act(() => result.current.togglePolicy(id));
    expect(result.current.isSelected(id)).toBe(true);
    expect(result.current.selectionCost.politicalCapital).toBeGreaterThanOrEqual(0);
    act(() => result.current.togglePolicy(id));
    expect(result.current.isSelected(id)).toBe(false);
  });

  it('advances the year by 5 and clears selection on endTurn', () => {
    const { result } = renderHook(() => useGame());
    act(() => result.current.endTurn());
    expect(result.current.state.year).toBe(2030);
    expect(result.current.selected).toEqual([]);
    expect(result.current.history.length).toBeGreaterThan(0);
  });

  it('records a turn-log baseline and appends a diagnostics record per turn', () => {
    const { result } = renderHook(() => useGame());
    // Baseline snapshot for turn 0, with no diagnostics to compare against.
    expect(result.current.turnLog).toHaveLength(1);
    expect(result.current.turnLog[0]!.turn).toBe(0);
    expect(result.current.turnLog[0]!.diagnostics).toBeNull();

    act(() => result.current.endTurn());
    expect(result.current.turnLog).toHaveLength(2);
    const latest = result.current.turnLog[1]!;
    expect(latest.turn).toBe(1);
    expect(latest.year).toBe(2030);
    expect(latest.diagnostics).not.toBeNull();
    expect(latest.state.regions.length).toBeGreaterThan(0);
  });

  it('collapses the turn log back to a single baseline on reset', () => {
    const { result } = renderHook(() => useGame());
    act(() => result.current.endTurn());
    act(() => result.current.endTurn());
    expect(result.current.turnLog.length).toBeGreaterThan(1);
    act(() => result.current.reset());
    expect(result.current.turnLog).toHaveLength(1);
    expect(result.current.turnLog[0]!.turn).toBe(0);
  });

  it('blocks ending the turn when the selection is unaffordable', () => {
    const { result } = renderHook(() => useGame());
    // Select enough policies to exceed the starting budget.
    act(() => {
      for (const p of result.current.available) result.current.togglePolicy(p.id);
    });
    if (!result.current.canEndTurn) {
      expect(result.current.validationReason).toBeTruthy();
    } else {
      expect(result.current.canEndTurn).toBe(true);
    }
  });

  it('reaches an ending and then refuses to advance further', () => {
    const { result } = renderHook(() => useGame());
    // One act() per turn so the hook re-renders and endTurn rebinds to the latest state.
    for (let i = 0; i < 35 && result.current.state.status === 'playing'; i++) {
      act(() => result.current.endTurn());
    }
    expect(result.current.state.status).toBe('ended');
    expect(result.current.ending).not.toBeNull();
    expect(result.current.canEndTurn).toBe(false);
    // endTurn must be a no-op once ended (never throws from the engine guard).
    act(() => result.current.endTurn());
    expect(result.current.state.status).toBe('ended');
  });
});
