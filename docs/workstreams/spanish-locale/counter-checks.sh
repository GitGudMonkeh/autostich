#!/usr/bin/env bash
# Gegenproben: jede neue/verallgemeinerte Prüfung wird absichtlich gebrochen und muss ROT werden.
# Nach jedem Fall wird der Arbeitsbaum aus dem Commit wiederhergestellt.
set -u
cd "$(dirname "$0")/../../.." || exit 1    # Repository-Wurzel, kein fester Laufwerksbuchstabe

pass=0; fail=0
CC="$(cd "$(dirname "$0")" && pwd)"

restore() { git checkout -- src test >/dev/null 2>&1; }

# $1 = Fallname, $2 = Testname (-t), $3 = erwartetes Ergebnis (rot|gruen)
run_case() {
  local name="$1" tname="$2" want="$3"
  npx vitest run test/i18n-guards.test.js -t "$tname" >/tmp/cc.out 2>&1
  local code=$?
  if ! grep -qE "Tests +[0-9]+ (passed|failed)" /tmp/cc.out; then
    printf '  UNGUELTIG %-57s -> kein Test gematcht
' "$name"; fail=$((fail+1)); restore; return
  fi
  local got; if [ $code -ne 0 ]; then got="rot"; else got="gruen"; fi
  if [ "$got" = "$want" ]; then
    printf '  OK       %-58s -> %s\n' "$name" "$got"; pass=$((pass+1))
  else
    printf '  DEFEKT   %-58s -> %s (erwartet %s)\n' "$name" "$got" "$want"; fail=$((fail+1))
    sed -n '/Failed Tests\|AssertionError\|✓\|×/p' /tmp/cc.out | head -4
  fi
  restore
}

echo "=== Gegenproben (jeder Fall bricht die Naht absichtlich) ==="

# 1 — Die Ratsche gegen ein liegengebliebenes ready:false.
cat > src/i18n/es.js <<'EOF'
import de from "./de.js";
export default Object.fromEntries(Object.keys(de).map((k) => [k, de[k]]));
EOF
run_case "vollstaendiger es-Katalog verlangt ready:true" "verlangt" rot

# 2 — Marke ueber Kreuz.
node -e "const f='src/i18n/en.js',fs=require('fs');fs.writeFileSync(f,fs.readFileSync(f,'utf8').replace('export default {','export default {\n  \"zz.brand\": \"Autobaza rules\",'))"
run_case "spanische Marke im englischen Katalog" "ihren eigenen Namen" rot

# 3 — Die vierte Sprachweiche zurueckgebaut.
node -e "const f='src/i18n/buildingText.js',fs=require('fs');fs.writeFileSync(f,fs.readFileSync(f,'utf8').replace('const factor = (x) => fmtNum(x.toFixed(2));','const factor = (x) => { const s = x.toFixed(2); return getLocale() === SOURCE_LOCALE ? s.replace(\".\", \",\") : s; };'))"
run_case "Sprachvergleich in buildingText.js" "buildingText.js entscheidet" rot

# 4 — Verwaister Schluessel im unfertigen Katalog.
printf 'export default { "zz.gibt.es.nicht": "hola" };\n' > src/i18n/es.js
run_case "erfundener Schluessel in es.js" "die die Quellsprache nicht kennt" rot

# 5 — Platzhalter kaputt, im unfertigen Katalog.
printf 'export default { "start.resume.sub": "Ciclo {cycle}" };\n' > src/i18n/es.js
run_case "fehlender Platzhalter in es.js" "dieselben Platzhalter" rot

# 6 — Fremdes Dezimalzeichen.
printf 'export default { "common.close": "Cerrar 2.25" };\n' > src/i18n/es.js
run_case "englischer Dezimalpunkt in es.js" "Dezimalzeichen einer anderen" rot

# 7 — Deutsches Zitatpaar im spanischen Katalog (ueber eine Datei, nicht ueber Shell-Escapes:
#      printf loest „ nicht auf, was diesen Fall beim ersten Anlauf still gruen machte).
node "$CC/break-quotes.mjs" es
run_case "deutsches Zitatpaar in es.js" "eigenes Anf" rot

# 7b — Quellsprache: schliessendes Zeichen ohne oeffnendes.
node "$CC/break-quotes.mjs" de
run_case "de: schliessendes Zeichen ohne oeffnendes" "ohne ihr" rot

# 8 — Luecke in der Formattabelle.
node -e "const f='src/i18n/index.js',fs=require('fs');fs.writeFileSync(f,fs.readFileSync(f,'utf8').replace('es: { dec: \",\", grp: \".\", pct: \"{n} %\", day: \"{dd}/{mm}\" },','es: { dec: \",\", grp: \".\", pct: \"{n} %\" },'))"
run_case "es-Zeile ohne Datumsformat" "Zeile in der Formattabelle" rot

# 9 — setLocale laesst eine unfertige Sprache durch.
node -e "const f='src/i18n/index.js',fs=require('fs');fs.writeFileSync(f,fs.readFileSync(f,'utf8').replace('const next = READY_LOCALE_IDS.includes(id)','const next = LOCALE_IDS.includes(id)'))"
run_case "setLocale nimmt eine unfertige Sprache an" "setLocale akzeptiert nur FERTIGE" rot

# 10 — Rueckfallkette gekappt.
node -e "const f='src/i18n/index.js',fs=require('fs');fs.writeFileSync(f,fs.readFileSync(f,'utf8').replace('ready: false, via: [\"en\"] }','ready: false }'))"
run_case "es ohne via-Kette faellt auf Deutsch" "nicht sofort auf die Quellsprache" rot

# 11 — Toter Schluessel: der Wächter muss ihn sehen, obwohl er in DREI Katalogen steht.
node -e "
const fs=require('fs');
for (const f of ['src/i18n/de.js','src/i18n/en.js']) fs.writeFileSync(f, fs.readFileSync(f,'utf8').replace('export default {','export default {\n  \"zz.toter.schluessel\": \"nie gerufen\",'));
fs.writeFileSync('src/i18n/es.js','export default { \"zz.toter.schluessel\": \"nunca\" };\n');
"
run_case "toter Schluessel, auch in es.js vorhanden" "wird auch irgendwo benutzt" rot

# 12 — Derselbe tote Schluessel, aber isCatalogue wieder hart auf (de|en):
#      es.js wird dann als QUELLTEXT gelesen, der Schluessel gilt als benutzt, der Waechter ist entwaffnet.
node -e "
const fs=require('fs');
for (const f of ['src/i18n/de.js','src/i18n/en.js']) fs.writeFileSync(f, fs.readFileSync(f,'utf8').replace('export default {','export default {\n  \"zz.toter.schluessel\": \"nie gerufen\",'));
fs.writeFileSync('src/i18n/es.js','export default { \"zz.toter.schluessel\": \"nunca\" };\n');
const t='test/i18n-guards.test.js';
fs.writeFileSync(t, fs.readFileSync(t,'utf8').replace('const isCatalogue = (u) => new RegExp(\`/i18n/(\${LOCALE_IDS.join(\"|\")})\\\\\\\\.js\$\`).test(u.pathname);','const isCatalogue = (u) => /\\\\/i18n\\\\/(de|en)\\\\.js\$/.test(u.pathname);'));
"
run_case "derselbe Fall mit hart getipptem (de|en) — entwaffnet" "wird auch irgendwo benutzt" gruen

echo
echo "=== $pass bestaetigt, $fail defekt ==="
git status --porcelain
[ $fail -eq 0 ]
