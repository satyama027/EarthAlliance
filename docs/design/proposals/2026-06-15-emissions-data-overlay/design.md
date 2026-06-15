# Emissions data overlay — replace the layout-stretching region tile

**Status:** Approved → Implemented
**Date:** 2026-06-15
**Mockup:** [`mockup.html`](./mockup.html)

## Intent

Selecting a region used to fill the right-column **Region tile** (`RegionPanel`) with its
emissions breakdown, coupling levers, and metric bars. Because the map and the info column shared
a Mantine `Grid` row with `align="stretch"`, the tall tile **stretched the map container**, and the
inline SVG (`preserveAspectRatio="xMidYMid meet"`) letterboxed against its `#05080f` background —
the "blackspace" around the map.

## Decision

- **Remove both** the planet summary (`Dashboard`) and the region tile (`RegionPanel`) from the
  inline layout. The **map goes full-width**; PolicyBoard and TurnLog are unchanged below it.
- Add an **icon-only 📊 button** to the sticky resource header. Clicking it opens an **overlay
  window** with the by-source emissions data: the **selected region's** data when a region is
  selected, otherwise the **planet's** data.
- **Variant A (chosen):** the headline climate stats (**Warming · CO₂ · Emissions**) move **into
  the resource bar** so warming stays glanceable at all times. (Variant B — strictly nothing
  inline — was rejected because a climate game should not hide the temperature behind a click.)

## Rationale

- The overlay reuses the **`EndingScreen` pattern** (`<Overlay color="#000" backgroundOpacity=
  {0.85} fixed zIndex={1000}>`, centered `Paper`, framer-motion fade + 20px rise, ✕ / Escape /
  backdrop close), so it reads as native motion-and-surface language.
- It **hosts the existing components**: `<Dashboard/>` for the planet view, `<RegionPanel/>` for the
  region view — no emissions logic is rewritten, and their unit tests stay valid.
- The icon-only button keeps the now-busier header (year · climate stats · money · 📊) compact.

## Tokens

**No new tokens.** Reuses `SOURCE_COLORS`, `earth-*` (button = earth-6, hover earth-5), surface /
border / dimmed, `radius` / `radius-sm`, and `temperatureColor()` for the warming color in the bar.

## Out of scope

The policy-card color-coding mismatch (transport policies not matching transport-blue) is **not**
addressed here — explicitly deferred by the user. (Cause for the record: `PolicyCard` colors by
`CATEGORY_COLOR[policy.category]`, and transport policies sit under the broad `industry` category.)
