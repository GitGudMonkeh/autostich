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
     { kind: "noBuyRun" }    → profile.hadNoBuyRun    === true  (Lauf ohne Shop-Kauf, Challenge 3)
     { kind: "monoStatRun" } → profile.hadMonoStatRun === true  (Lauf mit nur einem Stat, Challenge 4)

   Katalog wächst „Deck für Deck": ein neues Deck = ein Eintrag hier + sein Bild-Paar in
   cosmeticAssets.js. Solange ein Bild-Asset noch nicht im Repo liegt, bleibt der Eintrag draußen
   (temporärer Umsetzungs-Zwischenstand); im fertigen Feature ist jeder Katalog-Eintrag sichtbar. */

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
  deck_c3: { id: "deck_c3", name: "Sparfuchs",         unlock: { kind: "noBuyRun" } },
  // deck_c4 (monoStatRun) folgt.
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
    case "monoStatRun": return !!p.hadMonoStatRun;
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
    case "monoStatRun": {
      const done = !!p.hadMonoStatRun;
      return { done, cur: done ? 1 : 0, target: 1, label: "Wähle in einem Lauf immer nur denselben Stat" };
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
