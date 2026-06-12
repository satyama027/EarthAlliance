import { describe, it, expect } from 'vitest';
import {
  POLICY_CATALOG, getAvailablePolicies, getGloballyAvailablePolicies,
  validateSelection, getPolicy, isEnacted, enactedInAnyRegion,
} from '../src/policies.js';
import type { Enactment } from '../src/types.js';
import { makeState } from './fixtures.js';

const REGION = 'north-america';

function enacted(policyId: string, regionId: string): Enactment {
  return { policyId, regionId, capacity: 1, complete: true };
}

describe('policy catalog', () => {
  it('has unique ids and non-negative costs', () => {
    const ids = new Set(POLICY_CATALOG.map((p) => p.id));
    expect(ids.size).toBe(POLICY_CATALOG.length);
    for (const p of POLICY_CATALOG) {
      expect(p.cost.money).toBeGreaterThanOrEqual(0);
    }
  });

  it('gives every buildout policy a positive ratePerTurn', () => {
    for (const p of POLICY_CATALOG) {
      if (p.funding === 'buildout') {
        expect(p.buildout?.ratePerTurn).toBeGreaterThan(0);
      }
    }
  });
});

describe('getAvailablePolicies', () => {
  it('hides a policy whose prerequisite is not enacted in that region', () => {
    const state = makeState();
    const ids = getAvailablePolicies(state, REGION).map((p) => p.id);
    expect(ids).toContain('orbital-infrastructure');
    expect(ids).not.toContain('off-world-colonies');
  });

  it('reveals a policy once its prerequisite is enacted in the same region', () => {
    const state = makeState({ enactments: [enacted('orbital-infrastructure', REGION)] });
    const ids = getAvailablePolicies(state, REGION).map((p) => p.id);
    expect(ids).toContain('off-world-colonies');
  });

  it('does not reveal a policy when its prerequisite is enacted in a different region', () => {
    const state = makeState({ enactments: [enacted('orbital-infrastructure', 'europe')] });
    const ids = getAvailablePolicies(state, REGION).map((p) => p.id);
    expect(ids).not.toContain('off-world-colonies');
  });

  it('hides a policy already enacted in that region', () => {
    const state = makeState({ enactments: [enacted('renewable-subsidy', REGION)] });
    const ids = getAvailablePolicies(state, REGION).map((p) => p.id);
    expect(ids).not.toContain('renewable-subsidy');
  });
});

describe('validateSelection', () => {
  it('rejects unknown policy ids', () => {
    const state = makeState();
    expect(validateSelection(state, [{ policyId: 'nope', regionId: REGION }]).ok).toBe(false);
  });

  it('rejects unknown region ids', () => {
    const state = makeState();
    expect(validateSelection(state, [{ policyId: 'reforestation', regionId: 'atlantis' }]).ok).toBe(false);
  });

  it('rejects degrowth-mandate when money is insufficient (it is no longer free)', () => {
    // degrowth-mandate was PC-only and is now money-gated; staging it without money fails.
    const state = makeState({ resources: { money: 1 } });
    const result = validateSelection(state, [{ policyId: 'degrowth-mandate', regionId: REGION }]);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/money/i);
  });

  it('rejects when one-time money exceeds the budget', () => {
    const state = makeState({ resources: { money: 1 } });
    // off-world-colonies is one-time (ref 2000); but needs orbital first — enact it.
    const withOrbital = makeState({
      resources: { money: 1 },
      enactments: [enacted('orbital-infrastructure', REGION)],
    });
    void state;
    const result = validateSelection(withOrbital, [{ policyId: 'off-world-colonies', regionId: REGION }]);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/money/i);
  });

  it('accepts an affordable, available selection', () => {
    const state = makeState({ resources: { money: 5000 } });
    expect(validateSelection(state, [{ policyId: 'reforestation', regionId: REGION }]).ok).toBe(true);
  });

  it('rejects enacting the same policy twice in the same region', () => {
    const state = makeState({ enactments: [enacted('reforestation', REGION)] });
    expect(validateSelection(state, [{ policyId: 'reforestation', regionId: REGION }]).ok).toBe(false);
  });

  it('allows the same policy in two different regions', () => {
    const state = makeState({ resources: { money: 5000 } });
    const result = validateSelection(state, [
      { policyId: 'renewable-subsidy', regionId: 'north-america' },
      { policyId: 'renewable-subsidy', regionId: 'europe' },
    ]);
    expect(result.ok).toBe(true);
  });

  it('rejects a duplicate (policy, region) pair in one selection', () => {
    const state = makeState({ resources: { money: 5000 } });
    const result = validateSelection(state, [
      { policyId: 'reforestation', regionId: REGION },
      { policyId: 'reforestation', regionId: REGION },
    ]);
    expect(result.ok).toBe(false);
  });

  it('rejects a policy whose prerequisite is missing in that region', () => {
    const state = makeState({ resources: { money: 5000 } });
    expect(validateSelection(state, [{ policyId: 'off-world-colonies', regionId: REGION }]).ok).toBe(false);
  });

  it('counts a buildout policy\'s first-turn (setup) money against the budget', () => {
    // renewable-subsidy is charged its GDP-scaled upkeep on the enactment turn (by `programs`),
    // so its first-turn cost must be afforded up front like any other spend.
    const state = makeState({ resources: { money: 1 } });
    const result = validateSelection(state, [{ policyId: 'renewable-subsidy', regionId: REGION }]);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/money/i);
  });

  it('counts a recurring policy\'s first-turn (setup) money against the budget', () => {
    const state = makeState({ resources: { money: 1 } });
    expect(validateSelection(state, [{ policyId: 'climate-adaptation', regionId: REGION }]).ok).toBe(false);
  });

  it('accepts a buildout policy when its first-turn money is affordable', () => {
    const state = makeState({ resources: { money: 5000 } });
    expect(validateSelection(state, [{ policyId: 'renewable-subsidy', regionId: REGION }]).ok).toBe(true);
  });
});

describe('enactment helpers', () => {
  it('isEnacted is region-specific', () => {
    const state = makeState({ enactments: [enacted('renewable-subsidy', 'europe')] });
    expect(isEnacted(state, 'renewable-subsidy', 'europe')).toBe(true);
    expect(isEnacted(state, 'renewable-subsidy', REGION)).toBe(false);
  });

  it('enactedInAnyRegion is region-agnostic', () => {
    const state = makeState({ enactments: [enacted('off-world-colonies', 'europe')] });
    expect(enactedInAnyRegion(state, 'off-world-colonies')).toBe(true);
    expect(enactedInAnyRegion(state, 'renewable-subsidy')).toBe(false);
  });

  it('getGloballyAvailablePolicies returns policies enactable somewhere', () => {
    const state = makeState();
    const ids = getGloballyAvailablePolicies(state).map((p) => p.id);
    expect(ids).toContain('renewable-subsidy');
    expect(ids).not.toContain('off-world-colonies'); // prereq nowhere
  });
});

describe('getPolicy', () => {
  it('returns a policy by id', () => {
    expect(getPolicy('renewable-subsidy')?.name).toBe('Renewable Subsidy');
  });
});
