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
  const key = `unlock.${kind}`;
  const filled = { ...vars };
  if (vars.n != null) filled.n = fmtNum(vars.n);            // Score-Schwellen sind sechsstellig
  if (vars.archetype) filled.archetype = archetypeLabel(vars.archetype);
  const s = t(key, filled);
  return s === key ? "" : s;   // unbekanntes kind → leer (wie der Default-Zweig vorher)
}
