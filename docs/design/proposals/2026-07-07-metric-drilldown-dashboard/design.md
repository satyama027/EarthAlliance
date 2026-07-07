# Metric drill-down dashboard — the "Full data" redesign

**Status:** Approved 2026-07-07 · [mockup.html](./mockup.html) (interactive — click the tiles/rows)

## Intent

Replace the flat, top-to-bottom `DataOverlay` body (planet `Dashboard` / `RegionPanel`) with a
**config-driven, recursive drill-down**. The overlay opens on a **6-tile metrics grid**; clicking a
tile drills into the contribution of its parts, and you keep drilling until you reach a leaf.

Top-level tiles (both entities — planet or a selected region):
**Emissions · Public support · Income · Biodiversity · Water availability · Land availability.**

## The two reusable renderers

Everything is drawn by exactly two components, chosen per node from config:

- **Composition** — "contribution of each part": a stacked bar (`SOURCE_COLORS` /
  `GENERATION_COLORS`) over clickable legend rows (`label · value · %`). A row with children shows a
  `›` (drill further); a leaf row shows a `📈` (open its trend). Generalizes today's
  `EmissionsBySource`.
- **MetricTrend** — a value-vs-year **line graph**: labeled Y-axis (nice-number ticks + gridlines),
  a **decade-spaced** labeled X-axis, faint area fill, and an end-dot on the latest value.
  Generalizes today's `Sparkline`; the same component renders the small tile mini-trend.

## The drill tree (what has real data)

- **Emissions** (composition) → 6 sectors: Electricity, Transport, Aviation/Shipping, Industry,
  Agriculture, Land-use.
  - **Electricity** (composition) → **Coal / Gas / Oil** — the *only* real fuel split, derived from
    the generation mix (`electricityDemand × share × emissionFactor`). Clean fuels contribute 0 to
    emissions and are omitted from this breakdown.
  - The other five sectors are **trend leaves** (no fabricated fuel split).
- **Income** (composition) → Tax (GDP) · Carbon tax · Policy upkeep → **Net /turn**; each part is a
  trend leaf.
- **Public support / Biodiversity / Water availability / Land availability** — trend leaves (indices,
  no composition), so their drill-down is their own **history**.

## Navigation

A **breadcrumb** (`Overview › Emissions › Electricity › Coal`) sits under the entity header; each
crumb jumps back to that depth. The same tree drives planet and region — only the numbers differ
(region reads the `Region` field; planet reuses the `planetAggregate` / `regionBudget` selectors).

## Data source (no engine change)

All series are **derived from `turnLog`**, which already holds the turn-0 baseline plus a full
`WorldState` snapshot every turn. So "history for planet + all regions from the start of the game"
already exists — the drill-down just needs pure selectors over it.

## Look-and-feel decisions (approved)

- Keep **mini-sparklines** on the level-0 tiles (headline value + small trend).
- Row affordance: `›` for drillable, `📈` for trend leaves.
- Chart: labeled Y-axis with nice-number ticks + gridlines; **decade** X-axis labels; area fill +
  end-dot. (Denser X ticks and visible Y values were the explicit ask during review.)

## Tokens

**No new tokens.** Reuses `SOURCE_COLORS`, `GENERATION_COLORS`, `earth-*`, `red`/`teal`/`yellow`, and
the surface/border/dark-8 scale already in `theme.ts`. One small addition for `/implement` to record:
the trend-graph axis styling (gridline = `dark-4`, axis line/tick = `border`, labels = `dimmed`) —
all existing color values, no new palette entries.

## Component impact (for `/implement`)

- **New:** `game/metricTree.ts` (config + pure value/series selectors), `game/metricSeries.ts`
  (turnLog → `{year,value}[]`), `components/MetricGrid.tsx`, `components/DrillDownPanel.tsx`
  (breadcrumb + composition/trend switch), `components/Composition.tsx`, `components/MetricTrend.tsx`.
- **Changed:** `DataOverlay.tsx` hosts `<DrillDownPanel entity=…>` instead of `Dashboard`/`RegionPanel`.
- **Retire/absorb:** `Dashboard.tsx`, `RegionPanel.tsx` (superseded); `EmissionsBySource.tsx` →
  folded into `Composition`; `Sparkline.tsx` → into `MetricTrend`. Fate of `GenerationMix`,
  `RegionLevers`, `RegionIncome`, `MetricBar` decided during implementation (reuse vs retire).
