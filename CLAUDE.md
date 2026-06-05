# Earth Alliance — Project Instructions

Climate-strategy game. pnpm workspace with two packages:

- `packages/engine` — pure TypeScript game engine (vitest, fast-check).
- `packages/web` — React/Vite client (vitest + Testing Library).

See `ARCHITECTURE.md` for the as-built design.

## Development process (mandatory)

These two processes are required for all development in this repo.

### 1. Test-Driven Development

Write the test **before** the implementation, on every feature and bugfix:

1. **Red** — write a failing test that specifies the desired behavior. Run it; confirm it fails for the right reason.
2. **Green** — write the minimum code to make it pass.
3. **Refactor** — clean up with the test as a safety net.

- Every new test goes into the package's vitest suite (it is part of the
  automated set from then on — never a throwaway script).
- **After development is done, run the full automated suite to check for
  regressions** before considering the work complete:
  - `pnpm -r test` — run every package's tests.
  - `pnpm -r typecheck` — type-check every package.
- A green run of the full suite is the bar for "done".

### 2. Update ARCHITECTURE.md before every commit

`ARCHITECTURE.md` must be updated to reflect the change and **staged** before
every commit. This is enforced by a pre-commit hook
(`.claude/hooks/require-architecture-md.sh`, wired in `.claude/settings.json`):
a `git commit` is blocked unless `ARCHITECTURE.md` is among the staged files.

Workflow for each commit:

1. Make the change (following TDD above).
2. Update `ARCHITECTURE.md` to reflect it. If the change genuinely doesn't
   affect architecture, note that briefly so the doc stays in sync.
3. `git add ARCHITECTURE.md` (plus your other changes).
4. Commit.

## Commands

| Task | Command |
| --- | --- |
| Run all tests | `pnpm -r test` |
| Watch tests | `pnpm -r test:watch` |
| Type-check all | `pnpm -r typecheck` |
| Coverage | `pnpm -r coverage` |
| Web dev server | `pnpm --filter @earth-alliance/web dev` |
