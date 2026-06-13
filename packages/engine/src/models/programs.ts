import type { SubModel } from './types.js';
import type { Region } from '../types.js';
import { getPolicy } from '../policies.js';
import { applyToRegion } from '../effects.js';

const regionGdp = (r: Region): number => r.gdpPerCapita * r.population;

/**
 * (J) Charge recurring/buildout policy costs and advance buildout capacity.
 *
 * Runs last in the pipeline so this turn's regenerated tax income is available to
 * fund upkeep. For each active `recurring` or `buildout` enactment:
 *  - the per-turn charge is the policy's global `money` cost scaled by the region's
 *    share of world GDP;
 *  - `buildout` enactments advance capacity by `ratePerTurn` (until 100%, then the
 *    charge stops) and apply their ongoing effects scaled by current capacity;
 *  - an enactment that cannot be funded this turn idles: no charge, no advance, but
 *    capacity already installed keeps delivering its benefit.
 */
export const programs: SubModel = {
  id: 'programs',
  step({ state, params, scratch }) {
    const regionsById = new Map(state.regions.map((r) => [r.id, r]));
    const worldGdp = state.regions.reduce((sum, r) => sum + regionGdp(r), 0);
    const spendByRegion: Record<string, number> = {};
    const capacityByKey: Record<string, number> = {};

    for (const enactment of state.enactments) {
      const policy = getPolicy(enactment.policyId);
      const region = regionsById.get(enactment.regionId);
      if (!policy || !region) continue;
      if (policy.funding === 'one-time') continue; // charged once at enactment

      const share = worldGdp > 0 ? regionGdp(region) / worldGdp : 0;
      const charge = policy.cost.money * share;

      if (policy.funding === 'buildout') {
        if (!enactment.complete && !enactment.cancelled && state.resources.money >= charge) {
          state.resources.money -= charge;
          spendByRegion[region.id] = (spendByRegion[region.id] ?? 0) + charge;
          enactment.capacity = Math.min(1, enactment.capacity + policy.buildout!.ratePerTurn);
          if (enactment.capacity >= 1) enactment.complete = true;
        }
        // Installed capacity delivers its benefit every turn, ramped, even once complete.
        // `storageGated` effects (intermittent renewables) are additionally scaled by the
        // region's grid-storage efficiency: only the floor share lands until storage is built.
        for (const effect of policy.effects) {
          if (effect.duration !== 'ongoing') continue;
          let magnitude = effect.delta * enactment.capacity;
          if (effect.storageGated) {
            const storage = Math.min(1, Math.max(0, region.energyStorageCapacity));
            magnitude *= params.STORAGE_FLOOR + (1 - params.STORAGE_FLOOR) * storage;
          }
          applyToRegion(region, effect.target, magnitude);
        }
      } else {
        // recurring: flat charge every turn while active (never completes).
        if (state.resources.money >= charge) {
          state.resources.money -= charge;
          spendByRegion[region.id] = (spendByRegion[region.id] ?? 0) + charge;
        }
      }
      capacityByKey[`${enactment.policyId}:${enactment.regionId}`] = enactment.capacity;
    }

    scratch.programSpendByRegion = spendByRegion;
    scratch.capacityByRegionPolicy = capacityByKey;
  },
};
