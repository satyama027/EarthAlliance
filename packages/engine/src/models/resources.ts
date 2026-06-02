import type { SubModel } from './types.js';

/** (I) Regenerate political capital (from support) and money (from taxed GDP). */
export const resources: SubModel = {
  id: 'resources',
  step({ state, params }) {
    let supportPop = 0;
    let totalPop = 0;
    let taxable = 0;
    for (const r of state.regions) {
      supportPop += r.publicSupport * r.population;
      totalPop += r.population;
      taxable += r.gdpPerCapita * r.population;
    }
    const avgSupport = totalPop > 0 ? supportPop / totalPop : 0;
    state.resources.politicalCapital += params.CAPITAL_BASE + params.CAPITAL_PER_SUPPORT * avgSupport;
    state.resources.money += (params.TAX_RATE * taxable) / params.MONEY_SCALE;
  },
};
