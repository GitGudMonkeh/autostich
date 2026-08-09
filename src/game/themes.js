/* DECK-WERKSTATT — Pack-Registry & Kauf-Ökonomie (#deckshop).

   PUR & node-testbar (wie cosmetics.js): hält NUR Metadaten + Logik, importiert KEINE Bild-Assets
   (die liegen UI-seitig in cosmeticAssets.js, gekeyed über die deck-/bf-id).

   Schlankes Modell (2 Kategorien im Shop):
     • PACK   = Karten (Front + Back) + Battlefield als EIN Kauf. Ein Pack aktiviert Deck UND Battlefield
                zusammen (UI-seitig über onChoose({deckId, battlefieldId})). Besitz:
                  - Kauf-Pack (kind:"buy"): ownedCosmetics["pack:<id>"] (kostet PACK_COST SP).
                  - Bedingungs-Pack (kind:"cond"): gilt als besessen, sobald seine Bedingung erfüllt ist
                    (aus DECK_DEFS geliehen; kein SP).
     • EFFEKT = alle GLOBAL_FX, einzeln & global gekauft (nicht pro Pack), laufweit wirksam. Dazu zählen jetzt
                auch die drei Karten-Animationen (Frame-Pulse/Holo-Swipe/Hologrid, group:"anim") — einmal
                gekauft, für ALLE Packs.

   Die UI (CustomizeScreen) rendert rein aus diesen Ableitungen — dieselbe Wahrheit für Tests & Screen. */

import { DECK_DEFS, BATTLEFIELD_DEFS, isUnlocked, unlockProgress } from "./cosmetics.js";

export const PACK_COST = 1; // SP je Kauf-Pack (Test-Branch: 1 SP genügt)

/* GLOBALE Effekte (#deckshop, Kategorie „Effekte"): einmalig gekauft (nicht pro Pack), wirken laufweit.
   Kaufen kostet GLOBAL_FX_COST SP (Besitz in ownedCosmetics[ownKey]); ein An/Aus-Toggle (option) steuert sie.
   group ordnet die Effekte im Shop/Zweck:
     "anim"     = Karten-Animationen (Frame-Pulse/Holo-Swipe/Hologrid) — global für alle Packs, frei kombinierbar.
     "finisher" = Sieg-Abschluss auf der GEGNERkarte (Laser/Schwarzes Loch — mit „Klinge" (Default) untereinander
                  EXKLUSIV; die Auswahl erfolgt UI-seitig als Einfachauswahl).
     "crit"     = kritischer Treffer (Shatter).
     "gott"     = Gottgleicher Sieg OHNE Krit (Prunk-Overlays; stapelbar). */
