import type { SubModel } from './types.js';

/**
 * Physical floor for atmospheric CO2. Drawdown cannot pull the atmosphere below
 * its preindustrial equilibrium, and keeping the concentration positive guards the
 * downstream log2() forcing calc from producing NaN under aggressive net-negative play.
 */
const CO2_FLOOR = 280;

/** (A) Emissions accumulate into atmospheric CO2; only the airborne fraction stays. */
export const carbonCycle: SubModel = {
  id: 'carbonCycle',
  step({ state, params }) {
    const gross = state.climate.annualEmissions * params.TURN_YEARS;
    const deltaPpm = (params.AIRBORNE_FRACTION * gross) / params.GTCO2_PER_PPM;
    state.climate.co2Concentration = Math.max(CO2_FLOOR, state.climate.co2Concentration + deltaPpm);
  },
};
