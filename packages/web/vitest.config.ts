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
