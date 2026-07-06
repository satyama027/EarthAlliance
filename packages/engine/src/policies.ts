import type { Policy, PolicySelection, WorldState } from './types.js';

// Max share of a region's grid that Nuclear Buildout may convert from fossil to nuclear, derived
// from domestic uranium reserves: cap = roundTo(0.05, clamp(yearsOfFullGridSupply / 60, 0.05, 0.85)),
// where yearsOfFullGridSupply = reserves(t) × 40 GWh ÷ regional annual generation. Reserves from the
// IAEA/NEA Red Book (Australia 1.67 Mt, Kazakhstan 0.81, Canada 0.58, Namibia 0.50, Russia 0.48,
// Niger 0.34, S.Africa 0.32, China 0.27, India 0.19); 40 GWh/t is once-through LWR energy content;
// ÷60 is a reactor fleet's lifetime; 0.85 ceiling (grids need dispatchable flex), 0.05 floor.
// Uranium-rich/low-demand regions go nuclear-heavy; uranium-poor giants lean on uncapped renewables.
// (Tunable balance surface.)
export const NUCLEAR_CAP: Record<string, number> = {
  oceania: 0.85, 'sub-saharan-africa': 0.85, 'russia-central-asia': 0.70,
  'latin-america': 0.15, 'north-america': 0.10, 'south-asia': 0.05,
  europe: 0.05, mena: 0.05, 'east-asia': 0.05, 'southeast-asia': 0.05,
};

// Share of each Renewable Subsidy conversion that goes to solar (remainder → wind), from solar-GHI
// rankings (MENA/Sahel/Atacama/Australia sun-rich; Europe/Russia wind-leaning). Missing region ⇒ 0.5.
export const SOLAR_WEIGHT: Record<string, number> = {
  mena: 0.85, 'sub-saharan-africa': 0.75, 'south-asia': 0.70, oceania: 0.65, 'southeast-asia': 0.60,
  'latin-america': 0.55, 'north-america': 0.55, 'east-asia': 0.55, 'russia-central-asia': 0.45, europe: 0.35,
};

