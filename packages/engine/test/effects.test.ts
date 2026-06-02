import { describe, it, expect } from 'vitest';
import { spendAndRegister, applyEffects } from '../src/effects.js';
import { makeRegion, makeState } from './fixtures.js';
import type { ActiveEffect } from '../src/types.js';

describe('spendAndRegister', () => {
  it('deducts cost and records the enacted policy', () => {
    const state = makeState({ resources: { politicalCapital: 100, money: 100 } });
    spendAndRegister(state, ['renewable-subsidy']);
    expect(state.resources.politicalCapital).toBe(90); // -10
    expect(state.resources.money).toBe(80);            // -20
    expect(state.enactedPolicyIds).toContain('renewable-subsidy');
  });

  it('registers ongoing effects and returns immediate ones', () => {
    const state = makeState({ resources: { politicalCapital: 100, money: 100 } });
    const immediate = spendAndRegister(state, ['carbon-tax']);
    expect(state.activeEffects).toHaveLength(1); // ongoing emissions cut
    expect(state.activeEffects[0]!.effect.target).toBe('regionalEmissions');
    expect(immediate).toHaveLength(1);           // immediate support hit
    expect(immediate[0]!.effect.target).toBe('publicSupport');
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
