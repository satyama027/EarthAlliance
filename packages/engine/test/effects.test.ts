import { describe, it, expect } from 'vitest';
import { spendAndRegister, applyEffects, applyToRegion } from '../src/effects.js';
import { makeRegion, makeState } from './fixtures.js';
import type { ActiveEffect } from '../src/types.js';

describe('applyToRegion — generation-share targets', () => {
  it('routes windShare / solarShare / nuclearShare into the generation mix', () => {
    const r = makeRegion({ id: 'r1' });
    const w0 = r.generationMix.wind;
    const s0 = r.generationMix.solar;
    const n0 = r.generationMix.nuclear;
    applyToRegion(r, 'windShare', 0.05);
    applyToRegion(r, 'solarShare', 0.03);
    applyToRegion(r, 'nuclearShare', 0.07);
    expect(r.generationMix.wind).toBeCloseTo(w0 + 0.05, 9);
    expect(r.generationMix.solar).toBeCloseTo(s0 + 0.03, 9);
    expect(r.generationMix.nuclear).toBeCloseTo(n0 + 0.07, 9);
  });
});

describe('spendAndRegister', () => {
  const singleRegion = () => ({
    regions: [makeRegion({ id: 'r1', gdpPerCapita: 20000, population: 1e9 })],
    resources: { money: 5000 },
  });

  it('charges a one-time policy its GDP-scaled money, and records the enactment', () => {
    const state = makeState(singleRegion());
    spendAndRegister(state, [{ policyId: 'fuel-efficiency', regionId: 'r1' }]);
    expect(state.resources.money).toBeCloseTo(4900, 5);    // -100 (share 1)
    expect(state.enactments).toContainEqual(
      expect.objectContaining({ policyId: 'fuel-efficiency', regionId: 'r1', complete: true }),
    );
    // ongoing transport cut registered, scoped to the region
    expect(state.activeEffects).toHaveLength(1);
    expect(state.activeEffects[0]!.effect.target).toBe('transport');
    expect(state.activeEffects[0]!.regionId).toBe('r1');
  });

  it('charges no up-front money for the recurring Carbon Tax; registers only its declared industry effect', () => {
    const state = makeState(singleRegion());
    const immediate = spendAndRegister(state, [{ policyId: 'carbon-tax', regionId: 'r1' }]);
    expect(state.resources.money).toBe(5000);              // recurring: no up-front charge (revenue via submodel)
    expect(immediate).toHaveLength(0);                      // no immediate effects
    const e = state.enactments.find((x) => x.policyId === 'carbon-tax')!;
    expect(e.complete).toBe(false);                         // recurring never "completes"
    // Only the ongoing industry price-nudge is a declared effect — revenue and the support offset are
    // applied by the carbonTax submodel, not the effect system.
    expect(state.activeEffects).toHaveLength(1);
    expect(state.activeEffects[0]!.effect.target).toBe('industry');
    expect(state.activeEffects[0]!.regionId).toBe('r1');
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
    const state = makeState({ regions: [makeRegion({ transport: 10 })] });
    const active: ActiveEffect = { policyId: 'x', regionId: null, effect: { target: 'transport', delta: -1, duration: 'ongoing', turns: 2 }, turnsRemaining: 2 };
    state.activeEffects = [active];

    applyEffects(state, []);
    expect(state.regions[0]!.transport).toBe(9);
    expect(state.activeEffects[0]!.turnsRemaining).toBe(1);

    applyEffects(state, []);
    expect(state.regions[0]!.transport).toBe(8);
    expect(state.activeEffects).toHaveLength(0); // expired
  });

  it('clamps 0–100 indices but lets source emissions go negative', () => {
    const state = makeState({ regions: [makeRegion({ biodiversityIndex: 99, transport: 0.5 })] });
    applyEffects(state, [
      { policyId: 'x', regionId: null, effect: { target: 'biodiversityIndex', delta: 5, duration: 'immediate' }, turnsRemaining: 0 },
      { policyId: 'y', regionId: null, effect: { target: 'transport', delta: -1, duration: 'immediate' }, turnsRemaining: 0 },
    ]);
    expect(state.regions[0]!.biodiversityIndex).toBe(100);
    expect(state.regions[0]!.transport).toBeCloseTo(-0.5, 5);
  });
});
