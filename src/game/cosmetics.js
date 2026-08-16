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
     { kind: "championWeek", n } → profile.championWeeks >= n (Default 1) (#303 Meister: n× Platz 1 einer Wochen-Rangliste — Champion-Board;
                                   das alte Boolean `hadChampionWeek` zählt weiterhin als 1)
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
  deck_lofi:   { id: "deck_lofi",   name: "Kitsune",      unlock: { kind: "buy", ownKey: "pack:lofi" } },
  // #IP: deck_kaiju / deck_aura / deck_mecha entfernt.
  // v0.4 Kauf-Packs:
  deck_beach:      { id: "deck_beach",      name: "Malibu Wave",     unlock: { kind: "buy", ownKey: "pack:beach" } },
  deck_cat:        { id: "deck_cat",        name: "Biolumen", unlock: { kind: "buy", ownKey: "pack:cat" } },
  deck_spacedog:   { id: "deck_spacedog",   name: "Kosmospanther",   unlock: { kind: "buy", ownKey: "pack:spacedog" } },
  deck_wale:       { id: "deck_wale",       name: "Moonwhale",       unlock: { kind: "buy", ownKey: "pack:wale" } },
  deck_onboarding: { id: "deck_onboarding", name: "Genesis",         unlock: { kind: "onboardingDone" } }, // #: Onboarding-Freischalt-Deck (NICHT kaufbar) — frei nach abgeschlossenem Onboarding
  // #303 Challenge-Decks: NICHT kaufbar — je über eine Challenge freigeschaltet (das Deck definiert sein „cond"-Pack in themes.js).
  deck_gottgleich: { id: "deck_gottgleich", name: "Ascension", unlock: { kind: "gottgleichRun" } },
  deck_serie300:   { id: "deck_serie300",   name: "Flamingo",   unlock: { kind: "streak", n: 300 } },
  deck_serie600:   { id: "deck_serie600",   name: "Peacock",    unlock: { kind: "streak", n: 600 } },
  deck_serie1500:  { id: "deck_serie1500",  name: "Königspfau", unlock: { kind: "streak", n: 1500 } },
  deck_sparfuchs:  { id: "deck_sparfuchs",  name: "Sparfuchs",  unlock: { kind: "meisterNoReroll" } },
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
  deck_geometrie: { id: "deck_geometrie", name: "Seraph",         unlock: { kind: "buy", ownKey: "pack:geometrie" } },
  // #311 DP-Kauf-Packs (je 10 DP, Preis in themes.js):
  deck_sonne:  { id: "deck_sonne",  name: "Kolossus",         unlock: { kind: "buy", ownKey: "pack:sonne" } },
  deck_drache: { id: "deck_drache", name: "Laternenfest",     unlock: { kind: "buy", ownKey: "pack:drache" } },
  // #312 DP-Kauf-Packs (je 10 DP, Preis in themes.js):
  deck_arcade:     { id: "deck_arcade",     name: "Beryll",     unlock: { kind: "buy", ownKey: "pack:arcade" } },
  deck_polarlicht: { id: "deck_polarlicht", name: "Scarab",     unlock: { kind: "buy", ownKey: "pack:polarlicht" } },
  deck_seedrache:  { id: "deck_seedrache",  name: "Eldritch",   unlock: { kind: "buy", ownKey: "pack:seedrache" } },
  deck_obsidian:   { id: "deck_obsidian",   name: "Obsidian",   unlock: { kind: "buy", ownKey: "pack:obsidian" } },
  // #tiered Titan — Stufen-Challenge über Score (25/50/100 Mio). Die drei Skins sind einzeln freischaltbar.
  deck_titan1:  { id: "deck_titan1",  name: "Titan · Erwachen",   unlock: { kind: "score", n: 25000000 } },
  deck_titan2:  { id: "deck_titan2",  name: "Titan · Aufstieg",   unlock: { kind: "score", n: 50000000 } },
  deck_titan3:  { id: "deck_titan3",  name: "Titan · Entfesselt", unlock: { kind: "score", n: 100000000 } },
  // #tiered Hirsch — Stufen-Challenge über abgeschlossene Läufe (10/20/30).
  deck_hirsch1: { id: "deck_hirsch1", name: "Hirsch · Sternbild",  unlock: { kind: "games", n: 10 } },
  deck_hirsch2: { id: "deck_hirsch2", name: "Hirsch · Erwacht",    unlock: { kind: "games", n: 20 } },
  deck_hirsch3: { id: "deck_hirsch3", name: "Hirsch · Sternenlauf", unlock: { kind: "games", n: 30 } },
  // #tiered Thron — Ranglisten-Serie über gewonnene Wochen (Platz 1 im Meister-Wochen-Board, 1./2./3. Sieg).
  deck_thron1: { id: "deck_thron1", name: "Thron · Anwärter",     unlock: { kind: "championWeek", n: 1 } },
  deck_thron2: { id: "deck_thron2", name: "Thron · Souverän",     unlock: { kind: "championWeek", n: 2 } },
  deck_thron3: { id: "deck_thron3", name: "Thron · Unsterblich",  unlock: { kind: "championWeek", n: 3 } },
  // #deck40 vier DP-Kauf-Packs à 40 DP (Legendär): Gaia · Glazius · Voltaris · Pyrros
  deck_gaia:     { id: "deck_gaia",     name: "Gaia",     unlock: { kind: "buy", ownKey: "pack:gaia" } },
  deck_glazius:  { id: "deck_glazius",  name: "Glazius",  unlock: { kind: "buy", ownKey: "pack:glazius" } },
  deck_voltaris: { id: "deck_voltaris", name: "Voltaris", unlock: { kind: "buy", ownKey: "pack:voltaris" } },
  deck_pyrros:   { id: "deck_pyrros",   name: "Pyrros",   unlock: { kind: "buy", ownKey: "pack:pyrros" } },
};

