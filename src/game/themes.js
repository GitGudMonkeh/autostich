/* DECK-WERKSTATT — Pack-Registry & Kauf-Ökonomie (#deckshop).

   PUR & node-testbar (wie cosmetics.js): hält NUR Metadaten + Logik, importiert KEINE Bild-Assets
   (die liegen UI-seitig in cosmeticAssets.js, gekeyed über die deck-/bf-id).

   Schlankes Modell (2 Kategorien im Shop):
     • PACK   = Karten (Front + Back) + Battlefield als EIN Kauf. Ein Pack aktiviert Deck UND Battlefield
                zusammen (UI-seitig über onChoose({deckId, battlefieldId})). Besitz:
                  - Kauf-Pack (kind:"buy"): ownedCosmetics["pack:<id>"] (kostet pack.price DP — #307).
                  - Bedingungs-Pack (kind:"cond"): gilt als besessen, sobald seine Bedingung erfüllt ist
                    (aus DECK_DEFS geliehen; kein Kauf).
     • EFFEKT = alle GLOBAL_FX, einzeln & global gekauft (nicht pro Pack), laufweit wirksam. #307: je Effekt ein
                eigener DP-Preis (fx.price). Karten-Animationen (Frame-Pulse/Holo-Swipe, group:"anim") + Battlefield-
                Ambiente (group:"field") + Finisher + Gott — einmal gekauft, für ALLE Packs.

   Die UI (CustomizeScreen) rendert rein aus diesen Ableitungen — dieselbe Wahrheit für Tests & Screen. */

import { DECK_DEFS, isUnlocked, unlockProgress } from "./cosmetics.js";

/* GLOBALE Effekte (#deckshop, Kategorie „Effekte"): einmalig gekauft (nicht pro Pack), wirken laufweit. #307: Kauf in
   DP, je Effekt ein eigener Preis (fx.price); Besitz in ownedCosmetics[ownKey]; ein An/Aus-Toggle (option) steuert sie.
   group ordnet die Effekte im Shop/Zweck:
     "anim"     = Karten-Animationen (Frame-Pulse/Holo-Swipe) — auf der Karte, frei kombinierbar.
     "field"    = Battlefield-Ambiente (Hologrid + #306: Sternenfeld/Aurora/Glutfunken/Scanline/Vignette),
                  feldweit hinter den Karten (z-1), in Deckfarbe; EINFACH-EXKLUSIV (nur eins aktiv, UI-seitige Auswahl).
     "finisher" = Sieg-Abschluss auf der GEGNERkarte (Laser/Schwarzes Loch — mit „Klinge" (Default) untereinander
                  EXKLUSIV; die Auswahl erfolgt UI-seitig als Einfachauswahl).
     "gott"     = Gottgleicher Sieg OHNE Krit (Prunk-Overlays; stapelbar). */
