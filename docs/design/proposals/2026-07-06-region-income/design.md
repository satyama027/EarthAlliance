# Per-region Income display

**Status:** Approved · 2026-07-06

## Intent

Treasury income is invisible per region today — the only per-turn figure ("Money regen", a single
global number) is buried in the Turn Log's collapsed "More". With the carbon-tax remodel, a region's
income now has a meaningful, changing **Carbon tax** component, so the player needs to see what each
region earns and specifically the carbon tax's contribution (which shrinks as the region
decarbonizes).

## What's added

Two surfaces, no new tokens:

1. **RegionInfoBox (glance card)** — one new `Stat`, **Income $X/turn**, inserted after the Emissions
   stat (selected-region branch only). Value is the **net** cash flow for the region (tax income +
   carbon tax − policy upkeep) so it reads as true per-turn money. Uses the existing `Stat` + `Unit`
   helpers; matches GDP/Emissions styling exactly.

2. **RegionPanel (drill-down, inside `DataOverlay`)** — a new **Income** section, placed after
   "Energy & land levers" and before the metric bars. Section header uses the same `earth-7`
   uppercase + top-border treatment as "Emissions by source" / "Generation mix". Rows use the same
   2-column ledger idiom as the emissions legend:
   - **Tax (GDP)** `+1,014` (teal — money in)
   - **Carbon tax** `+11` — **emphasized** (Variant B): subtle `surface-2` fill + 2px `earth-5`
     left-accent bar + a `−1px` dimmed note "shrinks as this region decarbonises". Only rendered when
     the carbon tax is active in the region (nonzero).
   - **Policy upkeep** `−120` (red — money out)
   - **Net** `$905 /turn` — bold, on a top-bordered row.

   Sign colors: positive = `teal` (the money color), negative = `red`.

## Decisions

- **Variant B (carbon-tax row highlighted)** chosen over plain rows — surfacing the carbon tax's
  contribution is the whole point of the feature, so the row gets a light accent + a one-line "why it
  moves" note.
- **Glance value = net** (income − upkeep), matching the drill-down "Net" line, rather than gross.

## Tokens

**No new tokens.** Reuses `teal` (money/positive), `red` (negative/outflow), `earth-5`/`earth-7`
(section accent + carbon-tax highlight), `surface-2` (row fill), and existing text/dimmed/border
tokens. `theme.ts` needs no changes.

## Data (implementation note — engine already landed)

A new `regionBudget` selector composes `{ taxIncome, carbonTax, upkeep, net }` from the latest
`TurnDiagnostics` (`taxIncomeByRegion`, `carbonTaxRevenueByRegion`, `programSpendByRegion`), with a
turn-0 projection fallback via the engine `regionTaxIncome` / `carbonTaxRevenue` helpers (upkeep 0).
`net = taxIncome + carbonTax − upkeep`.
