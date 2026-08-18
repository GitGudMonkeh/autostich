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
  /* #deckglow-raus (18.08.2026): „Leuchten" (deckglow) ist ERSATZLOS entfernt — Effekt, Shader, Vorschau, Toggle,
     Besitz-Eintrag. Grund war Hitze auf dem Handy, nicht der Look: die Ebene ritt auf den KONTUREN des Battlefield-
     Bildes und vertrug als EINZIGE Kompositor-Ebene keine Verkleinerung (gemessene Abweichung 0,50 → 5,45 von 255,
     s. CLAUDE.md #kompositor). Sie lief damit als einzige in voller Auflösung über die volle Panelfläche, 30×/s, den
     ganzen Lauf — und weil sie zusätzlich als einzige GLEICHZEITIG mit einem Hintergrund lief, war sie auch die
     einzige Ebene, die den `stack`-Pfad des Kompositors überhaupt brauchte (der ist mit ihr entfallen).
     Wer sie zurückholt, holt beides zurück: die volle Auflösung und den zweiten Stapelplatz. */
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
/* #306/#kategorien → #331: EIN Hintergrund-Slot, zwei KATEGORIEN. Ursprünglich waren „reiner Hintergrund" (kein
   Stich-Bezug) und „Hintergrund-Finisher" (Stich-Interaktion) zwei unabhängige Slots, die gleichzeitig aktiv sein
   durften. #331 hat sie zu EINEM einfach-exklusiven Set verschmolzen: genau ein Hintergrund-Effekt ist aktiv, oder
   keiner. Durchgesetzt wird das an zwei Stellen — `BG_EXCL_OPTS` in storage.normalizeFxOptions (Migration/Laden,
   listet BG_FX_KEYS + BG_FIN_KEYS gemeinsam) und in der Auswahl-UI (CustomizeScreen, Gruppe „hintergrund").
   Die beiden Auflöser unten bleiben nach KATEGORIE getrennt, weil Battlefield sie unterschiedlich rendert
   (Dauer-Effekt vs. Stich-Eruption) — aber es liefert per Konstruktion IMMER höchstens einer von beiden einen Key.
   Wer hier einen Effekt ergänzt, muss ihn auch in BG_EXCL_OPTS eintragen, sonst bricht die Exklusivität. */
