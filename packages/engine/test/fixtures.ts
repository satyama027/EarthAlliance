import type { Region, WorldState } from '../src/types.js';
import type { SimContext, TurnScratch } from '../src/models/types.js';
import { createScratch } from '../src/models/types.js';
import { DEFAULT_PARAMS } from '../src/data/scenario.js';
import { createInitialState } from '../src/state.js';
import { createRng } from '../src/rng.js';

export function makeRegion(overrides: Partial<Region> = {}): Region {
  return {
    id: 'test-region', name: 'Test Region',
    population: 1e9, educationIndex: 50, healthIndex: 50, medianAge: 30,
    fertilityRate: 2.0, gdpPerCapita: 20000, publicSupport: 50, equityIndex: 50,
    biodiversityIndex: 50, regionalEmissions: 10, waterAvailability: 50,
    landAvailability: 50, lat: 0, lon: 0,
    ...overrides,
  };
}

export function makeState(overrides: Partial<WorldState> = {}): WorldState {
  return { ...createInitialState(), ...overrides };
}

/** Build a SimContext around a given state, with an empty scratch. */
export function makeContext(state: WorldState, scratch?: Partial<TurnScratch>): SimContext {
  return {
    state,
    params: DEFAULT_PARAMS,
    rng: createRng(state.rngSeed),
    scratch: { ...createScratch(), ...scratch },
  };
}
