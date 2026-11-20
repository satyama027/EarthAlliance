// @vitest-environment node
import { readFileSync } from 'node:fs';

// Guards the CI workflow (ADR-0001 phase 0) against drifting from the repo's own definition
// of "done" in CLAUDE.md: the full suite + typecheck, on the locked dependency set.
const read = (rel: string) => readFileSync(new URL(rel, import.meta.url), 'utf8');
const workflow = read('../../../.github/workflows/ci.yml');
const rootPkg = JSON.parse(read('../../../package.json')) as { packageManager?: string };

describe('CI workflow', () => {
  it('runs on pull requests and on pushes to master', () => {
    expect(workflow).toMatch(/^on:\s*$/m);
    expect(workflow).toMatch(/^\s+pull_request:/m);
    expect(workflow).toMatch(/^\s+push:\s*\n\s+branches:\s*\[\s*master\s*\]/m);
  });

  it('installs exactly the locked dependencies', () => {
    expect(workflow).toContain('pnpm install --frozen-lockfile');
  });

  it('runs the full automated suite that CLAUDE.md defines as done', () => {
    expect(workflow).toContain('pnpm -r typecheck');
    expect(workflow).toContain('pnpm -r test');
  });

  it('proves the production web build succeeds', () => {
    expect(workflow).toContain('pnpm --filter @earth-alliance/web build');
  });

  it('uses the pnpm version pinned in package.json', () => {
    expect(rootPkg.packageManager).toMatch(/^pnpm@\d+\.\d+\.\d+$/);
    // pnpm/action-setup reads the version from `packageManager`; a second pin here would drift.
    expect(workflow).toContain('pnpm/action-setup@v4');
    expect(workflow).not.toMatch(/pnpm\/action-setup@v4[\s\S]*?\n\s+version:/);
  });
});
