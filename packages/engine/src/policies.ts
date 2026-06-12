import type { Policy, PolicySelection, WorldState } from './types.js';

// Renewable buildout starts higher in developed regions (real ids from data/regions.ts).
const RENEWABLE_BASELINE: Record<string, number> = {
  europe: 0.25, 'north-america': 0.20, oceania: 0.20, 'east-asia': 0.15,
  'russia-central-asia': 0.12, 'latin-america': 0.10, 'southeast-asia': 0.08,
  'south-asia': 0.07, mena: 0.05, 'sub-saharan-africa': 0.05,
};

// `money` is a GLOBAL reference cost (1 unit = $1B over a 5-year turn); the amount
// charged for a given region is scaled by that region's share of world GDP.
export const POLICY_CATALOG: readonly Policy[] = [
  {
    id: 'carbon-tax', name: 'Carbon Tax', category: 'industry',
    description: 'Price carbon to cut emissions; unpopular up front.',
    art: 'carbon-tax', cost: { politicalCapital: 15, money: 50 }, funding: 'one-time',
    effects: [
      { target: 'regionalEmissions', delta: -0.4, duration: 'ongoing' },
      { target: 'publicSupport', delta: -3, duration: 'immediate' },
    ],
  },
  {
    id: 'renewable-subsidy', name: 'Renewable Subsidy', category: 'energy',
    description: 'Fund wind and solar deployment until the grid is built out.',
    art: 'renewable-subsidy', cost: { politicalCapital: 10, money: 1200 }, funding: 'buildout',
    buildout: { ratePerTurn: 0.10, baselineByRegion: RENEWABLE_BASELINE, defaultBaseline: 0 },
    effects: [{ target: 'regionalEmissions', delta: -0.6, duration: 'ongoing' }],
  },
  {
    id: 'nuclear-buildout', name: 'Nuclear Buildout', category: 'energy',
    description: 'Large baseload decarbonization; reactors come online over years.',
    art: 'nuclear-buildout', cost: { politicalCapital: 20, money: 800 }, funding: 'buildout',
    buildout: { ratePerTurn: 0.08, defaultBaseline: 0 },
    effects: [{ target: 'regionalEmissions', delta: -1.0, duration: 'ongoing' }],
  },
  {
    id: 'reforestation', name: 'Reforestation', category: 'land',
    description: 'Restore forests as a carbon sink and habitat.',
    art: 'reforestation', cost: { politicalCapital: 8, money: 250 }, funding: 'buildout',
    buildout: { ratePerTurn: 0.10, defaultBaseline: 0 },
    effects: [
      { target: 'regionalEmissions', delta: -0.3, duration: 'ongoing' },
      { target: 'biodiversityIndex', delta: 2, duration: 'ongoing' },
    ],
  },
  {
    id: 'public-transit', name: 'Public Transit', category: 'industry',
    description: 'Shift travel off private cars; systems built over years.',
    art: 'public-transit', cost: { politicalCapital: 10, money: 500 }, funding: 'buildout',
    buildout: { ratePerTurn: 0.10, defaultBaseline: 0 },
    effects: [
      { target: 'regionalEmissions', delta: -0.3, duration: 'ongoing' },
      { target: 'publicSupport', delta: 2, duration: 'immediate' },
    ],
  },
  {
    id: 'climate-adaptation', name: 'Climate Adaptation Fund', category: 'social',
    description: 'Buffer communities against climate shocks; funded continuously.',
    art: 'climate-adaptation', cost: { politicalCapital: 8, money: 500 }, funding: 'recurring',
    effects: [
      { target: 'healthIndex', delta: 2, duration: 'ongoing' },
      { target: 'waterAvailability', delta: 1, duration: 'ongoing' },
    ],
  },
  {
    id: 'universal-education', name: 'Universal Education', category: 'social',
    description: 'Compounding investment in people; raised until attainment completes.',
    art: 'universal-education', cost: { politicalCapital: 12, money: 500 }, funding: 'buildout',
    buildout: { ratePerTurn: 0.08, defaultBaseline: 0 },
    effects: [
      { target: 'educationIndex', delta: 1.5, duration: 'ongoing' },
      { target: 'equityIndex', delta: 1, duration: 'ongoing' },
    ],
  },
  {
    id: 'degrowth-mandate', name: 'Degrowth Mandate', category: 'social',
    description: 'Slash emissions by curbing output; politically costly.',
    art: 'degrowth-mandate', cost: { politicalCapital: 30, money: 0 }, funding: 'one-time',
    effects: [
      { target: 'regionalEmissions', delta: -1.5, duration: 'ongoing' },
      { target: 'gdpPerCapita', delta: -2000, duration: 'immediate' },
      { target: 'publicSupport', delta: -8, duration: 'immediate' },
    ],
  },
  {
    id: 'orbital-infrastructure', name: 'Orbital Infrastructure', category: 'frontier',
    description: 'Build the launch and orbital base for off-world expansion.',
    art: 'orbital-infrastructure', cost: { politicalCapital: 25, money: 350 }, funding: 'one-time',
    effects: [{ target: 'educationIndex', delta: 1, duration: 'ongoing' }],
  },
  {
    id: 'off-world-colonies', name: 'Off-World Colonies', category: 'frontier',
    description: 'Settle beyond Earth — a refuge for those who can leave.',
    art: 'off-world-colonies', cost: { politicalCapital: 30, money: 2000 }, funding: 'one-time',
    prerequisites: ['orbital-infrastructure'],
    effects: [{ target: 'gdpPerCapita', delta: 3000, duration: 'ongoing' }],
  },
];

