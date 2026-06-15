# Earth Alliance — Design

This folder is the **design state** of the web client: how it looks now, the visual language it
follows, and the history of approved design decisions. It is the persisted output of the
design-first workflow (`.claude/skills/visual-design-gate/SKILL.md`, or the `/design` and
`/implement` commands).

## How the workflow works

Every UI/visual change goes through two phases:

1. **Design** (`/design <request>`, or auto when you ask for a visual change) — Claude builds a
   **browser mockup**, you iterate and approve it, and the approved design is saved as a proposal.
   No component code is written until you approve.
2. **Implement** (`/implement`) — Claude builds the approved design into React/Mantine components,
   syncs the theme, and **updates the current-state gallery** so it reflects the live UI.

## What lives here

| Path | What it is |
|------|-----------|
| [`DESIGN-SYSTEM.md`](./DESIGN-SYSTEM.md) | Living visual language — tokens + component rules. Mirrors `packages/web/src/theme.ts`. |
| [`current/`](./current/index.html) | **Current-state gallery** — mockups that always reflect the live UI. Quick reference. |
| `proposals/<date>-<topic>/` | Approved design proposals (mockup + rationale). Immutable history. |

Mockups are self-contained HTML — open them directly in a browser (`file://`).

## Proposal status tracker

| Date | Topic | Status | Proposal |
|------|-------|--------|----------|
| 2026-06-15 | Emissions data overlay — remove inline Planet/Region panels, full-width map, icon-only 📊 header button opens an overlay (region if selected, else planet); headline climate stats move into the resource bar (Variant A) | **Implemented** | [proposal](./proposals/2026-06-15-emissions-data-overlay/design.md) |
| 2026-06-14 | Emissions by source — stacked bar + legend on Planet & Region panels, four energy/land levers with hover tooltips, land-use sink (negative) case | **Implemented** | [proposal](./proposals/2026-06-14-emissions-by-source/design.md) |
| 2026-06-12 | Single-currency resource header — remove Political Capital; emphasized solo **Money** pill (Variant A) | **Implemented** | [proposal](./proposals/2026-06-12-single-currency-header/design.md) |
| 2026-06-12 | Balanced layout (map fills its column, whole world shown, no dead space) + drag policies into **Active drop slots** (floating overlay, pointer hit-test, card stays) | **Implemented** | [proposal](./proposals/2026-06-12-policy-drag-slots-balanced-layout/design.md) |
| 2026-06-12 | Policy selection — sticky resource header shows **remaining** PC/Money + reorder (policy board raised, Turn Log to bottom) so you set policies & End Turn without scrolling | **Implemented** | [proposal](./proposals/2026-06-12-policy-selection-no-scroll/design.md) |
| 2026-06-11 | Per-region policy selection — two-lane drag board (Available/Active, drag to enact, cancellable programs) | **Implemented** | [proposal](./proposals/2026-06-11-per-region-policy-selection/design.md) |
| 2026-06-06 | Turn Log — "More" calc-internals (per-turn intermediate variables) | **Implemented** | [proposal](./proposals/2026-06-06-turn-log-calc-internals/design.md) |
| 2026-06-05 | Turn Log panel — per-turn data history (global + selected region) | **Implemented** | [proposal](./proposals/2026-06-05-turn-log-panel/design.md) |
| 2026-06-04 | World map — 10 divided regions (replaces 3D globe) | **Implemented** | [proposal](./proposals/2026-06-04-world-map-regions/design.md) |

Statuses: **Approved** (design signed off, not yet built) → **Implemented** (shipped to the app).
