# Balanced layout + drag policies into Active slots

**Status:** Approved (2026-06-12)
**Mockup:** [`mockup.html`](./mockup.html)

## Problem

Commit `f8ebf8c` ("no-scroll policy layout") introduced three regressions on the main game screen:

1. **Can't drag a policy to Active.** A card dragged up from *Available* rendered **under** the
   Active lane (clipped by the lane's `ScrollArea` overflow) and, on release, **snapped back**
   without staging (drop detection compared framer-motion `info.point` to `getBoundingClientRect`,
   which disagree once the page is scrolled). There were no drop targets to aim at.
2. **World map shrank** from `70vh` to `clamp(220px, 38vh, 340px)` — roughly half size.
3. **Dead space** between the (now-short) map and the policy board: the map column shares a Mantine
   `Grid` row with the taller Dashboard+RegionPanel column, which stretched the row and left the map
   cell padded with a tall blank band.

## Approved design

### Layout (fixes 2 & 3)
- The map column fills its grid row: scene viewport uses `height: 100%` with `min-height: 440px`
  inside a **stretched** row (`align-items: stretch`), so it equals the info column's height — no
  blank band, and the map is a comfortable medium size again.
- The map image uses **`object-fit: contain`** (+ `object-position: center`) so the **entire world is
  always visible**; the panel's existing ocean `radial-gradient` fills the slim top/bottom bands so
  the letterbox reads as ocean, not dead space.

### Policy drag-into-slots (fixes 1)
- The **Active lane shows persistent empty drop slots** (dashed "＋ drop a policy here") so the drop
  target is always obvious. At least one trailing empty slot remains visible.
- The dragged card is lifted into a **floating layer on top of the page** (think `position: fixed`
  drag overlay, `z-index` above everything) so it can **never be clipped "under" a lane**. It scales
  ~1.05 / rotates -3° with a drop shadow while dragging.
- **Drop detection uses the pointer hit-test** (`document.elementFromPoint`) walking to the nearest
  `.slot` / Active lane — viewport-correct regardless of scroll. Hovering a slot highlights it teal
  and arms the lane.
- A valid drop **settles the card into the slot and it stays** (earth-5 outline + `STAGED` badge);
  the source leaves the Available lane. A drop that misses animates the overlay back to origin.
- Click + Enter/Space remain the accessible, tested equivalents (unchanged behavior).

## Token / design-system changes
None. Uses existing tokens only (`earth-5`/`earth-3`/`earth-7`, surface/border, category colors,
`radius`). The DESIGN-SYSTEM.md **PolicyBoard** and **Spacing & layout / Scene viewport** entries need
prose updates to describe: map fills its column (`height:100%`, `min-height ~440`, `object-fit:contain`);
Active-lane drop slots; and the floating drag-overlay + pointer hit-test drop model (replacing the old
`dragSnapToOrigin` + rect-math description).

## Implementation notes (for `/implement`)
- `App.tsx`: map `Box` → `height: 100%` / `minHeight: ~440` in a stretched row; map img `object-fit:
  contain`. Remove the `clamp(220px,38vh,340px)` fixed height that under-fills.
- `PolicyBoard.tsx` / `PolicyCard.tsx`: render empty slot elements in the Active `LaneStrip`; lift the
  dragged card into an overlay layer (avoid the clipping `ScrollArea` on the drag path); replace
  `laneAt` rect-math with `document.elementFromPoint` hit-testing. Keep `stage`/`unstage`/`toggleCancel`
  wiring and click/keyboard paths intact.
- TDD: add `PolicyBoard` tests for (a) a scrolled-coordinate drop staging the policy and (b) empty drop
  slots rendering when the Active lane has capacity.
