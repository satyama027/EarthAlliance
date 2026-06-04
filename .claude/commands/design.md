---
description: Start the visual design phase for a UI/UX change — produce a browser mockup for approval before any code is written.
argument-hint: <what to design, e.g. "make the policy cards look more premium">
---

Run the **Design Phase** of the visual-design-gate workflow for this request:

$ARGUMENTS

Follow `.claude/skills/visual-design-gate/SKILL.md` exactly — it is the single source of truth.
In short:

1. Clarify the visual intent briefly if needed.
2. Read `docs/design/DESIGN-SYSTEM.md` and relevant `docs/design/current/*.html` for consistency.
3. Build a self-contained HTML/CSS mockup using the design-system tokens and show it in the
   browser (offer variants where a look-and-feel choice is open).
4. Iterate until I explicitly approve.
5. On approval, save the proposal under `docs/design/proposals/<date>-<topic>/` (`mockup.html` +
   `design.md` noting any token changes) and add an **Approved** row to `docs/design/README.md`.

**Hard gate: do not edit anything under `packages/web/src/**`.** Stop at approval and tell me to
run `/implement` when I'm ready to build it.
