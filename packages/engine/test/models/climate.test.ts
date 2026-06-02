import { describe, it, expect } from 'vitest';
import { climate } from '../../src/models/climate.js';
import { makeState, makeContext } from '../fixtures.js';

describe('climate', () => {
  it('moves temperature toward equilibrium with thermal lag', () => {
    const state = makeState();
    state.climate.co2Concentration = 560; // exactly 2x pre-industrial (280)
    state.climate.temperatureAnomaly = 1.3;
    const ctx = makeContext(state);
    climate.step(ctx);
    // T_eq = ECS * log2(560/280) = 3 * 1 = 3; dT = (3 - 1.3) * 0.3 = 0.51
    expect(ctx.scratch.deltaTemperature).toBeCloseTo(0.51, 5);
    expect(state.climate.temperatureAnomaly).toBeCloseTo(1.81, 5);
  });

  it('does not overshoot equilibrium', () => {
    const state = makeState();
    state.climate.co2Concentration = 560;
    state.climate.temperatureAnomaly = 1.3;
    const ctx = makeContext(state);
    for (let i = 0; i < 100; i++) climate.step(ctx);
    expect(state.climate.temperatureAnomaly).toBeLessThanOrEqual(3.0001);
    expect(state.climate.temperatureAnomaly).toBeGreaterThan(2.99);
  });

  it('cools when CO2 falls below the level that set current temperature', () => {
    const state = makeState();
    state.climate.co2Concentration = 350; // T_eq = 3*log2(350/280) ≈ 0.966
    state.climate.temperatureAnomaly = 1.5;
    const ctx = makeContext(state);
    climate.step(ctx);
    expect(ctx.scratch.deltaTemperature).toBeLessThan(0);
    expect(state.climate.temperatureAnomaly).toBeLessThan(1.5);
  });
});
