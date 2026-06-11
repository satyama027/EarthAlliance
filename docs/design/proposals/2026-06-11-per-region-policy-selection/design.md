# Per-region policy selection — two-lane drag board

**Status:** Approved (2026-06-11) · **Mockup:** [`mockup.html`](./mockup.html)

## Intent

The engine is now fully region-targeted: every policy is enacted in a specific region, its money
cost is scaled by that region's share of world GDP, and `buildout` policies track installed
capacity per region. The old global `PolicyTray` (toggle a policy → applied everywhere via the
`expandToRegions` interim shim) no longer fits. This design replaces it with a **region-scoped,
two-lane drag board**.

## The design

Selecting a region on the `WorldMap` scopes the board to it (the board header shows the region
name + color dot). The board has two horizontal lanes:

- **Active** (top) — policies running in this region.
- **Available** (bottom) — policies enactable in this region.

Splitting the two lanes is the core decision: active policies are never buried among dozens of
available cards (the complaint that killed the single-row variants). State is conveyed by *which
lane* a card is in, which keeps each card lean.

### Interaction

- **Drag a card up** (Available → Active) = enact the policy in this region (stages it for the turn).
- **Drag a card down** (Active → Available), or click its **✕**, = remove it.
- **Unaffordable drag**: the Active lane shows a **red reject border**, a **red error banner**
  appears above the lanes naming the policy + region + shortfall, and the card **snaps back** to
  Available. (Chosen over a lighter toast for explicitness.)
- **Valid drag**: the Active lane highlights **green** (valid target); the lifted card gets a
  shadow + slight rotate (framer-motion).
- **Empty state**: with no region selected, the board shows "Select a region on the map to manage
  its policies." (mirrors the `RegionPanel` empty state).

### Card content (region-scoped)

Every card: category art band + icon, name, a **funding pill** (`One-time` / `Recurring` /
`Buildout`), and **cost badges** (grape PC + teal money) with the **region-scaled** money and its
cadence (`$10 once`, `$104 /turn`, `$250 /turn`). Buildout cards in the Active lane add an
**Installed %** label + capacity bar (earth gradient) and a state line (`Building · +10%/turn`).

### Card states

| Lane | State | Treatment |
|------|-------|-----------|
| Available | enactable | grip handle, funding pill, scaled cost; draggable up |
| Available | locked (prereq not met **in this region**) | dimmed + 🔒 + "Requires X here", not draggable |
| Active | staged this turn | earth-5 outline + `STAGED` badge + ✕; draggable back |
| Active | committed buildout (building/built) | Installed % + bar + state; grip + ✕; cancellable |
| Active | committed recurring | funding pill + "Funded each turn"; grip + ✕; cancellable |
| Active | committed one-time | `🔒 permanent` + "paid $X"; **not** cancellable |

### Footer (region-scoped summary)

`Staged this turn` · `Cost now` (PC + one-time money) · `Active upkeep next turn` (Σ recurring +
in-progress buildout charges) · **End Turn ▶**.

## Required engine addition (for `/implement`)

Cancelling an already-committed policy needs a small engine change (the only non-web work):

- Add a way to **stop an active enactment** in a region (e.g. `cancelEnactment(state, policyId,
  regionId)` or fold a "remove" list into the `advanceTurn` selection input).
- **Buildout**: stop charging upkeep and stop advancing capacity, but **keep the enactment so its
  ramped effect persists at the frozen capacity** (do not delete it — deleting would drop the
  decarbonization the player already paid for). Mark it e.g. `cancelled: true` so `programs` skips
  charge + advance but still applies `delta × capacity`.
- **Recurring**: end it — stop the upkeep **and** remove its flat ongoing `ActiveEffect`s (the fund
  stops buying its benefit).
- **One-time**: not cancellable (already paid, permanent effect; nothing ongoing to stop).
- TDD: add engine tests for each cancel path before the web work.

## Token changes

**None.** The design reuses existing tokens: category art colors (`CATEGORY_COLOR`), grape/teal
cost badges, `earth-5` selection/valid-target accent, `red` for reject/error, the earth capacity
gradient (`earth-7 → earth-5 → earth-3`, already used by `RegionPanel`/Turn Log), and region dot
colors (`REGION_COLORS`). No additions to `theme.ts` / `DESIGN-SYSTEM.md` expected — `/implement`
should confirm and only add a token if a new shade is genuinely needed.

## Components touched (at implement time)

- `PolicyCard` — region-scoped cost + funding pill + capacity bar + state variants.
- `PolicyTray` → **PolicyBoard** (two lanes + drag/drop + error banner + footer). Likely a
  `@dnd-kit`/framer-motion drag implementation; keep card a11y (`role`, `aria-*`, keyboard).
- `App.tsx` / `useGame.ts` — replace the `expandToRegions` "apply globally" shim with real
  per-region selection driven by `selectedRegionId`; wire enact + cancel; per-region affordability.
- Update `docs/design/current/index.html` gallery to the new board.
