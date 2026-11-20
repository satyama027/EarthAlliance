# ADR-0001: Platform & delivery architecture — one web build, many shells

**Status:** Accepted (2026-11-20)
**Date:** 2026-11-20
**Deciders:** Project owner

## Context

Earth Alliance is a turn-based, single-player climate-strategy game. The *game* stack is
already built and stable (see `ARCHITECTURE.md` §1–§6):

- `@earth-alliance/engine` — pure, deterministic TypeScript; no I/O, no DOM.
- `@earth-alliance/web` — React 18 + Mantine 7 + framer-motion, built with Vite 5; the world
  map is a pre-baked inline SVG (no WebGL, no D3 at runtime).

What is **not** decided is how the game reaches players. Requirements gathered from the owner:

| Requirement | Answer |
| --- | --- |
| First platform | **Browser** |
| Later platforms | **Desktop**, and **phones** (iOS + Android) |
| Desktop storefront | **Undecided** (Steam vs itch.io / direct download) |
| Online features | **None** — fully offline single-player (no accounts, cloud saves, leaderboards, multiplayer) |
| Web hosting | **Both** an owned site *and* an itch.io HTML5 page |

Measured facts that shape the decision (engine at `HEAD`, 2026-11-20):

| Measure | Value | Implication |
| --- | --- | --- |
| `advanceTurn` cost | **~0.27 ms/turn** | No Web Worker / native engine needed; runs fine on low-end phones. |
| `WorldState` JSON | **~10 KB** | A single save is tiny. |
| Full `turnLog` (state + diagnostics per turn) | **~200 KB for 14 turns → ~500 KB for a full 35-turn game** | Saving the history the drill-down needs outgrows comfortable `localStorage` use across several slots → IndexedDB. |
| Production JS bundle | **690 KB (227 KB gzip)**, one chunk | Fine for web/PWA; code-splitting overlays is an optional later win. |
| Runtime network calls | **None** | The build is a pure static site — every shell can load it from disk. |

Forces at play:

- **iOS forces WebKit.** Every browser and every wrapped app on iPhone renders with WebKit, so
  Safari compatibility is mandatory regardless of the desktop choice.
- **Undecided desktop store.** Steam (incl. the Linux-based Steam Deck) favours a bundled
  Chromium; itch.io/direct favours small downloads. We must not paint ourselves into either corner.
- **Small team, TypeScript-only.** Every extra toolchain (Rust, native SDKs) is a real cost.
- **Determinism already exists** — the engine's seeded, pure design makes saves, replays and
  any future verification cheap.

## Decision

**Ship one static web build (`packages/web/dist`) as the single product artifact, and wrap it in
thin, swappable platform shells.** Platform differences live behind a small **platform port** in
the web package; the engine stays untouched.

```
                    ┌────────────────────────────┐
                    │ @earth-alliance/engine     │  pure TS, deterministic (unchanged)
                    └─────────────▲──────────────┘
                                  │ imports
                    ┌─────────────┴──────────────┐
                    │ @earth-alliance/web        │  React UI + useGame controller
                    │   src/platform/ (PORT)     │  SaveStore · AppLifecycle · capabilities
                    └─────────────▲──────────────┘
                                  │ vite build → dist/ (static, relative paths)
     ┌───────────────┬────────────┼──────────────┬─────────────────────────┐
     ▼               ▼            ▼              ▼                         ▼
 Owned site      itch.io       PWA install   Mobile stores            Desktop stores
 (Cloudflare     HTML5 zip     (offline,     Capacitor shell          Electron or Tauri shell
  Pages)         (butler)      home screen)  iOS + Android            (chosen at desktop milestone)
     └──── browser adapter: IndexedDB ────┘   adapter: IndexedDB      adapter: filesystem saves
                                               (+ native fs later)     (+ Steamworks if Steam)
```

Concretely:

1. **Rendering stays DOM + SVG** (React/Mantine). No game engine (Phaser/Pixi/Unity/Godot) —
   a turn-based, UI-heavy strategy game is a web *app*, and DOM/SVG runs identically in every shell.
2. **No backend.** Hosting is static. Nothing runs server-side.
3. **Saves are local, versioned, and go through a `SaveStore` port.** The save envelope is
   `{ schemaVersion, appVersion, savedAt, seed, moves[], turnLog }` — `turnLog` restores the
   full history UI instantly; `moves[]` (per-turn selections + cancellations) keeps a
   deterministic replay record for debugging and any future verification. The browser
   adapter uses **IndexedDB**; desktop adapters write files; `schemaVersion` + migration
   functions protect old saves when the engine changes. Saves can also be **exported/imported
   as a file** on every platform (the escape hatch for browser storage eviction).
