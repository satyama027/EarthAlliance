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
- **DrillDownPanel** (`DrillDownPanel.tsx`) — the body of the `DataOverlay`: a **config-driven,
  recursive metric drill-down** that replaced the flat Dashboard/RegionPanel. Bordered `Paper`,
  header = entity title (`Title order={4}` — "Planet", or the region name with its `REGION_COLORS`
  dot) + a dimmed summary line **shown only at the overview** (drilled levels drop it — the breadcrumb
  + content stand alone), then a **breadcrumb** (`Overview › Emissions › Electricity › Coal`; each
  prior crumb is an earth-tinted button, the current is bold text) and, per level, one of:
  the top-level `MetricGrid`, a `Composition`, or a `MetricTrend` — **with no separate section label**
  (the breadcrumb's current crumb already names the view). Owns the drill `path`; the
  `DataOverlay` re-keys it by entity so the path resets when the selection changes. The metric tree
  (`game/metricTree.ts`) is the single source of truth; every value/series is a pure selector over
  `turnLog`, so planet and region share one tree (planet via the `planetAggregate` selector).
- **MetricGrid** (`MetricGrid.tsx`) — the drill-down's top level: a 2-col grid of the six headline
  metric tiles — **Emissions · Public support · Income · Biodiversity · Water availability · Land
  availability**. Each tile (`dark-8` fill, `dark-4` border, radius 4) shows a color dot + label, the
  value + unit, a `Sparkline` mini-trend, and a `›` drill affordance. Tile color = the node's fixed
  color (emissions/income) or `metricColor(value)` (index metrics).
- **Composition** (`Composition.tsx`) — the reusable "contribution of each part" renderer (generalizes
  the old EmissionsBySource). **`sum` mode**: a proportional stacked bar (`SOURCE_COLORS` /
  `GENERATION_COLORS`) over rows (`swatch · label · value · %`), size-ordered; used for
  Emissions→sectors and Electricity→coal/gas/oil. **`ledger` mode**: signed money rows (in = `teal.4`
  `+$…`, out = `red.4` `−$…`) + a top-bordered **Net /turn**; used for Income→tax/carbon-tax/upkeep.
  A **negative** sum-mode row (a land-use carbon **sink**) is shown as a signed `−value` in `teal.4`
  with the word **`sink`** in the %-column (never a bogus negative percentage). Every row is a button:
  a `›` drills into further composition, a `📈` opens that part's trend.
- **MetricTrend** (`MetricTrend.tsx`) — the reusable value-vs-year line graph (generalizes
  `Sparkline`, which stays the tile mini-trend). Reads **turn by turn**. Headline = latest value +
  unit + a change chip (`▲/▼ Δ since <year>`, `earth.3` good / `red.4` bad by the node's `goodUp`;
  change shown to enough precision that a small real move never rounds to `0.0`). Chart (`dark-8`
  panel, viewBox `0 0 400 180`): the **Y axis is baselined at 0** (so a small change reads as small,
  not a cliff; a sink shows the 0 line) with nice-number ticks (1/2/5 × 10ⁿ) + **horizontal value
  gridlines** (`#2b2d31`) labeled to step-appropriate precision; a **vertical gridline at every turn
  year** (`#212327`, fainter since denser); a faint area fill + the line; and a **dot at every turn**
  (latest emphasized). **Value labels sit above each turn's dot and year labels below** — both shown
  for every turn on a short series (**≤ 8 turns**), else **thinned** to the first, the last and every
  `ceil((n−1)/6)`-th (edge labels start/end-anchored so they never clip); dots + vertical gridlines
  stay at *every* turn regardless, so the per-turn cadence is never lost. Used for the index metrics
  and every leaf sector/fuel/income line (metrics with no modeled composition). The two grid greys
  (`#2b2d31` horizontal, `#212327` vertical) are the MetricTrend grid tones — dark neutrals in the
  surface ramp, no new palette entry.
- **EmissionsBySource** (`EmissionsBySource.tsx`) — the earlier stacked-bar + legend breakdown.
  **Superseded in the UI by `Composition` (sum mode)** and no longer mounted; the module is retained
  because its `EMISSION_SOURCES` / `SourceValues` exports are the shared source keys used by
  `planetAggregate` and `game/metricSeries`. Historical look: a horizontal stacked bar (`dark-8`
  track, `SOURCE_COLORS` segments) over a `source · Gt · %` legend, size-ordered, with the negative
  `landUse` **sink** case.
- **GenerationMix** / **RegionLevers** / **RegionIncome** / **MetricBar** — components of the retired
  Dashboard/RegionPanel. **Not currently surfaced** by the drill-down (the redesign is metric-first:
  the electricity fuel drill shows per-fuel *emissions*, not the full 8-source generation *share* mix,
  grid-intensity gauge, storage/crop-yield levers). Retained in the tree pending a decision on whether
  to re-surface the generation-share mix + levers under Electricity. `GenerationMix` still renders the
  derived grid-intensity gauge + banded fossil/nuclear/renewable bar + band legend when mounted.
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
  *(The retired `Dashboard` and `RegionPanel` — flat top-to-bottom stacks of these sections — were
  replaced by `DrillDownPanel`; the region income ledger now lives in `Composition` ledger mode.)*
- **DataOverlay** (`DataOverlay.tsx`) — the "Full data" window opened from the **RegionInfoBox 📊
  button**. Full-screen `Overlay` (`color="#000"`, `backgroundOpacity={0.85}`, `fixed`, `zIndex={1000}`)
  with a centered, framer-motion (fade + 20px rise) window ~460px wide; content scrolls in a
  `ScrollArea.Autosize` (`mah="86vh"`). It **hosts the `DrillDownPanel`**, passing the entity
  (`{kind:'region',id}` when a region is selected, else `{kind:'planet'}`) and the full `turnLog`;
  the panel is `key`ed by entity so the drill path resets on selection change. Closes on the ✕
  `ActionIcon` (top-right), `Escape`, or a backdrop click. Reuses the `EndingScreen` overlay pattern;
  adds **no new tokens**.
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
