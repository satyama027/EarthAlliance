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
│        ├─ components/      # Mantine DOM HUD (ResourceBar, RegionInfoBox, DataOverlay, DrillDownPanel,
│        │                   #   MetricGrid, Composition, MetricTrend, ElectricityPanel, EmissionsBySource,
│        │                   #   GenerationMix, PolicyBoard, PolicyCard, PolicyDetailOverlay, EndingScreen, Sparkline)
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
`avgSupport`, `worldPopulation`, `worldGdp`, `moneyGain`; and
per-region `scarcityByRegion`, `constraintFactorByRegion`, `outputRatioByRegion`, `popGrowthByRegion`,
`waterLossByRegion`, `landLossByRegion`, `bioLossByRegion`, the three support-change contributions
(`supportTempTermByRegion`, `supportEconTermByRegion`, `supportEquityTermByRegion`),
`equityDriftByRegion`, the policy-program fields `programSpendByRegion` (upkeep/buildout
money spent per region this turn) + `capacityByRegionPolicy` (installed capacity 0–1, keyed
`policyId:regionId`), and the per-region income fields `taxIncomeByRegion` (GDP tax income) +
`carbonTaxRevenueByRegion` (Carbon Tax revenue, 0 where not active). These let the client show *why*
values moved *exactly*, without re-deriving
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
`resources` (money), `climate` (temperatureAnomaly, co2Concentration,
annualEmissions), `regions[]`, `activeEffects[]` (ongoing policy effects still ticking),
`enactments[]` (active `{ policyId, regionId, capacity, complete }` records — the single source
of truth for what is enacted where, and how far each buildout has progressed), `log[]`, and
`rngSeed`.

**Sectoral emissions.** Each `Region` carries a six-source emissions breakdown — `electricity`,
`transport`, `aviationShipping`, `industry`, `agriculture`, `landUse` (Gt CO₂/yr; `landUse` may
be negative = a forest sink) — that **sums to** `regionalEmissions` (the derived total).
`electricity` is itself derived as `electricityDemand × gridCarbonIntensity`.

**Generation mix.** Each region carries a `generationMix` — per-source shares (summing to 1) across
eight sources: fossil `coal`/`gas`/`oil`, zero-carbon-but-not-renewable `nuclear`, and renewable
`hydro`/`wind`/`solar`/`geothermal` (`generation.ts`; emission factors normalized to coal = 1.0:
gas 0.45, oil 0.70, others 0). **`gridCarbonIntensity` is DERIVED** from the mix
(`Σ share × factor`) by the `generationMix` sub-model — it is **no longer a policy lever**.
Renewable/nuclear policies are **fossil-replacement conversions** (`ConversionSpec` in `types.ts`):
each turn, while funded, they convert a *fixed* slice of the **dirtiest available fossil**
(coal → oil → gas; gas is the cleanest fossil, so it retires last) into their clean source —
`drawFromFossils` pulls the fossil down and the same amount is added to the clean share, so the move
is **net-zero to Σ** and two such policies never dilute each other (no renormalization fight). The
conversion is applied in the `programs` sub-model (it is *not* a declared `effect`). **Renewables are
uncapped** (land isn't the binding constraint — they can clean the grid to ~100%, gated only by grid
storage and remaining fossil), split between wind/solar by a per-region `SOLAR_WEIGHT`. **Nuclear is
capped per region by domestic uranium reserves** (`NUCLEAR_CAP`, derived from IAEA/NEA Red Book
reserves × 40 GWh/t ÷ regional generation ÷ a 60-yr fleet life, clamped 0.05–0.85): uranium-rich
regions (Oceania, Sub-Saharan, Russia-Central Asia) go nuclear-heavy; uranium-poor giants (East Asia,
Europe) are floored and lean on renewables. `rebalanceMix` remains as a Σ-drift safety net (now a
no-op since conversions conserve Σ). Mixes are seeded from real ~2024 generation data (Ember/EIA/IEA),
with `electricityDemand` set so `demand × intensity` preserves each region's real electricity CO₂.
Because `electricityDemand` is that abstract coal-equivalent unit (not TWh), a fixed per-region
calibration `TWH_PER_DEMAND_UNIT` (baked from real ~2025 generation in `REAL_GENERATION_TWH_2025`,
`data/regions.ts`) bridges it to a player-facing figure: `generationTWh(region) = electricityDemand ×
factor` (`generation.ts`), which scales with demand as it grows. Unknown region ids fall back to the
demand-weighted global average factor.