4. **Web hosting: Cloudflare Pages** for the owned site (free, global CDN, per-PR preview
   URLs, deploy from CI) **plus itch.io** HTML5 uploads via `butler`, from the same `dist/`.
   Vite builds with `base: './'` so the identical bundle works at a domain root, an itch.io
   iframe subpath, a Capacitor `webDir`, and a desktop `file://`/custom-protocol origin.
5. **Phones: PWA first, Capacitor for the stores.** A PWA (`vite-plugin-pwa`: manifest +
   precached offline assets) gives installable, offline play on phones for near-zero cost.
   When store presence is wanted, **Capacitor** wraps the same `dist/` for iOS and Android.
   A **compact (phone) layout** is required — the current desktop layout is a wide, no-scroll
   "command deck" — implemented as a second layout shell composing the same components and the
   same `useGame` controller, switched by viewport breakpoint.
6. **Desktop: defer the shell choice to the desktop milestone, with a pre-agreed rule:**
   - Target includes **Steam / Steam Deck** → **Electron** (bundled, identical Chromium on
     Windows/macOS/Linux; mature Steamworks bindings via `steamworks.js`).
   - **itch.io / direct download only** → **Tauri 2** (~10 MB installers using the OS webview).
   The platform port makes either a contained change (a new adapter + a `packages/desktop` shell).
7. **CI/CD on GitHub Actions:** on every PR run `pnpm -r test`, `pnpm -r typecheck`, `vite build`,
   and a Playwright smoke suite on **Chromium + WebKit** (desktop and phone viewports — WebKit
   because of iOS); on `main` deploy to Cloudflare Pages; on a version tag push to itch.io.
   Native shell builds join the pipeline at their milestones.

## Options Considered

### Shell strategy

#### Option A: One web build + per-platform shells (PWA → Capacitor for mobile, Electron/Tauri for desktop) — **chosen**

| Dimension | Assessment |
| --- | --- |
| Complexity | Low now (browser only); each shell is added only when its milestone arrives |
| Cost | Free hosting; store fees only when publishing |
| Reach | Browser, installable PWA, iOS/Android stores, Windows/macOS/Linux (incl. Steam Deck) |
| Team familiarity | High — stays TypeScript/React; Capacitor and Electron are JS-native |

**Pros:** zero rewrite; every platform runs the exact same tested code; best-in-class wrapper per
platform; the desktop store decision stays open. **Cons:** two wrapper technologies eventually
(Capacitor + Electron/Tauri); Electron installers are large (~100 MB) if chosen.

#### Option B: Tauri 2 for everything (desktop + iOS + Android from one shell)

| Dimension | Assessment |
| --- | --- |
| Complexity | Medium — one shell, but a Rust toolchain and native build chains |
| Cost | Free |
| Reach | Same targets as A |
| Team familiarity | Low — Rust for any native code |

**Pros:** one wrapper for all native targets; tiny binaries. **Cons:** relies on each OS's webview —
Linux uses WebKitGTK, the weakest renderer and the one Steam Deck would use; Tauri's mobile
support is younger than Capacitor's; Rust raises the bar for Steamworks/native features.
*Kept as the desktop choice if the store ends up itch.io/direct (rule in Decision §6).*

#### Option C: PWA only (no native shells, ever)

| Dimension | Assessment |
| --- | --- |
| Complexity | Lowest |
| Cost | Free |
| Reach | Browsers + home-screen install; **no** Steam, weak App Store story |
| Team familiarity | High |

**Pros:** nothing to maintain beyond the site. **Cons:** no store discovery or Steam presence;
iOS PWAs have storage-eviction and install-UX limits. *Adopted as phase 1 of Option A, not as the
end state.*

#### Option D: Port to a game engine (Unity / Godot) for native-first

**Pros:** strong native/console export. **Cons:** throws away the working React UI and the
TypeScript engine (or forces a port), and its ~380 tests; a game engine's strengths (real-time
rendering, physics) are things this turn-based, UI-centric game doesn't use. **Rejected.**

### Save storage (browser)

| Option | Verdict |
| --- | --- |
| `localStorage` | Rejected: synchronous, ~5 MB per origin, strings only — tight once several ~500 KB saves plus autosave exist. |
| **IndexedDB** (via a tiny wrapper such as `idb-keyval`) | **Chosen:** async, large quota, stores structured objects directly. |
| OPFS (Origin Private File System) | Not needed — more API surface with no benefit at this size. |

### Web host

| Option | Verdict |
| --- | --- |
| **Cloudflare Pages** | **Chosen:** free, fast CDN, per-PR preview deploys, custom domain. |
| GitHub Pages | Fine fallback (no extra account), but no PR previews and served from a subpath. |
| Netlify / Vercel | Equivalent capability; no advantage here. |

