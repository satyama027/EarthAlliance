import type { Region } from './types.js';
import type { ModelParams } from './models/types.js';
import { clamp } from './math.js';

/**
 * Treasury income model. Two per-region money flows, both pure functions of region state so they can
 * be reused by the sub-models, the turn diagnostics, and the web budget display (single source of
 * truth).
 */

/**
 * The fossil-combustion emissions a carbon tax prices (Gt CO₂/yr): fossil electricity recomputed as
 * `electricityDemand × gridCarbonIntensity` (the `electricity` field is only derived at turn
 * finalization, so it is stale mid-pipeline) plus the fossil-combustion activity sectors. Agriculture
 * and land-use are excluded — they are biological, not fossil.
 */
export function fossilTaxBase(r: Region): number {
  const fossilPower = Math.max(0, r.electricityDemand) * clamp(r.gridCarbonIntensity, 0, 1);
  return fossilPower + Math.max(0, r.transport) + Math.max(0, r.industry) + Math.max(0, r.aviationShipping);
}

/** Carbon-tax revenue for a region in one turn: rate × fossil tax base (never negative). */
export function carbonTaxRevenue(r: Region, params: ModelParams): number {
  return Math.max(0, params.CARBON_TAX_RATE * fossilTaxBase(r));
}

/** A region's GDP tax income for one turn — its term of the global `moneyGain` sum in `resources`. */
export function regionTaxIncome(r: Region, params: ModelParams): number {
  return (params.TAX_RATE * r.gdpPerCapita * r.population) / params.MONEY_SCALE;
}
