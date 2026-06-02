import type { SubModel } from './types.js';

/** (C) Temperature -> quadratic economic damage fraction (DICE-style). */
export const damage: SubModel = {
  id: 'damage',
  step({ state, params, scratch }) {
    const t = state.climate.temperatureAnomaly;
    scratch.damageFraction = Math.min(params.DAMAGE_COEFF * t * t, 1);
  },
};