export const GLOBAL_FX_COST = 1;
export const GLOBAL_FX = [
  // Karten-Animationen (früher pro-Theme; jetzt global). Options-Keys bleiben fxFrameGlow/fxHoloSwipe/fxHologrid.
  { key: "frameGlow", name: "Frame-Pulse", desc: "Der Kartenrahmen pulsiert in der Deck-Farbe.",
    ownKey: "fx:frameGlow", option: "fxFrameGlow", preview: "frameGlow", group: "anim" },
  { key: "holoSwipe", name: "Holo-Swipe", desc: "Ein Glanz-Streifen wandert über die Karte.",
    ownKey: "fx:holoSwipe", option: "fxHoloSwipe", preview: "holoSwipe", group: "anim" },
  { key: "hologrid", name: "Hologrid", desc: "Ein Leucht-Gitter läuft über das Battlefield.",
    ownKey: "fx:hologrid", option: "fxHologrid", preview: "hologrid", group: "anim" },
  // Sieg-Finisher (exklusiv, UI-seitige Einfachauswahl mit „Klinge" als Default).
  { key: "laserSlice", name: "Laser-Schnitt", desc: "Gegnerkarten werden beim Sieg vom Laser geteilt — statt der Klinge.",
    ownKey: "fx:laserSlice", option: "fxLaserSlice", preview: "laser", group: "finisher" },
  { key: "blackhole", name: "Schwarzes Loch", desc: "Bei einer Siegserie wächst EIN Schwarzes Loch, das jede weitere Gegnerkarte einsaugt (Orbs auf wachsender Bahn); Serienabbruch → Kollaps mit Flash & Schockwelle (statt Klinge/Laser).",
    ownKey: "fx:blackhole", option: "fxBlackhole", preview: "blackhole", group: "finisher" },
  { key: "lasergrid", name: "Lasergitter", desc: "Beim Sieg blitzt ein Neon-Gitter über die Gegnerkarte — sie zerfällt entlang der Linien in ein Raster aus Stücken, die auseinanderfliegen (statt Klinge/Laser).",
    ownKey: "fx:lasergrid", option: "fxLasergrid", preview: "lasergrid", group: "finisher" },
  { key: "burnBeam", name: "Brennstrahl", desc: "Beim Sieg brennt ein dünner Neon-Strahl von oben ein glühendes Loch in die exakte Kartenmitte, die Karte verblasst; bei Siegserie hält der Strahl länger & es springen immer mehr Funken aus dem Loch (statt Klinge/Laser).",
    ownKey: "fx:burnBeam", option: "fxBurnBeam", preview: "burnbeam", group: "finisher" },
  // Kritischer Treffer.
  { key: "shatter", name: "Shatter", desc: "Kritische Treffer zerbersten die Gegnerkarte in Scherben (sonst normaler Schnitt).",
    ownKey: "fx:shatter", option: "fxShatter", preview: "shatter", group: "crit" },
  // Gottgleich-Prunk (stapelbar).
  { key: "fireworks", name: "Neon-Feuerwerk", desc: "Gottgleicher Sieg ohne Krit: mehrere Feuerwerks-Bursts ploppen über dem Feld — in der Deckfarbe.",
    ownKey: "fx:fireworks", option: "fxFireworks", preview: "fireworks", group: "gott" },
  { key: "goldRain", name: "Weißgold-Regen", desc: "Gottgleicher Sieg ohne Krit: ein Schauer goldener Funken rieselt über das Feld — bleibt immer gold.",
    ownKey: "fx:goldRain", option: "fxGoldRain", preview: "goldRain", group: "gott" },
  { key: "prismaWave", name: "Prisma-Welle", desc: "Gottgleicher Sieg ohne Krit: ein prismatischer Schockwellen-Ring läuft einmal über das ganze Board.",
    ownKey: "fx:prismaWave", option: "fxPrismaWave", preview: "prismaWave", group: "gott" },
];
export const GLOBAL_FX_BY_KEY = Object.fromEntries(GLOBAL_FX.map((f) => [f.key, f]));
export const globalFxOwned = (profile, fx) => !!(profile && profile.ownedCosmetics && profile.ownedCosmetics[fx.ownKey]);
export const canBuyGlobalFx = (profile, fx) => !globalFxOwned(profile, fx) && sp(profile) >= GLOBAL_FX_COST;
export function buyGlobalFx(profile, fx) {
  if (!canBuyGlobalFx(profile, fx)) return profile;
  return {
    ...profile,
    stichPoints: sp(profile) - GLOBAL_FX_COST,
    stichSpent: Math.max(0, Math.floor(Number(profile && profile.stichSpent) || 0)) + GLOBAL_FX_COST,
    ownedCosmetics: { ...(profile && profile.ownedCosmetics), [fx.ownKey]: true },
  };
}
// Ein globaler Effekt aktiv? (gekauft UND per Option an) — die Reducer-/UI-Naht nutzt dieselbe Wahrheit.
export const globalFxActive = (profile, options, key) => {
  const fx = GLOBAL_FX_BY_KEY[key];
  return !!fx && globalFxOwned(profile, fx) && !!(options && options[fx.option]);
};
// Karten-Animationen (global).
export const frameGlowActive = (profile, options) => globalFxActive(profile, options, "frameGlow");
export const holoSwipeActive = (profile, options) => globalFxActive(profile, options, "holoSwipe");
export const hologridActive = (profile, options) => globalFxActive(profile, options, "hologrid");
// Finisher / Krit / Gott.
export const laserSliceActive = (profile, options) => globalFxActive(profile, options, "laserSlice");
export const blackholeActive = (profile, options) => globalFxActive(profile, options, "blackhole");
export const lasergridActive = (profile, options) => globalFxActive(profile, options, "lasergrid");
export const burnBeamActive = (profile, options) => globalFxActive(profile, options, "burnBeam");
export const shatterActive = (profile, options) => globalFxActive(profile, options, "shatter");
export const fireworksActive = (profile, options) => globalFxActive(profile, options, "fireworks");
export const goldRainActive = (profile, options) => globalFxActive(profile, options, "goldRain");
export const prismaWaveActive = (profile, options) => globalFxActive(profile, options, "prismaWave");

