# Turn Log — "More" calc-internals

**Status:** Approved · 2026-06-06
**Mockup:** [`mockup.html`](./mockup.html)

## Intent

The Turn Log shows final per-turn values but not *why* they moved. Players (and we, while
balancing) want to see the engine's per-turn **intermediate variables** — the climate physics,
the economy/decarbonization factors, and the selected region's growth mechanics. This proposal
adds a per-entry **"More ▾"** toggle that reveals a **CALC** section with those internals, keeping
the default view compact.

## Design

- Each turn entry gains a dimmed, full-width **`More ▾` / `Less ▴`** toggle under the existing
  ledger, separated by a hairline top rule (`--border`). Uppercase micro-text (11px, `--dimmed`),
  hover tints to `earth-3`. **Collapsed by default; per-entry state** (opening one entry does not
  affect others).
- Expanding reveals a **CALC** section, grouped with green-tinted (`earth-7`) sub-labels to mark
  "derived internals" as distinct from headline state. The set covers **every sub-model** so the
  panel explains why each value moved:
  - **Calc · Climate** — ΔTemp, Warming⁺ (`max(0,ΔTemp)`), Eq. temp, CO₂ ratio, ΔCO₂, Gross emissions
  - **Calc · Economy** — Damage, Base growth ×, Decarb ×
  - **Calc · Resources** — World pop, World GDP, Avg support, PC regen, Money regen
  - **Calc · _Region_ growth** (region selected) — Econ growth, Scarcity, Constraint ×, Output ratio,
    Pop growth
  - **Pressures (pre-clamp drop)** — Water loss, Land loss, Bio loss
  - **Support Δ breakdown** — from warming / from growth / from equity (the three signed terms that
    sum to the support change), plus Equity drift
- CALC values render one notch quieter than headline values (`--text`, not `--text-strong`):
  mechanism, not outcome. Same `tgrid`/`tcell` ledger (dotted separators, `tabular-nums`).
- The **baseline turn** (turn 0, no `diagnostics`) shows **no `More`** button.

## Rationale

- Reuses the existing Turn Log visual language (`tentry` / `tblock` / `tgrid` / `tcell`) verbatim,
  so the addition is consistent by construction.
- Opt-in disclosure keeps the headline log scannable; the green CALC tint creates a quiet hierarchy
  rather than a flat number-wall.
- Engine-exact: every CALC value comes from the engine's widened `TurnDiagnostics`, never
  re-derived in the UI (the lone exception, `Warming⁺ = max(0, deltaTemperature)`, is a trivial
  clamp of an already-surfaced value).

## Tokens

**No new theme tokens.** Uses existing `earth-3`/`earth-7`, `dark-4`/`dark-6` surfaces, `red`,
`dimmed`, and the established `tabular-nums` ledger styling. Two new component-local style rules
(the `More` toggle and the `CALC` label tint) — no additions to `theme.ts`.
