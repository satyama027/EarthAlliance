import type { RegionId, WorldState } from '../types.js';
import type { Rng } from '../rng.js';

export interface ModelParams {
  TURN_YEARS: number;
  GTCO2_PER_PPM: number;
  AIRBORNE_FRACTION: number;
  ECS: number;
  WARMING_ADJUST: number;
  DAMAGE_COEFF: number;
  BASE_GROWTH: number;
  AUTON_DECARB: number;
  FERT_W: number;
  HEALTH_W: number;
  DEMO_TRANSITION: number;
  AGEING_RATE: number;
  EDU_GROWTH: number;
  WATER_TEMP_LOSS: number;
  LAND_DEGRADE: number;
  POP_PRESSURE: number;
  BIO_TEMP_LOSS: number;
  SUPPORT_TEMP_W: number;
  SUPPORT_ECON_W: number;
  SUPPORT_EQUITY_W: number;
  INEQUALITY_DRIFT: number;
  TAX_RATE: number;
  MONEY_SCALE: number;
}

/** Per-turn intermediate values passed between sub-models. */
export interface TurnScratch {
  deltaTemperature: number;
  damageFraction: number;
  prevGdpPerCapita: Record<RegionId, number>;
  prevPopulation: Record<RegionId, number>;
  // Calc intermediates the models compute and the state discards — surfaced via TurnDiagnostics.
  co2Ratio: number;        // CO2 / preindustrial (set by climate)
  equilibriumTemp: number; // °C the climate is heading toward (set by climate)
  deltaPpm: number;        // ppm added this turn (set by carbonCycle)
  grossEmissions: number;  // Gt emitted over the turn period (set by carbonCycle)
  baseGrowthFactor: number;// base GDP growth multiplier before damage/scarcity (set by economy)
  decarbFactor: number;    // autonomous decarbonization multiplier (set by emissions)
  avgSupport: number;      // population-weighted mean public support (set by resources)
  worldPopulation: number; // global population sum (set by resources)
  worldGdp: number;        // global GDP sum, gdpPerCapita×population (set by resources)
  moneyGain: number;       // money regenerated this turn (set by resources)
  scarcityByRegion: Record<RegionId, number>;         // min(water,land)/100 (set by economy)
  constraintFactorByRegion: Record<RegionId, number>; // 0.5–1.0 growth dampener (set by economy)
  outputRatioByRegion: Record<RegionId, number>;      // economic-output expansion (set by emissions)
  popGrowthByRegion: Record<RegionId, number>;        // clamped annual pop growth (set by demography)
  waterLossByRegion: Record<RegionId, number>;        // pre-clamp water drop: warming + pop pressure (set by constraints)
  landLossByRegion: Record<RegionId, number>;         // pre-clamp land drop from warming (set by constraints)
  bioLossByRegion: Record<RegionId, number>;          // pre-clamp biodiversity drop from warming (set by biodiversity)
  supportTempTermByRegion: Record<RegionId, number>;  // support Δ contribution from warming, ≤0 (set by support)
  supportEconTermByRegion: Record<RegionId, number>;  // support Δ contribution from econ growth (set by support)
  supportEquityTermByRegion: Record<RegionId, number>;// support Δ contribution from equity gap (set by support)
  equityDriftByRegion: Record<RegionId, number>;      // equity erosion from growth, ≥0 (set by support)
  programSpendByRegion: Record<RegionId, number>;     // policy upkeep/buildout money spent this turn (set by programs)
  capacityByRegionPolicy: Record<string, number>;     // installed capacity 0–1, keyed `policyId:regionId` (set by programs)
}

export interface SimContext {
  state: WorldState;
  params: ModelParams;
  rng: Rng;
  scratch: TurnScratch;
}

export interface SubModel {
  id: string;
  step(ctx: SimContext): void;
}

export function createScratch(): TurnScratch {
  return {
    deltaTemperature: 0,
    damageFraction: 0,
    prevGdpPerCapita: {},
    prevPopulation: {},
    co2Ratio: 0,
    equilibriumTemp: 0,
    deltaPpm: 0,
    grossEmissions: 0,
    baseGrowthFactor: 0,
    decarbFactor: 0,
    avgSupport: 0,
    worldPopulation: 0,
    worldGdp: 0,
    moneyGain: 0,
    scarcityByRegion: {},
    constraintFactorByRegion: {},
    outputRatioByRegion: {},
    popGrowthByRegion: {},
    waterLossByRegion: {},
    landLossByRegion: {},
    bioLossByRegion: {},
    supportTempTermByRegion: {},
    supportEconTermByRegion: {},
    supportEquityTermByRegion: {},
    equityDriftByRegion: {},
    programSpendByRegion: {},
    capacityByRegionPolicy: {},
  };
}
