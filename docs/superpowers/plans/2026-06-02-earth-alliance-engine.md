# Earth Alliance — Simulation Engine Implementation Plan (Plan 1 of 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the pure, deterministic, framework-agnostic TypeScript simulation engine (`packages/engine`) for the climate strategy game, with a full regression test suite, producing a complete game core playable entirely through tests.

**Architecture:** pnpm monorepo. The engine is one package with **zero UI dependencies**. The world model is a pipeline of swappable pure sub-models run by an `advanceTurn` orchestrator. All randomness flows through a seeded RNG carried in `WorldState.rngSeed`, so the engine is fully deterministic and testable.

**Tech Stack:** TypeScript (strict), Vitest, fast-check (property-based), v8 coverage.

> **Spec:** `docs/superpowers/specs/2026-06-02-earth-alliance-climate-game-design.md`. This plan refines a few details for implementability (noted inline); the spec is updated to match.

> **Conventions:** All commands run from the repo root `D:\VSCode Projects\EarthAlliance` unless stated. The engine is filtered with `pnpm --filter @earth-alliance/engine`. Commit messages end with the `Co-Authored-By` trailer.

---

## File Structure

```
packages/engine/
├─ package.json
├─ tsconfig.json
├─ tsconfig.build.json
├─ vitest.config.ts
├─ src/
│  ├─ index.ts            # public API re-exports
│  ├─ types.ts            # domain types (WorldState, Region, Policy, Ending…)
│  ├─ math.ts             # clamp + small numeric helpers
│  ├─ rng.ts              # seeded deterministic RNG (mulberry32)
│  ├─ state.ts            # createInitialState()
│  ├─ policies.ts         # POLICY_CATALOG, getAvailablePolicies, validateSelection
│  ├─ effects.ts          # spendAndRegister + applyEffects
│  ├─ endings.ts          # ENDINGS + evaluateEnding
│  ├─ simulation.ts       # advanceTurn orchestrator + createSimulation
│  ├─ models/
│  │  ├─ types.ts         # SubModel, SimContext, TurnScratch, ModelParams, createScratch
│  │  ├─ pipeline.ts      # DEFAULT_MODELS ordered list
│  │  ├─ carbonCycle.ts
│  │  ├─ climate.ts
│  │  ├─ damage.ts
│  │  ├─ economy.ts
│  │  ├─ demography.ts
│  │  ├─ emissions.ts
│  │  ├─ constraints.ts
│  │  ├─ biodiversity.ts
│  │  ├─ support.ts
│  │  └─ resources.ts
│  └─ data/
│     ├─ regions.ts       # SAMPLE_REGIONS
│     └─ scenario.ts      # DEFAULT_PARAMS, DEFAULT_SCENARIO
└─ test/
   ├─ fixtures.ts         # builders: makeRegion, makeState, makeContext
   ├─ rng.test.ts
   ├─ state.test.ts
   ├─ models/*.test.ts    # one per sub-model
   ├─ pipeline.test.ts
   ├─ policies.test.ts
   ├─ effects.test.ts
   ├─ simulation.test.ts
   ├─ endings.test.ts
   ├─ integration.test.ts # golden trajectory, determinism, reversal, doom
   └─ invariants.test.ts  # fast-check
```

---

## Task 1: Monorepo + engine package scaffold

**Files:**
- Create: `pnpm-workspace.yaml`, `package.json`, `tsconfig.base.json`
- Create: `packages/engine/package.json`, `packages/engine/tsconfig.json`, `packages/engine/tsconfig.build.json`, `packages/engine/vitest.config.ts`
- Create: `packages/engine/src/index.ts`, `packages/engine/test/smoke.test.ts`

- [ ] **Step 1: Create workspace + root config files**

`pnpm-workspace.yaml`:
```yaml
packages:
  - 'packages/*'
```

`package.json`:
```json
{
  "name": "earth-alliance",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "pnpm -r test",
    "test:watch": "pnpm -r test:watch",
    "coverage": "pnpm -r coverage",
    "typecheck": "pnpm -r typecheck"
  },
  "devDependencies": {
    "typescript": "^5.5.4"
  }
}
```

`tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "forceConsistentCasingInFileNames": true,
    "verbatimModuleSyntax": true
  }
}
```

- [ ] **Step 2: Create the engine package config**

`packages/engine/package.json`:
```json
{
  "name": "@earth-alliance/engine",
  "version": "0.0.0",
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": { ".": "./src/index.ts" },
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "coverage": "vitest run --coverage",
    "typecheck": "tsc --noEmit",
    "build": "tsc -p tsconfig.build.json"
  },
  "devDependencies": {
    "vitest": "^2.1.1",
    "@vitest/coverage-v8": "^2.1.1",
    "fast-check": "^3.22.0",
    "typescript": "^5.5.4"
  }
}
```

`packages/engine/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "rootDir": ".", "noEmit": true },
  "include": ["src", "test"]
}
```

`packages/engine/tsconfig.build.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "rootDir": "src", "outDir": "dist", "noEmit": false },
  "include": ["src"]
}
```

`packages/engine/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts', 'src/types.ts', 'src/models/types.ts'],
      thresholds: { lines: 90, functions: 90, branches: 80, statements: 90 },
    },
  },
});
```

- [ ] **Step 3: Create a placeholder entry point and smoke test**

`packages/engine/src/index.ts`:
```ts
export const ENGINE_VERSION = '0.0.0';
```

`packages/engine/test/smoke.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { ENGINE_VERSION } from '../src/index.js';

describe('smoke', () => {
  it('exposes a version', () => {
    expect(ENGINE_VERSION).toBe('0.0.0');
  });
});
```

- [ ] **Step 4: Install and run the smoke test**

Run: `pnpm install`
Then: `pnpm --filter @earth-alliance/engine test`
Expected: 1 passing test (`smoke > exposes a version`).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: scaffold pnpm monorepo and engine package

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Domain types

**Files:**
- Create: `packages/engine/src/types.ts`

- [ ] **Step 1: Write the types file**

`packages/engine/src/types.ts`:
```ts
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
```

- [ ] **Step 2: Typecheck**

Run: `pnpm --filter @earth-alliance/engine typecheck`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "feat(engine): add domain types

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Numeric helpers (`math.ts`)

**Files:**
- Create: `packages/engine/src/math.ts`
- Test: `packages/engine/test/math.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/engine/test/math.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { clamp } from '../src/math.js';

describe('clamp', () => {
  it('returns the value when inside the range', () => {
    expect(clamp(50, 0, 100)).toBe(50);
  });
  it('clamps below the minimum', () => {
    expect(clamp(-5, 0, 100)).toBe(0);
  });
  it('clamps above the maximum', () => {
    expect(clamp(150, 0, 100)).toBe(100);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @earth-alliance/engine test -- math`
Expected: FAIL — cannot find module `../src/math.js`.

- [ ] **Step 3: Write the implementation**

`packages/engine/src/math.ts`:
```ts
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @earth-alliance/engine test -- math`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(engine): add clamp helper

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Seeded RNG (`rng.ts`)

**Files:**
- Create: `packages/engine/src/rng.ts`
- Test: `packages/engine/test/rng.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/engine/test/rng.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { createRng } from '../src/rng.js';

describe('createRng', () => {
  it('produces values in [0, 1)', () => {
    const rng = createRng(123);
    for (let i = 0; i < 100; i++) {
      const v = rng.next();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it('is deterministic for a given seed', () => {
    const a = createRng(42);
    const b = createRng(42);
    const seqA = [a.next(), a.next(), a.next()];
    const seqB = [b.next(), b.next(), b.next()];
    expect(seqA).toEqual(seqB);
  });

  it('differs for different seeds', () => {
    const a = createRng(1);
    const b = createRng(2);
    expect(a.next()).not.toBe(b.next());
  });

  it('exposes an advancing seed that can resume the sequence', () => {
    const a = createRng(7);
    a.next();
    a.next();
    const resumed = createRng(a.seed);
    const continued = createRng(7);
    continued.next();
    continued.next();
    expect(resumed.next()).toBe(continued.next());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @earth-alliance/engine test -- rng`
Expected: FAIL — cannot find module `../src/rng.js`.

- [ ] **Step 3: Write the implementation**

`packages/engine/src/rng.ts`:
```ts
export interface Rng {
  /** Current internal state; pass to createRng to resume the exact sequence. */
  readonly seed: number;
  /** Next pseudo-random float in [0, 1). */
  next(): number;
}

/** Deterministic mulberry32 PRNG. */
export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  return {
    get seed(): number {
      return a >>> 0;
    },
    next(): number {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @earth-alliance/engine test -- rng`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(engine): add deterministic seeded RNG

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Model params + scenario data

**Files:**
- Create: `packages/engine/src/models/types.ts` (ModelParams + SubModel/SimContext/TurnScratch interfaces + createScratch)
- Create: `packages/engine/src/data/regions.ts`
- Create: `packages/engine/src/data/scenario.ts`
- Test: `packages/engine/test/data.test.ts`

> Note: The `models/types.ts` interfaces are declarations consumed by every sub-model. We create them here so data + models can reference them.

- [ ] **Step 1: Write the model + context interfaces**

`packages/engine/src/models/types.ts`:
```ts
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
```

- [ ] **Step 2: Write the sample regions**

