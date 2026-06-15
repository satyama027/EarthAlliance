import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/state.js';
import { advanceTurn } from '../src/simulation.js';
import { getAvailablePolicies, validateSelection } from '../src/policies.js';
import { ENDINGS } from '../src/endings.js';

/** Each turn, greedily enact every available emissions-cutting policy, in every
 *  region, that we can still afford. */
const DECARB = ['nuclear-buildout', 'renewable-subsidy', 'reforestation', 'public-transit', 'carbon-tax', 'degrowth-mandate'];

/** The full sectoral decarbonization toolkit (no degrowth — it tanks the GDP win gate). */
const FULL_DECARB = [
  'renewable-subsidy', 'grid-storage', 'nuclear-buildout', 'carbon-tax', 'ev-transition', 'fuel-efficiency',
  'industrial-electrification', 'green-steel-cement', 'carbon-capture', 'circular-economy', 'sustainable-fuels',
  'flight-freight-levy', 'public-transit', 'reforestation', 'anti-deforestation', 'precision-agriculture',
  'universal-education', 'climate-adaptation',
];

function playStrategy(policyIds: string[]) {
  let state = createInitialState();
  let turns = 0;
  while (state.status === 'playing' && turns < 35) {
    const selections: { policyId: string; regionId: string }[] = [];
    for (const region of state.regions) {
      const available = new Set(getAvailablePolicies(state, region.id).map((p) => p.id));
      for (const policyId of policyIds) {
        if (!available.has(policyId)) continue;
        const candidate = [...selections, { policyId, regionId: region.id }];
        if (validateSelection(state, candidate).ok) selections.push({ policyId, regionId: region.id });
      }
    }
    state = advanceTurn(state, selections).state;
    turns++;
  }
  return state;
}

function playReversal() {
  let state = createInitialState();
  let sawNetNegative = false;
  let turns = 0;
  while (state.status === 'playing' && turns < 35) {
    const selections: { policyId: string; regionId: string }[] = [];
    for (const region of state.regions) {
      const available = new Set(getAvailablePolicies(state, region.id).map((p) => p.id));
      for (const policyId of DECARB) {
        if (!available.has(policyId)) continue;
        const candidate = [...selections, { policyId, regionId: region.id }];
        if (validateSelection(state, candidate).ok) selections.push({ policyId, regionId: region.id });
      }
    }
    state = advanceTurn(state, selections).state;
    if (state.climate.annualEmissions < 0) sawNetNegative = true;
    turns++;
  }
  return { state, sawNetNegative, turns };
}

function playDoNothing(maxTurns: number) {
  let state = createInitialState();
  let turns = 0;
  while (state.status === 'playing' && turns < maxTurns) {
    state = advanceTurn(state, []).state;
    turns++;
  }
  return state;
}

describe('reversal scenario', () => {
  it('aggressive decarbonization reaches net-negative emissions', () => {
    const { sawNetNegative } = playReversal();
    expect(sawNetNegative).toBe(true);
  });

  it('decarbonization yields lower warming than doing nothing at the same horizon', () => {
    const reversal = playReversal();
    const doNothing = playDoNothing(reversal.turns);
    expect(reversal.state.climate.temperatureAnomaly)
      .toBeLessThan(doNothing.climate.temperatureAnomaly);
  });
});

describe('winnability (balance guard)', () => {
  it('a comprehensive, well-funded decarbonization survives to 2200 and wins', () => {
    // Balance regression: maximal sectoral decarbonization must remain winnable. If a future
    // change makes this collapse (or merely muddle through), the balance has regressed.
    const state = playStrategy(FULL_DECARB);
    expect(state.year).toBe(2200);
    expect(state.status).toBe('ended');
    expect(ENDINGS[state.endingId!]!.kind).toBe('win');
    expect(state.climate.temperatureAnomaly).toBeLessThan(2.0);
  });
});

describe('doom scenario', () => {
  it('do-nothing collapses into a loss ending before 2200', () => {
    let state = createInitialState();
    let guard = 0;
    while (state.status === 'playing' && guard < 35) {
      state = advanceTurn(state, []).state;
      guard++;
    }
    expect(state.status).toBe('ended');
    expect(state.endingId).not.toBeNull();
    expect(ENDINGS[state.endingId!]!.kind).toBe('loss');
    expect(state.year).toBeLessThanOrEqual(2200);
  });
});
