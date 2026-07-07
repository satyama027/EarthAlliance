# MetricTrend — per-turn markers, value labels & per-turn gridlines

**Status:** Approved 2026-07-07 · [mockup.html](./mockup.html) (toggle the label density)

## Intent

Make the `MetricTrend` line graph (the value-vs-year drill-down leaf) read **turn-by-turn**. Three
additions on top of the existing 0-baselined, first/last-labeled chart:

1. **A dot at every turn point** (not just the end) — so the per-turn series is explicit and the line
   visibly zig-zags with real data. The latest point stays slightly emphasized.
2. **A value label at each turn** — the metric value sits just above its dot, so the player sees the
   turn-by-turn impact directly.
3. **A vertical gridline at every turn year** — a thin vertical line at each turn's X position, joining
   the existing horizontal 0-baselined value gridlines into a true grid.

## Graceful degradation on a long game (approved: **thin-on-long**)

A full game runs ~36 turns (2025→2200). Labelling every turn's value and year would overlap into an
unreadable smear. The approved behavior **decouples marks from text**:

- **Dots + vertical gridlines stay at *every* turn**, always (thin/subtle, so the per-turn cadence is
  never lost).
- **Value labels and year labels thin out on long series**: show all when the series is short
  (**≤ 8 turns** → every turn labelled, the full early-game read), otherwise show a readable subset —
  every `ceil((n-1)/6)`-th turn, **plus always the first and last**. Edge labels are start/end-anchored
  so they never clip.

## Visual spec (tokens)

- Panel `dark-8` + `dark-4` border, radius 4 (unchanged).
- **Horizontal value gridlines** `#2b2d31`; **vertical per-turn gridlines** `#212327` (fainter, so the
  denser vertical lines recede); **baseline axis + labelled ticks** `dark-4` (`#373a40`).
- Axis labels `dimmed` (`#909296`), 9px, tabular; **value labels** `text-strong` (`#f1f3f5`), 9px, 600,
  placed 7px above the dot.
- Line + area = the node's color (index metrics via `metricColor`, else fixed source/fuel color);
  area fill at 0.10 opacity. Dots filled the line color with a `dark-8` stroke; latest `r≈3.5`, others
  `r≈2.6`.
- Chart box grows slightly taller (viewBox ~`0 0 400 180`, top margin ~24px) to give value labels room
  above the top point.

**No new theme tokens** — all colors are existing `theme.ts` values (the two gridline greys are dark
neutrals in the existing surface ramp; record them in `DESIGN-SYSTEM.md` as the MetricTrend grid greys).

## Component impact (for `/implement`)

- `packages/web/src/components/MetricTrend.tsx` — replace the current sampled X-tick logic with:
  a **vertical gridline + dot at every point**, a **thinned label set** (`labelIndices(n)`: all if
  `n ≤ 8`, else `0`, `n-1`, and every `ceil((n-1)/6)`-th), **value labels** above labelled points, and
  the taller viewBox/top-margin. Keep the existing `niceTicks`, 0-baseline domain, step-precision Y
  labels, and adaptive change chip from the prior fix.
- Tests (`packages/web/test/metricTrend.test.tsx`): assert a **dot per turn** (circle count == points),
  **value labels** present for a short series, and that a **long series thins** its labels (fewer year
  labels than points) while keeping a circle per point.
- `docs/design/DESIGN-SYSTEM.md` `MetricTrend` bullet + `docs/design/current/index.html` trend SVG —
  update to the per-turn grid + dots + thinned labels.
