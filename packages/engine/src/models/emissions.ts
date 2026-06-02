import type { SubModel } from './types.js';

/** (E) Re-derive each region's emissions from economic output and autonomous decarbonization. */
export const emissions: SubModel = {
  id: 'emissions',
  step({ state, params, scratch }) {
    const decarb = Math.pow(1 - params.AUTON_DECARB, params.TURN_YEARS);
    for (const r of state.regions) {
      const prevGdp = scratch.prevGdpPerCapita[r.id] ?? r.gdpPerCapita;
      const prevPop = scratch.prevPopulation[r.id] ?? r.population;
      const prevOutput = prevGdp * prevPop;
      const outputRatio = prevOutput > 0 ? (r.gdpPerCapita * r.population) / prevOutput : 1;
      r.regionalEmissions = r.regionalEmissions * outputRatio * decarb;
    }
  },
};
