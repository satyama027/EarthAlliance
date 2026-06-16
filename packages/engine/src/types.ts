import type { GenerationMix } from './generation.js';

export type RegionId = string;
export type GameStatus = 'playing' | 'ended';

export interface Resources {
  money: number;
}

export interface Climate {
  temperatureAnomaly: number; // °C above pre-industrial
  co2Concentration: number;   // ppm
  annualEmissions: number;    // GtCO2/yr — ALWAYS derived as sum of regionalEmissions
}

export interface Region {
  id: RegionId;
  name: string;
  population: number;       // people
  educationIndex: number;   // 0–100
  healthIndex: number;      // 0–100
  medianAge: number;        // years
  fertilityRate: number;    // children per woman
  gdpPerCapita: number;     // currency units per person
  publicSupport: number;    // 0–100
  equityIndex: number;      // 0–100
  biodiversityIndex: number;// 0–100
  regionalEmissions: number;// GtCO2/yr — DERIVED total = sum of the six per-source fields below
  waterAvailability: number;// 0–100
  landAvailability: number; // 0–100
  lat: number;
  lon: number;

  // --- Per-source emissions (GtCO2/yr). Sum === regionalEmissions. ---
  // `electricity` is DERIVED each turn as electricityDemand × gridCarbonIntensity; the
  // other five are activity-driven stocks that policies cut directly. `landUse` may go
  // negative (a forest sink). None are clamped to 0–100 (they are Gt, not indices).
  electricity: number;       // power-sector emissions (derived: demand × grid intensity)
  transport: number;         // road transport
  aviationShipping: number;  // aviation + shipping (hard-to-abate; floored)
  industry: number;          // industry (energy + process: steel, cement, chemicals)
  agriculture: number;       // agriculture (livestock methane, fertilizer N2O)
  landUse: number;           // land-use & forestry; negative => net sink

  // --- Coupling variables the new policies move (the trade-off carriers). ---
  // `gridCarbonIntensity` is DERIVED from `generationMix` (Σ share × emission factor) — no policy
  // writes it directly; renewable/nuclear policies move the mix, which moves intensity.
  generationMix: GenerationMix;    // per-source generation shares (0–1, sum to 1)
  gridCarbonIntensity: number;     // 0–1, dirtiness per kWh (DERIVED from generationMix)
  electricityDemand: number;       // power draw in Gt-at-reference units (grows with GDP)
  agriculturalProductivity: number;// crop/land yield index, baseline 100
  energyStorageCapacity: number;   // 0–1 installed grid storage; gates renewable effectiveness
}

/** Numeric Region fields a policy effect may modify. */
// Numeric Region fields a policy may modify. Demographic fields (population,
// medianAge, fertilityRate) are intentionally excluded: policies influence them
// indirectly (via education, health, gdp), never by direct assignment.
export type EffectTarget =
  | 'biodiversityIndex'
  | 'publicSupport'
  | 'equityIndex'
  | 'waterAvailability'
  | 'landAvailability'
  | 'educationIndex'
  | 'healthIndex'
  | 'gdpPerCapita'
  // Per-source emission targets (electricity is NOT here — it is derived from the two
  // coupling variables below, which policies move instead).
  | 'transport'
  | 'aviationShipping'
  | 'industry'
  | 'agriculture'
  | 'landUse'
  // Generation-share targets: route into `generationMix` (grid intensity is derived, never set).
  // Renewable/nuclear policies grow these; the generationMix submodel rebalances Σ=1.
  | 'windShare'
  | 'solarShare'
  | 'nuclearShare'
  | 'electricityDemand'
  | 'agriculturalProductivity'
  | 'energyStorageCapacity';

export type EffectDuration = 'immediate' | 'ongoing';

export interface PolicyEffect {
  target: EffectTarget;
  delta: number;
  duration: EffectDuration;
  /** For ongoing effects: number of turns it persists. Undefined => permanent. */
  turns?: number;
  /**
   * For intermittent renewables: when true, this effect's magnitude is scaled by the
   * region's grid-storage efficiency (`STORAGE_FLOOR + (1 − STORAGE_FLOOR) × storageCapacity`).
   * Firm sources (nuclear) leave this unset and deliver full benefit immediately. (Used in CP3.)
   */
  storageGated?: boolean;
}

export type PolicyCategory = 'energy' | 'industry' | 'land' | 'social' | 'frontier';

/**
 * How a policy's money cost is charged:
 * - `one-time`: charged once at enactment; effect permanent.
 * - `recurring`: charged every turn while active; never completes (e.g. a fund).
 * - `buildout`: charged every turn until installed capacity reaches 100%, then
 *   stops; ongoing effects ramp with capacity.
 */
export type PolicyFunding = 'one-time' | 'recurring' | 'buildout';

/** Per-region capacity rollout for a `buildout` policy. */
export interface BuildoutSpec {
  ratePerTurn: number;                          // capacity added per turn (0–1), e.g. 0.10
  baselineByRegion?: Record<RegionId, number>;  // starting capacity 0–1 per region
  defaultBaseline?: number;                     // fallback starting capacity (default 0)
}

