# Turn Log panel

**Date:** 2026-06-05 · **Status:** Approved · **Variant:** B (compact ledger)

## Intent

After every turn the player wants to see the value of **every** data point. Global parameters
(warming, CO₂, emissions, climate damage) at the top level; region-specific parameters (economic
growth, demography, support, environment, emissions) for the region they select. Today the live
panels show only a slice of the state and discard the derived values entirely.

The approved solution is a new **Turn Log** panel in the right info column (below `RegionPanel`): a
scrollable history, newest turn on top. Each entry shows a **Planet** block always, and a block for
the **currently selected region**. Switching the selected region re-resolves every historical entry
to that region (each entry stores a full world snapshot).

## Look & feel (approved)

- **Variant B — compact ledger.** Two-column grid of `label : value` cells per block, dotted row
  separators, tabular-aligned numbers. Dense enough to read many turns at a glance.
- **Scroll container:** `Paper` (p="sm") titled "Turn Log", inner scroll area ~360px max-height,
  newest entry first. Each turn is a `surface-2` sub-card.
- **Economic growth = GDP/capita ▲% delta** — no separate "Growth" row (the GDP cell's delta *is*
  the growth figure).
- **Delta chips:** `▲`/`▼` = numeric direction; **color = good / bad / neutral** for the
  planet/region (not raw up/down). Examples: warming/CO₂/emissions/damage up = bad (red), down =
  good (green); support/equity/biodiversity/water/land/education/health/GDP up = good (green);
  population/median-age/fertility = neutral (dimmed). First (baseline) entry shows `—` (no prior
  turn).
- **Empty state:** when no region is selected, show the Planet block + a dimmed "Select a region on
  the map to log its parameters." hint.

## Fields logged

- **Planet (global):** Warming (°C, colored by `temperatureColor`), CO₂ (ppm), Emissions (Gt/yr),
  Damage (% of GDP lost to warming — *new exact engine diagnostic*). (Political Capital / Money stay
  in the live ResourceBar.)
- **Region (selected):** GDP/capita (+growth %), Population, Public support, Equity, Biodiversity,
  Water, Land, Education, Health, Median age, Fertility, Regional emissions — i.e. **every** Region
  field plus the derived growth.

## Token / design-system changes

**No new color tokens.** Reuses existing tokens: `surface-2`, `border`, `earth-3` (good delta),
`red` (bad delta), `dimmed` (neutral delta), `temperatureColor` for warming, `metricColor` concept
for indices.

**One new component rule** to add to `DESIGN-SYSTEM.md` during `/implement`:
- **TurnLog** — scrollable `Paper` ("Turn Log"), newest-first `surface-2` entries; each entry has a
  uppercase block label + 2-column ledger grid. Delta chip convention: arrow = direction, color =
  good (`earth-3`) / bad (`red`) / neutral (`dimmed`).

## Implementation notes (for `/implement`)

Requires a small **additive engine change** (approved separately with the user): `advanceTurn`
returns a `TurnDiagnostics` (`damageFraction`, `deltaTemperature`, `growthByRegion`) built from the
`TurnScratch` it already computes — so Damage and Growth are exact, not re-derived in the web layer.
`useGame` accumulates a `turnLog: TurnRecord[]` (full `WorldState` snapshot + diagnostics per turn);
the engine's non-mutation invariant makes retaining past snapshots safe.
