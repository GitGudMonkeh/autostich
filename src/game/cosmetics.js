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
     { kind: "noRerollRun" } → profile.hadNoRerollRun === true  (Lauf ohne benutzten Reroll, Sparfuchs deck_c3 · #214)
     { kind: "monoArchetypeRun", archetype } → profile.monoArchetypeRuns[archetype] (Lauf nur mit dieser Fraktion, #215 deck_c5..c8)
     { kind: "allArchetypesRun" }            → profile.hadAllArchetypesRun === true (Lauf mit allen vier Fraktionen, #215 deck_c9)
     { kind: "gottgleichRun" }  → profile.hadGottgleichRun === true       (#303: erstmals einen GOTTGLEICH-Stich getriggert)
     { kind: "meisterNoReroll" }→ profile.hadMeisterNoRerollRun === true  (#303 Sparfuchs: Meisterrang-Wochenlauf komplett ohne Reroll)
     { kind: "championWeek" }   → profile.hadChampionWeek === true        (#303 Meister: Platz 1 einer Wochen-Rangliste — Champion-Board)

   Katalog wächst „Deck für Deck": ein neues Deck = ein Eintrag hier + sein Bild-Paar in
   cosmeticAssets.js. Solange ein Bild-Asset noch nicht im Repo liegt, bleibt der Eintrag draußen
   (temporärer Umsetzungs-Zwischenstand); im fertigen Feature ist jeder Katalog-Eintrag sichtbar. */

export const DECK_DEFS = {
  default: { id: "default", name: "Standard",  unlock: null },
  // #299: alte „Läufe"-Progressions-Decks (deck_p1–4) + Challenge-Decks entfernt — sauberer Neustart mit Standard
  // (Prisma), Genesis und den kaufbaren DP-Packs. Die Freischalt-Kinds bleiben vorerst dormant in isUnlocked.
  // Deck-Werkstatt Kauf-Packs (#deckshop): als ganzes Pack mit SP kaufbar. „unlocked" = Pack im Besitz
  // (profile.ownedCosmetics["pack:<id>"]); die Pack-Registry (game/themes.js) treibt Kauf/Anzeige.
  deck_sunset: { id: "deck_sunset", name: "Sunset Rider", unlock: { kind: "buy", ownKey: "pack:sunset" } },
  deck_lofi:   { id: "deck_lofi",   name: "Lofi Nights",  unlock: { kind: "buy", ownKey: "pack:lofi" } },
  // #IP: deck_kaiju / deck_aura / deck_mecha entfernt.
  // v0.4 Kauf-Packs:
  deck_beach:      { id: "deck_beach",      name: "Malibu Wave",     unlock: { kind: "buy", ownKey: "pack:beach" } },
  deck_cat:        { id: "deck_cat",        name: "Aurora Whiskers", unlock: { kind: "buy", ownKey: "pack:cat" } },
  deck_ramen:      { id: "deck_ramen",      name: "Slurp City",      unlock: { kind: "buy", ownKey: "pack:ramen" } },
  deck_spacedog:   { id: "deck_spacedog",   name: "Star Pup",        unlock: { kind: "buy", ownKey: "pack:spacedog" } },
  deck_wale:       { id: "deck_wale",       name: "Moonwhale",       unlock: { kind: "buy", ownKey: "pack:wale" } },
  deck_onboarding: { id: "deck_onboarding", name: "Genesis",         unlock: { kind: "buy", ownKey: "pack:genesis" } },
  // #303 Challenge-Decks: NICHT kaufbar — je über eine Challenge freigeschaltet (das Deck definiert sein „cond"-Pack in themes.js).
  deck_gottgleich: { id: "deck_gottgleich", name: "Gottgleich", unlock: { kind: "gottgleichRun" } },
  deck_serie300:   { id: "deck_serie300",   name: "Serie 300",  unlock: { kind: "streak", n: 300 } },
  deck_serie600:   { id: "deck_serie600",   name: "Serie 600",  unlock: { kind: "streak", n: 600 } },
  deck_sparfuchs:  { id: "deck_sparfuchs",  name: "Sparfuchs",  unlock: { kind: "meisterNoReroll" } },
  deck_meister:    { id: "deck_meister",    name: "Meister",    unlock: { kind: "championWeek" } },
};

export const BATTLEFIELD_DEFS = {
  default: { id: "default", name: "Standard",       unlock: null },
  // #299: alte „Läufe"-Progressions-Battlefields (bf_1–4) entfernt. Deck-Werkstatt Kauf-Packs (#deckshop):
  // das Battlefield ist Teil des Packs (ein Besitz-Schlüssel).
  bf_sunset: { id: "bf_sunset", name: "Sunset Rider · Battlefield", unlock: { kind: "buy", ownKey: "pack:sunset" } },
  bf_lofi:   { id: "bf_lofi",   name: "Lofi Nights · Battlefield",  unlock: { kind: "buy", ownKey: "pack:lofi" } },
  // #IP: bf_kaiju / bf_aura / bf_mecha entfernt.
  // v0.4 Kauf-Packs (Battlefield = Teil des Packs, gleicher Besitz-Schlüssel):
  bf_beach:      { id: "bf_beach",      name: "Malibu Wave · Battlefield",     unlock: { kind: "buy", ownKey: "pack:beach" } },
  bf_cat:        { id: "bf_cat",        name: "Aurora Whiskers · Battlefield", unlock: { kind: "buy", ownKey: "pack:cat" } },
  bf_ramen:      { id: "bf_ramen",      name: "Slurp City · Battlefield",      unlock: { kind: "buy", ownKey: "pack:ramen" } },
  bf_spacedog:   { id: "bf_spacedog",   name: "Star Pup · Battlefield",        unlock: { kind: "buy", ownKey: "pack:spacedog" } },
  bf_wale:       { id: "bf_wale",       name: "Moonwhale · Battlefield",       unlock: { kind: "buy", ownKey: "pack:wale" } },
  bf_onboarding: { id: "bf_onboarding", name: "Genesis · Battlefield",         unlock: { kind: "buy", ownKey: "pack:genesis" } },
  // #303 Challenge-Battlefields (Teil des jeweiligen Challenge-Packs, gleiche Bedingung wie das Deck).
  bf_gottgleich: { id: "bf_gottgleich", name: "Gottgleich · Battlefield", unlock: { kind: "gottgleichRun" } },
  bf_serie300:   { id: "bf_serie300",   name: "Serie 300 · Battlefield",  unlock: { kind: "streak", n: 300 } },
  bf_serie600:   { id: "bf_serie600",   name: "Serie 600 · Battlefield",  unlock: { kind: "streak", n: 600 } },
  bf_sparfuchs:  { id: "bf_sparfuchs",  name: "Sparfuchs · Battlefield",  unlock: { kind: "meisterNoReroll" } },
  bf_meister:    { id: "bf_meister",    name: "Meister · Battlefield",    unlock: { kind: "championWeek" } },
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
    case "noRerollRun": return !!p.hadNoRerollRun; // #214 Sparfuchs
    case "monoArchetypeRun": return !!(p.monoArchetypeRuns && p.monoArchetypeRuns[u.archetype]); // #215: Lauf nur mit dieser Fraktion
    case "allArchetypesRun": return !!p.hadAllArchetypesRun;                                     // #215: Lauf mit allen vier
    case "gottgleichRun":   return !!p.hadGottgleichRun;      // #303: erstmals einen GOTTGLEICH-Stich getriggert
    case "meisterNoReroll": return !!p.hadMeisterNoRerollRun; // #303 Sparfuchs: Meisterrang-Wochenlauf ohne Reroll
    case "championWeek":    return !!p.hadChampionWeek;       // #303 Meister: Platz 1 einer Wochen-Rangliste (Champion-Board)
    case "buy":         return !!(p.ownedCosmetics && p.ownedCosmetics[u.ownKey]);               // #deckshop: mit SP gekauft (im Besitz)
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
    case "noRerollRun": {
      const done = !!p.hadNoRerollRun;
      return { done, cur: done ? 1 : 0, target: 1, label: "Schließe einen Lauf ab, ohne einen Reroll zu benutzen" };
    }
    case "monoArchetypeRun": {
      const done = !!(p.monoArchetypeRuns && p.monoArchetypeRuns[u.archetype]);
      return { done, cur: done ? 1 : 0, target: 1, label: `Schließe einen Lauf nur mit ${ARCH_LABEL[u.archetype] || u.archetype}-Skills ab` };
    }
    case "allArchetypesRun": {
      const done = !!p.hadAllArchetypesRun;
      return { done, cur: done ? 1 : 0, target: 1, label: "Schließe einen Lauf mit allen vier Elementen ab" };
    }
    case "gottgleichRun": {
      const done = !!p.hadGottgleichRun;
      return { done, cur: done ? 1 : 0, target: 1, label: "Triggere zum ersten Mal einen „Gottgleich“-Stich" };
    }
    case "meisterNoReroll": {
      const done = !!p.hadMeisterNoRerollRun;
      return { done, cur: done ? 1 : 0, target: 1, label: "Schließe einen Meisterrang-Wochenlauf ohne einen einzigen Reroll ab" };
    }
    case "championWeek": {
      const done = !!p.hadChampionWeek;
      return { done, cur: done ? 1 : 0, target: 1, label: "Beende eine Wochen-Rangliste auf Platz 1 (Champion-Board)" };
    }
    case "buy": {
      const done = !!(p.ownedCosmetics && p.ownedCosmetics[u.ownKey]);
      return { done, cur: done ? 1 : 0, target: 1, label: "In der Deck-Werkstatt kaufen (1 SP)" };
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
