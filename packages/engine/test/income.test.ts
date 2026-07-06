import { describe, it, expect } from 'vitest';
import { fossilTaxBase, carbonTaxRevenue, regionTaxIncome } from '../src/income.js';
import { DEFAULT_PARAMS } from '../src/data/scenario.js';
import { SAMPLE_REGIONS } from '../src/data/regions.js';
import { makeRegion } from './fixtures.js';

const region = (id: string) => SAMPLE_REGIONS.find((r) => r.id === id)!;

describe('fossilTaxBase', () => {
  it('sums fossil power (demand × intensity) + transport + industry + aviation/shipping', () => {
    // fixture: electricityDemand 8 × gridCarbonIntensity 0.5 = 4 fossil power; +2 +2 +0.5
    expect(fossilTaxBase(makeRegion())).toBeCloseTo(8.5, 9);
  });

  it('excludes agriculture and land-use (non-fossil)', () => {
    const base = fossilTaxBase(makeRegion({ agriculture: 99, landUse: 99 }));
    expect(base).toBeCloseTo(8.5, 9);
  });

  it('recomputes fossil power from demand × intensity (not the stale electricity field)', () => {
    // electricity field left at 4, but a decarbonized grid (intensity 0) → zero fossil power.
    const base = fossilTaxBase(makeRegion({ gridCarbonIntensity: 0, electricity: 4 }));
    expect(base).toBeCloseTo(2 + 2 + 0.5, 9);
  });
});

describe('carbonTaxRevenue', () => {
  it('is CARBON_TAX_RATE × fossil tax base', () => {
    expect(carbonTaxRevenue(makeRegion(), DEFAULT_PARAMS)).toBeCloseTo(2 * 8.5, 9);
  });

  it('matches the calibrated turn-1 figures for North America and East Asia', () => {
    expect(carbonTaxRevenue(region('north-america'), DEFAULT_PARAMS)).toBeCloseTo(10.96, 2);
    expect(carbonTaxRevenue(region('east-asia'), DEFAULT_PARAMS)).toBeCloseTo(24.74, 2);
  });

  it('shrinks toward zero as the grid decarbonizes', () => {
    const dirty = carbonTaxRevenue(region('east-asia'), DEFAULT_PARAMS);
    const clean = carbonTaxRevenue({ ...region('east-asia'), gridCarbonIntensity: 0 }, DEFAULT_PARAMS);
    expect(clean).toBeLessThan(dirty);
  });
});

describe('regionTaxIncome', () => {
  it('is the per-region GDP tax term (TAX_RATE × gdp × pop / MONEY_SCALE)', () => {
    expect(regionTaxIncome(makeRegion(), DEFAULT_PARAMS)).toBeCloseTo(600, 6);
  });

  it('matches the calibrated turn-1 figure for North America', () => {
    expect(regionTaxIncome(region('north-america'), DEFAULT_PARAMS)).toBeCloseTo(1014, 0);
  });
});
