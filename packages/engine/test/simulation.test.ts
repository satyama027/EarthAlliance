import { describe, it, expect } from 'vitest';
import { advanceTurn } from '../src/simulation.js';
import { createInitialState } from '../src/state.js';
import { validateSelection } from '../src/policies.js';

describe('advanceTurn', () => {
  it('advances the clock by one 5-year turn', () => {
    const s0 = createInitialState();
    const { state: s1 } = advanceTurn(s0, []);
    expect(s1.turn).toBe(1);
    expect(s1.year).toBe(2030);
  });

  it('does not mutate the input state', () => {
    const s0 = createInitialState();
    advanceTurn(s0, []);
    expect(s0.turn).toBe(0);
    expect(s0.year).toBe(2025);
  });

  it('raises CO2 and temperature on a do-nothing turn', () => {
    const s0 = createInitialState();
    const { state: s1 } = advanceTurn(s0, []);
    expect(s1.climate.co2Concentration).toBeGreaterThan(s0.climate.co2Concentration);
    expect(s1.climate.temperatureAnomaly).toBeGreaterThan(s0.climate.temperatureAnomaly);
  });

  it('keeps annualEmissions equal to the sum of regional emissions', () => {
    const s0 = createInitialState();
    const { state: s1 } = advanceTurn(s0, []);
    const sum = s1.regions.reduce((a, r) => a + r.regionalEmissions, 0);
    expect(s1.climate.annualEmissions).toBeCloseTo(sum, 6);
  });

  it('spends resources when a policy is enacted', () => {
    const s0 = createInitialState();
    expect(validateSelection(s0, ['renewable-subsidy']).ok).toBe(true);
    const { state: s1 } = advanceTurn(s0, ['renewable-subsidy']);
    expect(s1.enactedPolicyIds).toContain('renewable-subsidy');
  });

  it('throws on an invalid selection', () => {
    const s0 = createInitialState();
    expect(() => advanceTurn(s0, ['does-not-exist'])).toThrow();
  });

  it('sets status to ended and records the ending id at resolution', () => {
    let state = createInitialState();
    let guard = 0;
    while (state.status === 'playing' && guard < 35) {
      state = advanceTurn(state, []).state;
      guard++;
    }
    expect(state.status).toBe('ended');
    expect(state.endingId).not.toBeNull();
    expect(state.year).toBeLessThanOrEqual(2200);
  });

  it('throws when advancing a game that has already ended', () => {
    let state = createInitialState();
    let guard = 0;
    while (state.status === 'playing' && guard < 35) {
      state = advanceTurn(state, []).state;
      guard++;
    }
    expect(state.status).toBe('ended');
    expect(() => advanceTurn(state, [])).toThrow(/already ended/i);
  });
});
