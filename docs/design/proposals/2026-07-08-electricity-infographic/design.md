# Electricity infographic — generation vs. emissions, separated

**Status:** Implemented · **Date:** 2026-07-08

## Intent

The drill-down's **Electricity** node previously showed only a coal/gas/oil *emissions* composition.
That hid the thing players needed to see: enacting **Renewable Subsidy** cuts coal's **generation
share** every turn, but because electricity **demand** grows underneath it, absolute coal *emissions*
stay ~flat for the first decade (see the investigation in the plan file). Players read the flat
emissions number as "the policy is broken." The fix is a **visibility** change — show generation and
emissions as **two separate infographics** so the falling generation share is legible even while
emissions lag.

## The design (approved)

A stacked, two-section panel — generation on top, emissions below, each with its own header, shape,
and units, never mixed:

- **Generation mix** — a **donut** (all 8 sources, fossils-then-clean order) with the **clean share**
  (nuclear + renewables) in the hole, and a **grouped legend**: `Fossil` vs `Clean` columns, each with
  a subtotal, sources largest-first.
- **Electricity emissions** — **converging streams**: each source flows into a pool labelled the
  electricity total (`= X.X Gt CO₂/yr`). A stream's **width = its emissions**; coal is the fat stream,
  gas/oil thin, and **nuclear + the four renewables are dashed, zero-width lines labelled `0`** (they
  generate power but emit nothing). Each source is labelled **at its origin** with its Gt value — no
  floating mid-stream text.

The emissions total carries a **change chip**; when it hasn't moved it reads a neutral-grey
**`— flat`** (never a colored arrow).

### Design iterations (why it looks like this)

The concept walked through: bar-based twin-track → hero mix bar → source cards (rejected), then
converging streams for emissions. Feedback that shaped the final: generation % must **not** sit on the
emission streams (they read as emissions) → generation and emissions fully separated; **no per-row
progress bars** → emissions became the single converging-streams graphic that visibly sums to the
total; every stream (incl. gas/oil) labelled at its source; nuclear + renewables explicitly labelled
`0`; generation legend grouped **Fossil vs Clean**.

## Token / design-system changes

- **New change-chip tone — `flat`.** Formalizes a neutral no-change indicator for the shared change
  chip: `▲` up / `▼` down (colored good/bad by the metric), and a neutral-grey **`—` "flat"** when the
  change rounds to zero. Lives in `game/metricTree.ts` (`changeSince`, `CHANGE_TONE_COLOR`) and is now
  used by both `MetricTrend` and the electricity panel. Documented in `DESIGN-SYSTEM.md`. No new color
  token (reuses `dimmed`); it corrects the prior behavior where a flat move showed a colored `—`.
- **No new palette entries** — the donut, streams, and legend all reuse `GENERATION_COLORS`.

## Implementation notes

- New component `packages/web/src/components/ElectricityPanel.tsx` (donut + grouped legend + streams).
- New metric-tree node kind `electricity` (`game/metricTree.ts`); `DrillDownPanel` renders the panel
  for it. The node keeps its coal/gas/oil trend children so the emissions still sum-check.
- `Reading` gains `generationMix` (`game/metricSeries.ts`), sourced from the region or the
  demand-weighted `planetAggregate`.
- Tests: `test/electricityPanel.test.tsx`, plus updated `drillDown` / `metricTree` / `metricTrend`.
