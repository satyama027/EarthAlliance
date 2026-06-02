import { describe, it, expect } from 'vitest';
import { carbonCycle } from '../../src/models/carbonCycle.js';
import { makeState, makeContext } from '../fixtures.js';

describe('carbonCycle', () => {
  it('adds airborne fraction of emissions to CO2 concentration', () => {
    const state = makeState();
    state.climate.co2Concentration = 420;
    state.climate.annualEmissions = 35;
    const ctx = makeContext(state);
    carbonCycle.step(ctx);
    // 0.5 * (35 * 5) / 7.81 = 11.2036...
    expect(state.climate.co2Concentration).toBeCloseTo(431.2036, 3);
  });

  it('reduces CO2 when emissions are net-negative', () => {
    const state = makeState();
    state.climate.co2Concentration = 420;
    state.climate.annualEmissions = -20;
    const ctx = makeContext(state);
    carbonCycle.step(ctx);
    // 0.5 * (-20 * 5) / 7.81 = -6.4021...
    expect(state.climate.co2Concentration).toBeCloseTo(413.5979, 3);
  });
});
