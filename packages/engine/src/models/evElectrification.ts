import type { SubModel } from './types.js';

const EV_POLICY_ID = 'ev-transition';

/**
 * (EV) Gradual road-transport electrification for the `ev-transition` ("EV Subsidies") policy.
 *
 * Runs after `emissions` (transport re-derived from GDP) and `programs` (capacity advanced this
 * turn). For each EV enactment in a region, the fraction `capacity` of the fleet is electric, so:
 *  - tailpipe transport = baseline × (1 − capacity)  → falls to ~0 as the buildout completes;
 *  - electricity demand gains `baseline × capacity × EV_DEMAND_FACTOR`, the oil energy converted to
 *    power (EV_DEMAND_FACTOR < 1: efficiency gain net of battery-charging losses).
 *
 * The "baseline" is the counterfactual transport at enactment, grown each turn by the region's
 * economic-output ratio so it tracks what road transport WOULD have been without EVs. Demand is
 * added as the delta against the cumulative amount already added (`evDemandAdded`), so it grows
 * gradually turn over turn with no compounding (the bug in the old one-shot `electricityDemand +0.5`).
 */
export const evElectrification: SubModel = {
  id: 'evElectrification',
  step({ state, params, scratch }) {
    const regionsById = new Map(state.regions.map((r) => [r.id, r]));

    for (const e of state.enactments) {
      if (e.policyId !== EV_POLICY_ID) continue;
      const region = regionsById.get(e.regionId);
      if (!region) continue;

      const outputRatio = scratch.outputRatioByRegion[e.regionId] ?? 1;
      // Snapshot the baseline on the first EV step; afterwards grow it with economic output.
      e.evBaselineTransport =
        e.evBaselineTransport === undefined ? region.transport : e.evBaselineTransport * outputRatio;

      const capacity = Math.min(1, Math.max(0, e.capacity));
      region.transport = e.evBaselineTransport * (1 - capacity);

      const target = capacity * e.evBaselineTransport * params.EV_DEMAND_FACTOR;
      region.electricityDemand += target - (e.evDemandAdded ?? 0);
      e.evDemandAdded = target;
    }
  },
};
