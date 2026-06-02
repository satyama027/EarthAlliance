import type { SubModel } from './types.js';
import { clamp } from '../math.js';

/** (G) Warming erodes ecosystem health. Policy restoration is applied via effects. */
export const biodiversity: SubModel = {
  id: 'biodiversity',
  step({ state, params, scratch }) {
    const warming = Math.max(0, scratch.deltaTemperature);
    for (const r of state.regions) {
      r.biodiversityIndex = clamp(r.biodiversityIndex - params.BIO_TEMP_LOSS * warming, 0, 100);
    }
  },
};
