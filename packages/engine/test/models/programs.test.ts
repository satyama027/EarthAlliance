import { describe, it, expect } from 'vitest';
import { programs } from '../../src/models/programs.js';
import { makeRegion, makeState, makeContext } from '../fixtures.js';
import type { Enactment } from '../../src/types.js';

function enact(overrides: Partial<Enactment> = {}): Enactment {
  return { policyId: 'renewable-subsidy', regionId: 'r1', capacity: 0, complete: false, ...overrides };
}

describe('programs submodel', () => {
  it('advances a buildout enactment capacity by its ratePerTurn', () => {
    const state = makeState({
      regions: [makeRegion({ id: 'r1', gdpPerCapita: 20000, population: 1e9 })],
      resources: { money: 5000 },
      enactments: [enact({ capacity: 0.15 })],
    });
    programs.step(makeContext(state));
    // renewable-subsidy buildout rate is 0.10
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
    // renewable global ref 1200; r1 share = 2/3 => charge 800
    expect(state.resources.money).toBeCloseTo(4200, 5);
  });

  it('ramps a buildout ongoing effect by current capacity', () => {
    const state = makeState({
      // Full storage isolates the ramp mechanic from storage gating (efficiency = 1).
      regions: [makeRegion({ id: 'r1', gdpPerCapita: 20000, population: 1e9, gridCarbonIntensity: 0.5, energyStorageCapacity: 1 })],
      resources: { money: 5000 },
      enactments: [enact({ capacity: 0.5, complete: true })], // complete => no advance, capacity fixed
    });
    programs.step(makeContext(state));
    // renewable lowers gridCarbonIntensity by 0.08 at 50% capacity => -0.04
    expect(state.regions[0]!.gridCarbonIntensity).toBeCloseTo(0.46, 5);
  });

  it('stops charging once a buildout reaches 100% but keeps delivering the benefit', () => {
    const state = makeState({
      regions: [makeRegion({ id: 'r1', gdpPerCapita: 20000, population: 1e9, gridCarbonIntensity: 0.5, energyStorageCapacity: 1 })],
      resources: { money: 5000 },
      enactments: [enact({ capacity: 0.95 })],
    });
    const ctx = makeContext(state);
    programs.step(ctx); // 0.95 -> 1.0, charged once, complete
    const moneyAfterComplete = state.resources.money;
    expect(state.enactments[0]!.complete).toBe(true);
    expect(state.enactments[0]!.capacity).toBeCloseTo(1, 5);
    programs.step(makeContext(state)); // already complete: no further charge
    expect(state.resources.money).toBeCloseTo(moneyAfterComplete, 5);
    // full benefit persists: -0.08 grid intensity applied each step at capacity 1
    expect(state.regions[0]!.gridCarbonIntensity).toBeCloseTo(0.5 - 0.08 - 0.08, 5);
  });

  it('idles when underfunded: no charge, no advance, existing capacity still delivers', () => {
    const state = makeState({
      regions: [makeRegion({ id: 'r1', gdpPerCapita: 20000, population: 1e9, gridCarbonIntensity: 0.5, energyStorageCapacity: 1 })],
      resources: { money: 10 }, // charge 1200 > 10
      enactments: [enact({ capacity: 0.2 })],
    });
    programs.step(makeContext(state));
    expect(state.resources.money).toBeCloseTo(10, 5);       // not charged
    expect(state.enactments[0]!.capacity).toBeCloseTo(0.2, 5); // not advanced
    expect(state.regions[0]!.gridCarbonIntensity).toBeCloseTo(0.5 - 0.08 * 0.2, 5); // installed capacity still works
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
      enactments: [enact({ policyId: 'carbon-tax', capacity: 1, complete: true })],
    });
    programs.step(makeContext(state));
    expect(state.resources.money).toBeCloseTo(5000, 5);
  });
});

describe('storage-gated renewables', () => {
  const renewable = (over = {}) => ({ policyId: 'renewable-subsidy', regionId: 'r1', capacity: 1, complete: true, ...over });

  it('delivers only the storage floor (60%) of the renewable benefit at zero storage', () => {
    const state = makeState({
      regions: [makeRegion({ id: 'r1', gridCarbonIntensity: 0.5, energyStorageCapacity: 0 })],
      resources: { money: 5000 },
      enactments: [renewable()],
    });
    programs.step(makeContext(state));
    // -0.08 * capacity(1) * (STORAGE_FLOOR 0.6 + 0.4 * storage 0) = -0.048
    expect(state.regions[0]!.gridCarbonIntensity).toBeCloseTo(0.5 - 0.048, 5);
  });

  it('delivers the full renewable benefit once storage is fully built out', () => {
    const state = makeState({
      regions: [makeRegion({ id: 'r1', gridCarbonIntensity: 0.5, energyStorageCapacity: 1 })],
      resources: { money: 5000 },
      enactments: [renewable()],
    });
    programs.step(makeContext(state));
    // -0.08 * 1 * (0.6 + 0.4 * 1) = -0.08
    expect(state.regions[0]!.gridCarbonIntensity).toBeCloseTo(0.42, 5);
  });

  it('scales renewable benefit linearly between the floor and full with partial storage', () => {
    const state = makeState({
      regions: [makeRegion({ id: 'r1', gridCarbonIntensity: 0.5, energyStorageCapacity: 0.5 })],
      resources: { money: 5000 },
      enactments: [renewable()],
    });
    programs.step(makeContext(state));
    // efficiency = 0.6 + 0.4 * 0.5 = 0.8; -0.08 * 0.8 = -0.064
    expect(state.regions[0]!.gridCarbonIntensity).toBeCloseTo(0.5 - 0.064, 5);
  });

  it('does NOT storage-gate a firm source (nuclear delivers full benefit at zero storage)', () => {
    const state = makeState({
      regions: [makeRegion({ id: 'r1', gridCarbonIntensity: 0.5, energyStorageCapacity: 0 })],
      resources: { money: 5000 },
      enactments: [{ policyId: 'nuclear-buildout', regionId: 'r1', capacity: 1, complete: true }],
    });
    programs.step(makeContext(state));
    // nuclear -0.10 applied in full regardless of storage
    expect(state.regions[0]!.gridCarbonIntensity).toBeCloseTo(0.40, 5);
  });
});
