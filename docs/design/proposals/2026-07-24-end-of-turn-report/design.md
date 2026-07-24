# End of Turn Report

**Date:** 2026-07-24 · **Status:** Approved

## Intent

Turns advance via **End Turn**, but the player gets no consolidated feedback on what
their policies did — the headline metrics in the `ResourceBar` just quietly change.
Add a **blocking, dismissable** modal that appears right after each End Turn,
summarising how five planet-level metrics changed over the turn that just elapsed,
plus a header button to reopen the last report on demand.

## What was approved

A centered overlay window (~380px) over a dimmed backdrop, reusing the
`DataOverlay` / `EndingScreen` pattern (framer-motion fade + 20px rise; closes on
**Continue** / ✕ / Esc / backdrop click).

- **Header:** a strong 22px **`End of Turn`** title on top, over a dimmed
  `Turn N · Year A → Year B` sub-line. (Largest text first — a clean two-tier hierarchy;
  the earlier tiny-kicker-above-larger-title version was fixed in review.)
- **Five metric rows** (list layout — `icon · label · value · Δ chip`):

  | Metric | Icon | Unit | Δ polarity (goodUp) |
  |--------|------|------|---------------------|
  | Temperature | 🌡 | °C | up-is-bad |
  | Emissions | 💨 | Gt/yr | up-is-bad |
  | CO₂ concentration | 🌫️ | ppm | up-is-bad |
  | Treasury | 💰 | $B | up-is-good |
  | Biodiversity | 🦋 | /100 | up-is-good |

  Each row shows the **new value + a colored Δ chip**. The chip reuses the Turn Log
  vocabulary: **arrow = numeric direction** (`▲` up / `▼` down / `—` flat), **color =
  good/bad** per the metric's `goodUp` (good = `earth-3` `#63e6be`, bad = `red`
  `#ff6b6b`, a change that rounds to zero = dimmed **`— flat`**, no colored arrow).
- **Footer:** a full-width primary **Continue** button (earth-6).
- **Reopen button:** a small 📊 `ActionIcon` (earth-6) in the sticky `ResourceBar`,
  placed **left of the Money badge**. Shown only once ≥1 turn has elapsed (hidden on
  turn 0).

## Decisions / iteration notes

- Considered two layouts (stacked **list** vs a 2-col **tile grid** echoing
  `MetricGrid`). **List** was chosen for the compact "small summary" feel.
- **Average income was dropped** — the set is five metrics, not six. (The original
  brief listed it; removed during review.)
- Shows on **every turn** from turn 1 onward. Suppressed when the ending turn also
  ends the game — `EndingScreen` takes over instead.

## Tokens

**No new tokens.** Reuses existing palette: surfaces `surface`/`surface-2`/`tile
#141517`, `border #373a40`, `earth-6`/`earth-5` (buttons), `earth-3` (good),
`red #ff6b6b` (bad), dimmed neutrals, and the metric-source hues already in
`theme.ts`. The delta-chip good/bad/flat coloring is the same
`changeSince` / `CHANGE_TONE_COLOR` convention used by `MetricTrend` and the Turn Log
delta chips — reuse it rather than introduce a parallel one.

## Implementation pointers (for `/implement`)

- Pure delta helper `packages/web/src/game/turnReport.ts` — diffs the last two
  `turnLog` records; uses `planetAggregate` for `biodiversityIndex`, direct
  `state.climate` / `state.resources` fields for the rest. No engine change.
- New component `packages/web/src/components/EndOfTurnReport.tsx` — overlay shell
  copied from `DataOverlay.tsx`.
- `ResourceBar.tsx` gains `onShowReport?` + `canShowReport?` and renders the 📊 button.
- `App.tsx` holds `reportOpen`, auto-opens on `state.turn` increment (not on game-end),
  and wires the reopen button.