## Trade-off Analysis

- **Portability vs. per-platform polish.** Running one web build everywhere means native-feeling
  touches (haptics, OS menus, Steam overlay) come via plugins/adapters rather than for free. For a
  turn-based UI game that trade is strongly in our favour: nearly all of the product is the
  simulation and the UI, both of which are shared 100%.
- **Deferring the desktop shell vs. deciding now.** Choosing Electron today would lock in ~100 MB
  installers before we know we need Steam; choosing Tauri today risks Steam Deck rendering issues.
  Deferring costs nothing *provided* the platform port exists from the start — so the port is
  phase-0 work, not optional.
- **Saving `turnLog` vs. replaying `moves`.** Replay-only saves would be ~1 KB, but any engine
  balance change would silently alter a loaded game's history. Storing the snapshots keeps loads
  faithful across versions; storing the moves alongside keeps the deterministic record. ~500 KB
  per save is a non-issue in IndexedDB and on disk.
- **Phones vs. the current layout.** The no-scroll desktop layout is a deliberate design decision
  and stays; phones get their *own* layout shell rather than squeezing the desktop one. This
  costs a second layout, but no logic is duplicated (both compose `useGame` + the pure selectors).

## Consequences

**Easier**
- Shipping: a merge to `main` is live on the web; a tag ships to itch.io.
- Adding any platform later is "write an adapter + a shell", never "port the game".
- Offline play everywhere, with no servers to run, secure or pay for.
- Testing stays where it is: Vitest for logic, plus Playwright for the real browser engines.

**Harder**
- Two layouts (desktop + compact) must both be maintained and tested.
- WebKit (iOS/macOS Safari, Tauri on macOS/iOS) becomes a first-class test target.
- Browser saves can be evicted (Safari clears script-written storage for sites unused ~7 days,
  unless installed as a PWA) — mitigated with `navigator.storage.persist()`, PWA install, and
  save export/import.
- Save-format changes now need a migration (`schemaVersion`) — engine changes that alter
  `WorldState` shape must ship one.

**Revisit when**
- The desktop store is chosen → apply the Decision §6 rule and write ADR-0002.
- Any online feature (cloud saves, leaderboards, multiplayer) is requested → this ADR's
  "no backend" decision must be revisited (deterministic `moves[]` already makes replay-verified
  leaderboards feasible).
- Bundle size or phone start-up time becomes a complaint → code-split the overlays/drill-down.
- Crash reporting is wanted → pick an opt-in, offline-tolerant reporter (none today).

## Action Items

**Phase 0 — browser foundation (now)**
1. [ ] Set Vite `base: './'` and add a test/build check that `dist/index.html` uses relative asset URLs.
2. [ ] Add `packages/web/src/platform/` — `SaveStore` / `AppLifecycle` interfaces + the browser
       (IndexedDB) adapter, selected at boot by `import.meta.env.VITE_PLATFORM` (default `web`).
3. [ ] Versioned save envelope + migrations module; extend `useGame` with `save` / `load` /
       autosave-at-end-of-turn (TDD; engine untouched).
4. [ ] Save export/import as a `.json` file.
5. [ ] GitHub Actions `ci.yml`: install → `pnpm -r test` → `pnpm -r typecheck` → build.
6. [ ] Playwright smoke suite (start game → stage a policy → end turn → report shows) on
       Chromium + WebKit at desktop and phone viewports.
7. [ ] Cloudflare Pages deploy from `main` (+ PR previews); custom domain when ready.

**Phase 1 — phones in the browser**
8. [ ] Compact (phone) layout shell — **via the `visual-design-gate` process** (mockup → approval → build).
       Touch notes: single tap already opens `PolicyDetailOverlay`, whose action button covers
       double-click; set `touch-action` on draggable cards so drag doesn't fight scrolling.
9. [ ] PWA: `vite-plugin-pwa` manifest, icons, precache; request `navigator.storage.persist()`.

**Phase 2 — itch.io**
10. [ ] `release.yml`: on `v*` tag, zip `dist/` and push with `butler` (itch API key as a CI secret).

**Phase 3 — mobile stores**
11. [ ] `packages/mobile` Capacitor project (`webDir: ../web/dist`), a `capacitor` platform adapter,
        safe-area insets, and store builds in CI.

**Phase 4 — desktop**
12. [ ] Decide the store → apply the Decision §6 rule → ADR-0002.
13. [ ] `packages/desktop` shell + filesystem `SaveStore` adapter (+ Steamworks achievements/cloud
        via the adapter if Steam).
