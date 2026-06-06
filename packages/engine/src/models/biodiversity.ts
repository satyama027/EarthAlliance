import type { SubModel } from './types.js';
import { clamp } from '../math.js';

/** (G) Warming erodes ecosystem health. Policy restoration is applied via effects. */
export const biodiversity: SubModel = {
  id: 'biodiversity',
  step({ state, params, scratch }) {
    const warming = Math.max(0, scratch.deltaTemperature);
    for (const r of state.regions) {
      const bioLoss = params.BIO_TEMP_LOSS * warming;
      r.biodiversityIndex = clamp(r.biodiversityIndex - bioLoss, 0, 100);
      scratch.bioLossByRegion[r.id] = bioLoss;
    }
  },
};
