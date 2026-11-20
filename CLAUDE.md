# Earth Alliance — Project Instructions

Climate-strategy game, being rebuilt from scratch. The repo is currently empty
apart from these instructions and tooling; the previous implementation lives in
git history (commit `ad17002`).

See `ARCHITECTURE.md` for the as-built design.

## Development process (mandatory)

### 1. Test-Driven Development

Write the test **before** the implementation, on every feature and bugfix:

1. **Red** — write a failing test that specifies the desired behavior. Run it; confirm it fails for the right reason.
2. **Green** — write the minimum code to make it pass.
3. **Refactor** — clean up with the test as a safety net.

- Every new test goes into the project's automated test suite (never a
  throwaway script).
- **After development is done, run the full automated suite (tests and
  type-check) to check for regressions** before considering the work complete.
  A green run of the full suite is the bar for "done".

### 2. Update ARCHITECTURE.md before every commit

`ARCHITECTURE.md` must be updated to reflect the change and **staged** before
every commit. This is enforced by a pre-commit hook
(`.claude/hooks/require-architecture-md.sh`, wired in `.claude/settings.json`):
a `git commit` is blocked unless `ARCHITECTURE.md` is among the staged files.

## Commands

_To be defined once the new stack is chosen._