`packages/engine/src/data/regions.ts`:
```ts
import type { Region } from '../types.js';

export const SAMPLE_REGIONS: readonly Region[] = [
  {
    id: 'north-america', name: 'North America',
    population: 5.0e8, educationIndex: 80, healthIndex: 78, medianAge: 38,
    fertilityRate: 1.7, gdpPerCapita: 65000, publicSupport: 55, equityIndex: 60,
    biodiversityIndex: 55, regionalEmissions: 6.0, waterAvailability: 70,
    landAvailability: 75, lat: 40, lon: -100,
  },
  {
    id: 'europe', name: 'Europe',
    population: 7.5e8, educationIndex: 82, healthIndex: 80, medianAge: 43,
    fertilityRate: 1.6, gdpPerCapita: 45000, publicSupport: 60, equityIndex: 68,
    biodiversityIndex: 50, regionalEmissions: 4.0, waterAvailability: 75,
    landAvailability: 65, lat: 50, lon: 10,
  },
  {
    id: 'sub-saharan-africa', name: 'Sub-Saharan Africa',
    population: 1.2e9, educationIndex: 45, healthIndex: 50, medianAge: 19,
    fertilityRate: 4.3, gdpPerCapita: 4000, publicSupport: 50, equityIndex: 40,
    biodiversityIndex: 70, regionalEmissions: 2.0, waterAvailability: 55,
    landAvailability: 80, lat: 0, lon: 20,
  },
  {
    id: 'south-asia', name: 'South Asia',
    population: 1.9e9, educationIndex: 55, healthIndex: 58, medianAge: 28,
    fertilityRate: 2.2, gdpPerCapita: 7000, publicSupport: 52, equityIndex: 42,
    biodiversityIndex: 45, regionalEmissions: 8.0, waterAvailability: 50,
    landAvailability: 55, lat: 22, lon: 78,
  },
  {
    id: 'east-asia', name: 'East Asia',
    population: 1.6e9, educationIndex: 75, healthIndex: 74, medianAge: 39,
    fertilityRate: 1.4, gdpPerCapita: 18000, publicSupport: 48, equityIndex: 50,
    biodiversityIndex: 40, regionalEmissions: 15.0, waterAvailability: 60,
    landAvailability: 50, lat: 35, lon: 110,
  },
];
```

- [ ] **Step 3: Write the scenario + default params**

`packages/engine/src/data/scenario.ts`:
```ts
import type { ModelParams } from '../models/types.js';
import type { Region } from '../types.js';
import { SAMPLE_REGIONS } from './regions.js';

export interface Scenario {
  startYear: number;
  startTemperatureAnomaly: number; // °C, already-warmed world
  startCo2: number;                // ppm
  startResources: { politicalCapital: number; money: number };
  rngSeed: number;
  regions: readonly Region[];
}

export const DEFAULT_PARAMS: ModelParams = {
  TURN_YEARS: 5,
  GTCO2_PER_PPM: 7.81,
  AIRBORNE_FRACTION: 0.5,
  ECS: 3.0,
  WARMING_ADJUST: 0.3,
  DAMAGE_COEFF: 0.005,
  BASE_GROWTH: 0.02,
  AUTON_DECARB: 0.01,
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
  CAPITAL_BASE: 10,
  CAPITAL_PER_SUPPORT: 0.5,
  TAX_RATE: 0.02,
  MONEY_SCALE: 1e9,
};

export const DEFAULT_SCENARIO: Scenario = {
  startYear: 2025,
  startTemperatureAnomaly: 1.3,
  startCo2: 420,
  startResources: { politicalCapital: 100, money: 100 },
  rngSeed: 12345,
  regions: SAMPLE_REGIONS,
};

export const END_YEAR = 2200;
```

- [ ] **Step 4: Write the failing test**

`packages/engine/test/data.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { SAMPLE_REGIONS } from '../src/data/regions.js';
import { DEFAULT_PARAMS, DEFAULT_SCENARIO, END_YEAR } from '../src/data/scenario.js';

describe('sample regions', () => {
  it('has five regions with unique ids', () => {
    expect(SAMPLE_REGIONS).toHaveLength(5);
    const ids = new Set(SAMPLE_REGIONS.map((r) => r.id));
    expect(ids.size).toBe(5);
  });

  it('keeps 0–100 indices within range', () => {
    for (const r of SAMPLE_REGIONS) {
      for (const v of [r.educationIndex, r.healthIndex, r.publicSupport,
        r.equityIndex, r.biodiversityIndex, r.waterAvailability, r.landAvailability]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe('default scenario', () => {
  it('starts in an already-warmed 2025 world', () => {
    expect(DEFAULT_SCENARIO.startYear).toBe(2025);
    expect(DEFAULT_SCENARIO.startTemperatureAnomaly).toBeCloseTo(1.3, 5);
    expect(END_YEAR).toBe(2200);
  });

  it('has a 35-turn horizon at 5 years per turn', () => {
    expect((END_YEAR - DEFAULT_SCENARIO.startYear) / DEFAULT_PARAMS.TURN_YEARS).toBe(35);
  });
});
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @earth-alliance/engine test -- data`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(engine): add model params, sample regions, default scenario

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Initial state (`state.ts`) + test fixtures

**Files:**
- Create: `packages/engine/src/state.ts`
- Create: `packages/engine/test/fixtures.ts`
- Test: `packages/engine/test/state.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/engine/test/state.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/state.js';
import { DEFAULT_SCENARIO } from '../src/data/scenario.js';

describe('createInitialState', () => {
  it('initializes turn 0 in 2025, playing', () => {
    const s = createInitialState();
    expect(s.turn).toBe(0);
    expect(s.year).toBe(2025);
    expect(s.status).toBe('playing');
    expect(s.endingId).toBeNull();
  });

  it('seeds an already-warmed climate with derived annual emissions', () => {
    const s = createInitialState();
    expect(s.climate.temperatureAnomaly).toBeCloseTo(1.3, 5);
    expect(s.climate.co2Concentration).toBeCloseTo(420, 5);
    const sumEmissions = DEFAULT_SCENARIO.regions.reduce((a, r) => a + r.regionalEmissions, 0);
    expect(s.climate.annualEmissions).toBeCloseTo(sumEmissions, 5);
  });

  it('deep-copies regions so the scenario is not mutated', () => {
    const s = createInitialState();
    s.regions[0]!.publicSupport = 0;
    expect(DEFAULT_SCENARIO.regions[0]!.publicSupport).not.toBe(0);
  });

  it('starts with empty effects, log, and enacted policies', () => {
    const s = createInitialState();
    expect(s.activeEffects).toEqual([]);
    expect(s.log).toEqual([]);
    expect(s.enactedPolicyIds).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @earth-alliance/engine test -- state`
Expected: FAIL — cannot find module `../src/state.js`.

- [ ] **Step 3: Write the implementation**

`packages/engine/src/state.ts`:
```ts
import type { WorldState } from './types.js';
import { DEFAULT_SCENARIO, type Scenario } from './data/scenario.js';

export function createInitialState(scenario: Scenario = DEFAULT_SCENARIO): WorldState {
  const regions = scenario.regions.map((r) => ({ ...r }));
  const annualEmissions = regions.reduce((sum, r) => sum + r.regionalEmissions, 0);
  return {
    turn: 0,
    year: scenario.startYear,
    status: 'playing',
    endingId: null,
    resources: { ...scenario.startResources },
    climate: {
      temperatureAnomaly: scenario.startTemperatureAnomaly,
      co2Concentration: scenario.startCo2,
      annualEmissions,
    },
    regions,
    activeEffects: [],
    enactedPolicyIds: [],
    log: [],
    rngSeed: scenario.rngSeed,
  };
}
```

- [ ] **Step 4: Write the shared test fixtures**

`packages/engine/test/fixtures.ts`:
```ts
import type { Region, WorldState } from '../src/types.js';
import type { SimContext, TurnScratch } from '../src/models/types.js';
import { createScratch } from '../src/models/types.js';
import { DEFAULT_PARAMS } from '../src/data/scenario.js';
import { createInitialState } from '../src/state.js';
import { createRng } from '../src/rng.js';

export function makeRegion(overrides: Partial<Region> = {}): Region {
  return {
    id: 'test-region', name: 'Test Region',
    population: 1e9, educationIndex: 50, healthIndex: 50, medianAge: 30,
    fertilityRate: 2.0, gdpPerCapita: 20000, publicSupport: 50, equityIndex: 50,
    biodiversityIndex: 50, regionalEmissions: 10, waterAvailability: 50,
    landAvailability: 50, lat: 0, lon: 0,
    ...overrides,
  };
}

export function makeState(overrides: Partial<WorldState> = {}): WorldState {
  return { ...createInitialState(), ...overrides };
}

/** Build a SimContext around a given state, with an empty scratch. */
export function makeContext(state: WorldState, scratch?: Partial<TurnScratch>): SimContext {
  return {
    state,
    params: DEFAULT_PARAMS,
    rng: createRng(state.rngSeed),
    scratch: { ...createScratch(), ...scratch },
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm --filter @earth-alliance/engine test -- state`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(engine): add createInitialState and test fixtures

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: Carbon-cycle sub-model

**Files:**
- Create: `packages/engine/src/models/carbonCycle.ts`
- Test: `packages/engine/test/models/carbonCycle.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/engine/test/models/carbonCycle.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { carbonCycle } from '../../src/models/carbonCycle.js';
import { makeState, makeContext } from '../fixtures.js';

describe('carbonCycle', () => {
  it('adds airborne fraction of emissions to CO2 concentration', () => {
    const state = makeState();
    state.climate.co2Concentration = 420;
    state.climate.annualEmissions = 35;
    const ctx = makeContext(state);
    carbonCycle.step(ctx);
    // 0.5 * (35 * 5) / 7.81 = 11.2036...
    expect(state.climate.co2Concentration).toBeCloseTo(431.2036, 3);
  });

  it('reduces CO2 when emissions are net-negative', () => {
    const state = makeState();
    state.climate.co2Concentration = 420;
    state.climate.annualEmissions = -20;
    const ctx = makeContext(state);
    carbonCycle.step(ctx);
    // 0.5 * (-20 * 5) / 7.81 = -6.4021...
    expect(state.climate.co2Concentration).toBeCloseTo(413.5979, 3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @earth-alliance/engine test -- carbonCycle`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write the implementation**

