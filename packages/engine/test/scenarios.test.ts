import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/state.js';
import { advanceTurn } from '../src/simulation.js';
import { getAvailablePolicies, validateSelection } from '../src/policies.js';
import { ENDINGS } from '../src/endings.js';

/** Each turn, greedily enact every available emissions-cutting policy we can afford. */
const DECARB = ['nuclear-buildout', 'renewable-subsidy', 'reforestation', 'public-transit', 'carbon-tax', 'degrowth-mandate'];

function playReversal() {
  let state = createInitialState();
  let sawNetNegative = false;
  let turns = 0;
  while (state.status === 'playing' && turns < 35) {
    const available = new Set(getAvailablePolicies(state).map((p) => p.id));
    const pick = DECARB.filter((id) => available.has(id) && validateSelection(state, [id]).ok);
    state = advanceTurn(state, pick).state;
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
