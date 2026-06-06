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
| Political Capital | `grape` |
| Money | `teal` |
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
- App frame: `AppShell` with `padding="md"`.
- Main layout: 2-column `Grid` — scene `span md=7`, info column `span md=5`; policy tray spans 12.
  Stacks to single column on `base` (mobile).
- Scene viewport: `height: 70vh`, `minHeight: 420`.
- Right info column gap: `12px`.

---

## Components (appearance rules)

- **WorldMap** (`scene/WorldMap.tsx`) — flat, static equirectangular world map of the 10 regions,
  rendered from the pre-baked `src/assets/world-map.svg` (real Natural Earth geometry). Each region
  is one filled shape in its `REGION_COLORS` hue with **no internal country borders** — only region
  partition lines. Realistic ocean (gradient + graticule). Click a region to select it (others dim
  to 0.32; hover brightens). India follows the Government-of-India depiction (J&K incl. Azad
  Kashmir, Gilgit-Baltistan, Shaksgam, Aksai Chin). Replaces the former 3D R3F globe.
- **ResourceBar** — bordered `Paper`, year/turn on the left (`fw={700}`), PC (`grape`) and Money
  (`teal`) `Badge`s (`size="lg"`) on the right.
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
    GDP, Avg support, PC regen, Money regen). When a region is selected it adds **growth** (Econ
    growth, Scarcity, Constraint ×, Output ratio, Pop growth), **Pressures** (Water/Land/Bio loss —
    pre-clamp drop), and a **Support Δ breakdown** (from warming / growth / equity, plus Equity
    drift). All values come from the widened `TurnDiagnostics`; only `Warming⁺ = max(0, ΔTemp)` is
    derived in the UI.
- **PolicyCard** — bordered `Card`, 180px wide; category-colored art band (height 36, icon) on top,
  name (`fw={700}`), 2-line clamped description, PC + Money `Badge`s (`variant="light"`). Hover
  scales 1.03, tap 0.98 (framer-motion); selected → 2px `earth-5` outline; unaffordable → 0.5
  opacity + `not-allowed`.
- **PolicyTray** — horizontal scrolling `Group` of cards (`mah={420}`), validation reason in red,
  full-width primary "End Turn ▶" button.
- **EndingScreen** — full-screen `Overlay` (black, 85% opacity), centered; kind `Badge`
  (win=teal / loss=red / ambiguous=yellow), large title, description, "Play again". Fades/slides
  in (framer-motion).

---

## Motion

- `framer-motion` is the animation library.
- Interactive cards: `whileHover` scale 1.03, `whileTap` scale 0.98 (disabled when not actionable).
- Overlays: fade + 20px rise, ~0.6s.

---

## Accessibility notes (keep when designing)

- Interactive cards expose `role="button"`, `tabIndex`, `aria-pressed`, `aria-disabled`,
  `aria-label`, and Enter/Space activation. New interactive visuals must preserve this.
