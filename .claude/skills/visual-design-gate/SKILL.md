---
name: visual-design-gate
description: Use when the user requests any UI / UX / visual change to the Earth Alliance web client — making something look different, redesigning a screen/panel/HUD element, changing layout, spacing, color, typography, animation, or adding a new visual element. Enforces a design-first gate: render a browser mockup, get approval, THEN implement. Do NOT use for engine/logic/simulation changes, copy/typo fixes, or non-visual refactors.
---

# Visual Design Gate

The Earth Alliance UI follows a **design-first workflow**: every visual change is mocked up,
reviewed in a browser, and approved **before** any component code is written. This skill is the
single source of truth for that workflow. The `/design` and `/implement` commands run these same
phases.

## Hard gate

**Do NOT edit any file under `packages/web/src/**` until the user has approved a mockup.** The
Design Phase ends at the approval gate. Implementation is a separate, explicit step.

## When this applies

**Applies** — "make the policy cards look more premium", "redesign the ending screen", "the HUD
feels cramped", "add a turn-summary panel", "change the color scheme", "animate the resource bar".

**Does NOT apply** — engine/simulation/balance changes, fixing logic or tests, copy/typo edits,
dependency bumps, or pure refactors with no visual change. In those cases, stop and proceed
normally without this workflow.

If a request is borderline (e.g. "fix the spacing on one label"), ask the user once whether they
want a quick mockup or a direct fix.

## Design state lives in `docs/design/`

| Path | What it is | Lifecycle |
|------|-----------|-----------|
| `docs/design/README.md` | Index + status tracker (the design-state dashboard) | Updated every phase |
| `docs/design/DESIGN-SYSTEM.md` | Living visual language: tokens + component rules | Slowly evolves |
| `docs/design/current/` | Current-state gallery — always reflects the **live** UI | Mutable, kept honest by `/implement` |
| `docs/design/proposals/YYYY-MM-DD-<topic>/` | Approved mockup + rationale | Immutable history |

`docs/design/DESIGN-SYSTEM.md` is the human-readable design language; its code embodiment is
`packages/web/src/theme.ts` (Mantine theme). Keep the two in sync.

Mockups are **self-contained HTML** (inline `<style>`, no build step, no external assets) so they
open standalone via `file://` and survive in git as durable reference. Use the token values from
`DESIGN-SYSTEM.md` so a mockup looks like the real app.

---

## Design Phase

1. **Clarify briefly.** If the visual intent is ambiguous, ask one or two questions max. Don't
   over-interrogate.
2. **Load context for consistency.** Read `docs/design/DESIGN-SYSTEM.md` and any relevant existing
   mockups in `docs/design/current/`. New designs must reuse existing tokens and patterns unless
   the change is explicitly about evolving the design system.
3. **Build a self-contained HTML/CSS mockup** of the proposed UI using the design-system tokens.
   Show it to the user in a browser. Prefer the `superpowers:brainstorming` visual companion for
   live iteration; otherwise write the HTML to a scratch file and have the user open it.
   - Where a look-and-feel choice is genuinely open, offer 2–3 variants side by side.
4. **Iterate** until the user approves. Treat "approved" as an explicit yes, not a guess.
5. **On approval, persist the proposal:**
   - Create `docs/design/proposals/<today's date>-<kebab-topic>/`.
   - Save the approved mockup as `mockup.html` (plus any approved variants).
   - Write `design.md`: the intent, the rationale, screenshots/notes, and **any tokens added or
     changed** (so `/implement` knows what to put in `theme.ts` / `DESIGN-SYSTEM.md`).
   - Add a row to `docs/design/README.md` with status **Approved** and a link to the proposal.
6. **Stop. Write no component code.** Tell the user the design is approved and saved, and that
   running `/implement` (or asking to build it) will start implementation.

---

## Implement Phase

Only after a proposal is approved.

1. **Read** the approved proposal's `mockup.html` + `design.md`.
2. **Reconcile the design system first.** Add or adjust tokens in `packages/web/src/theme.ts`,
   and record the same changes in `docs/design/DESIGN-SYSTEM.md`. The doc and the theme must agree.
3. **Implement** the React + Mantine components (and R3F scene code where relevant) to match the
   mockup. Follow existing patterns in `packages/web/src/components/` and `packages/web/src/scene/`.
   Add or extend Vitest + React Testing Library tests where there is behavior to cover.
4. **Update the current-state gallery (required).** Update `docs/design/current/index.html` (the
   composed full-UI mockup) so it reflects the now-live UI — adjust the affected section, or add a
   new section / split out a `current/<component>.html` file if the gallery grows large. Skipping
   this step makes the gallery lie — do not skip it.
5. **Update `docs/design/README.md`** — set the proposal's status to **Implemented**.
6. **Verify.** Run `pnpm --filter @earth-alliance/web dev`, compare the live UI against the
   mockup, and run `pnpm -r typecheck` and `pnpm -r test`. Report results honestly.

---

## Checklist (create a TodoWrite item per applicable step)

Design Phase: clarify → load design context → build mockup → iterate to approval → persist proposal
+ update README → STOP.

Implement Phase: read proposal → reconcile theme.ts + DESIGN-SYSTEM.md → implement components +
tests → update current/ gallery → update README status → verify (dev server + typecheck + test).