`packages/engine/src/models/carbonCycle.ts`:
```ts
import type { SubModel } from './types.js';

/** (A) Emissions accumulate into atmospheric CO2; only the airborne fraction stays. */
export const carbonCycle: SubModel = {
  id: 'carbonCycle',
  step({ state, params }) {
    const gross = state.climate.annualEmissions * params.TURN_YEARS;
    const deltaPpm = (params.AIRBORNE_FRACTION * gross) / params.GTCO2_PER_PPM;
    state.climate.co2Concentration += deltaPpm;
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @earth-alliance/engine test -- carbonCycle`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(engine): add carbon-cycle sub-model

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: Climate-response sub-model

**Files:**
- Create: `packages/engine/src/models/climate.ts`
- Test: `packages/engine/test/models/climate.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/engine/test/models/climate.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { climate } from '../../src/models/climate.js';
import { makeState, makeContext } from '../fixtures.js';

describe('climate', () => {
  it('moves temperature toward equilibrium with thermal lag', () => {
    const state = makeState();
    state.climate.co2Concentration = 560; // exactly 2x pre-industrial (280)
    state.climate.temperatureAnomaly = 1.3;
    const ctx = makeContext(state);
    climate.step(ctx);
    // T_eq = ECS * log2(560/280) = 3 * 1 = 3; dT = (3 - 1.3) * 0.3 = 0.51
    expect(ctx.scratch.deltaTemperature).toBeCloseTo(0.51, 5);
    expect(state.climate.temperatureAnomaly).toBeCloseTo(1.81, 5);
  });

  it('does not overshoot equilibrium', () => {
    const state = makeState();
    state.climate.co2Concentration = 560;
    state.climate.temperatureAnomaly = 1.3;
    const ctx = makeContext(state);
    for (let i = 0; i < 100; i++) climate.step(ctx);
    expect(state.climate.temperatureAnomaly).toBeLessThanOrEqual(3.0001);
    expect(state.climate.temperatureAnomaly).toBeGreaterThan(2.99);
  });

  it('cools when CO2 falls below the level that set current temperature', () => {
    const state = makeState();
    state.climate.co2Concentration = 350; // T_eq = 3*log2(350/280) ≈ 0.966
    state.climate.temperatureAnomaly = 1.5;
    const ctx = makeContext(state);
    climate.step(ctx);
    expect(ctx.scratch.deltaTemperature).toBeLessThan(0);
    expect(state.climate.temperatureAnomaly).toBeLessThan(1.5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @earth-alliance/engine test -- climate`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write the implementation**

`packages/engine/src/models/climate.ts`:
```ts
import type { SubModel } from './types.js';

const CO2_PREINDUSTRIAL = 280;

/** (B) CO2 -> radiative forcing -> equilibrium temp, approached with thermal lag. */
export const climate: SubModel = {
  id: 'climate',
  step({ state, params, scratch }) {
    const ratio = state.climate.co2Concentration / CO2_PREINDUSTRIAL;
    const tEq = params.ECS * Math.log2(ratio);
    const dT = (tEq - state.climate.temperatureAnomaly) * params.WARMING_ADJUST;
    state.climate.temperatureAnomaly += dT;
    scratch.deltaTemperature = dT;
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @earth-alliance/engine test -- climate`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(engine): add climate-response sub-model

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 9: Damage sub-model

**Files:**
- Create: `packages/engine/src/models/damage.ts`
- Test: `packages/engine/test/models/damage.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/engine/test/models/damage.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { damage } from '../../src/models/damage.js';
import { makeState, makeContext } from '../fixtures.js';

describe('damage', () => {
  it('computes a quadratic damage fraction', () => {
    const state = makeState();
    state.climate.temperatureAnomaly = 3;
    const ctx = makeContext(state);
    damage.step(ctx);
    expect(ctx.scratch.damageFraction).toBeCloseTo(0.045, 5); // 0.005 * 9
  });

  it('increases monotonically with temperature', () => {
    const lo = makeState(); lo.climate.temperatureAnomaly = 2;
    const hi = makeState(); hi.climate.temperatureAnomaly = 4;
    const cl = makeContext(lo); const ch = makeContext(hi);
    damage.step(cl); damage.step(ch);
    expect(ch.scratch.damageFraction).toBeGreaterThan(cl.scratch.damageFraction);
  });

  it('clamps at 1', () => {
    const state = makeState();
    state.climate.temperatureAnomaly = 20;
    const ctx = makeContext(state);
    damage.step(ctx);
    expect(ctx.scratch.damageFraction).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @earth-alliance/engine test -- damage`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write the implementation**

`packages/engine/src/models/damage.ts`:
```ts
import type { SubModel } from './types.js';

/** (C) Temperature -> quadratic economic damage fraction (DICE-style). */
export const damage: SubModel = {
  id: 'damage',
  step({ state, params, scratch }) {
    const t = state.climate.temperatureAnomaly;
    scratch.damageFraction = Math.min(params.DAMAGE_COEFF * t * t, 1);
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @earth-alliance/engine test -- damage`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(engine): add damage sub-model

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 10: Economy sub-model

**Files:**
- Create: `packages/engine/src/models/economy.ts`
- Test: `packages/engine/test/models/economy.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/engine/test/models/economy.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { economy } from '../../src/models/economy.js';
import { makeRegion, makeState, makeContext } from '../fixtures.js';

describe('economy', () => {
  it('grows GDP per capita at the baseline rate with no damage or scarcity', () => {
    const state = makeState({ regions: [makeRegion({ gdpPerCapita: 50000, waterAvailability: 100, landAvailability: 100 })] });
    const ctx = makeContext(state, { damageFraction: 0 });
    economy.step(ctx);
    // 50000 * 1.02^5 * 1 * 1 = 55204.04
    expect(state.regions[0]!.gdpPerCapita).toBeCloseTo(55204.04, 1);
  });

  it('records previous GDP into scratch', () => {
    const state = makeState({ regions: [makeRegion({ id: 'r1', gdpPerCapita: 50000 })] });
    const ctx = makeContext(state, { damageFraction: 0 });
    economy.step(ctx);
    expect(ctx.scratch.prevGdpPerCapita['r1']).toBe(50000);
  });

  it('shrinks growth under climate damage and scarcity', () => {
    const healthy = makeState({ regions: [makeRegion({ gdpPerCapita: 50000, waterAvailability: 100, landAvailability: 100 })] });
    const stressed = makeState({ regions: [makeRegion({ gdpPerCapita: 50000, waterAvailability: 20, landAvailability: 20 })] });
    const ch = makeContext(healthy, { damageFraction: 0 });
    const cs = makeContext(stressed, { damageFraction: 0.4 });
    economy.step(ch); economy.step(cs);
    expect(stressed.regions[0]!.gdpPerCapita).toBeLessThan(healthy.regions[0]!.gdpPerCapita);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @earth-alliance/engine test -- economy`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write the implementation**

`packages/engine/src/models/economy.ts`:
```ts
import type { SubModel } from './types.js';

/** (D) GDP per capita grows, dampened by climate damage and resource scarcity. */
export const economy: SubModel = {
  id: 'economy',
  step({ state, params, scratch }) {
    const growth = Math.pow(1 + params.BASE_GROWTH, params.TURN_YEARS);
    for (const r of state.regions) {
      scratch.prevGdpPerCapita[r.id] = r.gdpPerCapita;
      const scarcity = Math.min(r.waterAvailability, r.landAvailability) / 100;
      const constraintFactor = 0.5 + 0.5 * scarcity;
      r.gdpPerCapita *= growth * (1 - scratch.damageFraction) * constraintFactor;
    }
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @earth-alliance/engine test -- economy`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(engine): add economy sub-model

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 11: Demography sub-model

**Files:**
- Create: `packages/engine/src/models/demography.ts`
- Test: `packages/engine/test/models/demography.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/engine/test/models/demography.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { demography } from '../../src/models/demography.js';
import { makeRegion, makeState, makeContext } from '../fixtures.js';

describe('demography', () => {
  it('grows population when fertility and health are high', () => {
    const state = makeState({ regions: [makeRegion({ id: 'r1', population: 1e9, fertilityRate: 4.1, healthIndex: 50, educationIndex: 80 })] });
    const ctx = makeContext(state);
    demography.step(ctx);
    // popGrowth = (4.1-2.1)*0.01 + 0 = 0.02; 1e9 * 1.02^5 = 1,104,080,803.2
    // Population is ~1.1 billion; assert to a sensible tolerance (±50), not bit-exactness.
    expect(state.regions[0]!.population).toBeCloseTo(1.1040808e9, -2);
    expect(ctx.scratch.prevPopulation['r1']).toBe(1e9);
  });

  it('lowers fertility through the education-driven transition (floor 1.5)', () => {
    const state = makeState({ regions: [makeRegion({ fertilityRate: 4.1, educationIndex: 80 })] });
    demography.step(makeContext(state));
    // 4.1 - 0.01*0.8*5 = 4.06
    expect(state.regions[0]!.fertilityRate).toBeCloseTo(4.06, 5);

    const low = makeState({ regions: [makeRegion({ fertilityRate: 1.51, educationIndex: 100 })] });
    demography.step(makeContext(low));
    expect(low.regions[0]!.fertilityRate).toBe(1.5);
  });

  it('ages the population', () => {
    const state = makeState({ regions: [makeRegion({ medianAge: 30, fertilityRate: 1.4 })] });
    demography.step(makeContext(state));
    expect(state.regions[0]!.medianAge).toBeGreaterThan(30);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @earth-alliance/engine test -- demography`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write the implementation**

