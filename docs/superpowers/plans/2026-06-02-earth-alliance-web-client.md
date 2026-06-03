# Earth Alliance — Web Client Implementation Plan (Plan 2 of 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the React + Three.js (R3F) web client (`packages/web`) that turns the pure `@earth-alliance/engine` into the playable vertical slice: a 3D Earth globe, a Mantine HUD with dual resources + climate trend, a policy card tray, a region panel, turn advancement with animation + sound, and an ending screen.

**Architecture:** The engine is the single source of truth. A `useGame` React hook wraps the engine (holds `WorldState`, selection, history) and exposes a controller. Presentational components are **pure and props-driven** (so they're unit-testable with React Testing Library), while the R3F 3D scene and audio are thin glue over pure helpers. The 3D scene knows nothing about game rules — it just renders engine state. App composes hook → components.

**Tech Stack:** React 18.3, TypeScript (strict), Vite 5, Mantine 7 (HUD), @react-three/fiber 8 + three 0.169 + @react-three/drei 9 (3D globe), framer-motion 11 (animation), Web Audio API (assetless placeholder SFX), Vitest + React Testing Library + jsdom (tests).

> **Spec:** `docs/superpowers/specs/2026-06-02-earth-alliance-climate-game-design.md` — §3.2 (web structure), §9 (presentation), §10.5/§10.6 (web tests/coverage), §12 (slice Definition of Done), §13 (engine status/backlog).
> **Engine API (real, from `packages/engine/src/index.ts`):** `createInitialState()`, `getAvailablePolicies(state)`, `validateSelection(state, ids) → {ok, reason?}`, `advanceTurn(state, ids) → {state, events}` (THROWS if `state.status === 'ended'`), `evaluateEnding(state)`, `ENDINGS` (record), `POLICY_CATALOG`, `getPolicy(id)`, and types `WorldState`, `Region`, `Policy`, `PolicyCategory`, `GameEvent`, `Ending`.

> **Conventions:** Commands run from repo root `D:\VSCode Projects\EarthAlliance`. Web package filtered with `pnpm --filter @earth-alliance/web`. Use the **Bash tool**. Git identity if needed: `git -c user.name="Earth Alliance" -c user.email="guiltyspark027@gmail.com" commit ...`; end commit bodies with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. Do NOT push/PR during execution (the controller handles that at the end).

> **IMPORTANT — third-party UI APIs:** Unlike the engine (pure TS), this plan uses Mantine/R3F/drei/framer-motion whose exact prop names can shift slightly between minor versions. The code blocks are **correct reference implementations for the pinned versions above** — install those exact versions. If the installed library API differs, preserve the specified *behavior* and adapt the call (and report the adaptation), rather than forcing the literal code.

> **Testing boundary (spec §10.5):** Game logic (`game/`, `components/`) is unit-tested with RTL + jsdom. The 3D scene (`scene/`) and audio glue render WebGL/Web-Audio that jsdom can't run — those are **mocked** in integration tests and validated manually in the browser. Pure helpers extracted from scene/audio (`geo.ts`, `metricColor.ts`, `sound.ts`) ARE unit-tested.

---

## File Structure

```
packages/engine/
  package.json                 # MODIFIED Task 1: exports → dist (built JS) so Vite can consume it
  src/policies.ts              # MODIFIED Task 1: reject region-scoped policies (backlog guard)

packages/web/
├─ package.json
├─ index.html
├─ vite.config.ts
├─ vitest.config.ts
├─ tsconfig.json
├─ test/setup.ts               # RTL jest-dom matchers
├─ public/assets/README.md     # asset pipeline doc (placeholder art/sound slot)
└─ src/
   ├─ main.tsx                 # React root + MantineProvider
   ├─ App.tsx                  # composes hook → scene + HUD + overlays
   ├─ theme.ts                 # Mantine theme + category colors
   ├─ game/
   │  └─ useGame.ts            # the React controller wrapping the engine
   ├─ scene/
   │  ├─ geo.ts                # latLonToVector3 (pure)
   │  ├─ metricColor.ts        # metric/temperature → color (pure)
   │  ├─ Globe.tsx             # textured/atmospheric sphere
   │  ├─ RegionMarker.tsx      # clickable lat/lon marker, colored by metric
   │  └─ EarthScene.tsx        # <Canvas> + lights + globe + markers + controls
   ├─ components/
   │  ├─ ResourceBar.tsx       # political capital + money + year/turn
   │  ├─ Dashboard.tsx         # global climate metrics + temperature sparkline
   │  ├─ Sparkline.tsx         # tiny dependency-free SVG trend line
   │  ├─ PolicyCard.tsx        # one policy (placeholder art, cost, affordability)
   │  ├─ PolicyTray.tsx        # list of available policies + End Turn
   │  ├─ RegionPanel.tsx       # selected-region detail
   │  └─ EndingScreen.tsx      # end-of-game overlay
   └─ audio/
      ├─ sound.ts              # eventToSound (pure): GameEvent → tone spec
      └─ useSfx.ts             # Web Audio glue (thin)
```

---

## Task 1: Engine — make consumable + guard region-scoped policies

**Files:**
- Modify: `packages/engine/package.json`
- Modify: `packages/engine/src/policies.ts`
- Test: `packages/engine/test/policies.test.ts`

- [ ] **Step 1: Point the engine package at its built output**

Edit `packages/engine/package.json` — change `main`/`types`/`exports` from `src` to `dist`, and ensure `build` runs before consumption:
```json
{
  "name": "@earth-alliance/engine",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": { ".": { "types": "./dist/index.d.ts", "default": "./dist/index.js" } },
  "files": ["dist"],
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "coverage": "vitest run --coverage",
    "typecheck": "tsc --noEmit",
    "build": "tsc -p tsconfig.build.json"
  },
  "devDependencies": {
    "vitest": "^2.1.1",
    "@vitest/coverage-v8": "^2.1.1",
    "fast-check": "^3.22.0",
    "typescript": "^5.5.4"
  }
}
```
(Engine's own tests import from `../src/...` directly, so pointing the package entry at `dist` does not affect them.)

- [ ] **Step 2: Write the failing test for the region-scope guard**

All current catalog policies are `scope: 'global'`, so the guard is verified via a small exported predicate `isRegionScoped`. Add the import at the top of `packages/engine/test/policies.test.ts` (extend the existing import from `../src/policies.js` to include `isRegionScoped`), then add this test inside the `describe('validateSelection', ...)` block:
```ts
it('flags region-scoped policies as unsupported for now', () => {
  const globalPolicy = getPolicy('renewable-subsidy')!;
  expect(isRegionScoped(globalPolicy)).toBe(false);
  const regionScoped = { ...globalPolicy, scope: 'region' as const };
  expect(isRegionScoped(regionScoped)).toBe(true);
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --filter @earth-alliance/engine test`
Expected: FAIL — `isRegionScoped` is not exported.

- [ ] **Step 4: Implement the guard**

In `packages/engine/src/policies.ts`, add the exported predicate and use it inside `validateSelection` (place the check inside the per-policy loop, after the unknown/enacted/prereq checks):
```ts
export function isRegionScoped(policy: Policy): boolean {
  return policy.scope === 'region';
}
```
Inside `validateSelection`, within the `for (const id of policyIds)` loop after resolving `policy`:
```ts
    if (isRegionScoped(policy)) {
      return { ok: false, reason: `${policy.name}: region-scoped policies are not yet supported` };
    }
```
Export it from the engine in `packages/engine/src/index.ts` by adding `isRegionScoped` to the existing policies export line:
```ts
export { POLICY_CATALOG, getAvailablePolicies, validateSelection, getPolicy, isRegionScoped } from './policies.js';
```

- [ ] **Step 5: Run tests + build**

Run: `pnpm --filter @earth-alliance/engine test`
Expected: PASS (existing 84 + this new test).
Run: `pnpm --filter @earth-alliance/engine build`
Expected: produces `packages/engine/dist/index.js` and `dist/index.d.ts` with no errors.
Run: `pnpm --filter @earth-alliance/engine typecheck`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add packages/engine
git commit -m "feat(engine): build to dist for consumption; guard region-scoped policies

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Web package scaffold

**Files:**
- Create: `packages/web/package.json`, `vite.config.ts`, `vitest.config.ts`, `tsconfig.json`, `index.html`, `test/setup.ts`, `src/main.tsx`, `src/App.tsx`, `src/theme.ts`
- Test: `packages/web/test/app.smoke.test.tsx`

- [ ] **Step 1: Create the web package manifest**

`packages/web/package.json`:
```json
{
  "name": "@earth-alliance/web",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "coverage": "vitest run --coverage",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@earth-alliance/engine": "workspace:*",
    "@mantine/core": "^7.13.0",
    "@mantine/hooks": "^7.13.0",
    "@react-three/drei": "^9.114.0",
    "@react-three/fiber": "^8.17.0",
    "framer-motion": "^11.5.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "three": "^0.169.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.5.0",
    "@testing-library/react": "^16.0.1",
    "@testing-library/user-event": "^14.5.2",
    "@types/react": "^18.3.5",
    "@types/react-dom": "^18.3.0",
    "@types/three": "^0.169.0",
    "@vitejs/plugin-react": "^4.3.1",
    "@vitest/coverage-v8": "^2.1.1",
    "jsdom": "^25.0.0",
    "typescript": "^5.5.4",
    "vite": "^5.4.0",
    "vitest": "^2.1.1"
  }
}
```

- [ ] **Step 2: Create configs**

`packages/web/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vitest/globals", "@testing-library/jest-dom"],
    "noEmit": true,
    "moduleResolution": "Bundler"
  },
  "include": ["src", "test", "vite.config.ts", "vitest.config.ts"]
}
```

`packages/web/vite.config.ts`:
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
});
```

`packages/web/vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/game/**', 'src/components/**', 'src/scene/geo.ts', 'src/scene/metricColor.ts', 'src/audio/sound.ts'],
      exclude: ['src/main.tsx', 'src/scene/Globe.tsx', 'src/scene/RegionMarker.tsx', 'src/scene/EarthScene.tsx', 'src/audio/useSfx.ts'],
      thresholds: { lines: 70, functions: 70, branches: 60, statements: 70 },
    },
  },
});
```

`packages/web/test/setup.ts` (Mantine needs `matchMedia`/`ResizeObserver`, which jsdom lacks — see mantine.dev/guides/vitest):
```ts
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false, media: query, onchange: null,
    addListener: vi.fn(), removeListener: vi.fn(),
    addEventListener: vi.fn(), removeEventListener: vi.fn(), dispatchEvent: vi.fn(),
  }),
});

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverStub;
```

`packages/web/index.html`:
```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Earth Alliance</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3: Create theme, root, and a placeholder App**

`packages/web/src/theme.ts`:
```ts
import { createTheme, type MantineColorsTuple } from '@mantine/core';
import type { PolicyCategory } from '@earth-alliance/engine';

const earth: MantineColorsTuple = [
  '#e6fcf5', '#c3fae8', '#96f2d7', '#63e6be', '#38d9a9',
  '#20c997', '#12b886', '#0ca678', '#099268', '#087f5b',
];

export const theme = createTheme({
  primaryColor: 'earth',
  colors: { earth },
  fontFamily: 'system-ui, sans-serif',
});

/** Placeholder card-art colors per policy category (real art drops in later). */
export const CATEGORY_COLOR: Record<PolicyCategory, string> = {
  energy: '#f59f00',
  industry: '#868e96',
  land: '#2f9e44',
  social: '#1971c2',
  frontier: '#9c36b5',
};
```

`packages/web/src/App.tsx` (placeholder for now; expanded in Task 11):
```tsx
import { Title, Text, Stack } from '@mantine/core';

