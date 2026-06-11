# Earth Alliance — Architecture

A turn-based climate-strategy game. The player enacts policy across world regions in
5-year turns (2025 → 2200), steering a coupled climate–economy–society simulation toward
one of six endings.

This document describes the system **as built**. For the original design rationale see
[`docs/superpowers/specs/2026-06-02-earth-alliance-climate-game-design.md`](docs/superpowers/specs/2026-06-02-earth-alliance-climate-game-design.md).

---

## 1. The big picture

Two packages, one hard boundary:

```
┌──────────────────────────────┐         ┌──────────────────────────────┐
│  @earth-alliance/engine      │         │  @earth-alliance/web         │
│  pure, deterministic TS      │ ◀────── │  React + Mantine             │
│  no React / DOM / Three.js   │ imports │  view + controller only      │
└──────────────────────────────┘         └──────────────────────────────┘
        the simulation                          the presentation
```

The engine is a **pure, framework-agnostic** TypeScript module: same inputs ⇒ same
outputs, no I/O, no globals, no `Date.now()` / `Math.random()`. The web client is a thin
view layer that calls the engine at turn boundaries and renders the resulting `WorldState`.

The dependency arrow points **one way only**: `web` depends on `engine`; `engine` depends
on nothing in `web`, React, the DOM, or any rendering library. This is what lets the same
engine later back a React Native or Electron client unchanged.

---

## 2. Monorepo layout

pnpm workspace (`pnpm-workspace.yaml` → `packages/*`), ESM throughout, shared
`tsconfig.base.json`.

```
EarthAlliance/
├─ package.json              # root scripts: test / test:watch / coverage / typecheck (pnpm -r)
├─ pnpm-workspace.yaml
├─ tsconfig.base.json
├─ packages/
│  ├─ engine/                # pure simulation core — zero UI deps
│  │  └─ src/
│  │     ├─ index.ts         # the ONLY public API surface
│  │     ├─ types.ts         # WorldState, Region, Policy, PolicyEffect, Ending, GameEvent…
│  │     ├─ state.ts         # createInitialState()
│  │     ├─ simulation.ts    # advanceTurn() / createSimulation() — the orchestrator
│  │     ├─ effects.ts       # spendAndRegister() + applyEffects() — the policy layer
│  │     ├─ policies.ts      # POLICY_CATALOG (funding modes) + region availability/validation + regionCharge()
│  │     ├─ endings.ts       # ENDINGS + evaluateEnding()
│  │     ├─ rng.ts           # seeded mulberry32 PRNG
│  │     ├─ math.ts          # clamp() and friends
│  │     ├─ models/          # the swappable sub-model pipeline (one concern each)
│  │     │  ├─ types.ts      # SubModel, SimContext, TurnScratch, ModelParams, createScratch()
│  │     │  ├─ pipeline.ts   # DEFAULT_MODELS — the ordered default pipeline
│  │     │  └─ *.ts          # carbonCycle, climate, damage, economy, demography, emissions,
│  │     │                   #   constraints, biodiversity, support, resources, programs
│  │     └─ data/
│  │        ├─ regions.ts    # SAMPLE_REGIONS (pure data)
│  │        └─ scenario.ts   # DEFAULT_SCENARIO + DEFAULT_PARAMS (every tunable constant)
│  └─ web/                   # React client (depends on engine via workspace:*)
│     ├─ scripts/            # generate-map.mjs map baker + regions.mjs (region/GoI logic), build-time only
│     └─ src/
│        ├─ main.tsx         # React root + MantineProvider
│        ├─ App.tsx          # composes map + HUD; owns selectedRegionId; wires SFX
│        ├─ game/useGame.ts  # the React hook wrapping the engine (holds WorldState)
│        ├─ scene/           # WorldMap (inlines world-map.svg) + metricColor
│        ├─ assets/          # world-map.svg — baked HD region map (generated, committed)
│        ├─ components/      # Mantine DOM HUD (ResourceBar, Dashboard, RegionPanel,
│        │                   #   PolicyTray, PolicyCard, EndingScreen, Sparkline)
│        └─ audio/           # useSfx + sound (Web Audio SFX, event-driven)
└─ docs/superpowers/         # specs and implementation plans
```

