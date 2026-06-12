import { createInitialState, type WorldState, type Enactment } from '@earth-alliance/engine';
import { regionPolicyView, stagedCostNow, type CardVM } from '../src/game/policyView.js';

const REGION = 'north-america';

function withEnactments(enactments: Enactment[], patch: Partial<WorldState> = {}): WorldState {
  return { ...createInitialState(), enactments, ...patch };
}
const find = (cards: CardVM[], id: string) => cards.find((c) => c.policy.id === id);

describe('regionPolicyView', () => {
  it('lists enactable policies in Available and locks ones whose prereq is unmet here', () => {
    const { available, active } = regionPolicyView(createInitialState(), REGION, [], []);
    expect(active).toEqual([]);
    expect(find(available, 'renewable-subsidy')!.state).toBe('available');
    expect(find(available, 'off-world-colonies')!.state).toBe('locked');
  });

  it('moves a staged policy into the Active lane', () => {
    const staged = [{ policyId: 'renewable-subsidy', regionId: REGION }];
    const { available, active } = regionPolicyView(createInitialState(), REGION, staged, []);
    expect(find(active, 'renewable-subsidy')!.state).toBe('staged');
    expect(find(available, 'renewable-subsidy')).toBeUndefined();
  });

  it('shows a committed buildout as building, with capacity and cancellable', () => {
    const e: Enactment = { policyId: 'renewable-subsidy', regionId: REGION, capacity: 0.4, complete: false };
    const { active } = regionPolicyView(withEnactments([e]), REGION, [], []);
    const card = find(active, 'renewable-subsidy')!;
    expect(card.state).toBe('building');
    expect(card.capacity).toBeCloseTo(0.4, 5);
    expect(card.cancellable).toBe(true);
  });

  it('shows a committed one-time policy as permanent and not cancellable', () => {
    const e: Enactment = { policyId: 'carbon-tax', regionId: REGION, capacity: 1, complete: true };
    const card = find(regionPolicyView(withEnactments([e]), REGION, [], []).active, 'carbon-tax')!;
    expect(card.state).toBe('permanent');
    expect(card.cancellable).toBe(false);
  });

  it('shows a cancelled buildout as frozen', () => {
    const e: Enactment = { policyId: 'renewable-subsidy', regionId: REGION, capacity: 0.4, complete: false, cancelled: true };
    const card = find(regionPolicyView(withEnactments([e]), REGION, [], []).active, 'renewable-subsidy')!;
    expect(card.state).toBe('frozen');
    expect(card.cancellable).toBe(false);
  });

  it('flags a committed policy marked for cancel this turn', () => {
    const e: Enactment = { policyId: 'climate-adaptation', regionId: REGION, capacity: 1, complete: false };
    const cancels = [{ policyId: 'climate-adaptation', regionId: REGION }];
    const card = find(regionPolicyView(withEnactments([e]), REGION, [], cancels).active, 'climate-adaptation')!;
    expect(card.state).toBe('recurring');
    expect(card.cancelling).toBe(true);
  });

  it('marks available cards unaffordable when the budget is exhausted', () => {
    const broke = withEnactments([], { resources: { money: 0 } });
    const card = find(regionPolicyView(broke, REGION, [], []).available, 'renewable-subsidy')!;
    expect(card.affordable).toBe(false);
  });
});

describe('stagedCostNow', () => {
  it('charges the first-turn (setup) money for a buildout policy, not just one-time', () => {
    const cost = stagedCostNow(createInitialState(), [{ policyId: 'renewable-subsidy', regionId: REGION }]);
    expect(cost.money).toBeGreaterThan(0); // renewable-subsidy is buildout — its first upkeep counts now
  });

  it('charges the first-turn money for a recurring policy', () => {
    const cost = stagedCostNow(createInitialState(), [{ policyId: 'climate-adaptation', regionId: REGION }]);
    expect(cost.money).toBeGreaterThan(0);
  });

  it('still charges one-time money', () => {
    const cost = stagedCostNow(createInitialState(), [{ policyId: 'carbon-tax', regionId: REGION }]);
    expect(cost.money).toBeGreaterThan(0);
  });
});
