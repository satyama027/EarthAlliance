import type { SubModel } from './types.js';
import { CO2_PREINDUSTRIAL } from '../data/scenario.js';

/** (B) CO2 -> radiative forcing -> equilibrium temp, approached with thermal lag. */
export const climate: SubModel = {
  id: 'climate',
  step({ state, params, scratch }) {
    const ratio = state.climate.co2Concentration / CO2_PREINDUSTRIAL;
    const tEq = params.ECS * Math.log2(ratio);
    const dT = (tEq - state.climate.temperatureAnomaly) * params.WARMING_ADJUST;
    state.climate.temperatureAnomaly += dT;
    scratch.deltaTemperature = dT;
  },
};
