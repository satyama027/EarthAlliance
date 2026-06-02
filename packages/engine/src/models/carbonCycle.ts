import type { SubModel } from './types.js';

/** (A) Emissions accumulate into atmospheric CO2; only the airborne fraction stays. */
export const carbonCycle: SubModel = {
  id: 'carbonCycle',
  step({ state, params }) {
    const gross = state.climate.annualEmissions * params.TURN_YEARS;
    const deltaPpm = (params.AIRBORNE_FRACTION * gross) / params.GTCO2_PER_PPM;
    state.climate.co2Concentration += deltaPpm;
  },
};