`packages/engine/src/models/demography.ts`:
```ts
import type { SubModel } from './types.js';
import { clamp } from '../math.js';

/** (F) Population, fertility, ageing, education drift. */
export const demography: SubModel = {
  id: 'demography',
  step({ state, params, scratch }) {
    const y = params.TURN_YEARS;
    for (const r of state.regions) {
      scratch.prevPopulation[r.id] = r.population;
      const popGrowth = clamp(
        (r.fertilityRate - 2.1) * params.FERT_W + (r.healthIndex - 50) * params.HEALTH_W,
        -0.02, 0.04,
      );
      r.population *= Math.pow(1 + popGrowth, y);
      r.fertilityRate = Math.max(1.5, r.fertilityRate - params.DEMO_TRANSITION * (r.educationIndex / 100) * y);
      r.medianAge += params.AGEING_RATE * y * (r.fertilityRate < 2.1 ? 1 : 0.3);
      r.educationIndex = clamp(r.educationIndex + params.EDU_GROWTH * y * (r.gdpPerCapita > 10000 ? 1 : 0.3), 0, 100);
    }
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @earth-alliance/engine test -- demography`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(engine): add demography sub-model

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 12: Emissions sub-model

**Files:**
- Create: `packages/engine/src/models/emissions.ts`
- Test: `packages/engine/test/models/emissions.test.ts`

> Depends on scratch.prevGdpPerCapita (economy) and scratch.prevPopulation (demography), so it runs after both.

- [ ] **Step 1: Write the failing test**

`packages/engine/test/models/emissions.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { emissions } from '../../src/models/emissions.js';
import { makeRegion, makeState, makeContext } from '../fixtures.js';

describe('emissions', () => {
  it('scales emissions with output growth, minus autonomous decarbonization', () => {
    const state = makeState({ regions: [makeRegion({ id: 'r1', gdpPerCapita: 55000, population: 1.1e9, regionalEmissions: 10 })] });
    const ctx = makeContext(state, {
      prevGdpPerCapita: { r1: 50000 },
      prevPopulation: { r1: 1e9 },
    });
    emissions.step(ctx);
    // outputRatio = (55000*1.1e9)/(50000*1e9) = 1.21; *0.99^5 = 0.95099
    // 10 * 1.21 * 0.95099 = 11.5070
    expect(state.regions[0]!.regionalEmissions).toBeCloseTo(11.5070, 3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @earth-alliance/engine test -- emissions`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write the implementation**

`packages/engine/src/models/emissions.ts`:
```ts
import type { SubModel } from './types.js';

/** (E) Re-derive each region's emissions from economic output and autonomous decarbonization. */
export const emissions: SubModel = {
  id: 'emissions',
  step({ state, params, scratch }) {
    const decarb = Math.pow(1 - params.AUTON_DECARB, params.TURN_YEARS);
    for (const r of state.regions) {
      const prevGdp = scratch.prevGdpPerCapita[r.id] ?? r.gdpPerCapita;
      const prevPop = scratch.prevPopulation[r.id] ?? r.population;
      const outputRatio = (r.gdpPerCapita * r.population) / (prevGdp * prevPop);
      r.regionalEmissions = r.regionalEmissions * outputRatio * decarb;
    }
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @earth-alliance/engine test -- emissions`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(engine): add emissions re-derivation sub-model

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 13: Constraints sub-model (water + land)

**Files:**
- Create: `packages/engine/src/models/constraints.ts`
- Test: `packages/engine/test/models/constraints.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/engine/test/models/constraints.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { constraints } from '../../src/models/constraints.js';
import { makeRegion, makeState, makeContext } from '../fixtures.js';

describe('constraints', () => {
  it('reduces water from warming and population pressure', () => {
    const state = makeState({ regions: [makeRegion({ id: 'r1', waterAvailability: 70, population: 1.05e9 })] });
    const ctx = makeContext(state, { deltaTemperature: 0.5, prevPopulation: { r1: 1e9 } });
    constraints.step(ctx);
    // water -= 5*0.5 + 5*0.05 = 2.5 + 0.25 = 2.75
    expect(state.regions[0]!.waterAvailability).toBeCloseTo(67.25, 5);
  });

  it('reduces land from warming only', () => {
    const state = makeState({ regions: [makeRegion({ id: 'r1', landAvailability: 75, population: 1e9 })] });
    const ctx = makeContext(state, { deltaTemperature: 0.5, prevPopulation: { r1: 1e9 } });
    constraints.step(ctx);
    // land -= 3*0.5 = 1.5
    expect(state.regions[0]!.landAvailability).toBeCloseTo(73.5, 5);
  });

  it('clamps at 0 and ignores cooling turns', () => {
    const state = makeState({ regions: [makeRegion({ id: 'r1', waterAvailability: 1, landAvailability: 1, population: 1e9 })] });
    const ctx = makeContext(state, { deltaTemperature: -0.5, prevPopulation: { r1: 1e9 } });
    constraints.step(ctx);
    expect(state.regions[0]!.waterAvailability).toBeGreaterThanOrEqual(0);
    expect(state.regions[0]!.landAvailability).toBeGreaterThanOrEqual(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @earth-alliance/engine test -- constraints`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write the implementation**

`packages/engine/src/models/constraints.ts`:
```ts
import type { SubModel } from './types.js';
import { clamp } from '../math.js';

/** (G) Warming and population pressure degrade water; warming degrades land. */
export const constraints: SubModel = {
  id: 'constraints',
  step({ state, params, scratch }) {
    const warming = Math.max(0, scratch.deltaTemperature);
    for (const r of state.regions) {
      const prevPop = scratch.prevPopulation[r.id] ?? r.population;
      const popGrowth = Math.max(0, r.population / prevPop - 1);
      r.waterAvailability = clamp(
        r.waterAvailability - params.WATER_TEMP_LOSS * warming - params.POP_PRESSURE * popGrowth,
        0, 100,
      );
      r.landAvailability = clamp(r.landAvailability - params.LAND_DEGRADE * warming, 0, 100);
    }
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @earth-alliance/engine test -- constraints`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(engine): add constraints sub-model

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 14: Biodiversity sub-model

**Files:**
- Create: `packages/engine/src/models/biodiversity.ts`
- Test: `packages/engine/test/models/biodiversity.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/engine/test/models/biodiversity.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { biodiversity } from '../../src/models/biodiversity.js';
import { makeRegion, makeState, makeContext } from '../fixtures.js';

describe('biodiversity', () => {
  it('declines with warming', () => {
    const state = makeState({ regions: [makeRegion({ biodiversityIndex: 55 })] });
    const ctx = makeContext(state, { deltaTemperature: 0.5 });
    biodiversity.step(ctx);
    // 55 - 8*0.5 = 51
    expect(state.regions[0]!.biodiversityIndex).toBeCloseTo(51, 5);
  });

  it('does not change on cooling turns and clamps at 0', () => {
    const state = makeState({ regions: [makeRegion({ biodiversityIndex: 2 })] });
    const cool = makeContext(state, { deltaTemperature: -0.5 });
    biodiversity.step(cool);
    expect(state.regions[0]!.biodiversityIndex).toBe(2);

    const state2 = makeState({ regions: [makeRegion({ biodiversityIndex: 1 })] });
    const hot = makeContext(state2, { deltaTemperature: 1 });
    biodiversity.step(hot);
    expect(state2.regions[0]!.biodiversityIndex).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @earth-alliance/engine test -- biodiversity`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write the implementation**

`packages/engine/src/models/biodiversity.ts`:
```ts
import type { SubModel } from './types.js';
import { clamp } from '../math.js';

/** (G) Warming erodes ecosystem health. Policy restoration is applied via effects. */
export const biodiversity: SubModel = {
  id: 'biodiversity',
  step({ state, params, scratch }) {
    const warming = Math.max(0, scratch.deltaTemperature);
    for (const r of state.regions) {
      r.biodiversityIndex = clamp(r.biodiversityIndex - params.BIO_TEMP_LOSS * warming, 0, 100);
    }
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @earth-alliance/engine test -- biodiversity`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(engine): add biodiversity sub-model

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 15: Support + equity sub-model

**Files:**
- Create: `packages/engine/src/models/support.ts`
- Test: `packages/engine/test/models/support.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/engine/test/models/support.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { support } from '../../src/models/support.js';
import { makeRegion, makeState, makeContext } from '../fixtures.js';

describe('support', () => {
  it('drops with warming when growth is flat', () => {
    const state = makeState({ regions: [makeRegion({ id: 'r1', publicSupport: 50, equityIndex: 50, gdpPerCapita: 50000 })] });
    const ctx = makeContext(state, { deltaTemperature: 0.5, prevGdpPerCapita: { r1: 50000 } });
    support.step(ctx);
    // 50 - 20*0.5 + 20*0 + 0.1*0 = 40
    expect(state.regions[0]!.publicSupport).toBeCloseTo(40, 5);
  });

  it('rises with economic growth', () => {
    const state = makeState({ regions: [makeRegion({ id: 'r1', publicSupport: 50, equityIndex: 50, gdpPerCapita: 55000 })] });
    const ctx = makeContext(state, { deltaTemperature: 0, prevGdpPerCapita: { r1: 50000 } });
    support.step(ctx);
    // econGrowth = 0.1; 50 + 20*0.1 = 52
    expect(state.regions[0]!.publicSupport).toBeCloseTo(52, 5);
  });

  it('erodes equity when the economy grows (inequality drift), clamped 0–100', () => {
    const state = makeState({ regions: [makeRegion({ id: 'r1', equityIndex: 50, gdpPerCapita: 55000 })] });
    const ctx = makeContext(state, { deltaTemperature: 0, prevGdpPerCapita: { r1: 50000 } });
    support.step(ctx);
    // equity -= 5 * 0.1 = 0.5
    expect(state.regions[0]!.equityIndex).toBeCloseTo(49.5, 5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @earth-alliance/engine test -- support`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write the implementation**

