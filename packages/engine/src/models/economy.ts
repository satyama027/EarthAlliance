import type { SubModel } from './types.js';

/** (D) GDP per capita grows, dampened by climate damage and resource scarcity. */
export const economy: SubModel = {
  id: 'economy',
  step({ state, params, scratch }) {
    const growth = Math.pow(1 + params.BASE_GROWTH, params.TURN_YEARS);
    scratch.baseGrowthFactor = growth;
    for (const r of state.regions) {
      scratch.prevGdpPerCapita[r.id] = r.gdpPerCapita;
      const scarcity = Math.min(r.waterAvailability, r.landAvailability) / 100;
      // water/land are 0–100 indices; the `0.5 +` floor means scarcity dampens growth to at most 50%.
      const constraintFactor = 0.5 + 0.5 * scarcity;
      // Dampen the growth *increment* (growth - 1), not the GDP stock: damage and
      // scarcity slow growth toward zero but never reverse it into decay.
      r.gdpPerCapita *= 1 + (growth - 1) * (1 - scratch.damageFraction) * constraintFactor;
      scratch.scarcityByRegion[r.id] = scarcity;
      scratch.constraintFactorByRegion[r.id] = constraintFactor;
    }
  },
};
