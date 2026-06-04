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

### Surfaces

- 3D scene viewport background: `#05080f` (near-black blue), radius `8`.
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

- **ResourceBar** — bordered `Paper`, year/turn on the left (`fw={700}`), PC (`grape`) and Money
  (`teal`) `Badge`s (`size="lg"`) on the right.
- **Dashboard** — bordered `Paper`, title "Planet", warming/CO₂/emissions rows, temperature value
  colored by `temperatureColor`, trailed by a `Sparkline` (240×40) of temperature history.
- **RegionPanel** — bordered `Paper`; per-metric rows with a `Progress` bar colored by
  `metricColor(value)`. Empty state: dimmed "Select a region on the globe."
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
