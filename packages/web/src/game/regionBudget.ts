import {
  DEFAULT_PARAMS, regionTaxIncome,
  type Region, type TurnDiagnostics, type ModelParams,
} from '@earth-alliance/engine';

/** A region's per-turn treasury cash flow, for the Income display. All figures are money/turn. */
export interface RegionBudget {
  taxIncome: number; // GDP tax income
  carbonTax: number; // Carbon Tax revenue (0 when not active in this region)
  upkeep: number;    // policy upkeep/buildout money spent here
  net: number;       // taxIncome + carbonTax − upkeep
}

/**
 * Compose a region's income breakdown. Prefer the last turn's actuals from `TurnDiagnostics`; on the
 * opening turn (no diagnostics yet) fall back to a projection of GDP tax income (carbon tax and
 * upkeep are 0 — nothing is enacted yet). Single source of truth for the engine math is reused via
 * `regionTaxIncome`.
 */
export function regionBudget(
  region: Region,
  diagnostics: TurnDiagnostics | null,
  params: ModelParams = DEFAULT_PARAMS,
): RegionBudget {
  const taxIncome = diagnostics
    ? diagnostics.taxIncomeByRegion[region.id] ?? 0
    : regionTaxIncome(region, params);
  const carbonTax = diagnostics ? diagnostics.carbonTaxRevenueByRegion[region.id] ?? 0 : 0;
  const upkeep = diagnostics ? diagnostics.programSpendByRegion[region.id] ?? 0 : 0;
  return { taxIncome, carbonTax, upkeep, net: taxIncome + carbonTax - upkeep };
}
