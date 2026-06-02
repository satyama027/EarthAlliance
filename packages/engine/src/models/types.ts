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
  CAPITAL_BASE: number;
  CAPITAL_PER_SUPPORT: number;
  TAX_RATE: number;
  MONEY_SCALE: number;
}

/** Per-turn intermediate values passed between sub-models. */
export interface TurnScratch {
  deltaTemperature: number;
  damageFraction: number;
  prevGdpPerCapita: Record<RegionId, number>;
  prevPopulation: Record<RegionId, number>;
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
  };
}
