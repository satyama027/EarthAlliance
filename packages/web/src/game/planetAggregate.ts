import {
  gridIntensityFromMix, generationTWh,
  type Region, type GenerationMix, type TurnDiagnostics,
} from '@earth-alliance/engine';
import { EMISSION_SOURCES, type SourceValues } from '../components/EmissionsBySource.js';
import { regionBudget, type RegionBudget } from './regionBudget.js';

const GENERATION_KEYS = [
  'coal', 'gas', 'oil', 'nuclear', 'hydro', 'wind', 'solar', 'geothermal',
] as const;

/** Planet-level rollup of the 10 regions — the derived values the enriched Dashboard renders. */
export interface PlanetAggregate {
  population: number;                 // sum
  gdpPerCapita: number;              // GDP-weighted: Σ(gdp·pop) / Σpop
  regionalEmissions: number;         // sum
  sources: SourceValues;             // per-source sum (the six emission fields)
  generationMix: GenerationMix;      // demand-weighted shares (sum to 1)
  gridCarbonIntensity: number;       // derived from the aggregated mix
  electricityDemand: number;         // sum (power demand)
  generationTWh: number;             // sum (real power generation, TWh/yr)
  energyStorageCapacity: number;     // demand-weighted average
  agriculturalProductivity: number;  // simple average (crop yield)
  budget: RegionBudget;              // summed income ledger
  publicSupport: number;             // simple average
  equityIndex: number;               // simple average
  biodiversityIndex: number;         // simple average
  waterAvailability: number;         // simple average
  landAvailability: number;          // simple average
}

/**
 * Roll the per-region state up to one planet reading for the "Full planet data" panel. Totals sum
 * (population, emissions, power demand, income); the generation mix, grid intensity and storage are
 * **generation-weighted** by `electricityDemand` (so a big grid counts more); crop yield and the five
 * 0–100 quality metrics are **simple-averaged** (each region counted equally). Grid intensity is
 * derived from the aggregated mix via the engine's `gridIntensityFromMix`, matching its per-region
 * "derived" semantics. No engine state is mutated — this is a pure view rollup.
 */
export function planetAggregate(regions: Region[], diagnostics: TurnDiagnostics | null): PlanetAggregate {
  const n = regions.length || 1;
  const totalDemand = regions.reduce((s, r) => s + r.electricityDemand, 0);
  const demandDivisor = totalDemand || 1; // guard: an all-zero-demand world must not divide by zero

  const population = regions.reduce((s, r) => s + r.population, 0);
  const totalGdp = regions.reduce((s, r) => s + r.gdpPerCapita * r.population, 0);

  const sources = Object.fromEntries(EMISSION_SOURCES.map((k) => [k, 0])) as SourceValues;
  for (const r of regions) for (const k of EMISSION_SOURCES) sources[k] += r[k];

  const generationMix = Object.fromEntries(GENERATION_KEYS.map((k) => [k, 0])) as GenerationMix;
  for (const r of regions) {
    for (const k of GENERATION_KEYS) generationMix[k] += (r.generationMix[k] * r.electricityDemand) / demandDivisor;
  }

  const budget = regions
    .map((r) => regionBudget(r, diagnostics))
    .reduce<RegionBudget>(
      (acc, b) => ({
        taxIncome: acc.taxIncome + b.taxIncome,
        carbonTax: acc.carbonTax + b.carbonTax,
        upkeep: acc.upkeep + b.upkeep,
        net: acc.net + b.net,
      }),
      { taxIncome: 0, carbonTax: 0, upkeep: 0, net: 0 },
    );

  const avg = (pick: (r: Region) => number) => regions.reduce((s, r) => s + pick(r), 0) / n;

  return {
    population,
    gdpPerCapita: population > 0 ? totalGdp / population : 0,
    regionalEmissions: regions.reduce((s, r) => s + r.regionalEmissions, 0),
    sources,
    generationMix,
    gridCarbonIntensity: gridIntensityFromMix(generationMix),
    electricityDemand: totalDemand,
    generationTWh: regions.reduce((s, r) => s + generationTWh(r), 0),
    energyStorageCapacity: regions.reduce((s, r) => s + r.energyStorageCapacity * r.electricityDemand, 0) / demandDivisor,
    agriculturalProductivity: avg((r) => r.agriculturalProductivity),
    budget,
    publicSupport: avg((r) => r.publicSupport),
    equityIndex: avg((r) => r.equityIndex),
    biodiversityIndex: avg((r) => r.biodiversityIndex),
    waterAvailability: avg((r) => r.waterAvailability),
    landAvailability: avg((r) => r.landAvailability),
  };
}