export const GLOBAL_FX = [
  // #cleanup: Karten-Animationen (frameGlow/holoSwipe/auroraVeil/glitch), die nicht-überarbeiteten Feld-Effekte
  // (hologrid/scanline/vignette), alle Sieg-Finisher außer der Klinge (laserSlice/blackhole/lasergrid/
  // burnBeam/overload/disperse) UND der Gottgleich-Prunk (fireworks/goldRain/prismaWave) wurden vollständig entfernt —
  // sie werden ersetzt. Es bleiben: Hintergrund-Effekt „Aurora", die Hintergrund-Finisher „Glutfunken" + „Sternenfeld"
  // (#311 überarbeitet wieder eingeführt) und der synthetische Klinge-Finisher. Die Gottgleich-Kategorie (group "gott")
  // bleibt (nur „Standard"), dort kommt später neuer Prunk rein.
  { key: "aurora", name: "Aurora", desc: "Weiche Polarlicht-Schleier driften übers Feld; je Stich ein sanfter Bloom-Puls — in der Deckfarbe.",
    ownKey: "fx:aurora", option: "fxAurora", preview: "aurora", price: 10, group: "bgfx" }, // #kategorien: Hintergrund-Effekt (reiner BG, Pixi) · #353 Rarität: grün/Selten = 10 DP
  // #317 Cube-Matrix: musik-/bass-reaktives 3D-Würfelfeld auf Synthwave-Boden + Scheinwerfer. Kontinuierlich (kein
  // Stich-Bezug) → reiner Hintergrund-Effekt (bgfx, einfach-exklusiv mit Aurora). Jeder Würfel = ein Frequenzband.
  { key: "cubematrix", name: "Würfel-Matrix", desc: "Ein perspektivisches Feld aus Neon-Würfeln auf einem Synthwave-Boden — jeder Würfel schlägt zu einem eigenen Frequenzband der laufenden Musik nach oben aus. Dazu Scheinwerfer von oben, die zum Bass pulsieren. In der Deckfarbe.",
    ownKey: "fx:cubematrix", option: "fxCubeMatrix", preview: "cubematrix", price: 40, group: "bgfx" }, // #353 Rarität: gold/Legendär = 40 DP
  // #345 Neon-Brandung: Plasma-See am unteren Rand (eigene WebGL-Canvas wie Aurora). Bei starken Ansagen drückt ein
  // Puls das Wasser mittig ein und lässt es an den Seitenrändern hochsteigen (Gefäß/Rahmen). Reiner BG (bgfx).
  { key: "neonsurf", name: "Neon-Brandung", desc: "Eine Plasma-See am unteren Rand — Neon-Fluss mit heller Wasserlinie; bei starken Ansagen drückt ein Puls das Wasser mittig ein und lässt es an den Seitenrändern hochsteigen. In der Deckfarbe.",
    ownKey: "fx:neonsurf", option: "fxNeonsurf", preview: "neonsurf", price: 30, group: "bgfx" }, // #farbsystem: lila = 30 DP
  // #deckglow: Deck-Glow — die hellen Linien/Kanten des Battlefield-Bildes glühen (rein additiv) in der Deck-/Standard-
  // farbe auf, dazu ein „Lauflicht", das an den Konturen entlangwandert. EIGENE Ebene (WebGL-Canvas, mobil-sicher wie
  // Aurora), NICHT im exklusiven bgfx-Slot → frei mit allen anderen Effekten kombinierbar (group "bgglow", mode toggle).
  { key: "deckglow", name: "Leuchten", desc: "Die hellen Linien des Battlefields glühen in der Deckfarbe auf, und ein Lauflicht wandert an den Konturen entlang. Eigene Ebene — der EINZIGE Effekt, der gleichzeitig mit allen anderen (Hintergrund, Stich, Score) aktiv sein kann.",
    ownKey: "fx:deckglow", option: "fxDeckGlow", preview: "deckglow", price: 5, group: "bgglow" }, // #deckglow: 5 DP · frei kombinierbar
  // #glutfunken-raus: „Glutfunken" (embers) komplett entfernt (Effekt/Tile/Option/Sound/Vorschau). „Komet" bleibt.
  { key: "starfield", name: "Meteor", desc: "Ein dichtes Sternenfeld driftet über drei Tiefen-Ebenen mit Nebel-Schleier; je Stich schießt ein Meteor durchs Feld — größer je Score-Stufe, ab der Stufe Stark mit Einschlag-Blitz und Funken, die mit Schweif davonstieben. Standard weiß-blau, wahlweise in der Deckfarbe.",
    ownKey: "fx:starfield", option: "fxStarfield", preview: "starfield", price: 20, group: "bgfin" }, // #311: Hintergrund-Finisher (Stich-Interaktion, Pixi)
  // #318 Karten-Animationen (group "anim") — geteilte Pixi-Overlay-Bühne ÜBER den Karten (CardFxStage), pro Karte
  // gezeichnet, frei kombinierbar (stapelbare Dauer-Layer). Pixi-only (Preview/Dev-gated), kein DOM-Fallback.
  { key: "edgeglow", name: "Neonrahmen", desc: "Ein weicher Neon-Rand umglüht die Karte in der Deckfarbe — dauerhaft, ruhig atmend, additiv gestapelt (kein Blur). Ohne Stich-Bezug.",
    ownKey: "fx:edgeglow", option: "fxEdgeGlow", preview: "edgeglow", price: 10, group: "anim" }, // [TUNING] Preis
  { key: "holo", name: "Holo-Sweep", desc: "Ein prismatisches Lichtband wandert diagonal über die Karte — Regenbogen-Hues in der Deckfarbe, tilt-reaktiv (Pointer/Gyro). Dauerhaft, additiv.",
    ownKey: "fx:holo", option: "fxHolo", preview: "holo", price: 20, group: "anim" }, // [TUNING] Preis
  { key: "glitch", name: "Glitch", desc: "Cyberpunk-Digital-Glitch über der ganzen Karte inkl. Zahl — Chroma-Split, Tear-Slices, Scanlines und Farb-Bars, mit ruhiger Grundlast und gelegentlichen Bursts.",
    ownKey: "fx:glitch", option: "fxGlitch", preview: "glitch", price: 30, group: "anim" }, // #353 Rarität: lila/Rar = 30 DP
  // #322–#326 Gottgleich-Prunk (group "gott", PIXI): feuert bei gottgleichem Sieg OHNE Krit, EINFACH-EXKLUSIV (genau
  // einer aktiv, oder „gottStandard" = kein Prunk). Sonnen-Puls ist der FREIE Default (alwaysOwned, 0 DP); die anderen
  // kosten nach Rarity (Selten 10 · Sehr selten 20 · Rar 30 · Legendär 40 = grün/blau/lila/gold). `hidden` blendet die
  // noch nicht gebauten Effekte im Shop aus (bleiben registriert) → wird je Effekt entfernt, sobald die Pixi-Komponente steht.
  { key: "sonnenPuls", name: "Sonne", desc: "Die Outrun-Sonne bloomt hinter der geschlagenen Karte auf — Sunset-Verlauf mit Scanline-Lücken, heißem Kern, Korona und drehenden Strahlen. Standard-Sunset oder Deckfarbe. Der freie Gottgleich-Prunk.",
    ownKey: "fx:sonnenPuls", option: "fxSonnenPuls", preview: "sonnenPuls", price: 0, group: "gott", alwaysOwned: true },
  { key: "laserFaecher", name: "Laserfächer", desc: "Scharfe Neon-Laser fächern aus der Kartenmitte auf — lange Haupt- und kurze Nebenstrahlen mit Kernlinie und leuchtender Nabe, öffnen mit Pop und drehen langsam. Standard-Neon oder Deckfarbe.",
    ownKey: "fx:laserFaecher", option: "fxLaserFaecher", preview: "laserFaecher", price: 10, group: "gott" },
  { key: "prismaKaskade", name: "Prisma", desc: "Mehrere prismatische Schockwellen-Ringe zünden zeitversetzt und laufen chromatisch (Regenbogen-Split) übers Feld, jeder mit Geburts-Blitz. Standard = volles Spektrum, Deckfarbe = Duoton.",
    ownKey: "fx:prismaKaskade", option: "fxPrismaKaskade", preview: "prismaKaskade", price: 20, group: "gott" },
  { key: "holoCube", name: "Holo-Würfel", desc: "Ein Holowürfel aus Wireframe-Blöcken baut sich aus der Ferne zusammen, dreht sich frei, blitzt im Kern und zerspringt taumelnd nach außen. Holo-Cyan→Magenta oder Deckfarbe.",
    ownKey: "fx:holoCube", option: "fxHoloCube", preview: "holoCube", price: 30, group: "gott" },
  { key: "supernova", name: "Supernova", desc: "Kollaps → Detonation (Flash, Zoom-Punch) → Boom-Schockwelle mit chromatischen Ringen, Strahlenkranz, Sternenregen und einem Grid-Tunnel durch den Einschlag. Der legendäre Showstopper. Gold→Magenta oder Deckfarbe.",
    ownKey: "fx:supernova", option: "fxSupernova", preview: "supernova", price: 40, group: "gott" },
];
export const GLOBAL_FX_BY_KEY = Object.fromEntries(GLOBAL_FX.map((f) => [f.key, f]));
export const globalFxOwned = (profile, fx) => !!(profile && profile.ownedCosmetics && profile.ownedCosmetics[fx.ownKey]);
// #307: Effekte kosten jetzt DP (Deckpunkte), je Effekt ein eigener Preis (fx.price) — analog zu den Packs.
export const globalFxPrice = (fx) => Math.max(0, Math.floor(Number(fx && fx.price) || 0));
export const canBuyGlobalFx = (profile, fx) => !globalFxOwned(profile, fx) && dp(profile) >= globalFxPrice(fx);
export function buyGlobalFx(profile, fx) {
  if (!canBuyGlobalFx(profile, fx)) return profile;
  const price = globalFxPrice(fx);
  return {
    ...profile,
    deckPoints: dp(profile) - price,
    deckSpent: Math.max(0, Math.floor(Number(profile && profile.deckSpent) || 0)) + price,
    ownedCosmetics: { ...(profile && profile.ownedCosmetics), [fx.ownKey]: true },
  };
}
// Ein globaler Effekt aktiv? (gekauft UND per Option an) — die Reducer-/UI-Naht nutzt dieselbe Wahrheit.
export const globalFxActive = (profile, options, key) => {
  const fx = GLOBAL_FX_BY_KEY[key];
  return !!fx && globalFxOwned(profile, fx) && !!(options && options[fx.option]);
};
// #306/#kategorien: zwei UNABHÄNGIGE Feld-Slots — reiner Hintergrund-Effekt (kein Stich-Bezug) und Hintergrund-
// Finisher (Stich-Interaktion). Beide können GLEICHZEITIG aktiv sein → activeBgFx + activeBgFinisher liefern je
// einen Key. Nach dem #cleanup gibt es je Slot nur noch einen Effekt (Aurora bzw. Glutfunken).
export const auroraActive = (profile, options) => globalFxActive(profile, options, "aurora");
// #deckglow: Deck-Glow ist eine UNABHÄNGIGE Ebene (kein exklusiver Slot) → gekauft UND per Option an = aktiv,
// unabhängig davon, welcher bgfx/bgfin-Effekt gewählt ist. So kombiniert es mit allen anderen Effekten.
export const deckGlowActive = (profile, options) => globalFxActive(profile, options, "deckglow");
export const BG_FX_KEYS  = ["aurora", "cubematrix", "neonsurf"];  // reiner Hintergrund (einfach-exklusiv)
export const BG_FIN_KEYS = ["starfield"];  // Hintergrund-Finisher (reagiert je Stich; einfach-exklusiv) — #glutfunken-raus: embers entfernt
export function activeBgFx(profile, options) {
  for (const k of BG_FX_KEYS) if (globalFxActive(profile, options, k)) return k;
  return null;
}
export function activeBgFinisher(profile, options) {
  for (const k of BG_FIN_KEYS) if (globalFxActive(profile, options, k)) return k;
  return null;
}
// #318 Karten-Animationen (group "anim"): stapelbare Dauer-Layer auf der Karte — NICHT exklusiv, beliebig gleichzeitig
// aktiv. `activeCardAnims` liefert die Liste der aktiven Keys (gekauft UND per Option an) für die CardFxStage.
export const CARD_ANIM_KEYS = ["edgeglow", "holo", "glitch"]; // #318 (Materialize entfernt)
export const activeCardAnims = (profile, options) => CARD_ANIM_KEYS.filter((k) => globalFxActive(profile, options, k));

