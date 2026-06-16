# Region info box beside the map

**Status:** Implemented · **Date:** 2026-06-16 · **Mockup:** [`mockup.html`](./mockup.html)

## Intent

Reading a region's data took **two clicks**: select the region on the map, then open the
resource-bar 📊 `DataOverlay`. Selecting a region showed nothing inline. This change surfaces the
headline numbers — **GDP per capita, emissions, public support** — on a **single click**, in a
compact information box to the **right of the map**, with a 📊 button in that same box to drill into
the full breakdown.

## Design

A **side-column** layout: the map shrinks to ~70% width (CSS grid `1fr 232px`) and a compact info
box sits to its right. The map keeps its fixed **480px height** so the SVG never letterboxes — the
exact failure that retired the old inline Region panel (see `DESIGN-SYSTEM.md` "Spacing & layout").
The box is **content-height and top-aligned** — deliberately small, far shorter than the map, so it
reads as a glance-card rather than a column rivaling the map.

**Two states, keyed off the existing `selectedRegionId`:**

- **Region selected** — region-color dot + name, a dimmed `pop` subtitle, then three stats
  (GDP per capita; Emissions in Gt/yr; Public support as a value + a thin `earth-5` bar), and a
  **📊 Full region data** button.
- **No region selected** — 🌍 Planet quick-stats (Warming colored by temperature, CO₂, Emissions),
  a "Click a region for its data" hint, and a **📊 Full planet data** button.

Both 📊 buttons open the **existing `DataOverlay`** untouched (it already branches region-vs-planet
off the same selection), so no emissions logic is duplicated.

## De-duplication

- The box now always carries a data button, so the **resource-bar 📊 button is removed**.
- The planet box repeats the climate readout, so **Emissions is removed from the resource-bar
  climate cluster**. Warming and CO₂ stay in the sticky bar (always-on glanceability, since the box
  shows *region* data — not planet — while a region is selected). Emissions now lives only in the
  info box / `DataOverlay`.

## Tokens

**No new tokens.** Reuses existing surface/border/text tokens, `earth-5` for the support bar
(via `metricColor`), and `yellow` for the warming value. The map's `REGION_COLORS` hue drives the
header dot.

## Implementation notes (for `/implement`)

- New `packages/web/src/components/RegionInfoBox.tsx` — props: `region: Region | null`, planet
  stats (`temperature`, `co2`, `annualEmissions`), `onOpenData()`. Renders both variants.
- `App.tsx` — map row becomes two columns (map + `RegionInfoBox`); pass `selectedRegion`, planet
  climate values, and `onOpenData={() => setDataOpen(true)}`. Keep map height 480.
- `ResourceBar.tsx` — remove the 📊 `ActionIcon` (+ `onOpenData` prop) **and the Emissions stat**
  from the climate cluster.
- Tests: region selection shows name + the three stats; box button calls `onOpenData`; empty state
  shows planet stats + hint; ResourceBar no longer renders Emissions or the 📊 button.
- Update `DESIGN-SYSTEM.md` (new `RegionInfoBox` rule; ResourceBar no longer has 📊 or Emissions)
  and the `current/` gallery; set this proposal **Implemented** in `README.md`.
