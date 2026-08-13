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
     { kind: "monoArchetypeRun", archetype, n } → profile.monoArchetypeRuns[archetype] >= n (#310: n Mono-Läufe dieser Fraktion — deck_feuer/eis/blitz/pflanze)
     { kind: "allMonoArchetypes", n }           → alle vier monoArchetypeRuns[*] >= n (#310: alle Element-Decks frei → Prisma-Multi deck_elementar)
     { kind: "allArchetypesRun" }               → profile.hadAllArchetypesRun === true (EIN Lauf mit allen vier Fraktionen, #215)
     { kind: "gottgleichRun" }  → profile.hadGottgleichRun === true       (#303: erstmals einen GOTTGLEICH-Stich getriggert)
     { kind: "meisterNoReroll" }→ profile.hadMeisterNoRerollRun === true  (#303 Sparfuchs: Meisterrang-Wochenlauf komplett ohne Reroll)
     { kind: "championWeek" }   → profile.hadChampionWeek === true        (#303 Meister: Platz 1 einer Wochen-Rangliste — Champion-Board)
     { kind: "onboardingDone" } → onboarding >= 6 (Genesis — Onboarding-Starter, frei nach abgeschlossenem Onboarding)

   Katalog wächst „Deck für Deck": ein neues Deck = ein Eintrag hier + sein Bild-Paar in
   cosmeticAssets.js. Solange ein Bild-Asset noch nicht im Repo liegt, bleibt der Eintrag draußen
   (temporärer Umsetzungs-Zwischenstand); im fertigen Feature ist jeder Katalog-Eintrag sichtbar. */
import { onboardingDone } from "./progression.js"; // #: Genesis-Freischaltung koppelt an abgeschlossenes Onboarding (6/6)

// #310: Element-Challenge-Decks verlangen N abgeschlossene Läufe mit reinem Mono-Build der Fraktion
// (extends #215 „1 Lauf" → Zähler). Prisma (Element-Bund) = alle vier Element-Decks frei (quasi 4×N Läufe).
export const MONO_CHALLENGE_N = 5;

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
  deck_cat:        { id: "deck_cat",        name: "Biolumen", unlock: { kind: "buy", ownKey: "pack:cat" } },
  deck_ramen:      { id: "deck_ramen",      name: "Slurp City",      unlock: { kind: "buy", ownKey: "pack:ramen" } },
  deck_spacedog:   { id: "deck_spacedog",   name: "Star Pup",        unlock: { kind: "buy", ownKey: "pack:spacedog" } },
  deck_wale:       { id: "deck_wale",       name: "Moonwhale",       unlock: { kind: "buy", ownKey: "pack:wale" } },
  deck_onboarding: { id: "deck_onboarding", name: "Genesis",         unlock: { kind: "onboardingDone" } }, // #: Onboarding-Freischalt-Deck (NICHT kaufbar) — frei nach abgeschlossenem Onboarding
  // #303 Challenge-Decks: NICHT kaufbar — je über eine Challenge freigeschaltet (das Deck definiert sein „cond"-Pack in themes.js).
  deck_gottgleich: { id: "deck_gottgleich", name: "Gottgleich", unlock: { kind: "gottgleichRun" } },
  deck_serie300:   { id: "deck_serie300",   name: "Serie 300",  unlock: { kind: "streak", n: 300 } },
  deck_serie600:   { id: "deck_serie600",   name: "Serie 600",  unlock: { kind: "streak", n: 600 } },
  deck_sparfuchs:  { id: "deck_sparfuchs",  name: "Sparfuchs",  unlock: { kind: "meisterNoReroll" } },
  deck_meister:    { id: "deck_meister",    name: "Meister",    unlock: { kind: "championWeek" } },
  // #310 Element-Challenge-Decks (Freischalt via N Mono-Läufe je Fraktion):
  deck_feuer:     { id: "deck_feuer",     name: "Feuer",   unlock: { kind: "monoArchetypeRun", archetype: "fire",      n: MONO_CHALLENGE_N } },
  deck_eis:       { id: "deck_eis",       name: "Eis",     unlock: { kind: "monoArchetypeRun", archetype: "ice",       n: MONO_CHALLENGE_N } },
  deck_blitz:     { id: "deck_blitz",     name: "Blitz",   unlock: { kind: "monoArchetypeRun", archetype: "lightning", n: MONO_CHALLENGE_N } },
  deck_pflanze:   { id: "deck_pflanze",   name: "Pflanze", unlock: { kind: "monoArchetypeRun", archetype: "plant",     n: MONO_CHALLENGE_N } },
  // #310 Prisma (Multi/Element-Bund): frei, sobald alle vier Element-Decks freigeschaltet sind.
  deck_elementar: { id: "deck_elementar", name: "Prisma",  unlock: { kind: "allMonoArchetypes", n: MONO_CHALLENGE_N } },
  // #310 DP-Kauf-Packs (Preis in themes.js):
  deck_ronin:     { id: "deck_ronin",     name: "Ronin",          unlock: { kind: "buy", ownKey: "pack:ronin" } },
  deck_kosmos:    { id: "deck_kosmos",    name: "Schwarzes Loch", unlock: { kind: "buy", ownKey: "pack:kosmos" } },
  deck_oni:       { id: "deck_oni",       name: "Roter Oni",      unlock: { kind: "buy", ownKey: "pack:oni" } },
  deck_geometrie: { id: "deck_geometrie", name: "Metatron",       unlock: { kind: "buy", ownKey: "pack:geometrie" } },
  // #311 DP-Kauf-Packs (je 10 DP, Preis in themes.js):
  deck_sonne:  { id: "deck_sonne",  name: "Sonnenfinsternis", unlock: { kind: "buy", ownKey: "pack:sonne" } },
  deck_drache: { id: "deck_drache", name: "Laternenfest",     unlock: { kind: "buy", ownKey: "pack:drache" } },
  // #312 DP-Kauf-Packs (je 10 DP, Preis in themes.js):
  deck_arcade:     { id: "deck_arcade",     name: "Arcade",     unlock: { kind: "buy", ownKey: "pack:arcade" } },
  deck_polarlicht: { id: "deck_polarlicht", name: "Polarlicht", unlock: { kind: "buy", ownKey: "pack:polarlicht" } },
  deck_seedrache:  { id: "deck_seedrache",  name: "Seedrache",  unlock: { kind: "buy", ownKey: "pack:seedrache" } },
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
  bf_cat:        { id: "bf_cat",        name: "Biolumen · Battlefield", unlock: { kind: "buy", ownKey: "pack:cat" } },
  bf_ramen:      { id: "bf_ramen",      name: "Slurp City · Battlefield",      unlock: { kind: "buy", ownKey: "pack:ramen" } },
  bf_spacedog:   { id: "bf_spacedog",   name: "Star Pup · Battlefield",        unlock: { kind: "buy", ownKey: "pack:spacedog" } },
  bf_wale:       { id: "bf_wale",       name: "Moonwhale · Battlefield",       unlock: { kind: "buy", ownKey: "pack:wale" } },
  bf_onboarding: { id: "bf_onboarding", name: "Genesis · Battlefield",         unlock: { kind: "onboardingDone" } }, // #: wie deck_onboarding — via Onboarding-Abschluss frei
  // #303 Challenge-Battlefields (Teil des jeweiligen Challenge-Packs, gleiche Bedingung wie das Deck).
  bf_gottgleich: { id: "bf_gottgleich", name: "Gottgleich · Battlefield", unlock: { kind: "gottgleichRun" } },
  bf_serie300:   { id: "bf_serie300",   name: "Serie 300 · Battlefield",  unlock: { kind: "streak", n: 300 } },
  bf_serie600:   { id: "bf_serie600",   name: "Serie 600 · Battlefield",  unlock: { kind: "streak", n: 600 } },
  bf_sparfuchs:  { id: "bf_sparfuchs",  name: "Sparfuchs · Battlefield",  unlock: { kind: "meisterNoReroll" } },
  bf_meister:    { id: "bf_meister",    name: "Meister · Battlefield",    unlock: { kind: "championWeek" } },
  // #310 Element-Challenge-Battlefields (gleiche Bedingung wie ihr Deck) + Prisma + DP-Kauf-Packs:
  bf_feuer:     { id: "bf_feuer",     name: "Feuer · Battlefield",          unlock: { kind: "monoArchetypeRun", archetype: "fire",      n: MONO_CHALLENGE_N } },
  bf_eis:       { id: "bf_eis",       name: "Eis · Battlefield",            unlock: { kind: "monoArchetypeRun", archetype: "ice",       n: MONO_CHALLENGE_N } },
  bf_blitz:     { id: "bf_blitz",     name: "Blitz · Battlefield",          unlock: { kind: "monoArchetypeRun", archetype: "lightning", n: MONO_CHALLENGE_N } },
  bf_pflanze:   { id: "bf_pflanze",   name: "Pflanze · Battlefield",        unlock: { kind: "monoArchetypeRun", archetype: "plant",     n: MONO_CHALLENGE_N } },
  bf_elementar: { id: "bf_elementar", name: "Prisma · Battlefield",         unlock: { kind: "allMonoArchetypes", n: MONO_CHALLENGE_N } },
  bf_ronin:     { id: "bf_ronin",     name: "Ronin · Battlefield",          unlock: { kind: "buy", ownKey: "pack:ronin" } },
  bf_kosmos:    { id: "bf_kosmos",    name: "Schwarzes Loch · Battlefield", unlock: { kind: "buy", ownKey: "pack:kosmos" } },
  bf_oni:       { id: "bf_oni",       name: "Roter Oni · Battlefield",      unlock: { kind: "buy", ownKey: "pack:oni" } },
  bf_geometrie: { id: "bf_geometrie", name: "Metatron · Battlefield",       unlock: { kind: "buy", ownKey: "pack:geometrie" } },
  // #311 DP-Kauf-Packs:
  bf_sonne:  { id: "bf_sonne",  name: "Sonnenfinsternis · Battlefield", unlock: { kind: "buy", ownKey: "pack:sonne" } },
  bf_drache: { id: "bf_drache", name: "Laternenfest · Battlefield",     unlock: { kind: "buy", ownKey: "pack:drache" } },
  // #312 DP-Kauf-Packs:
  bf_arcade:     { id: "bf_arcade",     name: "Arcade · Battlefield",     unlock: { kind: "buy", ownKey: "pack:arcade" } },
  bf_polarlicht: { id: "bf_polarlicht", name: "Polarlicht · Battlefield", unlock: { kind: "buy", ownKey: "pack:polarlicht" } },
  bf_seedrache:  { id: "bf_seedrache",  name: "Seedrache · Battlefield",  unlock: { kind: "buy", ownKey: "pack:seedrache" } },
};

// Tausender-Punkte ohne ICU-Abhängigkeit (node-Tests deterministisch): 10000000 → "10.000.000".
const grp = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
// #215: Anzeigenamen der Fraktionen für die Freischalt-Labels (Archetyp-Decks).
const ARCH_LABEL = { fire: "Feuer", lightning: "Blitz", ice: "Eis", plant: "Pflanze" };
const ARCHS = Object.keys(ARCH_LABEL);
// #310: robuster Mono-Lauf-Zähler je Fraktion. Toleriert Alt-Werte (Boolean true → 1) und fehlende Map.
const monoCount = (p, a) => {
  const m = p && p.monoArchetypeRuns;
  const v = m ? Number(m[a]) : 0;
  return Number.isFinite(v) && v > 0 ? v : 0;
};

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
    case "monoArchetypeRun": return monoCount(p, u.archetype) >= (u.n || 1);                     // #310: N Mono-Läufe dieser Fraktion
    case "allMonoArchetypes": return ARCHS.every((a) => monoCount(p, a) >= (u.n || 1));           // #310: alle vier Element-Decks frei (Prisma-Multi)
    case "allArchetypesRun": return !!p.hadAllArchetypesRun;                                     // #215: Lauf mit allen vier
    case "gottgleichRun":   return !!p.hadGottgleichRun;      // #303: erstmals einen GOTTGLEICH-Stich getriggert
    case "meisterNoReroll": return !!p.hadMeisterNoRerollRun; // #303 Sparfuchs: Meisterrang-Wochenlauf ohne Reroll
    case "championWeek":    return !!p.hadChampionWeek;       // #303 Meister: Platz 1 einer Wochen-Rangliste (Champion-Board)
    case "buy":         return !!(p.ownedCosmetics && p.ownedCosmetics[u.ownKey]);               // #deckshop: mit SP gekauft (im Besitz)
    case "onboardingDone": return onboardingDone(p);                                             // #: Genesis — Onboarding abgeschlossen (6/6)
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
      const need = u.n || 1;
      const have = monoCount(p, u.archetype);
      return { done: have >= need, cur: Math.min(have, need), target: need,
        label: `Schließe ${need} Läufe nur mit ${ARCH_LABEL[u.archetype] || u.archetype}-Skills ab` };
    }
    case "allMonoArchetypes": {
      const need = u.n || 1;
      const have = ARCHS.reduce((acc, a) => acc + (monoCount(p, a) >= need ? 1 : 0), 0);
      return { done: have >= ARCHS.length, cur: have, target: ARCHS.length,
        label: `Schalte alle vier Element-Decks frei (je ${need} Mono-Läufe)` };
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
    case "onboardingDone": {
      const done = onboardingDone(p);
      return { done, cur: done ? 1 : 0, target: 1, label: "Schließe das Onboarding ab" };
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
