# Policy selection — sticky resources + reorder (no-scroll setup, live remaining)

**Date:** 2026-06-12 · **Status:** Approved · **Mockup:** [`mockup.html`](./mockup.html)

## Problems this fixes

1. **The top resource readout never changed when staging a policy.** `ResourceBar` is wired only to
   `game.state.resources` (the pre-spend values), so staging a policy left Political Capital / Money
   showing the same number. The player could not see how much was *actually left* to spend.
2. **You had to scroll to set policies, and that scrolled the resources off-screen.** In `App.tsx`
   the map occupies `70vh` in the left column and the `PolicyBoard` lives in a full-width row *below*
   the 2-column grid — guaranteed below the fold. Reaching it scrolls away the `ResourceBar` at the
   top of the right column, so resources and the place you spend them are never visible together.

## Decision

**Layout — B · Sticky Header + Reorder** (chosen over A·Action-Dock and C·Side-Command-Column):

- The resource readout becomes a **sticky top header** (`position: sticky; top: 0`) that is always
  visible while the player works the policy board.
- The **map is shortened** (~230px / was `70vh`) and the **`PolicyBoard` moves up** to sit directly
  under the map+info row, so staging policies and pressing **End Turn** happen above the fold without
  scrolling.
- The **Turn Log moves to the bottom** as full-width reference/history (it is the tallest, least
  action-oriented panel — it belongs last).
- Keeps the existing full-width horizontal Active/Available lanes unchanged (smallest structural
  change; no card reflow needed).

**Readout style — Remaining only:** each pill shows the **live remaining** value
(`resources − costNow`), e.g. `Political Capital 9`, `Money $1,250`. No "was → now" or running total.
When a staged selection exceeds the budget the pill turns **red** (`red-6` border / red text), an
inline **⚠ over budget** flag appears, and **End Turn is disabled** — a visual mirror of the engine's
existing `validateSelection`. A brief scale **bump** animation fires on change so the update is noticed.

**Key interaction (explicitly requested):** the top readout must update the instant a card moves
**Available → Active** (i.e. is staged). Staging is exactly what feeds `costNow`, so the sticky header
recomputes `resources − costNow` on every stage/unstage/cancel.

## Implementation notes for `/implement`

- **`ResourceBar`** gains the spend inputs. New props: `costNow: { politicalCapital: number; money: number }`
  (already produced by `useGame`). Render `Math.round(politicalCapital - costNow.politicalCapital)` and
  `Math.round(money - costNow.money)`; when either is `< 0`, switch the `Badge`/pill to `red` and expose
  an over-budget hint. Wire it in `App.tsx` (`costNow={game.costNow}`). Cancels reduce `costNow`, so a
  stopped recurring policy correctly relaxes the remaining figure — no extra wiring.
- **Layout (`App.tsx`)**: wrap `ResourceBar` in a sticky container at the top of `AppShell.Main`
  (sticky relative to the scroll root; account for `AppShell` padding). Reduce the map `Box` height
  (e.g. `clamp(220px, 34vh, 320px)` instead of `70vh`). Reorder the right info column to drop `TurnLog`,
  move `PolicyBoard` up into a full-width `Grid.Col span={12}` immediately under the map/info row, and
  place `TurnLog` in a final full-width `Grid.Col span={12}` at the bottom.
- **No engine changes.** This is presentation + wiring only. `costNow`, `upkeepNext`,
  `validateSelection`, and the staging flow are unchanged.
- **Tests (TDD):** `ResourceBar` renders `resources − costNow` and goes red when negative; staging a
  policy in the board lowers the displayed remaining (integration via `useGame`); End Turn disabled when
  over budget. Preserve existing accessibility on cards.

## Tokens added / changed

**None.** Reuses existing tokens: `grape` (PC), `teal` (Money), `red-6` (over-budget), `earth` accents,
category and region colors. `DESIGN-SYSTEM.md` updates are **rule/appearance** edits only (ResourceBar
shows remaining + can go red; layout: sticky resource header, shortened map, policy board raised, Turn
Log at bottom) — no new color/spacing tokens, so `theme.ts` needs no token additions.