Three remaining **coupling variables** carry the other trade-offs: `electricityDemand`,
`agriculturalProductivity` (index, baseline 100), and `energyStorageCapacity` (0–1, gates renewable
effectiveness). The `emissions` sub-model re-derives the activity-driven sources from their drivers
each turn with **no autonomous decarbonization** (replacing the old flat `AUTON_DECARB`); policy cuts
and the `electricity`/total derivations are layered at finalization (see §4). **Level-shift couplings**
that would otherwise drift (`agriculturalProductivity` from farming) are modelled as `immediate`
one-time shifts; emission cuts stay `ongoing` flows. **EV Subsidies** (`ev-transition`) is special:
its transport→electricity conversion is a per-turn flow driven by buildout capacity in the
`evElectrification` sub-model — each turn a capacity-driven slice of road transport is electrified
(tailpipe → 0 at full buildout, reached over ~10 turns at `ratePerTurn 0.10` — the card copy now
states this multi-decade timescale) and added to electricity demand at `EV_DEMAND_FACTOR` (0.35, the
EV efficiency gain net of battery-charging losses), tracked drift-free against a GDP-grown baseline.
Aviation/shipping has a hard-to-abate **floor** (`AVIATION_FLOOR` of its activity-driven level,
stashed by `emissions` and enforced at finalization). All deltas/costs are provisional pending a
balance pass.

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
| E | `emissions`    | per-source emissions **re-derived** from drivers (transport/industry/aviation × output growth; agriculture × population; electricityDemand × output) — **no autonomous decarb**; electricity is derived at finalization, and the per-turn aviation hard-to-abate floor is stashed for finalization |
| G | `constraints`  | per-region water + land availability (warming/population degrade; an agricultural-productivity shortfall below 100 also erodes land) |
| G | `biodiversity` | per-region ecosystem health                                          |
| H | `support`      | per-region public support + equity drift                            |
| I | `resources`    | global money regeneration from taxed GDP (the single spendable resource) |
| J | `programs`     | **region-by-region, stage-order**: charge recurring/buildout upkeep (GDP-scaled; FLAT for conversions), advance generic buildout capacity + ramped effects, and run renewable/nuclear **fossil→clean conversions** (net-zero to Σ) |
| K | `evElectrification` | for each EV-Subsidies enactment, convert a capacity-driven slice of road transport into electricity demand (tailpipe → 0 at full buildout), drift-free against a GDP-grown baseline |
| L | `generationMix` | rebalance each region's mix to Σ = 1 (`rebalanceMix` — drift safety net, retiring dirtiest fossils coal→oil→gas; a no-op now conversions are net-zero) and **derive** `gridCarbonIntensity` from it |
| M | `carbonTax` | for each active Carbon Tax enactment: add `CARBON_TAX_RATE × fossilTaxBase` to the treasury and hold a **flat** `−CARBON_TAX_SUPPORT_HIT` public-support offset; auto-repeal a region whose fossil base has fallen to 0 |

`programs` runs after `resources` so this turn's regenerated tax income is available to fund policy
upkeep; `evElectrification` then runs (capacity already advanced), `generationMix` rebalances + derives
grid intensity, and `carbonTax` runs **last** so it taxes this turn's post-decarbonization grid
intensity and sectors — the revenue and the tax's base both shrink automatically as a region cleans up.
See §4.2 for the policy funding model and the Carbon Tax mechanic.