/* #322–#326 Gottgleich-Prunk (group "gott"): EINFACH-EXKLUSIV — genau EINER aktiv, oder gar keiner (= „gottStandard",
   kein Prunk). Sonnen-Puls ist der FREIE Default (alwaysOwned, 0 DP) → gilt ohne Kauf als besessen. gottFxOwned deckt
   diesen Gratis-Fall ab; activeGottFx liefert den aktiven (besessen + Option an) Prunk-Key in Rarity-Reihenfolge. */
export const GOTT_FX_KEYS = ["sonnenPuls", "laserFaecher", "prismaKaskade", "holoCube", "supernova"];
export const gottFxOwned = (profile, fx) => !!(fx && (fx.alwaysOwned || globalFxOwned(profile, fx)));
export function activeGottFx(profile, options) {
  for (const k of GOTT_FX_KEYS) {
    const fx = GLOBAL_FX_BY_KEY[k];
    if (fx && gottFxOwned(profile, fx) && !!(options && options[fx.option])) return k;
  }
  return null;
}

/* PACK-Registry. kind:
     "buy"  → EIN Kauf (Deck + Battlefield zusammen) für pack.price DP (#307). Besitz: ownedCosmetics["pack:<id>"].
     "cond" → über eine Bedingung freigeschaltet (Läufe/Challenge); kein SP. Die Bedingung wird vom Deck geliehen
              (DECK_DEFS[deckId].unlock) — das Deck ist das definierende Element des Packs.
   a1 = Hauptfarbe (u. a. Hologrid-Gitterlinien/Frame-Glow), a2 = Sekundärfarbe (Akzente/Beams).
   els = welche Slots das Pack anbietet: ["deck","bf"] (Deck + Battlefield) oder ["deck"] (nur Deck). */