`packages/engine/src/models/support.ts`:
```ts
import type { SubModel } from './types.js';
import { clamp } from '../math.js';

/** (H) Public support reacts to warming, prosperity, and equity; equity erodes with growth. */
export const support: SubModel = {
  id: 'support',
  step({ state, params, scratch }) {
    const warming = Math.max(0, scratch.deltaTemperature);
    for (const r of state.regions) {
      const prevGdp = scratch.prevGdpPerCapita[r.id] ?? r.gdpPerCapita;
      const econGrowth = r.gdpPerCapita / prevGdp - 1;
      r.publicSupport = clamp(
        r.publicSupport
          - params.SUPPORT_TEMP_W * warming
          + params.SUPPORT_ECON_W * econGrowth
          + params.SUPPORT_EQUITY_W * (r.equityIndex - 50),
        0, 100,
      );
      r.equityIndex = clamp(r.equityIndex - params.INEQUALITY_DRIFT * Math.max(0, econGrowth), 0, 100);
    }
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @earth-alliance/engine test -- support`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(engine): add support and equity sub-model

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 16: Resources sub-model

**Files:**
- Create: `packages/engine/src/models/resources.ts`
- Test: `packages/engine/test/models/resources.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/engine/test/models/resources.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { resources } from '../../src/models/resources.js';
import { makeRegion, makeState, makeContext } from '../fixtures.js';

describe('resources', () => {
  it('regenerates political capital from population-weighted support', () => {
    const state = makeState({
      regions: [makeRegion({ publicSupport: 60, population: 1e9, gdpPerCapita: 50000 })],
      resources: { politicalCapital: 0, money: 0 },
    });
    const ctx = makeContext(state);
    resources.step(ctx);
    // 10 + 0.5*60 = 40
    expect(state.resources.politicalCapital).toBeCloseTo(40, 5);
  });

  it('regenerates money from taxed GDP', () => {
    const state = makeState({
      regions: [makeRegion({ publicSupport: 60, population: 1e9, gdpPerCapita: 50000 })],
      resources: { politicalCapital: 0, money: 0 },
    });
    const ctx = makeContext(state);
    resources.step(ctx);
    // 0.02 * (50000*1e9) / 1e9 = 1000
    expect(state.resources.money).toBeCloseTo(1000, 5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @earth-alliance/engine test -- resources`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write the implementation**

`packages/engine/src/models/resources.ts`:
```ts
import type { SubModel } from './types.js';

/** (I) Regenerate political capital (from support) and money (from taxed GDP). */
export const resources: SubModel = {
  id: 'resources',
  step({ state, params }) {
    let supportPop = 0;
    let totalPop = 0;
    let taxable = 0;
    for (const r of state.regions) {
      supportPop += r.publicSupport * r.population;
      totalPop += r.population;
      taxable += r.gdpPerCapita * r.population;
    }
    const avgSupport = totalPop > 0 ? supportPop / totalPop : 0;
    state.resources.politicalCapital += params.CAPITAL_BASE + params.CAPITAL_PER_SUPPORT * avgSupport;
    state.resources.money += (params.TAX_RATE * taxable) / params.MONEY_SCALE;
  },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @earth-alliance/engine test -- resources`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(engine): add resource-regeneration sub-model

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 17: Model pipeline

**Files:**
- Create: `packages/engine/src/models/pipeline.ts`
- Test: `packages/engine/test/pipeline.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/engine/test/pipeline.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { DEFAULT_MODELS } from '../src/models/pipeline.js';

describe('DEFAULT_MODELS', () => {
  it('runs the ten sub-models in the documented order', () => {
    expect(DEFAULT_MODELS.map((m) => m.id)).toEqual([
      'carbonCycle', 'climate', 'damage', 'economy', 'demography',
      'emissions', 'constraints', 'biodiversity', 'support', 'resources',
    ]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @earth-alliance/engine test -- pipeline`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write the implementation**

`packages/engine/src/models/pipeline.ts`:
```ts
import type { SubModel } from './types.js';
import { carbonCycle } from './carbonCycle.js';
import { climate } from './climate.js';
import { damage } from './damage.js';
import { economy } from './economy.js';
import { demography } from './demography.js';
import { emissions } from './emissions.js';
import { constraints } from './constraints.js';
import { biodiversity } from './biodiversity.js';
import { support } from './support.js';
import { resources } from './resources.js';

/** The default world-model pipeline, run in order each turn. Swap entries to change fidelity. */
export const DEFAULT_MODELS: readonly SubModel[] = [
  carbonCycle, climate, damage, economy, demography,
  emissions, constraints, biodiversity, support, resources,
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @earth-alliance/engine test -- pipeline`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(engine): assemble default model pipeline

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 18: Policy catalog, availability, validation

**Files:**
- Create: `packages/engine/src/policies.ts`
- Test: `packages/engine/test/policies.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/engine/test/policies.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { POLICY_CATALOG, getAvailablePolicies, validateSelection } from '../src/policies.js';
import { makeState } from './fixtures.js';

describe('policy catalog', () => {
  it('has unique ids and non-negative costs', () => {
    const ids = new Set(POLICY_CATALOG.map((p) => p.id));
    expect(ids.size).toBe(POLICY_CATALOG.length);
    for (const p of POLICY_CATALOG) {
      expect(p.cost.politicalCapital).toBeGreaterThanOrEqual(0);
      expect(p.cost.money).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('getAvailablePolicies', () => {
  it('hides policies whose prerequisites are not yet enacted', () => {
    const state = makeState();
    const ids = getAvailablePolicies(state).map((p) => p.id);
    expect(ids).toContain('orbital-infrastructure');
    expect(ids).not.toContain('off-world-colonies'); // needs orbital-infrastructure
  });

  it('reveals a policy once its prerequisite is enacted', () => {
    const state = makeState({ enactedPolicyIds: ['orbital-infrastructure'] });
    const ids = getAvailablePolicies(state).map((p) => p.id);
    expect(ids).toContain('off-world-colonies');
  });
});

describe('validateSelection', () => {
  it('rejects unknown policy ids', () => {
    const state = makeState();
    expect(validateSelection(state, ['nope']).ok).toBe(false);
  });

  it('rejects selections that exceed resources', () => {
    const state = makeState({ resources: { politicalCapital: 5, money: 5 } });
    const result = validateSelection(state, ['nuclear-buildout']);
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/afford|capital|money/i);
  });

  it('accepts an affordable, available selection', () => {
    const state = makeState({ resources: { politicalCapital: 100, money: 100 } });
    expect(validateSelection(state, ['reforestation']).ok).toBe(true);
  });

  it('rejects a policy whose prerequisite is missing', () => {
    const state = makeState({ resources: { politicalCapital: 100, money: 100 } });
    expect(validateSelection(state, ['off-world-colonies']).ok).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @earth-alliance/engine test -- policies`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write the implementation**

`packages/engine/src/policies.ts`:
```ts
import type { Policy, WorldState } from './types.js';

export const POLICY_CATALOG: readonly Policy[] = [
  {
    id: 'carbon-tax', name: 'Carbon Tax', category: 'industry',
    description: 'Price carbon to cut emissions; unpopular up front.',
    art: 'carbon-tax', cost: { politicalCapital: 15, money: 5 }, scope: 'global',
    effects: [
      { target: 'regionalEmissions', delta: -0.4, duration: 'ongoing' },
      { target: 'publicSupport', delta: -3, duration: 'immediate' },
    ],
  },
  {
    id: 'renewable-subsidy', name: 'Renewable Subsidy', category: 'energy',
    description: 'Fund wind and solar deployment.',
    art: 'renewable-subsidy', cost: { politicalCapital: 10, money: 20 }, scope: 'global',
    effects: [{ target: 'regionalEmissions', delta: -0.6, duration: 'ongoing' }],
  },
  {
    id: 'nuclear-buildout', name: 'Nuclear Buildout', category: 'energy',
    description: 'Large baseload decarbonization at high cost.',
    art: 'nuclear-buildout', cost: { politicalCapital: 20, money: 40 }, scope: 'global',
    effects: [{ target: 'regionalEmissions', delta: -1.0, duration: 'ongoing' }],
  },
  {
    id: 'reforestation', name: 'Reforestation', category: 'land',
    description: 'Restore forests as a carbon sink and habitat.',
    art: 'reforestation', cost: { politicalCapital: 8, money: 15 }, scope: 'global',
    effects: [
      { target: 'regionalEmissions', delta: -0.3, duration: 'ongoing' },
      { target: 'biodiversityIndex', delta: 2, duration: 'ongoing' },
    ],
  },
  {
    id: 'public-transit', name: 'Public Transit', category: 'industry',
    description: 'Shift travel off private cars.',
    art: 'public-transit', cost: { politicalCapital: 10, money: 15 }, scope: 'global',
    effects: [
      { target: 'regionalEmissions', delta: -0.3, duration: 'ongoing' },
      { target: 'publicSupport', delta: 2, duration: 'immediate' },
    ],
  },
  {
    id: 'climate-adaptation', name: 'Climate Adaptation Fund', category: 'social',
    description: 'Buffer communities against climate shocks.',
    art: 'climate-adaptation', cost: { politicalCapital: 8, money: 25 }, scope: 'global',
    effects: [
      { target: 'healthIndex', delta: 2, duration: 'ongoing' },
      { target: 'waterAvailability', delta: 1, duration: 'ongoing' },
    ],
  },
  {
    id: 'universal-education', name: 'Universal Education', category: 'social',
    description: 'Compounding investment in people.',
    art: 'universal-education', cost: { politicalCapital: 12, money: 20 }, scope: 'global',
    effects: [
      { target: 'educationIndex', delta: 1.5, duration: 'ongoing' },
      { target: 'equityIndex', delta: 1, duration: 'ongoing' },
    ],
  },
  {
    id: 'degrowth-mandate', name: 'Degrowth Mandate', category: 'social',
    description: 'Slash emissions by curbing output; politically costly.',
    art: 'degrowth-mandate', cost: { politicalCapital: 30, money: 0 }, scope: 'global',
    effects: [
      { target: 'regionalEmissions', delta: -1.5, duration: 'ongoing' },
      { target: 'gdpPerCapita', delta: -2000, duration: 'immediate' },
      { target: 'publicSupport', delta: -8, duration: 'immediate' },
    ],
  },
  {
    id: 'orbital-infrastructure', name: 'Orbital Infrastructure', category: 'frontier',
    description: 'Build the launch and orbital base for off-world expansion.',
    art: 'orbital-infrastructure', cost: { politicalCapital: 25, money: 60 }, scope: 'global',
    effects: [{ target: 'educationIndex', delta: 1, duration: 'ongoing' }],
  },
  {
    id: 'off-world-colonies', name: 'Off-World Colonies', category: 'frontier',
    description: 'Settle beyond Earth — a refuge for those who can leave.',
    art: 'off-world-colonies', cost: { politicalCapital: 30, money: 80 }, scope: 'global',
    prerequisites: ['orbital-infrastructure'],
    effects: [{ target: 'gdpPerCapita', delta: 3000, duration: 'ongoing' }],
  },
];

const BY_ID = new Map(POLICY_CATALOG.map((p) => [p.id, p]));

export function getAvailablePolicies(state: WorldState): Policy[] {
  return POLICY_CATALOG.filter(
    (p) =>
      !state.enactedPolicyIds.includes(p.id) &&
      (p.prerequisites ?? []).every((req) => state.enactedPolicyIds.includes(req)),
  );
}

export interface ValidationResult {
  ok: boolean;
  reason?: string;
}

export function validateSelection(state: WorldState, policyIds: string[]): ValidationResult {
  let totalPc = 0;
  let totalMoney = 0;
  for (const id of policyIds) {
    const policy = BY_ID.get(id);
    if (!policy) return { ok: false, reason: `Unknown policy: ${id}` };
    if (state.enactedPolicyIds.includes(id)) return { ok: false, reason: `Already enacted: ${id}` };
    for (const req of policy.prerequisites ?? []) {
      if (!state.enactedPolicyIds.includes(req)) {
        return { ok: false, reason: `${policy.name} requires ${req}` };
      }
    }
    totalPc += policy.cost.politicalCapital;
    totalMoney += policy.cost.money;
  }
  if (totalPc > state.resources.politicalCapital) {
    return { ok: false, reason: 'Not enough political capital' };
  }
  if (totalMoney > state.resources.money) {
    return { ok: false, reason: 'Not enough money' };
  }
  return { ok: true };
}

export function getPolicy(id: string): Policy | undefined {
  return BY_ID.get(id);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @earth-alliance/engine test -- policies`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(engine): add policy catalog, availability, and validation

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 19: Effects — spend, register, apply