**Swapping fidelity:** `createSimulation(models?, params?)` assembles a pipeline from any
ordered `SubModel[]` and any `ModelParams`. Replace one entry (e.g. a multi-gas carbon
cycle with tipping points) without touching the others or the UI. The default
`advanceTurn` is just `createSimulation()` with `DEFAULT_MODELS` + `DEFAULT_PARAMS`.

### Policy effects are layered *after* the natural dynamics

A deliberate seam: the sub-models compute **only natural dynamics**. They do *not* read
`activeEffects` or apply policy deltas. Policy effects are applied in a single dedicated
step (`applyEffects`, `effects.ts`) **after** the whole pipeline runs.

This matters most for emissions: stage E *re-derives* each **per-source** emission from its
economic/population driver every turn (with no autonomous decarb). If policy cuts were applied
inside the pipeline, that re-derivation would overwrite them. By layering ongoing per-source cuts
(and the coupling-variable moves — grid intensity, electricity demand, ag productivity) on top
afterward, they persist — which is what makes the multi-decade, policy-only decarbonization (the
"redemption arc") possible. `electricity` is special: it is **not** a stored stock the pipeline
grows but a value **derived at turn finalization** as `electricityDemand × gridCarbonIntensity`.
`gridCarbonIntensity` is itself **derived** (by the in-pipeline `generationMix` sub-model) from the
generation mix that renewable/nuclear policies grow — so the player decarbonizes power by shifting
the mix toward clean sources or curbing demand, never by writing electricity or grid intensity
directly (neither is an `EffectTarget`). Share-growth effects flow only through `programs` (buildout
ongoing effects), keeping the mix conserved; nothing writes shares in the post-pipeline `applyEffects`.

