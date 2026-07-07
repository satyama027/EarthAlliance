import {
  GENERATION_SOURCES,
  type GenerationMix, type Region, type TurnDiagnostics,
} from '@earth-alliance/engine';
import type { TurnRecord } from './useGame.js';
import type { SourceValues } from '../components/EmissionsBySource.js';
import { EMISSION_SOURCES } from '../components/EmissionsBySource.js';
import { planetAggregate } from './planetAggregate.js';
import { regionBudget, type RegionBudget } from './regionBudget.js';

/** Which reading a drill-down is showing: the whole planet, or one region. */
export type Entity = { kind: 'planet' } | { kind: 'region'; id: string };

/** A single point on a metric's time-series (value on Y, year on X). */
export interface TrendPoint {
  year: number;
  value: number;
}

/** Per-fuel electricity emissions (Gt CO₂/yr) — the only real fuel-level split. */
export interface ElectricityByFuel {
  coal: number;
  gas: number;
  oil: number;
}

/**
 * A uniform snapshot of everything the metric tree can read, produced identically from a `Region`
 * or from the `planetAggregate` rollup — so the tree never has to branch on entity type. Every
 * `MetricNode.read` pulls its scalar off this shape.
 */
export interface Reading {
  regionalEmissions: number;
  sources: SourceValues;               // the six emission sources
  electricityByFuel: ElectricityByFuel; // electricity split by emitting fuel
  budget: RegionBudget;                // income ledger (tax / carbon-tax / upkeep / net)
  publicSupport: number;
  biodiversityIndex: number;
  waterAvailability: number;
  landAvailability: number;
}

/**
 * Per-fuel electricity emissions = demand × share × emissionFactor (coal 1.0 / gas 0.45 / oil 0.70;
 * the five clean sources emit 0 and are omitted). The three sum to `demand × gridIntensity`, i.e. the
 * `electricity` source total — so the fuel breakdown is a faithful decomposition, not an estimate.
 * Works unchanged for a region (its demand + mix) or the planet (summed demand + demand-weighted mix):
 * `Σdemand × weightedShare = Σ(demand_r × share_r)`, so the planet figures are the exact per-region sum.
 */
export function electricityFuelEmissions(demand: number, mix: GenerationMix): ElectricityByFuel {
  return {
    coal: demand * mix.coal * GENERATION_SOURCES.coal.emissionFactor,
    gas: demand * mix.gas * GENERATION_SOURCES.gas.emissionFactor,
    oil: demand * mix.oil * GENERATION_SOURCES.oil.emissionFactor,
  };
}

function pickSources(src: Record<string, number>): SourceValues {
  return Object.fromEntries(EMISSION_SOURCES.map((k) => [k, src[k] ?? 0])) as SourceValues;
}

function regionReading(r: Region, diagnostics: TurnDiagnostics | null): Reading {
  return {
    regionalEmissions: r.regionalEmissions,
    sources: pickSources(r as unknown as Record<string, number>),
    electricityByFuel: electricityFuelEmissions(r.electricityDemand, r.generationMix),
    budget: regionBudget(r, diagnostics),
    publicSupport: r.publicSupport,
    biodiversityIndex: r.biodiversityIndex,
    waterAvailability: r.waterAvailability,
    landAvailability: r.landAvailability,
  };
}

function planetReading(regions: Region[], diagnostics: TurnDiagnostics | null): Reading {
  const p = planetAggregate(regions, diagnostics);
  return {
    regionalEmissions: p.regionalEmissions,
    sources: p.sources,
    electricityByFuel: electricityFuelEmissions(p.electricityDemand, p.generationMix),
    budget: p.budget,
    publicSupport: p.publicSupport,
    biodiversityIndex: p.biodiversityIndex,
    waterAvailability: p.waterAvailability,
    landAvailability: p.landAvailability,
  };
}

const ZERO_READING: Reading = {
  regionalEmissions: 0,
  sources: pickSources({}),
  electricityByFuel: { coal: 0, gas: 0, oil: 0 },
  budget: { taxIncome: 0, carbonTax: 0, upkeep: 0, net: 0 },
  publicSupport: 0, biodiversityIndex: 0, waterAvailability: 0, landAvailability: 0,
};

/** Build the reading for `entity` from one turn record (uses that turn's own diagnostics). */
export function readingAt(entity: Entity, record: TurnRecord): Reading {
  if (entity.kind === 'planet') return planetReading(record.state.regions, record.diagnostics);
  const region = record.state.regions.find((r) => r.id === entity.id);
  return region ? regionReading(region, record.diagnostics) : ZERO_READING;
}

/** Map a scalar accessor over the whole turnLog to a { year, value } series (anchored at turn 0). */
export function seriesFrom(log: TurnRecord[], entity: Entity, read: (r: Reading) => number): TrendPoint[] {
  return log.map((rec) => ({ year: rec.year, value: read(readingAt(entity, rec)) }));
}

/** The reading for the most recent turn — the headline values. */
export function latestReading(log: TurnRecord[], entity: Entity): Reading {
  return readingAt(entity, log[log.length - 1]!);
}