/* Sprachprüfung: Der Spielfeld-Name ist der DECK-Name plus Suffix. Vorher stand jeder der 27 Namen
   hier ein zweites Mal abgetippt — beim Umbenennen eines Decks wäre das Spielfeld zurückgeblieben.
   Jetzt eine Quelle; nur das Suffix ist eigener Text. */
export const BF_SUFFIX = " · Battlefield";
const bfName = (deckId) => `${DECK_DEFS[deckId].name}${BF_SUFFIX}`;

export const BATTLEFIELD_DEFS = {
  default: { id: "default", name: "Standard",       unlock: null },
  // #299: alte „Läufe"-Progressions-Battlefields (bf_1–4) entfernt. Deck-Werkstatt Kauf-Packs (#deckshop):
  // das Battlefield ist Teil des Packs (ein Besitz-Schlüssel).
  bf_sunset: { id: "bf_sunset", name: bfName("deck_sunset"), unlock: { kind: "buy", ownKey: "pack:sunset" } },
  bf_lofi:   { id: "bf_lofi",   name: bfName("deck_lofi"),      unlock: { kind: "buy", ownKey: "pack:lofi" } },
  // #IP: bf_kaiju / bf_aura / bf_mecha entfernt.
  // v0.4 Kauf-Packs (Battlefield = Teil des Packs, gleicher Besitz-Schlüssel):
  bf_beach:      { id: "bf_beach",      name: bfName("deck_beach"),     unlock: { kind: "buy", ownKey: "pack:beach" } },
  bf_cat:        { id: "bf_cat",        name: bfName("deck_cat"), unlock: { kind: "buy", ownKey: "pack:cat" } },
  bf_spacedog:   { id: "bf_spacedog",   name: bfName("deck_spacedog"),   unlock: { kind: "buy", ownKey: "pack:spacedog" } },
  bf_wale:       { id: "bf_wale",       name: bfName("deck_wale"),       unlock: { kind: "buy", ownKey: "pack:wale" } },
  bf_onboarding: { id: "bf_onboarding", name: bfName("deck_onboarding"),         unlock: { kind: "onboardingDone" } }, // #: wie deck_onboarding — via Onboarding-Abschluss frei
  // #303 Challenge-Battlefields (Teil des jeweiligen Challenge-Packs, gleiche Bedingung wie das Deck).
  bf_gottgleich: { id: "bf_gottgleich", name: bfName("deck_gottgleich"), unlock: { kind: "gottgleichRun" } },
  bf_serie300:   { id: "bf_serie300",   name: bfName("deck_serie300"),  unlock: { kind: "streak", n: 300 } },
  bf_serie600:   { id: "bf_serie600",   name: bfName("deck_serie600"),    unlock: { kind: "streak", n: 600 } },
  bf_serie1500:  { id: "bf_serie1500",  name: bfName("deck_serie1500"), unlock: { kind: "streak", n: 1500 } },
  bf_sparfuchs:  { id: "bf_sparfuchs",  name: bfName("deck_sparfuchs"),  unlock: { kind: "meisterNoReroll" } },
  // #310 Element-Challenge-Battlefields (gleiche Bedingung wie ihr Deck) + Prisma + DP-Kauf-Packs:
  bf_feuer:     { id: "bf_feuer",     name: bfName("deck_feuer"),          unlock: { kind: "monoArchetypeRun", archetype: "fire",      n: MONO_CHALLENGE_N } },
  bf_eis:       { id: "bf_eis",       name: bfName("deck_eis"),            unlock: { kind: "monoArchetypeRun", archetype: "ice",       n: MONO_CHALLENGE_N } },
  bf_blitz:     { id: "bf_blitz",     name: bfName("deck_blitz"),          unlock: { kind: "monoArchetypeRun", archetype: "lightning", n: MONO_CHALLENGE_N } },
  bf_pflanze:   { id: "bf_pflanze",   name: bfName("deck_pflanze"),        unlock: { kind: "monoArchetypeRun", archetype: "plant",     n: MONO_CHALLENGE_N } },
  bf_elementar: { id: "bf_elementar", name: bfName("deck_elementar"),         unlock: { kind: "allMonoArchetypes", n: MONO_CHALLENGE_N } },
  bf_ronin:     { id: "bf_ronin",     name: bfName("deck_ronin"),          unlock: { kind: "buy", ownKey: "pack:ronin" } },
  bf_kosmos:    { id: "bf_kosmos",    name: bfName("deck_kosmos"), unlock: { kind: "buy", ownKey: "pack:kosmos" } },
  bf_oni:       { id: "bf_oni",       name: bfName("deck_oni"),      unlock: { kind: "buy", ownKey: "pack:oni" } },
  bf_geometrie: { id: "bf_geometrie", name: bfName("deck_geometrie"),         unlock: { kind: "buy", ownKey: "pack:geometrie" } },
  // #311 DP-Kauf-Packs:
  bf_sonne:  { id: "bf_sonne",  name: bfName("deck_sonne"),         unlock: { kind: "buy", ownKey: "pack:sonne" } },
  bf_drache: { id: "bf_drache", name: bfName("deck_drache"),     unlock: { kind: "buy", ownKey: "pack:drache" } },
  // #312 DP-Kauf-Packs:
  bf_arcade:     { id: "bf_arcade",     name: bfName("deck_arcade"),     unlock: { kind: "buy", ownKey: "pack:arcade" } },
  bf_polarlicht: { id: "bf_polarlicht", name: bfName("deck_polarlicht"),     unlock: { kind: "buy", ownKey: "pack:polarlicht" } },
  bf_seedrache:  { id: "bf_seedrache",  name: bfName("deck_seedrache"),   unlock: { kind: "buy", ownKey: "pack:seedrache" } },
  bf_obsidian:   { id: "bf_obsidian",   name: bfName("deck_obsidian"),   unlock: { kind: "buy", ownKey: "pack:obsidian" } },
  // #tiered Titan/Hirsch Battlefields (gleiche Bedingung wie ihr Deck).
  bf_titan1:  { id: "bf_titan1",  name: bfName("deck_titan1"),  unlock: { kind: "score", n: 25000000 } },
  bf_titan2:  { id: "bf_titan2",  name: bfName("deck_titan2"),  unlock: { kind: "score", n: 50000000 } },
  bf_titan3:  { id: "bf_titan3",  name: bfName("deck_titan3"),  unlock: { kind: "score", n: 100000000 } },
  bf_hirsch1: { id: "bf_hirsch1", name: bfName("deck_hirsch1"), unlock: { kind: "games", n: 10 } },
  bf_hirsch2: { id: "bf_hirsch2", name: bfName("deck_hirsch2"), unlock: { kind: "games", n: 20 } },
  bf_hirsch3: { id: "bf_hirsch3", name: bfName("deck_hirsch3"), unlock: { kind: "games", n: 30 } },
  // #tiered Thron Battlefields (gleiche Bedingung wie ihr Deck).
  bf_thron1: { id: "bf_thron1", name: bfName("deck_thron1"), unlock: { kind: "championWeek", n: 1 } },
  bf_thron2: { id: "bf_thron2", name: bfName("deck_thron2"), unlock: { kind: "championWeek", n: 2 } },
  bf_thron3: { id: "bf_thron3", name: bfName("deck_thron3"), unlock: { kind: "championWeek", n: 3 } },
  // #deck40 Battlefields (gleicher Besitz-Schlüssel wie das Deck):
  bf_gaia:     { id: "bf_gaia",     name: bfName("deck_gaia"),     unlock: { kind: "buy", ownKey: "pack:gaia" } },
  bf_glazius:  { id: "bf_glazius",  name: bfName("deck_glazius"),  unlock: { kind: "buy", ownKey: "pack:glazius" } },
  bf_voltaris: { id: "bf_voltaris", name: bfName("deck_voltaris"), unlock: { kind: "buy", ownKey: "pack:voltaris" } },
  bf_pyrros:   { id: "bf_pyrros",   name: bfName("deck_pyrros"),   unlock: { kind: "buy", ownKey: "pack:pyrros" } },
};