/* Sprachprüfung: Ein Paket IST das Kosmetik-Set seines Decks — der Name war hier ein drittes Mal
   abgetippt (Deck · Spielfeld · Paket). Jetzt aus dem Deck gezogen; `deckId` steht ohnehin daneben. */
const packName = (deckId) => (DECK_DEFS[deckId] || {}).name || deckId;

export const THEME_DEFS = {
  // ---- Kaufbare Packs (1 Kauf = Deck + Battlefield) — #307 je Pack ein eigener DP-Preis ----
  sunset: { id: "sunset", name: packName("deck_sunset"), emblem: "🏍️", kind: "buy", price: 10, a1: "#ff5a4d", a2: "#ffab3a",
    deckId: "deck_sunset", bfId: "bf_sunset", els: ["deck", "bf"] },
  lofi:   { id: "lofi",   name: packName("deck_lofi"),      emblem: "🦊", kind: "buy", price: 5, a1: "#bcd8ff", a2: "#7fb0ff",
    deckId: "deck_lofi",  bfId: "bf_lofi",  els: ["deck", "bf"] },
  // #IP: „Neon Kaiju" / „Super Aura" / „Mecha Ronin" wegen IP-Bedenken entfernt.

  // ---- v0.4 Kauf-Packs (1 Kauf = Deck + Battlefield) ----
  beach:    { id: "beach",    name: packName("deck_beach"),     emblem: "🌴", kind: "buy", price: 10, a1: "#ff5aa0", a2: "#35d0e0",
    deckId: "deck_beach",      bfId: "bf_beach",      els: ["deck", "bf"] },
  cat:      { id: "cat",      name: packName("deck_cat"),        emblem: "🌿", kind: "buy", price: 5, a1: "#54e08a", a2: "#35e0c8",
    deckId: "deck_cat",        bfId: "bf_cat",        els: ["deck", "bf"] },
  spacedog: { id: "spacedog", name: packName("deck_spacedog"),   emblem: "🐆", kind: "buy", price: 5, a1: "#9b6cff", a2: "#ff4dcb",
    deckId: "deck_spacedog",   bfId: "bf_spacedog",   els: ["deck", "bf"] },
  wale:     { id: "wale",     name: packName("deck_wale"),       emblem: "🐋", kind: "buy", price: 15, a1: "#35d0ff", a2: "#7fdcff",
    deckId: "deck_wale",       bfId: "bf_wale",       els: ["deck", "bf"] },
  // Genesis = Onboarding-Starter → Bedingungs-Pack (kind "cond"): NICHT kaufbar, frei nach abgeschlossenem
  // Onboarding (6/6). Bedingung kommt via packCond aus deck_onboarding.unlock ({ kind: "onboardingDone" }).
  genesis:  { id: "genesis",  name: packName("deck_onboarding"),         emblem: "🔷", kind: "cond", a1: "#26c6e6", a2: "#9b82f0",
    deckId: "deck_onboarding", bfId: "bf_onboarding", els: ["deck", "bf"] },
  // #299: alte Progressions-/„Läufe"-Packs (neon/tank/mega/mond → deck_p1–4/bf_1–4) entfernt — sauberer Neustart
  // mit Standard (Prisma), Genesis und den kaufbaren DP-Packs. Kein Migrationspfad.

  // ---- #303 Challenge-Decks (kind:"cond") — NICHT kaufbar; über eine Challenge freigeschaltet (Bedingung aus DECK_DEFS). ----
  gottgleich: { id: "gottgleich", name: packName("deck_gottgleich"), emblem: "✨", kind: "cond", a1: "#e6b93a", a2: "#fff2c0",
    deckId: "deck_gottgleich", bfId: "bf_gottgleich", els: ["deck", "bf"] },
  serie300:   { id: "serie300",   name: packName("deck_serie300"),   emblem: "🦩", kind: "cond", a1: "#ff2d9b", a2: "#ff6ac0",
    deckId: "deck_serie300",   bfId: "bf_serie300",   els: ["deck", "bf"] },
  serie600:   { id: "serie600",   name: packName("deck_serie600"),    emblem: "🦚", kind: "cond", a1: "#7b3ff0", a2: "#ffcf3a",
    deckId: "deck_serie600",   bfId: "bf_serie600",   els: ["deck", "bf"] },
  serie1500:  { id: "serie1500",  name: packName("deck_serie1500"), emblem: "🦚", kind: "cond", a1: "#8a4dff", a2: "#ffd84a",
    deckId: "deck_serie1500",  bfId: "bf_serie1500",  els: ["deck", "bf"] },
  sparfuchs:  { id: "sparfuchs",  name: packName("deck_sparfuchs"),  emblem: "💰", kind: "cond", a1: "#2ee66a", a2: "#ffcf3a",
    deckId: "deck_sparfuchs",  bfId: "bf_sparfuchs",  els: ["deck", "bf"] },

  // ---- #310 Element-Challenge-Packs (kind "cond": kein Kauf; frei über N Mono-Läufe je Fraktion; Bedingung aus DECK_DEFS) ----
  feuer:   { id: "feuer",   name: packName("deck_feuer"),   emblem: "🔥", kind: "cond", a1: "#ff5a2a", a2: "#ffb03a",
    deckId: "deck_feuer",   bfId: "bf_feuer",   els: ["deck", "bf"] },
  eis:     { id: "eis",     name: packName("deck_eis"),     emblem: "❄️", kind: "cond", a1: "#46c6ff", a2: "#9fe8ff",
    deckId: "deck_eis",     bfId: "bf_eis",     els: ["deck", "bf"] },
  blitz:   { id: "blitz",   name: packName("deck_blitz"),   emblem: "⚡", kind: "cond", a1: "#9b6cff", a2: "#c77bff",
    deckId: "deck_blitz",   bfId: "bf_blitz",   els: ["deck", "bf"] },
  pflanze: { id: "pflanze", name: packName("deck_pflanze"), emblem: "🌿", kind: "cond", a1: "#57e08a", a2: "#b6ff3a",
    deckId: "deck_pflanze", bfId: "bf_pflanze", els: ["deck", "bf"] },
  // Prisma (Element-Bund): frei, sobald alle vier Element-Decks frei sind.
  elementar: { id: "elementar", name: packName("deck_elementar"), emblem: "🌈", kind: "cond", a1: "#6cf0ff", a2: "#ff6ac0",
    deckId: "deck_elementar", bfId: "bf_elementar", els: ["deck", "bf"] },

  // ---- #310 DP-Kauf-Packs (kind "buy", eigener Preis via price) ----
  ronin:     { id: "ronin",     name: packName("deck_ronin"),          emblem: "⚔️", kind: "buy", price: 15, a1: "#ff2f4f", a2: "#4aa8ff",
    deckId: "deck_ronin",     bfId: "bf_ronin",     els: ["deck", "bf"] },
  kosmos:    { id: "kosmos",    name: packName("deck_kosmos"), emblem: "🕳️", kind: "buy", price: 10, a1: "#ff4dcb", a2: "#7b5cff",
    deckId: "deck_kosmos",    bfId: "bf_kosmos",    els: ["deck", "bf"] },
  oni:       { id: "oni",       name: packName("deck_oni"),      emblem: "👹", kind: "buy", price: 20, a1: "#ff2e3e", a2: "#ff7a3a",
    deckId: "deck_oni",       bfId: "bf_oni",       els: ["deck", "bf"] },
  geometrie: { id: "geometrie", name: packName("deck_geometrie"),         emblem: "😇", kind: "buy", price: 5,  a1: "#ffe08a", a2: "#fff2c0",
    deckId: "deck_geometrie", bfId: "bf_geometrie", els: ["deck", "bf"] },

  // ---- #311 DP-Kauf-Packs (je 10 DP) ----
  sonne:  { id: "sonne",  name: packName("deck_sonne"),         emblem: "🐉", kind: "buy", price: 10, a1: "#ffb02a", a2: "#ff6a2a",
    deckId: "deck_sonne",  bfId: "bf_sonne",  els: ["deck", "bf"] },
  drache: { id: "drache", name: packName("deck_drache"),     emblem: "🏮", kind: "buy", price: 10, a1: "#ffcf5a", a2: "#ff5a2a",
    deckId: "deck_drache", bfId: "bf_drache", els: ["deck", "bf"] },

  // ---- #312 DP-Kauf-Packs (je 10 DP): Arcade · Polarlicht · Seedrache ----
  arcade:     { id: "arcade",     name: packName("deck_arcade"),     emblem: "💎", kind: "buy", price: 10, a1: "#39e64d", a2: "#38c6e0",
    deckId: "deck_arcade",     bfId: "bf_arcade",     els: ["deck", "bf"] },
  polarlicht: { id: "polarlicht", name: packName("deck_polarlicht"),     emblem: "🪲", kind: "buy", price: 10, a1: "#2ee0c0", a2: "#ffcf3a",
    deckId: "deck_polarlicht", bfId: "bf_polarlicht", els: ["deck", "bf"] },
  seedrache:  { id: "seedrache",  name: packName("deck_seedrache"),   emblem: "🐙", kind: "buy", price: 10, a1: "#38b0ff", a2: "#8a6cff",
    deckId: "deck_seedrache",  bfId: "bf_seedrache",  els: ["deck", "bf"] },
};

