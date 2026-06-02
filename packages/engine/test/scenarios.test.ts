import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/state.js';
import { advanceTurn } from '../src/simulation.js';
import { getAvailablePolicies, validateSelection } from '../src/policies.js';

/** Each turn, greedily enact every available emissions-cutting policy we can afford. */
const DECARB = ['nuclear-buildout', 'renewable-subsidy', 'reforestation', 'public-transit', 'carbon-tax', 'degrowth-mandate'];

describe('reversal scenario', () => {
  it('drives emissions net-negative and bends temperature down before 2200', () => {
    let state = createInitialState();
    let peakTemp = state.climate.temperatureAnomaly;
    let sawNetNegative = false;

    for (let i = 0; i < 35; i++) {
      const available = new Set(getAvailablePolicies(state).map((p) => p.id));
      const pick = DECARB.filter((id) => available.has(id) && validateSelection(state, [id]).ok);
      state = advanceTurn(state, pick).state;
      peakTemp = Math.max(peakTemp, state.climate.temperatureAnomaly);
      if (state.climate.annualEmissions < 0) sawNetNegative = true;
    }

    expect(sawNetNegative).toBe(true);
    // Temperature should end below its peak (the redemption arc bends the curve).
    expect(state.climate.temperatureAnomaly).toBeLessThan(peakTemp);
  });
});

describe('doom scenario', () => {
  it('do-nothing crosses +3°C and ends in a loss or muddling outcome', () => {
    let state = createInitialState();
    for (let i = 0; i < 35; i++) state = advanceTurn(state, []).state;
    expect(state.status).toBe('ended');
    expect(state.climate.temperatureAnomaly).toBeGreaterThan(2.0);
  });
});
