import { describe, it, expect } from 'vitest';
import { economy } from '../../src/models/economy.js';
import { makeRegion, makeState, makeContext } from '../fixtures.js';

describe('economy', () => {
  it('grows GDP per capita at the baseline rate with no damage or scarcity', () => {
    const state = makeState({ regions: [makeRegion({ gdpPerCapita: 50000, waterAvailability: 100, landAvailability: 100 })] });
    const ctx = makeContext(state, { damageFraction: 0 });
    economy.step(ctx);
    // 50000 * 1.02^5 * 1 * 1 = 55204.04
    expect(state.regions[0]!.gdpPerCapita).toBeCloseTo(55204.04, 1);
  });

  it('records previous GDP into scratch', () => {
    const state = makeState({ regions: [makeRegion({ id: 'r1', gdpPerCapita: 50000 })] });
    const ctx = makeContext(state, { damageFraction: 0 });
    economy.step(ctx);
    expect(ctx.scratch.prevGdpPerCapita['r1']).toBe(50000);
  });

  it('shrinks growth under climate damage and scarcity', () => {
    const healthy = makeState({ regions: [makeRegion({ gdpPerCapita: 50000, waterAvailability: 100, landAvailability: 100 })] });
    const stressed = makeState({ regions: [makeRegion({ gdpPerCapita: 50000, waterAvailability: 20, landAvailability: 20 })] });
    const ch = makeContext(healthy, { damageFraction: 0 });
    const cs = makeContext(stressed, { damageFraction: 0.4 });
    economy.step(ch); economy.step(cs);
    expect(stressed.regions[0]!.gdpPerCapita).toBeLessThan(healthy.regions[0]!.gdpPerCapita);
  });
});
