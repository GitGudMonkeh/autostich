#!/usr/bin/env bash
# ============================================================
# es-translate — COUNTER-CHECKS (testing.md §5).
#
# A guard that is merely green is not evidence. Each case below deliberately breaks the seam the
# guard protects, proves the guard goes RED, and restores the tree. A case that stays green is a
# FAILURE of this harness: it means the guard does not actually watch what it claims to.
#
# Every case restores with `git checkout --` on the single file it touched. The harness refuses to
# start if that file is already dirty, because a restore would then discard real work.
#
# Usage:  bash docs/workstreams/es-translate/counter-checks.sh
# ============================================================
set -uo pipefail
cd "$(dirname "$0")/../../.."

PASS=0; FAIL=0

# run_case <name> <file-to-break> <perl-expr> <vitest -t filter>
run_case() {
  local name="$1" file="$2" expr="$3" filter="$4"

  if [ -n "$(git status --porcelain -- "$file")" ]; then
    printf '  SKIP  %s\n        %s is already modified — refusing to restore over real work\n' "$name" "$file"
    FAIL=$((FAIL + 1)); return
  fi

  perl -0pi -e "$expr" "$file"

  if git diff --quiet -- "$file"; then
    printf '  FAIL  %s\n        the break did not change %s — the pattern no longer matches\n' "$name" "$file"
    FAIL=$((FAIL + 1)); return
  fi

  npx vitest run test/i18n-guards.test.js -t "$filter" >/dev/null 2>&1
  local rc=$?
  git checkout -- "$file"

  if [ "$rc" -ne 0 ]; then
    printf '  ok    %s\n' "$name"
    PASS=$((PASS + 1))
  else
    printf '  FAIL  %s\n        the seam was broken and the guard stayed GREEN\n' "$name"
    FAIL=$((FAIL + 1))
  fi
}

printf '\nes-translate counter-checks\n\n'

# ---- 1 · the es -> en -> de fallback chain -------------------------------------------------
# Seam: FALLBACK in index.js puts `via` in front of the source language. Break it so `es` drops
# straight to German — the exact regression that would show a Spanish player German text.
# This case is the reason the probe in the guard is artificial: the previous probe relied on the
# Spanish catalog being empty and would have stopped detecting this the moment it was filled.
run_case "fallback chain es -> en -> de" \
  "src/i18n/index.js" \
  's/\[\.\.\.\(l\.via \|\| \[\]\), SOURCE_LOCALE\]/[SOURCE_LOCALE]/' \
  "via"

printf '\n  %d passed, %d failed\n\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ]