**Files:**
- Create: `packages/engine/src/effects.ts`
- Test: `packages/engine/test/effects.test.ts`

> `spendAndRegister` deducts cost, records enacted policies, pushes ongoing effects into `state.activeEffects`, and returns this turn's immediate effects. `applyEffects` applies those immediate effects plus all active ongoing effects, then ticks/expires ongoing effects.

- [ ] **Step 1: Write the failing test**

`packages/engine/test/effects.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { spendAndRegister, applyEffects } from '../src/effects.js';
import { makeRegion, makeState } from './fixtures.js';
import type { ActiveEffect } from '../src/types.js';

describe('spendAndRegister', () => {
  it('deducts cost and records the enacted policy', () => {
    const state = makeState({ resources: { politicalCapital: 100, money: 100 } });
    spendAndRegister(state, ['renewable-subsidy']);
    expect(state.resources.politicalCapital).toBe(90); // -10
    expect(state.resources.money).toBe(80);            // -20
    expect(state.enactedPolicyIds).toContain('renewable-subsidy');
  });

  it('registers ongoing effects and returns immediate ones', () => {
    const state = makeState({ resources: { politicalCapital: 100, money: 100 } });
    const immediate = spendAndRegister(state, ['carbon-tax']);
    expect(state.activeEffects).toHaveLength(1); // ongoing emissions cut
    expect(state.activeEffects[0]!.effect.target).toBe('regionalEmissions');
    expect(immediate).toHaveLength(1);           // immediate support hit
    expect(immediate[0]!.effect.target).toBe('publicSupport');
  });
});

describe('applyEffects', () => {
  it('applies an immediate effect once to all regions', () => {
    const state = makeState({ regions: [makeRegion({ publicSupport: 50 }), makeRegion({ id: 'r2', publicSupport: 50 })] });
    applyEffects(state, [{ policyId: 'x', regionId: null, effect: { target: 'publicSupport', delta: -3, duration: 'immediate' }, turnsRemaining: 0 }]);
    expect(state.regions[0]!.publicSupport).toBe(47);
    expect(state.regions[1]!.publicSupport).toBe(47);
  });

  it('applies and expires ongoing effects on schedule', () => {
    const state = makeState({ regions: [makeRegion({ regionalEmissions: 10 })] });
    const active: ActiveEffect = { policyId: 'x', regionId: null, effect: { target: 'regionalEmissions', delta: -1, duration: 'ongoing', turns: 2 }, turnsRemaining: 2 };
    state.activeEffects = [active];

    applyEffects(state, []);
    expect(state.regions[0]!.regionalEmissions).toBe(9);
    expect(state.activeEffects[0]!.turnsRemaining).toBe(1);

    applyEffects(state, []);
    expect(state.regions[0]!.regionalEmissions).toBe(8);
    expect(state.activeEffects).toHaveLength(0); // expired
  });

  it('clamps 0–100 targets but lets emissions go negative', () => {
    const state = makeState({ regions: [makeRegion({ biodiversityIndex: 99, regionalEmissions: 0.5 })] });
    applyEffects(state, [
      { policyId: 'x', regionId: null, effect: { target: 'biodiversityIndex', delta: 5, duration: 'immediate' }, turnsRemaining: 0 },
      { policyId: 'y', regionId: null, effect: { target: 'regionalEmissions', delta: -1, duration: 'immediate' }, turnsRemaining: 0 },
    ]);
    expect(state.regions[0]!.biodiversityIndex).toBe(100);
    expect(state.regions[0]!.regionalEmissions).toBeCloseTo(-0.5, 5);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @earth-alliance/engine test -- effects`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write the implementation**

`packages/engine/src/effects.ts`:
```ts
import type { ActiveEffect, EffectTarget, Region, WorldState } from './types.js';
import { clamp } from './math.js';
import { getPolicy } from './policies.js';

const CLAMPED_TARGETS: ReadonlySet<EffectTarget> = new Set([
  'biodiversityIndex', 'publicSupport', 'equityIndex',
  'waterAvailability', 'landAvailability', 'educationIndex', 'healthIndex',
]);

function applyToRegion(region: Region, target: EffectTarget, delta: number): void {
  const next = region[target] + delta;
  region[target] = CLAMPED_TARGETS.has(target) ? clamp(next, 0, 100) : next;
}

/** Deduct cost, record enacted policies, queue ongoing effects; return this turn's immediate effects. */
export function spendAndRegister(state: WorldState, policyIds: string[]): ActiveEffect[] {
  const immediate: ActiveEffect[] = [];
  for (const id of policyIds) {
    const policy = getPolicy(id);
    if (!policy) continue;
    state.resources.politicalCapital -= policy.cost.politicalCapital;
    state.resources.money -= policy.cost.money;
    state.enactedPolicyIds.push(id);
    for (const effect of policy.effects) {
      const entry: ActiveEffect = {
        policyId: id,
        regionId: policy.scope === 'global' ? null : state.regions[0]!.id,
        effect,
        turnsRemaining: effect.turns ?? Number.POSITIVE_INFINITY,
      };
      if (effect.duration === 'immediate') immediate.push(entry);
      else state.activeEffects.push(entry);
    }
  }
  return immediate;
}

/** Apply this turn's immediate effects plus all active ongoing effects; tick + expire ongoing. */
export function applyEffects(state: WorldState, immediate: ActiveEffect[]): void {
  const apply = (entry: ActiveEffect): void => {
    const targets = entry.regionId === null
      ? state.regions
      : state.regions.filter((r) => r.id === entry.regionId);
    for (const region of targets) applyToRegion(region, entry.effect.target, entry.effect.delta);
  };

  for (const entry of immediate) apply(entry);

  for (const entry of state.activeEffects) {
    apply(entry);
    entry.turnsRemaining -= 1;
  }
  state.activeEffects = state.activeEffects.filter((e) => e.turnsRemaining > 0);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @earth-alliance/engine test -- effects`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(engine): add policy effect spend/register/apply

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 20: Endings + evaluator