export const THEMES = Object.values(THEME_DEFS);

/* #327 Showcase-Look = kohärente Pack-Einheit (wie in-game: Deck + Battlefield + Farben gehören zusammen): der
   Effekt-Showcase leitet Hintergrund (bfId) UND Deckfarben (a1/a2) aus EINEM Pack ab. override.a1/a2/.bf (optional)
   übersteuern die Pack-Werte für Sonderfälle (z. B. neutraler Standard-Prunk). Unbekanntes/„default"-Pack → sicherer
   Genesis-Fallback (bf_onboarding) + neutrale Farbe, damit ein Tippfehler den Showcase nicht crasht. Pur & testbar. */
export function showcaseLook(packId, override = {}) {
  const t = THEME_DEFS[packId];
  const bf = override.bf || (t ? t.bfId : "bf_onboarding");
  const a1 = override.a1 || (t ? t.a1 : "#8a7de0");
  const a2 = override.a2 || (t ? t.a2 : a1);
  return { bf, a1, a2 };
}
export const PACKS = THEMES; // Sprechender Alias fürs neue Modell

// DP-Guthaben (Deckpunkte) robust lesen — Währung der Werkstatt-Packs (#299).
const dp = (profile) => Math.max(0, Math.floor(Number(profile && profile.deckPoints) || 0));

