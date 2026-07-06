import { describe, it, expect } from 'vitest';
import { programs } from '../../src/models/programs.js';
import { makeRegion, makeState, makeContext } from '../fixtures.js';
import { getPolicy, NUCLEAR_CAP, SOLAR_WEIGHT } from '../../src/policies.js';
import { DEFAULT_PARAMS } from '../../src/data/scenario.js';
import { GENERATION_SOURCE_IDS, type GenerationMix } from '../../src/generation.js';
import type { Enactment } from '../../src/types.js';

const sum = (m: GenerationMix): number => GENERATION_SOURCE_IDS.reduce((a, s) => a + m[s], 0);
const clean = (m: GenerationMix): number => m.nuclear + m.hydro + m.wind + m.solar + m.geothermal;

const renewable = getPolicy('renewable-subsidy')!;
const nuclear = getPolicy('nuclear-buildout')!;
const R_RATE = renewable.conversion!.ratePerTurn;
const R_COST = renewable.cost.money;
const N_RATE = nuclear.conversion!.ratePerTurn;
const N_COST = nuclear.cost.money;
const FLOOR = DEFAULT_PARAMS.STORAGE_FLOOR;

// A generic (non-conversion) buildout policy for the funding/capacity mechanics.
function enact(overrides: Partial<Enactment> = {}): Enactment {
  return { policyId: 'reforestation', regionId: 'r1', capacity: 0, complete: false, ...overrides };
}

describe('programs submodel — generic buildout funding', () => {
  it('advances a buildout enactment capacity by its ratePerTurn', () => {
    const state = makeState({
      regions: [makeRegion({ id: 'r1', gdpPerCapita: 20000, population: 1e9 })],
      resources: { money: 5000 },
      enactments: [enact({ capacity: 0.15 })],
    });
    programs.step(makeContext(state));
    // reforestation buildout rate is 0.10
    expect(state.enactments[0]!.capacity).toBeCloseTo(0.25, 5);
  });

  it('charges the money cost scaled by the region share of world GDP', () => {
    const state = makeState({
      regions: [
        makeRegion({ id: 'r1', gdpPerCapita: 20000, population: 1e9 }), // gdp 2e13
        makeRegion({ id: 'r2', gdpPerCapita: 10000, population: 1e9 }), // gdp 1e13
      ],
      resources: { money: 5000 },
      enactments: [enact({ regionId: 'r1', capacity: 0 })],
    });
    programs.step(makeContext(state));
    // reforestation global ref 250; r1 share = 2/3 => charge 166.67
    expect(state.resources.money).toBeCloseTo(5000 - 250 * (2 / 3), 4);
  });

  it('ramps a buildout ongoing effect by current capacity', () => {
    const state = makeState({
      regions: [makeRegion({ id: 'r1', gdpPerCapita: 20000, population: 1e9 })],
      resources: { money: 5000 },
      enactments: [enact({ capacity: 0.5, complete: true })], // complete => no advance, capacity fixed
    });
    programs.step(makeContext(state));
    // reforestation landUse -0.3 at 50% capacity => -0.15 (baseline landUse 0.5)
    expect(state.regions[0]!.landUse).toBeCloseTo(0.5 - 0.15, 5);
    // biodiversity +2 at 50% => +1 (baseline 50)
    expect(state.regions[0]!.biodiversityIndex).toBeCloseTo(51, 5);
  });

  it('stops charging once a buildout reaches 100% but keeps delivering the benefit', () => {
    const state = makeState({
      regions: [makeRegion({ id: 'r1', gdpPerCapita: 20000, population: 1e9 })],
      resources: { money: 5000 },
      enactments: [enact({ capacity: 0.95 })],
    });
    programs.step(makeContext(state)); // 0.95 -> 1.0, charged once, complete
    const moneyAfterComplete = state.resources.money;
    expect(state.enactments[0]!.complete).toBe(true);
    expect(state.enactments[0]!.capacity).toBeCloseTo(1, 5);
    programs.step(makeContext(state)); // already complete: no further charge
    expect(state.resources.money).toBeCloseTo(moneyAfterComplete, 5);
    // full benefit persists: -0.3 landUse applied each step at capacity 1 (two steps => -0.6)
    expect(state.regions[0]!.landUse).toBeCloseTo(0.5 - 0.6, 5);
  });

  it('idles when underfunded: no charge, no advance, existing capacity still delivers', () => {
    const state = makeState({
      regions: [makeRegion({ id: 'r1', gdpPerCapita: 20000, population: 1e9 })],
      resources: { money: 10 }, // charge 250 > 10
      enactments: [enact({ capacity: 0.2 })],
    });
    programs.step(makeContext(state));
    expect(state.resources.money).toBeCloseTo(10, 5);        // not charged
    expect(state.enactments[0]!.capacity).toBeCloseTo(0.2, 5); // not advanced
    expect(state.regions[0]!.landUse).toBeCloseTo(0.5 - 0.3 * 0.2, 5); // installed capacity still works
  });

  it('charges a recurring policy a flat amount every turn (no capacity, no completion)', () => {
    const state = makeState({
      regions: [makeRegion({ id: 'r1', gdpPerCapita: 20000, population: 1e9 })],
      resources: { money: 5000 },
      enactments: [enact({ policyId: 'climate-adaptation', capacity: 1, complete: false })],
    });
    programs.step(makeContext(state));
    // climate-adaptation recurring ref 500, single region share 1 => charge 500
    expect(state.resources.money).toBeCloseTo(4500, 5);
  });

  it('ignores one-time policies (they are charged once at enactment)', () => {
    const state = makeState({
      regions: [makeRegion({ id: 'r1', gdpPerCapita: 20000, population: 1e9 })],
      resources: { money: 5000 },
      enactments: [enact({ policyId: 'fuel-efficiency', capacity: 1, complete: true })],
    });
    programs.step(makeContext(state));
    expect(state.resources.money).toBeCloseTo(5000, 5);
  });
});

