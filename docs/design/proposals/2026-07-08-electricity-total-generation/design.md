# Electricity panel — trim heading + total power generation

**Status:** Approved · 2026-07-08

## Intent

Two tweaks to the **Electricity** drill-down (`ElectricityPanel`):

1. The first subheading `GENERATION MIX — share of power · = 100%` is trimmed to just
   **`GENERATION MIX`** (the `— share of power · = 100%` note is dropped).
2. A **total power generation** figure is added, right-aligned on that same heading row —
   real **TWh/yr** (e.g. East Asia ≈ 11,800), opposite the `GENERATION MIX` label.

## Rationale

The panel previously showed only the generation *mix* (percentage shares summing to 100%) with no
sense of *how much* power the region/planet actually generates. Surfacing the absolute total gives
that missing magnitude, and reusing the freed-up heading row (after removing the redundant
"= 100%" note) keeps the layout tight — no extra vertical band.

## Data / model note

The engine stores `electricityDemand` in **coal-equivalent reference units** (tuned so
`demand × gridCarbonIntensity = electricity` Gt CO₂), **not** TWh, and it does not convert to TWh
with a single global factor. So a fixed per-region calibration constant
`twhPerDemandUnit = realTWh₂₀₂₅ / demand₂₀₂₅` (both known from `data/regions.ts`, real 2024 anchors
in its header comment) is baked in; `generationTWh(region) = electricityDemand × twhPerDemandUnit`.
Because `electricityDemand` grows with GDP over turns, the TWh figure scales with it automatically.
Planet total = Σ per-region `generationTWh`.

## Tokens

**No new tokens.** Uses existing surface / text / dimmed tokens and `tabular-nums`. The right-side
stat is bold `text-strong` value + dimmed `TWh/yr` unit + a small dimmed uppercase `TOTAL GENERATION`
caption. Precision: rounded to hundreds (reads cleanly across ~300 → ~30,000 TWh).

## Mockup

[`mockup.html`](./mockup.html) — East Asia, matching the reference screenshot. Everything below the
divider (the `Electricity emissions` streams) is unchanged.
