import { describe, it, expect } from 'vitest';
import { POLICY_CATALOG, getAvailablePolicies, validateSelection, getPolicy, isRegionScoped } from '../src/policies.js';
import { makeState } from './fixtures.js';

describe('policy catalog', () => {
  it('has unique ids and non-negative costs', () => {
    const ids = new Set(POLICY_CATALOG.map((p) => p.id));
    expect(ids.size).toBe(POLICY_CATALOG.length);
    for (const p of POLICY_CATALOG) {
      expect(p.cost.politicalCapital).toBeGreaterThanOrEqual(0);
      expect(p.cost.money).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('getAvailablePolicies', () => {
  it('hides policies whose prerequisites are not yet enacted', () => {
    const state = makeState();
    const ids = getAvailablePolicies(state).map((p) => p.id);
    expect(ids).toContain('orbital-infrastructure');
    expect(ids).not.toContain('off-world-colonies'); // needs orbital-infrastructure
  });

  it('reveals a policy once its prerequisite is enacted', () => {
    const state = makeState({ enactedPolicyIds: ['orbital-infrastructure'] });
    const ids = getAvailablePolicies(state).map((p) => p.id);
    expect(ids).toContain('off-world-colonies');
  });
});

describe('validateSelection', () => {
  it('rejects unknown policy ids', () => {
    const state = makeState();
    expect(validateSelection(state, ['nope']).ok).toBe(false);
  });

  it('rejects selections that exceed resources', () => {
    const state = makeState({ resources: { politicalCapital: 5, money: 5 } });
    const result = validateSelection(state, ['nuclear-buildout']);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/afford|capital|money/i);
  });

  it('accepts an affordable, available selection', () => {
    const state = makeState({ resources: { politicalCapital: 100, money: 100 } });
    expect(validateSelection(state, ['reforestation']).ok).toBe(true);
  });

  it('rejects a policy whose prerequisite is missing', () => {
    const state = makeState({ resources: { politicalCapital: 100, money: 100 } });
    expect(validateSelection(state, ['off-world-colonies']).ok).toBe(false);
  });

  it('rejects a selection containing duplicate ids', () => {
    const state = makeState({ resources: { politicalCapital: 100, money: 100 } });
    expect(validateSelection(state, ['reforestation', 'reforestation']).ok).toBe(false);
  });

  it('flags region-scoped policies as unsupported for now', () => {
    const globalPolicy = getPolicy('renewable-subsidy')!;
    expect(isRegionScoped(globalPolicy)).toBe(false);
    const regionScoped = { ...globalPolicy, scope: 'region' as const };
    expect(isRegionScoped(regionScoped)).toBe(true);
  });
});
