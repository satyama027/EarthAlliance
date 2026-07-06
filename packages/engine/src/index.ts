export const ENGINE_VERSION = '0.1.0';

export * from './types.js';
export type { ModelParams, SubModel, SimContext, TurnScratch } from './models/types.js';
export { DEFAULT_MODELS } from './models/pipeline.js';
export { DEFAULT_PARAMS, DEFAULT_SCENARIO, END_YEAR } from './data/scenario.js';
export type { Scenario } from './data/scenario.js';
export { SAMPLE_REGIONS } from './data/regions.js';
export { GENERATION_SOURCES, GENERATION_SOURCE_IDS, gridIntensityFromMix } from './generation.js';
export type { GenerationSource, GenerationMix, GenerationSourceSpec } from './generation.js';

export { createInitialState } from './state.js';
export { createRng } from './rng.js';
export {
  POLICY_CATALOG, getAvailablePolicies, getGloballyAvailablePolicies, validateSelection,
  getPolicy, isEnacted, enactedInAnyRegion, regionCharge,
} from './policies.js';
export type { ValidationResult } from './policies.js';
export { applyCancellations } from './effects.js';
export { fossilTaxBase, carbonTaxRevenue, regionTaxIncome } from './income.js';
export { ENDINGS, evaluateEnding } from './endings.js';
export { advanceTurn, createSimulation } from './simulation.js';
export type { AdvanceResult, Simulation } from './simulation.js';