// `money` is a GLOBAL reference cost (1 unit = $1B over a 5-year turn); the amount
// charged for a given region is scaled by that region's share of world GDP.
export const POLICY_CATALOG: readonly Policy[] = [
  {
    id: 'carbon-tax', name: 'Carbon Tax', category: 'industry',
    description: 'Tax fossil-fuel emissions for treasury revenue that shrinks as you decarbonise — at a standing political cost.',
    art: 'carbon-tax', cost: { money: 0 }, funding: 'recurring',
    // Revenue (= CARBON_TAX_RATE × fossil-combustion emissions) AND the flat public-support offset are
    // applied by the `carbonTax` submodel — money is a global resource, not an EffectTarget, and the
    // support cost must be a conditional FLAT level (held while active, restored on repeal), not an
    // accumulating per-turn flow. Both fall away as the region decarbonizes. The only declared effect
    // is a modest industry price-response cut (real unit, Gt/yr). Recurring funding (cost 0 → no upkeep
    // charge) makes the tax repealable.
    effects: [
      { target: 'industry', delta: -0.05, duration: 'ongoing' },
    ],
  },
  {
    id: 'renewable-subsidy', name: 'Renewable Subsidy', category: 'energy',
    description: 'Replace fossil generation with wind and solar — a fixed slice of the grid each turn, dirtiest fuel first. Land is plentiful, so it can run the grid to ~100% clean; intermittent, so grid storage gates how fast it lands.',
    art: 'renewable-subsidy', cost: { money: 120 }, funding: 'buildout',
    // Fossil-replacement: convert 6% of the grid per turn (storage-gated) from the dirtiest fossil
    // into wind+solar (split by SOLAR_WEIGHT). Uncapped — only fossil availability bounds it. Flat cost.
    conversion: { cleanSource: 'renewable', ratePerTurn: 0.06, storageGated: true },
    effects: [],
  },
  {
    id: 'nuclear-buildout', name: 'Nuclear Buildout', category: 'energy',
    description: 'Replace fossil generation with firm nuclear baseload — a fixed slice of the grid each turn. Capped by the region’s domestic uranium reserves: uranium-rich regions can go nuclear-heavy, uranium-poor ones barely at all.',
    art: 'nuclear-buildout', cost: { money: 110 }, funding: 'buildout',
    // Fossil-replacement: convert 4% of the grid per turn from the dirtiest fossil into nuclear,
    // up to the region's uranium cap. Firm baseload → NOT storage-gated. Flat cost.
    conversion: { cleanSource: 'nuclear', ratePerTurn: 0.04, capByRegion: NUCLEAR_CAP },
    effects: [],
  },
  {
    id: 'reforestation', name: 'Reforestation', category: 'land',
    description: 'Restore forests as a carbon sink and habitat.',
    art: 'reforestation', cost: { money: 250 }, funding: 'buildout',
    buildout: { ratePerTurn: 0.10, defaultBaseline: 0 },
    effects: [
      // Forests are a carbon sink: a negative land-use source pulls the regional total down.
      { target: 'landUse', delta: -0.3, duration: 'ongoing' },
      { target: 'biodiversityIndex', delta: 2, duration: 'ongoing' },
    ],
  },
  {
    id: 'public-transit', name: 'Public Transit', category: 'industry',
    description: 'Shift travel off private cars; systems built over years.',
    art: 'public-transit', cost: { money: 500 }, funding: 'buildout',
    buildout: { ratePerTurn: 0.10, defaultBaseline: 0 },
    effects: [
      { target: 'transport', delta: -0.3, duration: 'ongoing' },
      { target: 'publicSupport', delta: 2, duration: 'immediate' },
    ],
  },
  // ── New sectoral policies (CP4). Level-shift couplings (electricityDemand, agricultural
  // productivity) use `immediate` effects = a one-time shift that holds, avoiding per-turn drift;
  // emission cuts use `ongoing` flows. Costs/deltas are provisional pending the balance pass. ──
  {
    id: 'grid-storage', name: 'Grid Storage & Modernization', category: 'energy',
    description: 'Batteries and grid upgrades so intermittent renewables run at full output.',
    art: 'grid-storage', cost: { money: 600 }, funding: 'buildout',
    buildout: { ratePerTurn: 0.12, defaultBaseline: 0 },
    effects: [{ target: 'energyStorageCapacity', delta: 0.15, duration: 'ongoing' }],
  },
  {
    id: 'ev-transition', name: 'EV Subsidies', category: 'industry',
    description: 'Subsidize electric vehicles: the fleet electrifies gradually over decades (~10 turns), shifting road-transport oil demand into a growing electricity load until tailpipe emissions approach zero.',
    art: 'ev-transition', cost: { money: 900 }, funding: 'buildout',
    buildout: { ratePerTurn: 0.10, defaultBaseline: 0 },
    // Transport cut + electricity-demand growth are driven gradually by buildout capacity in the
    // evElectrification submodel (not one-shot effects), so there are no declared effects here.
    effects: [],
  },
  {
    id: 'fuel-efficiency', name: 'Fuel Efficiency Standards', category: 'industry',
    description: 'Tighten mileage rules; a cheap, modest cut to road transport emissions.',
    art: 'fuel-efficiency', cost: { money: 100 }, funding: 'one-time',
    effects: [{ target: 'transport', delta: -0.15, duration: 'ongoing' }],
  },
  {
    id: 'sustainable-fuels', name: 'Sustainable Aviation & Marine Fuels', category: 'industry',
    description: 'Scale low-carbon jet and ship fuels — expensive, for hard-to-abate transport.',
    art: 'sustainable-fuels', cost: { money: 700 }, funding: 'buildout',
    buildout: { ratePerTurn: 0.08, defaultBaseline: 0 },
    effects: [{ target: 'aviationShipping', delta: -0.15, duration: 'ongoing' }],
  },
  {
    id: 'flight-freight-levy', name: 'Flight & Freight Levy', category: 'industry',
    description: 'Tax aviation and shipping to curb demand; unpopular, funded continuously.',
    art: 'flight-freight-levy', cost: { money: 150 }, funding: 'recurring',
    effects: [
      { target: 'aviationShipping', delta: -0.1, duration: 'ongoing' },
      { target: 'publicSupport', delta: -2, duration: 'immediate' },
    ],
  },
  {
    id: 'industrial-electrification', name: 'Industrial Electrification', category: 'industry',
    description: 'Swap furnaces and process heat to electricity: cuts industry, adds demand.',
    art: 'industrial-electrification', cost: { money: 1000 }, funding: 'buildout',
    buildout: { ratePerTurn: 0.08, defaultBaseline: 0 },
    effects: [
      { target: 'industry', delta: -0.3, duration: 'ongoing' },
      { target: 'electricityDemand', delta: 0.4, duration: 'immediate' },
    ],
  },
  {
    id: 'green-steel-cement', name: 'Green Steel & Cement', category: 'industry',
    description: 'Hydrogen steel and low-clinker cement attack process emissions; very costly.',
    art: 'green-steel-cement', cost: { money: 1400 }, funding: 'buildout',
    buildout: { ratePerTurn: 0.06, defaultBaseline: 0 },
    effects: [{ target: 'industry', delta: -0.4, duration: 'ongoing' }],
  },
  {
    id: 'carbon-capture', name: 'Carbon Capture (CCS)', category: 'industry',
    description: 'Capture flue-gas CO₂ from heavy industry — slow and very expensive.',
    art: 'carbon-capture', cost: { money: 1600 }, funding: 'buildout',
    buildout: { ratePerTurn: 0.05, defaultBaseline: 0 },
    effects: [{ target: 'industry', delta: -0.3, duration: 'ongoing' }],
  },
  {
    id: 'circular-economy', name: 'Circular Economy', category: 'industry',
    description: 'Reuse and recycle materials to shrink industrial throughput emissions.',
    art: 'circular-economy', cost: { money: 500 }, funding: 'buildout',
    buildout: { ratePerTurn: 0.10, defaultBaseline: 0 },
    effects: [
      { target: 'industry', delta: -0.2, duration: 'ongoing' },
      { target: 'equityIndex', delta: 1, duration: 'immediate' },
    ],
  },
  {
    id: 'organic-farming', name: 'Organic & Regenerative Farming', category: 'land',
    description: 'Cut farm emissions, but lower yields mean more land is needed per tonne.',
    art: 'organic-farming', cost: { money: 400 }, funding: 'buildout',
    buildout: { ratePerTurn: 0.10, defaultBaseline: 0 },
    effects: [
      { target: 'agriculture', delta: -0.15, duration: 'ongoing' },
      { target: 'agriculturalProductivity', delta: -12, duration: 'immediate' }, // yield penalty
    ],
  },
  {
    id: 'precision-agriculture', name: 'Precision Agriculture', category: 'land',
    description: 'Sensors and targeted inputs cut fertilizer emissions while raising yields.',
    art: 'precision-agriculture', cost: { money: 600 }, funding: 'buildout',
    buildout: { ratePerTurn: 0.10, defaultBaseline: 0 },
    effects: [
      { target: 'agriculture', delta: -0.1, duration: 'ongoing' },
      { target: 'agriculturalProductivity', delta: 8, duration: 'immediate' }, // yield gain
    ],
  },
  {
    id: 'plant-rich-diet', name: 'Plant-Rich Diet Shift', category: 'social',
    description: 'Shift diets off livestock: cuts agricultural methane, meets cultural resistance.',
    art: 'plant-rich-diet', cost: { money: 200 }, funding: 'recurring',
    effects: [
      { target: 'agriculture', delta: -0.2, duration: 'ongoing' },
      { target: 'publicSupport', delta: -3, duration: 'immediate' },
      { target: 'healthIndex', delta: 1, duration: 'immediate' },
    ],
  },
  {
    id: 'anti-deforestation', name: 'Anti-Deforestation Enforcement', category: 'land',
    description: 'Protect standing forests: stops land-use emissions and restores habitat.',
    art: 'anti-deforestation', cost: { money: 300 }, funding: 'recurring',
    effects: [
      { target: 'landUse', delta: -0.2, duration: 'ongoing' },
      { target: 'biodiversityIndex', delta: 1, duration: 'ongoing' },
      { target: 'gdpPerCapita', delta: -500, duration: 'immediate' },
    ],
  },
  {
    id: 'climate-adaptation', name: 'Climate Adaptation Fund', category: 'social',
    description: 'Buffer communities against climate shocks; funded continuously.',
    art: 'climate-adaptation', cost: { money: 500 }, funding: 'recurring',
    effects: [
      { target: 'healthIndex', delta: 2, duration: 'ongoing' },
      { target: 'waterAvailability', delta: 1, duration: 'ongoing' },
    ],
  },
  {
    id: 'universal-education', name: 'Universal Education', category: 'social',
    description: 'Compounding investment in people; raised until attainment completes.',
    art: 'universal-education', cost: { money: 500 }, funding: 'buildout',
    buildout: { ratePerTurn: 0.08, defaultBaseline: 0 },
    effects: [
      { target: 'educationIndex', delta: 1.5, duration: 'ongoing' },
      { target: 'equityIndex', delta: 1, duration: 'ongoing' },
    ],
  },
  {
    id: 'degrowth-mandate', name: 'Degrowth Mandate', category: 'social',
    description: 'Slash emissions by curbing output; politically costly.',
    art: 'degrowth-mandate', cost: { money: 1500 }, funding: 'one-time',
    effects: [
      // Curbing output cuts every activity-driven source (and the GDP cut keeps cutting them
      // via the output driver next turn). Split of the old −1.5 across sources.
      { target: 'transport', delta: -0.5, duration: 'ongoing' },
      { target: 'industry', delta: -0.6, duration: 'ongoing' },
      { target: 'aviationShipping', delta: -0.1, duration: 'ongoing' },
      { target: 'agriculture', delta: -0.3, duration: 'ongoing' },
      { target: 'gdpPerCapita', delta: -2000, duration: 'immediate' },
      { target: 'publicSupport', delta: -8, duration: 'immediate' },
    ],
  },
  {
    id: 'orbital-infrastructure', name: 'Orbital Infrastructure', category: 'frontier',
    description: 'Build the launch and orbital base for off-world expansion.',
    art: 'orbital-infrastructure', cost: { money: 350 }, funding: 'one-time',
    effects: [{ target: 'educationIndex', delta: 1, duration: 'ongoing' }],
  },
  {
    id: 'off-world-colonies', name: 'Off-World Colonies', category: 'frontier',
    description: 'Settle beyond Earth — a refuge for those who can leave.',
    art: 'off-world-colonies', cost: { money: 2000 }, funding: 'one-time',
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
  // Fossil-replacement policies are flat-priced: the same money in every region (not GDP-scaled).
  if (policy.conversion) return policy.cost.money;
  const region = state.regions.find((r) => r.id === regionId);
  const total = worldGdp(state);
  if (!region || total <= 0) return 0;
  return policy.cost.money * ((region.gdpPerCapita * region.population) / total);
}

export function validateSelection(state: WorldState, selections: PolicySelection[]): ValidationResult {
  const seen = new Set<string>();
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
    // Every funding mode spends money on the enactment turn (one-time at enactment; recurring/buildout
    // as their first upkeep, charged this turn by `programs`), so all count toward this turn's budget.
    moneyNow += regionCharge(state, policy, regionId);
  }
  if (moneyNow > state.resources.money) {
    return { ok: false, reason: 'Not enough money' };
  }
  return { ok: true };
}

export function getPolicy(id: string): Policy | undefined {
  return BY_ID.get(id);
}
