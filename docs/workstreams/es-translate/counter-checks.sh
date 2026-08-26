#!/usr/bin/env bash
# ============================================================
# es-translate — COUNTER-CHECKS (testing.md §5).
#
# A guard that is merely green is not evidence. Each case below deliberately breaks the seam the
# guard protects, proves the guard goes RED, and restores the tree. A case that stays green is a
# FAILURE of this harness: it means the guard does not actually watch what it claims to.
#
# TWO HARNESS TRAPS, both inherited from the spanish-locale run and both closed here:
#   - a `-t` filter that matches NO test lets vitest exit 0, which would read as "guard stayed
#     green" — indistinguishable from a real hole. Every filter below is therefore pure ASCII
#     (no umlauts, no accents), and the harness fails a case whose filter matched nothing.
#   - a case whose break pattern no longer matches silently tests nothing. The harness checks
#     that the file actually changed before it runs anything.
#
# Every case restores with `git checkout --` on the single file it touched, and refuses to start
# if that file is already dirty, because a restore would then discard real work.
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

  local out rc
  out="$(npx vitest run test/i18n-guards.test.js -t "$filter" 2>&1)"
  rc=$?
  git checkout -- "$file"

  # A filter that matched nothing exits 0 and would masquerade as "guard stayed green".
  if printf '%s' "$out" | grep -qE 'No test (files )?found|Tests +0 '; then
    printf '  FAIL  %s\n        the -t filter "%s" matched NO test\n' "$name" "$filter"
    FAIL=$((FAIL + 1)); return
  fi

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
# This case is why the probe in the guard is artificial: the previous probe relied on the Spanish
# catalog being empty and would have stopped detecting this the moment it was filled.
run_case "fallback chain es -> en -> de" \
  "src/i18n/index.js" \
  's/\[\.\.\.\(l\.via \|\| \[\]\), SOURCE_LOCALE\]/[SOURCE_LOCALE]/' \
  "via"

# ---- 2 · the frozen terminology table ------------------------------------------------------
# Seam: TERMS.es maps Stich -> baza and forbids "ronda". Rename the glossary entry to the
# forbidden synonym; both halves of the rule should fire.
run_case "terminology: Stich -> baza (never ronda)" \
  "src/i18n/esGlossary.js" \
  's/\["stich", "Baza"/["stich", "Ronda"/' \
  "kanonische Begriffe"

# ---- 3 · the brand per language ------------------------------------------------------------
# Seam: no catalog may carry another language's game title. Put the English brand into the
# Spanish privacy notice — the most likely place for one to leak in by copying a paragraph.
run_case "brand: no foreign game title in es" \
  "src/i18n/es.js" \
  's/Autobaza funciona en el navegador/Autotrick funciona en el navegador/' \
  "Marke"

# ---- 4 · the numbers ------------------------------------------------------------------------
# Seam: THE guard for the data texts — every language must name the same numbers. Type a wrong
# figure into a skill, which is exactly the F1 failure this task was warned about.
run_case "numbers: es must name the same figures as de" \
  "src/i18n/esSkills.js" \
  's/Cada crítico genera \+1 carga adicional/Cada crítico genera +2 carga adicional/' \
  "dieselben Zahlen"

# ---- 5 · the hard one-character formation abbreviations -------------------------------------
# Seam: eight abbreviations, one character each, pairwise distinct. Collide escalera with ancla.
run_case "formation abbreviations stay pairwise distinct" \
  "src/i18n/es.js" \
  's/"formation\.treppe\.abbr": "E"/"formation.treppe.abbr": "A"/' \
  "sind je genau ein Zeichen"

# ---- 6 · the quote pair per language --------------------------------------------------------
# Seam: Spanish carries the English pair. Slip a GERMAN quote pair into a Spanish string.
# Anchored on ASCII, and the replacement injects the raw UTF-8 BYTES of the German marks: perl
# here reads bytes, not characters, so a \x{201e} in the PATTERN matches nothing. The first
# version of this case did exactly that and quietly tested nothing — the harness caught it,
# which is the whole reason the "did the break change the file" check exists.
run_case "quote pair: no foreign mark in es" \
  "src/i18n/es.js" \
  's/"common\.close": "Cerrar"/"common.close": "\xe2\x80\x9eCerrar\xe2\x80\x9c"/' \
  "benutzt ihr eigenes"

# ---- 7 · the glossary word forms ------------------------------------------------------------
# Seam: every glossary entry needs at least one non-empty word form, or its auto-bolding is dead.
run_case "glossary match forms are present" \
  "src/i18n/esGlossary.js" \
  's/\["baza", "bazas"\]/[]/' \
  "mindestens eine Wortform"

# ---- 8 · the same-as-German exception list --------------------------------------------------
# Seam: a Spanish value identical to the German is only allowed where SAME_OK.es says so.
# `hud.score` is NOT on that list, so putting the German word back must be caught.
run_case "untranslated text is caught unless SAME_OK.es allows it" \
  "src/i18n/es.js" \
  's/"hud\.score": "Puntuación"/"hud.score": "Score"/' \
  "unterscheiden sich vom Original"

printf '\n  %d passed, %d failed\n\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ]
