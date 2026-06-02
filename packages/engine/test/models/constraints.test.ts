import { describe, it, expect } from 'vitest';
import { constraints } from '../../src/models/constraints.js';
import { makeRegion, makeState, makeContext } from '../fixtures.js';

describe('constraints', () => {
  it('reduces water from warming and population pressure', () => {
    const state = makeState({ regions: [makeRegion({ id: 'r1', waterAvailability: 70, population: 1.05e9 })] });
    const ctx = makeContext(state, { deltaTemperature: 0.5, prevPopulation: { r1: 1e9 } });
    constraints.step(ctx);
    // water -= 5*0.5 + 5*0.05 = 2.5 + 0.25 = 2.75
    expect(state.regions[0]!.waterAvailability).toBeCloseTo(67.25, 5);
  });

  it('reduces land from warming only', () => {
    const state = makeState({ regions: [makeRegion({ id: 'r1', landAvailability: 75, population: 1e9 })] });
    const ctx = makeContext(state, { deltaTemperature: 0.5, prevPopulation: { r1: 1e9 } });
    constraints.step(ctx);
    // land -= 3*0.5 = 1.5
    expect(state.regions[0]!.landAvailability).toBeCloseTo(73.5, 5);
  });

  it('clamps at 0 and ignores cooling turns', () => {
    const state = makeState({ regions: [makeRegion({ id: 'r1', waterAvailability: 1, landAvailability: 1, population: 1e9 })] });
    const ctx = makeContext(state, { deltaTemperature: -0.5, prevPopulation: { r1: 1e9 } });
    constraints.step(ctx);
    expect(state.regions[0]!.waterAvailability).toBeGreaterThanOrEqual(0);
    expect(state.regions[0]!.landAvailability).toBeGreaterThanOrEqual(0);
  });
});
