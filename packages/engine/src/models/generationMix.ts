import type { SubModel } from './types.js';
import { gridIntensityFromMix, rebalanceMix } from '../generation.js';

/**
 * (K) Generation mix → grid carbon intensity. Runs after `programs` (which grows renewable/nuclear
 * shares for buildout policies) so it sees this turn's share changes. For each region it conserves
 * Σ shares = 1 — drawing any added clean share out of the dirtiest fossils first (coal → gas → oil)
 * — and then DERIVES `gridCarbonIntensity = Σ(share × emission factor)`. Nothing else writes grid
 * intensity; it is a pure function of the mix.
 */
export const generationMix: SubModel = {
  id: 'generationMix',
  step({ state }) {
    for (const r of state.regions) {
      rebalanceMix(r.generationMix);
      r.gridCarbonIntensity = gridIntensityFromMix(r.generationMix);
    }
  },
};