// Besitz-Schlüssel eines Kauf-Packs.
export const packOwnKey = (pack) => `pack:${pack.id}`;

// Ist das Pack ein Kauf-Pack? (→ DP-kaufbar.)
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

// Pack-Zustand fürs Badge: "own" | "buy" (DP-kaufbar) | "lock" (Bedingung offen).
export function packState(profile, pack) {
  if (packOwned(profile, pack)) return "own";
  return pack.kind === "buy" ? "buy" : "lock";
}

// Preis eines Packs in DP (nur Kauf-Packs; sonst null — Bedingungs-Packs sind gratis freischaltbar). #307: je Pack ein eigener Preis.
export const packPrice = (pack) => (isBuyPack(pack) ? Math.max(0, Math.floor(Number(pack && pack.price) || 0)) : null);

// Klartext-Freischaltung eines (Bedingungs-)Packs — Label + Fortschritt (für die Sperr-Anzeige).
export const packUnlock = (profile, pack) => unlockProgress({ unlock: packCond(pack) }, profile);

// Kann dieses Pack gekauft werden? (Kauf-Pack, noch nicht im Besitz, genug DP für seinen Preis.)
export function canBuyPack(profile, pack) {
  return isBuyPack(pack) && !packOwned(profile, pack) && dp(profile) >= packPrice(pack);
}

