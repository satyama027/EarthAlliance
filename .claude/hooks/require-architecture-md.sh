#!/usr/bin/env bash
# PreToolUse(Bash) hook — project rule: ARCHITECTURE.md must be updated and
# staged before EVERY commit.
#
# Wired in .claude/settings.json with `if: "Bash(git commit*)"`, so it only
# runs when Claude is about to run a `git commit`. It blocks the commit unless
# ARCHITECTURE.md is among the staged changes; the deny reason tells Claude to
# update + stage ARCHITECTURE.md and try again.
set -euo pipefail

# Is ARCHITECTURE.md (repo root or any subdir) part of the pending commit?
if git diff --cached --name-only 2>/dev/null | grep -qiE '(^|/)ARCHITECTURE\.md$'; then
  exit 0   # staged — allow the commit to proceed
fi

# Not staged — emit a PreToolUse deny so the commit is blocked.
cat <<'JSON'
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Project rule: ARCHITECTURE.md must be updated and staged before every commit. Update ARCHITECTURE.md to reflect this change, then run: git add ARCHITECTURE.md and commit again. (If the change truly doesn't affect architecture, note that briefly in ARCHITECTURE.md and stage it, or manage this rule via /hooks.)"}}
JSON
