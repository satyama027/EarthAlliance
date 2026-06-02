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
  expect(finite(state.resources.politicalCapital)).toBe(true);
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
      fc.property(fc.array(fc.nat({ max: 9 }), { maxLength: 35 }), (turnPicks) => {
        let state = createInitialState();
        for (const pickIdx of turnPicks) {
          if (state.status === 'ended') break;
          const available = getAvailablePolicies(state);
          const candidate = available[pickIdx % Math.max(available.length, 1)];
          const ids = candidate && validateSelection(state, [candidate.id]).ok ? [candidate.id] : [];
          state = advanceTurn(state, ids).state;
          assertSane(state);
        }
      }),
      { numRuns: 200 },
    );
  });
});
