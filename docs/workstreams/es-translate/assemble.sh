#!/usr/bin/env bash
# es-translate — assemble src/i18n/es.js from the section parts.
# The parts live outside the repository (session scratchpad) on purpose: they are a writing aid,
# not a second source of truth. The committed artefact is src/i18n/es.js.
set -euo pipefail
PARTS="${1:?usage: assemble.sh <parts-dir>}"
OUT="$(cd "$(dirname "$0")/../../.." && pwd)/src/i18n/es.js"
{ cat "$PARTS"/*.part; printf '};\n'; } > "$OUT"
printf 'assembled %s from %d parts\n' "$OUT" "$(ls "$PARTS"/*.part | wc -l)"
