import { describe, it, expect } from 'vitest';
import { spendAndRegister, applyEffects } from '../src/effects.js';
import { makeRegion, makeState } from './fixtures.js';
import type { ActiveEffect } from '../src/types.js';

describe('spendAndRegister', () => {
  const singleRegion = () => ({
    regions: [makeRegion({ id: 'r1', gdpPerCapita: 20000, population: 1e9 })],
    resources: { money: 5000 },
  });

  it('charges a one-time policy its GDP-scaled money, and records the enactment', () => {
    const state = makeState(singleRegion());
    const immediate = spendAndRegister(state, [{ policyId: 'carbon-tax', regionId: 'r1' }]);
    expect(state.resources.money).toBeCloseTo(4950, 5);    // -50 (share 1)
    expect(state.enactments).toContainEqual(
      expect.objectContaining({ policyId: 'carbon-tax', regionId: 'r1', complete: true }),
    );
    // ongoing emissions cut registered, scoped to the region; immediate support hit returned
    expect(state.activeEffects).toHaveLength(1);
    expect(state.activeEffects[0]!.effect.target).toBe('regionalEmissions');
    expect(state.activeEffects[0]!.regionId).toBe('r1');
    expect(immediate).toHaveLength(1);
    expect(immediate[0]!.effect.target).toBe('publicSupport');
    expect(immediate[0]!.regionId).toBe('r1');
  });

  it('does not charge money or register ongoing effects for a buildout policy (programs handles them)', () => {
    const state = makeState(singleRegion());
    spendAndRegister(state, [{ policyId: 'renewable-subsidy', regionId: 'r1' }]);
    expect(state.resources.money).toBe(5000);           // no money up front
    expect(state.activeEffects).toHaveLength(0);         // ramped effect owned by programs
    const e = state.enactments.find((x) => x.policyId === 'renewable-subsidy')!;
    expect(e.capacity).toBe(0);    // r1 not in baseline map => defaultBaseline 0
    expect(e.complete).toBe(false);
  });

  it('charges degrowth-mandate its GDP-scaled money up front (no longer free)', () => {
    const state = makeState(singleRegion());
    spendAndRegister(state, [{ policyId: 'degrowth-mandate', regionId: 'r1' }]);
    expect(state.resources.money).toBeCloseTo(3500, 5); // 5000 - 1500 (share 1)
  });

  it('registers ongoing effects but charges no up-front money for a recurring policy', () => {
    const state = makeState(singleRegion());
    spendAndRegister(state, [{ policyId: 'climate-adaptation', regionId: 'r1' }]);
    expect(state.resources.money).toBe(5000);          // recurring charged by programs
    expect(state.activeEffects).toHaveLength(2);        // health + water, flat
    const e = state.enactments.find((x) => x.policyId === 'climate-adaptation')!;
    expect(e.complete).toBe(false);
  });
});

describe('applyEffects', () => {
  it('applies an immediate effect once to all regions', () => {
    const state = makeState({ regions: [makeRegion({ publicSupport: 50 }), makeRegion({ id: 'r2', publicSupport: 50 })] });
    applyEffects(state, [{ policyId: 'x', regionId: null, effect: { target: 'publicSupport', delta: -3, duration: 'immediate' }, turnsRemaining: 0 }]);
    expect(state.regions[0]!.publicSupport).toBe(47);
    expect(state.regions[1]!.publicSupport).toBe(47);
  });

  it('applies and expires ongoing effects on schedule', () => {
    const state = makeState({ regions: [makeRegion({ regionalEmissions: 10 })] });
    const active: ActiveEffect = { policyId: 'x', regionId: null, effect: { target: 'regionalEmissions', delta: -1, duration: 'ongoing', turns: 2 }, turnsRemaining: 2 };
    state.activeEffects = [active];

    applyEffects(state, []);
    expect(state.regions[0]!.regionalEmissions).toBe(9);
    expect(state.activeEffects[0]!.turnsRemaining).toBe(1);

    applyEffects(state, []);
    expect(state.regions[0]!.regionalEmissions).toBe(8);
    expect(state.activeEffects).toHaveLength(0); // expired
  });

  it('clamps 0–100 targets but lets emissions go negative', () => {
    const state = makeState({ regions: [makeRegion({ biodiversityIndex: 99, regionalEmissions: 0.5 })] });
    applyEffects(state, [
      { policyId: 'x', regionId: null, effect: { target: 'biodiversityIndex', delta: 5, duration: 'immediate' }, turnsRemaining: 0 },
      { policyId: 'y', regionId: null, effect: { target: 'regionalEmissions', delta: -1, duration: 'immediate' }, turnsRemaining: 0 },
    ]);
    expect(state.regions[0]!.biodiversityIndex).toBe(100);
    expect(state.regions[0]!.regionalEmissions).toBeCloseTo(-0.5, 5);
  });
});
