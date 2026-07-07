# Earth Alliance — Design System

The living visual language of the web client. This document is the **human-readable** source of
truth; its **code embodiment** is `packages/web/src/theme.ts` (the Mantine theme). When you change
one, change the other in the same commit.

The app runs Mantine 7 in **dark color scheme** (`defaultColorScheme="dark"`).

---

## Color

### Brand — `earth` (primary)

A teal→green tuple. `primaryColor: 'earth'`. Buttons, selection outlines, and accents use it.

| Step | Hex | Typical use |
|------|-----|-------------|
| earth-0 | `#e6fcf5` | lightest tints |
| earth-3 | `#63e6be` | hover fills |
| earth-5 | `#20c997` | **selection outline** (`--mantine-color-earth-5`) |
| earth-6 | `#12b886` | primary buttons |
| earth-9 | `#087f5b` | darkest |

### Semantic colors (Mantine palette)

| Meaning | Mantine color |
|---------|---------------|
| Money (the only spendable resource) | `teal` |
| Warning / ambiguous ending | `yellow` |
| Error / validation / loss ending | `red` |
| Win ending | `teal` |

### Policy category colors (`CATEGORY_COLOR` in `theme.ts`)

Used as the placeholder card-art band; real art will drop in later behind the same key.

| Category | Color | Icon |
|----------|-------|------|
| energy | `#f59f00` | ⚡ |
| industry | `#868e96` | 🏭 |
| land | `#2f9e44` | 🌳 |
| social | `#1971c2` | 🤝 |
| frontier | `#9c36b5` | 🚀 |

### Emission-source colors (`SOURCE_COLORS` in `theme.ts`)

The by-source emissions breakdown (Dashboard + RegionPanel). All reused from existing palette hues
so the breakdown reads as native; `sink` is the one new accent, used when `landUse` goes negative.

| Source | Color | Origin |
|--------|-------|--------|
| electricity | `#f59f00` | energy category (⚡) |
| transport | `#4dabf7` | north-america region |
| aviationShipping | `#66d9e8` | oceania region |
| industry | `#868e96` | industry category (🏭) |
| agriculture | `#a9e34b` | southeast-asia region |
| landUse | `#2f9e44` | land category (🌳) |
| sink (landUse < 0) | `#1098ad` (dashed `earth-3` border) | new accent — the one negative case |

### Generation-source colors (`GENERATION_COLORS` in `theme.ts`)

The per-region generation-mix bar (RegionPanel). Chosen so the three **bands** read as distinct
families at a glance: fossils = dark/grey cluster + orange oil; nuclear = violet (firm, zero-carbon,
but **not** renewable); renewables = cool blue/cyan/yellow/lime. Band accent dots: Fossil = oil
orange, Nuclear = violet, Renewable = hydro blue.

| Source | Color | Band |
|--------|-------|------|
| coal | `#495057` | fossil — dark slate grey (dirtiest) |
| gas | `#868e96` | fossil — grey (industry hue) |
| oil | `#e8590c` | fossil — deep orange (orange-7) |
| nuclear | `#9775fa` | **violet** (europe hue) — firm, zero-carbon, not renewable |
| hydro | `#4dabf7` | renewable — blue (water) |
| wind | `#3bc9db` | renewable — cyan (air) |
| solar | `#ffd43b` | renewable — yellow (sun) |
| geothermal | `#94d82d` | renewable — lime (earth heat) |

The **grid-intensity gauge** uses a fixed green→amber→red gradient (`#2f9e44` → `#fab005` →
`#e03131`) with a white marker at the derived `gridCarbonIntensity` (0 = clean, 1 ≈ coal).

### World-map region colors (`REGION_COLORS` in `theme.ts`)

Distinct fixed fill per map region (keyed by engine region id). The map generator
(`scripts/generate-map.mjs`) bakes these same values into `world-map.svg` — keep them in sync.

| Region | Color | Region | Color |
|--------|-------|--------|-------|
| north-america | `#4dabf7` | sub-saharan-africa | `#69db7c` |
| latin-america | `#ffa94d` | south-asia | `#ff8787` |
| europe | `#9775fa` | east-asia | `#38d9a9` |
| russia-central-asia | `#f783ac` | southeast-asia | `#a9e34b` |
| mena | `#ffd43b` | oceania | `#66d9e8` |

