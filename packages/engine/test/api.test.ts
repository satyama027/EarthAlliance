import { describe, it, expect } from 'vitest';
import {
  createInitialState, getAvailablePolicies, validateSelection,
  advanceTurn, evaluateEnding, createSimulation,
} from '../src/index.js';

describe('public API', () => {
  it('re-exports the full game loop', () => {
    expect(typeof createInitialState).toBe('function');
    expect(typeof getAvailablePolicies).toBe('function');
    expect(typeof validateSelection).toBe('function');
    expect(typeof advanceTurn).toBe('function');
    expect(typeof evaluateEnding).toBe('function');
    expect(typeof createSimulation).toBe('function');
  });

  it('supports a full play step through the public API', () => {
    const s0 = createInitialState();
    const available = getAvailablePolicies(s0);
    expect(available.length).toBeGreaterThan(0);
    const { state: s1 } = advanceTurn(s0, []);
    expect(s1.turn).toBe(1);
  });
});
