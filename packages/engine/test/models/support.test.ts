import { describe, it, expect } from 'vitest';
import { support } from '../../src/models/support.js';
import { makeRegion, makeState, makeContext } from '../fixtures.js';

describe('support', () => {
  it('drops with warming when growth is flat', () => {
    const state = makeState({ regions: [makeRegion({ id: 'r1', publicSupport: 50, equityIndex: 50, gdpPerCapita: 50000 })] });
    const ctx = makeContext(state, { deltaTemperature: 0.5, prevGdpPerCapita: { r1: 50000 } });
    support.step(ctx);
    // 50 - 20*0.5 + 20*0 + 0.1*0 = 40
    expect(state.regions[0]!.publicSupport).toBeCloseTo(40, 5);
  });

  it('rises with economic growth', () => {
    const state = makeState({ regions: [makeRegion({ id: 'r1', publicSupport: 50, equityIndex: 50, gdpPerCapita: 55000 })] });
    const ctx = makeContext(state, { deltaTemperature: 0, prevGdpPerCapita: { r1: 50000 } });
    support.step(ctx);
    // econGrowth = 0.1; 50 + 20*0.1 = 52
    expect(state.regions[0]!.publicSupport).toBeCloseTo(52, 5);
  });

  it('erodes equity when the economy grows (inequality drift), clamped 0–100', () => {
    const state = makeState({ regions: [makeRegion({ id: 'r1', equityIndex: 50, gdpPerCapita: 55000 })] });
    const ctx = makeContext(state, { deltaTemperature: 0, prevGdpPerCapita: { r1: 50000 } });
    support.step(ctx);
    // equity -= 5 * 0.1 = 0.5
    expect(state.regions[0]!.equityIndex).toBeCloseTo(49.5, 5);
  });
});