Map surface tokens (`MAP_SURFACE`): ocean gradient `#0d2440`→`#071529`→`#05080f`, graticule
`#1b3a5c`, region partition line `#0a0f17`, selected outline = `earth-5` (`#20c997`).

### Surfaces

- World-map / scene viewport background: `#05080f` (near-black blue), radius `8`.
- Panels: Mantine `Paper` / `Card` with `withBorder` (no custom elevation yet).

---

## Typography

- Font family: `system-ui, sans-serif` (`theme.fontFamily`).
- Titles: Mantine `Title` — `order={1}` for ending screens, `order={4}` for panel headers.
- Body: `Text`; `size="xs"`/`"sm"` for secondary info; `c="dimmed"` for muted text.
- Numbers/labels emphasized with `fw={600}`–`700`.

---

## Spacing & layout

- Mantine spacing scale (`xs`, `sm`, `md`, `xl`). Panels pad `p="sm"`; ending screen `p="xl"`.
- App frame: `AppShell` with `padding="md"`. A **sticky ResourceBar header** sits at the top of
  `AppShell.Main` (`position: sticky; top: 0; zIndex: 200`), above the grid.
- Main layout (top→bottom, so the action sits above the fold): sticky resource header → a **map row**
  (map `Grid.Col span={{ base: 12, md: 9 }}` + **RegionInfoBox** `span={{ base: 12, md: 3 }}`,
  stacking on narrow) → full-width **PolicyBoard** (`span 12`) → full-width **TurnLog**
  (`span 12`, demoted to bottom as reference/history). The **full Planet (Dashboard) and Region
  (RegionPanel) detail are not inline** — they live in the **emissions data overlay**
  (`DataOverlay`), now opened from the **RegionInfoBox 📊 button**. The map keeps its **fixed 480px
  height** independent of the info box, so a short or tall info box never re-introduces the old
  `align="stretch"` height-coupling that let a tall panel stretch the map container and letterbox the SVG.
- Scene viewport: fixed `height: 480` (full-width), radius `8`. The inline `world-map.svg` uses
  `preserveAspectRatio="xMidYMid meet"`, so the **whole world is always shown**, centered; the slim
  top/bottom bands fall back to the scene's `#05080f` ocean.

---

## Components (appearance rules)

- **WorldMap** (`scene/WorldMap.tsx`) — flat, static equirectangular world map of the 10 regions,
  rendered from the pre-baked `src/assets/world-map.svg` (real Natural Earth geometry). Each region
  is one filled shape in its `REGION_COLORS` hue with **no internal country borders** — only region
  partition lines. Realistic ocean (gradient + graticule). Click a region to select it (others dim
  to 0.32; hover brightens); **click the ocean / empty space to deselect** back to the planet view. India follows the Government-of-India depiction (J&K incl. Azad
  Kashmir, Gilgit-Baltistan, Shaksgam, Aksai Chin). Replaces the former 3D R3F globe.
- **ResourceBar** — bordered `Paper`. Left: year/turn (`fw={700}`) followed by an inline **climate
  cluster** (Variant A) — **Warming** (colored by `temperatureColor`, with a 🌡 glyph) and **CO₂** —
  so the central climate metric stays glanceable without opening anything (`visibleFrom "sm"`; hidden
  on narrow widths). **Emissions is intentionally NOT here** — it lives in the RegionInfoBox /
  DataOverlay, so the always-on bar doesn't duplicate it. Right: just the single **Money** (`teal`)
  `Badge` (`size="lg"`, `leftSection="💰"`); the old 📊 `ActionIcon` was **removed** (data drill-down
  is now owned by the RegionInfoBox). The badge shows what is **REMAINING**
  to spend this turn — balance minus the staged
  `costNow.money` — not the raw balance, so staging a policy immediately drops the number. `costNow`
  counts **every** staged policy's first-turn GDP-scaled charge (one-time enactment *and*
  recurring/buildout first upkeep, which is charged on the enactment turn), so committing any policy
  with a money cost visibly moves the badge — not just one-time policies. When a staged selection
  exceeds the budget the badge turns **red** and an `⚠ over budget` `role="alert"` line appears
  (mirrors `validateSelection` / the disabled End Turn). Rendered as a **sticky header** at the top of
  `AppShell.Main` (`position: sticky; top: 0`, body-colored background) so it stays visible while the
  player works the policy board.
