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
- Main layout (top→bottom, so the action sits above the fold): sticky resource header → 2-column
  `Grid` (`align="stretch"`; scene `span md=7`, info column `span md=5` holding **Dashboard +
  RegionPanel**) → full-width **PolicyBoard** (`span 12`) → full-width **TurnLog** (`span 12`, demoted
  to bottom as reference/history). Stacks to single column on `base` (mobile).
- Scene viewport: `height: 100%`, `minHeight: 440` — the map **fills its grid row** so it is as tall as
  the info column, leaving **no dead space** beneath it (a stretched `Grid` row sizes both columns to
  the taller one). The inline `world-map.svg` uses `preserveAspectRatio="xMidYMid meet"`, so the **whole
  world is always shown**, centered; the slim top/bottom bands fall back to the scene's `#05080f` ocean.
  (Replaces the earlier `clamp(220px, 38vh, 340px)`, which under-filled the column and looked tiny.)
- Right info column gap: `12px`.

---

## Components (appearance rules)

- **WorldMap** (`scene/WorldMap.tsx`) — flat, static equirectangular world map of the 10 regions,
  rendered from the pre-baked `src/assets/world-map.svg` (real Natural Earth geometry). Each region
  is one filled shape in its `REGION_COLORS` hue with **no internal country borders** — only region
  partition lines. Realistic ocean (gradient + graticule). Click a region to select it (others dim
  to 0.32; hover brightens). India follows the Government-of-India depiction (J&K incl. Azad
  Kashmir, Gilgit-Baltistan, Shaksgam, Aksai Chin). Replaces the former 3D R3F globe.
- **ResourceBar** — bordered `Paper`, year/turn on the left (`fw={700}`), and a single **Money**
  (`teal`) `Badge` (`size="lg"`, `leftSection="💰"`) on the right (the game's only spendable
  resource). The badge shows what is **REMAINING** to spend this turn — balance minus the staged
  `costNow.money` — not the raw balance, so staging a policy immediately drops the number. `costNow`
  counts **every** staged policy's first-turn GDP-scaled charge (one-time enactment *and*
  recurring/buildout first upkeep, which is charged on the enactment turn), so committing any policy
  with a money cost visibly moves the badge — not just one-time policies. When a staged selection
  exceeds the budget the badge turns **red** and an `⚠ over budget` `role="alert"` line appears
  (mirrors `validateSelection` / the disabled End Turn). Rendered as a **sticky header** at the top of
  `AppShell.Main` (`position: sticky; top: 0`, body-colored background) so it stays visible while the
  player works the policy board.
- **Dashboard** — bordered `Paper`, title "Planet", warming/CO₂/emissions rows, temperature value
  colored by `temperatureColor`, trailed by a `Sparkline` (240×40) of temperature history.
- **RegionPanel** — bordered `Paper`; per-metric rows with a `Progress` bar colored by
  `metricColor(value)`. Empty state: dimmed "Select a region on the globe."
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