(Buildout policies are the one exception to the `applyEffects` seam: their ramped ongoing
effects are applied by the `programs` sub-model — also after stage E — because the magnitude
depends on per-region installed capacity. `spendAndRegister` deliberately does *not* register
a buildout's ongoing effects into `activeEffects`, so they are never double-applied.)

### 4.2 Policy funding model

Each policy declares a `funding` mode and a single `cost.money` that is a **global reference**
(1 money = $1B over a 5-year turn). The money actually charged in a region is scaled by that
region's share of world GDP (`regionCharge`); summed over all regions it recovers the global
reference. Money is the **only** spendable resource — there is no second currency. **Exception:**
the two **fossil-replacement** policies (renewable-subsidy, nuclear-buildout) carry a `conversion`
spec and are **flat-priced** — `regionCharge` returns their `cost.money` unchanged, the same money
in every region regardless of GDP.

| funding | when money is charged | effect | examples |
|---|---|---|---|
| `one-time`  | once at enactment (`spendAndRegister`) | permanent | degrowth, orbital, off-world, fuel-efficiency |
| `recurring` | every turn while active (`programs`), never completes | flat | climate-adaptation, carbon-tax (`cost 0`), flight-freight-levy |
| `buildout`  | every turn until installed capacity reaches 100%, then stops | ramps with capacity (`delta × capacity`), persists at full after completion | reforestation, transit, education, grid-storage, EV, sustainable-fuels, industrial-electrification, green-steel-cement, CCS, circular-economy, organic-farming, precision-agriculture |
| `buildout` + `conversion` | every turn (FLAT cost) until the per-region cap is hit or fossils run out | converts a fixed grid-share fossil→clean, net-zero to Σ; installed clean share persists in the mix | renewable-subsidy (uncapped, storage-gated, wind/solar), nuclear-buildout (uranium-capped, firm) |

**Storage gating** (`STORAGE_FLOOR + (1 − STORAGE_FLOOR) × energyStorageCapacity`, `STORAGE_FLOOR = 0.6`):
the renewable conversion's per-turn **rate** is scaled by this factor — at zero storage only 60% of the
slice converts, rising to 100% once `energyStorageCapacity` is fully built. Firm nuclear leaves
`storageGated` unset and converts at full rate immediately — so the player is rewarded for building
storage before over-building renewables. (Generic buildout ongoing effects can still set `storageGated`
to scale `delta × capacity` the same way, though no current generic policy does.) The coupling stocks policies move (`gridCarbonIntensity`, `energyStorageCapacity` → `[0,1]`;
`electricityDemand`, `agriculturalProductivity` → `≥ 0`) are clamped to their valid ranges at turn
finalization, just before `electricity` and the totals are derived.

For `recurring`/`buildout`, the **first** per-turn charge lands on the *enactment* turn (`programs`
runs over the just-added enactment), so a program's "setup cost" equals one upkeep payment. The UI
reflects this: `stagedCostNow` and the `validateSelection` money gate both count that first-turn
charge for every funding mode (see §6 invariant 6), so staging a program immediately drops the
remaining-money readout and is blocked if unaffordable.

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

**The Carbon Tax** (`carbon-tax`, `recurring`, `cost 0`) is a lever, not a spending program: while
active it *raises* treasury money instead of costing it. Its two state-dependent effects are applied
imperatively by the `carbonTax` sub-model (stage M), because neither `money` (a global resource) nor
a *conditional flat* support offset can be expressed as declared `EffectTarget` deltas:

- **Revenue** = `CARBON_TAX_RATE × fossilTaxBase(region)` added to the treasury, where `fossilTaxBase`
  (`income.ts`) = fossil power (`electricityDemand × gridCarbonIntensity`, recomputed since
  `electricity` is only derived at finalization) + `transport` + `industry` + `aviationShipping`
  (agriculture and land-use excluded — non-fossil). Revenue therefore shrinks automatically as the
  region decarbonizes.
- **Support cost** = a **flat** `−CARBON_TAX_SUPPORT_HIT` (5) offset *held while active*, not an
  accumulating per-turn drain. It uses the `evElectrification` re-base idiom (`carbonSupportApplied`
  on the `Enactment`): each turn applies only `desired − applied`, so support drops 5 the turn the tax
  activates, stays flat while active, and springs back the turn it deactivates. (A declared `ongoing`
  −5 effect would re-subtract 5 every turn and spiral support into the `economic-ruin` loss floor.)

Only a modest `industry −0.05 Gt/yr` price-nudge is a declared effect. A tax is **active** only while
its region still has a fossil base (`> 0`); a fully-decarbonized region **auto-repeals** it (revenue 0,
offset restored, enactment + its `activeEffect` dropped). On **manual repeal**, `applyCancellations`
reverses the baked-in support offset (via `carbonSupportApplied`) before dropping the recurring
enactment, so support returns to its no-tax line. `income.ts` also exports `regionTaxIncome`
(per-region GDP tax income) — the same helpers feed the `taxIncomeByRegion`/`carbonTaxRevenueByRegion`
diagnostics and the web per-region **Income** display.

---

## 5. Data flow: `advanceTurn` → `useGame` → components/scene

### Inside one turn (`simulation.ts`)

```
advanceTurn(state, selections, cancellations):       // selections/cancellations: { policyId, regionId }[]
  0. guard: throw if state.status === 'ended'
  1. validateSelection — throw if unaffordable / unavailable / already enacted in region
  2. draft = structuredClone(state)                  // never mutate the input
  2b. applyCancellations(draft, cancellations)        // freeze cancelled buildouts / end recurring funds
  3. spendAndRegister(draft, selections)             // charge one-time money, push Enactments,
     →  queue NON-buildout ONGOING effects into activeEffects, return this turn's IMMEDIATE effects
  4. run DEFAULT_MODELS over a fresh SimContext       // the natural pipeline (§4); `programs`,
     →  then `evElectrification` (transport→demand), then `generationMix` (rebalance + derive intensity)
  5. applyEffects(draft, immediate)                   // layer non-buildout policy deltas on top; tick/expire ongoing
  6. finalize emissions: per region, clamp coupling stocks (gridCarbonIntensity/energyStorageCapacity
     → [0,1]; electricityDemand/agriculturalProductivity → ≥0) and the aviation floor; then
     electricity = electricityDemand × gridCarbonIntensity; regionalEmissions = Σ six sources;
     draft.climate.annualEmissions = Σ regionalEmissions
     // electricity + the regional/global totals are always derived, never settable targets
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
selector) and calls `stage` / `unstage` / `toggleCancel` via `performPrimary`. **Inspecting and acting
are separate gestures**: a **single click** (or `Enter`/`Space`) opens the `PolicyDetailOverlay` to
read the policy; a **double-click** or a **drag into the other lane** runs `performPrimary` (enact /
unstage / stop). Single-vs-double is resolved with a ~220ms timer in the board's pointer handler (a
tap schedules "open overlay"; a second tap on the same card within the window cancels it and acts).
Locked / inspect-only cards always just open the overlay. An unaffordable enact is blocked with an
inline error rather than a state change. The Active lane holds only **ongoing** policies — an
in-progress buildout or a recurring fund — each shown simply as **"Active"** (no progress bar, no
build-rate label). A buildout/conversion that **completes**, a one-time **permanent** policy, and a
**frozen** (cancelled) buildout are dropped from the lane by `regionPolicyView`: they stay enacted in
engine state (their effects persist) but no longer need a card, so they leave the board entirely
(they never re-appear in Available, being already enacted). The Active lane shows empty **drop
slots** as targets.
Dragging is a custom pointer gesture: the lifted card is rendered as a `CardFace` clone in a **portal
overlay on `document.body`** (so it floats above both lanes and is never clipped by a lane's
`ScrollArea`), and the drop lane is resolved with `document.elementFromPoint` against each lane's
`data-droplane` attribute — scroll-correct, unlike the prior `getBoundingClientRect` math. A press
under a 5px threshold is treated as a tap.

The `PolicyDetailOverlay` (`components/PolicyDetailOverlay.tsx`) follows the `DataOverlay` pattern
(dark backdrop, centered surface, framer-motion fade + rise; closes on ✕ / `Escape` / backdrop). It
shows the enlarged category header, full description, a per-effect **breakdown** (friendly label,
signed magnitude with units, "each turn"/"one-time" scope, good/bad coloring, storage-gated tag),
cost + funding meaning, a recurring "runs until cancelled" callout, and a
footer **action button** that runs the same `performPrimary` then closes. The presentation helpers are
pure and unit-tested in `game/policyDetails.ts` (`effectLines`, `fundingBlurb`, `durationLine`,
`cardAction`).

`history` (a per-turn `{ year, temperature, co2 }` series) is accumulated by the hook, not
the engine — the engine is stateless across calls, so the client keeps the trend data for
the dashboard sparkline.

### From state to pixels (`App.tsx` → scene + HUD)

`App` reads the controller and fans state out to two presentation trees:

- **World map** (`scene/WorldMap.tsx`): a flat, static map of the 10 regions rendered from the
  pre-baked `assets/world-map.svg` (real Natural Earth geometry; one filled `<path>` per region
  in its fixed `REGION_COLORS` hue, region partition lines, no internal country borders). The
  component inlines the SVG and wires click-to-select + selection dimming; `App` owns the
  `selectedRegionId` (a *view* concern, not engine state). A click on the **ocean / empty space**
  (anything without a `data-region`) calls `onSelectRegion(null)` — the in-map way to **deselect**
  back to the planet view (a region-path click is caught by its own listener and is a no-op for the
  background handler). India follows the Government-of-India
  depiction: Aksai Chin is **cut out of China's geometry and reassigned to South Asia** at bake
  time (see below), so it carries the South Asia hue and selects with South Asia — not an overlay
  painted on top. The geometry is baked offline by `scripts/generate-map.mjs` — **no D3/TopoJSON
  ships at runtime** (the former R3F globe and `three` are gone).
  The page is laid out top→bottom so the action sits above the fold: a **sticky `ResourceBar`
  header** (`position: sticky; top: 0`) → a **map row** (map `Grid.Col span={{ base: 12, md: 9 }}`,
  fixed `height: 480`; the inline SVG's `preserveAspectRatio="meet"` keeps the whole world centered)
  beside a compact **`RegionInfoBox`** (`span={{ base: 12, md: 3 }}`, stacking on narrow) →
  full-width `PolicyBoard` → full-width `TurnLog` (demoted to bottom as reference/history). The map's
  height is fixed independent of the info box, so a short/tall info box never letterboxes the SVG.
  The **full** per-region/per-planet emissions detail is not inline — it lives in the `DataOverlay`,
  now opened from the `RegionInfoBox` 📊 button. (This replaced the earlier two-column
  `Grid align="stretch"` layout, where a tall selected-region panel stretched the map container and
  letterboxed the SVG.)
- **HUD** (`components/`, Mantine DOM overlay): `ResourceBar` (left: year/turn + an inline climate
  cluster — **Warming** colored by `temperatureColor` and **CO₂** (emissions lives in the
  `RegionInfoBox`/`DataOverlay`, not duplicated here); right: just the **remaining** money badge —
  `resources − costNow`, going red with an `⚠ over budget` `role="alert"` when a staged selection
  exceeds the budget; rendered as the sticky top header), `RegionInfoBox` (the compact glance-card
  beside the map — a single region click surfaces its headline **GDP/capita · emissions · income ·
  public support**, or planet **warming · CO₂ · emissions** when none is selected, each state with a
  **📊** button that opens the `DataOverlay`), `DataOverlay` (the "Full data" window — a full-screen
  `Overlay` following the `EndingScreen` pattern that **hosts the `DrillDownPanel`**, passing the
  entity `{kind:'planet'}` / `{kind:'region',id}` and the full `turnLog`; closes on ✕ / `Escape` /
  backdrop), `DrillDownPanel` (the **config-driven, recursive metric drill-down** that replaced the
  flat `Dashboard`/`RegionPanel`: an entity header + breadcrumb over one of `MetricGrid` (the top-level
  six-tile grid — **Emissions · Public support · Income · Biodiversity · Water · Land**), `Composition`
  (a "contribution of each part" stacked bar / signed ledger), `MetricTrend` (a value-vs-year line
  graph), or the custom **`ElectricityPanel`** for the **Electricity** node (metric-tree kind
  `electricity`) — a **generation-mix donut** (8 sources, `Fossil`/`Clean`-grouped legend, clean share
  in the hole) over **converging emission streams** (stream width = a source's Gt, merging to the
  electricity total; nuclear + renewables are dashed, zero-width, labelled `0`), keeping generation and
  emissions two **separate** graphics. The **metric tree** (`game/metricTree.ts`) declares each node's
  kind; every value/series is a
  pure selector over `turnLog` (see below), so the planet and any region share one tree),
  `TurnLog` (a scrollable, newest-first history of
  every per-turn data point — a global "Planet" block plus the selected region's full block, each
  value carrying a good/bad-colored change chip vs. the prior turn; each non-baseline entry also has
  a per-entry **"More"** toggle revealing a `Collapse`d CALC section of the engine's `TurnDiagnostics`
  calc internals), `PolicyBoard` of `PolicyCard`s (with the single-click `PolicyDetailOverlay`),
  and `EndingScreen` (shown when `game.ending` is non-null).
- **The metric drill-down** (`game/metricTree.ts` + `game/metricSeries.ts`) is the data spine of the
  `DataOverlay`. Each `MetricNode` carries a single `read(reading) → number` accessor: the node's
  **headline value** is `read` of the latest turn's reading and its **trend series** is `read` mapped
  over *every* turn — so composition and trend fall out of one accessor. A `Reading` is a uniform shape
  produced identically from a `Region` or the `planetAggregate` rollup (`game/planetAggregate.ts`), so
  the tree never branches on entity type. **No engine change and no new storage**: every series is
  derived from `useGame`'s `turnLog`, which already holds the turn-0 baseline plus a full `WorldState`
  snapshot per turn — so "history for the planet and all regions from the start of the game" already
  exists. The `Reading` carries the six emission `sources`, per-fuel `electricityByFuel`
  (`electricityFuelEmissions` = `electricityDemand × share × emissionFactor`, summing to the
  `electricity` total), the 8-source `generationMix`, the total real generation `generationTWh`
  (engine `generationTWh`; planet = Σ regions), and the income `budget`. Emissions →
  **Electricity** is the custom `ElectricityPanel` (generation donut + total-generation TWh headline +
  converging emission streams — see §5 components) driven by `generationMix` + `generationTWh` +
  `electricityByFuel`; the four index metrics and every
  leaf sector are trend leaves (no modeled composition). The change chip (headline + trend) uses the
  shared `changeSince`/`CHANGE_TONE_COLOR` vocabulary — `▲/▼` colored good/bad, or a neutral-grey
  **`— flat`** when the value rounds to unchanged.
  Income composition reuses the `regionBudget` selector (`{ taxIncome, carbonTax, upkeep, net }`), the
  same one behind the `RegionInfoBox` Income stat. `planetAggregate` rolls the 10 regions into one
  reading: totals **sum**; the generation mix / grid intensity / storage are **demand-weighted**; crop
  yield and the five 0–100 quality metrics are **simple-averaged**. *(The generation-share mix is now
  surfaced as the `ElectricityPanel` donut; the grid-intensity gauge and coupling-variable levers the
  old panels showed are still not surfaced — `GenerationMix`/`RegionLevers`/`RegionIncome`/`MetricBar`
  remain retired pending a decision on the remaining levers.)*
- **Stacking order** (`Z_LAYERS` in `theme.ts`): overlays render at `overlay` (1000:
  `DataOverlay`, `EndingScreen`) / `overlayRaised` (1100: `PolicyDetailOverlay`). Mantine portals
  tooltips to `document.body` as siblings of those overlays, so the theme lifts the **Tooltip**
  default `zIndex` to `tooltip` (2000) — otherwise hover help (e.g. the `RegionLevers` /
  `EmissionsBySource` tooltips) paints *behind* an open overlay's backdrop.

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

4. **Emissions totals and grid intensity are derived, never set.** Each region's `gridCarbonIntensity`
   is derived from its `generationMix` (`Σ share × factor`, shares kept conserved to 1 by the net-zero
   fossil→clean conversions, which draw the dirtiest fossil first: coal→oil→gas); at finalization `electricity` is recomputed as
   `electricityDemand × gridCarbonIntensity`, `regionalEmissions` as the sum of the six per-source
   fields, and `climate.annualEmissions` as `Σ regionalEmissions`. None of `gridCarbonIntensity`/
   `electricity`/`regionalEmissions`/`annualEmissions` is a valid `EffectTarget`; policies move
   emissions only via the five activity-driven source fields (`transport`, `aviationShipping`,
   `industry`, `agriculture`, `landUse`), the generation-share targets (`windShare`, `solarShare`,
   `nuclearShare`), and the coupling variables (`electricityDemand`, `agriculturalProductivity`).
   Property tests assert each `generationMix` sums to 1 and that `gridCarbonIntensity` equals the
   value derived from it after any valid `advanceTurn`.

5. **Index clamping.** All 0–100 indices (support, equity, biodiversity, water, land,
   education, health) are clamped to `[0, 100]` both in their sub-models and when policy
   effects are layered (`CLAMPED_TARGETS` in `effects.ts`). Property-based (fast-check)
   invariant tests assert that after any valid `advanceTurn`, every index stays in range,
   `population ≥ 0`, and every numeric field is finite. (`medianAge` is the one unclamped
   field — a known, tracked gap.)

6. **Validation precedes mutation.** `spendAndRegister` assumes the selection is already
   valid — `advanceTurn` calls `validateSelection` first. Validation rejects duplicate
   `(policy, region)` pairs, unknown policy/region ids, a policy already enacted in that
   region, prerequisites not enacted in that region, and selections whose **this-turn money**
   exceeds the budget. "This-turn money" is each selection's `regionCharge` for **every** funding
   mode — one-time at enactment, plus recurring/buildout **first upkeep** (which `programs` charges
   on the enactment turn), so the setup cost of a program must be affordable up front. (Only
   *subsequent*-turn upkeep stays unvalidated: the `programs` sub-model self-guards, idling a
   committed program in a region it cannot fund that later turn.)

---

## 7. Known seams (where the next change lands)

- **Drag accessibility.** The `PolicyBoard`'s drag-between-lanes is a custom pointer-gesture
  enhancement (floating portal overlay + `elementFromPoint` drop); tap/click + Enter/Space are the
  canonical, tested actions (jsdom can't exercise the pixel-level drag, so the drag itself is verified
  manually). Keyboard-only *drag* reordering and a reduced-motion path are not yet implemented.
- **Resuming a frozen buildout.** A cancelled buildout keeps delivering its installed benefit in
  engine state but is now dropped from the Active lane (it shows no card), so there is neither a
  "resume" action to restart its rollout nor any UI surface for its frozen state — both would need a
  small engine + UI affordance. (The same is true for completed buildouts and one-time permanents:
  they are enacted and effective but no longer visible on the board.)
- **Balance.** `data/scenario.ts` is the single tuning surface (every constant in
  `DEFAULT_PARAMS` + the starting `DEFAULT_SCENARIO`), alongside the policy costs/funding in
  `policies.ts`. The per-region starting data (`data/regions.ts`, `SAMPLE_REGIONS`) is
  **re-grounded to real ~2025 figures**: `gdpPerCapita` is nominal USD; `regionalEmissions`
  is real territorial fossil+industry CO₂ summing to ~35.5 GtCO₂/yr (was an inflated 52);
  population/fertility/medianAge are real, and the soft 0–100 indices use real-world proxies
  (HDI sub-indices, `100−Gini`, water-stress, biodiversity-intactness). With this accurate
  baseline, do-nothing ends in an eco-collapse loss around **2095** (the golden snapshot in
  `test/integration.test.ts` locks the terminal point; `test/data.test.ts` locks the anchor
  values + the "East Asia is the largest emitter" structural invariant). It moved earlier (from
  ~2105) when the **sectoral-emissions** model removed the old flat autonomous-decarbonization
  cushion — with no free decarb, do-nothing emissions rise faster.
  **Sectoral balance pass (done):** the binding constraint on the player is *money throughput*
  (you can't fund every buildout in every region), so the decarbonization ceiling is set by tax
  income, which **never feeds climate** — raising `TAX_RATE` (now `0.03`) lifts the win ceiling
  without moving the do-nothing floor. At `0.03`, near-maximal well-sequenced decarbonization
  reaches a **green-utopia win** by 2200 (~0.74 °C, equity just over the 60 gate), while moderate
  play muddles through and do-nothing still collapses ~2095. `test/scenarios.test.ts` locks both
  ends (a *winnability* guard + the doom guard). Two correctness floors back the balance: the five
  activity sources are clamped `≥ 0` at finalization (a sector can't emit negative — only `landUse`
  is a sink), and the coupling stocks are range-clamped; `test/invariants.test.ts` asserts all of
  this (sources finite + `≥ 0`, `Σ sources == regionalEmissions`, stocks in range) over 200 random
  playthroughs. Policy costs/deltas remain a playtesting surface for finer tuning. The
  **fossil-replacement** rework added a tuning surface in `policies.ts`: the per-region
  `NUCLEAR_CAP` (uranium-derived, see §3) and `SOLAR_WEIGHT` tables, the two conversion
  `ratePerTurn`s (renewable 0.06, nuclear 0.04), and their flat per-region costs (renewable 120,
  nuclear 110). `test/scenarios.test.ts` (winnability + doom) and the golden snapshot guard that the
  rework didn't move the do-nothing floor or the well-played win.
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