- **Dashboard** — bordered `Paper`, title "Planet", a dimmed `pop … · GDP/capita …` totals subtitle,
  warming/CO₂/emissions rows (temperature colored by `temperatureColor`), then **full region-parity**:
  the same sections a `RegionPanel` shows, in the same order and visual language, only with **planet
  aggregates** (from the `planetAggregate` selector) — **Emissions by source**, **Generation mix**,
  **Energy & land levers**, **Income** (carbon-tax note reads "the planet"), and the five **quality
  bars** (`MetricBar`) — trailed by a `Sparkline` (240×40) of temperature history. Aggregation:
  totals sum; generation/levers are generation-weighted by demand; crop yield + quality bars are
  simple-averaged. **Rendered inside the `DataOverlay`** (planet view, when no region is selected).
- **EmissionsBySource** (`EmissionsBySource.tsx`, shared by Dashboard + RegionPanel) — a horizontal
  **stacked bar** (`dark-8` track, each source a `SOURCE_COLORS` segment) over a 3-column **legend**
  grid (`source · Gt · %`), sources **ordered by size** (descending). Each legend label carries a
  Mantine `<Tooltip multiline w={250}>` explaining the source (dotted-underline affordance). The one
  source that can go negative (`landUse` after reforestation) renders as a dashed-teal **sink**
  segment left of a thin zero divider, with positives stacked to its right; its legend value shows a
  `−` sign in `teal.4` and reads `sink` instead of a %.
- **GenerationMix** (`GenerationMix.tsx`, RegionPanel + Dashboard) — an electricity generation split
  (per-region, or the demand-weighted planet aggregate — it takes `{ mix, intensity }`, not a whole
  `Region`, so both panels feed it).
  A **derived grid-intensity readout** (`Grid carbon intensity (derived)` + value) over a thin
  green→amber→red **gauge** with a white marker at `gridCarbonIntensity` (`0 · clean` … `coal · 1.0`);
  then an 18px **banded stacked bar** (`dark-8` track) split into **fossil | nuclear | renewable**
  blocks separated by 2px `dark-8` gaps (sources size-ordered within a band, `GENERATION_COLORS`
  segments, `title` tooltips); then a **band-grouped legend** (`1fr auto`) — each band a subheader
  (accent dot + name + **subtotal %**) followed by its sources (swatch · dotted-underline name ·
  share %, each name a Mantine `Tooltip`). The lone Nuclear band repeats its name as its single row.
- **RegionInfoBox** (`RegionInfoBox.tsx`) — the compact glance-card beside the map (the map row's
  right column). Bordered `Paper` (`p="sm"`), **content-height and top-aligned** so it reads as a small
  card, never a column rivaling the map. Two states keyed off the selected region:
  - **Region selected** — a `REGION_COLORS` dot + region name (`fw={700}` `size="sm"`), a dimmed
    `pop NNNM` subtitle, then headline stats — **GDP per capita** (`$` + locale value), **Emissions**
    (`Gt/yr`), an **Income** stat (net `$…/turn`, shown when a `regionBudget` is passed), and
    **Public support** (value + a thin `Progress` colored by `metricColor`) — over a full-width
    **📊 "Full region data"** `Button` (`color="earth"`).
  - **No region** — a `🌍 Planet` header, planet quick-stats (**Warming** colored by
    `temperatureColor`, **CO₂**, **Emissions**), a dimmed italic "Click a region for its data" hint,
    and a **📊 "Full planet data"** `Button`.
  Both buttons call `onOpenData`, which opens the existing **DataOverlay** — no emissions logic is
  duplicated. Stats use the shared `Stat` (label + bold value) and `Unit` (dimmed suffix) helpers.
  **No new tokens.**
