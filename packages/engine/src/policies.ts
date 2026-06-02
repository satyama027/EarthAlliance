import type { Policy, WorldState } from './types.js';

export const POLICY_CATALOG: readonly Policy[] = [
  {
    id: 'carbon-tax', name: 'Carbon Tax', category: 'industry',
    description: 'Price carbon to cut emissions; unpopular up front.',
    art: 'carbon-tax', cost: { politicalCapital: 15, money: 5 }, scope: 'global',
    effects: [
      { target: 'regionalEmissions', delta: -0.4, duration: 'ongoing' },
      { target: 'publicSupport', delta: -3, duration: 'immediate' },
    ],
  },
  {
    id: 'renewable-subsidy', name: 'Renewable Subsidy', category: 'energy',
    description: 'Fund wind and solar deployment.',
    art: 'renewable-subsidy', cost: { politicalCapital: 10, money: 20 }, scope: 'global',
    effects: [{ target: 'regionalEmissions', delta: -0.6, duration: 'ongoing' }],
  },
  {
    id: 'nuclear-buildout', name: 'Nuclear Buildout', category: 'energy',
    description: 'Large baseload decarbonization at high cost.',
    art: 'nuclear-buildout', cost: { politicalCapital: 20, money: 40 }, scope: 'global',
    effects: [{ target: 'regionalEmissions', delta: -1.0, duration: 'ongoing' }],
  },
  {
    id: 'reforestation', name: 'Reforestation', category: 'land',
    description: 'Restore forests as a carbon sink and habitat.',
    art: 'reforestation', cost: { politicalCapital: 8, money: 15 }, scope: 'global',
    effects: [
      { target: 'regionalEmissions', delta: -0.3, duration: 'ongoing' },
      { target: 'biodiversityIndex', delta: 2, duration: 'ongoing' },
    ],
  },
  {
    id: 'public-transit', name: 'Public Transit', category: 'industry',
    description: 'Shift travel off private cars.',
    art: 'public-transit', cost: { politicalCapital: 10, money: 15 }, scope: 'global',
    effects: [
      { target: 'regionalEmissions', delta: -0.3, duration: 'ongoing' },
      { target: 'publicSupport', delta: 2, duration: 'immediate' },
    ],
  },
  {
    id: 'climate-adaptation', name: 'Climate Adaptation Fund', category: 'social',
    description: 'Buffer communities against climate shocks.',
    art: 'climate-adaptation', cost: { politicalCapital: 8, money: 25 }, scope: 'global',
    effects: [
      { target: 'healthIndex', delta: 2, duration: 'ongoing' },
      { target: 'waterAvailability', delta: 1, duration: 'ongoing' },
    ],
  },
  {
    id: 'universal-education', name: 'Universal Education', category: 'social',
    description: 'Compounding investment in people.',
    art: 'universal-education', cost: { politicalCapital: 12, money: 20 }, scope: 'global',
    effects: [
      { target: 'educationIndex', delta: 1.5, duration: 'ongoing' },
      { target: 'equityIndex', delta: 1, duration: 'ongoing' },
    ],
  },
  {
    id: 'degrowth-mandate', name: 'Degrowth Mandate', category: 'social',
    description: 'Slash emissions by curbing output; politically costly.',
    art: 'degrowth-mandate', cost: { politicalCapital: 30, money: 0 }, scope: 'global',
    effects: [
      { target: 'regionalEmissions', delta: -1.5, duration: 'ongoing' },
      { target: 'gdpPerCapita', delta: -2000, duration: 'immediate' },
      { target: 'publicSupport', delta: -8, duration: 'immediate' },
    ],
  },
  {
    id: 'orbital-infrastructure', name: 'Orbital Infrastructure', category: 'frontier',
    description: 'Build the launch and orbital base for off-world expansion.',
    art: 'orbital-infrastructure', cost: { politicalCapital: 25, money: 60 }, scope: 'global',
    effects: [{ target: 'educationIndex', delta: 1, duration: 'ongoing' }],
  },
  {
    id: 'off-world-colonies', name: 'Off-World Colonies', category: 'frontier',
    description: 'Settle beyond Earth — a refuge for those who can leave.',
    art: 'off-world-colonies', cost: { politicalCapital: 30, money: 80 }, scope: 'global',
    prerequisites: ['orbital-infrastructure'],
    effects: [{ target: 'gdpPerCapita', delta: 3000, duration: 'ongoing' }],
  },
];

const BY_ID = new Map(POLICY_CATALOG.map((p) => [p.id, p]));

export function getAvailablePolicies(state: WorldState): Policy[] {
  return POLICY_CATALOG.filter(
    (p) =>
      !state.enactedPolicyIds.includes(p.id) &&
      (p.prerequisites ?? []).every((req) => state.enactedPolicyIds.includes(req)),
  );
}

export interface ValidationResult {
  ok: boolean;
  reason?: string;
}

export function validateSelection(state: WorldState, policyIds: string[]): ValidationResult {
  if (new Set(policyIds).size !== policyIds.length) {
    return { ok: false, reason: 'Duplicate policy in selection' };
  }
  let totalPc = 0;
  let totalMoney = 0;
  for (const id of policyIds) {
    const policy = BY_ID.get(id);
    if (!policy) return { ok: false, reason: `Unknown policy: ${id}` };
    if (state.enactedPolicyIds.includes(id)) return { ok: false, reason: `Already enacted: ${id}` };
    for (const req of policy.prerequisites ?? []) {
      if (!state.enactedPolicyIds.includes(req)) {
        return { ok: false, reason: `${policy.name} requires ${req}` };
      }
    }
    totalPc += policy.cost.politicalCapital;
    totalMoney += policy.cost.money;
  }
  if (totalPc > state.resources.politicalCapital) {
    return { ok: false, reason: 'Not enough political capital' };
  }
  if (totalMoney > state.resources.money) {
    return { ok: false, reason: 'Not enough money' };
  }
  return { ok: true };
}

export function getPolicy(id: string): Policy | undefined {
  return BY_ID.get(id);
}
