import { describe, it, expect } from 'vitest';
import { applyCancellations } from '../src/effects.js';
import { programs } from '../src/models/programs.js';
import { advanceTurn } from '../src/simulation.js';
import { createInitialState } from '../src/state.js';
import { makeRegion, makeState, makeContext } from './fixtures.js';
import type { ActiveEffect, Enactment } from '../src/types.js';

function enact(o: Partial<Enactment> = {}): Enactment {
  return { policyId: 'renewable-subsidy', regionId: 'r1', capacity: 0.4, complete: false, ...o };
}

describe('applyCancellations', () => {
  it('freezes a buildout in place (kept, flagged cancelled, capacity unchanged)', () => {
    const state = makeState({
      regions: [makeRegion({ id: 'r1' })],
      enactments: [enact({ capacity: 0.4 })],
    });
    applyCancellations(state, [{ policyId: 'renewable-subsidy', regionId: 'r1' }]);
    const e = state.enactments.find((x) => x.policyId === 'renewable-subsidy' && x.regionId === 'r1');
    expect(e).toBeDefined();
    expect(e!.cancelled).toBe(true);
    expect(e!.capacity).toBeCloseTo(0.4, 5);
  });

  it('ends a recurring policy: removes the enactment and its ongoing effects', () => {
    const adaptationEffect: ActiveEffect = {
      policyId: 'climate-adaptation', regionId: 'r1',
      effect: { target: 'healthIndex', delta: 2, duration: 'ongoing' },
      turnsRemaining: Number.POSITIVE_INFINITY,
    };
    const state = makeState({
      regions: [makeRegion({ id: 'r1' })],
      enactments: [enact({ policyId: 'climate-adaptation', regionId: 'r1', capacity: 1, complete: false })],
      activeEffects: [adaptationEffect],
    });
    applyCancellations(state, [{ policyId: 'climate-adaptation', regionId: 'r1' }]);
    expect(state.enactments.some((x) => x.policyId === 'climate-adaptation')).toBe(false);
    expect(state.activeEffects.some((x) => x.policyId === 'climate-adaptation')).toBe(false);
  });

  it('does not cancel a one-time policy (permanent, left intact)', () => {
    const state = makeState({
      regions: [makeRegion({ id: 'r1' })],
      enactments: [enact({ policyId: 'carbon-tax', regionId: 'r1', capacity: 1, complete: true })],
    });
    applyCancellations(state, [{ policyId: 'carbon-tax', regionId: 'r1' }]);
    const e = state.enactments.find((x) => x.policyId === 'carbon-tax');
    expect(e).toBeDefined();
    expect(e!.cancelled).toBeFalsy();
  });
});

describe('advanceTurn — cancelling a committed buildout', () => {
  it('stops upkeep on the next turn while freezing the installed capacity', () => {
    const sel = [{ policyId: 'renewable-subsidy', regionId: 'east-asia' }];
    let s = createInitialState();
    s = advanceTurn(s, sel).state;            // enact + first buildout charge
    s = advanceTurn(s, []).state;             // keep building
    const e1 = s.enactments.find((x) => x.policyId === 'renewable-subsidy' && x.regionId === 'east-asia')!;
    const moneyBefore = s.resources.money;
    const capFrozen = e1.capacity;

    // Cancel it this turn; no new enactments.
    s = advanceTurn(s, [], [{ policyId: 'renewable-subsidy', regionId: 'east-asia' }]).state;
    const e2 = s.enactments.find((x) => x.policyId === 'renewable-subsidy' && x.regionId === 'east-asia')!;
    expect(e2.cancelled).toBe(true);
    expect(e2.capacity).toBeCloseTo(capFrozen, 5);          // frozen, no advance

    // A further turn must not spend any program money on it.
    const before = s.resources.money;
    const { diagnostics } = advanceTurn(s, []);
    expect(diagnostics.programSpendByRegion['east-asia'] ?? 0).toBeCloseTo(0, 5);
    void moneyBefore; void before;
  });
});

describe('programs — cancelled buildout', () => {
  it('charges nothing and stops advancing, but the installed capacity still delivers its benefit', () => {
    const state = makeState({
      regions: [makeRegion({ id: 'r1', gdpPerCapita: 20000, population: 1e9, gridCarbonIntensity: 0.5 })],
      resources: { money: 5000 },
      enactments: [enact({ capacity: 0.4, cancelled: true })],
    });
    programs.step(makeContext(state));
    expect(state.resources.money).toBeCloseTo(5000, 5);          // no upkeep
    expect(state.enactments[0]!.capacity).toBeCloseTo(0.4, 5);    // frozen
    expect(state.regions[0]!.gridCarbonIntensity).toBeCloseTo(0.5 - 0.08 * 0.4, 5); // benefit persists
  });
});
