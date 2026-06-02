import { describe, it, expect } from 'vitest';
import { emissions } from '../../src/models/emissions.js';
import { support } from '../../src/models/support.js';
import { makeRegion, makeState, makeContext } from '../fixtures.js';

describe('divide-by-zero guards', () => {
  it('emissions.step leaves numeric fields finite when prior output is zero', () => {
    const state = makeState({ regions: [makeRegion({ id: 'r1' })] });
    const ctx = makeContext(state, { prevGdpPerCapita: { r1: 0 }, prevPopulation: { r1: 0 } });
    emissions.step(ctx);
    expect(Number.isFinite(state.regions[0]!.regionalEmissions)).toBe(true);
  });

  it('support.step leaves numeric fields finite when prior gdp is zero', () => {
    const state = makeState({ regions: [makeRegion({ id: 'r1' })] });
    const ctx = makeContext(state, { prevGdpPerCapita: { r1: 0 }, prevPopulation: { r1: 0 } });
    support.step(ctx);
    const r = state.regions[0]!;
    expect(Number.isFinite(r.publicSupport)).toBe(true);
    expect(Number.isFinite(r.equityIndex)).toBe(true);
  });
});
