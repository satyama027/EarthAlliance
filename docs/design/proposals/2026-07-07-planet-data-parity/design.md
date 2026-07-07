# Full planet data — region parity

**Date:** 2026-07-07 · **Status:** Implemented

## Intent

The **📊 Full planet data** button (RegionInfoBox planet state → `DataOverlay` → `Dashboard`) opens a
panel that is much thinner than a region's **Full region data** drill-down (`RegionPanel`). The planet
panel shows only warming, CO₂, emissions, a global emissions-by-source bar, and a temperature
sparkline. A region additionally shows **Generation mix**, **Energy & land levers**, an **Income**
ledger, and five 0–100 **quality bars**. The user wants the planet panel to surface planet-level
equivalents of **every** data point a region shows.

## Design

Make the planet panel a **superset**: keep its climate-native block (warming / CO₂ / emissions /
sparkline) and append the same sections a region shows, in the **same order and visual language**, so
the two drill-downs read identically — only the numbers are global:

1. **Emissions by source** — now with the full legend (was already a bar; regions show the legend).
2. **Generation mix** — the derived grid-intensity gauge + banded fossil/nuclear/renewable bar + band
   legend.
3. **Energy & land levers** — the 2×2 grid (Grid intensity · Storage built · Crop yield · Power demand).
4. **Income** — the ledger (Tax GDP + highlighted Carbon-tax row + Policy upkeep = Net /turn).
5. **Quality bars** — Public support, Equity, Biodiversity, Water, Land.

A dimmed **planet totals** subtitle (`pop … · GDP/capita …`) sits under the "Planet" title, mirroring a
region's summary line. **Approved with the totals line kept.**

### Aggregation (how the 10 regions combine into one planet number)

- **Emissions by source** — sum the six source fields (already done via `globalSources`).
- **Generation mix + grid intensity** — generation-weighted by `electricityDemand`.
- **Levers** — power demand = sum; storage = demand-weighted avg; crop yield = simple avg; grid
  intensity as above.
- **Income** — sum each region's `regionBudget` (Tax / Carbon tax / upkeep / net).
- **Quality bars** — **simple average** across the 10 regions (user choice; each region counted equally).

## Tokens

**No new tokens.** Every section is a 1:1 reuse of already-approved components: `EmissionsBySource`,
`GenerationMix`, `RegionLevers`, `RegionIncome`, and the metric bars — with their existing
`SOURCE_COLORS` / `GENERATION_COLORS` / grid-intensity gradient / `metricColor` palettes.

## Implementation notes (for `/implement`)

- New `packages/web/src/game/planetAggregate.ts` holds the aggregation math (TDD).
- `GenerationMix` and `RegionLevers` are refactored from taking a whole `Region` to taking the minimal
  data props they render, so both the region and planet panels can feed them.
- `Dashboard` gains the appended sections; `DataOverlay` threads the latest `TurnDiagnostics` down so
  planet income can be computed.
- `RegionIncome` gets an optional neutral-copy variant: the carbon-tax note reads "shrinks as **the
  planet** decarbonises" in the planet panel (vs "this region" per region).
- No engine changes — this is a pure view/aggregation feature.