// Ein Pack kaufen → neues Profil (Pack-Preis in DP abziehen, in deckSpent buchen, Besitz setzen). No-op bei
// nicht kaufbar/zu wenig DP. Die Aktiv-Setzung (deckId/battlefieldId) macht die UI über onChoose.
export function buyPack(profile, pack) {
  if (!canBuyPack(profile, pack)) return profile;
  const price = packPrice(pack);
  return {
    ...profile,
    deckPoints: dp(profile) - price,
    deckSpent: Math.max(0, Math.floor(Number(profile && profile.deckSpent) || 0)) + price,
    ownedCosmetics: { ...(profile && profile.ownedCosmetics), [packOwnKey(pack)]: true },
  };
}

// #299 Test-Code „unlock": schaltet ALLE Kauf-Packs + globalen Effekte frei (in ownedCosmetics). Rein additiv —
// bestehender Besitz bleibt; ergänzt jedes Pack (pack:<id>) und jeden globalen Effekt (fx:<key>). Neues Profil.
// Kaufbare Sieg-Finisher: synthetische Kacheln in CustomizeScreen (KEIN GLOBAL_FX-Eintrag), Besitz über diese ownKeys.
// Single Source für die Voll-Freischaltung („unlock"-Code) — CustomizeScreen prüft dieselben Keys (Drift-Guard im Test).
export const BUYABLE_FINISHER_FX = ["fx:klinge", "fx:scorch", "fx:hologridSlice", "fx:blackhole"];

export function unlockAllCosmetics(profile) {
  const owned = { ...(profile && profile.ownedCosmetics) };
  for (const pack of PACKS) if (isBuyPack(pack)) owned[packOwnKey(pack)] = true;
  for (const fx of GLOBAL_FX) owned[fx.ownKey] = true;
  for (const key of BUYABLE_FINISHER_FX) owned[key] = true; // synthetische Finisher (Klinge/Laser/Hologrid/Schwarzes Loch)
  return { ...profile, ownedCosmetics: owned };
}
