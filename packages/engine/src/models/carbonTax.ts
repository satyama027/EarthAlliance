import type { SubModel } from './types.js';
import { clamp } from '../math.js';
import { carbonTaxRevenue, fossilTaxBase } from '../income.js';

const CARBON_TAX_ID = 'carbon-tax';
const EPS = 1e-9;

/**
 * (CT) Carbon-tax revenue + political cost. For each active `carbon-tax` enactment: add
 * `CARBON_TAX_RATE × fossilTaxBase(region)` to the treasury, and hold a FLAT public-support offset of
 * `−CARBON_TAX_SUPPORT_HIT` on the region. Both are applied imperatively here — money is not an
 * `EffectTarget`, and the support cost must be a conditional flat level, not an accumulating per-turn
 * flow (an `ongoing` −5 effect would re-subtract 5 every turn and spiral support to the loss floor).
 *
 * The offset is re-based against what's already applied (`carbonSupportApplied`, the
 * `evElectrification` idiom): apply only `desired − applied`, so it drops 5 the turn it activates,
 * holds flat while active, and springs back the turn it deactivates. Because `support` only ADDS its
 * per-turn terms to the stock, the with-tax trajectory stays exactly the offset below the without-tax
 * one.
 *
 * A tax is "active" only while its region still has a fossil base to price (base > 0). Once a region
 * is fully decarbonized the tax has nothing to tax: revenue is 0, the offset is restored, and the
 * enactment is **auto-repealed** (dropped with its ongoing industry-nudge effect).
 *
 * Runs last in the pipeline, after `generationMix`, so it taxes this turn's post-decarbonization grid
 * intensity and sectors — revenue shrinks automatically as the fossil base falls.
 */
export const carbonTax: SubModel = {
  id: 'carbonTax',
  step({ state, params, scratch }) {
    const regionsById = new Map(state.regions.map((r) => [r.id, r]));
    const byRegion: Record<string, number> = {};
    let total = 0;
    const repealed = new Set<string>();
    for (const e of state.enactments) {
      if (e.policyId !== CARBON_TAX_ID || e.cancelled) continue;
      const region = regionsById.get(e.regionId);
      if (!region) continue;

      const active = fossilTaxBase(region) > EPS;

      const revenue = active ? carbonTaxRevenue(region, params) : 0;
      state.resources.money += revenue;
      byRegion[e.regionId] = (byRegion[e.regionId] ?? 0) + revenue;
      total += revenue;

      // Flat support offset, re-based against what's already applied (no accumulation; self-restoring).
      const desired = active ? -params.CARBON_TAX_SUPPORT_HIT : 0;
      const applied = e.carbonSupportApplied ?? 0;
      if (desired !== applied) {
        region.publicSupport = clamp(region.publicSupport + (desired - applied), 0, 100);
        e.carbonSupportApplied = desired;
      }

      if (!active) repealed.add(`${e.policyId}:${e.regionId}`); // fossil base gone → auto-repeal
    }

    // Auto-repeal fully-decarbonized regions: drop the enactment and its ongoing effect (the support
    // offset has already been restored above).
    if (repealed.size > 0) {
      state.enactments = state.enactments.filter((e) => !repealed.has(`${e.policyId}:${e.regionId}`));
      state.activeEffects = state.activeEffects.filter((x) => !repealed.has(`${x.policyId}:${x.regionId}`));
    }

    scratch.carbonTaxRevenue = total;
    scratch.carbonTaxRevenueByRegion = byRegion;
  },
};
