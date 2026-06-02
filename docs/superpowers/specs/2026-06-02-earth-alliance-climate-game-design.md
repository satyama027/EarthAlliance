# Earth Alliance — Climate Strategy Game: Design Spec

**Date:** 2026-06-02
**Status:** Draft for review
**Scope of this spec:** A playable vertical slice (engine + 3D web client wired end-to-end), not a finished/balanced game.

---

## 1. Vision

A turn-based, policy-selection strategy game in the spirit of *Fate of the World*, *Half-Earth Socialism*, and *Beecarbonize*. The player acts as a global authority enacting climate and social policy across world regions, turn by turn, from **2025 to 2200**, trying to keep global warming **below +3 °C** while managing economy, public support, equity, and ecology. Multiple endings reflect the moral and strategic tradeoffs of the path taken.

The product must **look and feel like a real game** (3D Earth, animated policy cards, sound, transitions), not a spreadsheet.

---

## 2. Core Decisions (locked)

| Area | Decision |
|---|---|
| Frontend stack | React + TypeScript (Vite) |
| World model | Multiple **regions**, each with its own metrics and constraints |
| Action economy | **Dual resource** — Political Capital + Money |
| Win/lose | **Multiple endings** (6), via a data-driven ending evaluator |
| Time horizon | **2025 → 2200**, 5-year turns → **35 turns** |
| Starting climate | Temperature anomaly seeded at **≈ +1.3 °C** (already-warmed world) |
| Primary goal | Keep warming **below +3 °C** |
| Economy metric | **GDP per capita** (output ÷ population) |
| Architecture | **Decoupled, framework-agnostic simulation engine** + thin presentation client |
| Repo layout | **pnpm monorepo**: `packages/engine` (pure TS) + `packages/web` (React) |
| 3D engine | **Three.js via React Three Fiber (R3F)** |
| UI / HUD | **Mantine** (DOM overlay) |
| Animation | **Framer Motion** (DOM) + **react-spring / R3F** (3D) |
| Sound | **Howler.js** (via `use-sound`) |
| Art | Placeholder assets now, with a clean `assets/` pipeline for later replacement |

---

## 3. Architecture

### 3.1 Principle: decoupled simulation core

The simulation is a **pure, deterministic, framework-agnostic TypeScript module**. It knows nothing about React, the DOM, Three.js, or any platform. The web client is a thin **view + controller** that calls the engine and renders its state.

This is what delivers the user's explicit requirement: the same engine can later be reused in **React Native (Android)** or **Electron (Windows)** with zero changes, or ported/compiled (e.g. to WASM) for native targets.

**Golden rule:** `packages/engine` imports nothing from `packages/web`, React, the DOM, or any rendering library. Enforced by the dependency graph (engine is a standalone package).

### 3.2 Repository structure

