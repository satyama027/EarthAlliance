import type { SubModel } from './types.js';

/**
 * (E) Re-derive each region's *activity-driven* emission sources from economic output and
 * population — with NO autonomous decarbonization (all decarbonization comes from policy).
 *
 *  - transport / industry / aviationShipping scale with economic-output growth
 *  - agriculture scales with population growth
 *  - electricityDemand grows with output; `electricity` emissions themselves are DERIVED
 *    (electricityDemand × gridCarbonIntensity) at turn finalization, after policies have
 *    adjusted demand and grid intensity
 *  - landUse has no natural driver — only policy moves it (and it may go net-negative = sink)
 *
 * Policy cuts are layered on top afterward (the `applyEffects`/`programs` seam), so they
 * persist across the per-turn re-derivation — exactly as before, now per source.
 */
export const emissions: SubModel = {
  id: 'emissions',
  step({ state, params, scratch }) {
    for (const r of state.regions) {
      const prevGdp = scratch.prevGdpPerCapita[r.id] ?? r.gdpPerCapita;
      const prevPop = scratch.prevPopulation[r.id] ?? r.population;
      const prevOutput = prevGdp * prevPop;
      const outputRatio = prevOutput > 0 ? (r.gdpPerCapita * r.population) / prevOutput : 1;
      const popRatio = prevPop > 0 ? r.population / prevPop : 1;

      r.transport *= outputRatio;
      r.industry *= outputRatio;
      r.aviationShipping *= outputRatio;
      r.agriculture *= popRatio;
      r.electricityDemand *= outputRatio;
      // r.landUse: untouched (policy-driven). r.electricity: derived at finalization.

      // Hard-to-abate floor for this turn: even at full policy, aviation/shipping can't fall
      // below this fraction of its activity-driven level. Enforced at finalization (after policy).
      scratch.aviationFloorByRegion[r.id] = r.aviationShipping * params.AVIATION_FLOOR;
      scratch.outputRatioByRegion[r.id] = outputRatio;
    }
  },
};
