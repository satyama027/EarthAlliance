import { describe, it, expect } from 'vitest';
import { advanceTurn } from '../src/simulation.js';
import { createInitialState } from '../src/state.js';
import { POLICY_CATALOG, validateSelection, getPolicy } from '../src/policies.js';
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
  it('EV Subsidies cuts transport but raises electricity demand', () => {
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

describe('generation-mix policies', () => {
  it('renames ev-transition to "EV Subsidies"', () => {
    expect(getPolicy('ev-transition')?.name).toBe('EV Subsidies');
  });

  it('EV Subsidies grows electricity demand turn-over-turn (not a one-shot jump)', () => {
    let s = createInitialState();
    s = advanceTurn(s, [{ policyId: 'ev-transition', regionId: REGION }]).state;
    const d1 = s.regions.find((r) => r.id === REGION)!.electricityDemand;
    s = advanceTurn(s, []).state; // buildout capacity keeps ramping
    const d2 = s.regions.find((r) => r.id === REGION)!.electricityDemand;
    s = advanceTurn(s, []).state;
    const d3 = s.regions.find((r) => r.id === REGION)!.electricityDemand;
    expect(d2).toBeGreaterThan(d1);
    expect(d3).toBeGreaterThan(d2);
  });

  it('renewable subsidy raises renewable share and lowers derived grid intensity over turns', () => {
    let s = createInitialState();
    const before = s.regions.find((r) => r.id === REGION)!;
    const renewBefore = before.generationMix.wind + before.generationMix.solar;
    const intBefore = before.gridCarbonIntensity;
    s = advanceTurn(s, [
      { policyId: 'renewable-subsidy', regionId: REGION },
      { policyId: 'grid-storage', regionId: REGION },
    ]).state;
    for (let i = 0; i < 5; i++) s = advanceTurn(s, []).state;
    const after = s.regions.find((r) => r.id === REGION)!;
    expect(after.generationMix.wind + after.generationMix.solar).toBeGreaterThan(renewBefore);
    expect(after.gridCarbonIntensity).toBeLessThan(intBefore);
  });

  it('retires coal before touching gas (renewable subsidy in a coal-heavy grid)', () => {
    const SA = 'south-asia';
    let s = createInitialState();
    const coalBefore = s.regions.find((r) => r.id === SA)!.generationMix.coal;
    const gasBefore = s.regions.find((r) => r.id === SA)!.generationMix.gas;
    s = advanceTurn(s, [{ policyId: 'renewable-subsidy', regionId: SA }]).state;
    s = advanceTurn(s, []).state;
    const after = s.regions.find((r) => r.id === SA)!;
    expect(after.generationMix.coal).toBeLessThan(coalBefore); // coal retired first
    expect(after.generationMix.gas).toBeCloseTo(gasBefore, 9); // gas untouched while coal remains
  });
});

describe('effect-target hygiene', () => {
  it('no policy targets the now-derived gridCarbonIntensity', () => {
    for (const p of POLICY_CATALOG) {
      for (const e of p.effects) expect(e.target).not.toBe('gridCarbonIntensity');
    }
  });

  it('only buildout policies grow generation shares, and only via ongoing effects', () => {
    const shareTargets = new Set(['windShare', 'solarShare', 'nuclearShare']);
    for (const p of POLICY_CATALOG) {
      for (const e of p.effects) {
        if (!shareTargets.has(e.target)) continue;
        expect(p.funding).toBe('buildout'); // share writes must flow through programs (preserves Σ=1)
        expect(e.duration).toBe('ongoing');
      }
    }
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

describe('activity sources cannot go negative (only land-use is a sink)', () => {
  it('clamps an over-cut activity source at zero, but lets land-use go negative', () => {
    const region = () => makeRegion({ id: 'r1', transport: 1.0, landUse: 0.5 });
    const big = (target: 'transport' | 'landUse'): ActiveEffect => ({
      policyId: target, regionId: 'r1',
      effect: { target, delta: -10, duration: 'ongoing' },
      turnsRemaining: Number.POSITIVE_INFINITY,
    });
    const r = advanceTurn(
      makeState({ regions: [region()], activeEffects: [big('transport'), big('landUse')] }), [],
    ).state.regions[0]!;
    expect(r.transport).toBe(0);        // a sector cannot emit negative — clamped
    expect(r.landUse).toBeLessThan(0);  // land-use CAN be a carbon sink
  });
});

describe('policy catalog integrity', () => {
  it('gives every buildout policy a rollout spec (buildout or conversion) and a non-negative cost', () => {
    for (const p of POLICY_CATALOG) {
      // Most policies cost money; the Carbon Tax is a revenue lever (cost 0), so allow >= 0.
      expect(p.cost.money).toBeGreaterThanOrEqual(0);
      if (p.funding === 'buildout') expect(p.buildout ?? p.conversion).toBeDefined();
    }
  });
});