/* PACK-Registry. kind:
     "buy"  → EIN Kauf (Deck + Battlefield zusammen) für PACK_COST SP. Besitz: ownedCosmetics["pack:<id>"].
     "cond" → über eine Bedingung freigeschaltet (Läufe/Challenge); kein SP. Die Bedingung wird vom Deck geliehen
              (DECK_DEFS[deckId].unlock) — das Deck ist das definierende Element des Packs.
   a1 = Hauptfarbe (u. a. Hologrid-Gitterlinien/Frame-Glow), a2 = Sekundärfarbe (Akzente/Beams).
   els = welche Slots das Pack anbietet: ["deck","bf"] (Deck + Battlefield) oder ["deck"] (nur Deck). */
export const THEME_DEFS = {
  // ---- Kaufbare Packs (1 Kauf = Deck + Battlefield) ----
  sunset: { id: "sunset", name: "Sunset Rider", emblem: "🏍️", kind: "buy", a1: "#ff5a4d", a2: "#ffab3a",
    deckId: "deck_sunset", bfId: "bf_sunset", els: ["deck", "bf"] },
  lofi:   { id: "lofi",   name: "Lofi Nights",  emblem: "🎧", kind: "buy", a1: "#9b6cff", a2: "#ff7ab0",
    deckId: "deck_lofi",  bfId: "bf_lofi",  els: ["deck", "bf"] },
  kaiju:  { id: "kaiju",  name: "Neon Kaiju",   emblem: "🦖", kind: "buy", a1: "#3a7bff", a2: "#ff4dcb",
    deckId: "deck_kaiju", bfId: "bf_kaiju", els: ["deck", "bf"] },

  // ---- v0.4 Kauf-Packs (1 Kauf = Deck + Battlefield, je PACK_COST SP) ----
  aura:     { id: "aura",     name: "Super Aura",      emblem: "💥", kind: "buy", a1: "#ffb03a", a2: "#ff6a3a",
    deckId: "deck_aura",       bfId: "bf_aura",       els: ["deck", "bf"] },
  beach:    { id: "beach",    name: "Malibu Wave",     emblem: "🌴", kind: "buy", a1: "#ff5aa0", a2: "#35d0e0",
    deckId: "deck_beach",      bfId: "bf_beach",      els: ["deck", "bf"] },
  cat:      { id: "cat",      name: "Aurora Whiskers", emblem: "🐱", kind: "buy", a1: "#54e08a", a2: "#9b82f0",
    deckId: "deck_cat",        bfId: "bf_cat",        els: ["deck", "bf"] },
  mecha:    { id: "mecha",    name: "Mecha Ronin",     emblem: "🤖", kind: "buy", a1: "#3a7bff", a2: "#9b6cff",
    deckId: "deck_mecha",      bfId: "bf_mecha",      els: ["deck", "bf"] },
  ramen:    { id: "ramen",    name: "Slurp City",      emblem: "🍜", kind: "buy", a1: "#ff5a7a", a2: "#ffab3a",
    deckId: "deck_ramen",      bfId: "bf_ramen",      els: ["deck", "bf"] },
  spacedog: { id: "spacedog", name: "Star Pup",        emblem: "🐕", kind: "buy", a1: "#9b6cff", a2: "#ff4dcb",
    deckId: "deck_spacedog",   bfId: "bf_spacedog",   els: ["deck", "bf"] },
  wale:     { id: "wale",     name: "Moonwhale",       emblem: "🐋", kind: "buy", a1: "#35d0ff", a2: "#7fdcff",
    deckId: "deck_wale",       bfId: "bf_wale",       els: ["deck", "bf"] },
  genesis:  { id: "genesis",  name: "Genesis",         emblem: "🔷", kind: "buy", a1: "#26c6e6", a2: "#9b82f0",
    deckId: "deck_onboarding", bfId: "bf_onboarding", els: ["deck", "bf"] },

  // ---- Progressions-Packs (Deck + Battlefield, über „Läufe" freigeschaltet) ----
  neon: { id: "neon", name: "Neonstadt", emblem: "🌆", kind: "cond", a1: "#26c6e6", a2: "#9b82f0",
    deckId: "deck_p1", bfId: "bf_1", els: ["deck", "bf"] },
  tank: { id: "tank", name: "Tankstopp", emblem: "⛽", kind: "cond", a1: "#ff9d3a", a2: "#ff5a4d",
    deckId: "deck_p2", bfId: "bf_2", els: ["deck", "bf"] },
  mega: { id: "mega", name: "Megacity",  emblem: "🏙️", kind: "cond", a1: "#3a7bff", a2: "#26c6e6",
    deckId: "deck_p3", bfId: "bf_3", els: ["deck", "bf"] },
  mond: { id: "mond", name: "Mondpagode", emblem: "🌙", kind: "cond", a1: "#9b82f0", a2: "#26c6e6",
    deckId: "deck_p4", bfId: "bf_4", els: ["deck", "bf"] },
};

