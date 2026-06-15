import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { createInitialState } from '../src/state.js';
import { advanceTurn } from '../src/simulation.js';
import { getAvailablePolicies, validateSelection } from '../src/policies.js';
import type { WorldState } from '../src/types.js';

function assertSane(state: WorldState): void {
  const finite = (n: number) => Number.isFinite(n);
  expect(finite(state.climate.temperatureAnomaly)).toBe(true);
  expect(finite(state.climate.co2Concentration)).toBe(true);
  expect(finite(state.climate.annualEmissions)).toBe(true);
  expect(finite(state.resources.money)).toBe(true);
  for (const r of state.regions) {
    expect(r.population).toBeGreaterThanOrEqual(0);
    for (const v of [r.educationIndex, r.healthIndex, r.publicSupport, r.equityIndex,
      r.biodiversityIndex, r.waterAvailability, r.landAvailability]) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
      expect(finite(v)).toBe(true);
    }
    expect(finite(r.gdpPerCapita)).toBe(true);
    expect(finite(r.regionalEmissions)).toBe(true);

    // Sectoral emissions: every source is finite; the five activity sources cannot be negative
    // (only land-use may be a sink); the six sources sum to the derived regional total.
    const sources = [r.electricity, r.transport, r.aviationShipping, r.industry, r.agriculture, r.landUse];
    for (const v of sources) expect(finite(v)).toBe(true);
    for (const v of [r.electricity, r.transport, r.aviationShipping, r.industry, r.agriculture]) {
      expect(v).toBeGreaterThanOrEqual(0);
    }
    expect(sources.reduce((a, v) => a + v, 0)).toBeCloseTo(r.regionalEmissions, 6);

    // Coupling stocks stay in their valid ranges.
    for (const idx of [r.gridCarbonIntensity, r.energyStorageCapacity]) {
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(idx).toBeLessThanOrEqual(1);
    }
    expect(r.agriculturalProductivity).toBeGreaterThanOrEqual(0);
    expect(r.electricityDemand).toBeGreaterThanOrEqual(0);
    expect(finite(r.agriculturalProductivity)).toBe(true);
    expect(finite(r.electricityDemand)).toBe(true);
  }
}

describe('invariants', () => {
  it('keeps all state finite and in-range over random affordable playthroughs', () => {
    fc.assert(
      fc.property(
        fc.array(fc.record({ region: fc.nat({ max: 9 }), pick: fc.nat({ max: 9 }) }), { maxLength: 35 }),
        (turnPicks) => {
          let state = createInitialState();
          for (const { region, pick } of turnPicks) {
            if (state.status === 'ended') break;
            const regionId = state.regions[region % state.regions.length]!.id;
            const available = getAvailablePolicies(state, regionId);
            const candidate = available[pick % Math.max(available.length, 1)];
            const sel = candidate && validateSelection(state, [{ policyId: candidate.id, regionId }]).ok
              ? [{ policyId: candidate.id, regionId }]
              : [];
            state = advanceTurn(state, sel).state;
            assertSane(state);
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});
