import { describe, it, expect } from 'vitest';
import { biodiversity } from '../../src/models/biodiversity.js';
import { makeRegion, makeState, makeContext } from '../fixtures.js';

describe('biodiversity', () => {
  it('declines with warming', () => {
    const state = makeState({ regions: [makeRegion({ biodiversityIndex: 55 })] });
    const ctx = makeContext(state, { deltaTemperature: 0.5 });
    biodiversity.step(ctx);
    // 55 - 8*0.5 = 51
    expect(state.regions[0]!.biodiversityIndex).toBeCloseTo(51, 5);
  });

  it('does not change on cooling turns and clamps at 0', () => {
    const state = makeState({ regions: [makeRegion({ biodiversityIndex: 2 })] });
    const cool = makeContext(state, { deltaTemperature: -0.5 });
    biodiversity.step(cool);
    expect(state.regions[0]!.biodiversityIndex).toBe(2);

    const state2 = makeState({ regions: [makeRegion({ biodiversityIndex: 1 })] });
    const hot = makeContext(state2, { deltaTemperature: 1 });
    biodiversity.step(hot);
    expect(state2.regions[0]!.biodiversityIndex).toBe(0);
  });
});
