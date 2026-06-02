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
      r.waterAvailability = clamp(
        r.waterAvailability - params.WATER_TEMP_LOSS * warming - params.POP_PRESSURE * popGrowth,
        0, 100,
      );
      r.landAvailability = clamp(r.landAvailability - params.LAND_DEGRADE * warming, 0, 100);
    }
  },
};
