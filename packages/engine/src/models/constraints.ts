import type { SubModel } from './types.js';
import { clamp } from '../math.js';

/**
 * (G) Warming and population pressure degrade water; warming degrades land. A shortfall in
 * agricultural productivity (below the 100 baseline) also erodes land — lower yields mean more
 * land is needed for the same output, so low-yield farming (e.g. organic) pressures availability.
 */
export const constraints: SubModel = {
  id: 'constraints',
  step({ state, params, scratch }) {
    const warming = Math.max(0, scratch.deltaTemperature);
    for (const r of state.regions) {
      const prevPop = scratch.prevPopulation[r.id] ?? r.population;
      const popGrowth = Math.max(0, r.population / prevPop - 1);
      const yieldShortfall = Math.max(0, 100 - r.agriculturalProductivity);
      const waterLoss = params.WATER_TEMP_LOSS * warming + params.POP_PRESSURE * popGrowth;
      const landLoss = params.LAND_DEGRADE * warming + params.AG_YIELD_LAND_COEFF * yieldShortfall;
      r.waterAvailability = clamp(r.waterAvailability - waterLoss, 0, 100);
      r.landAvailability = clamp(r.landAvailability - landLoss, 0, 100);
      scratch.waterLossByRegion[r.id] = waterLoss;
      scratch.landLossByRegion[r.id] = landLoss;
    }
  },
};
