import type { SubModel } from './types.js';
import { clamp } from '../math.js';

/** (H) Public support reacts to warming, prosperity, and equity; equity erodes with growth. */
export const support: SubModel = {
  id: 'support',
  step({ state, params, scratch }) {
    const warming = Math.max(0, scratch.deltaTemperature);
    for (const r of state.regions) {
      const prevGdp = scratch.prevGdpPerCapita[r.id] ?? r.gdpPerCapita;
      const econGrowth = prevGdp > 0 ? r.gdpPerCapita / prevGdp - 1 : 0;
      r.publicSupport = clamp(
        r.publicSupport
          - params.SUPPORT_TEMP_W * warming
          + params.SUPPORT_ECON_W * econGrowth
          + params.SUPPORT_EQUITY_W * (r.equityIndex - 50),
        0, 100,
      );
      r.equityIndex = clamp(r.equityIndex - params.INEQUALITY_DRIFT * Math.max(0, econGrowth), 0, 100);
    }
  },
};
