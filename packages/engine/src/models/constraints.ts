import type { SubModel } from './types.js';
import { clamp } from '../math.js';

/** (G) Warming and population pressure degrade water; warming degrades land. */
export const constraints: SubModel = {
  id: 'constraints',
  step({ state, params, scratch }) {
    const warming = Math.max(0, scratch.deltaTemperature);
    for (const r of state.regions) {
      const prevPop = scratch.prevPopulation[r.id] ?? r.population;
      const popGrowth = Math.max(0, r.population / prevPop - 1);
      const waterLoss = params.WATER_TEMP_LOSS * warming + params.POP_PRESSURE * popGrowth;
      const landLoss = params.LAND_DEGRADE * warming;
      r.waterAvailability = clamp(r.waterAvailability - waterLoss, 0, 100);
      r.landAvailability = clamp(r.landAvailability - landLoss, 0, 100);
      scratch.waterLossByRegion[r.id] = waterLoss;
      scratch.landLossByRegion[r.id] = landLoss;
    }
  },
};