// Tausender-Punkte ohne ICU-Abhängigkeit (node-Tests deterministisch): 10000000 → "10.000.000".
// #215: Anzeigenamen der Fraktionen für die Freischalt-Labels (Archetyp-Decks).
// Die vier Archetyp-Schlüssel (Namen kommen aus dem Archetyp-Register, nicht von hier).
const ARCHS = ["fire", "lightning", "ice", "plant"];
// #310: robuster Mono-Lauf-Zähler je Fraktion. Toleriert Alt-Werte (Boolean true → 1) und fehlende Map.
const monoCount = (p, a) => {
  const m = p && p.monoArchetypeRuns;
  const v = m ? Number(m[a]) : 0;
  return Number.isFinite(v) && v > 0 ? v : 0;
};
/* Gewonnene Wochen-Ranglisten (Platz 1 im Meister-Wochen-Board) — Basis der gestuften Ranglisten-Decks.
   Toleriert das ALTE Boolean-Feld `hadChampionWeek` (true → 1), damit Profile ohne den Zähler nicht
   ihre bereits verdiente erste Stufe verlieren. */
const championWeeks = (p) => {
  const v = Number(p && p.championWeeks);
  if (Number.isFinite(v) && v > 0) return v;
  return p && p.hadChampionWeek ? 1 : 0;
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
    case "championWeek":    return championWeeks(p) >= (u.n || 1); // #303 Meister: n× Platz 1 einer Wochen-Rangliste (Champion-Board)
    case "buy":         return !!(p.ownedCosmetics && p.ownedCosmetics[u.ownKey]);               // #deckshop: mit DP gekauft (im Besitz)
    case "onboardingDone": return onboardingDone(p);                                             // #: Genesis — Onboarding abgeschlossen (6/6)
    default:            return true;
  }
}

