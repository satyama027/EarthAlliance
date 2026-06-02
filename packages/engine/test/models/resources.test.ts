import { describe, it, expect } from 'vitest';
import { resources } from '../../src/models/resources.js';
import { makeRegion, makeState, makeContext } from '../fixtures.js';

describe('resources', () => {
  it('regenerates political capital from population-weighted support', () => {
    const state = makeState({
      regions: [makeRegion({ publicSupport: 60, population: 1e9, gdpPerCapita: 50000 })],
      resources: { politicalCapital: 0, money: 0 },
    });
    const ctx = makeContext(state);
    resources.step(ctx);
    // 10 + 0.5*60 = 40
    expect(state.resources.politicalCapital).toBeCloseTo(40, 5);
  });

  it('regenerates money from taxed GDP', () => {
    const state = makeState({
      regions: [makeRegion({ publicSupport: 60, population: 1e9, gdpPerCapita: 50000 })],
      resources: { politicalCapital: 0, money: 0 },
    });
    const ctx = makeContext(state);
    resources.step(ctx);
    // 0.02 * (50000*1e9) / 1e9 = 1000
    expect(state.resources.money).toBeCloseTo(1000, 5);
  });
});