export const auroraActive = (profile, options) => globalFxActive(profile, options, "aurora");
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
  sunset: { id: "sunset", name: packName("deck_sunset"), emblem: "🏍️", kind: "buy", price: 20, a1: "#ff5a4d", a2: "#ffab3a",
    deckId: "deck_sunset", bfId: "bf_sunset", els: ["deck", "bf"] },
  lofi:   { id: "lofi",   name: packName("deck_lofi"),      emblem: "🦊", kind: "buy", price: 10, a1: "#bcd8ff", a2: "#7fb0ff",
    deckId: "deck_lofi",  bfId: "bf_lofi",  els: ["deck", "bf"] },
  // #IP: „Neon Kaiju" / „Super Aura" / „Mecha Ronin" wegen IP-Bedenken entfernt.

  // ---- v0.4 Kauf-Packs (1 Kauf = Deck + Battlefield) ----
  beach:    { id: "beach",    name: packName("deck_beach"),     emblem: "🌴", kind: "buy", price: 20, a1: "#ff5aa0", a2: "#35d0e0",
    deckId: "deck_beach",      bfId: "bf_beach",      els: ["deck", "bf"] },
  cat:      { id: "cat",      name: packName("deck_cat"),        emblem: "🌿", kind: "buy", price: 10, a1: "#54e08a", a2: "#35e0c8",
    deckId: "deck_cat",        bfId: "bf_cat",        els: ["deck", "bf"] },
  spacedog: { id: "spacedog", name: packName("deck_spacedog"),   emblem: "🐆", kind: "buy", price: 10, a1: "#9b6cff", a2: "#ff4dcb",
    deckId: "deck_spacedog",   bfId: "bf_spacedog",   els: ["deck", "bf"] },
  wale:     { id: "wale",     name: packName("deck_wale"),       emblem: "🐋", kind: "buy", price: 30, a1: "#35d0ff", a2: "#7fdcff",
    deckId: "deck_wale",       bfId: "bf_wale",       els: ["deck", "bf"] },
  // Genesis = Onboarding-Starter → Bedingungs-Pack (kind "cond"): NICHT kaufbar, frei nach abgeschlossenem
  // Onboarding (6/6). Bedingung kommt via packCond aus deck_onboarding.unlock ({ kind: "onboardingDone" }).
  /* #deck-mobil: `a2` war Violett (#9b82f0) — der alte Logo-Ton, nicht aus dem Bild gezogen. Aufgefallen ist
     das erst, seit der Hub am Handy den Spielfeld-Hintergrund zeigt: `bf_onboarding` ist ein Synthwave-
     Horizont, dessen Leuchtmasse bei ~308° (Magenta) liegt, und Violett sitzt 54° daneben. Nachgemessen über
     alle 40 Spielfelder (`npm run bf:helligkeit` misst Helligkeit, die Farbprüfung lief einmalig daneben) war
     das der mit ABSTAND schlechteste Wert — der nächstschlechtere lag bei 31°.
     Grund ist die Bauart des Bildes: es ist ein voller Farbverlauf (Blau → Magenta → Orange), sein stärkster
     Neon-Sektor hält nur 13 % der Leuchtmasse — der niedrigste Wert aller 40. Ein Zweifarb-Paar kann so ein
     Bild nie ganz treffen; es kann nur aufhören, danebenzuliegen.
     Geändert wurde deshalb NUR `a2` (54° → 8°). `a1` bleibt Cyan: es ist die Marken-/CTA-Farbe, es steckt als
     Gitterfarbe links im Bild, und Genesis ist das Standard-Deck jedes neuen Spielers (storage.js
     DEFAULT_PROFILE) — der Grundton des Spiels soll nicht an einem Hintergrundbild hängen. Cyan → Magenta
     zeichnet jetzt genau den Schwenk nach, den das Bild von links nach rechts macht.
     Nicht `#ff4dcb` genommen, obwohl ebenso nah dran: das ist exakt Kosmos' `a1`, die beiden Decks wären
     im Hub kaum zu unterscheiden. */
  genesis:  { id: "genesis",  name: packName("deck_onboarding"),         emblem: "🔷", kind: "cond", a1: "#26c6e6", a2: "#ff2ec8",
    deckId: "deck_onboarding", bfId: "bf_onboarding", els: ["deck", "bf"] },
  // #299: alte Progressions-/„Läufe"-Packs (neon/tank/mega/mond → deck_p1–4/bf_1–4) entfernt — sauberer Neustart
  // mit Standard (Prisma), Genesis und den kaufbaren DP-Packs. Kein Migrationspfad.

  // ---- #303 Challenge-Decks (kind:"cond") — NICHT kaufbar; über eine Challenge freigeschaltet (Bedingung aus DECK_DEFS). ----
  gottgleich: { id: "gottgleich", name: packName("deck_gottgleich"), emblem: "✨", kind: "cond", a1: "#e6b93a", a2: "#fff2c0",
    deckId: "deck_gottgleich", bfId: "bf_gottgleich", els: ["deck", "bf"] },
  // #tiered Stufen-Deck „Peacock" — EIN Challenge-Eintrag mit drei je eigen freigeschalteten Stufen (I/II/III).
  // Die Stufen zeigen auf die realen Skins deck_serie300/600/1500 (Streak 300/600/1500, Bedingung aus DECK_DEFS).
  // Cover = höchste freigeschaltete Stufe (UI via coverTier); Top-Level-Felder spiegeln Stufe I als Fallback für
  // generischen Pack-Code (packCond/packOwned lesen deckId=deck_serie300 → „im Besitz", sobald Stufe I frei ist).
  // Sprachprüfung: kein Stufenname wird abgetippt — jede Stufe zieht ihren Namen aus IHREM Deck (packName), und
  // `nameDeckId` sagt, welchem Deck das Paket selbst seinen Namen verdankt (Stufe II, nicht der Fallback-deckId).
  // Übersetzt wird zur Anzeigezeit in labels.js `themeDef`; hier steht nur die deutsche Quelle.
  peacock: { id: "peacock", name: packName("deck_serie600"), nameDeckId: "deck_serie600",
    emblem: "🦚", kind: "cond", a1: "#ff2d9b", a2: "#ff6ac0",
    deckId: "deck_serie300", bfId: "bf_serie300", els: ["deck", "bf"],
    tiers: [
      { roman: "I",   name: packName("deck_serie300"),  deckId: "deck_serie300",  bfId: "bf_serie300",  a1: "#ff2d9b", a2: "#ff6ac0" },
      // Stufe II war auf Lila/Gold gesetzt (aus der Patch-Notes-Beschreibung „Pfau in Lila/Gold"), das Kartenbild
      // ist aber Pink: 84 % der farbigen Pixel in deck_serie600 liegen im Farbton 315–360°, Gold (45–60°) kommt
      // mit 0,0 % gar nicht vor. Werte aus den hellsten Bildfarben (#f0288c/#f0508c) abgeleitet und im Verlauf
      // heller gezogen, damit die Stufe trotz gleicher Farbfamilie von Stufe I (Flamingo) unterscheidbar bleibt.
      { roman: "II",  name: packName("deck_serie600"),  deckId: "deck_serie600",  bfId: "bf_serie600",  a1: "#ff1f7a", a2: "#ffa3c4" },
      { roman: "III", name: packName("deck_serie1500"), deckId: "deck_serie1500", bfId: "bf_serie1500", a1: "#8a4dff", a2: "#ffd84a" },
    ] },
  // #tiered Titan — Stufen-Deck über Score (25/50/100 Mio). Lila Steingigant, der über die Stufen erwacht/aufsteigt.
  // Pack-Name = Kategorie „Titan" (kein einzelnes Stufen-Deck heißt so); die Stufennamen sind die kurzen Stufenwörter
  // (Header zeigt „Titan · Erwachen" …). Deutsche Quelle; Übersetzung erfolgt zur Anzeigezeit.
  titan: { id: "titan", name: "Titan", emblem: "⛰️", kind: "cond", a1: "#7a3fd0", a2: "#b98bff",
    deckId: "deck_titan1", bfId: "bf_titan1", els: ["deck", "bf"],
    tiers: [
      { roman: "I",   name: "Erwachen",   deckId: "deck_titan1", bfId: "bf_titan1", a1: "#7a3fd0", a2: "#b98bff" },
      { roman: "II",  name: "Aufstieg",   deckId: "deck_titan2", bfId: "bf_titan2", a1: "#9b3fff", a2: "#c88bff" },
      { roman: "III", name: "Entfesselt", deckId: "deck_titan3", bfId: "bf_titan3", a1: "#b455ff", a2: "#e0b0ff" },
    ] },
  // #tiered Hirsch — Stufen-Deck über abgeschlossene Läufe (10/20/30). Blaues Sternbild-Reh, das über die Stufen erstrahlt.
  hirsch: { id: "hirsch", name: "Hirsch", emblem: "🦌", kind: "cond", a1: "#5b7cff", a2: "#b8c8ff",
    deckId: "deck_hirsch1", bfId: "bf_hirsch1", els: ["deck", "bf"],
    tiers: [
      { roman: "I",   name: "Sternbild",  deckId: "deck_hirsch1", bfId: "bf_hirsch1", a1: "#5b7cff", a2: "#b8c8ff" },
      { roman: "II",  name: "Erwacht",    deckId: "deck_hirsch2", bfId: "bf_hirsch2", a1: "#6f8cff", a2: "#c4d4ff" },
      { roman: "III", name: "Sternenlauf", deckId: "deck_hirsch3", bfId: "bf_hirsch3", a1: "#89a4ff", a2: "#dbe6ff" },
    ] },
  // #tiered Thron — Ranglisten-Stufen-Deck über gewonnene Wochen (1./2./3. Platz 1 im Meister-Wochen-Board).
  // Burgunder Neon auf Schwarz; die Stufen werden heller und greller, bis die weiß-heiße Krone übernimmt.
  thron: { id: "thron", name: "Thron", emblem: "👑", kind: "cond", a1: "#8f0f2a", a2: "#ff3b5c",
    deckId: "deck_thron1", bfId: "bf_thron1", els: ["deck", "bf"],
    tiers: [
      { roman: "I",   name: "Anwärter",    deckId: "deck_thron1", bfId: "bf_thron1", a1: "#8f0f2a", a2: "#ff3b5c" },
      { roman: "II",  name: "Souverän",    deckId: "deck_thron2", bfId: "bf_thron2", a1: "#b0122f", a2: "#ff5f7a" },
      { roman: "III", name: "Unsterblich", deckId: "deck_thron3", bfId: "bf_thron3", a1: "#d4143a", a2: "#ff9fb0" },
    ] },
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
  ronin:     { id: "ronin",     name: packName("deck_ronin"),          emblem: "⚔️", kind: "buy", price: 30, a1: "#ff2f4f", a2: "#4aa8ff",
    deckId: "deck_ronin",     bfId: "bf_ronin",     els: ["deck", "bf"] },
  kosmos:    { id: "kosmos",    name: packName("deck_kosmos"), emblem: "🕳️", kind: "buy", price: 20, a1: "#ff4dcb", a2: "#7b5cff",
    deckId: "deck_kosmos",    bfId: "bf_kosmos",    els: ["deck", "bf"] },
  oni:       { id: "oni",       name: packName("deck_oni"),      emblem: "👹", kind: "buy", price: 20, a1: "#ff2e3e", a2: "#ff7a3a",
    deckId: "deck_oni",       bfId: "bf_oni",       els: ["deck", "bf"] },
  geometrie: { id: "geometrie", name: packName("deck_geometrie"),         emblem: "😇", kind: "buy", price: 10,  a1: "#ffe08a", a2: "#fff2c0",
    deckId: "deck_geometrie", bfId: "bf_geometrie", els: ["deck", "bf"] },

  // ---- #311 DP-Kauf-Packs (je 10 DP) ----
  sonne:  { id: "sonne",  name: packName("deck_sonne"),         emblem: "🐉", kind: "buy", price: 20, a1: "#ffb02a", a2: "#ff6a2a",
    deckId: "deck_sonne",  bfId: "bf_sonne",  els: ["deck", "bf"] },
  drache: { id: "drache", name: packName("deck_drache"),     emblem: "🏮", kind: "buy", price: 20, a1: "#ffcf5a", a2: "#ff5a2a",
    deckId: "deck_drache", bfId: "bf_drache", els: ["deck", "bf"] },

  // ---- #312 DP-Kauf-Packs (je 10 DP): Arcade · Polarlicht · Seedrache ----
  arcade:     { id: "arcade",     name: packName("deck_arcade"),     emblem: "💎", kind: "buy", price: 20, a1: "#39e64d", a2: "#38c6e0",
    deckId: "deck_arcade",     bfId: "bf_arcade",     els: ["deck", "bf"] },
  polarlicht: { id: "polarlicht", name: packName("deck_polarlicht"),     emblem: "🪲", kind: "buy", price: 20, a1: "#2ee0c0", a2: "#ffcf3a",
    deckId: "deck_polarlicht", bfId: "bf_polarlicht", els: ["deck", "bf"] },
  /* Eldritch hat neue Motive bekommen (#deck-nacht): dieselbe Szene, aber aufgeräumt — Tiefseetempel unter
     Lichtschächten statt der alten Version mit den violetten Quallen. `a1` bleibt, weil die FLÄCHE dieselbe ist
     (gemessen 197–203°, der Eintrag steht auf 204°); `a2` musste weichen: das Violett gehörte den Quallen, die es
     nicht mehr gibt. An ihrer Stelle steht jetzt das Orange (32°), und es ist im neuen Bild kein Zufallslicht,
     sondern gesetzt — die vier Eckkugeln des Rahmens, die Lavaschlote am Spielfeldrand und das Auge der Kreatur.
     Damit ist Eldritch zweifarbig wie das Motiv: kaltes Blau als Grund, warme Glut als Gegenpunkt. */
  seedrache:  { id: "seedrache",  name: packName("deck_seedrache"),   emblem: "🐙", kind: "buy", price: 20, a1: "#38b0ff", a2: "#ff9a2e",
    deckId: "deck_seedrache",  bfId: "bf_seedrache",  els: ["deck", "bf"] },
  // Obsidian — monochromes Kristall-Monolith-Pack (schwarz mit weiß glühenden Rissen).
  obsidian:   { id: "obsidian",   name: "Obsidian",   emblem: "🗿", kind: "buy", price: 30, a1: "#e8edf5", a2: "#9aa6bd",
    deckId: "deck_obsidian",   bfId: "bf_obsidian",   els: ["deck", "bf"] },

  // ---- #deck40 vier DP-Kauf-Packs à 40 DP (Legendär): Elementar-Kreaturen ----
  gaia:     { id: "gaia",     name: packName("deck_gaia"),     emblem: "🐢", kind: "buy", price: 40, a1: "#35e06a", a2: "#a6ff8f",
    deckId: "deck_gaia",     bfId: "bf_gaia",     els: ["deck", "bf"] },
  glazius:  { id: "glazius",  name: packName("deck_glazius"),  emblem: "🦣", kind: "buy", price: 40, a1: "#4db3ff", a2: "#a8e6ff",
    deckId: "deck_glazius",  bfId: "bf_glazius",  els: ["deck", "bf"] },
  /* Voltaris ist ZWEIFARBIG — violette Figur, türkise Ruine. Die zweite Farbe stand bis 18.08.2026 nicht in der
     Registry: `a2` war ein zweites Violett (#c9a0ff, 266°), obwohl Türkis im Motiv das GRÖSSTE Farbband stellt
     (gemessen an den Spitzlichtern: 180–195° 31,9 % gegen 255–270° 25,4 %) und Rahmenfuß wie ganzes Spielfeld trägt.
     `a2` ist deshalb der aus dem Bild abgeleitete Ton (Häufung bei 186–187°), nicht geschätzt.
     Zweiter Grund, und der wiegt schwerer: `a1` liegt bei 263° und damit praktisch auf `blitz` (#9b6cff, 259°) —
     die zwei Decks waren über ihre Hauptfarbe kaum zu unterscheiden. Das Türkis trennt sie jetzt am Verlauf.
     Der 186°-Bereich ist bei anderen Decks besetzt (elementar a1, beach/arcade a2), das ist bewusst in Kauf
     genommen: unterscheidbar macht ein Deck das PAAR, und Violett→Türkis kommt sonst nirgends vor. */
  voltaris: { id: "voltaris", name: packName("deck_voltaris"), emblem: "🦂", kind: "buy", price: 40, a1: "#9b5cff", a2: "#2fdaed",
    deckId: "deck_voltaris", bfId: "bf_voltaris", els: ["deck", "bf"] },
  pyrros:   { id: "pyrros",   name: packName("deck_pyrros"),   emblem: "🐼", kind: "buy", price: 40, a1: "#ff5a2a", a2: "#ffb347",
    deckId: "deck_pyrros",   bfId: "bf_pyrros",   els: ["deck", "bf"] },

  /* ---- #deck-material drei DP-Kauf-Packs über ein MATERIAL statt einer Kreatur ----
     Die Farben sind aus den LEUCHTENDEN Stellen der Kartenmotive gemessen, nicht geschätzt (Farbton je Pack:
     Quecksilber h≈210 · Kintsugi h≈35 · Salar h≈240). Zwei davon sind fast unbunt, und da wurde es eng: Obsidian
     (a1 #e8edf5, s=0,05) besetzt bereits „neutrales Weiß". Quecksilber und Salar sind deshalb bewusst über den
     FARBTON auseinandergezogen und leicht angehoben in der Sättigung — Quecksilber blau-chrom, Salar violett-eisig —
     sonst hätte man drei kaum unterscheidbare Silberdecks. Wer hier nachdreht: die Deckfarbe treibt Knöpfe,
     Wortmarke und alle Karten-/Feld-Effekte, sie muss also auch AUF dem Spielfeld noch als Farbe lesbar sein. */
  quecksilber: { id: "quecksilber", name: packName("deck_quecksilber"), emblem: "💧", kind: "buy", price: 30, a1: "#c9d2dc", a2: "#8e97a3",
    deckId: "deck_quecksilber", bfId: "bf_quecksilber", els: ["deck", "bf"] },
  kintsugi:    { id: "kintsugi",    name: packName("deck_kintsugi"),    emblem: "🏺", kind: "buy", price: 40, a1: "#e49c30", a2: "#f0e2cc",
    deckId: "deck_kintsugi",    bfId: "bf_kintsugi",    els: ["deck", "bf"] },
  salar:       { id: "salar",       name: packName("deck_salar"),       emblem: "🌙", kind: "buy", price: 20, a1: "#d8dee6", a2: "#9aa2ad",
    deckId: "deck_salar",       bfId: "bf_salar",       els: ["deck", "bf"] },

  /* ---- #deck-neon zwei DP-Kauf-Packs ----
     Farben wie bei den letzten Sätzen aus den LEUCHTENDEN Stellen des Motivs gemessen, nicht geschätzt.
     Nachtklinge ist zweifarbig gebaut (Magenta 33 % der Spitzlichter, Cyan 18 %) — das ist die klassische
     Cyberpunk-Doppelung, und beide Töne tragen im Bild eine eigene Aufgabe: Magenta die Stadt und der Tunnel,
     Cyan die Klinge und die HUD-Ecken des Rahmens. Deshalb ist `a1` das Magenta (Fläche) und `a2` das Cyan.
     Paradox dagegen ist eindeutig GOLD-dominiert (45–60° zusammen mit 30–45° = 82 %), Türkis ist mit 8 % nur
     der Glaskörper — entsprechend Gold als `a1`. Nachbarn im Goldband sind gottgleich (44°) und geometrie (44°);
     Paradox liegt mit 50° darüber und trennt sich zusätzlich am `a2` (Türkis statt Creme). */
  nachtklinge: { id: "nachtklinge", name: packName("deck_nachtklinge"), emblem: "🥷", kind: "buy", price: 20, a1: "#ff2ea0", a2: "#22c4dc",
    deckId: "deck_nachtklinge", bfId: "bf_nachtklinge", els: ["deck", "bf"] },
  paradox:     { id: "paradox",     name: packName("deck_paradox"),     emblem: "♾️", kind: "buy", price: 10, a1: "#2bd0c8", a2: "#ffcf3a",
    deckId: "deck_paradox",     bfId: "bf_paradox",     els: ["deck", "bf"] },

  /* ---- #deck-nacht zwei DP-Kauf-Packs ----
     Zwei Nachtbilder, und genau darin lag die Arbeit: nach der Messung der Spitzlichter (hell UND farbig) sah
     BEIDES zuerst nach Pink aus — Hanami 93 %, Nimbus 82 %. Ein zweiter Durchgang über die FLÄCHE (statt nur über
     die Leuchtkerne) trennt sie: bei Hanami ist der Grund ein fast schwarzes Violett (#291039), es leuchtet dort
     wirklich nur Pink und Bernstein; bei Nimbus ist das Violett eine echte Mittellage (43 % Fläche, #37214f/#4f3071)
     und trägt Himmel und Stadt. Deshalb liegen die Rollen andersherum:
     · Hanami — `a1` das Blüten-Pink (343°, Krone und obere Rahmenhälfte), `a2` der Laternen-Bernstein (26°, die
       schwimmenden Lampions und der untere Rahmenverlauf). Nachbarn im Pinkband sind beach (334°) und nachtklinge
       (327°); Hanami liegt darüber, ist also rosiger, und trennt sich zusätzlich hart am `a2` (Bernstein statt
       Cyan/Türkis).
     · Nimbus — `a1` das Nachtviolett (267°, Fläche), `a2` das Rosa der Qualle (335°, das einzige, was leuchtet).
       Dieselbe Aufteilung wie bei nachtklinge: Fläche vor Motiv. Das Bernstein der Fenster bleibt AUSSEN vor, es
       ist Streulicht ohne eigene Aufgabe — und Hanami hat den Ton schon. Enger Nachbar ist spacedog (259°, a2
       Magenta #ff4dcb): Nimbus liegt 8° tiefer im Violett und sein `a2` ist das weichere Rosa, kein hartes Magenta. */
  hanami: { id: "hanami", name: packName("deck_hanami"), emblem: "🌸", kind: "buy", price: 30, a1: "#ff4d80", a2: "#ff9a4d",
    deckId: "deck_hanami", bfId: "bf_hanami", els: ["deck", "bf"] },
  nimbus: { id: "nimbus", name: packName("deck_nimbus"), emblem: "🪼", kind: "buy", price: 10, a1: "#9558e0", a2: "#ff77b0",
    deckId: "deck_nimbus", bfId: "bf_nimbus", els: ["deck", "bf"] },
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