describe('programs submodel — fossil-replacement conversions', () => {
  const conv = (policyId: string, regionId: string): Enactment => ({
    policyId, regionId, capacity: 0, complete: false, convertedShare: 0,
  });

  it('renewable subsidy converts fossil into wind+solar, dirtiest-first, split by SOLAR_WEIGHT', () => {
    const state = makeState({
      regions: [makeRegion({ id: 'test-region', energyStorageCapacity: 1 })], // full storage => factor 1
      resources: { money: 5000 },
      enactments: [conv('renewable-subsidy', 'test-region')],
    });
    programs.step(makeContext(state));
    const mix = state.regions[0]!.generationMix;
    const w = SOLAR_WEIGHT['test-region'] ?? 0.5;
    expect(mix.coal).toBeCloseTo(0.5 - R_RATE, 9);          // pulled from coal (dirtiest)
    expect(mix.solar).toBeCloseTo(0.2 + R_RATE * w, 9);
    expect(mix.wind).toBeCloseTo(0.3 + R_RATE * (1 - w), 9);
    expect(sum(mix)).toBeCloseTo(1, 9);                     // net-zero
    expect(state.resources.money).toBeCloseTo(5000 - R_COST, 9); // flat cost
    expect(state.enactments[0]!.convertedShare).toBeCloseTo(R_RATE, 9);
  });

  it('storage-gates the renewable conversion rate (only the floor lands at zero storage)', () => {
    const state = makeState({
      regions: [makeRegion({ id: 'test-region', energyStorageCapacity: 0 })],
      resources: { money: 5000 },
      enactments: [conv('renewable-subsidy', 'test-region')],
    });
    programs.step(makeContext(state));
    // factor = FLOOR + (1-FLOOR)*0 = FLOOR
    expect(state.regions[0]!.generationMix.coal).toBeCloseTo(0.5 - R_RATE * FLOOR, 9);
  });

  it('renewable subsidy is uncapped: keeps converting until fossils are exhausted, then completes', () => {
    const state = makeState({
      regions: [makeRegion({
        id: 'test-region', energyStorageCapacity: 1,
        generationMix: { coal: 0.08, gas: 0, oil: 0, nuclear: 0, hydro: 0, wind: 0.5, solar: 0.42, geothermal: 0 },
      })],
      resources: { money: 5000 },
      enactments: [conv('renewable-subsidy', 'test-region')],
    });
    programs.step(makeContext(state)); // converts R_RATE (0.06) of 0.08 fossil
    expect(state.enactments[0]!.complete).toBe(false);
    programs.step(makeContext(state)); // only 0.02 fossil left < R_RATE => completes
    expect(state.regions[0]!.generationMix.coal).toBeCloseTo(0, 9);
    expect(state.enactments[0]!.complete).toBe(true);
    const moneyAfter = state.resources.money;
    programs.step(makeContext(state)); // complete => no further charge / change
    expect(state.resources.money).toBeCloseTo(moneyAfter, 9);
  });

  it('nuclear buildout stops at the region uranium cap', () => {
    const cap = NUCLEAR_CAP['east-asia']!; // 0.05 (uranium-poor, floored)
    const state = makeState({
      regions: [makeRegion({
        id: 'east-asia',
        generationMix: { coal: 0.6, gas: 0.1, oil: 0, nuclear: 0, hydro: 0.1, wind: 0.1, solar: 0.1, geothermal: 0 },
      })],
      resources: { money: 5000 },
      enactments: [conv('nuclear-buildout', 'east-asia')],
    });
    // enough steps to exceed the cap
    for (let i = 0; i < 5; i++) programs.step(makeContext(state));
    expect(state.regions[0]!.generationMix.nuclear).toBeCloseTo(cap, 9);
    expect(state.enactments[0]!.convertedShare).toBeCloseTo(cap, 9);
    expect(state.enactments[0]!.complete).toBe(true);
  });

  it('a uranium-rich region converts far more nuclear than a uranium-poor one', () => {
    const mk = (id: string) => makeState({
      regions: [makeRegion({
        id, generationMix: { coal: 0.6, gas: 0.1, oil: 0, nuclear: 0, hydro: 0.1, wind: 0.1, solar: 0.1, geothermal: 0 },
      })],
      resources: { money: 5000 },
      enactments: [conv('nuclear-buildout', id)],
    });
    const rich = mk('oceania');   // cap 0.85
    const poor = mk('east-asia'); // cap 0.05
    for (let i = 0; i < 5; i++) { programs.step(makeContext(rich)); programs.step(makeContext(poor)); }
    expect(rich.regions[0]!.generationMix.nuclear).toBeGreaterThan(poor.regions[0]!.generationMix.nuclear);
  });

  it('stacking renewable + nuclear in one region is additive — no cancellation', () => {
    const state = makeState({
      regions: [makeRegion({
        id: 'oceania', energyStorageCapacity: 1,
        generationMix: { coal: 0.6, gas: 0.1, oil: 0, nuclear: 0, hydro: 0, wind: 0.2, solar: 0.1, geothermal: 0 },
      })],
      resources: { money: 5000 },
      enactments: [conv('renewable-subsidy', 'oceania'), conv('nuclear-buildout', 'oceania')],
    });
    const mix = state.regions[0]!.generationMix;
    const cleanBefore = clean(mix);
    const coalBefore = mix.coal;
    programs.step(makeContext(state));
    expect(clean(mix) - cleanBefore).toBeCloseTo(R_RATE + N_RATE, 9); // full sum of both
    expect(coalBefore - mix.coal).toBeCloseTo(R_RATE + N_RATE, 9);    // drawn entirely from coal
    expect(mix.nuclear).toBeCloseTo(N_RATE, 9);                       // nuclear not diluted
    expect(sum(mix)).toBeCloseTo(1, 9);
  });

  it('charges the conversion cost flat — same money regardless of region GDP', () => {
    const state = makeState({
      regions: [
        makeRegion({ id: 'r1', gdpPerCapita: 20000, population: 1e9, energyStorageCapacity: 1 }),
        makeRegion({ id: 'r2', gdpPerCapita: 2000, population: 1e9, energyStorageCapacity: 1 }),
      ],
      resources: { money: 5000 },
      enactments: [conv('renewable-subsidy', 'r1'), conv('renewable-subsidy', 'r2')],
    });
    programs.step(makeContext(state));
    expect(state.resources.money).toBeCloseTo(5000 - 2 * R_COST, 9); // flat: 10x-GDP region pays the same
  });
});
