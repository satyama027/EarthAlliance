# Generation Mix display — RegionPanel

**Status:** Approved 2026-06-16 · Variant A (Banded)

## Intent

The engine now models each region's electricity **generation mix** (8 sources) and *derives* grid
carbon intensity from it (renewable/nuclear policies shift the mix). The UI needs to surface this
per region so the player can see what their grid is made of and watch it decarbonize. It goes in
the **RegionPanel** (inside the emissions `DataOverlay`), **beneath `EmissionsBySource` and above
`RegionLevers`**.

## Approved design (Variant A — Banded)

A `Generation mix` block, in the EmissionsBySource visual language:

1. **Derived grid-intensity readout** — label `Grid carbon intensity (derived)` + the value, over a
   thin gradient **gauge** (green `#2f9e44` → amber `#fab005` → red `#e03131`) with a white marker at
   the intensity, and `0 · clean` / `coal · 1.0` end labels. Reinforces that intensity is now
   derived, not a lever.
2. **Stacked bar** (18px, `dark-8` track, 4px radius) split into three **bands** — fossil | nuclear |
   renewable — separated by **2px `dark-8` gaps**, so the clean-vs-dirty split reads at a glance.
   Within a band, sources order by size descending. Each segment has a native `title` tooltip.
3. **Band-grouped legend** (`1fr auto` grid): each band gets a subheader (band name + colored dot +
   **band subtotal %**), followed by its sources (swatch · dotted-underline name · share %). Each
   source name carries a Mantine `<Tooltip multiline w={250}>` (same affordance as EmissionsBySource).

Rejected: Variant B (flat, size-ordered bar + single "clean %" line) — less explicit about the
fossil/clean story the mechanic is about.

## Tokens added → `SOURCE_COLORS` is joined by a new `GENERATION_COLORS` map (theme.ts + DESIGN-SYSTEM.md)

Chosen so the three bands read as distinct families. All reuse existing app hues except none are new
accents beyond what the palette already contains.

| Source | Color | Band / rationale |
|--------|-------|------------------|
| coal | `#495057` | fossil — dark slate grey (dirtiest) |
| gas | `#868e96` | fossil — grey (industry hue) |
| oil | `#e8590c` | fossil — deep orange (orange-7) |
| nuclear | `#9775fa` | **violet** (europe region hue) — firm, zero-carbon, *not* renewable |
| hydro | `#4dabf7` | renewable — blue (water) |
| wind | `#3bc9db` | renewable — cyan (air) |
| solar | `#ffd43b` | renewable — yellow (sun) |
| geothermal | `#94d82d` | renewable — lime (earth heat) |

Band accent dots: Fossil = oil orange, Nuclear = violet, Renewable = hydro blue.

## Implementation notes (for `/implement`)

- New component `packages/web/src/components/GenerationMix.tsx` modeled on `EmissionsBySource.tsx`
  (Mantine `Box`/`Group`/`Text`/`Tooltip`). Reads `region.generationMix` and the engine-exported
  `GENERATION_SOURCES` (for the `renewable` flag / band grouping).
- Add `GENERATION_COLORS` to `packages/web/src/theme.ts` and document it in
  `docs/design/DESIGN-SYSTEM.md` (keep them in sync).
- Mount in `RegionPanel.tsx` between `EmissionsBySource` and the `RegionLevers` block.
- Update `docs/design/current/index.html` to reflect the now-live RegionPanel.
- The grid-intensity gauge is purely presentational (value comes from `region.gridCarbonIntensity`).