// Pack + passende Akzentfarben zu einer equippten deckId — löst bei Stufen-Decks die konkrete Stufe (eigene a1/a2) auf.
// null, wenn keine Zuordnung (z. B. Genesis/Standard). Nutzt die Battlefield-/Deck-Farb-Ableitung in-game (App.jsx).
export function resolvePackByDeckId(deckId) {
  for (const t of THEMES) {
    if (isTieredPack(t)) {
      const tier = tierByDeckId(t, deckId);
      if (tier) return { pack: t, a1: tier.a1, a2: tier.a2 };
    } else if (t.deckId === deckId) {
      return { pack: t, a1: t.a1, a2: t.a2 };
    }
  }
  return null;
}

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

/* ---- #tiered: Stufen-Decks (EIN Challenge-Eintrag, mehrere je eigen freigeschaltete Stufen I/II/III) ----
   Ein Stufen-Deck trägt `tiers: [{ roman, name, deckId, bfId, a1, a2 }, …]` (aufsteigend). Jede Stufe ist ein realer
   Skin mit eigener Freischalt-Bedingung (aus DECK_DEFS[tier.deckId].unlock). Cover/Preview/Aktivierung lösen die
   passende Stufe über diese Helfer auf; der übrige Pack-Code arbeitet mit den Top-Level-Feldern (= Stufe I) weiter. */