/* Anzeige-Fortschritt für den Kollektion-Screen (analog runStats.achievements()):
   { done, cur, target, kind, vars } — cur/target = Fortschritt, kind + vars beschreiben die Bedingung.
   Zählbare kinds liefern cur (auf target gedeckelt) + target; Flag-Challenges target=1, cur 0/1.

   #sprache: Der KLARTEXT steht nicht mehr hier, sondern im Katalog (`unlock.<kind>`), aufgelöst über
   `unlockLabel` in src/i18n/unlockText.js — genau wie die Architekt-Effekttexte. Ein `import { t }`
   an dieser Stelle wäre ein Zyklus (cosmetics.js → i18n/index.js → de.js → cosmetics.js), und mit
   dem eingebauten deutschen Text hier hätte die englische Fassung eine zweite Pflegestelle. */
export function unlockProgress(def, profile) {
  const u = def && def.unlock;
  if (!u) return { done: true, cur: 1, target: 1, kind: "none", vars: {} };
  const p = profile || {};
  switch (u.kind) {
    case "games": {
      const have = p.games || 0;
      return { done: have >= u.n, cur: Math.min(have, u.n), target: u.n, kind: u.kind, vars: { n: u.n } };
    }
    case "streak": {
      const have = p.bestStreak || 0;
      return { done: have >= u.n, cur: Math.min(have, u.n), target: u.n, kind: u.kind, vars: { n: u.n } };
    }
    case "score": {
      const have = p.bestScore || 0;
      return { done: have >= u.n, cur: Math.min(have, u.n), target: u.n, kind: u.kind, vars: { n: u.n } };
    }
    case "noRerollRun": {
      const done = !!p.hadNoRerollRun;
      return { done, cur: done ? 1 : 0, target: 1, kind: u.kind, vars: {} };
    }
    case "monoArchetypeRun": {
      const need = u.n || 1;
      const have = monoCount(p, u.archetype);
      return { done: have >= need, cur: Math.min(have, need), target: need,
        kind: u.kind, vars: { n: need, archetype: u.archetype } };
    }
    case "allMonoArchetypes": {
      const need = u.n || 1;
      const have = ARCHS.reduce((acc, a) => acc + (monoCount(p, a) >= need ? 1 : 0), 0);
      return { done: have >= ARCHS.length, cur: have, target: ARCHS.length, kind: u.kind, vars: { n: need } };
    }
    case "allArchetypesRun": {
      const done = !!p.hadAllArchetypesRun;
      return { done, cur: done ? 1 : 0, target: 1, kind: u.kind, vars: {} };
    }
    case "gottgleichRun": {
      const done = !!p.hadGottgleichRun;
      return { done, cur: done ? 1 : 0, target: 1, kind: u.kind, vars: {} };
    }
    case "meisterNoReroll": {
      const done = !!p.hadMeisterNoRerollRun;
      return { done, cur: done ? 1 : 0, target: 1, kind: u.kind, vars: {} };
    }
    case "championWeek": {
      // Eine Woche → der bestehende Einzahl-Satz; mehrere → eigener Katalog-Schlüssel mit Zahl.
      const need = u.n || 1;
      const have = championWeeks(p);
      return { done: have >= need, cur: Math.min(have, need), target: need,
        kind: need > 1 ? "championWeekN" : u.kind, vars: need > 1 ? { n: need } : {} };
    }
    case "buy": {
      const done = !!(p.ownedCosmetics && p.ownedCosmetics[u.ownKey]);
      // Der Preis steht auf der Pack-Kachel (je Pack verschieden, themes.js `price`) — der Text nennt
      // nur die WÄHRUNG. Kein Import von themes.js: das gäbe einen Zyklus (themes.js → cosmetics.js).
      return { done, cur: done ? 1 : 0, target: 1, kind: u.kind, vars: {} };
    }
    case "onboardingDone": {
      const done = onboardingDone(p);
      return { done, cur: done ? 1 : 0, target: 1, kind: u.kind, vars: {} };
    }
    default:
      return { done: true, cur: 1, target: 1, kind: "unknown", vars: {} };
  }
}

// Defensiver Resolver: gib die gewählte id nur zurück, wenn sie existiert UND freigeschaltet ist,
// sonst "default". Nutzt die UI beim Rendern (gespeicherter Skin könnte weg/gesperrt sein).
export function resolveSkinId(defs, id, profile) {
  const def = defs && defs[id];
  if (def && isUnlocked(def, profile)) return id;
  return "default";
}
