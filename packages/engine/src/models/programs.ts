import type { SubModel } from './types.js';
import type { Region } from '../types.js';
import { getPolicy, SOLAR_WEIGHT } from '../policies.js';
import { applyToRegion } from '../effects.js';
import { drawFromFossils } from '../generation.js';

const regionGdp = (r: Region): number => r.gdpPerCapita * r.population;
const EPS = 1e-9;

/**
 * (J) Charge recurring/buildout policy costs and advance buildout capacity.
 *
 * Runs last in the pipeline so this turn's regenerated tax income is available to fund upkeep.
 * Enactments are processed **region-by-region** (in canonical region order), and within a region in
 * stage order — so the fossil-replacement conversions (renewable/nuclear) draw from the same
 * shrinking fossil pool sequentially and deterministically (order is harmless for additive effects).
 *
 * For each active `recurring`/`buildout` enactment:
 *  - the per-turn charge is the policy's `money` cost scaled by the region's share of world GDP —
 *    EXCEPT `conversion` policies, which are flat-priced (same money in every region);
 *  - generic `buildout` enactments advance capacity by `ratePerTurn` (until 100%, then the charge
 *    stops) and apply their ongoing effects scaled by capacity;
 *  - `conversion` (fossil-replacement) enactments convert a fixed grid-share of the dirtiest fossil
 *    into their clean source each turn (renewable split wind/solar by SOLAR_WEIGHT, storage-gated;
 *    nuclear capped by the region's uranium reserves), completing at the cap or when fossils run out;
 *  - an enactment that cannot be funded this turn idles: no charge, no advance, but capacity already
 *    installed keeps delivering its benefit.
 */
export const programs: SubModel = {
  id: 'programs',
  step({ state, params, scratch }) {
    const worldGdp = state.regions.reduce((sum, r) => sum + regionGdp(r), 0);
    const spendByRegion: Record<string, number> = {};
    const capacityByKey: Record<string, number> = {};
    const spend = (region: Region, amount: number): void => {
      state.resources.money -= amount;
      spendByRegion[region.id] = (spendByRegion[region.id] ?? 0) + amount;
    };

    for (const region of state.regions) {
      for (const enactment of state.enactments) {
        if (enactment.regionId !== region.id) continue;
        const policy = getPolicy(enactment.policyId);
        if (!policy || policy.funding === 'one-time') continue; // one-time charged at enactment
        const key = `${enactment.policyId}:${enactment.regionId}`;

        // --- Fossil-replacement conversion (flat-priced) ---
        if (policy.conversion) {
          const spec = policy.conversion;
          const charge = policy.cost.money; // flat across regions
          if (!enactment.complete && !enactment.cancelled && state.resources.money >= charge) {
            const already = enactment.convertedShare ?? 0;
            const cap = spec.capByRegion?.[region.id] ?? Number.POSITIVE_INFINITY;
            let want = spec.ratePerTurn;
            if (spec.storageGated) {
              const storage = Math.min(1, Math.max(0, region.energyStorageCapacity));
              want *= params.STORAGE_FLOOR + (1 - params.STORAGE_FLOOR) * storage;
            }
            want = Math.min(want, Math.max(0, cap - already));
            const got = want > EPS ? drawFromFossils(region.generationMix, want) : 0;
            if (spec.cleanSource === 'nuclear') {
              applyToRegion(region, 'nuclearShare', got);
            } else {
              const solarW = SOLAR_WEIGHT[region.id] ?? 0.5;
              applyToRegion(region, 'solarShare', got * solarW);
              applyToRegion(region, 'windShare', got * (1 - solarW));
            }
            enactment.convertedShare = already + got;
            spend(region, charge);
            const capReached = cap - enactment.convertedShare <= EPS;
            const fossilExhausted = got < want - EPS; // wanted more than fossils could supply
            if (capReached || fossilExhausted) enactment.complete = true;
          }
          // Capacity proxy for the UI install bar: capped → progress toward the cap; uncapped
          // (renewables) → fraction of the convertible fossil already converted (1 once complete).
          const converted = enactment.convertedShare ?? 0;
          if (spec.capByRegion) {
            const cap = spec.capByRegion[region.id] ?? 1;
            enactment.capacity = cap > 0 ? Math.min(1, converted / cap) : 1;
          } else {
            const fossil = region.generationMix.coal + region.generationMix.gas + region.generationMix.oil;
            enactment.capacity = enactment.complete || converted + fossil <= 0 ? 1 : converted / (converted + fossil);
          }
          capacityByKey[key] = enactment.capacity;
          continue;
        }

        const charge = policy.cost.money * (worldGdp > 0 ? regionGdp(region) / worldGdp : 0);

        if (policy.funding === 'buildout') {
          if (!enactment.complete && !enactment.cancelled && state.resources.money >= charge) {
            spend(region, charge);
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
        } else if (state.resources.money >= charge) {
          // recurring: flat charge every turn while active (never completes).
          spend(region, charge);
        }
        capacityByKey[key] = enactment.capacity;
      }
    }

    scratch.programSpendByRegion = spendByRegion;
    scratch.capacityByRegionPolicy = capacityByKey;
  },
};
