import type { SubModel } from './types.js';
import { regionTaxIncome } from '../income.js';

/** (I) Regenerate money (from taxed GDP). */
export const resources: SubModel = {
  id: 'resources',
  step({ state, params, scratch }) {
    let supportPop = 0;
    let totalPop = 0;
    let taxable = 0;
    const taxIncomeByRegion: Record<string, number> = {};
    for (const r of state.regions) {
      supportPop += r.publicSupport * r.population;
      totalPop += r.population;
      taxable += r.gdpPerCapita * r.population;
      taxIncomeByRegion[r.id] = regionTaxIncome(r, params);
    }
    const avgSupport = totalPop > 0 ? supportPop / totalPop : 0;
    const moneyGain = (params.TAX_RATE * taxable) / params.MONEY_SCALE;
    state.resources.money += moneyGain;
    scratch.avgSupport = avgSupport;
    scratch.worldPopulation = totalPop;
    scratch.worldGdp = taxable;
    scratch.moneyGain = moneyGain;
    scratch.taxIncomeByRegion = taxIncomeByRegion;
  },
};