**Files:**
- Create: `packages/engine/src/endings.ts`
- Test: `packages/engine/test/endings.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/engine/test/endings.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { evaluateEnding } from '../src/endings.js';
import { makeRegion, makeState } from './fixtures.js';

function regionsWith(props: Parameters<typeof makeRegion>[0]) {
  return [makeRegion(props)];
}

describe('evaluateEnding', () => {
  it('returns null mid-game when no loss condition is met', () => {
    const state = makeState({ year: 2100 });
    state.climate.temperatureAnomaly = 2.0;
    expect(evaluateEnding(state)).toBeNull();
  });

  it('triggers eco-collapse early when warming is extreme', () => {
    const state = makeState({ year: 2100 });
    state.climate.temperatureAnomaly = 3.6;
    expect(evaluateEnding(state)?.id).toBe('eco-collapse');
  });

  it('triggers economic-ruin early when support collapses', () => {
    const state = makeState({ year: 2100, regions: regionsWith({ publicSupport: 5 }) });
    state.climate.temperatureAnomaly = 2.0;
    expect(evaluateEnding(state)?.id).toBe('economic-ruin');
  });

  it('awards green-utopia at the end when all is well', () => {
    const state = makeState({
      year: 2200,
      regions: regionsWith({ biodiversityIndex: 60, equityIndex: 65, gdpPerCapita: 40000 }),
    });
    state.climate.temperatureAnomaly = 1.8;
    expect(evaluateEnding(state)?.id).toBe('green-utopia');
  });

  it('awards orbital-exodus only when off-world-colonies was enacted on a degrading rich world', () => {
    const base = {
      year: 2200,
      enactedPolicyIds: ['orbital-infrastructure', 'off-world-colonies'],
      regions: regionsWith({ gdpPerCapita: 45000, educationIndex: 80, biodiversityIndex: 30 }),
    };
    const exodus = makeState(base);
    exodus.climate.temperatureAnomaly = 2.7;
    expect(evaluateEnding(exodus)?.id).toBe('orbital-exodus');

    const noColony = makeState({ ...base, enactedPolicyIds: ['orbital-infrastructure'] });
    noColony.climate.temperatureAnomaly = 2.7;
    expect(evaluateEnding(noColony)?.id).not.toBe('orbital-exodus');
  });

  it('falls back to muddling-through at the end', () => {
    const state = makeState({ year: 2200, regions: regionsWith({ biodiversityIndex: 30, equityIndex: 45, publicSupport: 50 }) });
    state.climate.temperatureAnomaly = 2.8;
    expect(evaluateEnding(state)?.id).toBe('muddling-through');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @earth-alliance/engine test -- endings`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write the implementation**

`packages/engine/src/endings.ts`:
```ts
import type { Ending, Region, WorldState } from './types.js';
import { END_YEAR } from './data/scenario.js';

export const ENDINGS: Record<string, Ending> = {
  'eco-collapse': { id: 'eco-collapse', title: 'Ecological Collapse', kind: 'loss',
    description: 'Runaway warming and dying ecosystems overwhelmed civilization.' },
  'economic-ruin': { id: 'economic-ruin', title: 'Economic Ruin', kind: 'loss',
    description: 'Society fractured under economic collapse and lost legitimacy.' },
  'orbital-exodus': { id: 'orbital-exodus', title: 'Orbital Exodus', kind: 'ambiguous',
    description: 'A wealthy few escaped to the stars while Earth was left to burn.' },
  'green-utopia': { id: 'green-utopia', title: 'Green Utopia', kind: 'win',
    description: 'A thriving, equitable world within safe planetary limits.' },
  'authoritarian-stability': { id: 'authoritarian-stability', title: 'Authoritarian Stability', kind: 'ambiguous',
    description: 'Targets were met, but only by crushing dissent and equity.' },
  'muddling-through': { id: 'muddling-through', title: 'Muddling Through', kind: 'ambiguous',
    description: 'Humanity survived the century — battered, unequal, but standing.' },
};

function weightedAvg(regions: readonly Region[], pick: (r: Region) => number): number {
  let acc = 0;
  let pop = 0;
  for (const r of regions) {
    acc += pick(r) * r.population;
    pop += r.population;
  }
  return pop > 0 ? acc / pop : 0;
}

/** Returns an Ending if the game should end (loss any turn; resolution at END_YEAR), else null. */
export function evaluateEnding(state: WorldState): Ending | null {
  const t = state.climate.temperatureAnomaly;
  const biodiversity = weightedAvg(state.regions, (r) => r.biodiversityIndex);
  const support = weightedAvg(state.regions, (r) => r.publicSupport);
  const equity = weightedAvg(state.regions, (r) => r.equityIndex);
  const gdp = weightedAvg(state.regions, (r) => r.gdpPerCapita);
  const education = weightedAvg(state.regions, (r) => r.educationIndex);

  // Early-loss conditions — can fire any turn.
  if (t >= 3.5 || biodiversity <= 15) return ENDINGS['eco-collapse']!;
  if (support <= 10 || gdp <= 2000) return ENDINGS['economic-ruin']!;

  if (state.year < END_YEAR) return null;

  // Resolution at the final turn, in priority order.
  if (state.enactedPolicyIds.includes('off-world-colonies') && t >= 2.5 && gdp >= 40000 && education >= 75) {
    return ENDINGS['orbital-exodus']!;
  }
  if (t < 2.0 && biodiversity >= 55 && equity >= 60 && gdp >= 30000) {
    return ENDINGS['green-utopia']!;
  }
  if (t < 3.0 && support < 35) return ENDINGS['authoritarian-stability']!;
  if (t < 3.0) return ENDINGS['muddling-through']!;
  return ENDINGS['eco-collapse']!;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @earth-alliance/engine test -- endings`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(engine): add endings and evaluator

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 21: advanceTurn orchestrator + createSimulation

**Files:**
- Create: `packages/engine/src/simulation.ts`
- Test: `packages/engine/test/simulation.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/engine/test/simulation.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { advanceTurn } from '../src/simulation.js';
import { createInitialState } from '../src/state.js';
import { validateSelection } from '../src/policies.js';

describe('advanceTurn', () => {
  it('advances the clock by one 5-year turn', () => {
    const s0 = createInitialState();
    const { state: s1 } = advanceTurn(s0, []);
    expect(s1.turn).toBe(1);
    expect(s1.year).toBe(2030);
  });

  it('does not mutate the input state', () => {
    const s0 = createInitialState();
    advanceTurn(s0, []);
    expect(s0.turn).toBe(0);
    expect(s0.year).toBe(2025);
  });

  it('raises CO2 and temperature on a do-nothing turn', () => {
    const s0 = createInitialState();
    const { state: s1 } = advanceTurn(s0, []);
    expect(s1.climate.co2Concentration).toBeGreaterThan(s0.climate.co2Concentration);
    expect(s1.climate.temperatureAnomaly).toBeGreaterThan(s0.climate.temperatureAnomaly);
  });

  it('keeps annualEmissions equal to the sum of regional emissions', () => {
    const s0 = createInitialState();
    const { state: s1 } = advanceTurn(s0, []);
    const sum = s1.regions.reduce((a, r) => a + r.regionalEmissions, 0);
    expect(s1.climate.annualEmissions).toBeCloseTo(sum, 6);
  });

  it('spends resources when a policy is enacted', () => {
    const s0 = createInitialState();
    expect(validateSelection(s0, ['renewable-subsidy']).ok).toBe(true);
    const { state: s1 } = advanceTurn(s0, ['renewable-subsidy']);
    expect(s1.enactedPolicyIds).toContain('renewable-subsidy');
  });

  it('throws on an invalid selection', () => {
    const s0 = createInitialState();
    expect(() => advanceTurn(s0, ['does-not-exist'])).toThrow();
  });

  it('sets status to ended and records the ending id at resolution', () => {
    let state = createInitialState();
    for (let i = 0; i < 35; i++) state = advanceTurn(state, []).state;
    expect(state.year).toBe(2200);
    expect(state.status).toBe('ended');
    expect(state.endingId).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @earth-alliance/engine test -- simulation`
Expected: FAIL — cannot find module.

- [ ] **Step 3: Write the implementation**

`packages/engine/src/simulation.ts`:
```ts
import type { GameEvent, WorldState } from './types.js';
import type { ModelParams, SubModel } from './models/types.js';
import { createScratch } from './models/types.js';
import { DEFAULT_MODELS } from './models/pipeline.js';
import { DEFAULT_PARAMS } from './data/scenario.js';
import { createRng } from './rng.js';
import { spendAndRegister, applyEffects } from './effects.js';
import { validateSelection } from './policies.js';
import { evaluateEnding } from './endings.js';

export interface AdvanceResult {
  state: WorldState;
  events: GameEvent[];
}

export interface Simulation {
  advanceTurn(state: WorldState, policyIds: string[]): AdvanceResult;
}

export function createSimulation(
  models: readonly SubModel[] = DEFAULT_MODELS,
  params: ModelParams = DEFAULT_PARAMS,
): Simulation {
  return {
    advanceTurn(state, policyIds) {
      const validation = validateSelection(state, policyIds);
      if (!validation.ok) throw new Error(validation.reason ?? 'Invalid policy selection');

      const draft: WorldState = structuredClone(state);
      const events: GameEvent[] = [];

      // 1–2: spend + register effects (immediate applied after the natural models).
      const immediate = spendAndRegister(draft, policyIds);

      // 3–12: run the swappable world-model pipeline.
      const rng = createRng(draft.rngSeed);
      const ctx = { state: draft, params, rng, scratch: createScratch() };
      for (const model of models) model.step(ctx);

      // 13: layer policy effects on top of the natural dynamics.
      applyEffects(draft, immediate);

      // 14: annual emissions are always derived from regional emissions.
      draft.climate.annualEmissions = draft.regions.reduce((a, r) => a + r.regionalEmissions, 0);

      // 15–16: persist RNG, advance the clock.
      draft.rngSeed = rng.seed;
      draft.turn += 1;
      draft.year += params.TURN_YEARS;
      const tick: GameEvent = {
        turn: draft.turn,
        type: 'turn-advanced',
        message: `Year ${draft.year}: +${draft.climate.temperatureAnomaly.toFixed(2)}°C`,
      };
      draft.log.push(tick);
      events.push(tick);

      // 17: endings.
      const ending = evaluateEnding(draft);
      if (ending) {
        draft.status = 'ended';
        draft.endingId = ending.id;
      }

      return { state: draft, events };
    },
  };
}

const defaultSimulation = createSimulation();

export function advanceTurn(state: WorldState, policyIds: string[]): AdvanceResult {
  return defaultSimulation.advanceTurn(state, policyIds);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @earth-alliance/engine test -- simulation`
Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(engine): add advanceTurn orchestrator and createSimulation

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 22: Public API (`index.ts`)

