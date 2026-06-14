# Emissions by source — Dashboard & Region panels

**Status:** Approved · **Date:** 2026-06-14

## Intent

Surface the new sectoral-emissions model in the UI: the six per-source emissions that make up each
region's (and the world's) total, plus the four coupling variables the new policies move. Until now
the Dashboard showed only a single `Emissions XX Gt/yr` number and the RegionPanel showed none of the
new state. Players need to *see* where emissions come from and understand the levers (grid intensity,
storage, yield, demand) to play the decarbonization puzzle.

## Approved design (Variant A — stacked bar)

- **Planet panel (Dashboard):** keep Warming / CO₂ / Emissions rows; add an **Emissions by source**
  block — a single horizontal **stacked bar** (each source a colored segment) + a legend grid
  (`source · Gt · %`). Global figures are the per-source sums across all regions.
- **Region panel (RegionPanel):** add the same **stacked bar + legend** for the region's six sources,
  then an **Energy & land levers** block: a 2×2 grid of the four coupling variables
  (`Grid intensity`, `Storage built`, `Crop yield`, `Power demand`) with a value and a mini-bar.
- **Sources ordered by size** (descending Gt), both panels.
- **Hover tooltips (Mantine `<Tooltip multiline w={250}>`):**
  - each **source label** (dotted underline) → one line: what it is + how it's cut;
  - each **lever** (ⓘ icon) → full meaning + how it moves the model (copy is final in the mockup).
- **Land-use sink:** `landUse` is the only source that can go negative (after reforestation). It
  renders **left of a zero axis** as a distinct dashed-teal segment; the legend shows e.g.
  `Land-use −0.40`. Positive sources render right of zero as the normal stacked bar.

## Rationale

- A stacked bar reads composition at a glance and stays compact in the narrow info column; the legend
  carries the exact Gt + %. Chosen over per-source ledger rows (Variant B) for density.
- Tooltips (rather than always-on helper text) keep the panels clean while making the model
  learnable on demand — the user explicitly asked for hover explanations of the levers.
- Reuses existing palette hues, so the breakdown feels native and the map/category colors stay
  meaningful.

## Tokens added (to record in `theme.ts` + `DESIGN-SYSTEM.md` at implement)

New **emission-source color** scale (all reused from existing palette hues, grouped under a new
`SOURCE_COLORS` key):

| Source | Token value | Origin |
|--------|------------|--------|
| electricity | `#f59f00` | energy category (⚡) |
| transport | `#4dabf7` | north-america region blue |
| aviationShipping | `#66d9e8` | oceania region cyan |
| industry | `#868e96` | industry category (🏭) |
| agriculture | `#a9e34b` | southeast-asia region lime |
| landUse | `#2f9e44` | land category (🌳) |
| landUse **sink** (negative) | `#1098ad` (dashed `earth-3` border) | new accent for the one negative case |

No changes to existing tokens. New component rules to add to `DESIGN-SYSTEM.md`: the
**Emissions-by-source stacked bar + legend** (Dashboard + RegionPanel) and the **Energy & land
levers** 2×2 stat grid with tooltips.

## Data sources (engine, already shipped CP1–CP4)

- Per-region sources: `region.electricity` (derived), `.transport`, `.aviationShipping`, `.industry`,
  `.agriculture`, `.landUse`. Global = sum across `state.regions`.
- Levers: `region.gridCarbonIntensity` (0–1), `.energyStorageCapacity` (0–1), `.agriculturalProductivity`
  (index, 100 baseline), `.electricityDemand`.
- Totals: `region.regionalEmissions`, `climate.annualEmissions` — already displayed.

## Scope note

Approved for **Dashboard + RegionPanel**. The Turn Log per-source history rows are out of scope for
this proposal (can be a follow-up).
