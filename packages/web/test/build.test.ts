// @vitest-environment node
import { fileURLToPath } from 'node:url';
import { build, type Rollup } from 'vite';

// ADR-0001: the one static build must run from any location — a domain root, an itch.io
// iframe subpath, a Capacitor webDir, or a desktop file:// origin. That only works when
// index.html references its assets relatively (./assets/…), never root-absolute (/assets/…).
describe('production build', () => {
  it('emits relative asset URLs so the same bundle runs from any path', async () => {
    const root = fileURLToPath(new URL('..', import.meta.url));
    const result = await build({
      root,
      configFile: fileURLToPath(new URL('../vite.config.ts', import.meta.url)),
      logLevel: 'silent',
      build: { write: false },
    });
    const outputs = (Array.isArray(result) ? result : [result]) as Rollup.RollupOutput[];
    const html = outputs
      .flatMap((o) => o.output)
      .find((f): f is Rollup.OutputAsset => f.fileName === 'index.html');

    expect(html).toBeDefined();
    const source = String(html!.source);
    expect(source).toMatch(/src="\.\/assets\/[^"]+\.js"/);
    expect(source).not.toMatch(/(src|href)="\/assets\//);
  }, 60_000);
});