export const THEMES = Object.values(THEME_DEFS);
export const PACKS = THEMES; // Sprechender Alias fürs neue Modell

// SP-Guthaben robust lesen (spiegelt progression.points).
const sp = (profile) => Math.max(0, Math.floor(Number(profile && profile.stichPoints) || 0));

// Besitz-Schlüssel eines Kauf-Packs.
export const packOwnKey = (pack) => `pack:${pack.id}`;

// Ist das Pack ein Kauf-Pack? (→ SP-kaufbar.)
export const isBuyPack = (pack) => pack.kind === "buy";
export const hasBattlefield = (pack) => pack.els.includes("bf");

// Die Freischalt-/Kauf-Bedingung eines Packs. Kauf-Packs: der Pack-Besitzschlüssel; Bedingungs-Packs: die
// Deck-Bedingung aus DECK_DEFS (das Deck ist das definierende Element). Progressions-Packs schalten ihr
// Battlefield ggf. später frei; resolveSkinId fängt ein noch gesperrtes BF beim Aktivieren defensiv ab.
export function packCond(pack) {
  if (pack.kind === "buy") return { kind: "buy", ownKey: packOwnKey(pack) };
  return (DECK_DEFS[pack.deckId] || {}).unlock || null;
}

// Pack im Besitz? (gekauft ODER über Bedingung frei). Nutzt dieselbe isUnlocked-Wahrheit wie die Auswahl.
export function packOwned(profile, pack) {
  return isUnlocked({ unlock: packCond(pack) }, profile);
}

// Pack-Zustand fürs Badge: "own" | "buy" (SP-kaufbar) | "lock" (Bedingung offen).
export function packState(profile, pack) {
  if (packOwned(profile, pack)) return "own";
  return pack.kind === "buy" ? "buy" : "lock";
}

// Preis eines Packs in SP (nur Kauf-Packs; sonst null).
export const packPrice = (pack) => (isBuyPack(pack) ? PACK_COST : null);

// Klartext-Freischaltung eines (Bedingungs-)Packs — Label + Fortschritt (für die Sperr-Anzeige).
export const packUnlock = (profile, pack) => unlockProgress({ unlock: packCond(pack) }, profile);

// Kann dieses Pack gekauft werden? (Kauf-Pack, noch nicht im Besitz, genug SP.)
export function canBuyPack(profile, pack) {
  return isBuyPack(pack) && !packOwned(profile, pack) && sp(profile) >= PACK_COST;
}

// Ein Pack kaufen → neues Profil (PACK_COST SP abziehen, in stichSpent buchen, Besitz setzen). No-op bei
// nicht kaufbar/zu wenig SP. Die Aktiv-Setzung (deckId/battlefieldId) macht die UI über onChoose.
export function buyPack(profile, pack) {
  if (!canBuyPack(profile, pack)) return profile;
  return {
    ...profile,
    stichPoints: sp(profile) - PACK_COST,
    stichSpent: Math.max(0, Math.floor(Number(profile && profile.stichSpent) || 0)) + PACK_COST,
    ownedCosmetics: { ...(profile && profile.ownedCosmetics), [packOwnKey(pack)]: true },
  };
}
