export const ENGINE_VERSION = '0.1.0';

export * from './types.js';
export type { ModelParams, SubModel, SimContext, TurnScratch } from './models/types.js';
export { DEFAULT_MODELS } from './models/pipeline.js';
export { DEFAULT_PARAMS, DEFAULT_SCENARIO, END_YEAR } from './data/scenario.js';
export type { Scenario } from './data/scenario.js';
export { SAMPLE_REGIONS } from './data/regions.js';

export { createInitialState } from './state.js';
export { createRng } from './rng.js';
export { POLICY_CATALOG, getAvailablePolicies, validateSelection, getPolicy } from './policies.js';
export type { ValidationResult } from './policies.js';
export { ENDINGS, evaluateEnding } from './endings.js';
export { advanceTurn, createSimulation } from './simulation.js';
export type { AdvanceResult, Simulation } from './simulation.js';