```
EarthAlliance/
├─ pnpm-workspace.yaml
├─ package.json                 # workspace root scripts (dev, build, test)
├─ tsconfig.base.json
├─ packages/
│  ├─ engine/                   # PURE simulation core — zero UI deps
│  │  ├─ package.json
│  │  ├─ tsconfig.json
│  │  ├─ src/
│  │  │  ├─ index.ts            # public API surface (only entry point)
│  │  │  ├─ types.ts            # WorldState, Region, Policy, Ending, GameEvent…
│  │  │  ├─ state.ts            # createInitialState()
│  │  │  ├─ simulation.ts       # advanceTurn() orchestrator — runs the model pipeline
│  │  │  ├─ models/             # SWAPPABLE sub-models (one scientific concern each)
│  │  │  │  ├─ types.ts         # SubModel, SimContext, TurnScratch, ModelParams
│  │  │  │  ├─ pipeline.ts      # default ordered pipeline + createSimulation() factory
│  │  │  │  ├─ carbonCycle.ts   # (A) emissions → CO₂ concentration
│  │  │  │  ├─ climate.ts       # (B) CO₂ → forcing → temperature (with thermal lag)
│  │  │  │  ├─ damage.ts        # (C) temperature → economic damage fraction
│  │  │  │  ├─ economy.ts       # (D) GDP per capita
│  │  │  │  ├─ emissions.ts     # (E) re-derive regional emissions from output
│  │  │  │  ├─ demography.ts    # (F) population, fertility, age, education
│  │  │  │  ├─ constraints.ts   # (G) water / land availability
│  │  │  │  ├─ biodiversity.ts  # (G) ecosystem health
│  │  │  │  ├─ support.ts       # (H) public support + equity
│  │  │  │  └─ resources.ts     # (I) regenerate political capital + money
│  │  │  ├─ policies.ts         # policy catalog + cost/affordability/validation
│  │  │  ├─ endings.ts          # ending definitions + evaluator
│  │  │  ├─ rng.ts              # seeded deterministic RNG
│  │  │  └─ data/
│  │  │     ├─ regions.ts       # sample regions (data only)
│  │  │     └─ scenario.ts      # starting scenario + ALL tunable constants
│  │  └─ test/                  # vitest suite — the engine's safety net
│  │     ├─ models/             # one test file per sub-model (tested in isolation)
│  │     ├─ simulation.test.ts  # full-turn integration + determinism
│  │     ├─ policies.test.ts
│  │     └─ endings.test.ts
│  └─ web/                      # React client (depends on engine)
│     ├─ package.json
│     ├─ index.html
│     ├─ vite.config.ts
│     ├─ tsconfig.json
│     ├─ public/assets/         # placeholder art, textures, sounds
│     └─ src/
│        ├─ main.tsx
│        ├─ App.tsx
│        ├─ game/
│        │  └─ useGame.ts       # React hook wrapping the engine (holds WorldState)
│        ├─ scene/              # R3F 3D layer
│        │  ├─ EarthScene.tsx   # canvas + lighting + postprocessing
│        │  ├─ Globe.tsx        # textured Earth sphere, rotation, atmosphere
│        │  └─ RegionMarker.tsx # clickable region hotspots, colored by metric
│        ├─ components/         # Mantine DOM HUD
│        │  ├─ ResourceBar.tsx  # political capital + money
│        │  ├─ Dashboard.tsx    # global metrics + trend charts
│        │  ├─ RegionPanel.tsx  # selected-region detail
│        │  ├─ PolicyCard.tsx   # art + cost + effects
│        │  ├─ PolicyTray.tsx   # available policies, selection
│        │  ├─ EndTurnButton.tsx
│        │  └─ EndingScreen.tsx
│        ├─ audio/useSfx.ts     # Howler/use-sound wrapper
│        └─ styles.css
```

### 3.3 Data flow

```
User clicks policy cards ─▶ useGame (React state: selected policy ids)
User clicks "End Turn"   ─▶ engine.advanceTurn(state, selectedIds)
engine returns { state, events } ─▶ useGame stores new WorldState
                                  ─▶ React re-renders HUD + 3D scene
                                  ─▶ events trigger animations (Framer/R3F) + sounds (Howler)
engine.evaluateEnding(state) ─▶ if non-null, show EndingScreen
```

The engine is called only at turn boundaries. Between turns, the UI is pure presentation over the current `WorldState`.

---

## 4. Data Model

All of `WorldState` is a plain, JSON-serializable object (enables save/load and determinism). Metrics are normalized indices **0–100** unless they carry physical units.

### 4.1 WorldState

```ts
interface WorldState {
  turn: number;                 // 0-based turn index
  year: number;                 // 2025, +5 per turn, ends 2200
  status: GameStatus;           // 'playing' | 'ended'
  endingId: string | null;      // set when status === 'ended'

  resources: {
    politicalCapital: number;   // spent to enact policies
    money: number;              // spent to fund policies (currency units)
  };

  climate: {
    temperatureAnomaly: number; // °C above pre-industrial; starts ~1.3
    co2Concentration: number;   // ppm
    annualEmissions: number;    // GtCO2 / year (global, derived from regions)
  };

  regions: Region[];

  activeEffects: ActiveEffect[]; // ongoing policy effects still ticking
  enactedPolicyIds: string[];    // history of what's been enacted
  log: GameEvent[];              // turn-by-turn events
  rngSeed: number;               // for deterministic random events
}

type GameStatus = 'playing' | 'ended';
```

### 4.2 Region

```ts
interface Region {
  id: string;
  name: string;

  // demography
  population: number;           // people
  educationIndex: number;       // 0–100
  healthIndex: number;          // 0–100
  medianAge: number;            // years
  fertilityRate: number;        // children per woman

  // economy
  gdpPerCapita: number;         // currency units per person

  // society
  publicSupport: number;        // 0–100 (feeds political capital)
  equityIndex: number;          // 0–100

  // environment
  biodiversityIndex: number;    // 0–100
  regionalEmissions: number;    // GtCO2 / year

  // constraints (resource limits that bite)
  waterAvailability: number;    // 0–100
  landAvailability: number;     // 0–100

  // geo (for the 3D globe marker)
  lat: number;
  lon: number;
}
```

