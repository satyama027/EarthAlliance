import type { WorldState } from './types.js';
import { DEFAULT_SCENARIO, type Scenario } from './data/scenario.js';

export function createInitialState(scenario: Scenario = DEFAULT_SCENARIO): WorldState {
  const regions = scenario.regions.map((r) => ({ ...r }));
  const annualEmissions = regions.reduce((sum, r) => sum + r.regionalEmissions, 0);
  return {
    turn: 0,
    year: scenario.startYear,
    status: 'playing',
    endingId: null,
    resources: { ...scenario.startResources },
    climate: {
      temperatureAnomaly: scenario.startTemperatureAnomaly,
      co2Concentration: scenario.startCo2,
      annualEmissions,
    },
    regions,
    activeEffects: [],
    enactedPolicyIds: [],
    log: [],
    rngSeed: scenario.rngSeed,
  };
}
