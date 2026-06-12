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
