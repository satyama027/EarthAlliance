import { describe, it, expect } from 'vitest';
import { damage } from '../../src/models/damage.js';
import { makeState, makeContext } from '../fixtures.js';

describe('damage', () => {
  it('computes a quadratic damage fraction', () => {
    const state = makeState();
    state.climate.temperatureAnomaly = 3;
    const ctx = makeContext(state);
    damage.step(ctx);
    expect(ctx.scratch.damageFraction).toBeCloseTo(0.045, 5); // 0.005 * 9
  });

  it('increases monotonically with temperature', () => {
    const lo = makeState(); lo.climate.temperatureAnomaly = 2;
    const hi = makeState(); hi.climate.temperatureAnomaly = 4;
    const cl = makeContext(lo); const ch = makeContext(hi);
    damage.step(cl); damage.step(ch);
    expect(ch.scratch.damageFraction).toBeGreaterThan(cl.scratch.damageFraction);
  });

  it('clamps at 1', () => {
    const state = makeState();
    state.climate.temperatureAnomaly = 20;
    const ctx = makeContext(state);
    damage.step(ctx);
    expect(ctx.scratch.damageFraction).toBe(1);
  });
});
