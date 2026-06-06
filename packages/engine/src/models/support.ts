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
      // The three signed contributions that sum to this turn's raw support change.
      const tempTerm = -params.SUPPORT_TEMP_W * warming;
      const econTerm = params.SUPPORT_ECON_W * econGrowth;
      const equityTerm = params.SUPPORT_EQUITY_W * (r.equityIndex - 50);
      const equityDrift = params.INEQUALITY_DRIFT * Math.max(0, econGrowth);
      r.publicSupport = clamp(r.publicSupport + tempTerm + econTerm + equityTerm, 0, 100);
      r.equityIndex = clamp(r.equityIndex - equityDrift, 0, 100);
      scratch.supportTempTermByRegion[r.id] = tempTerm;
      scratch.supportEconTermByRegion[r.id] = econTerm;
      scratch.supportEquityTermByRegion[r.id] = equityTerm;
      scratch.equityDriftByRegion[r.id] = equityDrift;
    }
  },
};
