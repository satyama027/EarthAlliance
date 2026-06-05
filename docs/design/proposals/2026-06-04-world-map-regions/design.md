# World map — 10 divided regions

**Status:** Approved (2026-06-04) · **Mockup:** [`mockup.html`](./mockup.html) (open in a browser)

## Intent

Replace the rotating 3D globe (`packages/web/src/scene/`) with a **flat, static world map** where
each region occupies its **real geographic footprint** (an area, not a dot) and is clickable. The
world is fully divided into **10 regions**.

## Rationale / key decisions

- **Real geometry, not hand-drawn.** The map renders real Natural Earth coastlines
  (`world-atlas` TopoJSON, `countries-110m`). Countries are *grouped* into regions; region
  boundaries are a computed mesh of the real national borders where the region differs. (Earlier
  hand-authored polygons were rejected as low-fidelity — do not reintroduce them.)
- **Projection:** equirectangular (lon→x, lat→y). Static — no rotation, no zoom.
- **No internal country borders.** Only **region partition lines** are shown. Country-to-country
  seams within a region are dissolved (in the mockup, by stroking each country in its own region
  color; in the app, prefer merging each region's countries into one geometry via
  `topojson.merge` so there are genuinely no internal edges).
- **Fill = fixed distinct color per region** (default). A public-support metric fill (the existing
  `metricColor` ramp) is also supported and was kept as a toggle in the mockup; default is region
  color. Region color is a **view concern** → lives in the web theme, not the engine.
- **Ocean = realistic** by default (radial gradient + faint lat/lon graticule). A flat dark ocean
  is available as an alternative.
- **Labels** on by default, placed at each region's centroid.
- **Selection:** clicking a region (or legend chip) selects it — it stays lit, others dim — and
  drives the existing `RegionPanel`. `selectedRegionId` remains a view-only concern in `App`.

## The 10 regions & country grouping

`north-america, latin-america, europe, russia-central-asia, mena, sub-saharan-africa, south-asia,
east-asia, southeast-asia, oceania`.

The full country→region map (covering all 177 countries in `countries-110m`) is in `mockup.html`
(`NAME2REGION`) and must be ported verbatim. Existing 5 region ids are unchanged; the 5 new ids are
`latin-america`, `russia-central-asia`, `mena`, `southeast-asia`, `oceania`.

## Map data corrections (carry into the app)

- **France / French Guiana:** the `France` feature spans Europe + South America. Split it; the
  South-American part (lon < −20) → `latin-america`, and exclude France from the region-boundary
  mesh so French Guiana doesn't get a stray outline.
- **Government of India boundary (required):** J&K incl. **Azad Kashmir, Gilgit-Baltistan,
  Shaksgam, and Aksai Chin** must render as **part of India**. Azad Kashmir & Gilgit-Baltistan
  already fall in `south-asia` (same region as India) once seams are removed. Aksai Chin + Shaksgam
  sit in China's geometry in the source data and are reassigned to `south-asia`, with the
  India–China boundary drawn along the GoI line.
  - ⚠ The mockup uses an **approximate** correction polygon/line. **Production must use a vetted
    GoI-aligned boundary** (Survey-of-India-consistent), not the placeholder geometry.

## Asset pipeline — bake the map, don't recompute it at runtime

The map geometry is fixed, so it is **generated once, offline, and loaded as a static vector
asset** — the runtime never runs D3 or parses TopoJSON.

1. **Generator script** (committed, e.g. `packages/web/scripts/generate-map.mjs`, run via an npm
   script). Uses `d3-geo` + `topojson-client` + `world-atlas` to: project (equirectangular), merge
   each region's countries into one path (`topojson.merge`), compute the region partition-line
   mesh, apply the data corrections (French Guiana split; GoI Kashmir/Aksai Chin), and **emit a
   self-contained SVG**.
2. **Asset:** `packages/web/src/assets/world-map.svg` (committed). Structure — NOT a flat raster:
   - one `<path>` per region with `id="<region-id>"` / `data-region` (so it's clickable + fillable),
   - a `<path>` for the region partition lines, the GoI boundary line, and (optional) graticule,
   - an ocean background layer.
   Region fills may be left unset (applied at runtime from the theme) so colors stay theme-driven.
3. **Runtime component** (`scene/WorldMap.tsx`): inlines the SVG (import as raw/inline, e.g. via
   `?raw` or an SVGR component), then colors each region path from `REGION_COLORS`, toggles a
   `selected`/`dim` class on click, and calls `onSelectRegion`. **No `d3-*` or `topojson-*` in the
   runtime bundle** — they are `devDependencies` used only by the generator.

Re-run the generator only when regions or boundaries change; the committed SVG is the source the
game loads.

## Engine work (beyond visuals)

Add the 5 new regions to `packages/engine/src/data/regions.ts` (`SAMPLE_REGIONS`), each with the
full `Region` shape (population, education/health indices, median age, fertility, GDP/capita,
support, equity, biodiversity, regional emissions, water/land availability, lat/lon). Use plausible
real-world-ish 2025 values; final balance is deferred to playtesting (per project convention).
This expands the simulation surface — verify determinism/invariant tests still pass with 10 regions.

## Tokens added / changed (for theme.ts ↔ DESIGN-SYSTEM.md)

- `REGION_COLORS`: a 10-entry map `regionId → color` (region fill palette). Mockup values:
  NA `#4dabf7`, LatAm `#ffa94d`, Europe `#9775fa`, Russia&CA `#f783ac`, MENA `#ffd43b`,
  SSA `#69db7c`, S.Asia `#ff8787`, E.Asia `#38d9a9`, SE.Asia `#a9e34b`, Oceania `#66d9e8`.
- Map surface tokens: ocean gradient stops (`#0d2440`→`#071529`→`#05080f`), graticule `#1b3a5c`,
  region partition line `#0a0f17`, selected outline = existing `earth-5` (`#20c997`).

## Dependencies

**Build-time only** (`devDependencies` of `packages/web`, used by the generator script):
`d3-geo`, `topojson-client`, `world-atlas`. The **runtime bundle ships none of these** — it loads
the baked `world-map.svg` asset. (The mockup's CDN use of d3/topojson is for iteration only.)

## Out of scope (YAGNI)

Per-region at-a-glance support indicator on the map (RegionPanel already shows metrics on select);
50m higher-res dataset (110m is fine to start); switchable metric fills beyond support.