**Sample regions for the slice (≈5):** North America, Europe, Sub-Saharan Africa, South Asia, East Asia. Each is pure data in `data/regions.ts`; adding a region = one entry.

### 4.3 Policy

```ts
interface Policy {
  id: string;
  name: string;
  category: PolicyCategory;     // 'energy' | 'industry' | 'land' | 'social' | 'frontier'
  description: string;
  art: string;                  // asset key for card art (placeholder for now)

  cost: { politicalCapital: number; money: number };
  scope: 'global' | 'region';   // region-scoped policies target a chosen region
  prerequisites?: string[];     // other policy ids required first
  effects: PolicyEffect[];      // immediate and/or ongoing modifiers
}

interface PolicyEffect {
  target: EffectTarget;         // a numeric Region field: 'regionalEmissions',
                                // 'publicSupport', 'biodiversityIndex', 'gdpPerCapita', …
  delta: number;                // amount applied (negative reduces)
  duration: 'immediate' | 'ongoing'; // ongoing → registered into activeEffects
  turns?: number;               // ongoing only: turns it persists (undefined = permanent)
}
```

### 4.4 Ending & GameEvent

```ts
interface Ending {
  id: string;
  title: string;
  description: string;
  test: (s: WorldState) => boolean; // predicate over final/early state
  kind: 'win' | 'loss' | 'ambiguous';
}

interface GameEvent {
  turn: number;
  type: string;                 // 'policy-enacted' | 'disaster' | 'milestone' | …
  message: string;
  payload?: Record<string, unknown>;
}
```

---

## 5. Engine Public API

The only surface the web client may use (re-exported from `index.ts`):

```ts
createInitialState(scenario?: Scenario): WorldState
getAvailablePolicies(state: WorldState): Policy[]
validateSelection(state: WorldState, policyIds: string[]):
    { ok: boolean; reason?: string }
advanceTurn(state: WorldState, policyIds: string[]):
    { state: WorldState; events: GameEvent[] }
evaluateEnding(state: WorldState): Ending | null
```

**Purity & determinism:** No I/O, no globals, no `Date.now()`/`Math.random()` in logic paths. Randomness flows through the seeded RNG (`rng.ts`) carried in `WorldState.rngSeed`. Same inputs ⇒ same outputs. This is what makes the engine portable AND testable.

---

## 6. The Ecological & World Model

This is the heart of the game. The model is built as a **pipeline of swappable sub-models** — each one a pure module owning a single scientific concern, implementing a common interface, run in a fixed order over a shared per-turn context. This lets a higher-fidelity version of any sub-model (e.g. a multi-gas carbon cycle with tipping points) replace the default later **without touching the others or the UI**.

All equations operate on a 5-year turn (**Δt = 5**). Constants in `CAPS` are defined in §6.4 and live in `data/scenario.ts`.

### 6.1 Sub-model interface (the swappability contract)

```ts
interface ModelParams { /* every tunable constant from §6.4 */ }

interface TurnScratch {
  // intermediate values passed BETWEEN sub-models within one turn
  deltaTemperature: number;                  // ΔT this turn (climate → support/constraints/bio)
  prevGdpPerCapita: Record<RegionId, number>;// economy → support/emissions (growth this turn)
  prevPopulation: Record<RegionId, number>;  // demography → emissions/constraints
  damageFraction: number;                    // damage → economy
}

// NOTE: Policy contributions (the "− policyΔ" / backlash terms shown inline in §6.2)
// are NOT applied inside the natural sub-models. They are applied in a single dedicated
// effects-layering step AFTER the pipeline (see §6.3 step 13), so ongoing emission cuts
// are not overwritten by the emissions re-derivation. `climate.annualEmissions` is ALWAYS
// derived as the sum of regional emissions — it is never a settable effect target.

interface SimContext {
  state: WorldState;      // mutable draft for THIS turn
  params: ModelParams;
  rng: Rng;               // seeded, deterministic
  scratch: TurnScratch;
}

interface SubModel {
  id: string;
  step(ctx: SimContext): void;   // reads/writes ctx.state and ctx.scratch
}
```

