import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Relative asset URLs (ADR-0001): the one static build must load from a domain root,
  // an itch.io iframe subpath, a Capacitor webDir, or a desktop file:// origin.
  base: './',
  plugins: [react()],
  // Resolve the engine from its TypeScript source, never the compiled dist, so
  // the dev server and production build always reflect current engine source.
  // A stale dist once shipped outdated region data; source is the single truth.
  resolve: {
    alias: {
      '@earth-alliance/engine': fileURLToPath(new URL('../engine/src/index.ts', import.meta.url)),
    },
  },
  server: { port: 5173 },
});