export default function App() {
  return (
    <Stack p="md">
      <Title order={1}>Earth Alliance</Title>
      <Text c="dimmed">Loading the world…</Text>
    </Stack>
  );
}
```

`packages/web/src/main.tsx`:
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import { theme } from './theme.js';
import App from './App.js';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="dark">
      <App />
    </MantineProvider>
  </StrictMode>,
);
```

- [ ] **Step 4: Write the smoke test**

`packages/web/test/app.smoke.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import App from '../src/App.js';

function renderApp() {
  return render(
    <MantineProvider>
      <App />
    </MantineProvider>,
  );
}

describe('App', () => {
  it('renders the game title', () => {
    renderApp();
    expect(screen.getByText('Earth Alliance')).toBeInTheDocument();
  });
});
```

- [ ] **Step 5: Install, build engine, run the smoke test**

Run: `pnpm install`
Then ensure the engine is built (the web depends on its `dist`): `pnpm --filter @earth-alliance/engine build`
Then: `pnpm --filter @earth-alliance/web test`
Expected: PASS (1 test). If the engine import fails to resolve, confirm Task 1 Step 1 (exports → dist) and that `dist/` exists.

- [ ] **Step 6: Verify the dev server boots (manual)**

Run (in the background, then stop): `pnpm --filter @earth-alliance/web dev`
Expected: Vite prints `Local: http://localhost:5173/`. Open it; you should see the "Earth Alliance / Loading the world…" placeholder. Stop the server.

- [ ] **Step 7: Commit**

```bash
git add packages/web pnpm-lock.yaml
git commit -m "feat(web): scaffold Vite + React + Mantine client consuming the engine

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Pure helpers (geo, color, sound)

**Files:**
- Create: `packages/web/src/scene/geo.ts`, `src/scene/metricColor.ts`, `src/audio/sound.ts`
- Test: `packages/web/test/helpers.test.ts`

- [ ] **Step 1: Write the failing tests**

`packages/web/test/helpers.test.ts`:
```ts
import { latLonToVector3 } from '../src/scene/geo.js';
import { metricColor, temperatureColor } from '../src/scene/metricColor.js';
import { eventToSound } from '../src/audio/sound.js';

