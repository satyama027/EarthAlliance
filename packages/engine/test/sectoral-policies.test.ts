import { describe, it, expect } from 'vitest';
import { advanceTurn } from '../src/simulation.js';
import { createInitialState } from '../src/state.js';
import { POLICY_CATALOG, validateSelection } from '../src/policies.js';
import { makeState, makeRegion } from './fixtures.js';
import { DEFAULT_PARAMS } from '../src/data/scenario.js';
import type { ActiveEffect } from '../src/types.js';

const REGION = 'north-america';

/** Advance one turn with the policy enacted in REGION, and again with nothing, and return
 *  that region from each run — so a trade-off shows as a difference against the do-nothing
 *  baseline (which isolates the policy from the shared activity-driven growth). */
function withAndWithout(policyId: string, regionId = REGION) {
  const s0 = createInitialState();
  expect(validateSelection(s0, [{ policyId, regionId }]).ok).toBe(true);
  const withPol = advanceTurn(s0, [{ policyId, regionId }]).state.regions.find((r) => r.id === regionId)!;
  const without = advanceTurn(s0, []).state.regions.find((r) => r.id === regionId)!;
  return { withPol, without };
}

describe('new sectoral policies — trade-offs', () => {
  it('EV transition cuts transport but raises electricity demand', () => {
    const { withPol, without } = withAndWithout('ev-transition');
    expect(withPol.transport).toBeLessThan(without.transport);
    expect(withPol.electricityDemand).toBeGreaterThan(without.electricityDemand);
  });

  it('industrial electrification cuts industry but raises electricity demand', () => {
    const { withPol, without } = withAndWithout('industrial-electrification');
    expect(withPol.industry).toBeLessThan(without.industry);
    expect(withPol.electricityDemand).toBeGreaterThan(without.electricityDemand);
  });

  it('grid storage builds out energy storage capacity', () => {
    const { withPol, without } = withAndWithout('grid-storage');
    expect(withPol.energyStorageCapacity).toBeGreaterThan(without.energyStorageCapacity);
  });

  it('organic farming cuts agriculture but lowers agricultural productivity', () => {
    const { withPol, without } = withAndWithout('organic-farming');
    expect(withPol.agriculture).toBeLessThan(without.agriculture);
    expect(withPol.agriculturalProductivity).toBeLessThan(without.agriculturalProductivity);
  });

  it('precision agriculture cuts agriculture AND raises productivity (the win-win)', () => {
    const { withPol, without } = withAndWithout('precision-agriculture');
    expect(withPol.agriculture).toBeLessThan(without.agriculture);
    expect(withPol.agriculturalProductivity).toBeGreaterThan(without.agriculturalProductivity);
  });

  it('anti-deforestation lowers land-use emissions', () => {
    const { withPol, without } = withAndWithout('anti-deforestation');
    expect(withPol.landUse).toBeLessThan(without.landUse);
  });

  it('fuel-efficiency standards cut transport', () => {
    const { withPol, without } = withAndWithout('fuel-efficiency');
    expect(withPol.transport).toBeLessThan(without.transport);
  });
});

describe('aviation/shipping hard-to-abate floor', () => {
  it('floors aviation/shipping at AVIATION_FLOOR of its activity-driven level', () => {
    const region = () => makeRegion({ id: 'r1', aviationShipping: 1.0 });
    // A huge ongoing cut that would otherwise drive aviation deeply negative.
    const cut: ActiveEffect = {
      policyId: 'x', regionId: 'r1',
      effect: { target: 'aviationShipping', delta: -10, duration: 'ongoing' },
      turnsRemaining: Number.POSITIVE_INFINITY,
    };
    const cutRun = advanceTurn(makeState({ regions: [region()], activeEffects: [cut] }), []).state.regions[0]!;
    const natRun = advanceTurn(makeState({ regions: [region()] }), []).state.regions[0]!;
    expect(cutRun.aviationShipping).toBeGreaterThan(0);
    expect(cutRun.aviationShipping).toBeCloseTo(DEFAULT_PARAMS.AVIATION_FLOOR * natRun.aviationShipping, 5);
  });
});

describe('policy catalog integrity', () => {
  it('gives every buildout policy a buildout spec and a positive cost', () => {
    for (const p of POLICY_CATALOG) {
      expect(p.cost.money).toBeGreaterThan(0);
      if (p.funding === 'buildout') expect(p.buildout).toBeDefined();
    }
  });
});
