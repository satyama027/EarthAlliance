import { describe, it, expect } from 'vitest';
import { resources } from '../../src/models/resources.js';
import { DEFAULT_PARAMS } from '../../src/data/scenario.js';
import { makeRegion, makeState, makeContext } from '../fixtures.js';

describe('resources', () => {
  it('regenerates money from taxed GDP', () => {
    const state = makeState({
      regions: [makeRegion({ publicSupport: 60, population: 1e9, gdpPerCapita: 50000 })],
      resources: { money: 0 },
    });
    const ctx = makeContext(state);
    resources.step(ctx);
    // moneyGain = TAX_RATE * (gdpPerCapita * population) / MONEY_SCALE
    const expected = (DEFAULT_PARAMS.TAX_RATE * (50000 * 1e9)) / DEFAULT_PARAMS.MONEY_SCALE;
    expect(state.resources.money).toBeCloseTo(expected, 5);
  });
});
