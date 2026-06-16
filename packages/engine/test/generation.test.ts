import { describe, it, expect } from 'vitest';
import {
  GENERATION_SOURCES,
  gridIntensityFromMix,
  rebalanceMix,
  drawFromFossils,
  type GenerationMix,
} from '../src/generation.js';

const blank = (): GenerationMix => ({
  coal: 0, gas: 0, oil: 0, nuclear: 0, hydro: 0, wind: 0, solar: 0, geothermal: 0,
});

const sum = (m: GenerationMix): number => Object.values(m).reduce((a, b) => a + b, 0);

describe('GENERATION_SOURCES table', () => {
  it('normalizes emission factors to coal = 1.0, with gas 0.45 and oil 0.70', () => {
    expect(GENERATION_SOURCES.coal.emissionFactor).toBe(1.0);
    expect(GENERATION_SOURCES.gas.emissionFactor).toBe(0.45);
    expect(GENERATION_SOURCES.oil.emissionFactor).toBe(0.7);
  });

  it('gives every zero-carbon source a factor of 0', () => {
    for (const s of ['nuclear', 'hydro', 'wind', 'solar', 'geothermal'] as const) {
      expect(GENERATION_SOURCES[s].emissionFactor).toBe(0);
    }
  });

  it('tags hydro/wind/solar/geothermal renewable; coal/gas/oil/nuclear not', () => {
    for (const s of ['hydro', 'wind', 'solar', 'geothermal'] as const) {
      expect(GENERATION_SOURCES[s].renewable).toBe(true);
    }
    for (const s of ['coal', 'gas', 'oil', 'nuclear'] as const) {
      expect(GENERATION_SOURCES[s].renewable).toBe(false);
    }
  });
});

describe('gridIntensityFromMix', () => {
  it('is 1.0 for an all-coal grid and 0 for an all-renewable grid', () => {
    expect(gridIntensityFromMix({ ...blank(), coal: 1 })).toBeCloseTo(1.0, 9);
    expect(gridIntensityFromMix({ ...blank(), wind: 0.5, solar: 0.5 })).toBeCloseTo(0, 9);
  });

  it('weights each source by its share × factor', () => {
    // 50% coal + 20% gas + 30% nuclear = 0.5 + 0.09 + 0 = 0.59
    expect(gridIntensityFromMix({ ...blank(), coal: 0.5, gas: 0.2, nuclear: 0.3 })).toBeCloseTo(0.59, 9);
  });
});

describe('rebalanceMix — conserve Σ=1, retire dirtiest fossils first', () => {
  const base = (): GenerationMix => ({
    coal: 0.5, gas: 0.2, oil: 0.05, nuclear: 0.05, hydro: 0.1, wind: 0.05, solar: 0.05, geothermal: 0,
  });

  it('draws an added renewable share out of coal before gas', () => {
    const m = base();
    m.wind += 0.1; // sum now 1.1
    rebalanceMix(m);
    expect(sum(m)).toBeCloseTo(1, 9);
    expect(m.coal).toBeCloseTo(0.4, 9); // coal absorbs the whole 0.1
    expect(m.gas).toBeCloseTo(0.2, 9);  // gas untouched while coal remains
    expect(m.wind).toBeCloseTo(0.15, 9);
  });

  it('spills into oil (dirtier), then gas, once coal is exhausted', () => {
    const m = base();
    m.wind += 0.6; // exceeds coal's 0.5
    rebalanceMix(m);
    expect(sum(m)).toBeCloseTo(1, 9);
    expect(m.coal).toBeCloseTo(0, 9);   // 0.5 drawn
    expect(m.oil).toBeCloseTo(0, 9);    // 0.05 drawn (oil is dirtier than gas)
    expect(m.gas).toBeCloseTo(0.15, 9); // remaining 0.05 drawn from gas (cleanest fossil, last)
  });

  it('clamps negative shares and renormalizes as a terminal guard', () => {
    const m = base();
    m.coal = -0.2; // pathological
    rebalanceMix(m);
    expect(sum(m)).toBeCloseTo(1, 9);
    for (const v of Object.values(m)) expect(v).toBeGreaterThanOrEqual(0);
  });
});

describe('drawFromFossils — pull share out of fossils dirtiest-first', () => {
  it('takes from coal before gas before oil and returns the amount pulled', () => {
    const m: GenerationMix = { ...blank(), coal: 0.4, gas: 0.3, oil: 0.1, wind: 0.2 };
    const pulled = drawFromFossils(m, 0.1);
    expect(pulled).toBeCloseTo(0.1, 9);
    expect(m.coal).toBeCloseTo(0.3, 9); // coal absorbs the whole 0.1
    expect(m.gas).toBeCloseTo(0.3, 9);
    expect(m.oil).toBeCloseTo(0.1, 9);
  });

  it('spills into oil (dirtier), then gas, once coal is exhausted', () => {
    const m: GenerationMix = { ...blank(), coal: 0.1, gas: 0.1, oil: 0.1, wind: 0.7 };
    const pulled = drawFromFossils(m, 0.25);
    expect(pulled).toBeCloseTo(0.25, 9);
    expect(m.coal).toBeCloseTo(0, 9);   // 0.1 drawn
    expect(m.oil).toBeCloseTo(0, 9);    // 0.1 drawn (oil is dirtier than gas)
    expect(m.gas).toBeCloseTo(0.05, 9); // 0.05 drawn from gas last
  });

  it('caps at available fossil, returning less than requested when exhausted', () => {
    const m: GenerationMix = { ...blank(), coal: 0.1, gas: 0.05, nuclear: 0.85 };
    const pulled = drawFromFossils(m, 0.5); // only 0.15 fossil available
    expect(pulled).toBeCloseTo(0.15, 9);
    expect(m.coal).toBeCloseTo(0, 9);
    expect(m.gas).toBeCloseTo(0, 9);
  });

  it('leaves clean sources untouched and conserves Σ when paired with a clean add', () => {
    const m: GenerationMix = { ...blank(), coal: 0.5, nuclear: 0.2, wind: 0.3 };
    const pulled = drawFromFossils(m, 0.2);
    m.wind += pulled; // the conversion's clean counterpart
    expect(m.nuclear).toBeCloseTo(0.2, 9); // untouched
    expect(sum(m)).toBeCloseTo(1, 9);      // net-zero conversion
  });
});
