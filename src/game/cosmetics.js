/* KOSMETIK-REGISTRY (#190) — Decks & Battlefield-Skins (rein kosmetisch, kein Gameplay-Effekt).

   PUR & node-testbar (Analogon zu SKILL_DEFS/FAMILY_DEFS): dieses Modul hält NUR die Katalog-
   Metadaten (id/name/unlock) + die Freischalt-Logik. Es importiert BEWUSST keine Bild-Assets —
   der game/-Layer wird in `environment: "node"` getestet und kann keine PNGs laden. Die echten
   Bild-URLs liegen UI-seitig (`src/ui/cosmeticAssets.js`), gekeyed über die id.

   Freischalt-Bedingung `unlock`:
     null                    → immer frei (Default = aktueller Look)
     { kind: "games",  n }   → profile.games      >= n   (gespielte Läufe)
     { kind: "streak", n }   → profile.bestStreak >= n
     { kind: "score",  n }   → profile.bestScore  >= n
     { kind: "noBuyRun" }    → profile.hadNoBuyRun    === true  (Lauf ohne Shop-Kauf — obsolet seit #202/#214, Shop dormant)
     { kind: "noRerollRun" } → profile.hadNoRerollRun === true  (Lauf ohne benutzten Reroll, Sparfuchs deck_c3 · #214)
     { kind: "monoStatRun" } → profile.hadMonoStatRun === true  (Lauf mit nur einem Stat, Challenge 4)
     { kind: "monoArchetypeRun", archetype } → profile.monoArchetypeRuns[archetype] (Lauf nur mit dieser Fraktion, #215 deck_c5..c8)
     { kind: "allArchetypesRun" }            → profile.hadAllArchetypesRun === true (Lauf mit allen vier Fraktionen, #215 deck_c9)
     { kind: "masteryGrade", n }             → profile.masteryGrade >= n (erreichter Meistergrad I..V, #217 deck_rank_*)

   Katalog wächst „Deck für Deck": ein neues Deck = ein Eintrag hier + sein Bild-Paar in
   cosmeticAssets.js. Solange ein Bild-Asset noch nicht im Repo liegt, bleibt der Eintrag draußen
   (temporärer Umsetzungs-Zwischenstand); im fertigen Feature ist jeder Katalog-Eintrag sichtbar. */

import { MASTERY_ROMAN } from "./mastery.js"; // #217: römische Grad-Ziffer für die Deck-Freischalt-Labels

// Progressions-Schwellen (gespielte Läufe) — Issue #190.
export const DECK_GAME_UNLOCKS = [5, 15, 25, 35];        // deck_p1..p4
export const BATTLEFIELD_GAME_UNLOCKS = [10, 20, 30, 40]; // bf_1..bf_4

export const DECK_DEFS = {
  default: { id: "default", name: "Standard",  unlock: null },
  // Progression (5/15/25/35 Läufe):
  deck_p1: { id: "deck_p1", name: "Neonstadt",         unlock: { kind: "games", n: 5 } },
  deck_p2: { id: "deck_p2", name: "Tankstopp",         unlock: { kind: "games", n: 15 } },
  deck_p3: { id: "deck_p3", name: "Megacity",          unlock: { kind: "games", n: 25 } },
  deck_p4: { id: "deck_p4", name: "Mondpagode",        unlock: { kind: "games", n: 35 } },
  // Challenge-Decks (nur Decks, keine Battlefields):
  deck_c1: { id: "deck_c1", name: "Endloskette",       unlock: { kind: "streak", n: 100 } },
  deck_c2: { id: "deck_c2", name: "Rekordhalter",      unlock: { kind: "score",  n: 10_000_000 } },
  deck_c3: { id: "deck_c3", name: "Sparfuchs",         unlock: { kind: "noRerollRun" } }, // #214: löst noBuyRun ab (Shop → Architekt, #202)
  // deck_c4 (monoStatRun) folgt.
  // Archetyp-Challenge-Decks (#215): Mono-Archetyp-Lauf je Fraktion + Element-Bund (alle vier).
  deck_c5: { id: "deck_c5", name: "Reines Feuer",  unlock: { kind: "monoArchetypeRun", archetype: "fire" } },
  deck_c6: { id: "deck_c6", name: "Reiner Blitz",  unlock: { kind: "monoArchetypeRun", archetype: "lightning" } },
  deck_c7: { id: "deck_c7", name: "Reines Eis",    unlock: { kind: "monoArchetypeRun", archetype: "ice" } },
  deck_c8: { id: "deck_c8", name: "Reine Pflanze", unlock: { kind: "monoArchetypeRun", archetype: "plant" } },
  deck_c9: { id: "deck_c9", name: "Element-Bund",  unlock: { kind: "allArchetypesRun" } },
  // Meistergrad-Decks (#217): je erreichter Grad (I..V) schaltet eines frei — Beweis der laufübergreifenden Meisterschaft.
  deck_rank_bronze:  { id: "deck_rank_bronze",  name: "Bronze",  unlock: { kind: "masteryGrade", n: 1 } },
  deck_rank_silber:  { id: "deck_rank_silber",  name: "Silber",  unlock: { kind: "masteryGrade", n: 2 } },
  deck_rank_gold:    { id: "deck_rank_gold",    name: "Gold",    unlock: { kind: "masteryGrade", n: 3 } },
  deck_rank_platin:  { id: "deck_rank_platin",  name: "Platin",  unlock: { kind: "masteryGrade", n: 4 } },
  deck_rank_diamond: { id: "deck_rank_diamond", name: "Diamant", unlock: { kind: "masteryGrade", n: 5 } },
};

