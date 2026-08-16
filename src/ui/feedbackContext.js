/* AUTO-KONTEXT eines Reports (#396).

   Der eigentliche Wert des Melders: Version, Umgebung, letzter Lauf, Gerät und die letzten
   JS-Fehler gehen ohne Zutun mit. Ein Report ohne Seed und Runde ist bei diesem Spiel praktisch
   nicht reproduzierbar.

   Getrennt vom Modal, weil das Zusammensuchen reine Datenarbeit ist und sich so ohne Rendern
   testen lässt. Alle Quellen sind optional — fehlt eine, bleibt das Feld einfach leer. */
import { loadActiveRun, loadRunHistory, loadOptions } from "../game/storage.js";
import { VERSION_FULL, BUILD_ENV } from "./version.js";
import { errorLog } from "./errorBuffer.js";

/* Der Lauf, auf den sich die Meldung bezieht: bevorzugt der noch fortsetzbare (der Spieler ist
   gerade herausgegangen), sonst der jüngste abgeschlossene aus der Historie. Beides kann fehlen —
   dann meldet jemand vor seinem ersten Lauf, was völlig in Ordnung ist.
   Gibt eine flache, anzeigbare Form zurück (der Aufrufer zeigt sie und darf sie abwählen). */
export function lastRunContext() {
  const active = loadActiveRun();
  if (active && active.state) {
    const st = active.state;
    return {
      source: "active",
      seed: st.seed ?? null,
      cycle: (Number(st.cycle) || 0) + 1,   // intern 0-basiert, angezeigt 1-basiert
      score: Math.floor(Number(st.score) || 0),
    };
  }
  const hist = loadRunHistory();
  const last = Array.isArray(hist) && hist.length ? hist[0] : null;   // Historie ist neueste-zuerst
  if (last) {
    return {
      source: "history",
      seed: last.seed ?? null,
      cycle: last.cycles != null ? Number(last.cycles) : null,
      score: Math.floor(Number(last.score) || 0),
    };
  }
  return null;
}

// Gewähltes Deck/Battlefield — die Kosmetik erklärt einen Teil der Grafik-Bugs. Die Wahl liegt in
// den OPTIONEN (deckId/battlefieldId), nicht im Profil: das Profil führt nur den Besitz.
function skins() {
  try {
    const o = loadOptions() || {};
    return { deck: o.deckId || null, battlefield: o.battlefieldId || null };
  } catch (e) { return { deck: null, battlefield: null }; }
}

/* Der vollständige Kontext für den Insert. `run` = das Ergebnis von lastRunContext() oder null,
   wenn der Melder die Zuordnung abgewählt hat. `win` ist Parameter, damit der Test ihn stellen
   kann (und damit die Funktion außerhalb eines Browsers nicht knallt). */
export function buildContext(run, win = typeof window !== "undefined" ? window : null) {
  const { deck, battlefield } = skins();
  const vp = win && win.innerWidth ? `${win.innerWidth}x${win.innerHeight}` : null;
  return {
    version: VERSION_FULL,
    build_env: BUILD_ENV,
    seed: run ? run.seed : null,
    cycle: run ? run.cycle : null,
    score: run ? run.score : null,
    deck,
    battlefield,
    ua: win && win.navigator ? win.navigator.userAgent : null,
    viewport: vp,
    errors: errorLog() || null,
  };
}
