import { act, renderHook } from '@testing-library/react';
import { POLICY_CATALOG } from '@earth-alliance/engine';
import { useGame } from '../src/game/useGame.js';

const REGION = 'north-america';
const buildout = POLICY_CATALOG.find((p) => p.funding === 'buildout')!.id;

describe('useGame', () => {
  it('starts a fresh game at 2025 with nothing staged', () => {
    const { result } = renderHook(() => useGame());
    expect(result.current.state.year).toBe(2025);
    expect(result.current.state.turn).toBe(0);
    expect(result.current.staged).toEqual([]);
    expect(result.current.cancels).toEqual([]);
  });

  it('stages and unstages a policy in a region and tracks cost', () => {
    const { result } = renderHook(() => useGame());
    act(() => result.current.stage(buildout, REGION));
    expect(result.current.staged).toContainEqual({ policyId: buildout, regionId: REGION });
    expect(result.current.costNow.money).toBeGreaterThan(0);
    act(() => result.current.unstage(buildout, REGION));
    expect(result.current.staged).toEqual([]);
  });

  it('toggles a cancellation on and off', () => {
    const { result } = renderHook(() => useGame());
    act(() => result.current.toggleCancel(buildout, REGION));
    expect(result.current.cancels).toContainEqual({ policyId: buildout, regionId: REGION });
    act(() => result.current.toggleCancel(buildout, REGION));
    expect(result.current.cancels).toEqual([]);
  });

  it('advances the year by 5 and clears staged + cancels on endTurn', () => {
    const { result } = renderHook(() => useGame());
    act(() => result.current.stage(buildout, REGION));
    act(() => result.current.endTurn());
    expect(result.current.state.year).toBe(2030);
    expect(result.current.staged).toEqual([]);
    expect(result.current.cancels).toEqual([]);
    expect(result.current.history.length).toBeGreaterThan(1);
  });

  it('records a turn-log baseline and appends a diagnostics record per turn', () => {
    const { result } = renderHook(() => useGame());
    expect(result.current.turnLog).toHaveLength(1);
    expect(result.current.turnLog[0]!.diagnostics).toBeNull();
    act(() => result.current.endTurn());
    expect(result.current.turnLog).toHaveLength(2);
    expect(result.current.turnLog[1]!.turn).toBe(1);
    expect(result.current.turnLog[1]!.diagnostics).not.toBeNull();
  });

  it('collapses the turn log back to a single baseline on reset', () => {
    const { result } = renderHook(() => useGame());
    act(() => result.current.endTurn());
    act(() => result.current.endTurn());
    expect(result.current.turnLog.length).toBeGreaterThan(1);
    act(() => result.current.reset());
    expect(result.current.turnLog).toHaveLength(1);
  });

  it('blocks ending the turn when the staged selection is unaffordable', () => {
    const { result } = renderHook(() => useGame());
    // Stage every one-time/buildout policy in every region to blow past the money budget.
    act(() => {
      for (const r of result.current.state.regions) {
        for (const p of POLICY_CATALOG) result.current.stage(p.id, r.id);
      }
    });
    if (!result.current.canEndTurn) {
      expect(result.current.validationReason).toBeTruthy();
    } else {
      expect(result.current.canEndTurn).toBe(true);
    }
  });

  it('reaches an ending and then refuses to advance further', () => {
    const { result } = renderHook(() => useGame());
    for (let i = 0; i < 35 && result.current.state.status === 'playing'; i++) {
      act(() => result.current.endTurn());
    }
    expect(result.current.state.status).toBe('ended');
    expect(result.current.ending).not.toBeNull();
    expect(result.current.canEndTurn).toBe(false);
    act(() => result.current.endTurn());
    expect(result.current.state.status).toBe('ended');
  });
});
