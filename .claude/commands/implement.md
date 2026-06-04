---
description: Implement an approved visual design — build the components, sync the theme, and update the current-state gallery.
argument-hint: [topic — defaults to the most recent approved proposal]
---

Run the **Implement Phase** of the visual-design-gate workflow.

Target proposal: $ARGUMENTS
(If empty, use the most recently **Approved** proposal in `docs/design/README.md`.)

Follow `.claude/skills/visual-design-gate/SKILL.md` exactly. In short:

1. Read the approved proposal's `mockup.html` + `design.md`.
2. Reconcile the design system: apply any token changes to `packages/web/src/theme.ts` AND
   `docs/design/DESIGN-SYSTEM.md` (keep them in sync).
3. Implement the React + Mantine (and R3F where relevant) components to match the mockup,
   following existing patterns in `packages/web/src/components/` and `scene/`, with tests.
4. **Required:** update the current-state gallery in `docs/design/current/` so it reflects the
   now-live UI.
5. Set the proposal's status to **Implemented** in `docs/design/README.md`.
6. Verify: `pnpm --filter @earth-alliance/web dev` (compare to mockup), `pnpm -r typecheck`,
   `pnpm -r test`. Report results honestly.