Both packages use **Vitest**. The engine runs in `node`; the web package runs in `jsdom`
with React Testing Library. `WorldMap` is tested directly (the baked SVG is imported and its
click/selection wiring asserted), and stubbed in the App integration test to keep it focused.

---

## 3. The engine ↔ web boundary

`packages/engine/src/index.ts` is the **single entry point**. The web client imports only
from `@earth-alliance/engine`; it never reaches into `engine/src/**` internals.

The contract the client uses:

```ts
createInitialState(scenario?): WorldState
getAvailablePolicies(state, regionId): Policy[]   // enactable in that region
getGloballyAvailablePolicies(state): Policy[]      // enactable in ≥1 region (the "apply everywhere" UI)
validateSelection(state, selections): { ok: boolean; reason?: string }   // selections: { policyId, regionId }[]
advanceTurn(state, selections, cancellations?): { state, events, diagnostics }   // cancellations stop active programs
evaluateEnding(state): Ending | null            // (used internally by advanceTurn)
ENDINGS                                          // id → Ending lookup for the EndingScreen
getPolicy(id)                                     // cost preview
isEnacted(state, policyId, regionId), enactedInAnyRegion(state, policyId)   // enactment queries
regionCharge(state, policy, regionId)            // GDP-scaled money charged for a region this turn
createSimulation(models?, params?)               // build a pipeline with swapped stages/constants
```

Policies are **region-targeted**: a `PolicySelection` is `{ policyId, regionId }`, and
`advanceTurn` takes an array of them. The same policy may be enacted independently in
several regions.

Everything crossing the boundary is a **plain, JSON-serializable object** (`WorldState`,
`Policy`, `GameEvent`, `Ending`, `TurnDiagnostics`). No class instances, no functions on the
wire — which is what keeps the state save/load-able and the engine portable.

`advanceTurn` also returns a `TurnDiagnostics` alongside the new state: the intermediates the
pipeline computes but the state discards. The sub-models stash these locals into `TurnScratch`
(see `models/types.ts`) and `advanceTurn` copies them into `TurnDiagnostics`. Surfaced so far:
`damageFraction` and `deltaTemperature` (global), `growthByRegion` (per-region GDP/capita growth),
plus a widened set of **calc internals** for the Turn Log's "More" panel covering every sub-model:
global `co2Ratio`, `equilibriumTemp`, `deltaPpm`, `grossEmissions`, `baseGrowthFactor`,
`decarbFactor`, `avgSupport`, `worldPopulation`, `worldGdp`, `capitalGain`, `moneyGain`; and
per-region `scarcityByRegion`, `constraintFactorByRegion`, `outputRatioByRegion`, `popGrowthByRegion`,
`waterLossByRegion`, `landLossByRegion`, `bioLossByRegion`, the three support-change contributions
(`supportTempTermByRegion`, `supportEconTermByRegion`, `supportEquityTermByRegion`),
`equityDriftByRegion`, and the policy-program fields `programSpendByRegion` (upkeep/buildout
money spent per region this turn) + `capacityByRegionPolicy` (installed capacity 0–1, keyed
`policyId:regionId`). These let the client show *why* values moved *exactly*, without re-deriving
the model equations (the web layer duplicates no engine logic; the lone UI-side derivation is
`Warming⁺ = max(0, deltaTemperature)`). The field is additive: existing `{ state, events }`
consumers are unaffected.

**Resolution: web reads engine *source*, not its compiled `dist`.** The engine's
`package.json` `exports` point at `dist/`, but both `web/vite.config.ts` and
`web/vitest.config.ts` add a `resolve.alias` mapping `@earth-alliance/engine` →
`packages/engine/src/index.ts`. So the dev server, production build, and the web test suite
all consume the live TypeScript source — no manual engine rebuild step, and no chance of a
stale `dist` shipping outdated data. (This bit once: a stale 5-region `dist` rendered behind
a freshly-baked 10-region map, so the new regions showed on the map but resolved to no data
when selected. `web/test/engineBoundary.test.ts` now guards that all 10 regions reach the
client.) The engine's `dist` is still built (`tsc -p tsconfig.build.json`) for `tsc --noEmit`
type-resolution and for any external consumer, but it is no longer on the web runtime path.

