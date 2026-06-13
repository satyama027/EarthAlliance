import type { ModelParams } from '../models/types.js';
import type { Region } from '../types.js';
import { SAMPLE_REGIONS } from './regions.js';

export interface Scenario {
  startYear: number;
  startTemperatureAnomaly: number; // °C, already-warmed world
  startCo2: number;                // ppm
  startResources: { money: number };
  rngSeed: number;
  regions: readonly Region[];
}

// Frozen: shared read-only defaults; never mutate in a sub-model.
export const DEFAULT_PARAMS: ModelParams = Object.freeze({
  TURN_YEARS: 5,
  GTCO2_PER_PPM: 7.81,
  AIRBORNE_FRACTION: 0.5,
  ECS: 3.0,
  WARMING_ADJUST: 0.3,
  DAMAGE_COEFF: 0.005,
  BASE_GROWTH: 0.02,
  FERT_W: 0.01,
  HEALTH_W: 0.0002,
  DEMO_TRANSITION: 0.01,
  AGEING_RATE: 0.3,
  EDU_GROWTH: 0.2,
  WATER_TEMP_LOSS: 5,
  LAND_DEGRADE: 3,
  POP_PRESSURE: 5,
  BIO_TEMP_LOSS: 8,
  SUPPORT_TEMP_W: 20,
  SUPPORT_ECON_W: 20,
  SUPPORT_EQUITY_W: 0.1,
  INEQUALITY_DRIFT: 5,
  TAX_RATE: 0.02,
  MONEY_SCALE: 1e9,
  // --- Sectoral-emissions model (used from CP2/CP3 onward) ---
  STORAGE_FLOOR: 0.6,        // renewables deliver 60% of their grid-cleaning benefit with zero storage
  AVIATION_FLOOR: 0.2,       // fraction of a region's baseline aviation/shipping that is hard-to-abate
  AG_YIELD_LAND_COEFF: 0.1,  // how strongly a productivity shortfall (below 100) erodes land/GDP
});

export const DEFAULT_SCENARIO: Scenario = {
  startYear: 2025,
  startTemperatureAnomaly: 1.3,
  startCo2: 420,
  startResources: { money: 1500 },
  rngSeed: 12345,
  regions: SAMPLE_REGIONS,
};

export const END_YEAR = 2200;

export const CO2_PREINDUSTRIAL = 280;
