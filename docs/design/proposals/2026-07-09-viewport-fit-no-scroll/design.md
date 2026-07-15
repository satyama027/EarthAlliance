# Viewport-fit — shrink the map, reclaim the dead space (no scroll to End Turn)

**Date:** 2026-07-09 · **Status:** Implemented · **Mockup:** [`mockup.html`](./mockup.html)

## Problem

The main screen stacked a **fixed 480px map** above a full-width **PolicyBoard** (~572px) in a
plain Mantine `Grid`, so the two tall blocks summed past the viewport. Measured live (East Asia
selected, headless Chrome + CDP): the page was **~1496px tall**, the **End Turn** button sat at
**y≈1094** (≈390px below a 704px fold), and with a region selected the *entire* policy UX — both
lanes and End Turn — was below the fold. You had to scroll to assign policies and end the turn.

Two rejected non-starters (user was explicit): a scroll region as the "fix", and compacting the
policy cards / dropping their descriptions.

## Key measurement that drove the design

Beside the 480px map, the `RegionInfoBox` is only **286px tall**, leaving a **336×194px empty
rectangle** in the right column — real, usable dead space.

## Decision (final — after iterating live against the real app)

1. **Map = viewport-derived FIXED height, not flex.** `height: clamp(180px, calc(100dvh − 376px),
   560px)` (`App.tsx`, `AppShell padding={0}`). The height depends only on the screen, **not** on the
   board content, so the map is **identical with or without a region selected** — clicking a region
   never resizes it — while still adapting to screen height. (A `flex:1` map collapsed when the lanes
   appeared; a reserve-the-board hack fixed the jump but bloated the empty state and overflowed. The
   fixed clamp is the clean fix.)
2. **Side-by-side lanes.** `PolicyBoard`'s two lanes are laid out **Active | Available in one row**
   (vertical `Divider` between), not stacked. Stacking two full card rows cost ~540px and starved the
   map (~180px on a ~820px screen); side-by-side makes the board one card-row tall (~320px), so the map
   more than doubles to **~430px** — full cards, no scroll, stable. Each lane keeps its own horizontal
   card scroll. This is the "wholesale" change originally deferred; it proved to be the only way to get
   a large + stable map with full cards on a laptop screen.
3. **End Turn → icon in the board's right gutter.** The old full-width footer is gone; the this-turn
   summary (Staged / Cost now / Upkeep) + an **icon End Turn (`ActionIcon` ⏭ with a hover `Tooltip`,
   disabled + reason when it can't end)** live in a `flex:0 0 150px` gutter at the board's right.
4. **PolicyCard untouched** (full size, description kept). **`RegionInfoBox` compacted** (286→~150):
   one-line `KV` label→value rows, `p="xs"`, inline support bar — same data, same label strings.

Result: resource bar + map + region info + End Turn + **both full policy lanes** all fit one viewport
with no scroll to reach any of it; you scroll only for the Turn Log. Verified live via CDP at vh=820:
map **432px empty = 432px selected** (stable), End Turn bottom 802 ≤ 820, Available-lane bottom 802 ≤ 820
(~18px margin; the map was subsequently enlarged by trimming the column gap/padding and the clamp offset 430→388).

## New/changed components

- `components/TurnControl.tsx` (new) — summary + icon End Turn (Tooltip), rendered in PolicyBoard's gutter.
- `components/PolicyBoard.tsx` — **side-by-side** lanes (Active | Available), vertical divider; footer removed.
- `components/RegionInfoBox.tsx` — compacted region card (`KV` rows).
- `App.tsx` — normal-flow column, **fixed-clamp map height**, compact right column; Grid removed.

## Tokens added / changed

**None — layout only.** Reuses existing tokens (`earth-5/6`, `#05080f` map surface,
`REGION_COLORS`, category colors, spacing `sm`/`md`). `DESIGN-SYSTEM.md` gets rule/appearance
edits only (map flexes inside a `100dvh` shell; End-Turn control moves to the right column; Turn
Log below the fold); `theme.ts` needs no token additions.

## Evidence in this folder

- `current-region-selected-800.png` — the live **before** (region selected, End Turn off-screen, page ~2× the viewport).
- `live-side-by-side.png` — the live **after** (region selected, ~430px stable map, End Turn + both lanes in view, no scroll).
- `mockup.html` — the approved browser mockup (note: the mockup shows the earlier stacked-lanes/gutter direction; the final build pivoted to **side-by-side** lanes for a larger map, as recorded above).