- **RegionPanel** — bordered `Paper`; region name + a `GDP/capita · pop · Gt/yr` line; then the
  **EmissionsBySource** breakdown for the region; the **Generation mix** block (`GenerationMix.tsx`);
  an **Energy & land levers** block (`RegionLevers.tsx`)
  — a 2×2 grid of the four coupling variables (`Grid intensity` — now a *derived* read-out, `Storage
  built`, `Crop yield`, `Power demand`), each a label + `ⓘ` tooltip, a bold value, and a mini-bar (or
  a "grows with GDP" subtext for demand); then an **Income** block (`RegionIncome.tsx`, shown when a
  `regionBudget` is passed); then the per-metric rows with a `Progress` bar colored by
  `metricColor(value)`. Empty state: dimmed "Select a region on the globe." **Now rendered inside the
  `DataOverlay`** (region view), not inline.
- **RegionIncome** (`RegionIncome.tsx`, RegionPanel) — the region's per-turn treasury cash-flow
  breakdown from the `regionBudget` selector (last turn's `TurnDiagnostics`, or a turn-0 projection).
  An `earth-7` uppercase **Income** header (same section treatment as Emissions/Generation), then a
  2-col ledger: **Tax (GDP)** `+$…` (`teal.4`), a highlighted **Carbon tax** `+$…` row (only when the
  tax is active here — `dark-6` fill + 2px `earth-5` left accent + a dimmed "shrinks as this region
  decarbonises" note), **Policy upkeep** `−$…` (`red.4`), and a top-bordered **Net** `$…/turn`
  (`fw={700}`). Money in = `teal`, out = `red`. **No new tokens.**
- **DataOverlay** (`DataOverlay.tsx`) — the emissions data window opened from the **RegionInfoBox 📊
  button**. Full-screen `Overlay` (`color="#000"`, `backgroundOpacity={0.85}`, `fixed`, `zIndex={1000}`)
  with a centered, framer-motion (fade + 20px rise) window ~560px wide; content scrolls in a
  `ScrollArea.Autosize` (`mah="86vh"`). It **hosts the existing components**: `RegionPanel` when a
  region is selected, otherwise `Dashboard` (the planet) — no emissions logic is duplicated. Closes on
  the ✕ `ActionIcon` (top-right), `Escape`, or a backdrop click. Reuses the `EndingScreen` overlay
  pattern; adds **no new tokens**.
- **TurnLog** — bordered `Paper` titled "Turn Log"; a `ScrollArea.Autosize` (max-height ~340) of
  per-turn entries, **newest first**. Each entry is a `dark-6` sub-card (`dark-4` border, radius 4)
  with a `Turn N · year` header, a **Planet** block (Warming/CO₂/Emissions/Damage) always, and the
  **selected region's** block (GDP/cap + growth, population, and every region index/demography field)
  in a 2-column ledger grid (`SimpleGrid cols={2}`, dotted row separators, `tabular-nums`). When no
  region is selected, the entry shows the Planet block + a dimmed "Select a region…" hint.
  - **Delta chips.** Each value carries a change-vs-previous-turn chip: the arrow shows numeric
    direction (`▲` up / `▼` down / `—` unchanged) and the **color shows good/bad/neutral** for the
    planet/region — good = `#63e6be` (earth-3), bad = `#ff6b6b` (red), neutral/unchanged = dimmed.
    Up-is-bad fields: warming, CO₂, emissions, damage. Up-is-good fields: GDP, support, equity,
    biodiversity, water, land, education, health. Neutral: population, median age, fertility. The
    baseline (turn 0) entry shows no chips (no prior turn). Damage and growth come from the engine's
    exact per-turn `TurnDiagnostics`, never re-derived.
  - **"More" calc-internals.** Each non-baseline entry has a dimmed, full-width **More ▾ / Less ▴**
    toggle (hairline top rule, uppercase 11px, hover → `earth-3`) that reveals a **CALC** section in
    a Mantine `Collapse`. Per-entry state (collapsed by default; toggling one entry never affects
    others). CALC labels are earth-tinted (`earth-7`) to mark *derived internals* apart from headline
    state. Global groups: **Calc · Climate** (ΔTemp, Warming⁺, Eq. temp, CO₂ ratio, ΔCO₂, Gross emis),
    **Calc · Economy** (Damage, Base growth ×, Decarb ×), and **Calc · Resources** (World pop, World
    GDP, Avg support, Money regen). When a region is selected it adds **growth** (Econ
    growth, Scarcity, Constraint ×, Output ratio, Pop growth), **Pressures** (Water/Land/Bio loss —
    pre-clamp drop), and a **Support Δ breakdown** (from warming / growth / equity, plus Equity
    drift). All values come from the widened `TurnDiagnostics`; only `Warming⁺ = max(0, ΔTemp)` is
    derived in the UI.
- **PolicyCard** — bordered `Card`, 180px wide, region-scoped. Category-colored art band (height 34,
  icon), name (`fw={700}`), a **funding pill** (`Buildout`=earth / `Recurring`=teal / `One-time`=gray,
  `variant="light"`), and a Money `Badge` — the **GDP-scaled** region charge with
  cadence (`$250/turn`, `$10` once, `$0` when built/frozen, `paid` when permanent). Buildout cards
  show an **Installed %** label + `Progress` bar (earth; gray when frozen) and a state line
  (`Building · +10%/turn`, `✓ Built · benefit persists`, `Funded each turn`, `Stopped · N% installed`,
  `Starts this turn`). Staged → 2px `earth-5` outline + `STAGED` badge + ✕; cancellable committed →
  ✕ (turns to ↺ when marked to stop, 2px `red-6` outline); locked/unaffordable → 0.5 opacity.
  The visual surface is the reusable `CardFace`; the interactive wrapper drives a **pointer drag**
  (`onPointerDown` → board) — while dragging, the source dims to 0.3 and a `CardFace` clone is lifted in
  a floating overlay (see PolicyBoard). Click/tap and Enter/Space are the accessible, testable
  equivalents. Keeps `role="button"`, `aria-pressed`, `aria-disabled`, `aria-label`.
- **PolicyBoard** — bordered `Paper`, full width, scoped to the selected region (header shows region
  name + `REGION_COLORS` dot). Two stacked lanes — **Active** (top, what's running here) and
  **Available** (bottom, enactable here) — each a horizontal `ScrollArea` of `PolicyCard`s separated
  by a `Divider`; each lane carries a `data-droplane` attribute for drop hit-testing. The Active lane
  shows **empty drop slots** (dashed `dark-4` ghost cards, "＋ drop a policy here", 2 when policies can
  be added) so the drop target is always visible. **Drag a card up** to enact, or **✕** to remove: the
  dragged card is rendered in a **floating overlay** (`createPortal` to `document.body`, `position:
  fixed`, `z-index 9999`, rotate -3°/scale 1.05 + drop shadow) so it floats **above both lanes** and is
  never clipped; the drop lane is found with `document.elementFromPoint` (scroll-correct). Hovering the
  Active lane while dragging arms it + its slots earth-dashed (`earth-5`). A valid drop into the Active
  lane stages the policy (it stays); a tap/click/Enter is the equivalent; an unaffordable attempt shows
  a red **error banner** (`role="alert"`) and does nothing. Empty state (no region): dashed box "Select
  a region on the map to manage its policies." Footer: global this-turn summary (Staged / Cost now /
  Upkeep next turn) + validation reason in red + primary "End Turn ▶".
- **EndingScreen** — full-screen `Overlay` (black, 85% opacity), centered; kind `Badge`
  (win=teal / loss=red / ambiguous=yellow), large title, description, "Play again". Fades/slides
  in (framer-motion).

---

## Motion

- `framer-motion` is the animation library (overlays / `EndingScreen`).
- Policy cards use a **custom pointer drag**: the lifted clone floats in a portal overlay (rotate -3°,
  scale 1.05, drop shadow); the source dims to 0.3. A press under the `DRAG_THRESHOLD` (5px) is a tap.
- Overlays: fade + 20px rise, ~0.6s.

---

## Accessibility notes (keep when designing)

- Interactive cards expose `role="button"`, `tabIndex`, `aria-pressed`, `aria-disabled`,
  `aria-label`, and Enter/Space activation. New interactive visuals must preserve this.