`createSimulation({ models?: SubModel[], params?: ModelParams })` assembles a pipeline; the default export uses the ordered list in §6.3. Override `models` to swap any stage.

### 6.2 The equations (default sub-models)

**(A) Carbon cycle — `carbonCycle.ts`** — only a fraction of emissions stay airborne; net-negative emissions *reduce* CO₂ (how warming is reversed):
```
grossEmissions    = state.climate.annualEmissions × Δt           // GtCO₂ over the turn
Δppm              = AIRBORNE_FRACTION × grossEmissions / GTCO2_PER_PPM
co2Concentration += Δppm                                          // GTCO2_PER_PPM = 7.81
```

**(B) Climate response — `climate.ts`** — standard logarithmic forcing + equilibrium sensitivity, with ocean **thermal lag** (committed warming):
```
F        = 5.35 × ln(co2Concentration / 280)                     // W/m², 280 ppm pre-industrial
T_eq     = ECS × log2(co2Concentration / 280)                    // °C  (= F × ECS/3.71)
ΔT       = (T_eq − temperatureAnomaly) × WARMING_ADJUST           // ~0.3 / turn
temperatureAnomaly += ΔT
scratch.deltaTemperature = ΔT
```

**(C) Damage — `damage.ts`** — DICE-style quadratic loss fraction:
```
scratch.damageFraction = min(DAMAGE_COEFF × temperatureAnomaly², 1)   // a≈0.005 → ~4.5% at 3°C
```

**(D) Economy — `economy.ts`** (per region) — growth dampened by damage and scarcity:
```
scratch.prevGdpPerCapita[r] = gdpPerCapita
constraintFactor = 0.5 + 0.5 × min(waterAvailability, landAvailability)/100
gdpPerCapita *= (1 + BASE_GROWTH)^Δt × (1 − scratch.damageFraction) × constraintFactor
```

**(F) Demography — `demography.ts`** (per region) — runs before emissions so output uses new population:
```
scratch.prevPopulation[r] = population
popGrowthPerYr = clamp((fertilityRate − 2.1) × FERT_W + (healthIndex − 50) × HEALTH_W, -0.02, 0.04)
population    *= (1 + popGrowthPerYr)^Δt
fertilityRate  = max(1.5, fertilityRate − DEMO_TRANSITION × (educationIndex/100) × Δt)
medianAge     += AGEING_RATE × Δt × (fertilityRate < 2.1 ? 1 : 0.3)
educationIndex = clamp(educationIndex + EDU_GROWTH × (gdpPerCapita-scaled) × Δt, 0, 100)
```

**(E) Emissions re-derivation — `emissions.ts`** (per region) — emissions track output minus autonomous decarbonization minus policy deltas:
```
outputRatio       = (gdpPerCapita × population) / (scratch.prevGdpPerCapita[r] × scratch.prevPopulation[r])
regionalEmissions = regionalEmissions × outputRatio × (1 − AUTON_DECARB)^Δt
                    + Σ(policy & active-effect emission deltas for r)
```

**(G) Constraints + biodiversity — `constraints.ts`, `biodiversity.ts`** (per region, clamped 0–100):
```
waterAvailability -= WATER_TEMP_LOSS × max(0, ΔT)×100 + POP_PRESSURE × popGrowth − policyΔ
landAvailability  -= LAND_DEGRADE    × max(0, ΔT)×100                          − policyΔ   // reforestation adds
biodiversityIndex -= BIO_TEMP_LOSS   × max(0, ΔT)×100 + BIO_LAND_W×landLoss    − policyΔ
```

**(H) Support + equity — `support.ts`** (per region, clamped 0–100):
```
econGrowth = gdpPerCapita / scratch.prevGdpPerCapita[r] − 1
support += − SUPPORT_TEMP_W × max(0, ΔT)×100
           + SUPPORT_ECON_W × econGrowth×100
           + SUPPORT_EQUITY_W × (equityIndex − 50)
           − scratch.policyBacklash[r]
equityIndex = clamp(equityIndex + Σ(policy equity deltas) − INEQUALITY_DRIFT × max(0, econGrowth), 0, 100)
```

