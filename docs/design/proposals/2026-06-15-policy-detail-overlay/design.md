# Policy detail overlay + click / double-click / drag semantics

**Status:** Approved — 2026-06-15
**Mockup:** [`mockup.html`](./mockup.html)

## Intent

Policy cards only show a 2-line clamped description, so players can't read the full effect of a
policy. Worse, a **single click activates the policy** (the tap path in `PolicyBoard` funnels to
`performPrimary`), so a player who clicks "just to read more" accidentally enacts it.

Separate **inspecting** from **acting**:

- **Single click** (or keyboard `Enter`/`Space`) → open a **detail overlay** showing the card
  larger with its full breakdown and an explicit action button.
- **Double click** or **drag to the other lane** → enact / stop the policy. (Drag already worked
  this way; double-click is the new pointer shortcut.)

## Decision

A new **`PolicyDetailOverlay`** modeled on the existing `DataOverlay` (Mantine `<Overlay>` +
framer-motion fade/rise, close via ✕ / `Escape` / backdrop click). It shows, for the tapped card:

- Large category art-band header + name + funding pill.
- **Full untruncated description.**
- **"What it does"** — a per-effect breakdown: friendly target label, signed magnitude (with units
  — `Gt/yr` for emission sources, `$` for GDP, plain for indices), scope (`each turn` for `ongoing`
  vs `one-time` for `immediate`), `▲`/`▼` direction coloring (good = `earth-3`, bad = `red-4`), and a
  "scales with grid storage" tag for `storageGated` effects.
- **Cost & funding** — the GDP-scaled region charge + a one-line plain-language meaning of
  one-time / recurring / buildout.
- A **recurring callout**, **buildout install-% bar**, or **prerequisite** line as applicable.
- **Action button** in the footer: `Enact in <region>` / `Stop funding` / `Stop buildout` /
  `Remove staged` — derived from lane + state; **disabled with a reason** for locked / unaffordable.
  Clicking it runs the same action as double-click/drag, then closes.

**Card change:** recurring cards gain a **"♾︎ Runs until cancelled"** line (earth-3 when active,
dimmed when available). Recurring policies have **no finite lifespan** in the engine (their effects
carry no `turns`; `policies.ts`), so the wording is honest — **no engine change, no fabricated
number**. Locked / unaffordable cards become tappable to open a **read-only** overlay.

**Interaction:** single-vs-double click is resolved with a ~220ms timer in the `PolicyBoard` pointer
handler — a tap schedules "open overlay"; a second tap within the window cancels it and runs the
action. Drag (≥5px into the opposite lane) is unchanged.

## Tokens

**None added.** Reuses existing tokens: `earth-3/5/6/9`, `teal`, `red-4`, `CATEGORY_COLOR` art
bands, surface/border/dimmed, radius. The overlay reuses the `DataOverlay`/`EndingScreen` scaffold.

## Out of scope

- Engine changes. Recurring policies stay perpetual. "Turns active / total spent so far" is **not**
  built — `Enactment` doesn't record an enactment turn, so it would require an engine change.

## Notes for `/implement`

- New helper `packages/web/src/game/policyDetails.ts`: `effectLines(policy)`, `fundingBlurb(funding)`,
  `durationLine(policy)`. Pure + unit-tested.
- New `PolicyDetailOverlay.tsx`; model on `DataOverlay.tsx`.
- `PolicyBoard.tsx`: `detailVm` state, single/double tap discrimination, render overlay, route the
  overlay action + double-click/drag through the existing `performPrimary`.
- `PolicyCard.tsx`: recurring duration line; `Enter`/`Space` opens the overlay (not enact).
- Update existing `policyBoard.test.tsx` tap-enacts tests to the double-click semantics.
- Update `docs/design/current/index.html`; set this proposal to **Implemented** in the README.
