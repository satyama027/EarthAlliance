import { describe, it, expect } from 'vitest';
import { emissions } from '../../src/models/emissions.js';
import { makeRegion, makeState, makeContext } from '../fixtures.js';

describe('emissions', () => {
  it('scales emissions with output growth, minus autonomous decarbonization', () => {
    const state = makeState({ regions: [makeRegion({ id: 'r1', gdpPerCapita: 55000, population: 1.1e9, regionalEmissions: 10 })] });
    const ctx = makeContext(state, {
      prevGdpPerCapita: { r1: 50000 },
      prevPopulation: { r1: 1e9 },
    });
    emissions.step(ctx);
    // outputRatio = (55000*1.1e9)/(50000*1e9) = 1.21; *0.99^5 = 0.95099
    // 10 * 1.21 * 0.95099 = 11.5070
    expect(state.regions[0]!.regionalEmissions).toBeCloseTo(11.5070, 3);
  });

  it('shrinks emissions when output is flat (autonomous decarbonization)', () => {
    const state = makeState({ regions: [makeRegion({ id: 'r1', gdpPerCapita: 50000, population: 1e9, regionalEmissions: 10 })] });
    const ctx = makeContext(state, { prevGdpPerCapita: { r1: 50000 }, prevPopulation: { r1: 1e9 } });
    emissions.step(ctx);
    expect(state.regions[0]!.regionalEmissions).toBeLessThan(10);
  });

  it('raises emissions when economic output grows', () => {
    const state = makeState({ regions: [makeRegion({ id: 'r1', gdpPerCapita: 60000, population: 1.2e9, regionalEmissions: 10 })] });
    const ctx = makeContext(state, { prevGdpPerCapita: { r1: 50000 }, prevPopulation: { r1: 1e9 } });
    emissions.step(ctx);
    expect(state.regions[0]!.regionalEmissions).toBeGreaterThan(10);
  });
});