export const BATTLEFIELD_DEFS = {
  default: { id: "default", name: "Standard",       unlock: null },
  // Progression (10/20/30/40 Läufe):
  bf_1:    { id: "bf_1",    name: "Neon-Boulevard",  unlock: { kind: "games", n: 10 } },
  bf_2:    { id: "bf_2",    name: "Nachttankstelle", unlock: { kind: "games", n: 20 } },
  bf_3:    { id: "bf_3",    name: "Neon City",       unlock: { kind: "games", n: 30 } },
  bf_4:    { id: "bf_4",    name: "Mondsee",         unlock: { kind: "games", n: 40 } },
  // Battlefields KOMPLETT (4 Progressionen + Default). Battlefields haben KEINE Challenge-Varianten (Issue #190).
};

// Tausender-Punkte ohne ICU-Abhängigkeit (node-Tests deterministisch): 10000000 → "10.000.000".
const grp = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
// #215: Anzeigenamen der Fraktionen für die Freischalt-Labels (Archetyp-Decks).
const ARCH_LABEL = { fire: "Feuer", lightning: "Blitz", ice: "Eis", plant: "Pflanze" };

// Reine Freischalt-Prüfung. Unbekannte kinds blockieren NICHT (defensiv: neuer kind ohne Code-Update
// soll kein Deck unsichtbar-gesperrt lassen).
export function isUnlocked(def, profile) {
  const u = def && def.unlock;
  if (!u) return true;
  const p = profile || {};
  switch (u.kind) {
    case "games":       return (p.games      || 0) >= u.n;
    case "streak":      return (p.bestStreak || 0) >= u.n;
    case "score":       return (p.bestScore  || 0) >= u.n;
    case "noBuyRun":    return !!p.hadNoBuyRun;
    case "noRerollRun": return !!p.hadNoRerollRun; // #214 Sparfuchs
    case "monoStatRun": return !!p.hadMonoStatRun;
    case "monoArchetypeRun": return !!(p.monoArchetypeRuns && p.monoArchetypeRuns[u.archetype]); // #215: Lauf nur mit dieser Fraktion
    case "allArchetypesRun": return !!p.hadAllArchetypesRun;                                     // #215: Lauf mit allen vier
    case "masteryGrade": return (p.masteryGrade || 0) >= u.n;                                    // #217: erreichter Meistergrad
    default:            return true;
  }
}

// Anzeige-Fortschritt für den Kollektion-Screen (analog runStats.achievements()):
//   { done, cur, target, label } — label = Klartext-Bedingung; cur/target = Fortschritt.
// Zählbare kinds liefern cur (auf target gedeckelt) + target; Flag-Challenges target=1, cur 0/1.
export function unlockProgress(def, profile) {
  const u = def && def.unlock;
  if (!u) return { done: true, cur: 1, target: 1, label: "Immer verfügbar" };
  const p = profile || {};
  switch (u.kind) {
    case "games": {
      const have = p.games || 0;
      return { done: have >= u.n, cur: Math.min(have, u.n), target: u.n, label: `Spiele ${u.n} Läufe` };
    }
    case "streak": {
      const have = p.bestStreak || 0;
      return { done: have >= u.n, cur: Math.min(have, u.n), target: u.n, label: `Erreiche eine Serie von ${u.n}` };
    }
    case "score": {
      const have = p.bestScore || 0;
      return { done: have >= u.n, cur: Math.min(have, u.n), target: u.n, label: `Erreiche Score ${grp(u.n)}` };
    }
    case "noBuyRun": {
      const done = !!p.hadNoBuyRun;
      return { done, cur: done ? 1 : 0, target: 1, label: "Schließe einen Lauf ohne einen einzigen Shop-Kauf ab" };
    }
    case "noRerollRun": {
      const done = !!p.hadNoRerollRun;
      return { done, cur: done ? 1 : 0, target: 1, label: "Schließe einen Lauf ab, ohne einen Reroll zu benutzen" };
    }
    case "monoStatRun": {
      const done = !!p.hadMonoStatRun;
      return { done, cur: done ? 1 : 0, target: 1, label: "Wähle in einem Lauf immer nur denselben Stat" };
    }
    case "monoArchetypeRun": {
      const done = !!(p.monoArchetypeRuns && p.monoArchetypeRuns[u.archetype]);
      return { done, cur: done ? 1 : 0, target: 1, label: `Schließe einen Lauf nur mit ${ARCH_LABEL[u.archetype] || u.archetype}-Skills ab` };
    }
    case "allArchetypesRun": {
      const done = !!p.hadAllArchetypesRun;
      return { done, cur: done ? 1 : 0, target: 1, label: "Schließe einen Lauf mit allen vier Elementen ab" };
    }
    case "masteryGrade": {
      const have = p.masteryGrade || 0;
      return { done: have >= u.n, cur: Math.min(have, u.n), target: u.n, label: `Erreiche Meister-${MASTERY_ROMAN[u.n] || u.n}` };
    }
    default:
      return { done: true, cur: 1, target: 1, label: "" };
  }
}

// Defensiver Resolver: gib die gewählte id nur zurück, wenn sie existiert UND freigeschaltet ist,
// sonst "default". Nutzt die UI beim Rendern (gespeicherter Skin könnte weg/gesperrt sein).
export function resolveSkinId(defs, id, profile) {
  const def = defs && defs[id];
  if (def && isUnlocked(def, profile)) return id;
  return "default";
}
