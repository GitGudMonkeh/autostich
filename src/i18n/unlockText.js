/* FREISCHALT-BEDINGUNGEN als Klartext (#sprache).

   `unlockProgress` (src/game/cosmetics.js) liefert nur noch `kind` + `vars` — der Satz entsteht
   hier. Dasselbe Muster wie bei den Architekt-Effekttexten (buildingText.js) und aus demselben
   Grund: ein `import { t }` in cosmetics.js wäre ein Zyklus
   (cosmetics.js → i18n/index.js → de.js → cosmetics.js), und ein zweiter deutscher Text im
   Katalog neben dem im Register wäre eine Drift-Quelle.

   Die Archetyp-Namen kommen aus dem Archetyp-Register (übersetzt), nicht aus einer eigenen Liste —
   vorher stand in cosmetics.js eine zweite Kopie von „Feuer/Blitz/Eis/Pflanze". */
import { t, fmtNum } from "./index.js";
import { archetypeLabel } from "./labels.js";

export function unlockLabel(progress) {
  if (!progress || !progress.kind) return "";
  const { kind, vars = {} } = progress;
  const filled = { ...vars };
  if (vars.n != null) filled.n = fmtNum(vars.n);            // Score-Schwellen sind sechsstellig
  if (vars.archetype) filled.archetype = archetypeLabel(vars.archetype);
  /* #: Singularform, wo eine Bedingung bei n = 1 steht. Vorher gab es keine — die kleinste Schwelle war
     Hirsch mit 10 Läufen —, bis „Insert Coin“ bei 1 aufging und „Spiele 1 Läufe“ / „Play 1 runs“ ausgab.
     Der `.one`-Schlüssel ist optional: fehlt er für ein kind, bleibt es beim Plural-Text. */
  const base = `unlock.${kind}`;
  const one = `${base}.one`;
  const key = Number(vars.n) === 1 && t(one, filled) !== one ? one : base;
  const s = t(key, filled);
  return s === key ? "" : s;   // unbekanntes kind → leer (wie der Default-Zweig vorher)
}
