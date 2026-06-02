export type RegionId = string;
export type GameStatus = 'playing' | 'ended';

export interface Resources {
  politicalCapital: number;
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
  regionalEmissions: number;// GtCO2/yr (may go negative => net-negative)
  waterAvailability: number;// 0–100
  landAvailability: number; // 0–100
  lat: number;
  lon: number;
}

/** Numeric Region fields a policy effect may modify. */
// Numeric Region fields a policy may modify. Demographic fields (population,
// medianAge, fertilityRate) are intentionally excluded: policies influence them
// indirectly (via education, health, gdp), never by direct assignment.
export type EffectTarget =
  | 'regionalEmissions'
  | 'biodiversityIndex'
  | 'publicSupport'
  | 'equityIndex'
  | 'waterAvailability'
  | 'landAvailability'
  | 'educationIndex'
  | 'healthIndex'
  | 'gdpPerCapita';

export type EffectDuration = 'immediate' | 'ongoing';

export interface PolicyEffect {
  target: EffectTarget;
  delta: number;
  duration: EffectDuration;
  /** For ongoing effects: number of turns it persists. Undefined => permanent. */
  turns?: number;
}

export type PolicyCategory = 'energy' | 'industry' | 'land' | 'social' | 'frontier';
export type PolicyScope = 'global' | 'region';

export interface Policy {
  id: string;
  name: string;
  category: PolicyCategory;
  description: string;
  art: string;               // asset key (placeholder)
  cost: Resources;
  scope: PolicyScope;        // 'global' applies to every region
  prerequisites?: string[];  // policy ids that must already be enacted
  effects: PolicyEffect[];
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
  enactedPolicyIds: string[];
  log: GameEvent[];
  rngSeed: number;
}

export interface Ending {
  id: string;
  title: string;
  description: string;
  kind: 'win' | 'loss' | 'ambiguous';
}