**(I) Resource regeneration — `resources.ts`** (global) — closes the dual-resource loop:
```
avgSupport        = Σ(support × population) / Σ population
politicalCapital += CAPITAL_BASE + CAPITAL_PER_SUPPORT × avgSupport
money            += TAX_RATE × Σ(gdpPerCapita × population) / MONEY_SCALE
```

### 6.3 `advanceTurn` orchestration order

```
1.  Validate selection (reject if unaffordable/unavailable)  [simulation.ts]
2.  Clone state (pure: never mutate the input)               [simulation.ts]
3.  spendAndRegister: deduct cost, record enacted policies,  [effects.ts]
        push ONGOING effects to activeEffects, collect this turn's IMMEDIATE effects
4.  carbonCycle   (A)   current annualEmissions → co2Concentration
5.  climate       (B)   co2 → temperature; sets scratch.deltaTemperature
6.  damage        (C)   temperature → scratch.damageFraction
7.  economy       (D)   per region; records scratch.prevGdpPerCapita
8.  demography    (F)   per region; records scratch.prevPopulation
9.  emissions     (E)   per region → re-derive regionalEmissions from output
10. constraints   (G)   per region (water/land)
11. biodiversity  (G)   per region
12. support       (H)   per region (support + equity)
13. resources     (I)   global; regenerate political capital + money
14. applyEffects: layer IMMEDIATE + all ONGOING effects on top; tick/expire ongoing [effects.ts]
15. recompute state.climate.annualEmissions = Σ regionalEmissions                    [simulation.ts]
16. clock               turn += 1, year += 5, append to log
17. endings             early-loss check each turn; at END_YEAR pick resolution ending
```

Steps 4–13 are the swappable pipeline; 1–3 and 14–17 are the orchestrator. Applying policy effects at step 14 (after the natural dynamics, including the emissions re-derivation at step 9) is what lets ongoing emission cuts persist instead of being overwritten. Random/disaster events (seeded RNG) are part of the model's room to grow; the engine slice emits a `turn-advanced` event and reserves disaster events for tuning/Plan 2.

### 6.4 Tunable constants (defaults; all in `data/scenario.ts`)