export const isTieredPack = (pack) => Array.isArray(pack && pack.tiers) && pack.tiers.length > 0;
// Freigeschaltete Stufen (in Reihenfolge I→…). Nicht-Stufen-Pack → [].
export function unlockedTiers(profile, pack) {
  if (!isTieredPack(pack)) return [];
  return pack.tiers.filter((t) => isUnlocked(DECK_DEFS[t.deckId], profile));
}
// Höchste freigeschaltete Stufe (oder null).
export function highestUnlockedTier(profile, pack) {
  const u = unlockedTiers(profile, pack);
  return u.length ? u[u.length - 1] : null;
}
// Cover-/Anzeige-Stufe: höchste freigeschaltete, sonst Stufe I (für die gesperrte Kachel).
export function coverTier(profile, pack) {
  return highestUnlockedTier(profile, pack) || (isTieredPack(pack) ? pack.tiers[0] : null);
}
// Stufe per deckId finden (oder null).
export const tierByDeckId = (pack, deckId) => (isTieredPack(pack) ? pack.tiers.find((t) => t.deckId === deckId) : null) || null;
// Ist diese deckId (irgend)eine Stufe dieses Packs?
export const packHasTierDeck = (pack, deckId) => !!tierByDeckId(pack, deckId);
// „Pack-Sicht" einer Stufe: pack-artiges Objekt mit den Feldern der Stufe (für Preview/Aktivierung/Farbe).
export function tierAsPack(pack, tier) {
  if (!tier) return pack;
  return { ...pack, deckId: tier.deckId, bfId: tier.bfId, a1: tier.a1, a2: tier.a2, tierName: tier.name, tierRoman: tier.roman };
}

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
