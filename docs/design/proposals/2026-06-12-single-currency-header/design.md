# Single-currency resource header

**Status:** Approved — 2026-06-12
**Topic:** Remove Political Capital from the game; the ResourceBar shows only Money.

## Intent

The game is moving from two currencies (Political Capital + Money) to **Money only**. The
`ResourceBar` header currently renders two `Badge`s on the right (Political Capital = `grape`,
Money = `teal`). With PC gone, the right side would hold a single lonely badge. This proposal
settles how the now-solo Money readout looks so the bar stays balanced.

## Approved design — Variant A: emphasized solo pill

Keep the existing teal Money `Badge` (`size="lg"`) on the right, with a small **💰 coin mark**
prepended for a touch of weight. This is the **smallest** change from today's bar — the PC pill is
simply removed and the Money pill stays in place.

Unchanged behaviors (preserved exactly):

- The badge shows what is **remaining** this turn: `money − costNow.money` (not the raw balance),
  so staging any policy with a money cost visibly drops it.
- When the staged selection exceeds the budget (`moneyLeft < 0`), the badge turns **red** and the
  `⚠ over budget — remove a policy to End Turn` `role="alert"` line appears (mirrors
  `validateSelection` and the disabled End Turn).
- Rendered as the sticky bordered `Paper` header at the top of `AppShell.Main`.

(Variants B "budget figure" and C "pill + staged chip" were shown and not chosen.)

## Token changes

**None.** Uses existing tokens only — Money `teal` / `earth-7` solid badge, `red` for the
over-budget state, standard `Paper`/`Badge` primitives. No additions to `theme.ts` or
`DESIGN-SYSTEM.md` beyond removing the now-defunct **Political Capital → `grape`** semantic-color
row (PC no longer exists in the product).

## Implementation notes

- `ResourceBar` loses its `politicalCapital` prop and the PC `Badge`; `costNow` narrows to
  `{ money: number }`; `over` becomes `moneyLeft < 0`.
- Prepend the 💰 mark inside the Money `Badge` label.
- The badge color stays `teal`, flipping to `red` when `moneyLeft < 0`.