| Constant | Default | Controls |
|---|---|---|
| `GTCO2_PER_PPM` | 7.81 | Physical: GtCO₂ per ppm (don't tune) |
| `AIRBORNE_FRACTION` | 0.50 | Share of emissions staying in atmosphere |
| `ECS` | 3.0 | °C warming per CO₂ doubling (climate sensitivity) |
| `WARMING_ADJUST` | 0.30 | Fraction of the gap to equilibrium closed per turn (thermal lag) |
| `DAMAGE_COEFF` | 0.005 | Quadratic damage strength (≈4.5% GDP loss at 3 °C) |
| `BASE_GROWTH` | 0.02 | Baseline GDP-per-capita growth / yr |
| `AUTON_DECARB` | 0.01 | Autonomous decarbonization / yr (tech improving without policy) |
| `FERT_W`, `HEALTH_W` | 0.01, 0.0002 | Demography → population growth weights |
| `DEMO_TRANSITION` | 0.01 | Education-driven fertility decline / yr |
| `AGEING_RATE` | 0.3 | Median-age rise / yr when fertility low |
| `EDU_GROWTH` | tuning | Education index growth |
| `WATER_TEMP_LOSS`, `LAND_DEGRADE`, `BIO_TEMP_LOSS` | tuning | Warming → constraint/biodiversity loss |
| `POP_PRESSURE`, `BIO_LAND_W` | tuning | Population/land coupling |
| `SUPPORT_TEMP_W`, `SUPPORT_ECON_W`, `SUPPORT_EQUITY_W` | tuning | Public-support reaction weights |
| `INEQUALITY_DRIFT` | tuning | Growth → equity erosion |
| `CAPITAL_BASE`, `CAPITAL_PER_SUPPORT` | tuning | Political-capital regeneration |
| `TAX_RATE`, `MONEY_SCALE` | tuning | Money regeneration |

`"tuning"` = balanced during play-testing; the slice ships conservative defaults so the *do-nothing* trajectory worsens meaningfully across 35 turns without bottoming out early.

### 6.5 Feedback structure (why it's a game, not a calculator)

The sub-models form coupled feedback loops:
- **Doom loop:** warming → damage → less money → fewer policies affordable → more warming.
- **Redemption arc:** reforestation/capture → net-negative emissions → CO₂ falls → temperature relaxes toward a lower equilibrium → biodiversity and water recover → economy and support rebound.

The player is steering a coupled dynamical system, which is what creates meaningful strategy.

---

## 7. Policies (sample catalog for the slice)

~8–10 policies across categories, pure data:

| Policy | Category | Notes |
|---|---|---|
| Carbon Tax | industry | Lowers emissions, lowers support, raises money |
| Renewable Subsidy | energy | Lowers emissions, costs money |
| Nuclear Buildout | energy | Strong emissions cut, high cost, support tradeoff |
| Reforestation | land | Cuts net emissions, raises biodiversity, needs land |
| Public Transit | industry | Moderate emissions cut, raises support |
| Climate Adaptation Fund | social | Buffers disaster damage, costs money |
| Universal Education | social | Raises education/equity (slow, compounding) |
| Degrowth Mandate | social | Big emissions cut, hits GDP/support hard |
| Orbital Infrastructure | frontier | Prereq for Off-World Colonies; very expensive |
| Off-World Colonies | frontier | Enables the Exodus path; gated by Orbital Infrastructure |

Adding/editing policies = editing data, no engine code changes.

---

## 8. Endings (6)

Data-driven predicates over `WorldState`, evaluated in priority order. Early-loss conditions can end the game before 2200.

| Ending | Kind | Rough trigger |
|---|---|---|
| **Green Utopia** | win | Warming held well under +3 °C, high biodiversity, high equity, healthy economy |
| **Muddling Through** | ambiguous | Under +3 °C but mediocre on equity/ecology — survived, not thrived |
| **Eco-Collapse** | loss | Warming ≥ collapse threshold or biodiversity floor — runaway breakdown |
| **Economic Ruin** | loss | GDP-per-capita / support collapse despite climate effort |
| **Authoritarian Stability** | ambiguous | Targets met but via crushed support/equity |
| **Orbital Exodus / Accelerationism** | ambiguous | Earth degrading (high temp, falling biodiversity) **but** humanity tech-rich (very high GDP-per-capita + education, Off-World Colonies enacted) → a fraction escapes off-world while those left behind suffer |

The **Exodus** ending is intentionally reachable only by investing in the `frontier` policy line — otherwise it's unreachable content.

---

## 9. Presentation Layer

- **3D Earth globe (R3F):** textured sphere, slow auto-rotation, atmosphere/glow via postprocessing. Region markers (`RegionMarker`) sit at lat/lon, colored by a selected metric (temperature, support, biodiversity…), clickable to open `RegionPanel`.
- **HUD (Mantine, DOM overlay):** `ResourceBar` (capital/money), `Dashboard` (global metrics + trend charts of temperature/CO₂ over turns), `PolicyTray` of `PolicyCard`s (art + cost + effects), `EndTurnButton`, `EndingScreen`.
- **Animation:** Framer Motion for DOM (card hover/flip, panel transitions, number count-ups); react-spring / R3F `useFrame` for 3D (globe spin, marker pulse on disaster).
- **Sound (Howler):** UI clicks, end-turn sting, disaster sounds, optional ambient loop. Driven by engine `GameEvent`s.
- **Art pipeline:** all art/textures/sounds referenced by key from `public/assets/`. The slice ships placeholders; replacing art = swapping files, no code changes.

---

## 10. Testing

### 10.1 Framework & tooling

**Vitest** is the test runner across the monorepo (ESM-native, fast, Jest-compatible API, v8 coverage). Layers in scope for this iteration:

| Layer | Tools | Environment |
|---|---|---|
| Engine | Vitest | node |
| Engine invariants | Vitest + **fast-check** (property-based) | node |
| Web logic | Vitest + **React Testing Library** + **jsdom** | jsdom |

The 3D scene (R3F/Three.js/WebGL) is **mocked** in web tests — we test game logic and state-driven rendering, not GPU output. **E2E (Playwright) and CI are deferred** (see §11); the strategy is written so they slot in later without rework.

**Tooling added to the repo:**
- `packages/engine/vitest.config.ts`, `packages/web/vitest.config.ts` (jsdom env + RTL setup file).
- Dev deps: `vitest`, `@vitest/coverage-v8`, `fast-check`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`.
- Test data: `packages/engine/test/fixtures/` (crafted `WorldState`/`SimContext` builders) and `packages/engine/test/__snapshots__/` (golden trajectory).

**Root scripts:**
```
pnpm test          # run all package suites once
pnpm test:watch    # watch mode for development
pnpm coverage      # coverage report (enforces thresholds, §10.5)
pnpm test:update   # re-baseline golden-trajectory snapshots (intentional changes only)
```

### 10.2 Engine — sub-model unit tests (`test/models/*`)

Each swappable sub-model is tested in isolation against a crafted `SimContext`:

1. **carbonCycle** — known emissions → expected Δppm; **net-negative emissions reduce CO₂**.
2. **climate** — known CO₂ → expected forcing & equilibrium; **thermal lag approaches equilibrium without overshoot**; CO₂ fall → temperature falls.
3. **damage** — monotonic in temperature; clamped ≤ 1.
4. **economy** — damage and scarcity each reduce growth; growth positive when both healthy.
5. **demography** — high education lowers fertility over time; population ≥ 0; median age rises when fertility low.
6. **emissions** — rise with output, fall with autonomous decarb + policy deltas.
7. **constraints / biodiversity** — warming degrades; reforestation restores; clamped 0–100.
8. **support** — warming lowers, growth raises, backlash lowers; clamped 0–100.
9. **resources** — capital scales with avg support; money scales with taxed GDP.

### 10.3 Engine — integration & regression

10. **Golden trajectory** — fixed scenario + no policies, 35 turns → snapshot of mid-run and final `WorldState`. The primary whole-pipeline regression guard; re-baselined via `pnpm test:update` only for intentional model changes.
11. **Determinism** — same seed + same inputs → identical `WorldState` across two runs.
12. **Reversal scenario** — scripted aggressive decarbonization drives net-negative emissions and **temperature trends back down** by 2200 (proves the redemption arc works).
13. **Doom scenario** — do-nothing run crosses +3 °C and triggers a loss ending.

### 10.4 Engine — rules & property-based invariants

14. **Affordability** — overspending rejected; valid selection deducts correctly.
15. **Effects** — immediate apply once; ongoing apply each turn and expire on schedule.
16. **Endings** — each of the 6 fires from a crafted state; **Exodus unreachable without the frontier policy line**.
17. **Invariants (fast-check)** — for randomly generated valid states + selections, after `advanceTurn`: all 0–100 indices stay in range, `population ≥ 0`, and every numeric field is finite (no `NaN`/`Infinity`). fast-check **shrinks** any failure to a minimal reproducing case.

### 10.5 Web logic tests

18. **`useGame`** — end-turn advances `year` by 5 and replaces state with the engine's output; selection state resets per turn.
19. **PolicyTray / PolicyCard** — unaffordable policies disabled; selecting toggles inclusion; cost preview matches.
20. **Dashboard / RegionPanel** — render the correct numbers from a given `WorldState`.
21. **EndingScreen** — renders the matching ending when `status === 'ended'`.

### 10.6 Coverage thresholds

Enforced in `pnpm coverage` (build fails below threshold):
- `packages/engine`: **≥ 90%** lines/functions (the model is the product — hold it high).
- `packages/web`: **≥ 70%** lines on game-logic modules (`game/`, `components/`); the 3D `scene/` is excluded from thresholds (rendering, not logic).

---

## 11. Out of Scope (this iteration)

- Final art, music, and balance/tuning of rates.
- Save/load UI (the serializable state model supports it; no UI yet).
- Multiplayer, scenarios beyond the default, modding tools.
- Native Android/Windows builds (the architecture enables them; not built now).
- **E2E tests (Playwright)** and a **CI workflow** — deferred; §10 is structured so both slot in later without rework.

---

## 12. Vertical Slice — Definition of Done

1. `pnpm install && pnpm dev` launches the web client.
2. A 3D Earth globe renders with ~5 clickable region markers colored by a metric.
3. HUD shows dual resources and global climate metrics with a trend chart.
4. Player can select from ~8–10 policy cards (with placeholder art), respecting cost/validation.
5. "End Turn" calls the engine, advances 5 years, updates all metrics and the globe, plays at least one animation and one sound from a `GameEvent`.
6. Playing through to 2200 (or an early-loss) reaches one of the 6 endings via `EndingScreen`.
7. `pnpm test` runs the full suite green — engine sub-model units, golden trajectory, determinism, reversal/doom scenarios, rules, property-based invariants, and web-logic tests.
8. `pnpm coverage` passes the §10.6 thresholds (engine ≥ 90%, web logic ≥ 70%).