`WorldState` is the whole game in one object: `turn`/`year`/`status`/`endingId`,
`resources` (politicalCapital + money), `climate` (temperatureAnomaly, co2Concentration,
annualEmissions), `regions[]`, `activeEffects[]` (ongoing policy effects still ticking),
`enactments[]` (active `{ policyId, regionId, capacity, complete }` records — the single source
of truth for what is enacted where, and how far each buildout has progressed), `log[]`, and
`rngSeed`.

---

## 4. The sub-model pipeline

The world model is a **pipeline of swappable sub-models**, each a pure module owning one
scientific concern and implementing a common interface:

```ts
interface SubModel { id: string; step(ctx: SimContext): void; }

interface SimContext {
  state: WorldState;     // the mutable draft for THIS turn
  params: ModelParams;   // every tunable constant (frozen DEFAULT_PARAMS by default)
  rng: Rng;              // seeded, deterministic
  scratch: TurnScratch;  // intermediate values passed BETWEEN sub-models within the turn
}
```

`TurnScratch` carries the values one stage computes for a later stage —
`deltaTemperature` (climate → support/constraints/biodiversity), `damageFraction`
(damage → economy), and `prevGdpPerCapita` / `prevPopulation` snapshots
(economy/demography → emissions/support, to measure this turn's growth).

`DEFAULT_MODELS` (`models/pipeline.ts`) is the ordered default. Each stage reads and writes
`ctx.state`/`ctx.scratch` in place:

| # | Sub-model      | Concern (default equation)                                            |
|---|----------------|----------------------------------------------------------------------|
| A | `carbonCycle`  | annual emissions → CO₂ concentration (airborne fraction; net-negative reduces ppm) |
| B | `climate`      | CO₂ → log forcing → equilibrium temp, approached with thermal lag    |
| C | `damage`       | temperature → quadratic GDP damage fraction (clamped ≤ 1)            |
| D | `economy`      | per-region GDP/capita growth; damage + water/land scarcity dampen the growth *increment* (toward zero), never reverse it into decay |
| F | `demography`   | per-region population, fertility, median age, education             |
| E | `emissions`    | per-region emissions **re-derived** from output × autonomous decarb |
| G | `constraints`  | per-region water + land availability (warming/population degrade)   |
| G | `biodiversity` | per-region ecosystem health                                          |
| H | `support`      | per-region public support + equity drift                            |
| I | `resources`    | global political-capital + money regeneration (closes the dual-resource loop) |
| J | `programs`     | charge recurring/buildout policy upkeep (GDP-scaled), advance buildout capacity, apply ramped buildout effects |

`programs` runs **last** so this turn's regenerated tax income (from `resources`) is available
to fund policy upkeep before the turn closes. See §4.2 for the policy funding model.

**Swapping fidelity:** `createSimulation(models?, params?)` assembles a pipeline from any
ordered `SubModel[]` and any `ModelParams`. Replace one entry (e.g. a multi-gas carbon
cycle with tipping points) without touching the others or the UI. The default
`advanceTurn` is just `createSimulation()` with `DEFAULT_MODELS` + `DEFAULT_PARAMS`.

### Policy effects are layered *after* the natural dynamics

A deliberate seam: the sub-models compute **only natural dynamics**. They do *not* read
`activeEffects` or apply policy deltas. Policy effects are applied in a single dedicated
step (`applyEffects`, `effects.ts`) **after** the whole pipeline runs.

This matters most for emissions: stage E *re-derives* `regionalEmissions` from economic
output every turn. If policy cuts were applied inside the pipeline, that re-derivation
would overwrite them. By layering ongoing emission cuts on top afterward, they persist —
which is what makes the multi-decade decarbonization (the "redemption arc") possible.

(Buildout policies are the one exception to the `applyEffects` seam: their ramped ongoing
effects are applied by the `programs` sub-model — also after stage E — because the magnitude
depends on per-region installed capacity. `spendAndRegister` deliberately does *not* register
a buildout's ongoing effects into `activeEffects`, so they are never double-applied.)

### 4.2 Policy funding model

Each policy declares a `funding` mode and a single `cost.money` that is a **global reference**
(1 money = $1B over a 5-year turn). The money actually charged in a region is scaled by that
region's share of world GDP (`regionCharge`); summed over all regions it recovers the global
reference. `cost.politicalCapital` is charged once per enactment, unscaled.

| funding | when money is charged | effect | examples |
|---|---|---|---|
| `one-time`  | once at enactment (`spendAndRegister`) | permanent | carbon-tax, degrowth, orbital, off-world |
| `recurring` | every turn while active (`programs`), never completes | flat | climate-adaptation |
| `buildout`  | every turn until installed capacity reaches 100%, then stops | ramps with capacity (`delta × capacity`), persists at full after completion | renewable-subsidy, nuclear, reforestation, transit, education |

A `buildout` policy carries a `BuildoutSpec` (`ratePerTurn`, per-region `baselineByRegion`,
`defaultBaseline`). Each `Enactment` tracks `capacity` (0–1) advancing by `ratePerTurn` while
funded; an underfunded turn idles (no charge, no advance) but already-installed capacity keeps
delivering its benefit. The starting budget (`startResources.money`) and these costs are tuned
so money is a lasting, region-by-region constraint rather than only mattering on turn 1.

**Cancelling an active program** (`applyCancellations`, run at the top of `advanceTurn` from its
`cancellations` argument): a `buildout` is *frozen* — flagged `cancelled` so `programs` stops
charging upkeep and advancing capacity, while the installed capacity keeps delivering its benefit
(the enactment is kept, never deleted). A `recurring` fund is *ended* — its enactment and ongoing
`ActiveEffect`s are removed (upkeep and benefit both stop). A `one-time` policy is permanent and
cannot be cancelled.

---

## 5. Data flow: `advanceTurn` → `useGame` → components/scene

### Inside one turn (`simulation.ts`)

```
advanceTurn(state, selections, cancellations):       // selections/cancellations: { policyId, regionId }[]
  0. guard: throw if state.status === 'ended'
  1. validateSelection — throw if unaffordable / unavailable / already enacted in region
  2. draft = structuredClone(state)                  // never mutate the input
  2b. applyCancellations(draft, cancellations)        // freeze cancelled buildouts / end recurring funds
  3. spendAndRegister(draft, selections)             // charge PC + one-time money, push Enactments,
     →  queue NON-buildout ONGOING effects into activeEffects, return this turn's IMMEDIATE effects
  4. run DEFAULT_MODELS over a fresh SimContext       // the natural pipeline (§4); `programs` (last)
     →  charges recurring/buildout upkeep, advances capacity, applies ramped buildout effects
  5. applyEffects(draft, immediate)                   // layer non-buildout policy deltas on top; tick/expire ongoing
  6. draft.climate.annualEmissions = Σ regionalEmissions   // always re-derived, never a settable target
  7. draft.rngSeed = rng.seed; turn += 1; year += TURN_YEARS; push 'turn-advanced' event
  8. evaluateEnding(draft) — set status='ended' + endingId if it fires
  return { state: draft, events, diagnostics }
```

### Across turns (`web/src/game/useGame.ts`)

`useGame` is the controller. It owns the React state and is the *only* place the web layer
calls the engine:

```
useState: state (WorldState), selected (policy ids), lastEvents,
         history (climate points), turnLog (full per-turn snapshots + diagnostics)

useState also: staged ({policyId,regionId}[]), cancels ({policyId,regionId}[])

stage / unstage(id, region)     → add/remove a region-targeted enactment for this turn
toggleCancel(id, region)        → mark/unmark a committed program in a region to stop
costNow / upkeepNext            → live previews (stagedCostNow / upkeepNextTurn in game/policyView.ts)
validation                      → validateSelection(state, staged); canEndTurn = playing && ok
endTurn()                       → advanceTurn(state, staged, cancels)
                                  → setState(next); setLastEvents(events)
                                  → append snapshot to history; append {state,diagnostics} to turnLog
                                  → clear staged + cancels
ending                          → ENDINGS[state.endingId] when status === 'ended'
reset()                         → createInitialState() + clear everything
```

The `PolicyBoard` (driven by `App`'s `selectedRegionId`) derives its two lanes from
`regionPolicyView(state, regionId, staged, cancels)` (`game/policyView.ts`, a pure, unit-tested
selector) and calls `stage` / `unstage` / `toggleCancel`. Drag, click, and keyboard all funnel to
the same actions; an unaffordable enact is blocked with an inline error rather than a state change.

`history` (a per-turn `{ year, temperature, co2 }` series) is accumulated by the hook, not
the engine — the engine is stateless across calls, so the client keeps the trend data for
the dashboard sparkline.

### From state to pixels (`App.tsx` → scene + HUD)

`App` reads the controller and fans state out to two presentation trees:

- **World map** (`scene/WorldMap.tsx`): a flat, static map of the 10 regions rendered from the
  pre-baked `assets/world-map.svg` (real Natural Earth geometry; one filled `<path>` per region
  in its fixed `REGION_COLORS` hue, region partition lines, no internal country borders). The
  component inlines the SVG and wires click-to-select + selection dimming; `App` owns the
  `selectedRegionId` (a *view* concern, not engine state). India follows the Government-of-India
  depiction: Aksai Chin is **cut out of China's geometry and reassigned to South Asia** at bake
  time (see below), so it carries the South Asia hue and selects with South Asia — not an overlay
  painted on top. The geometry is baked offline by `scripts/generate-map.mjs` — **no D3/TopoJSON
  ships at runtime** (the former R3F globe and `three` are gone).
- **HUD** (`components/`, Mantine DOM overlay): `ResourceBar`, `Dashboard` (+ `Sparkline`
  trend), `RegionPanel` (the selected region), `TurnLog` (a scrollable, newest-first history of
  every per-turn data point — a global "Planet" block plus the selected region's full block, each
  value carrying a good/bad-colored change chip vs. the prior turn; each non-baseline entry also has
  a per-entry **"More"** toggle revealing a `Collapse`d CALC section of the engine's `TurnDiagnostics`
  calc internals), `PolicyTray` of `PolicyCard`s,
  and `EndingScreen` (shown when `game.ending` is non-null).

### Events → sound

`advanceTurn` returns `GameEvent[]`; `App` runs an effect over `game.lastEvents` and calls
`sfx.playForEvent(e)`. `useSfx` maps each event type to a short Web Audio tone
(`audio/sound.ts`). The hook's return value is memoized to a **stable identity** so the
effect doesn't re-fire and replay sounds on unrelated re-renders. This is the only place
engine events drive presentation today; disasters/milestones are wired but reserved for
later tuning.

---

## 6. Key invariants

These hold across the engine and are guarded by the test suite. Treat them as load-bearing.

1. **Determinism.** Same `WorldState` + same `selections` ⇒ byte-identical result. No I/O,
   no globals, no wall-clock or `Math.random()` in logic. All randomness flows through the
   seeded `mulberry32` RNG (`rng.ts`), whose state lives in `WorldState.rngSeed` and is
   persisted back after each turn. A golden-trajectory snapshot + a determinism test lock
   this in.

2. **Non-mutation.** `advanceTurn` never mutates its input. It `structuredClone`s the state
   up front and mutates only the draft. Callers can safely keep the prior state (the React
   client relies on this for its `history` series and for referential-change re-renders).

3. **Ended-game guard.** `advanceTurn` **throws** if called on a state with
   `status === 'ended'`. The client mirrors this guard defensively — `useGame.endTurn`
   early-returns when ended — so the UI shows the `EndingScreen` instead of advancing. Once
   a turn returns an ended state, stop calling the engine.

4. **Emissions are derived, never set.** `climate.annualEmissions` is *always* recomputed
   as `Σ regionalEmissions` at the end of the turn. It is not a valid `EffectTarget`;
   policies move emissions only via per-region `regionalEmissions` deltas.

5. **Index clamping.** All 0–100 indices (support, equity, biodiversity, water, land,
   education, health) are clamped to `[0, 100]` both in their sub-models and when policy
   effects are layered (`CLAMPED_TARGETS` in `effects.ts`). Property-based (fast-check)
   invariant tests assert that after any valid `advanceTurn`, every index stays in range,
   `population ≥ 0`, and every numeric field is finite. (`medianAge` is the one unclamped
   field — a known, tracked gap.)

6. **Validation precedes mutation.** `spendAndRegister` assumes the selection is already
   valid — `advanceTurn` calls `validateSelection` first. Validation rejects duplicate
   `(policy, region)` pairs, unknown policy/region ids, a policy already enacted in that
   region, prerequisites not enacted in that region, and selections whose one-time spend
   exceeds the budget. (Recurring/buildout upkeep is not pre-validated: the `programs`
   sub-model self-guards, idling a program in a region it cannot fund this turn.)

---

## 7. Known seams (where the next change lands)

- **Drag accessibility.** The `PolicyBoard`'s drag-between-lanes is a framer-motion enhancement;
  click + Enter/Space are the canonical, tested actions. Keyboard-only *drag* reordering and a
  reduced-motion path are not yet implemented.
- **Resuming a frozen buildout.** A cancelled buildout stays in the Active lane frozen at its
  installed %, but there is no "resume" action to restart its rollout — it would need a small
  engine + UI affordance.
- **Balance.** `data/scenario.ts` is the single tuning surface (every constant in
  `DEFAULT_PARAMS` + the starting `DEFAULT_SCENARIO`), alongside the policy costs/funding in
  `policies.ts`. Do-nothing still ends in an eco-collapse loss around 2090; the region-scaled
  policy economy (build/upkeep, buildout rates, baselines, starting budget) is tuned for
  meaningful tradeoffs but remains a playtesting surface.
- **Disaster/random events.** The RNG is threaded through every turn but only a
  `turn-advanced` event is emitted today; seeded disaster/milestone events are reserved.
- **Art & audio.** Card art is referenced by asset *key* and SFX are synthesized in-browser;
  both are placeholder pipelines meant to be swapped for real assets (and Howler) without
  code changes.
- **World-map boundaries.** The map is a baked `assets/world-map.svg`; regenerate it with
  `scripts/generate-map.mjs` whenever regions or borders change. The country→region lookup and
  the GoI correction live in `scripts/regions.mjs` (shared with `test/regions.test.ts`).
  `applyGoiCorrection` uses `polygon-clipping` to cut the GoI claim out of China and re-add it as
  a `south-asia` feature; the partition mesh is then rebuilt from the corrected features with
  `topojson-server`'s `topology()` so a single GoI-aligned border is drawn (the Chinese-aligned
  line is gone). `polygon-clipping` emits RFC-7946 winding while d3-geo/`world-atlas` use the
  opposite, so clipped rings are reversed (`rewindToD3`) before baking. The GoI claim polygon is
  still an **approximate** footprint — swap in a vetted GoI-aligned boundary before a public
  release. Bumping `world-atlas` from the 110m to the 50m dataset sharpens coastlines if higher
  fidelity is wanted.

---

## 8. Development process

Two processes are mandatory for all work in this repo (also stated in `CLAUDE.md`):

1. **Test-Driven Development.** Write a failing test first, implement the minimum to make
   it pass, then refactor. Every new test joins the package vitest suite. After development
   is done, the **full** automated suite is run to check for regressions before the work is
   considered complete: `pnpm -r test` and `pnpm -r typecheck`.

2. **ARCHITECTURE.md is updated before every commit.** This document must reflect the change
   and be staged before committing. Enforced by a pre-commit hook
   (`.claude/hooks/require-architecture-md.sh`, wired via `.claude/settings.json` as a
   `PreToolUse` hook on `git commit`): the commit is blocked unless `ARCHITECTURE.md` is among
   the staged files.
