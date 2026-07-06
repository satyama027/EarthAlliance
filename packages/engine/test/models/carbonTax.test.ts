import { describe, it, expect } from 'vitest';
import { carbonTax } from '../../src/models/carbonTax.js';
import { makeRegion, makeState, makeContext } from '../fixtures.js';
import { carbonTaxRevenue } from '../../src/income.js';
import { DEFAULT_PARAMS } from '../../src/data/scenario.js';
import type { Enactment } from '../../src/types.js';

const enactTax = (regionId: string, overrides: Partial<Enactment> = {}): Enactment => ({
  policyId: 'carbon-tax', regionId, capacity: 1, complete: false, ...overrides,
});

describe('carbonTax submodel', () => {
  it('adds rate × fossil tax base to the treasury for an active enactment', () => {
    const state = makeState({
      regions: [makeRegion({ id: 'r1' })],
      resources: { money: 1000 },
      enactments: [enactTax('r1')],
    });
    const ctx = makeContext(state);
    carbonTax.step(ctx);
    // fixture fossil base 8.5 × CARBON_TAX_RATE 2 = 17
    expect(state.resources.money).toBeCloseTo(1017, 6);
    expect(ctx.scratch.carbonTaxRevenue).toBeCloseTo(17, 6);
    expect(ctx.scratch.carbonTaxRevenueByRegion.r1).toBeCloseTo(17, 6);
  });

  it('raises no revenue when no carbon tax is enacted', () => {
    const state = makeState({ regions: [makeRegion({ id: 'r1' })], resources: { money: 1000 }, enactments: [] });
    const ctx = makeContext(state);
    carbonTax.step(ctx);
    expect(state.resources.money).toBe(1000);
    expect(ctx.scratch.carbonTaxRevenue).toBe(0);
  });

  it('raises no revenue from a cancelled enactment', () => {
    const state = makeState({
      regions: [makeRegion({ id: 'r1' })], resources: { money: 1000 },
      enactments: [enactTax('r1', { cancelled: true })],
    });
    const ctx = makeContext(state);
    carbonTax.step(ctx);
    expect(state.resources.money).toBe(1000);
  });

  it('taxes only the enacted region, summing across enactments', () => {
    const state = makeState({
      regions: [makeRegion({ id: 'r1' }), makeRegion({ id: 'r2', industry: 10 })],
      resources: { money: 0 },
      enactments: [enactTax('r1'), enactTax('r2')],
    });
    const ctx = makeContext(state);
    carbonTax.step(ctx);
    const expected = carbonTaxRevenue(state.regions[0]!, DEFAULT_PARAMS) + carbonTaxRevenue(state.regions[1]!, DEFAULT_PARAMS);
    expect(state.resources.money).toBeCloseTo(expected, 6);
    expect(ctx.scratch.carbonTaxRevenueByRegion.r2).toBeGreaterThan(ctx.scratch.carbonTaxRevenueByRegion.r1!);
  });

  it('raises less revenue as the grid decarbonizes (revenue shrinks with fossil share)', () => {
    const dirty = makeState({ regions: [makeRegion({ id: 'r1' })], resources: { money: 0 }, enactments: [enactTax('r1')] });
    const clean = makeState({
      regions: [makeRegion({ id: 'r1', gridCarbonIntensity: 0 })], resources: { money: 0 }, enactments: [enactTax('r1')],
    });
    const dctx = makeContext(dirty);
    const cctx = makeContext(clean);
    carbonTax.step(dctx);
    carbonTax.step(cctx);
    expect(clean.resources.money).toBeLessThan(dirty.resources.money);
  });

  it('skips an enactment whose region no longer exists', () => {
    const state = makeState({ regions: [makeRegion({ id: 'r1' })], resources: { money: 100 }, enactments: [enactTax('gone')] });
    const ctx = makeContext(state);
    expect(() => carbonTax.step(ctx)).not.toThrow();
    expect(state.resources.money).toBe(100);
  });
});

describe('carbonTax submodel — flat public-support offset', () => {
  const zeroBase = () => makeRegion({ id: 'r1', publicSupport: 50, transport: 0, industry: 0, aviationShipping: 0, gridCarbonIntensity: 0 });

  it('drops support by the flat hit on the turn the tax activates, and records it', () => {
    const state = makeState({ regions: [makeRegion({ id: 'r1', publicSupport: 50 })], enactments: [enactTax('r1')] });
    carbonTax.step(makeContext(state));
    expect(state.regions[0]!.publicSupport).toBeCloseTo(45, 6); // 50 − CARBON_TAX_SUPPORT_HIT(5)
    expect(state.enactments[0]!.carbonSupportApplied).toBe(-5);
  });

  it('holds the offset flat across subsequent active turns (no accumulation)', () => {
    const state = makeState({ regions: [makeRegion({ id: 'r1', publicSupport: 50 })], enactments: [enactTax('r1')] });
    carbonTax.step(makeContext(state));
    carbonTax.step(makeContext(state));
    carbonTax.step(makeContext(state));
    expect(state.regions[0]!.publicSupport).toBeCloseTo(45, 6); // still −5, not −15
  });

  it('restores support and auto-repeals when the fossil base reaches zero', () => {
    const industryEffect = {
      policyId: 'carbon-tax', regionId: 'r1',
      effect: { target: 'industry' as const, delta: -0.05, duration: 'ongoing' as const },
      turnsRemaining: Number.POSITIVE_INFINITY,
    };
    const state = makeState({
      regions: [zeroBase()], // publicSupport already offset to 45 from a prior active turn
      enactments: [enactTax('r1', { carbonSupportApplied: -5 })],
      activeEffects: [industryEffect],
    });
    state.regions[0]!.publicSupport = 45;
    carbonTax.step(makeContext(state));
    expect(state.regions[0]!.publicSupport).toBeCloseTo(50, 6);           // +5 restored
    expect(state.enactments.some((e) => e.policyId === 'carbon-tax')).toBe(false);   // auto-repealed
    expect(state.activeEffects.some((x) => x.policyId === 'carbon-tax')).toBe(false); // its effect dropped
  });
});
