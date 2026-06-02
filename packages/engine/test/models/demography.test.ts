import { describe, it, expect } from 'vitest';
import { demography } from '../../src/models/demography.js';
import { makeRegion, makeState, makeContext } from '../fixtures.js';

describe('demography', () => {
  it('grows population when fertility and health are high', () => {
    const state = makeState({ regions: [makeRegion({ id: 'r1', population: 1e9, fertilityRate: 4.1, healthIndex: 50, educationIndex: 80 })] });
    const ctx = makeContext(state);
    demography.step(ctx);
    // popGrowth = (4.1-2.1)*0.01 + 0 = 0.02; 1e9 * 1.02^5
    expect(state.regions[0]!.population).toBeCloseTo(1.1040808e9, 0);
    expect(ctx.scratch.prevPopulation['r1']).toBe(1e9);
  });

  it('lowers fertility through the education-driven transition (floor 1.5)', () => {
    const state = makeState({ regions: [makeRegion({ fertilityRate: 4.1, educationIndex: 80 })] });
    demography.step(makeContext(state));
    // 4.1 - 0.01*0.8*5 = 4.06
    expect(state.regions[0]!.fertilityRate).toBeCloseTo(4.06, 5);

    const low = makeState({ regions: [makeRegion({ fertilityRate: 1.51, educationIndex: 100 })] });
    demography.step(makeContext(low));
    expect(low.regions[0]!.fertilityRate).toBe(1.5);
  });

  it('ages the population', () => {
    const state = makeState({ regions: [makeRegion({ medianAge: 30, fertilityRate: 1.4 })] });
    demography.step(makeContext(state));
    expect(state.regions[0]!.medianAge).toBeGreaterThan(30);
  });
});
