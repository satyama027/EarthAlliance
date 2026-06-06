import type { SubModel } from './types.js';
import { clamp } from '../math.js';

/** (F) Population, fertility, ageing, education drift. */
export const demography: SubModel = {
  id: 'demography',
  step({ state, params, scratch }) {
    const y = params.TURN_YEARS;
    for (const r of state.regions) {
      scratch.prevPopulation[r.id] = r.population;
      const popGrowth = clamp(
        (r.fertilityRate - 2.1) * params.FERT_W + (r.healthIndex - 50) * params.HEALTH_W,
        -0.02, 0.04,
      );
      scratch.popGrowthByRegion[r.id] = popGrowth;
      r.population *= Math.pow(1 + popGrowth, y);
      r.fertilityRate = Math.max(1.5, r.fertilityRate - params.DEMO_TRANSITION * (r.educationIndex / 100) * y);
      r.medianAge += params.AGEING_RATE * y * (r.fertilityRate < 2.1 ? 1 : 0.3);
      r.educationIndex = clamp(r.educationIndex + params.EDU_GROWTH * y * (r.gdpPerCapita > 10000 ? 1 : 0.3), 0, 100);
    }
  },
};
