import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Resolve the engine from its TypeScript source, never the compiled dist.
  // Consuming the prebuilt dist let a stale build ship outdated region data
  // (the map showed regions the engine no longer knew about). Source is the
  // single truth; no manual engine rebuild is needed for dev or tests.
  resolve: {
    alias: {
      '@earth-alliance/engine': fileURLToPath(new URL('../engine/src/index.ts', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/game/**', 'src/components/**', 'src/scene/metricColor.ts', 'src/audio/sound.ts'],
      exclude: ['src/main.tsx', 'src/scene/WorldMap.tsx', 'src/audio/useSfx.ts'],
      thresholds: { lines: 70, functions: 70, branches: 60, statements: 70 },
    },
  },
});