describe('latLonToVector3', () => {
  it('maps the equator/prime-meridian to the +Z face at radius', () => {
    const [x, y, z] = latLonToVector3(0, 0, 1);
    expect(x).toBeCloseTo(0, 5);
    expect(y).toBeCloseTo(0, 5);
    expect(z).toBeCloseTo(1, 5);
  });
  it('keeps points on the sphere of the given radius', () => {
    const [x, y, z] = latLonToVector3(35, 110, 2);
    expect(Math.sqrt(x * x + y * y + z * z)).toBeCloseTo(2, 5);
  });
  it('puts the north pole at +Y', () => {
    const [, y] = latLonToVector3(90, 0, 1);
    expect(y).toBeCloseTo(1, 5);
  });
});

describe('metricColor', () => {
  it('is red at low values and green at high values', () => {
    expect(metricColor(5)).toMatch(/^#/);
    expect(metricColor(0)).not.toBe(metricColor(100));
  });
  it('clamps out-of-range inputs', () => {
    expect(metricColor(-50)).toBe(metricColor(0));
    expect(metricColor(150)).toBe(metricColor(100));
  });
});

describe('temperatureColor', () => {
  it('gets hotter (redder) as anomaly rises', () => {
    expect(temperatureColor(1.3)).not.toBe(temperatureColor(3.5));
  });
});

describe('eventToSound', () => {
  it('maps turn-advanced to a defined tone', () => {
    const tone = eventToSound({ turn: 1, type: 'turn-advanced', message: '' });
    expect(tone).not.toBeNull();
    expect(tone!.frequency).toBeGreaterThan(0);
    expect(tone!.durationMs).toBeGreaterThan(0);
  });
  it('returns null for unknown event types', () => {
    expect(eventToSound({ turn: 1, type: 'nope', message: '' })).toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @earth-alliance/web test`
Expected: FAIL — modules not found.

- [ ] **Step 3: Implement the helpers**

`packages/web/src/scene/geo.ts`:
```ts
/** Convert latitude/longitude (degrees) to a point on a sphere of `radius`.
 *  Lat 0/Lon 0 → +Z; north pole → +Y. Returns [x, y, z]. */
export function latLonToVector3(lat: number, lon: number, radius: number): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180); // polar angle from +Y
  const theta = lon * (Math.PI / 180);      // azimuth, 0 → +Z
  const x = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.cos(theta);
  return [x, y, z];
}
```

`packages/web/src/scene/metricColor.ts`:
```ts
function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

function rgbToHex(r: number, g: number, b: number): string {
  const h = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

/** 0–100 index → red (bad/low) through yellow to green (good/high). */
export function metricColor(value: number): string {
  const t = clamp(value, 0, 100) / 100;
  const r = t < 0.5 ? 230 : Math.round(230 - (t - 0.5) * 2 * 180);
  const g = t < 0.5 ? Math.round(60 + t * 2 * 150) : 210;
  return rgbToHex(r, g, 60);
}

/** Temperature anomaly (°C) → cool blue (≈1.0) through red (≈4.0+). */
export function temperatureColor(anomaly: number): string {
  const t = clamp((anomaly - 1) / 3, 0, 1); // 1°C..4°C
  const r = Math.round(60 + t * 195);
  const b = Math.round(220 - t * 180);
  return rgbToHex(r, 80, b);
}
```

`packages/web/src/audio/sound.ts`:
```ts
import type { GameEvent } from '@earth-alliance/engine';

export interface Tone {
  frequency: number; // Hz
  durationMs: number;
  type: OscillatorType;
}

/** Map a game event to a short tone, or null if it has no sound. */
export function eventToSound(event: GameEvent): Tone | null {
  switch (event.type) {
    case 'turn-advanced':
      return { frequency: 440, durationMs: 140, type: 'sine' };
    case 'disaster':
      return { frequency: 120, durationMs: 300, type: 'sawtooth' };
    case 'milestone':
      return { frequency: 660, durationMs: 200, type: 'triangle' };
    default:
      return null;
  }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @earth-alliance/web test`
Expected: PASS (all helper tests).

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/scene/geo.ts packages/web/src/scene/metricColor.ts packages/web/src/audio/sound.ts packages/web/test/helpers.test.ts
git commit -m "feat(web): add pure geo/color/sound helpers

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: `useGame` controller hook

**Files:**
- Create: `packages/web/src/game/useGame.ts`
- Test: `packages/web/test/useGame.test.ts`

- [ ] **Step 1: Write the failing test**

`packages/web/test/useGame.test.ts`:
```ts
import { act, renderHook } from '@testing-library/react';
import { useGame } from '../src/game/useGame.js';

describe('useGame', () => {
  it('starts a fresh game at 2025 with policies available', () => {
    const { result } = renderHook(() => useGame());
    expect(result.current.state.year).toBe(2025);
    expect(result.current.state.turn).toBe(0);
    expect(result.current.available.length).toBeGreaterThan(0);
    expect(result.current.selected).toEqual([]);
  });

  it('toggles policy selection and tracks cost', () => {
    const { result } = renderHook(() => useGame());
    const id = result.current.available[0]!.id;
    act(() => result.current.togglePolicy(id));
    expect(result.current.isSelected(id)).toBe(true);
    expect(result.current.selectionCost.politicalCapital).toBeGreaterThanOrEqual(0);
    act(() => result.current.togglePolicy(id));
    expect(result.current.isSelected(id)).toBe(false);
  });

  it('advances the year by 5 and clears selection on endTurn', () => {
    const { result } = renderHook(() => useGame());
    act(() => result.current.endTurn());
    expect(result.current.state.year).toBe(2030);
    expect(result.current.selected).toEqual([]);
    expect(result.current.history.length).toBeGreaterThan(0);
  });

  it('blocks ending the turn when the selection is unaffordable', () => {
    const { result } = renderHook(() => useGame());
    // Select enough policies to exceed the starting budget.
    act(() => {
      for (const p of result.current.available) result.current.togglePolicy(p.id);
    });
    if (!result.current.canEndTurn) {
      expect(result.current.validationReason).toBeTruthy();
    } else {
      expect(result.current.canEndTurn).toBe(true);
    }
  });

  it('reaches an ending and then refuses to advance further', () => {
    const { result } = renderHook(() => useGame());
    // One act() per turn so the hook re-renders and endTurn rebinds to the latest state.
    for (let i = 0; i < 35 && result.current.state.status === 'playing'; i++) {
      act(() => result.current.endTurn());
    }
    expect(result.current.state.status).toBe('ended');
    expect(result.current.ending).not.toBeNull();
    expect(result.current.canEndTurn).toBe(false);
    // endTurn must be a no-op once ended (never throws from the engine guard).
    act(() => result.current.endTurn());
    expect(result.current.state.status).toBe('ended');
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @earth-alliance/web test`
Expected: FAIL — `useGame` not found.

- [ ] **Step 3: Implement the hook**

`packages/web/src/game/useGame.ts`:
```ts
import { useCallback, useMemo, useState } from 'react';
import {
  createInitialState, getAvailablePolicies, validateSelection, advanceTurn,
  getPolicy, ENDINGS,
  type WorldState, type Policy, type GameEvent, type Ending,
} from '@earth-alliance/engine';

export interface ClimatePoint {
  year: number;
  temperature: number;
  co2: number;
}

export interface GameController {
  state: WorldState;
  available: Policy[];
  selected: string[];
  isSelected(id: string): boolean;
  togglePolicy(id: string): void;
  selectionCost: { politicalCapital: number; money: number };
  validationReason: string | null;
  canEndTurn: boolean;
  endTurn(): void;
  lastEvents: GameEvent[];
  history: ClimatePoint[];
  ending: Ending | null;
  reset(): void;
}

function snapshot(state: WorldState): ClimatePoint {
  return { year: state.year, temperature: state.climate.temperatureAnomaly, co2: state.climate.co2Concentration };
}

export function useGame(): GameController {
  const [state, setState] = useState<WorldState>(() => createInitialState());
  const [selected, setSelected] = useState<string[]>([]);
  const [lastEvents, setLastEvents] = useState<GameEvent[]>([]);
  const [history, setHistory] = useState<ClimatePoint[]>(() => [snapshot(createInitialState())]);

  const available = useMemo(() => getAvailablePolicies(state), [state]);

  const isSelected = useCallback((id: string) => selected.includes(id), [selected]);

  const togglePolicy = useCallback((id: string) => {
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  }, []);

  const selectionCost = useMemo(() => {
    return selected.reduce(
      (acc, id) => {
        const p = getPolicy(id);
        if (p) { acc.politicalCapital += p.cost.politicalCapital; acc.money += p.cost.money; }
        return acc;
      },
      { politicalCapital: 0, money: 0 },
    );
  }, [selected]);

  const validation = useMemo(() => validateSelection(state, selected), [state, selected]);
  const canEndTurn = state.status === 'playing' && validation.ok;
  const validationReason = validation.ok ? null : (validation.reason ?? 'Invalid selection');

  const endTurn = useCallback(() => {
    if (state.status === 'ended') return;              // mirror engine guard; never throw
    const check = validateSelection(state, selected);
    if (!check.ok) return;
    const { state: next, events } = advanceTurn(state, selected);
    setState(next);
    setLastEvents(events);
    setHistory((h) => [...h, snapshot(next)]);
    setSelected([]);
  }, [state, selected]);

  const ending = state.status === 'ended' && state.endingId ? ENDINGS[state.endingId] ?? null : null;

  const reset = useCallback(() => {
    const fresh = createInitialState();
    setState(fresh);
    setSelected([]);
    setLastEvents([]);
    setHistory([snapshot(fresh)]);
  }, []);

  return {
    state, available, selected, isSelected, togglePolicy, selectionCost,
    validationReason, canEndTurn, endTurn, lastEvents, history, ending, reset,
  };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @earth-alliance/web test`
Expected: PASS (useGame tests).

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/game/useGame.ts packages/web/test/useGame.test.ts
git commit -m "feat(web): add useGame controller hook wrapping the engine

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: ResourceBar, Sparkline, Dashboard

**Files:**
- Create: `packages/web/src/components/ResourceBar.tsx`, `src/components/Sparkline.tsx`, `src/components/Dashboard.tsx`
- Test: `packages/web/test/hud.test.tsx`

- [ ] **Step 1: Write the failing test**

`packages/web/test/hud.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import type { ReactNode } from 'react';
import { ResourceBar } from '../src/components/ResourceBar.js';
import { Dashboard } from '../src/components/Dashboard.js';
import { Sparkline } from '../src/components/Sparkline.js';

function wrap(ui: ReactNode) {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

describe('ResourceBar', () => {
  it('shows the year, political capital, and money', () => {
    wrap(<ResourceBar year={2030} turn={1} politicalCapital={123} money={45} />);
    expect(screen.getByText(/2030/)).toBeInTheDocument();
    expect(screen.getByText(/123/)).toBeInTheDocument();
    expect(screen.getByText(/45/)).toBeInTheDocument();
  });
});

describe('Dashboard', () => {
  it('shows temperature and CO2', () => {
    wrap(<Dashboard temperature={1.84} co2={431.2} annualEmissions={35} history={[{ year: 2025, temperature: 1.3, co2: 420 }]} />);
    expect(screen.getByText(/1\.84/)).toBeInTheDocument();
    expect(screen.getByText(/431/)).toBeInTheDocument();
  });
});

describe('Sparkline', () => {
  it('renders an svg polyline for the series', () => {
    const { container } = wrap(<Sparkline values={[1, 2, 1.5, 3]} width={100} height={30} />);
    expect(container.querySelector('polyline')).not.toBeNull();
  });
  it('renders nothing meaningful for an empty series without crashing', () => {
    const { container } = wrap(<Sparkline values={[]} width={100} height={30} />);
    expect(container.querySelector('svg')).not.toBeNull();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @earth-alliance/web test`
Expected: FAIL — components not found.

- [ ] **Step 3: Implement the components**

`packages/web/src/components/Sparkline.tsx`:
```tsx
interface SparklineProps {
  values: number[];
  width: number;
  height: number;
  color?: string;
}

export function Sparkline({ values, width, height, color = '#ff6b6b' }: SparklineProps) {
  if (values.length < 2) {
    return <svg width={width} height={height} role="img" aria-label="trend" />;
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * width;
      const y = height - ((v - min) / span) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg width={width} height={height} role="img" aria-label="trend">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} />
    </svg>
  );
}
```

`packages/web/src/components/ResourceBar.tsx`:
```tsx
import { Group, Paper, Text, Badge } from '@mantine/core';

interface ResourceBarProps {
  year: number;
  turn: number;
  politicalCapital: number;
  money: number;
}

export function ResourceBar({ year, turn, politicalCapital, money }: ResourceBarProps) {
  return (
    <Paper p="sm" withBorder>
      <Group justify="space-between">
        <Text fw={700}>Year {year} · Turn {turn}</Text>
        <Group>
          <Badge color="grape" size="lg">Political Capital: {Math.round(politicalCapital)}</Badge>
          <Badge color="teal" size="lg">Money: {Math.round(money)}</Badge>
        </Group>
      </Group>
    </Paper>
  );
}
```

`packages/web/src/components/Dashboard.tsx`:
```tsx
import { Group, Paper, Stack, Text, Title } from '@mantine/core';
import { Sparkline } from './Sparkline.js';
import { temperatureColor } from '../scene/metricColor.js';
import type { ClimatePoint } from '../game/useGame.js';

interface DashboardProps {
  temperature: number;
  co2: number;
  annualEmissions: number;
  history: ClimatePoint[];
}

export function Dashboard({ temperature, co2, annualEmissions, history }: DashboardProps) {
  return (
    <Paper p="sm" withBorder>
      <Stack gap="xs">
        <Title order={4}>Planet</Title>
        <Group justify="space-between">
          <Text>Warming</Text>
          <Text fw={700} c={temperatureColor(temperature)}>+{temperature.toFixed(2)} °C</Text>
        </Group>
        <Group justify="space-between"><Text>CO₂</Text><Text fw={700}>{co2.toFixed(0)} ppm</Text></Group>
        <Group justify="space-between"><Text>Emissions</Text><Text fw={700}>{annualEmissions.toFixed(1)} Gt/yr</Text></Group>
        <Sparkline values={history.map((h) => h.temperature)} width={240} height={40} />
      </Stack>
    </Paper>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @earth-alliance/web test`
Expected: PASS (HUD tests).

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/components/ResourceBar.tsx packages/web/src/components/Sparkline.tsx packages/web/src/components/Dashboard.tsx packages/web/test/hud.test.tsx
git commit -m "feat(web): add ResourceBar, Sparkline, and Dashboard HUD

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: PolicyCard + PolicyTray

**Files:**
- Create: `packages/web/src/components/PolicyCard.tsx`, `src/components/PolicyTray.tsx`
- Test: `packages/web/test/policyTray.test.tsx`

- [ ] **Step 1: Write the failing test**

`packages/web/test/policyTray.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { POLICY_CATALOG } from '@earth-alliance/engine';
import type { ReactNode } from 'react';
import { PolicyTray } from '../src/components/PolicyTray.js';

function wrap(ui: ReactNode) {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

const sample = POLICY_CATALOG.slice(0, 3);

describe('PolicyTray', () => {
  it('lists available policies by name', () => {
    wrap(<PolicyTray policies={sample} selectedIds={[]} affordableIds={sample.map((p) => p.id)}
      onToggle={() => {}} onEndTurn={() => {}} canEndTurn validationReason={null} />);
    for (const p of sample) expect(screen.getByText(p.name)).toBeInTheDocument();
  });

  it('calls onToggle when a card is clicked', async () => {
    const onToggle = vi.fn();
    wrap(<PolicyTray policies={sample} selectedIds={[]} affordableIds={sample.map((p) => p.id)}
      onToggle={onToggle} onEndTurn={() => {}} canEndTurn validationReason={null} />);
    await userEvent.click(screen.getByText(sample[0]!.name));
    expect(onToggle).toHaveBeenCalledWith(sample[0]!.id);
  });

  it('disables End Turn and shows the reason when the selection is invalid', () => {
    wrap(<PolicyTray policies={sample} selectedIds={[]} affordableIds={sample.map((p) => p.id)}
      onToggle={() => {}} onEndTurn={() => {}} canEndTurn={false} validationReason="Not enough money" />);
    expect(screen.getByRole('button', { name: /end turn/i })).toBeDisabled();
    expect(screen.getByText(/not enough money/i)).toBeInTheDocument();
  });

  it('marks unaffordable policies as disabled', () => {
    wrap(<PolicyTray policies={sample} selectedIds={[]} affordableIds={[]}
      onToggle={() => {}} onEndTurn={() => {}} canEndTurn validationReason={null} />);
    // Unaffordable cards expose aria-disabled
    expect(screen.getAllByTestId('policy-card').every((el) => el.getAttribute('aria-disabled') === 'true')).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @earth-alliance/web test`
Expected: FAIL — components not found.

- [ ] **Step 3: Implement the components**

`packages/web/src/components/PolicyCard.tsx`:
```tsx
import { Card, Group, Text, Badge, Box } from '@mantine/core';
import { motion } from 'framer-motion';
import type { Policy } from '@earth-alliance/engine';
import { CATEGORY_COLOR } from '../theme.js';

const CATEGORY_ICON: Record<string, string> = {
  energy: '⚡', industry: '🏭', land: '🌳', social: '🤝', frontier: '🚀',
};

interface PolicyCardProps {
  policy: Policy;
  selected: boolean;
  affordable: boolean;
  onToggle(id: string): void;
}

export function PolicyCard({ policy, selected, affordable, onToggle }: PolicyCardProps) {
  const disabled = !affordable && !selected;
  return (
    <motion.div whileHover={disabled ? undefined : { scale: 1.03 }} whileTap={disabled ? undefined : { scale: 0.98 }}>
      <Card
        data-testid="policy-card"
        withBorder
        padding="sm"
        aria-disabled={disabled}
        onClick={() => { if (!disabled) onToggle(policy.id); }}
        style={{
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          outline: selected ? '2px solid var(--mantine-color-earth-5)' : 'none',
        }}
      >
        {/* Placeholder art: category-colored band + icon (real art drops in later) */}
        <Box style={{ background: CATEGORY_COLOR[policy.category], height: 36, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
          {CATEGORY_ICON[policy.category] ?? '•'}
        </Box>
        <Text fw={700} mt="xs">{policy.name}</Text>
        <Text size="xs" c="dimmed" lineClamp={2}>{policy.description}</Text>
        <Group mt="xs" gap="xs">
          <Badge color="grape" variant="light">PC {policy.cost.politicalCapital}</Badge>
          <Badge color="teal" variant="light">$ {policy.cost.money}</Badge>
        </Group>
      </Card>
    </motion.div>
  );
}
```

`packages/web/src/components/PolicyTray.tsx`:
```tsx
import { Button, Group, ScrollArea, Stack, Text } from '@mantine/core';
import type { Policy } from '@earth-alliance/engine';
import { PolicyCard } from './PolicyCard.js';

interface PolicyTrayProps {
  policies: Policy[];
  selectedIds: string[];
  affordableIds: string[];
  onToggle(id: string): void;
  onEndTurn(): void;
  canEndTurn: boolean;
  validationReason: string | null;
}

export function PolicyTray({ policies, selectedIds, affordableIds, onToggle, onEndTurn, canEndTurn, validationReason }: PolicyTrayProps) {
  return (
    <Stack gap="xs">
      <ScrollArea.Autosize mah={420}>
        <Group align="stretch">
          {policies.map((p) => (
            <div key={p.id} style={{ width: 180 }}>
              <PolicyCard
                policy={p}
                selected={selectedIds.includes(p.id)}
                affordable={affordableIds.includes(p.id) || selectedIds.includes(p.id)}
                onToggle={onToggle}
              />
            </div>
          ))}
        </Group>
      </ScrollArea.Autosize>
      {validationReason && <Text c="red" size="sm">{validationReason}</Text>}
      <Button size="md" disabled={!canEndTurn} onClick={onEndTurn}>End Turn ▶</Button>
    </Stack>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @earth-alliance/web test`
Expected: PASS (policy tray tests).

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/components/PolicyCard.tsx packages/web/src/components/PolicyTray.tsx packages/web/test/policyTray.test.tsx
git commit -m "feat(web): add PolicyCard and PolicyTray with affordability + selection

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: RegionPanel

**Files:**
- Create: `packages/web/src/components/RegionPanel.tsx`
- Test: `packages/web/test/regionPanel.test.tsx`

- [ ] **Step 1: Write the failing test**

`packages/web/test/regionPanel.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { MantineProvider } from '@mantine/core';
import { SAMPLE_REGIONS } from '@earth-alliance/engine';
import type { ReactNode } from 'react';
import { RegionPanel } from '../src/components/RegionPanel.js';

function wrap(ui: ReactNode) {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

describe('RegionPanel', () => {
  it('prompts to pick a region when none is selected', () => {
    wrap(<RegionPanel region={null} />);
    expect(screen.getByText(/select a region/i)).toBeInTheDocument();
  });

  it('shows the selected region name and key metrics', () => {
    const region = SAMPLE_REGIONS[0]!;
    wrap(<RegionPanel region={region} />);
    expect(screen.getByText(region.name)).toBeInTheDocument();
    expect(screen.getByText(/support/i)).toBeInTheDocument();
    expect(screen.getByText(/biodiversity/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @earth-alliance/web test`
Expected: FAIL — component not found.

- [ ] **Step 3: Implement the component**

`packages/web/src/components/RegionPanel.tsx`:
```tsx
import { Paper, Stack, Text, Title, Progress, Group } from '@mantine/core';
import type { Region } from '@earth-alliance/engine';
import { metricColor } from '../scene/metricColor.js';

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <Stack gap={2}>
      <Group justify="space-between"><Text size="sm">{label}</Text><Text size="sm" fw={600}>{Math.round(value)}</Text></Group>
      <Progress value={value} color={metricColor(value)} />
    </Stack>
  );
}

export function RegionPanel({ region }: { region: Region | null }) {
  if (!region) {
    return <Paper p="sm" withBorder><Text c="dimmed">Select a region on the globe.</Text></Paper>;
  }
  return (
    <Paper p="sm" withBorder>
      <Stack gap="xs">
        <Title order={4}>{region.name}</Title>
        <Text size="sm" c="dimmed">GDP/capita ${Math.round(region.gdpPerCapita).toLocaleString()} · pop {(region.population / 1e6).toFixed(0)}M</Text>
        <Metric label="Public support" value={region.publicSupport} />
        <Metric label="Equity" value={region.equityIndex} />
        <Metric label="Biodiversity" value={region.biodiversityIndex} />
        <Metric label="Water" value={region.waterAvailability} />
        <Metric label="Land" value={region.landAvailability} />
      </Stack>
    </Paper>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @earth-alliance/web test`
Expected: PASS (region panel tests).

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/components/RegionPanel.tsx packages/web/test/regionPanel.test.tsx
git commit -m "feat(web): add RegionPanel detail view

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: EndingScreen

**Files:**
- Create: `packages/web/src/components/EndingScreen.tsx`
- Test: `packages/web/test/endingScreen.test.tsx`

- [ ] **Step 1: Write the failing test**

`packages/web/test/endingScreen.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { ENDINGS } from '@earth-alliance/engine';
import type { ReactNode } from 'react';
import { EndingScreen } from '../src/components/EndingScreen.js';

function wrap(ui: ReactNode) {
  return render(<MantineProvider>{ui}</MantineProvider>);
}

describe('EndingScreen', () => {
  it('shows the ending title and description and a play-again button', async () => {
    const ending = ENDINGS['green-utopia']!;
    const onPlayAgain = vi.fn();
    wrap(<EndingScreen ending={ending} year={2200} onPlayAgain={onPlayAgain} />);
    expect(screen.getByText(ending.title)).toBeInTheDocument();
    expect(screen.getByText(ending.description)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /play again/i }));
    expect(onPlayAgain).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @earth-alliance/web test`
Expected: FAIL — component not found.

- [ ] **Step 3: Implement the component**

`packages/web/src/components/EndingScreen.tsx`:
```tsx
import { Overlay, Center, Stack, Title, Text, Button, Badge } from '@mantine/core';
import { motion } from 'framer-motion';
import type { Ending } from '@earth-alliance/engine';

const KIND_COLOR: Record<Ending['kind'], string> = { win: 'teal', loss: 'red', ambiguous: 'yellow' };

interface EndingScreenProps {
  ending: Ending;
  year: number;
  onPlayAgain(): void;
}

export function EndingScreen({ ending, year, onPlayAgain }: EndingScreenProps) {
  return (
    <Overlay color="#000" backgroundOpacity={0.85} fixed zIndex={1000}>
      <Center h="100%">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <Stack align="center" gap="md" maw={520} p="xl">
            <Badge size="lg" color={KIND_COLOR[ending.kind]}>{ending.kind.toUpperCase()}</Badge>
            <Title order={1} ta="center">{ending.title}</Title>
            <Text ta="center" c="dimmed">Year {year}</Text>
            <Text ta="center">{ending.description}</Text>
            <Button size="lg" onClick={onPlayAgain}>Play again</Button>
          </Stack>
        </motion.div>
      </Center>
    </Overlay>
  );
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @earth-alliance/web test`
Expected: PASS (ending screen tests).

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/components/EndingScreen.tsx packages/web/test/endingScreen.test.tsx
git commit -m "feat(web): add EndingScreen overlay

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 9: 3D scene (Globe, RegionMarker, EarthScene)

**Files:**
- Create: `packages/web/src/scene/Globe.tsx`, `src/scene/RegionMarker.tsx`, `src/scene/EarthScene.tsx`

> These render WebGL via R3F and are **not** unit-tested in jsdom (the pure helpers they use — `geo.ts`, `metricColor.ts` — are already tested in Task 3). Verify visually in the browser. Keep the glue thin.

- [ ] **Step 1: Implement the Globe**

`packages/web/src/scene/Globe.tsx`:
```tsx
import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Mesh } from 'three';

export function Globe({ radius = 2 }: { radius?: number }) {
  const ref = useRef<Mesh>(null);
  useFrame((_, delta) => {
    if (ref.current) ref.current.rotation.y += delta * 0.05; // slow auto-rotation
  });
  return (
    <group>
      {/* Ocean sphere (stylized placeholder; swap in an Earth texture later) */}
      <mesh ref={ref}>
        <sphereGeometry args={[radius, 64, 64]} />
        <meshStandardMaterial color="#1c4e80" roughness={0.8} metalness={0.1} />
      </mesh>
      {/* Atmosphere glow shell */}
      <mesh scale={1.08}>
        <sphereGeometry args={[radius, 32, 32]} />
        <meshBasicMaterial color="#4dabf7" transparent opacity={0.12} />
      </mesh>
    </group>
  );
}
```

- [ ] **Step 2: Implement the RegionMarker**

`packages/web/src/scene/RegionMarker.tsx`:
```tsx
import { useState } from 'react';
import type { Region } from '@earth-alliance/engine';
import { latLonToVector3 } from './geo.js';
import { metricColor } from './metricColor.js';

interface RegionMarkerProps {
  region: Region;
  radius: number;
  metric: number;          // 0–100 value driving the marker color
  selected: boolean;
  onSelect(id: string): void;
}

export function RegionMarker({ region, radius, metric, selected, onSelect }: RegionMarkerProps) {
  const [hovered, setHovered] = useState(false);
  const pos = latLonToVector3(region.lat, region.lon, radius * 1.02);
  return (
    <mesh
      position={pos}
      onClick={(e) => { e.stopPropagation(); onSelect(region.id); }}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerOut={() => setHovered(false)}
      scale={selected || hovered ? 1.6 : 1}
    >
      <sphereGeometry args={[0.06, 16, 16]} />
      <meshStandardMaterial color={metricColor(metric)} emissive={metricColor(metric)} emissiveIntensity={selected ? 0.8 : 0.3} />
    </mesh>
  );
}
```

- [ ] **Step 3: Implement the EarthScene**

`packages/web/src/scene/EarthScene.tsx`:
```tsx
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import type { Region } from '@earth-alliance/engine';
import { Globe } from './Globe.js';
import { RegionMarker } from './RegionMarker.js';

interface EarthSceneProps {
  regions: Region[];
  metricOf(region: Region): number;   // which metric colors the markers
  selectedRegionId: string | null;
  onSelectRegion(id: string): void;
}

const RADIUS = 2;

export function EarthScene({ regions, metricOf, selectedRegionId, onSelectRegion }: EarthSceneProps) {
  return (
    <Canvas camera={{ position: [0, 0, 6], fov: 45 }} style={{ width: '100%', height: '100%' }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 3, 5]} intensity={1.2} />
      <Stars radius={50} depth={50} count={2000} factor={4} fade />
      <Globe radius={RADIUS} />
      {regions.map((r) => (
        <RegionMarker
          key={r.id}
          region={r}
          radius={RADIUS}
          metric={metricOf(r)}
          selected={selectedRegionId === r.id}
          onSelect={onSelectRegion}
        />
      ))}
      <OrbitControls enablePan={false} minDistance={3.5} maxDistance={10} />
    </Canvas>
  );
}
```

- [ ] **Step 4: Typecheck**

Run: `pnpm --filter @earth-alliance/web typecheck`
Expected: clean. (No unit tests here — these are verified in the Task 11 browser walkthrough.)

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/scene/Globe.tsx packages/web/src/scene/RegionMarker.tsx packages/web/src/scene/EarthScene.tsx
git commit -m "feat(web): add 3D Earth scene with rotating globe and region markers

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 10: Audio (useSfx)

**Files:**
- Create: `packages/web/src/audio/useSfx.ts`
- Test: `packages/web/test/useSfx.test.ts`

> `eventToSound` (pure) is already tested. `useSfx` is thin Web Audio glue; the test only verifies it returns a stable `play` function and does not throw when invoked (AudioContext is stubbed in jsdom).

- [ ] **Step 1: Write the failing test**

`packages/web/test/useSfx.test.ts`:
```ts
import { renderHook } from '@testing-library/react';
import { useSfx } from '../src/audio/useSfx.js';

// jsdom has no real AudioContext; stub a minimal one so the glue can be exercised.
class FakeOsc { type = 'sine'; frequency = { value: 0 }; connect() {} start() {} stop() {} }
class FakeGain { gain = { value: 1, setValueAtTime() {}, exponentialRampToValueAtTime() {} }; connect() {} }
class FakeAudioCtx {
  currentTime = 0;
  destination = {};
  createOscillator() { return new FakeOsc(); }
  createGain() { return new FakeGain(); }
}

describe('useSfx', () => {
  beforeEach(() => {
    (globalThis as unknown as { AudioContext: unknown }).AudioContext = FakeAudioCtx;
  });

  it('plays a tone for a known event without throwing', () => {
    const { result } = renderHook(() => useSfx());
    expect(() => result.current.playForEvent({ turn: 1, type: 'turn-advanced', message: '' })).not.toThrow();
  });

  it('ignores events with no sound', () => {
    const { result } = renderHook(() => useSfx());
    expect(() => result.current.playForEvent({ turn: 1, type: 'nope', message: '' })).not.toThrow();
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pnpm --filter @earth-alliance/web test`
Expected: FAIL — `useSfx` not found.

- [ ] **Step 3: Implement the hook**

`packages/web/src/audio/useSfx.ts`:
```ts
import { useCallback, useRef } from 'react';
import type { GameEvent } from '@earth-alliance/engine';
import { eventToSound } from './sound.js';

type AudioCtor = typeof AudioContext;

/** Tiny assetless SFX via the Web Audio API. Swap for Howler + audio files later. */
export function useSfx() {
  const ctxRef = useRef<AudioContext | null>(null);

  const ensureCtx = useCallback((): AudioContext | null => {
    const Ctor: AudioCtor | undefined =
      (globalThis as unknown as { AudioContext?: AudioCtor }).AudioContext;
    if (!Ctor) return null;
    if (!ctxRef.current) ctxRef.current = new Ctor();
    return ctxRef.current;
  }, []);

  const playForEvent = useCallback((event: GameEvent) => {
    const tone = eventToSound(event);
    if (!tone) return;
    const ctx = ensureCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = tone.type;
    osc.frequency.value = tone.frequency;
    gain.gain.value = 0.0001;
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.2, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + tone.durationMs / 1000);
    osc.start(now);
    osc.stop(now + tone.durationMs / 1000);
  }, [ensureCtx]);

  return { playForEvent };
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `pnpm --filter @earth-alliance/web test`
Expected: PASS (useSfx tests).

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/audio/useSfx.ts packages/web/test/useSfx.test.ts
git commit -m "feat(web): add Web Audio SFX hook driven by game events

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 11: App integration + play-a-turn test

**Files:**
- Modify: `packages/web/src/App.tsx`
- Create: `packages/web/test/app.integration.test.tsx`

- [ ] **Step 1: Implement the composed App**

Replace `packages/web/src/App.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { AppShell, Grid, Box } from '@mantine/core';
import { EarthScene } from './scene/EarthScene.js';
import { ResourceBar } from './components/ResourceBar.js';
import { Dashboard } from './components/Dashboard.js';
import { PolicyTray } from './components/PolicyTray.js';
import { RegionPanel } from './components/RegionPanel.js';
import { EndingScreen } from './components/EndingScreen.js';
import { useGame } from './game/useGame.js';
import { useSfx } from './audio/useSfx.js';
import { validateSelection, type Region } from '@earth-alliance/engine';

export default function App() {
  const game = useGame();
  const sfx = useSfx();
  const [selectedRegionId, setSelectedRegionId] = useState<string | null>(null);

  // Play a sound for each event produced by the last turn.
  useEffect(() => {
    for (const e of game.lastEvents) sfx.playForEvent(e);
  }, [game.lastEvents, sfx]);

  const affordableIds = game.available
    .filter((p) => validateSelection(game.state, [...game.selected, p.id]).ok || game.selected.includes(p.id))
    .map((p) => p.id);

  const selectedRegion: Region | null =
    game.state.regions.find((r) => r.id === selectedRegionId) ?? null;

  return (
    <AppShell padding="md">
      <AppShell.Main>
        <Grid gutter="md">
          <Grid.Col span={{ base: 12, md: 7 }}>
            <Box style={{ height: '70vh', minHeight: 420, borderRadius: 8, overflow: 'hidden', background: '#05080f' }}>
              <EarthScene
                regions={game.state.regions}
                metricOf={(r) => r.publicSupport}
                selectedRegionId={selectedRegionId}
                onSelectRegion={setSelectedRegionId}
              />
            </Box>
          </Grid.Col>
          <Grid.Col span={{ base: 12, md: 5 }}>
            <Box style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <ResourceBar year={game.state.year} turn={game.state.turn}
                politicalCapital={game.state.resources.politicalCapital} money={game.state.resources.money} />
              <Dashboard temperature={game.state.climate.temperatureAnomaly} co2={game.state.climate.co2Concentration}
                annualEmissions={game.state.climate.annualEmissions} history={game.history} />
              <RegionPanel region={selectedRegion} />
            </Box>
          </Grid.Col>
          <Grid.Col span={12}>
            <PolicyTray
              policies={game.available}
              selectedIds={game.selected}
              affordableIds={affordableIds}
              onToggle={game.togglePolicy}
              onEndTurn={game.endTurn}
              canEndTurn={game.canEndTurn}
              validationReason={game.validationReason}
            />
          </Grid.Col>
        </Grid>
      </AppShell.Main>
      {game.ending && (
        <EndingScreen ending={game.ending} year={game.state.year} onPlayAgain={() => { game.reset(); setSelectedRegionId(null); }} />
      )}
    </AppShell>
  );
}
```

- [ ] **Step 2: Write the integration test (mock the 3D scene)**

`packages/web/test/app.integration.test.tsx`:
```tsx
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MantineProvider } from '@mantine/core';
import { vi } from 'vitest';
import App from '../src/App.js';

// jsdom has no WebGL — replace the 3D scene with a stub so App can render.
vi.mock('../src/scene/EarthScene.js', () => ({
  EarthScene: () => <div data-testid="earth-scene-stub" />,
}));

function renderApp() {
  return render(<MantineProvider><App /></MantineProvider>);
}

describe('App integration', () => {
  it('renders the HUD and advances a turn when End Turn is clicked', async () => {
    renderApp();
    expect(screen.getByText(/Year 2025/)).toBeInTheDocument();
    expect(screen.getByTestId('earth-scene-stub')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /end turn/i }));
    expect(screen.getByText(/Year 2030/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run the test**

Run: `pnpm --filter @earth-alliance/web test`
Expected: PASS — including the integration test. If `act`/state-update warnings appear from the `useEffect` SFX call, they are benign (the AudioContext is absent in jsdom so `playForEvent` no-ops); the assertions must still pass.

- [ ] **Step 4: Manual browser walkthrough (the real vertical-slice check)**

Run: `pnpm --filter @earth-alliance/engine build` (ensure engine dist is current), then `pnpm --filter @earth-alliance/web dev`.
Open http://localhost:5173 and verify the spec §12 Definition of Done:
1. The app loads with a rotating 3D Earth and ~5 colored region markers.
2. Clicking a marker fills the RegionPanel with that region's metrics.
3. The HUD shows political capital, money, year, warming, CO₂, and a temperature sparkline.
4. Policy cards show cost; unaffordable ones are dimmed; selecting one outlines it and updates affordability.
5. Clicking **End Turn** advances the year by 5, updates all metrics and marker colors, and plays a short tone.
6. Continuing to play reaches an ending overlay (the do-nothing path reaches an economic-ruin loss ~2060); **Play again** resets.
Stop the server.

- [ ] **Step 5: Commit**

```bash
git add packages/web/src/App.tsx packages/web/test/app.integration.test.tsx
git commit -m "feat(web): compose the playable vertical slice (scene + HUD + turn loop)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 12: Asset pipeline doc + coverage gate + final verification

**Files:**
- Create: `packages/web/public/assets/README.md`

- [ ] **Step 1: Document the asset pipeline**

`packages/web/public/assets/README.md`:
```markdown
# Assets

Placeholders are currently generated in code (category-colored card bands + emoji icons;
a stylized procedural globe; Web Audio tones). To upgrade to real assets without code changes:

- **Card art:** drop images here and reference them from `Policy.art` (the engine already
  carries an `art` key per policy). Wire `PolicyCard` to render `<img src={/assets/${policy.art}.png}>`.
- **Globe texture:** add an equirectangular Earth texture (e.g. `earth.jpg`) and load it in
  `scene/Globe.tsx` via drei's `useTexture('/assets/earth.jpg')` on the sphere material.
- **Sound:** replace `audio/useSfx.ts` (Web Audio tones) with Howler + real audio files here,
  keyed by `eventToSound`'s event types.
```

- [ ] **Step 2: Full suite + coverage + typecheck**

Run: `pnpm --filter @earth-alliance/web test`
Expected: all web tests green.
Run: `pnpm --filter @earth-alliance/web coverage`
Expected: thresholds met (game/components/helpers ≥ 70% lines). If a logic file is under threshold, add a focused test; do not lower thresholds. (The `scene/` R3F files and `useSfx` glue are excluded from coverage by config.)
Run: `pnpm -r typecheck`
Expected: clean across engine + web.
Run: `pnpm -r test`
Expected: engine (85) + web suites all green.

- [ ] **Step 3: Commit**

```bash
git add packages/web/public/assets/README.md
git commit -m "docs(web): document the asset upgrade pipeline

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Definition of Done (web client)

- [ ] `pnpm install` succeeds; `pnpm --filter @earth-alliance/engine build` produces `dist/`.
- [ ] `pnpm --filter @earth-alliance/web dev` serves the app at http://localhost:5173.
- [ ] A rotating 3D Earth renders with ~5 clickable region markers colored by a metric.
- [ ] HUD shows dual resources, climate metrics, and a temperature sparkline.
- [ ] ~8–10 policy cards (placeholder art) respect cost/validation; End Turn advances 5 years, updates the globe + metrics, and plays a tone.
- [ ] Playing to completion reaches an ending overlay; Play again resets.
- [ ] `pnpm -r test` green (engine + web logic); `pnpm --filter @earth-alliance/web coverage` meets thresholds; `pnpm -r typecheck` clean.

**Known follow-ups (carried from spec §13):** real art/texture/sound assets; balance tuning so the climate-loss path and full redemption arc are reachable in a live game; region targeting in the selection API (the engine now rejects region-scoped policies with a clear error); optional postprocessing (bloom/atmosphere) for richer visuals.
```