const BY_ID = new Map(POLICY_CATALOG.map((p) => [p.id, p]));

/** True iff `policyId` is enacted in the given region. */
export function isEnacted(state: WorldState, policyId: string, regionId: string): boolean {
  return state.enactments.some((e) => e.policyId === policyId && e.regionId === regionId);
}

/** True iff `policyId` is enacted in any region. */
export function enactedInAnyRegion(state: WorldState, policyId: string): boolean {
  return state.enactments.some((e) => e.policyId === policyId);
}

/** Policies enactable in `regionId`: not yet enacted there, prereqs enacted there. */
export function getAvailablePolicies(state: WorldState, regionId: string): Policy[] {
  return POLICY_CATALOG.filter(
    (p) =>
      !isEnacted(state, p.id, regionId) &&
      (p.prerequisites ?? []).every((req) => isEnacted(state, req, regionId)),
  );
}

/** Policies enactable in at least one region (used by the global "apply everywhere" UI). */
export function getGloballyAvailablePolicies(state: WorldState): Policy[] {
  return POLICY_CATALOG.filter((p) =>
    state.regions.some(
      (r) =>
        !isEnacted(state, p.id, r.id) &&
        (p.prerequisites ?? []).every((req) => isEnacted(state, req, r.id)),
    ),
  );
}

export interface ValidationResult {
  ok: boolean;
  reason?: string;
}

const worldGdp = (state: WorldState): number =>
  state.regions.reduce((sum, r) => sum + r.gdpPerCapita * r.population, 0);

/**
 * Money charged for a policy in a region for ONE turn, scaled by the region's GDP share.
 * For `one-time` policies this is the single enactment charge; for `recurring`/`buildout` it is the
 * per-turn upkeep — which is also charged on the enactment turn (by the `programs` submodel), so it
 * is the policy's "setup" cost as well.
 */
export function regionCharge(state: WorldState, policy: Policy, regionId: string): number {
  const region = state.regions.find((r) => r.id === regionId);
  const total = worldGdp(state);
  if (!region || total <= 0) return 0;
  return policy.cost.money * ((region.gdpPerCapita * region.population) / total);
}

export function validateSelection(state: WorldState, selections: PolicySelection[]): ValidationResult {
  const seen = new Set<string>();
  let totalPc = 0;
  let moneyNow = 0;
  for (const { policyId, regionId } of selections) {
    const key = `${policyId}:${regionId}`;
    if (seen.has(key)) return { ok: false, reason: `Duplicate selection: ${policyId} in ${regionId}` };
    seen.add(key);

    const policy = BY_ID.get(policyId);
    if (!policy) return { ok: false, reason: `Unknown policy: ${policyId}` };
    if (!state.regions.some((r) => r.id === regionId)) {
      return { ok: false, reason: `Unknown region: ${regionId}` };
    }
    if (isEnacted(state, policyId, regionId)) {
      return { ok: false, reason: `${policy.name} already enacted in ${regionId}` };
    }
    for (const req of policy.prerequisites ?? []) {
      if (!isEnacted(state, req, regionId)) {
        return { ok: false, reason: `${policy.name} requires ${req} in ${regionId}` };
      }
    }
    totalPc += policy.cost.politicalCapital;
    // Every funding mode spends money on the enactment turn (one-time at enactment; recurring/buildout
    // as their first upkeep, charged this turn by `programs`), so all count toward this turn's budget.
    moneyNow += regionCharge(state, policy, regionId);
  }
  if (totalPc > state.resources.politicalCapital) {
    return { ok: false, reason: 'Not enough political capital' };
  }
  if (moneyNow > state.resources.money) {
    return { ok: false, reason: 'Not enough money' };
  }
  return { ok: true };
}

export function getPolicy(id: string): Policy | undefined {
  return BY_ID.get(id);
}