**Files:**
- Modify: `packages/engine/src/index.ts`
- Test: `packages/engine/test/api.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/engine/test/api.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import {
  createInitialState, getAvailablePolicies, validateSelection,
  advanceTurn, evaluateEnding, createSimulation,
} from '../src/index.js';

describe('public API', () => {
  it('re-exports the full game loop', () => {
    expect(typeof createInitialState).toBe('function');
    expect(typeof getAvailablePolicies).toBe('function');
    expect(typeof validateSelection).toBe('function');
    expect(typeof advanceTurn).toBe('function');
    expect(typeof evaluateEnding).toBe('function');
    expect(typeof createSimulation).toBe('function');
  });

  it('supports a full play step through the public API', () => {
    const s0 = createInitialState();
    const available = getAvailablePolicies(s0);
    expect(available.length).toBeGreaterThan(0);
    const { state: s1 } = advanceTurn(s0, []);
    expect(s1.turn).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @earth-alliance/engine test -- api`
Expected: FAIL — missing exports.

- [ ] **Step 3: Write the implementation**

`packages/engine/src/index.ts`:
```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter @earth-alliance/engine test -- api`
Then: `pnpm --filter @earth-alliance/engine typecheck`
Expected: PASS (2 tests); typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(engine): expose public API surface

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 23: Integration — golden trajectory + determinism

**Files:**
- Create: `packages/engine/test/integration.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/engine/test/integration.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/state.js';
import { advanceTurn } from '../src/simulation.js';

function playDoNothing() {
  let state = createInitialState();
  const snapshots: Record<number, { year: number; temp: number; co2: number }> = {};
  for (let i = 0; i < 35; i++) {
    state = advanceTurn(state, []).state;
    if (state.year === 2050 || state.year === 2100 || state.year === 2200) {
      snapshots[state.year] = {
        year: state.year,
        temp: Number(state.climate.temperatureAnomaly.toFixed(4)),
        co2: Number(state.climate.co2Concentration.toFixed(2)),
      };
    }
  }
  return { state, snapshots };
}

describe('golden trajectory (do-nothing)', () => {
  it('matches the recorded reference snapshots', () => {
    const { snapshots } = playDoNothing();
    // Regression guard. If a model change is intentional, update this snapshot
    // via `pnpm --filter @earth-alliance/engine test -- integration -u`.
    expect(snapshots).toMatchSnapshot();
  });

  it('warms monotonically with no policies', () => {
    let state = createInitialState();
    let prev = state.climate.temperatureAnomaly;
    for (let i = 0; i < 35; i++) {
      state = advanceTurn(state, []).state;
      expect(state.climate.temperatureAnomaly).toBeGreaterThanOrEqual(prev);
      prev = state.climate.temperatureAnomaly;
    }
  });
});

describe('determinism', () => {
  it('produces identical states for identical inputs', () => {
    const run = () => {
      let state = createInitialState();
      for (let i = 0; i < 10; i++) state = advanceTurn(state, []).state;
      return state;
    };
    expect(run()).toEqual(run());
  });
});
```

- [ ] **Step 2: Run test to verify it fails, then writes the snapshot**

Run: `pnpm --filter @earth-alliance/engine test -- integration`
Expected: The two non-snapshot tests PASS; the snapshot test writes a new snapshot file on first run (reported as written/passing). Confirm `test/__snapshots__/integration.test.ts.snap` is created.

- [ ] **Step 3: Inspect the snapshot for sanity**

Open `packages/engine/test/__snapshots__/integration.test.ts.snap`. Confirm temperature rises across 2050 < 2100 < 2200 and CO2 increases. If the do-nothing path does not cross a plausible range (e.g. temp at 2200 should be well above the 2025 value of 1.3), the constants in `data/scenario.ts` need tuning — adjust and re-run before committing.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "test(engine): add golden trajectory and determinism guards

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 24: Integration — reversal + doom scenarios

**Files:**
- Create: `packages/engine/test/scenarios.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/engine/test/scenarios.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { createInitialState } from '../src/state.js';
import { advanceTurn } from '../src/simulation.js';
import { getAvailablePolicies, validateSelection } from '../src/policies.js';

/** Each turn, greedily enact every available emissions-cutting policy we can afford. */
const DECARB = ['nuclear-buildout', 'renewable-subsidy', 'reforestation', 'public-transit', 'carbon-tax', 'degrowth-mandate'];

describe('reversal scenario', () => {
  it('drives emissions net-negative and bends temperature down before 2200', () => {
    let state = createInitialState();
    let peakTemp = state.climate.temperatureAnomaly;
    let sawNetNegative = false;

    for (let i = 0; i < 35; i++) {
      const available = new Set(getAvailablePolicies(state).map((p) => p.id));
      const pick = DECARB.filter((id) => available.has(id) && validateSelection(state, [id]).ok);
      state = advanceTurn(state, pick).state;
      peakTemp = Math.max(peakTemp, state.climate.temperatureAnomaly);
      if (state.climate.annualEmissions < 0) sawNetNegative = true;
    }

    expect(sawNetNegative).toBe(true);
    // Temperature should end below its peak (the redemption arc bends the curve).
    expect(state.climate.temperatureAnomaly).toBeLessThan(peakTemp);
  });
});

describe('doom scenario', () => {
  it('do-nothing crosses +3°C and ends in a loss or muddling outcome', () => {
    let state = createInitialState();
    for (let i = 0; i < 35; i++) state = advanceTurn(state, []).state;
    expect(state.status).toBe('ended');
    expect(state.climate.temperatureAnomaly).toBeGreaterThan(2.0);
  });
});
```

- [ ] **Step 2: Run test to verify behavior**

Run: `pnpm --filter @earth-alliance/engine test -- scenarios`
Expected: PASS (2 tests). If the reversal test fails because emissions never go net-negative, the decarbonization policy deltas or `AUTON_DECARB` in `data/scenario.ts` need strengthening — tune and re-run. (This is the intended balancing feedback; record the final constants.)

- [ ] **Step 3: Re-run the golden snapshot if constants changed**

If you tuned constants in Step 2, the golden trajectory will have shifted intentionally:
Run: `pnpm --filter @earth-alliance/engine test -- integration -u`
Then re-run the full suite: `pnpm --filter @earth-alliance/engine test`
Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "test(engine): add reversal and doom scenario guards

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 25: Property-based invariants (fast-check)

**Files:**
- Create: `packages/engine/test/invariants.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/engine/test/invariants.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { createInitialState } from '../src/state.js';
import { advanceTurn } from '../src/simulation.js';
import { getAvailablePolicies, validateSelection } from '../src/policies.js';
import type { WorldState } from '../src/types.js';

function assertSane(state: WorldState): void {
  const finite = (n: number) => Number.isFinite(n);
  expect(finite(state.climate.temperatureAnomaly)).toBe(true);
  expect(finite(state.climate.co2Concentration)).toBe(true);
  expect(finite(state.climate.annualEmissions)).toBe(true);
  expect(finite(state.resources.politicalCapital)).toBe(true);
  expect(finite(state.resources.money)).toBe(true);
  for (const r of state.regions) {
    expect(r.population).toBeGreaterThanOrEqual(0);
    for (const v of [r.educationIndex, r.healthIndex, r.publicSupport, r.equityIndex,
      r.biodiversityIndex, r.waterAvailability, r.landAvailability]) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
      expect(finite(v)).toBe(true);
    }
    expect(finite(r.gdpPerCapita)).toBe(true);
    expect(finite(r.regionalEmissions)).toBe(true);
  }
}

describe('invariants', () => {
  it('keeps all state finite and in-range over random affordable playthroughs', () => {
    fc.assert(
      fc.property(fc.array(fc.nat({ max: 9 }), { maxLength: 35 }), (turnPicks) => {
        let state = createInitialState();
        for (const pickIdx of turnPicks) {
          if (state.status === 'ended') break;
          const available = getAvailablePolicies(state);
          const candidate = available[pickIdx % Math.max(available.length, 1)];
          const ids = candidate && validateSelection(state, [candidate.id]).ok ? [candidate.id] : [];
          state = advanceTurn(state, ids).state;
          assertSane(state);
        }
      }),
      { numRuns: 200 },
    );
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `pnpm --filter @earth-alliance/engine test -- invariants`
Expected: PASS. If fast-check shrinks a failure, it prints a minimal failing sequence of policy picks — fix the offending sub-model's clamping/guarding, then re-run.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "test(engine): add property-based invariants

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 26: Coverage gate + final verification

**Files:**
- Verify only (config already in `vitest.config.ts` from Task 1).

- [ ] **Step 1: Run the full suite**

Run: `pnpm --filter @earth-alliance/engine test`
Expected: all tests green.

- [ ] **Step 2: Run coverage with thresholds**

Run: `pnpm --filter @earth-alliance/engine coverage`
Expected: PASS with engine lines/functions ≥ 90%, branches ≥ 80%. If any file is below threshold, add a focused test for the uncovered branch (e.g. a clamp path or an early-return) and re-run. Do not lower thresholds.

- [ ] **Step 3: Typecheck the whole workspace**

Run: `pnpm -r typecheck`
Expected: no errors.

- [ ] **Step 4: Commit any added coverage tests**

```bash
git add -A
git commit -m "test(engine): close coverage gaps to satisfy thresholds

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Definition of Done (engine)

- [ ] `pnpm install` succeeds; `pnpm --filter @earth-alliance/engine test` is fully green.
- [ ] `pnpm --filter @earth-alliance/engine coverage` passes thresholds (engine ≥ 90% lines/functions).
- [ ] `pnpm -r typecheck` is clean.
- [ ] A do-nothing 35-turn game reaches 2200, ends, and records an ending id.
- [ ] An aggressive-decarbonization game reaches net-negative emissions and bends temperature down.
- [ ] The public API (`createInitialState`, `getAvailablePolicies`, `validateSelection`, `advanceTurn`, `evaluateEnding`, `createSimulation`) drives a full game with no UI.
- [ ] Golden-trajectory snapshot committed; determinism and invariants guards green.

**Next:** Plan 2 — Web Client (R3F 3D globe, Mantine HUD, components), written against this engine's public API.
