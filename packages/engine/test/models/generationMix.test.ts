import { describe, it, expect } from 'vitest';
import { generationMix } from '../../src/models/generationMix.js';
import { gridIntensityFromMix } from '../../src/generation.js';
import { makeRegion, makeState, makeContext } from '../fixtures.js';

describe('generationMix submodel', () => {
  it('derives gridCarbonIntensity from the region mix', () => {
    const r = makeRegion({
      id: 'r1',
      generationMix: { coal: 0.6, gas: 0.1, oil: 0, nuclear: 0.1, hydro: 0.1, wind: 0.1, solar: 0, geothermal: 0 },
      gridCarbonIntensity: 0.123, // stale value the submodel must overwrite
    });
    const ctx = makeContext(makeState({ regions: [r] }));
    generationMix.step(ctx);
    expect(r.gridCarbonIntensity).toBeCloseTo(gridIntensityFromMix(r.generationMix), 9);
    expect(r.gridCarbonIntensity).toBeCloseTo(0.6 + 0.1 * 0.45, 9); // 0.645
  });

  it('rebalances an over-100% mix (policy grew renewables), retiring coal before gas', () => {
    const r = makeRegion({
      id: 'r1',
      // wind already grown past 1.0 total by programs: 0.5+0.2+0.05+0.1+0.05+0.2 = 1.1
      generationMix: { coal: 0.5, gas: 0.2, oil: 0.05, nuclear: 0.1, hydro: 0.05, wind: 0.2, solar: 0, geothermal: 0 },
    });
    const ctx = makeContext(makeState({ regions: [r] }));
    generationMix.step(ctx);
    const sum = Object.values(r.generationMix).reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 9);
    expect(r.generationMix.coal).toBeCloseTo(0.4, 9); // coal absorbs the 0.1 excess
    expect(r.generationMix.gas).toBeCloseTo(0.2, 9);  // gas untouched
    expect(r.gridCarbonIntensity).toBeCloseTo(gridIntensityFromMix(r.generationMix), 9);
  });
});