export interface Policy {
  id: string;
  name: string;
  category: PolicyCategory;
  description: string;
  art: string;               // asset key (placeholder)
  cost: Resources;           // money is the GLOBAL reference; per-region charge is scaled by GDP share
  funding: PolicyFunding;
  buildout?: BuildoutSpec;   // required when funding === 'buildout'
  prerequisites?: string[];  // policy ids that must already be enacted IN THE SAME region
  effects: PolicyEffect[];
}

/** A request to enact one policy in one region this turn. */
export interface PolicySelection {
  policyId: string;
  regionId: RegionId;
}

/** An active (policy, region) enactment tracked on world state. */
export interface Enactment {
  policyId: string;
  regionId: RegionId;
  capacity: number;   // 0–1 installed capacity (1 immediately for non-buildout)
  complete: boolean;  // buildout: capacity >= 1; one-time: true; recurring: false
  cancelled?: boolean; // buildout frozen by the player: stops upkeep + advance, keeps the installed benefit
  // EV electrification bookkeeping (ev-transition only): the counterfactual road-transport baseline
  // (grown with GDP) and the cumulative electricity demand already added, so each turn applies only
  // the capacity-driven delta — gradual and drift-free. See models/evElectrification.ts.
  evBaselineTransport?: number;
  evDemandAdded?: number;
}

export interface ActiveEffect {
  policyId: string;
  regionId: RegionId | null; // null => all regions
  effect: PolicyEffect;
  turnsRemaining: number;    // Infinity => permanent
}

export interface GameEvent {
  turn: number;
  type: string;
  message: string;
  payload?: Record<string, unknown>;
}

export interface WorldState {
  turn: number;              // 0-based
  year: number;              // starts 2025, +5 per turn
  status: GameStatus;
  endingId: string | null;
  resources: Resources;
  climate: Climate;
  regions: Region[];
  activeEffects: ActiveEffect[];
  enactments: Enactment[];
  log: GameEvent[];
  rngSeed: number;
}

export interface Ending {
  id: string;
  title: string;
  description: string;
  kind: 'win' | 'loss' | 'ambiguous';
}

/**
 * Per-turn diagnostics: values the pipeline computes as intermediates (`TurnScratch`)
 * and then discards. Surfaced so the client can show climate damage and economic
 * growth exactly, without re-deriving the model equations.
 */
export interface TurnDiagnostics {
  damageFraction: number;                    // global, 0–1: GDP fraction lost to warming this turn
  deltaTemperature: number;                  // °C change this turn
  growthByRegion: Record<RegionId, number>;  // per-region GDP/capita fractional change this turn

  // Calc intermediates: variables the pipeline computes mid-turn and the state discards.
  // Surfaced so the client can show *why* the headline values moved, without re-deriving the
  // model equations. Global climate/economy scalars + per-region growth mechanics.
  co2Ratio: number;          // atmospheric CO2 ÷ 280 ppm preindustrial
  equilibriumTemp: number;   // °C the climate is heading toward at this CO2 (radiative forcing)
  deltaPpm: number;          // ppm added to the atmosphere this turn
  grossEmissions: number;    // Gt emitted over the 5-year turn (annual rate × TURN_YEARS)
  baseGrowthFactor: number;  // base GDP growth multiplier before damage & resource scarcity
  avgSupport: number;        // population-weighted mean public support across all regions
  worldPopulation: number;   // global population sum
  worldGdp: number;          // global GDP sum (Σ gdpPerCapita × population)
  moneyGain: number;         // money regenerated this turn (before policy spend)
  scarcityByRegion: Record<RegionId, number>;         // min(water,land)/100 (0–1)
  constraintFactorByRegion: Record<RegionId, number>; // 0.5–1.0 growth dampener from scarcity
  outputRatioByRegion: Record<RegionId, number>;      // economic-output expansion driving emissions
  popGrowthByRegion: Record<RegionId, number>;        // clamped annual population growth rate
  // Why water/land/biodiversity/support/equity moved this turn (pre-clamp driver magnitudes):
  waterLossByRegion: Record<RegionId, number>;        // water drop from warming + population pressure
  landLossByRegion: Record<RegionId, number>;         // land drop from warming
  bioLossByRegion: Record<RegionId, number>;          // biodiversity drop from warming
  supportTempTermByRegion: Record<RegionId, number>;  // support Δ from warming (≤ 0)
  supportEconTermByRegion: Record<RegionId, number>;  // support Δ from economic growth
  supportEquityTermByRegion: Record<RegionId, number>;// support Δ from the equity gap vs. 50
  equityDriftByRegion: Record<RegionId, number>;      // equity erosion from growth (≥ 0)
  programSpendByRegion: Record<RegionId, number>;     // policy upkeep/buildout money spent this turn
  capacityByRegionPolicy: Record<string, number>;     // installed capacity 0–1, keyed `policyId:regionId`
}
