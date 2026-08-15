import { useState, useRef, useEffect, lazy, Suspense } from "react";
import { createPortal } from "react-dom";
import { useEscape } from "./useEscape.js";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion.js"; // #328 Showcase-Loop (Eis/Pflanze) bei Reduced-Motion aussetzen
import { MODAL_CARD, TopHairline, STICKY_HEAD_BG, HAIRLINE } from "./modalStyle.jsx";
import {
  THEMES, THEME_DEFS, showcaseLook,
  packState, packPrice, packUnlock, canBuyPack, buyPack, hasBattlefield,
  GLOBAL_FX, GLOBAL_FX_BY_KEY, globalFxPrice, globalFxOwned, canBuyGlobalFx, buyGlobalFx,
} from "../game/themes.js";
import { deckAssets, battlefieldAssets } from "./cosmeticAssets.js";
import { SliceFx, FieldFxLayer, FX_RENDERER, KLINGE_TUNE } from "./Battlefield.jsx";
// Pixi-Umbau: GPU-Emitter für die Feld-Effekt-Vorschau (lazy → Pixi bleibt aus dem main-Bundle; Mount ist env-gegatet).
import { PIXI_FIELD_KEYS } from "./fx/fieldFxKeys.js"; // pixi-frei: welche Feld-Effekte im Showcase auf die GPU-Bühne gehen
import AuroraFieldGL from "./fx/AuroraFieldGL.jsx"; // Aurora-Vorschau als eigene WebGL-Canvas (nicht Pixi)
import NeonSurfFieldGL from "./fx/NeonSurfFieldGL.jsx"; // #345 Neon-Brandung-Vorschau (eigene WebGL-Canvas)
import DeckGlowFieldGL from "./fx/DeckGlowFieldGL.jsx"; // #deckglow: Deck-Glow-Vorschau (eigene WebGL-Canvas)
import ScorchFx from "./fx/ScorchFx.jsx"; // #319 Scorch-Sieg-Finisher (Canvas-2D, pixi-frei) — Vorschau + In-Game
import BlackholeFx from "./fx/BlackholeFx.jsx"; // #320 Schwarzes-Loch-Sieg-Finisher (persistentes Panel-Loch) — Vorschau + In-Game
const PixiStage = lazy(() => import("./fx/PixiStage.jsx").then((m) => ({ default: m.PixiStage })));
// #318 Karten-Animationen: geteilte Pixi-Overlay-Bühne über der Vorschau-Karte (Edge-Glow …), lazy wie PixiStage.
const CardFxStage = lazy(() => import("./fx/CardFxStage.jsx").then((m) => ({ default: m.CardFxStage })));
// #322–#326 Gottgleich-Prunk (PIXI) — Vorschau lazy wie die anderen Pixi-Effekte (Pixi lädt erst, wenn der gott-Preview rendert).
import { GottChromeWord } from "./fx/GottChromeWord.jsx"; // #gott geteilte Chrome-Wortmarke (gleicher Stil wie In-Game)
const SonnenPulsPixi = lazy(() => import("./fx/SonnenPulsPixi.jsx"));
const LaserFaecherPixi = lazy(() => import("./fx/LaserFaecherPixi.jsx"));
const PrismaKaskadePixi = lazy(() => import("./fx/PrismaKaskadePixi.jsx"));
const HoloCubePixi = lazy(() => import("./fx/HoloCubePixi.jsx"));
const SupernovaPixi = lazy(() => import("./fx/SupernovaPixi.jsx"));
const HologridSlicePixi = lazy(() => import("./fx/HologridSlicePixi.jsx")); // #321 Sieg-Finisher „Hologrid-Slice" (Pixi)
// #spezial Archetyp-Effekte für den Showcase (Hitze/Moos/Blitz/Eis).
const FireHead = lazy(() => import("./fx/FireHead.jsx").then((m) => ({ default: m.FireHead })));
const MossGrow = lazy(() => import("./fx/MossGrow.jsx"));
const FrostIce = lazy(() => import("./fx/FrostIce.jsx"));
const CardIonStorm = lazy(() => import("./fx/CardIonStorm.jsx"));
// #317 Cube-Matrix — musik-reaktives Würfelfeld für die Showcase (lazy wie die anderen FX).
const CubeMatrixField = lazy(() => import("./fx/CubeMatrixField.jsx"));
import { Card } from "./Card.jsx";

// #perf-shop (Plan A): Alle Effekt-Vorschau-Chunks beim Öffnen der Deck-Werkstatt im Hintergrund vorladen. Sonst muss
//   der erste Blick auf einen Effekt erst dessen Chunk (v. a. den großen gemeinsamen Pixi-Chunk) laden → spürbare
//   Verzögerung. import() nutzt DIESELBEN Specifier wie die lazy()-Wrapper oben → das Modul-Registry dedupt (kein
//   Doppel-Load), das Vorladen wärmt also direkt die lazy-Komponenten. Best-effort: Fehler werden geschluckt, läuft im
//   Idle, nur EINMAL pro Session (fxPrefetched-Guard).
const FX_PREFETCH = [
  () => import("./fx/PixiStage.jsx"), () => import("./fx/CardFxStage.jsx"),
  () => import("./fx/SonnenPulsPixi.jsx"), () => import("./fx/LaserFaecherPixi.jsx"), () => import("./fx/PrismaKaskadePixi.jsx"),
  () => import("./fx/HoloCubePixi.jsx"), () => import("./fx/SupernovaPixi.jsx"), () => import("./fx/HologridSlicePixi.jsx"),
  () => import("./fx/FireHead.jsx"), () => import("./fx/MossGrow.jsx"), () => import("./fx/FrostIce.jsx"),
  () => import("./fx/CardIonStorm.jsx"), () => import("./fx/CubeMatrixField.jsx"),
];
let fxPrefetched = false;
function prefetchFxChunks() {
  if (fxPrefetched || typeof window === "undefined") return;
  fxPrefetched = true;
  const run = () => { for (const imp of FX_PREFETCH) { try { imp().catch(() => {}); } catch { /* ignore */ } } };
  if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(run, { timeout: 1500 });
  else setTimeout(run, 300);
}
import { suitColor, SUIT_ORDER } from "../game/constants.js";
import { audio } from "./audio.js"; // Showcase-Panel spielt den Klinge-Sound mit

// #327 Standard-Backdrop für ALLE Effekt-Showcases: das Genesis-Battlefield (Default-Standard-BG, Single Source of Truth
// = THEME_DEFS.genesis.bfId). Im Standard-Modus zeigt jeder Showcase Genesis; nur der Deckfarbe-Modus zeigt den Pack-BG.
const SHOWCASE_BF = THEME_DEFS.genesis.bfId; // = "bf_onboarding"

/* #deckshop — DECK-WERKSTATT (schlankes Modell): zwei Kategorien.
   • PACKS   = Karte (Front + Back) + Battlefield als EIN Kauf. Tap → Detail-Ansicht mit Vorschau
     (Karte vorne / Karte hinten / Hintergrund umschaltbar, ‹ ›/Swipe zwischen Packs). Kaufen aktiviert das
     Pack direkt (setzt deckId UND battlefieldId zusammen).
   • EFFEKTE = alle globalen Effekte, einzeln kaufbar (Karten-Animationen · Sieg-Finisher · Krit · Gottgleich-
     Prunk). Nicht-gekauft → „Vorschau · Preis"-Zeile öffnet ein Kauffenster mit echter In-Game-Vorschau;
     gekauft wird nur dort. In der Übersicht danach togglen (bzw. Finisher auswählen).
   Kauf spendet SP (onProfileChange); Aktiv-Wahl/Toggles schreiben in die Optionen (onChoose). Reine Kosmetik. */

// Echtes Seitenverhältnis der Deck-Bilder (1066×1476) → object-contain zeigt die Karte vollständig
// (kein Anschnitt oben/unten), der bemalte Neon-Rahmen bleibt intakt und der Frame-Glow sitzt bündig.
const CARD_RATIO = "1066 / 1476";
// Demo-Farbe der Effekt-Vorschauen (in-game = Deck-/Suit-Farbe).
const DEMO_C = "#35e0ff";
/* #327 Showcase-Deckfarbe AUTOMATISCH aus dem Pack des gezeigten Hintergrunds ableiten (kohärente Pack-Einheit wie
   in-game). Pro Effekt nur noch EINE Pack-Angabe (`pack`); Hintergrund (Pack-`bfId`) UND Deckfarben (Pack-`a1/a2`)
   folgen daraus über showcaseLook. Optionaler Per-Effekt-Override (a1/a2/bf) bleibt als Sicherheitsventil — nur setzen,
   wenn die abgeleitete Farbe den Standard↔Deckfarbe-Toggle unsichtbar macht oder schlecht lesbar wird.
   WICHTIG: Der Pack-`bf` wird nur im DECKFARBE-Modus gezeigt; im Standard-Modus kommt einheitlich Genesis (SHOWCASE_BF).
   Karten-Animationen (edgeglow/holo/glitch) laufen IMMER in der Deckfarbe → neutraler Genesis-Backdrop (Pack „genesis"). */
export const LOOK_REFS = { // #327 exportiert für den Drift-Guard-Test (kein Effekt darf still eine Fremdfarbe einführen)
  aurora:        { pack: "wale" },       // Feld IST der Effekt (bgfx) — Deckfarbe = Moonwhale (kühl)
  starfield:     { pack: "arcade" },     // #359 bgfin — Deckfarbe = Beryll (grün/cyan): grünes Neon-Arcade-Feld hebt die Deckfarbe klar vom weiß-blauen Standard-Kometen ab (war Drache gold/warm)
  cubematrix:    { pack: "arcade" },     // bgfx — Deckfarbe = Beryll (grün/cyan)
  neonsurf:      { pack: "polarlicht" }, // #345 bgfx — Deckfarbe = Polarlicht (blau/grün, Tiefsee-Biolumineszenz)
  klinge:        { pack: "drache" },     // Sieg-Finisher — Deckfarbe = Drache (warm-gold)
  scorch:        { pack: "wale" },       // Sieg-Finisher — Deckfarbe = Moonwhale (kühl-cyan)
  hologrid:      { pack: "blitz" },      // Sieg-Finisher (Hologrid-Laser) — Deckfarbe = Blitz (violett)
  blackhole:     { pack: "kosmos" },     // Sieg-Finisher — Deckfarbe = Kosmos (Magenta)
  sonnenPuls:    { pack: "gottgleich" }, // Score-Prunk — Deckfarbe = Gottgleich (gold/grün)
  laserFaecher:  { pack: "blitz" },      // Score-Prunk — Deckfarbe = Blitz (violett)
  prismaKaskade: { pack: "polarlicht" },// Score-Prunk — Deckfarbe = Polarlicht (blau/grün)
  holoCube:      { pack: "geometrie" },  // Score-Prunk — Deckfarbe = Metatron (violett/gold)
  supernova:     { pack: "spacedog" },   // Score-Prunk — Deckfarbe = Kosmospanther (violett/magenta)
  edgeglow:      { pack: "genesis" },    // Karten-Anim — immer Deckfarbe, neutraler Genesis-Backdrop
  holo:          { pack: "genesis" },
  glitch:        { pack: "genesis" },
  // Override: Standard-Prunk zeigt nur die Chrome-Wortmarke (kein Pack-Farbmodus) → Sonnen-Backdrop, Farbe neutral.
  gottStandard:  { pack: "sonne", a1: "#cbd3ff", a2: "#cbd3ff" },
};
const PREVIEW_LOOK = Object.fromEntries(
  Object.entries(LOOK_REFS).map(([key, ref]) => [key, showcaseLook(ref.pack, ref)])
);
// #318 Preview-Key → CardFxStage-Layer-Flag (welcher Layer in der Showcase gezeigt wird).
const ANIM_LAYER = { edgeglow: "edgeGlow", holo: "holo", glitch: "glitch" };

// Default-Pack (UI-seitig) = GENESIS: das immer-freie Start-/Grund-Deck inkl. Battlefield (ersetzt das frühere
// „Standard"-Deck deck/bf "default"). kind:"std" → immer im Besitz, steht auf der Packs-Seite zuoberst. Genesis bleibt
// in der puren Registry ein cond-Pack; hier wird es nur UI-seitig als Default (std) präsentiert.
const STD_PACK = { ...(THEMES.find((t) => t.id === "genesis") || {}), kind: "std" };
// #307/#Shop-Reorg: eigene Kategorien. „Packs" = Genesis (Default) + Kauf-Packs, nach DP-Preis aufsteigend (billig oben,
// teuer unten; Genesis immer zuoberst). „Challenges" = die freischaltbaren cond-Packs (#303) OHNE Genesis.
const PACKS_TAB = [STD_PACK, ...THEMES.filter((t) => t.kind === "buy").slice().sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0))];
const CHALLENGES_TAB = THEMES.filter((t) => t.kind === "cond" && t.id !== "genesis"); // Genesis raus aus Challenges → Packs-Seite (Default)
// #: Aktives (gerade ausgerüstetes) Pack immer nach vorn — direkt hinter „Standard" (falls in der Liste), sonst ganz
// vorn (Challenges haben kein Standard). Reine Umsortierung; Preise/Reihenfolge der übrigen bleiben.
function orderPacks(list, deckId) {
  const active = list.find((pk) => pk.kind !== "std" && pk.deckId === deckId);
  if (!active) return list;
  const rest = list.filter((pk) => pk !== active);
  const stdFirst = rest[0] && rest[0].kind === "std";
  rest.splice(stdFirst ? 1 : 0, 0, active); // hinter Standard bzw. ganz vorn
  return rest;
}

/* Synthetische „Standard"-Kachel: der GRATIS-Standard-Sieg-Finisher (kein Kauf, Default-Auswahl). Schlicht — die
   Verliererkarte fliegt nach dem Stich einfach zur Seite weg (wie die eigene Karte bei einer Niederlage), der Flip-
   Sound wird beim Sieg dezent angehoben. Wird der Sieg-Finisher-Gruppe vorangestellt (analog „Gottgleich · Standard"). */
const FIN_STANDARD = { key: "standard", name: "Standard", group: "finisher", preview: "standard", alwaysOwned: true,
  desc: "Der schlichte Grund-Finisher (immer verfügbar, Standard-Auswahl): Die geschlagene Gegnerkarte fliegt nach dem Stich einfach zur Seite weg — genau wie deine eigene Karte bei einer Niederlage. Beim Sieg wird der Aufdeck-Sound leicht höher gestimmt. Kein Schnitt, kein Prunk." };

/* Synthetische „Klinge"-Kachel: ein KAUFBARER Sieg-Finisher (10 DP, grüne Rarity) mit eigenem Besitz-Schlüssel
   fx:klinge — vorschaubar wie die anderen Finisher. Wird in der Sieg-Finisher-Gruppe hinter „Standard" (Gratis) geführt. */
const KLINGE = { key: "klinge", name: "Klinge", group: "finisher", preview: "klinge", ownKey: "fx:klinge", price: 10,
  desc: "Eine choreografierte Klinge zerteilt die Gegnerkarte. Grundzug ist ein Schnitt von links; je höher dein Siegesserie-Multiplikator, desto mehr Richtungen fahren nacheinander ein (ab ×1,25 links/rechts im Wechsel, ab ×1,5 zusätzlich von oben, ab ×2,0 alle vier inkl. Z-Schnitt) — und die Klinge schneidet härter. Eine Niederlage setzt die Serie zurück. In kühlem Stahlweiß oder in der Deckfarbe." };

/* #319 Synthetische „Scorch"-Kachel: kaufbarer Sieg-Finisher (20 DP, blaue Rarity, ownKey fx:scorch). Ein Laser
   schießt einmalig aus zufälliger Richtung, danach verglüht die Gegnerkarte organisch (Rausch-Burn) mit Glut/Asche/Funken. */
const SCORCH = { key: "scorch", name: "Laser", group: "finisher", preview: "scorch", ownKey: "fx:scorch", price: 20,
  desc: "Ein Laser schießt einmalig aus zufälliger Richtung in die Gegnerkarte — dann verglüht sie organisch: eine zerklüftete Brennkante frisst sich mit glühendem Rand über die Karte, während weiche Glut aufsteigt, Asche fällt und Funken sprühen. In Standard-Feuer oder in der Deckfarbe." };

/* #321 Synthetische „Hologrid-Slice"-Kachel: kaufbarer Sieg-Finisher (#353: 30 DP, lila/Rar, ownKey fx:hologridSlice). Eine Laserlinie
   fährt achsen-parallel über die Gegnerkarte und deckt ein Nahtraster auf; danach zerfällt die Karte in ein Kachelgitter,
   dessen Stücke wegfliegen & vom Boden abprallen, während die Füllung früh zu einem reinen Hologrid-Rahmen verblasst. */
const HOLOGRID_SLICE = { key: "hologridSlice", name: "Hologrid-Laser", group: "finisher", preview: "hologrid", ownKey: "fx:hologridSlice", price: 30,
  desc: "Eine Laserlinie fährt achsen-parallel über die geschlagene Gegnerkarte und deckt dabei ein Nahtraster auf. Danach zerfällt die Karte in ein Kachelgitter: die Stücke fliegen mit Rotation weg und prallen vom Boden ab, während das Kartenbild früh verblasst, sodass nur noch der leuchtende Hologrid-Rahmen bleibt. In Standard-Cyan/Magenta oder in der Deckfarbe." };

/* #320 Synthetische „Schwarzes Loch"-Kachel: kaufbarer Sieg-Finisher (#353: 40 DP, gold/Legendär, ownKey fx:blackhole). Ein
   PERSISTENTES Serien-Loch — jeder Sieg füttert es (es wächst + saugt die Gegnerkarte ein), eine Niederlage lässt es
   schrumpfen; kollabiert es bei genug Masse, folgt eine Supernova. Standard blau/pink oder in der Deckfarbe. */
const BLACKHOLE = { key: "blackhole", name: "Schwarzes Loch", group: "finisher", preview: "blackhole", ownKey: "fx:blackhole", price: 40,
  desc: "Ein persistentes Schwarzes Loch mitten im Feld, das über deine Siegesserie wächst: Jeder Sieg zieht die geschlagene Gegnerkarte spiralförmig in den Ereignishorizont und speist die rotierende Akkretionsscheibe, eine Niederlage lässt das Loch schrumpfen. Ist es groß genug gewachsen und kollabiert, zerreißt eine Supernova das Feld. In Standard blau/pink oder in der Deckfarbe." };

// Alle KAUFBAREN Sieg-Finisher (ownKey-tragend). Quelle für die Voll-Freischaltung: der Drift-Guard-Test hält diese
// Liste mit themes.BUYABLE_FINISHER_FX synchron, damit „unlock" nie einen neuen Finisher übersieht.
export const BUYABLE_FINISHER_OWNKEYS = [KLINGE, SCORCH, HOLOGRID_SLICE, BLACKHOLE].map((f) => f.ownKey);

/* Synthetische „Gottgleich · Standard"-Kachel (kein Kauf, immer aktiv) — nur zum Vergleichen des Gottgleich-
   Siegs OHNE Prunk. Wird in der Gottgleich-Gruppe als reine Vorschau-Zeile geführt. */
const GOTT_STANDARD = { key: "gottStandard", name: "Standard", group: "gott", alwaysOwned: true, preview: "gottStandard",
  desc: "Gottgleicher Sieg OHNE Prunk-Effekt — die Basis zum Vergleichen (Standard-Auswahl, kein Kauf)." };

/* #spezial/#328 Skill-Effekt (Archetyp-Effekte Feuer/Blitz/Eis/Pflanze): IMMER aktiv, kein Kauf, kein An/Aus — es gibt
   nur die Farbwahl Standard ↔ Deckfarbe (options.archColor). EINE synthetische Kachel; der Standard/Deckfarbe-Umschalter
   sitzt als Segmented-Control unter dem Showcase (gleiche UI wie die anderen Effekte, schreibt weiter archColor). */
const SPEZIAL = { key: "spezial", name: "Skill-Effekt", group: "spezial", alwaysOwned: true, preview: "spezial",
  desc: "Die vier Archetyp-Effekte (Feuer · Blitz · Eis · Pflanze) — immer aktiv. Wähle die Farbe: feste Neon-Standardfarbe oder die Farbe deines aktiven Decks." };

// #331 Effekt-Reiter des „Effekte"-Tabs — auf 4 Reiter reduziert (Reihenfolge = Anzeige links→rechts):
//   Karten · Stich · Hintergrund · Score. Ein Effekt pro Kategorie aktiv (Einfachauswahl); Ausnahmen:
//   • Leuchten (deckglow) — frei kombinierbar (freier Toggle, unabhängig vom Hintergrund-Set).
//   • Skill-Effekt (Archetyp, group "spezial") — immer aktiv, nur Farbwahl (zählt nicht in die Einfachauswahl).
// mode: "cardanim" (Karten-Animationen einfach-exklusiv) | "finisher" (Stich) | "bg" (Hintergrund-Set einfach-exklusiv,
//   Leuchten separat frei) | "gott" (Score). Die alten Gruppen (anim/bgfx/bgglow/bgfin/finisher/gott) bleiben als
//   DATEN-Gruppe (GLOBAL_FX.group) erhalten — nur die UI-Reiter werden hier zusammengefasst (fxGroupItems ordnet zu).
const FX_GROUPS = [
  { key: "karten",      title: "Karten",      hint: "Skill immer an · eine Animation", mode: "cardanim" },
  { key: "stich",       title: "Stich",       hint: "nur einer aktiv",                 mode: "finisher" },
  { key: "hintergrund", title: "Hintergrund", hint: "einer aktiv · Leuchten frei",     mode: "bg" },
  { key: "score",       title: "Score",       hint: "nur einer aktiv",                 mode: "gott" },
];
/* #306 Synthetische „Kein Feld-Effekt"-Kachel (immer verfügbar, kein Kauf): der Aus-Zustand der einfach-exklusiven
   Battlefield-Ambiente-Gruppe — wählbar wie „Klinge" beim Finisher. */
const FIELD_NONE = { key: "none", name: "Kein Effekt", group: "field", preview: "none", alwaysOwned: true,
  desc: "Kein Hintergrund-Effekt — nur das Battlefield-Bild (immer verfügbar). Leuchten kann zusätzlich aktiv bleiben." };
/* #318 Synthetische „Keine Animation"-Kachel (grau, immer verfügbar, kein Kauf): der Aus-Zustand der frei
   kombinierbaren Karten-Animationen. Anwählen schaltet ALLE Karten-Animationen ab (wie „Kein Feld-Effekt" beim
   Ambiente, nur dass die anim-Gruppe eine Mehrfachauswahl ist). preview „none" → schlichte Karte ohne Overlay. */
const ANIM_NONE = { key: "none", name: "Keine Animation", group: "anim", preview: "none", alwaysOwned: true,
  desc: "Keine Karten-Animation — die Karten bleiben schlicht. Anwählen schaltet alle Karten-Animationen ab (immer verfügbar)." };
// Items einer Gruppe (in Detail-Reihenfolge): GLOBAL_FX der Gruppe nach DP-Preis aufsteigend (billig oben, teuer unten);
// der synthetische „Standard"/„Kein …"/„Klinge"-Default wird vorangestellt (Gratis-Aus-Zustand).
const fxByGroup = (g) => GLOBAL_FX.filter((f) => f.group === g && !f.hidden).slice().sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0)); // #: `hidden` blendet Effekte im Shop aus (bleiben funktional)
const fxKey = (k) => GLOBAL_FX_BY_KEY[k]; // Kurzzugriff für die feste Reihenfolge im Hintergrund-Reiter
const byFxPrice = (a, b) => globalFxPrice(a) - globalFxPrice(b); // #353 Seltenheit = Preis (aufsteigend)
// #353 Basis-Reihenfolge je Reiter: die festen Führungs-Kacheln (Standard/„Kein …"/Leuchten/Skill) voran, der REST nach
// Seltenheit (= Preis) sortiert. (Vorher stand der Hintergrund-Vierer in fixer Reihenfolge — jetzt ebenfalls nach Preis.)
const fxGroupBase = (group) => {
  if (group === "karten") return [SPEZIAL, ANIM_NONE, ...fxByGroup("anim")]; // #328 Skill-Effekt · Keine · (Neonrahmen/Holo/Glitch nach Preis)
  if (group === "stich")  return [FIN_STANDARD, ...[KLINGE, SCORCH, HOLOGRID_SLICE, BLACKHOLE].sort(byFxPrice)]; // Standard · Rest nach Preis
  if (group === "hintergrund") return [fxKey("deckglow"), FIELD_NONE, ...[fxKey("aurora"), fxKey("neonsurf"), fxKey("cubematrix"), fxKey("starfield")].filter(Boolean).sort(byFxPrice)]; // Leuchten · Kein · Rest nach Preis
  if (group === "score")  return [GOTT_STANDARD, ...fxByGroup("gott")]; // „Standard" (kein Prunk) voran, dann nach Preis
  return [];
};
// #353 Führungs-Kacheln, die IMMER oben bleiben (Standard/„Kein …"/Leuchten/Skill) — NICHT der aktive Effekt. sonnenPuls
// ist zwar alwaysOwned, aber ein echter (Preis-0-)Effekt → gehört in den nach Seltenheit sortierten Rest, nicht hierher.
const LEADING_FX_KEYS = new Set(["standard", "gottStandard", "none", "spezial", "deckglow"]);
const isLeadingFx = (fx) => LEADING_FX_KEYS.has(fx.key);
const activeFxKeyOf = (mode, options, p) =>
    mode === "finisher" ? finisherSelOf(options, p)
  : mode === "bg"       ? bgSelOf(options, p)
  : mode === "gott"     ? gottSelOf(options)
  : mode === "cardanim" ? cardAnimSelOf(options, p)
  : null;
// #353 Reihenfolge je Reiter: Führungs-Kacheln oben → der aktuell aktive Effekt direkt darunter → Rest nach Seltenheit.
// Ohne Options-Kontext (z. B. useState-Init) nur die Basis-Reihenfolge. Wird auf Liste UND Bühnen-Navigation angewandt.
const fxGroupItems = (group, options = null, p = null) => {
  const base = fxGroupBase(group);
  if (!options) return base;
  const mode = (FX_GROUPS.find((g) => g.key === group) || {}).mode;
  const activeKey = activeFxKeyOf(mode, options, p);
  const idx = activeKey ? base.findIndex((f) => f.key === activeKey && !isLeadingFx(f)) : -1;
  if (idx < 0) return base;                                  // aktiv ist Führungs-Kachel oder nicht in der Liste → Basis
  const active = base[idx];
  const rest = base.filter((f) => f !== active);
  const lead = rest.filter(isLeadingFx).length;             // Anzahl Führungs-Kacheln → aktiven direkt dahinter einfügen
  rest.splice(lead, 0, active);
  return rest;
};

// #373 Default-AUSWAHL je Reiter (statt blind [0]). Karten: „Keine Animation" (key "none") → der Showcase zeigt beim
// Öffnen/Tab-Wechsel die schlichte Karte, die Skill-Effekt-Szene (SpezialScene) läuft NICHT automatisch an. Reihenfolge/
// Namen der Kacheln bleiben unverändert; nur was initial angewählt ist, ändert sich. Fallback = erstes Item.
const DEFAULT_FX_KEY = { karten: "none" };
const defaultSelFor = (gKey) => {
  const its = fxGroupItems(gKey);
  const want = DEFAULT_FX_KEY[gKey];
  return { group: gKey, key: (want && its.some((f) => f.key === want)) ? want : its[0].key };
};

/* Sieg-Finisher einfach-exklusiv (genau EINER aktiv): die Auswahl steckt als einzelner String in options.finisher.
   „standard" (Gratis-Default, Wegflug) und „klinge" (kaufbar, 10 DP) sind wählbar. finisherFlags schreibt die Auswahl;
   „none" (Abwählen des aktiven) fällt auf den Gratis-Standard zurück (es gibt keinen „gar kein Finisher"-Zustand).
   #farbsystem/#klinge-kaufbar: „klinge" gilt nur, wenn Klinge auch im Besitz ist — sonst zurück auf „standard" (die
   Klinge-Auswahl ohne Kauf würde sonst im Spiel trotzdem rendern). Ohne Profil (reine Options-Sicht) ungegated. */
const finisherFlags = (key) => ({ finisher: key === "none" ? "standard" : key });
// #spezial: Farbwahl der Archetyp-Effekte — einfach-exklusiv über options.archColor ("standard" | "deck").
const spezialFlags = (key) => ({ archColor: key === "deck" ? "deck" : "standard" });
const finisherSelOf = (options, profile) => {
  const sel = options?.finisher || "standard";
  if (sel === "klinge" && profile && !globalFxOwned(profile, KLINGE)) return "standard";
  if (sel === "scorch" && profile && !globalFxOwned(profile, SCORCH)) return "standard";
  if (sel === "hologridSlice" && profile && !globalFxOwned(profile, HOLOGRID_SLICE)) return "standard";
  if (sel === "blackhole" && profile && !globalFxOwned(profile, BLACKHOLE)) return "standard";
  return sel;
};
/* #331 Hintergrund einfach-exklusiv (genau EINER aktiv, oder „none"): der frühere bgfx- (Aurora/Würfel-Matrix) UND
   bgfin-Slot (Glutfunken/Komet) sind zu EINEM exklusiven Set verschmolzen — es kann nur noch EIN Hintergrund-Effekt
   laufen (kein Stapeln Aurora + Glutfunken mehr). bgFlags(key) schreibt alle vier Optionen in einem Rutsch (genau eine
   true, „none" = alle false). „Leuchten" (deckglow) bleibt ein UNABHÄNGIGER freier Toggle (fxDeckGlow) außerhalb dieses
   Sets. bgSelOf gated auf Besitz (ungekaufte Auswahl zählt nicht — parallel zu finisherSelOf/in-game globalFxActive). */
const BG_EXCL_KEYS = ["aurora", "cubematrix", "neonsurf", "starfield"]; // feste Priorität (Aurora zuerst) — #glutfunken-raus: embers entfernt · #345 neonsurf
const BG_EXCL_FX = BG_EXCL_KEYS.map((k) => GLOBAL_FX_BY_KEY[k]).filter(Boolean);
const bgFlags = (key) => Object.fromEntries(BG_EXCL_FX.map((f) => [f.option, f.key === key]));
const bgSelOf = (options, profile) => {
  for (const f of BG_EXCL_FX) if (options?.[f.option]) { if (profile && !globalFxOwned(profile, f)) continue; return f.key; }
  return "none";
};
/* Gottgleich-Prunk einfach-exklusiv (genau EINER aktiv, oder „gottStandard" = kein Prunk). Datengetrieben aus der
   „gott"-Gruppe: gottFlags(key) schreibt alle Prunk-Optionen in einem Rutsch (genau eine true, „gottStandard" = alle false). */
const GOTT_FX = GLOBAL_FX.filter((f) => f.group === "gott");
const gottFlags = (key) => Object.fromEntries(GOTT_FX.map((f) => [f.option, f.key === key]));
const gottSelOf = (options) => { for (const f of GOTT_FX) if (options?.[f.option]) return f.key; return "gottStandard"; };
/* #331 Karten-Animationen (mode "cardanim") sind jetzt EINFACH-EXKLUSIV (früher frei kombinierbar): genau EINE
   Animation aktiv, oder keine (= „Keine Animation"). cardAnimFlags(key) schreibt {fxEdgeGlow,fxHolo,fxGlitch} in einem
   Rutsch (genau eine true, „none" = alle false); animNoneFlags = alle aus (für die „Keine"-Kachel). cardAnimSelOf
   gated auf Besitz (ungekaufte Auswahl zählt nicht). Der Skill-Effekt (Archetyp) läuft getrennt (immer aktiv). */
const ANIM_FX = GLOBAL_FX.filter((f) => f.group === "anim");
const cardAnimFlags = (key) => Object.fromEntries(ANIM_FX.map((f) => [f.option, f.key === key]));
const animNoneFlags = () => Object.fromEntries(ANIM_FX.map((f) => [f.option, false]));
const cardAnimSelOf = (options, profile) => {
  for (const f of ANIM_FX) if (options?.[f.option]) { if (profile && !globalFxOwned(profile, f)) continue; return f.key; }
  return "none";
};

// Gleiche Schwelle wie das In-Run-Battlefield (<picture media="(max-width: 640px)">): so zeigt die
// Vorschau exakt die Version (mobile/desktop), mit der gerade auch gespielt wird.
function useIsMobile() {
  const [m, setM] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const on = () => setM(mq.matches);
    mq.addEventListener ? mq.addEventListener("change", on) : mq.addListener(on);
    return () => (mq.removeEventListener ? mq.removeEventListener("change", on) : mq.removeListener(on));
  }, []);
  return m;
}

// Einmalig injizierte Keyframes für die Gottgleich-Standard-Vorschau (Event-Loop).
const FX_CSS = `
/* #gott Showcase: die geteilte Chrome-„GOTTGLEICH"-Ansage poppt SYNCHRON zum Effekt-Loop rein (Pop → Halten → Fade),
   zentriert — wie in-game (großer Stich → Ansage + Prunk gemeinsam). Kein eigener Karten-Pop/Aura mehr, nur der Schriftzug. */
@keyframes ws-gott-word{0%{opacity:0;transform:translate(-50%,-50%) scale(.55)}10%{opacity:1;transform:translate(-50%,-50%) scale(1.1)}20%{transform:translate(-50%,-50%) scale(1)}72%{opacity:1}100%{opacity:0;transform:translate(-50%,-50%) scale(1.04)}}
/* #fx-floater: horizontal wischbare Kategorie-Reihen ohne sichtbaren Scrollbalken. */
.ws-hscroll::-webkit-scrollbar{display:none}
`;

/* Karten-Finisher-Vorschau: die ECHTEN In-Game-Komponenten (SliceFx/ExplosionFx) an einer Demo-Karte
   im Loop — Vorschau = In-Game (keine separate Engine, kein Drift). */
const DEMO_SUIT = "B"; // blau — Effektfarbe = suitColor (wie in-game die Gegner-Suit-Farbe)
// #312: Vorschau spielt die Klinge 3× schneller ab — Animation UND Sound teilen dieselbe (durch 3 geteilte) Zeitbasis,
// laufen also garantiert nicht auseinander. Basiswerte wie in-game, hier nur für die Vorschau beschleunigt.
const FIN_SPEED = 3;
const FIN_DELAY = Math.round(460 / FIN_SPEED), FIN_HALVES = Math.round(950 / FIN_SPEED), FIN_CUT = Math.round(130 / FIN_SPEED), FIN_SPARK = Math.round(950 / FIN_SPEED);
const FIN_TICK_MS = Math.round(2400 / FIN_SPEED); // Loop-Takt ebenfalls 3× schneller
// Showcase-Sound der Klinge (einziger verbliebener Sieg-Finisher).
const FIN_SFX = { klinge: "fx_blade" };
// #klinge-showcase: fester Choreo-Fahrplan der Klinge-Vorschau — je Serienschwelle der VOLLE Richtungs-Zyklus
// (links zuerst) am Stück, danach die nächste Stufe. m = Siegesserie-Multiplikator (bestimmt Wucht/Funken), d = Schnittrichtung.
const KLINGE_SCHEDULE = [
  { m: 1.0,  d: "left" },                                              // ×1,0  → nur LINKS (Grundzug)
  { m: 1.25, d: "left" }, { m: 1.25, d: "right" },                    // ×1,25 → LINKS · RECHTS
  { m: 1.5,  d: "left" }, { m: 1.5,  d: "right" }, { m: 1.5, d: "top" }, // ×1,5  → LINKS · RECHTS · OBEN
  { m: 2.0,  d: "left" }, { m: 2.0,  d: "right" }, { m: 2.0, d: "top" }, { m: 2.0, d: "z" }, // ×2,0 → alle vier inkl. Z-Schnitt
];
// #330: KLINGE_DIR_LABEL/kMultLabel entfernt — die Klinge-Vorschau zeigt kein eigenes Stufen-Label mehr (Chrome zentral).

/* #330 Einheitlicher Panel-Chip für das verbindliche 4-Ecken-Showcase-Template — EIN Stil für ALLE Ecken. Die Bühne
   (FxStage) setzt die vier Ecken zentral (TL Effekt-Name · TR AKTIV/Preis · BR Standard/Deckfarbe wo Farbmodus · BL
   frei = reservierter Ausnahme-Slot, aktuell nur Deck-Glow „mit/ohne"). Die Scene-Komponenten zeichnen KEIN eigenes
   Chrome mehr, nur noch die Visuals. `style` überschreibt Farbe/Rahmen (TR: AKTIV grün bzw. Preis in Rarity-Farbe). */
const PANEL_CHIP_POS = { tl: "left-2 top-2", tr: "right-2 top-2", bl: "left-2 bottom-2", br: "right-2 bottom-2" };
function PanelChip({ corner = "tl", children, style }) {
  return (
    <span className={`absolute ${PANEL_CHIP_POS[corner]} text-[9px] font-extrabold px-2 py-0.5 rounded-md`}
      style={{ background: "#0b0a16cc", border: "1px solid #ffffff1f", color: "#cbd3ff", ...style }}>{children}</span>
  );
}

function FinisherScene({ variant, deckTint = false, look = null }) {
  const [tick, setTick] = useState(0);
  // #klinge-deck: Standard = kühles Stahlweiß (bladeTint, wie in-game bladeColor=null); Deckfarbe = Deck-Beispielfarbe
  //   auf passendem Backdrop (nur im Deckfarbe-Modus), Standard bleibt auf dem neutralen SHOWCASE_BF.
  const bf = battlefieldAssets(deckTint && look?.bf ? look.bf : SHOWCASE_BF);
  const bladeCol = deckTint ? (look?.a1 || "#35e0ff") : "#bcd6ff";
  const kstep = KLINGE_SCHEDULE[tick % KLINGE_SCHEDULE.length];
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), FIN_TICK_MS); // Loop: Karte erscheint → wird zerteilt → Pause
    return () => clearInterval(id);
  }, []);
  // #312: Sound synchron zum sichtbaren Schnitt (bei FIN_DELAY). Der Z-Schnitt sind ZWEI Slashes → zwei schnelle Hits,
  // exakt auf die beiden Slash-Zeitpunkte (0 und zSlashStep × cutDur). Alle Zeiten sind bereits 3×-skaliert → Sound
  // zieht mit der Animation mit. Andere Richtungen: EIN Hit. Respektiert Mute/Volume über das audio-System.
  useEffect(() => {
    const sfx = FIN_SFX[variant];
    if (!sfx) return undefined;
    const timers = [setTimeout(() => audio.play(sfx, { gain: 1.0 }), FIN_DELAY)];
    if (kstep.d === "z") timers.push(setTimeout(() => audio.play(sfx, { gain: 1.0 }), FIN_DELAY + Math.round(KLINGE_TUNE.zSlashStep * FIN_CUT)));
    return () => timers.forEach(clearTimeout);
  }, [tick, variant, kstep.d]);
  const suitCol = suitColor(DEMO_SUIT);
  const cardEl = <Card suit={DEMO_SUIT} value={8} baseRank={8} ionStacks={2} />;
  const seed = tick * 3 + 1;
  // klinge (einziger Finisher): die Vorschau fährt den Siegesserie-MULTIPLIKATOR stufenweise hoch (×1,0 → ×1,25 →
  // ×1,5 → ×2,0) und zeigt, wie der Richtungs-Zyklus wächst — jede Serienschwelle ihren VOLLEN Zyklus von vorne
  // (links zuerst). Spiegelt exakt die In-Game-Logik (sliceMove).
  const kstreak = Math.round((kstep.m - 1) / 0.02);                       // passende Serie zur Multiplikator-Stufe (Wucht/Funken)
  const fx = <SliceFx cardEl={cardEl} color={suitCol} bladeColor={bladeCol} halvesDur={FIN_HALVES} cutDur={FIN_CUT} sparkDur={FIN_SPARK} seed={seed} delay={FIN_DELAY} intensity={0.5} scale={1} dir={kstep.d} streak={kstreak} /> /* #klinge-deck: Standard = Stahlweiß · Deckfarbe = Deck-Beispielfarbe (in-game = aktive Deckfarbe) */;
  return (
    <div className="relative w-full h-full overflow-hidden rounded-lg" style={{ background: "#0b0a16" }}>
      {bf && <img src={bf.desktop} alt="" className="absolute inset-0 w-full h-full object-cover" />}
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,#0c0c10aa,#0c0c1055 45%,#0c0c10cc)" }} />
      {/* Demo-Karte im echten 104×144-Slot, zentriert; die Finisher-Komponente rendert die Karte + Effekt darin. */}
      <div className="absolute left-1/2 top-1/2" style={{ width: 104, height: 144, transform: "translate(-50%,-50%)" }}>
        <div key={tick} className="absolute inset-0">{fx}</div>
      </div>
      {/* #330 Kein Scene-Chrome mehr — Name/Status/Farbmodus zeichnet zentral die Bühne (FxStage). */}
    </div>
  );
}

/* #319 Scorch-Vorschau: ein unsichtbarer 104×144-Karten-Slot (Positionsanker) im Zentrum; ScorchFx zeichnet die
   verglühende Karte darüber und feuert im Loop (loop=true → eigenes Re-Fire). deckTint schaltet Standard-Feuer ↔ Deckfarbe. */
function ScorchScene({ deckTint = false, look = null }) {
  const panelRef = useRef(null);
  const cardRef = useRef(null);
  // #scorch-deck: Standard = warmes Feuer (ScorchFx-intern, deckTint=false); Deckfarbe = Deck-Beispielfarbe auf
  //   passendem Backdrop (nur im Deckfarbe-Modus), Standard bleibt auf dem neutralen SHOWCASE_BF.
  const bf = battlefieldAssets(deckTint && look?.bf ? look.bf : SHOWCASE_BF);
  return (
    <div ref={panelRef} className="relative w-full h-full overflow-hidden rounded-lg" style={{ background: "#0b0a16" }}>
      {bf && <img src={bf.desktop} alt="" className="absolute inset-0 w-full h-full object-cover" />}
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,#0c0c10aa,#0c0c1055 45%,#0c0c10cc)" }} />
      <div ref={cardRef} className="absolute left-1/2 top-1/2" style={{ width: 104, height: 144, transform: "translate(-50%,-50%)" }} />
      <ScorchFx panelRef={panelRef} cardRef={cardRef} trigger={1} loop deckTint={deckTint}
        value={8} suit={suitColor(DEMO_SUIT)} deckColor={look?.a1 || "#35e0ff"} speed={1.15}
        onFire={() => audio.play("fx_scorch", { rate: 1.15, gain: 1.0 })} /* #319 Sound auch im Shop, getimt (rate = Showcase-Speed), Klinge-Pegel */ />
      {/* #330 Kein Scene-Chrome mehr — die Bühne (FxStage) zeichnet Name/Status/Farbmodus zentral. */}
    </div>
  );
}

/* #321 Hologrid-Slice-Vorschau (PIXI): board-weite Bühne (panelRef) mit Karten-Anker (cardRef) im Zentrum; der Finisher
   backt darüber die Karte (Wert 8, Deck-Skin/Suit) und feuert im Loop (loop=true → eigenes Re-Fire). Farbe = Deckfarbe
   (Verlauf A→B). Lazy (Suspense) → Pixi lädt erst, wenn die Vorschau gerendert wird. Vorschau = In-Game. */
function HologridScene({ deckTint = false, look = null }) {
  const panelRef = useRef(null);
  const cardRef = useRef(null);
  // #hologrid-deck: Standard = Cyan/Magenta (STD_A/STD_B); Deckfarbe = Deck-Beispielfarbe (Verlauf) auf passendem
  //   Backdrop (nur im Deckfarbe-Modus), Standard bleibt auf dem neutralen SHOWCASE_BF.
  const bf = battlefieldAssets(deckTint && look?.bf ? look.bf : SHOWCASE_BF);
  const dc1 = deckTint ? (look?.a1 || "#2ff0ff") : "#2ff0ff";
  const dc2 = deckTint ? (look?.a2 || look?.a1 || "#ff2d9b") : "#ff2d9b";
  const isMobile = useIsMobile();
  return (
    <div ref={panelRef} className="relative w-full h-full overflow-hidden rounded-lg" style={{ background: "#0b0a16" }}>
      {bf && <img src={bf.desktop} alt="" className="absolute inset-0 w-full h-full object-cover" />}
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,#0c0c10aa,#0c0c1055 45%,#0c0c10cc)" }} />
      <div ref={cardRef} className="absolute left-1/2 top-1/2" style={{ width: 104, height: 144, transform: "translate(-50%,-50%)" }} />
      <Suspense fallback={null}>
        <HologridSlicePixi panelRef={panelRef} cardRef={cardRef} trigger={1} loop deckTint={deckTint}
          value={8} suit={suitColor(DEMO_SUIT)} deckColor={dc1} deckColor2={dc2} lite={isMobile} speed={1.1} />
      </Suspense>
      {/* #330 Kein Scene-Chrome mehr — die Bühne (FxStage) zeichnet Name/Status/Farbmodus zentral. */}
    </div>
  );
}

/* #320 Schwarzes-Loch-Vorschau: persistentes Panel-Loch (BlackholeFx) mit unsichtbarem Karten-Anker rechts (oppRef →
   Flug-Startpunkt). Ein Timer feuert im Loop Sieg-Pulse (Loch wächst + Karte einsaugen), dann eine Niederlage-Sequenz
   bis zum Kollaps → Supernova, danach von vorn. deckTint schaltet Standard blau/pink ↔ Deckfarbe (deckA1/deckA2). */
function BlackholeScene({ deckTint = false }) {
  const panelRef = useRef(null);
  const oppRef = useRef(null);
  // #blackhole-deck: Standard = neutrales Dunkelfeld; Deckfarbe = passender (dunkel gehaltener) Kosmos-Backdrop, damit
  //   der Toggle auch am Hintergrund sichtbar ist. Der Backdrop bleibt bewusst schwach (opacity 0.35) → Weltraum-Look.
  const bf = battlefieldAssets(deckTint ? (PREVIEW_LOOK.blackhole.bf || SHOWCASE_BF) : SHOWCASE_BF);
  const [pulse, setPulse] = useState(null);
  useEffect(() => {
    // Loop-Choreografie: genug Siege, um bis zum (verdoppelten) MAXIMUM aufzubauen (im Showcase sichtbar), dann
    //   Niederlagen bis zum Kollaps → Supernova → kurze Pause → wieder von vorn. ~22 Siege ≈ voller Deckel; die
    //   Sieg-Kadenz ist bewusst geruhsam (640 ms), damit die eingesogenen Karten NICHT als Pulk übereinander liegen.
    // #338-1: Choreo demonstriert BEIDES — Aufbau, Niederlagen-Shrink, Wiederaufbau bis Max, dann die Implosionsbombe
    //   (gescripteter „collapse"-Puls, da der 2-Min-am-Max-Timer im Showcase nicht greift). Danach dormant → Loop baut neu auf.
    const seq = [
      ...Array.from({ length: 14 }, () => ({ kind: "win" })),
      ...Array.from({ length: 5 }, () => ({ kind: "loss" })),
      ...Array.from({ length: 16 }, () => ({ kind: "win" })),
      { kind: "collapse" },
    ];
    let id = 0, i = 0, alive = true; const timers = [];
    // #320: eingesogene Karten = wechselnde „verlorene" Karten → echte Werte (1..10) UND wechselnde Suit-Farben, damit die
    //   Vorschau die neue In-Game-Vielfalt zeigt (nicht mehr alle in einer Farbe). SUIT_ORDER-Reihenfolge R/B/G/Y.
    const nums = [10, 7, 4, 9, 2, 8, 5, 6];
    const cols = SUIT_ORDER.map((s) => suitColor(s));
    const tick = () => {
      if (!alive) return;
      const step = seq[i % seq.length]; i++; id++;
      setPulse(step.kind === "win" ? { id, kind: "win", num: nums[id % nums.length], col: cols[id % cols.length] } : { id, kind: step.kind });
      // Nach dem Kollaps eine längere Pause: Vorbeben-Zucken (~1,5 s) + schnelles Zusammenziehen + Nova ausklingen,
      //   bevor der Loop wieder aufbaut. Sonst Sieg 640 ms / Niederlage 340 ms.
      timers.push(setTimeout(tick, step.kind === "collapse" ? 3400 : step.kind === "win" ? 640 : 340));
    };
    timers.push(setTimeout(tick, 400));
    return () => { alive = false; timers.forEach(clearTimeout); };
  }, []);
  const look = PREVIEW_LOOK.blackhole;
  const c1 = deckTint ? look.a1 : "#4aa0ff";
  const c2 = deckTint ? (look.a2 || look.a1) : "#ff3ea8";
  return (
    <div ref={panelRef} className="relative w-full h-full overflow-hidden rounded-lg" style={{ background: "#05060d" }}>
      {bf && <img src={bf.desktop} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ opacity: 0.35 }} />}
      <div className="absolute inset-0" style={{ background: "radial-gradient(60% 60% at 72% 50%,#0b0c1866,#05060d)" }} />
      <div ref={oppRef} className="absolute" style={{ left: "72%", top: "50%", width: 104, height: 144, transform: "translate(-50%,-50%)" }} />
      <BlackholeFx active pulse={pulse} color={c1} color2={c2} scale={1} panelRef={panelRef} oppRef={oppRef} backSrc={deckAssets("default").back} /> {/* #338-4: Vorschau zeigt die Deck-Rückseite der eingesogenen Karten */}
      {/* #330 Kein Scene-Chrome mehr — die Bühne (FxStage) zeichnet Name/Status/Farbmodus zentral. */}
    </div>
  );
}

/* #322–#326 Gottgleich-Prunk-Vorschau (PIXI): board-weite Bühne (panelRef) mit unsichtbarem Karten-Anker (cardRef) im
   Zentrum; die übergebene Pixi-Komponente zeichnet den Prunk darüber und feuert im Loop (loop=true → eigenes Re-Fire).
   deckTint schaltet Standard-Palette ↔ Deckfarbe. Lazy (Suspense) → Pixi lädt erst, wenn ein gott-Preview gerendert wird.
   Die geteilte Chrome-„GOTTGLEICH"-Ansage poppt SYNCHRON zum Effekt-Loop (onFire des Prunks → key-Wechsel → Pop neu),
   zentriert, wie in-game (großer Stich → Ansage + Prunk gemeinsam). Fx=null („Gottgleich · Standard") → NUR die Ansage
   (kein Prunk), per Timer geloopt — mehr Animation hat der Standard bewusst nicht. */
function GottScene({ Fx = null, deckTint = false, cycleMs = 2200, look = null, sfx = null }) { // #330 label/tint entfallen (Chrome zentral in FxStage)
  const panelRef = useRef(null);
  const cardRef = useRef(null);
  // #377: optionaler Prunk-Sound im Showcase (aktuell nur Supernova-Swell). Der Swell ist 11 s lang, der visuelle
  // Loop aber viel kürzer → eigene ~10-s-Drossel, damit er ausklingen kann statt bei jedem Loop neu zu überlappen.
  const lastSfxRef = useRef(0);
  // #327: Standard-Modus = einheitlich Genesis (SHOWCASE_BF); nur der Deckfarbe-Modus zeigt den Pack-Backdrop (look.bf)
  //   + die Pack-Deckfarbe (look.a1/a2). Vorher zeigte der Prunk-Showcase den Pack-BG auch im Standard (Inkonsistenz).
  const bf = battlefieldAssets(deckTint ? (look?.bf || SHOWCASE_BF) : SHOWCASE_BF);
  const deckColor = look?.a1 || "#35e0ff";
  const deckColor2 = look?.a2 || "#ff5db1";
  // #perf: Auf Mobile die Vorschau im lite-Pfad laufen lassen (weniger DPR/FPS/Partikel) — dieselbe Stufe wie in-game
  // auf pointer:coarse. Ohne das lief der Loop-Showcase auf dem Handy in voller Auflösung → Jank.
  const isMobile = useIsMobile();
  const [annKey, setAnnKey] = useState(0);
  const pop = () => setAnnKey((k) => k + 1);
  // Jeder Prunk-„Fire": Ansage poppen + (falls gesetzt) den gedrosselten Prunk-Sound spielen.
  const fire = () => {
    pop();
    // #sound: gemeinsamer Gott-Punch (wie in-game bei jedem epischen Sieg) → spielt bei JEDEM Prunk-Fire, damit ALLE
    // Prunk-Showcases (Sonne/Laserfächer/Prisma/Holo-Würfel/Supernova) hörbar sind, nicht nur die Supernova.
    audio.play("fx_godlike", { gain: 0.55 });
    // Zusätzlicher effekt-spezifischer Swell (aktuell Supernova) — gedrosselt, da ~11 s lang (sonst Überlappung im Loop).
    if (sfx) { const now = Date.now(); if (now - lastSfxRef.current > 10000) { lastSfxRef.current = now; audio.play(sfx, { gain: 0.9 }); } }
  };
  // Ohne Prunk-Effekt (Standard) treibt ein Timer den Ansage-Loop; mit Prunk kommt der Takt aus dessen onFire.
  useEffect(() => {
    if (Fx) return undefined;
    pop();
    const id = setInterval(pop, cycleMs);
    return () => clearInterval(id);
  }, [Fx, cycleMs]);
  return (
    <div ref={panelRef} className="relative w-full h-full overflow-hidden rounded-lg" style={{ background: "#0b0a16" }}>
      {bf && <img src={bf.desktop} alt="" className="absolute inset-0 w-full h-full object-cover" />}
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,#0c0c10aa,#0c0c1055 45%,#0c0c10cc)" }} />
      <div ref={cardRef} className="absolute left-1/2 top-1/2" style={{ width: 104, height: 144, transform: "translate(-50%,-50%)" }} />
      {Fx && (
        <Suspense fallback={null}>
          <Fx panelRef={panelRef} cardRef={cardRef} trigger={1} loop deckTint={deckTint} deckColor={deckColor} deckColor2={deckColor2} lite={isMobile} onFire={fire} />
        </Suspense>
      )}
      {/* #gott: dieselbe Synthwave-Chrome-GOTTGLEICH-Ansage wie In-Game — mittig, etwas kleiner, poppt je Fire synchron
          rein (key={annKey} → Neustart der Pop-Animation). idKey am Key → eindeutige Gradient-/Mask-IDs je Pop. */}
      {/* #335: Wortmarke folgt dem Prunk-Farbmodus — Deckfarbe-Modus → Deck-Zweiton (deckColor→deckColor2), sonst
          Chrome-Zweiton. Vorschau = In-Game (Battlefield tönt „Gottgleich" analog über gottDeck/deckA1/deckA2). */}
      <GottChromeWord key={annKey} text="Gottgleich" color={deckTint ? deckColor : null} color2={deckTint ? deckColor2 : null}
        gBig={isMobile ? 9 : 11} gMid={6} sheen="once" idKey={`sc${annKey}`}
        style={{ left: "50%", top: "50%", width: "62%", zIndex: 20, animation: "ws-gott-word 1.5s ease-out both" }} />
      {/* #330 Kein Scene-Chrome mehr — die Bühne (FxStage) zeichnet Name/Status/Farbmodus zentral. */}
    </div>
  );
}

/* #finisher-standard: Vorschau des Gratis-Standard-Finishers — die geschlagene Karte fliegt nach kurzem Liegen einfach
   zur Seite weg (dieselbe as-flyaway-Choreografie wie in-game), im Loop; beim „Sieg" wird der Aufdeck-Sound (cardflip)
   dezent höher gestimmt (rate > 1), passend zur In-Game-Vertonung. Vorschau = In-Game (kein Schnitt, kein Prunk). */
const STD_FIN_TICK_MS = Math.round(2400 / FIN_SPEED); // gleicher Loop-Takt wie die Klinge-Vorschau
const STD_FIN_REST = Math.round(220 / FIN_SPEED);     // Karte liegt kurz still, bevor sie wegfliegt
const STD_FIN_FLY  = Math.round(760 / FIN_SPEED);     // Wegflug-Dauer (as-flyaway)
const STD_FIN_PITCH = 1.14;                            // Flip-Sound beim Sieg dezent angehoben (wie in-game)
function StandardFinisherScene() {
  const [tick, setTick] = useState(0);
  const bf = battlefieldAssets(SHOWCASE_BF);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), STD_FIN_TICK_MS);
    return () => clearInterval(id);
  }, []);
  // Angehobener Aufdeck-Sound je Loop-Durchlauf (Sieg-Cue) — synchron zum Erscheinen der Karte.
  useEffect(() => {
    const to = setTimeout(() => audio.play("cardflip", { rate: STD_FIN_PITCH, gain: 0.95 }), 0);
    return () => clearTimeout(to);
  }, [tick]);
  const cardEl = <Card suit={DEMO_SUIT} value={8} baseRank={8} ionStacks={2} />;
  return (
    <div className="relative w-full h-full overflow-hidden rounded-lg" style={{ background: "#0b0a16" }}>
      {bf && <img src={bf.desktop} alt="" className="absolute inset-0 w-full h-full object-cover" />}
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,#0c0c10aa,#0c0c1055 45%,#0c0c10cc)" }} />
      <div className="absolute left-1/2 top-1/2" style={{ width: 104, height: 144, transform: "translate(-50%,-50%)" }}>
        {/* key={tick} startet die Wegflug-Animation je Loop neu; erst REST liegen bleiben, dann as-flyaway-r zur Seite. */}
        <div key={tick} className="absolute inset-0"
          style={{ animation: `as-flyaway-r ${STD_FIN_FLY}ms ease-in ${STD_FIN_REST}ms both` }}>
          {cardEl}
        </div>
      </div>
      {/* #330 Kein Scene-Chrome mehr — die Bühne (FxStage) zeichnet Name/Status zentral. */}
    </div>
  );
}

// #317 Cube-Matrix-Showcase: das ECHTE In-Game-Modul (CubeMatrixField) über dem neutralen BF-Bild. Reagiert live auf
// die laufende (Menü-)Musik. deckTint → Deckfarbe statt Standard-Cyan/Magenta. Nur Preview/Dev (wie die anderen GL-FX).
function CubeMatrixPreview({ deckTint = false, wire = false }) {
  const look = PREVIEW_LOOK.cubematrix;
  // #327: Standard-Modus = Genesis (SHOWCASE_BF); nur Deckfarbe-Modus zeigt den Pack-BG (look.bf = bf_arcade).
  const bf = battlefieldAssets(deckTint ? look.bf : SHOWCASE_BF);
  const isMobile = useIsMobile();
  const src = bf ? (isMobile ? bf.mobile : bf.desktop) : null;
  const on = true; // #346: Würfel-Matrix läuft jetzt auch in Produktion → Showcase muss den Effekt überall zeigen (lazy CubeMatrixField)
  return (
    <div className="relative w-full h-full overflow-hidden rounded-lg" style={{ background: "#0b0a16" }}>
      {src && <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover" />}
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,#0c0c10aa,#0c0c1055 45%,#0c0c10cc)" }} />
      {on && (
        <Suspense fallback={null}>
          {/* #317: Showcase soll den Effekt WIE IM SPIEL zeigen — gedämpft, nicht überzeichnet (visuell am echten Modul
              in shop-großer Box abgestimmt). riseBase 1.2 (statt 2.2) → Türme stehen NIEDRIG in Ruhe wie in-game (kein
              Dauer-Hochstand); riseScale 0.55 → Musik-Ausschlag proportional zur flacheren Kachel wie im Spiel; yBias 0.32
              → das Hologrid schließt unten mit dem Rahmen ab (vorher lief die Front-Kante unter den Rahmen); depthScale 0.8
              → Feld flach genug für die Kachel. */}
          <CubeMatrixField color={look.a1} color2={look.a2} deckColored={deckTint} reduced={false} riseBase={1.2} riseScale={0.55} yBias={0.32} depthScale={0.8} sun={false} wire={wire} />
        </Suspense>
      )}
    </div>
  );
}

/* #spezial 4-Karten-Showcase: die vier Archetyp-Effekte (Hitze/Moos/Blitz/Eis) nebeneinander, jeweils im MAXIMALEN
   Status, in der gewählten Farbe (Standard-Neon ODER Deckfarbe-Beispiel-Verlauf). Moos/Eis/Blitz hängen als Kartenkind
   in ihrer Karte; die Hitze (FireHead) liegt als Panel-Overlay über der ersten Karte (Flammen loder in den Freiraum). */
const SPEZIAL_DECK_A = "#ff7a3a", SPEZIAL_DECK_B = "#e01234"; // Deckfarbe-Beispiel (roter Verlauf) — Effekte + Hintergrund rot
// #328 Showcase-Loop-Stufen: Eis läuft durch die FrostIce-Schwellen (MASS_MAX=12: 0→4→8→12), Pflanze durch das
// MossGrow-Wachstum (STAGE_MAX=8: 0→8). Beide Bitmaps sind pro Stufe modulweit gecacht → diskretes Stepping ist billig.
const ICE_MASS_SEQ  = [0, 4, 8, 12, 12]; // Halt auf Max (12 doppelt) vor dem Reset auf 0
const MOSS_GROW_SEQ = [0, 2, 4, 6, 8, 8]; // Halt auf „reif" (8 doppelt) vor dem Reset
const ICE_MASS_MAX = 12, MOSS_STAGE_MAX = 8; // Reduced-Motion → statisch auf Max
function SpezialScene({ deckTint = false }) {
  const panelRef = useRef(null);
  const fireCardRef = useRef(null);
  const bf = battlefieldAssets(SHOWCASE_BF);
  const DC = SPEZIAL_DECK_A, DC2 = SPEZIAL_DECK_B;
  // #328 Feuer/Blitz animieren selbst; Eis/Pflanze bekamen bisher einen Fixwert (Max) → jetzt durch die Stufen loopen.
  // Bei Reduced-Motion (usePrefersReducedMotion) keinen Loop → statisch auf Max (Endzustand sichtbar, ohne Bewegung).
  const reducedMotion = usePrefersReducedMotion();
  const [iceMass, setIceMass] = useState(reducedMotion ? ICE_MASS_MAX : ICE_MASS_SEQ[0]);
  const [mossGrowth, setMossGrowth] = useState(reducedMotion ? MOSS_STAGE_MAX : MOSS_GROW_SEQ[0]);
  useEffect(() => {
    if (reducedMotion) { setIceMass(ICE_MASS_MAX); setMossGrowth(MOSS_STAGE_MAX); return undefined; }
    // Getrennte, unabhängige Timer (am einfachsten): je Stufe ~0,8 s bzw. ~0,72 s, dann von vorn (Reset auf 0).
    let iceI = 0, mossI = 0;
    setIceMass(ICE_MASS_SEQ[0]); setMossGrowth(MOSS_GROW_SEQ[0]);
    const iceT = setInterval(() => { iceI = (iceI + 1) % ICE_MASS_SEQ.length; setIceMass(ICE_MASS_SEQ[iceI]); }, 820);
    const mossT = setInterval(() => { mossI = (mossI + 1) % MOSS_GROW_SEQ.length; setMossGrowth(MOSS_GROW_SEQ[mossI]); }, 720);
    return () => { clearInterval(iceT); clearInterval(mossT); };
  }, [reducedMotion]);
  const CARDS = [
    { key: "feuer", label: "Feuer", ref: fireCardRef, fx: null },
    { key: "blitz", label: "Blitz", ref: null, fx: <CardIonStorm active color={deckTint ? DC : "#5ec8f0"} /> },
    { key: "eis", label: "Eis", ref: null, fx: <FrostIce mass={iceMass} deckTint={deckTint} deckColor={DC} deckColor2={DC2} /> },
    { key: "pflanze", label: "Pflanze", ref: null, fx: <MossGrow growth={mossGrowth} deckTint={deckTint} deckColor={DC} deckColor2={DC2} /> },
  ];
  return (
    <div ref={panelRef} className="relative w-full h-full overflow-hidden rounded-lg" style={{ background: deckTint ? "#170509" : "#0b0a16" }}>
      {/* Standard-Modus: neutrales Battlefield-Bild + dunkler Verlauf. Deckfarbe-Modus: KEIN BF-Bild, dafür ein klar zur
          Deckfarbe passender Hintergrund (hier Rot) — dunkelroter Grund + Deck-Verlauf-Glows (oben deckColor, unten deckColor2). */}
      {!deckTint && bf && <img src={bf.desktop} alt="" className="absolute inset-0 w-full h-full object-cover" style={{ opacity: 0.6 }} />}
      {!deckTint && <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,#0c0c10cc,#0c0c1055 45%,#0c0c10dd)" }} />}
      {deckTint && <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${DC}1f, #180509 42%, ${DC2}33), radial-gradient(140% 95% at 50% 120%, ${DC2}99, transparent 60%), radial-gradient(125% 72% at 50% -12%, ${DC}77, transparent 52%)` }} />}
      <div className="absolute inset-0 flex items-end justify-center gap-1.5 px-2" style={{ paddingBottom: "11%" }}>
        {CARDS.map((c) => (
          <div key={c.key} className="relative flex flex-col items-center gap-1" style={{ height: "60%" }}>
            <div ref={c.ref || undefined} className="relative rounded-md overflow-visible"
              style={{ height: "100%", aspectRatio: CARD_RATIO, background: "linear-gradient(180deg,#26304a,#141a28)", boxShadow: "0 2px 9px #000a" }}>
              <div className="absolute inset-0 flex items-center justify-center" style={{ color: "#dde6f5", fontWeight: 800, fontSize: "clamp(13px,3vw,20px)" }}>7</div>
              {c.fx && <Suspense fallback={null}>{c.fx}</Suspense>}
            </div>
            {/* #330 Archetyp-Kartenlabels entfernt — kein Scene-Chrome mehr (Farbmodus zeigt zentral die Bühne). */}
          </div>
        ))}
      </div>
      {/* Hitze = FireHead (Panel-Overlay über der ersten Karte); Flammen loder nach oben in den Freiraum über den Karten. */}
      <Suspense fallback={null}><FireHead heat={1} panelRef={panelRef} cardRef={fireCardRef} deckTint={deckTint} deckColor={DC} deckColor2={DC2} lite /></Suspense>
    </div>
  );
}

/* #deckglow 4-BG-Showcase: rotiert durch verschieden FARBIGE Battlefields und zeigt jeden erst OHNE, dann MIT dem
   Deck-Glow (weiche Überblendung). Deckfarbe-Modus → jedes BG glüht in der Farbe seines Packs (a1); Standard → festes
   Neon. Genau EINE WebGL-Canvas (pro BG frisch gekeyt), das darunterliegende <img> ist die „Ohne"-Referenz. */
const DECKGLOW_BGS = [
  { bf: "bf_eis", a1: "#46c6ff", name: "Eis" },
  { bf: "bf_ronin", a1: "#ff2f4f", name: "Ronin" },
  { bf: "bf_kosmos", a1: "#ff4dcb", name: "Schwarzes Loch" },
  { bf: "bf_drache", a1: "#ffcf5a", name: "Laternenfest" },
  { bf: "bf_polarlicht", a1: "#7cc6ff", name: "Polarlicht" },
];
function DeckGlowScene() { // #336: kein Farbmodus mehr — Glow ist immer Deckfarbe (Tint); die Vorschau tönt je BG in dessen Akzent
  const [idx, setIdx] = useState(0);
  const [on, setOn] = useState(false);
  const isMobile = useIsMobile();
  useEffect(() => {
    let alive = true, to = null, i = 0, phase = "off";
    setIdx(0); setOn(false);
    const OFF_MS = 1100, ON_MS = 2200; // erst „ohne" (Referenz), dann „mit" (länger, damit man das Lauflicht sieht)
    const run = () => {
      if (!alive) return;
      if (phase === "off") { setOn(true); phase = "on"; to = setTimeout(run, ON_MS); }
      else { setOn(false); i = (i + 1) % DECKGLOW_BGS.length; setIdx(i); phase = "off"; to = setTimeout(run, OFF_MS); }
    };
    to = setTimeout(run, OFF_MS);
    return () => { alive = false; if (to) clearTimeout(to); };
  }, []);
  const cur = DECKGLOW_BGS[idx];
  const bf = battlefieldAssets(cur.bf);
  const src = bf ? (isMobile ? bf.mobile : bf.desktop) : null;
  const accent = cur.a1; // Akzentfarbe des Labels = die Demo-Glutfarbe des jeweiligen Felds
  return (
    <div className="relative w-full h-full overflow-hidden rounded-lg" style={{ background: "#0b0a16" }}>
      {src && <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover" />}
      {bf && <DeckGlowFieldGL srcDesktop={bf.desktop} srcMobile={bf.mobile} deckColor={cur.a1} on={on} animate />}
      <div className="absolute inset-x-0 top-0 h-14" style={{ background: "linear-gradient(180deg,#0b0a1699,transparent)" }} />
      {/* #330 Ausnahme-Slot unten-links (bewusst reserviert): Deck-Glow zeigt „Feldname · mit/ohne Deck-Glow" im
          einheitlichen PanelChip-Design. Der Farbmodus-Chip (BR) sowie Name/Status kommen zentral aus der Bühne. */}
      <PanelChip corner="bl" style={{ color: on ? "#e8ecff" : "#9aa0c4" }}>
        <span style={{ opacity: 0.7 }}>{cur.name}</span>{" "}
        <span style={{ color: on ? accent : "#9aa0c4" }}>{on ? "· mit Deck-Glow" : "· ohne"}</span>
      </PanelChip>
    </div>
  );
}

// Große In-Game-Vorschau eines Effekts im Kauffenster. Karten-Animationen → Karte/BF-Demo; Finisher/Krit →
// echte In-Game-Komponente; Gottgleich (inkl. Standard) → das komplette Ereignis nachgespielt.
function GlobalFxScenePreview({ fx, deckTint = false, sun = true, wire = false }) {
  // #kategorien: Hintergrund-Effekt (Aurora) / Hintergrund-Finisher (Glutfunken) / „Kein Feld-Effekt": echte
  // In-Game-Komponente (FieldFxLayer bzw. GPU-Emitter) über dem BF-Bild.
  if (fx.preview === "cubematrix") return <CubeMatrixPreview deckTint={deckTint} sun={sun} wire={wire} />; // #317 musik-reaktives Würfelfeld
  if (["aurora", "neonsurf", "starfield", "none"].includes(fx.preview)) return <FieldFxPreview effect={fx.preview} deckTint={deckTint} />; // #glutfunken-raus · #345 neonsurf
  if (fx.preview === "deckglow") return <DeckGlowScene />; // #deckglow: mehrere farbige BGs, je erst ohne, dann mit (immer Deckfarbe)
  if (ANIM_LAYER[fx.preview]) return <CardAnimPreview anim={fx.preview} />; // #318 Karten-Animation über echter Vorschau-Karte
  if (fx.preview === "gottStandard") return <GottScene Fx={null} look={PREVIEW_LOOK.gottStandard} />; // #322 „Gottgleich · Standard" = nur der Chrome-Schriftzug (kein Prunk)
  if (fx.preview === "standard") return <StandardFinisherScene />;
  if (fx.preview === "klinge") return <FinisherScene variant={fx.preview} deckTint={deckTint} look={PREVIEW_LOOK.klinge} />;
  if (fx.preview === "scorch") return <ScorchScene deckTint={deckTint} look={PREVIEW_LOOK.scorch} />; // #319 Scorch-Finisher (Laser + organischer Burn)
  if (fx.preview === "hologrid") return <HologridScene deckTint={deckTint} look={PREVIEW_LOOK.hologrid} />; // #321 Hologrid-Slice-Finisher (Pixi)
  if (fx.preview === "spezial") return <SpezialScene deckTint={deckTint} />; // #328 4-Karten-Showcase (Feuer/Blitz/Eis/Pflanze) — Farbmodus aus archColor (deckTint)
  if (fx.preview === "blackhole") return <BlackholeScene deckTint={deckTint} />; // #320 Schwarzes-Loch-Finisher (persistentes Serien-Loch)
  // #gott-showcase: je Effekt eigener Backdrop + eigene Deckfarbe (look) fürs Deckfarbe-Beispiel (Name/Status/Farbmodus
  //   zeichnet zentral die Bühne, #330).
  if (fx.preview === "sonnenPuls") return <GottScene Fx={SonnenPulsPixi} deckTint={deckTint} look={PREVIEW_LOOK.sonnenPuls} />; // #322 (Pixi)
  if (fx.preview === "laserFaecher") return <GottScene Fx={LaserFaecherPixi} deckTint={deckTint} look={PREVIEW_LOOK.laserFaecher} />; // #323 (Pixi)
  if (fx.preview === "prismaKaskade") return <GottScene Fx={PrismaKaskadePixi} deckTint={deckTint} look={PREVIEW_LOOK.prismaKaskade} />; // #324 (Pixi)
  if (fx.preview === "holoCube") return <GottScene Fx={HoloCubePixi} deckTint={deckTint} look={PREVIEW_LOOK.holoCube} />; // #325 (Pixi)
  if (fx.preview === "supernova") return <GottScene Fx={SupernovaPixi} deckTint={deckTint} look={PREVIEW_LOOK.supernova} sfx="fx_supernova" />; // #326 (Pixi) · #377 Swell im Showcase
  // Fallback (kein bekannter Vorschautyp): schlichte Battlefield-Szene.
  const bf = battlefieldAssets(SHOWCASE_BF);
  return (
    <div className="relative w-full h-full overflow-hidden rounded-lg" style={{ background: "#0b0a16" }}>
      {bf && <img src={bf.desktop} alt="" className="absolute inset-0 w-full h-full object-cover" />}
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,#0c0c10aa,#0c0c1055 45%,#0c0c10cc)" }} />
    </div>
  );
}

// #306 Battlefield-Ambiente-Vorschau: das echte BF-Bild (aktuell gespielte Version) + der ECHTE In-Game-Layer
// (FieldFxLayer) in der Demo-Deckfarbe. Ein Intervall bumpt sweepId → periodische „Stich"-Reaktion wie im Spiel.
// „none" zeigt nur das BF-Bild. Vorschau = In-Game (dieselbe Komponente, kein Drift).
// Hit-Tier-Leiter für die Feld-Finisher-Eskalations-Vorschau (Pixi, Komet/Sternenfeld): Schwach → Gottgleich.
const EMBER_TIER_LABELS = ["Schwach", "Stark", "Brutal", "Irre", "Gottgleich"];
// Der GPU-Emitter zeigt den Feld-Finisher als Eskalation — nur im Preview/Dev-Build mit „pixi"-Renderer; sonst DOM-Fassung.
const EMBER_PIXI_PREVIEW = (import.meta.env.VITE_PREVIEW === "1" || import.meta.env.DEV) && FX_RENDERER === "pixi";
function FieldFxPreview({ effect, deckTint = false }) {
  const look = PREVIEW_LOOK[effect] || { bf: SHOWCASE_BF, a1: DEMO_C, a2: "#b06bff" };
  // #327: Standard-Modus = einheitlich Genesis (SHOWCASE_BF); nur der Deckfarbe-Modus zeigt den Pack-BG (look.bf).
  //   Die Effektfarbe (look.a1/a2) bleibt davon unberührt — Standard nutzt weiter den festen Standard-Look des Effekts.
  const bf = battlefieldAssets(deckTint ? look.bf : SHOWCASE_BF);
  const isMobile = useIsMobile();
  const src = bf ? (isMobile ? bf.mobile : bf.desktop) : null;
  const [sweep, setSweep] = useState(1);
  const [tierStep, setTierStep] = useState(0);
  const tierRef = useRef(0); // #komet: spiegelt tierStep (der setTierStep-Updater darf keinen Sound spielen → StrictMode ruft ihn doppelt)
  const pixiField = PIXI_FIELD_KEYS.includes(effect); // #346: Sternenfeld/Komet → Pixi-Bühne im Showcase, AUCH in Prod (lazy PixiStage) — spiegelt den In-Game-Renderpfad
  const auroraGL = EMBER_PIXI_PREVIEW && effect === "aurora";              // Aurora → eigene WebGL-Canvas (bleibt Preview/Dev; in Prod DOM-Fallback via FieldFxLayer)
  const neonsurfGL = effect === "neonsurf";                                // #345 Neon-Brandung → eigene WebGL-Canvas (auch in Prod, kein Pixi-Gate)
  useEffect(() => {
    if (effect === "none") return undefined;
    // Sweep-Puls je Tick; Pixi-Feldeffekt (Komet) eskaliert zusätzlich durch die Hit-Tier-Leiter (Schwach → Gottgleich).
    const id = setInterval(() => {
      setSweep((s) => s + 1);
      if (pixiField) {
        // #311: den Pixi-Feldeffekt (Sternenfeld/Komet) durch die Tier-Leiter eskalieren. Nächsten Tier über den Ref
        // bestimmen (nicht im Updater Sound spielen — StrictMode ruft ihn doppelt).
        const nextTier = (tierRef.current + 1) % EMBER_TIER_LABELS.length;
        tierRef.current = nextTier; setTierStep(nextTier);
        // #komet: Sternenfeld-Sound auch im Showcase — Datei nach gezeigtem Tier (≥1 Woosh+Impact, sonst kleiner Komet).
        if (effect === "starfield") audio.play(nextTier >= 1 ? "fx_comet_impact" : "fx_comet", { gain: 0.27 });
      }
      // #345/#sound: Neon-Brandung spielt je Surge den Splash (wie in-game, Battlefield.jsx) → Vorschau ist hörbar.
      if (effect === "neonsurf") audio.play("fx_neonsurf_splash", { gain: 0.3 });
    }, 1500);
    return () => clearInterval(id);
  }, [effect, pixiField]);
  return (
    <div className="relative w-full h-full overflow-hidden rounded-lg" style={{ background: "#0b0a16" }}>
      {src && <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover" />}
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,#0c0c10aa,#0c0c1055 45%,#0c0c10cc)" }} />
      {/* Pixi-Feldeffekte (Aurora/Sternenfeld/Glutfunken) auf der GPU-Bühne — sonst die DOM-Fassung (FieldFxLayer). */}
      {pixiField && (
        <Suspense fallback={null}>
          <PixiStage className="absolute inset-0 z-[2]" effect={effect} color={look.a1} color2={look.a2} deckTint={deckTint}
            score={250000} reduced={false} lite={false}
            sweepId={sweep} sweepDur={1100} win hitTier={tierStep} />
        </Suspense>
      )}
      {auroraGL && (
        <div className="absolute inset-0 z-[2] pointer-events-none">
          {/* #359: Die Showcase-Box ist niedrig+breit — der In-Game-Bogen (Scheitel bei ~1,2 der Höhe) würde oben
              abgeschnitten. bandScale/bandShift legen NUR im Showcase den Bogen tiefer + leicht gestaucht in die Box
              (voller Bogen sichtbar). In-Game bleibt bei den Defaults (1/0) → unverändert. [TUNING] */}
          <AuroraFieldGL color={look.a1} color2={look.a2} deckColored={deckTint} animate bandScale={1.12} bandShift={0.2} />
        </div>
      )}
      {/* #345 Neon-Brandung — je Sweep-Tick ein Ansage-Puls (Stufe rotiert 0.7/1.0/1.4), damit das Gefäß-Schwappen sichtbar ist. */}
      {neonsurfGL && (
        <div className="absolute inset-0 z-[2] pointer-events-none">
          <NeonSurfFieldGL color={look.a1} color2={look.a2} deckColored={deckTint} animate surge={{ id: sweep, mag: [0.7, 1.0, 1.4][sweep % 3] }} />
        </div>
      )}
      {effect !== "none" && !pixiField && !auroraGL && !neonsurfGL && <FieldFxLayer effect={effect} color={look.a1} color2={look.a2} sweepId={sweep} sweepDur={1100} reduced={false} win score={0} />}
      {/* #330 Tier/Score-Chip entfernt — kein Scene-Chrome mehr (nur noch das 4-Ecken-Template der Bühne). */}
    </div>
  );
}

// #318 Karten-Animations-Vorschau: eine ECHTE Spielkarte (Card.jsx, 104×144) mittig auf neutralem Feld, darüber die
// geteilte CardFxStage mit dem gewählten Dauer-Layer — dieselbe Engine wie in-game (kein Drift). Pixi-only → nur im
// Preview/Dev-Build; sonst zeigt die Vorschau die reine Karte (die Effekte laufen in Produktion ohnehin nicht).
const CARDFX_PREVIEW_ON = (import.meta.env.VITE_PREVIEW === "1" || import.meta.env.DEV);
function CardAnimPreview({ anim }) {
  const look = PREVIEW_LOOK[anim] || { bf: SHOWCASE_BF, a1: DEMO_C, a2: "#b06bff" };
  const bf = battlefieldAssets(look.bf);
  const isMobile = useIsMobile();
  const src = bf ? (isMobile ? bf.mobile : bf.desktop) : null;
  const panelRef = useRef(null);
  const cardRef = useRef(null);
  return (
    <div ref={panelRef} className="relative w-full h-full overflow-hidden rounded-lg grid place-items-center" style={{ background: "#0b0a16" }}>
      {src && <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover" />}
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,#0c0c10aa,#0c0c1055 45%,#0c0c10cc)" }} />
      <div ref={cardRef} className="relative" style={{ zIndex: 1 }}>
        <Card suit="B" value={7} />
      </div>
      {CARDFX_PREVIEW_ON && (
        <Suspense fallback={null}>
          <CardFxStage panelRef={panelRef} cards={[{ ref: cardRef, active: true, num: 7, color: suitColor("B") }]}
            layers={{ [ANIM_LAYER[anim]]: true }} color={look.a1} color2={look.a2} tier={3} />
        </Suspense>
      )}
    </div>
  );
}

// Karten-Vorschau: illustrierte Karte (Front = Rahmen, Back = Cover), vollständig (object-contain) + optionaler
// Effekt. Frame Glow = pulsierender Schein am Kartenrand; Holo Swipe = wandernder Glanz-Streifen.
function CardPreview({ deckId, face = "back", className = "", style }) {
  const img = deckAssets(deckId)[face] || deckAssets(deckId).back;
  return (
    <div className={`relative rounded-lg overflow-hidden ${className}`}
      style={{ aspectRatio: CARD_RATIO, background: "#0b0a16", ...style }}>
      <img src={img} alt="" className="absolute inset-0 w-full h-full object-contain rounded-lg" />
    </div>
  );
}

// Battlefield-Vorschau: echtes BF-Bild in der AKTUELL gespielten Version (mobile/desktop, gleiche 640px-
// Schwelle wie im Spiel). showVersion blendet ein kleines Label ein, welche Version man gerade sieht.
function BfPreview({ bfId, className = "", showVersion = false }) {
  const bf = battlefieldAssets(bfId);
  const isMobile = useIsMobile();
  const src = bf ? (isMobile ? bf.mobile : bf.desktop) : null;
  return (
    <div className={`relative rounded-lg overflow-hidden ${className}`} style={{ aspectRatio: "16 / 10", background: "#0b0a16" }}>
      {src ? <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover" />
          : <div className="absolute inset-0 grid place-items-center text-xs opacity-40">Kein Battlefield</div>}
      {showVersion && bf && (
        <span className="absolute top-1.5 left-1.5 text-[9px] font-extrabold tracking-wider px-1.5 py-0.5 rounded"
          style={{ background: "#0b0a16cc", border: "1px solid #34333f", color: "#9a97ab" }}>{isMobile ? "MOBILE" : "DESKTOP"}</span>
      )}
    </div>
  );
}

// Kleine Deck-Rücken-Miniatur (für Pack-Kacheln). object-contain → nie angeschnitten.
function DeckThumb({ deckId, className = "", face = "back", style }) {
  const img = deckAssets(deckId)[face];
  // #perf C3: Der Shop rendert ein Raster aus ~15–20 Deck-Thumbnails. `loading="lazy"` lädt nur die sichtbaren Kacheln
  // (Off-Screen erst beim Scrollen) → deutlich weniger Bytes beim Öffnen der Kollektion auf Mobile; `decoding="async"`
  // hält das Bild-Decoding vom Main-Thread. Rein additive Attribute → kein visueller/Desktop-Unterschied.
  return <img src={img} alt="" loading="lazy" decoding="async" className={`object-contain ${className}`} style={{ aspectRatio: CARD_RATIO, background: "#0b0a16", ...style }} />;
}

const EYEBROW = "flex items-center gap-2 text-[10px] font-extrabold tracking-[0.13em] uppercase mt-4 mb-2";

/* ============================ Haupt-Screen ============================ */
export function CustomizeScreen({ options, profile, onChoose, onClose, onProfileChange }) {
  useEscape(onClose);
  // #perf-shop (Plan A): beim Öffnen der Werkstatt alle Effekt-Chunks idle vorladen → kein Lade-Hitch beim ersten
  //   Anzeigen eines Effekts. Läuft nur einmal pro Session (interner Guard).
  useEffect(() => { prefetchFxChunks(); }, []);
  const p = profile || {};
  const [tab, setTab] = useState("packs");           // "packs" | "challenges" | "fx"
  const [packOv, setPackOv] = useState(null);        // offene Pack-Detailansicht: { cat, idx } | null
  const [packSel, setPackSel] = useState("back");   // "back" | "front" | "bg" — Cover (Rücken) zuerst, dann Front
  const deckId = options?.deckId || "default";
  // #Shop-Reorg: Detail navigiert innerhalb seiner Kategorie; aktives Pack steht nach Standard vorn (orderPacks).
  const catList = (cat) => orderPacks(cat === "challenges" ? CHALLENGES_TAB : PACKS_TAB, deckId);
  const dpBal = Math.max(0, Math.floor(Number(p.deckPoints) || 0)); // #299 Deckpunkte — Währung der Packs (SP wird in der Werkstatt nicht gezeigt)

  // #fx-floater: Höhe des Sticky-Kopfs messen → die Effekt-Vorschau klebt exakt darunter (mitlaufender Floater, kein Überlappen).
  const headRef = useRef(null);
  const [headH, setHeadH] = useState(116); // Startwert ≈ Kopfhöhe, vermeidet 1-Frame-Sprung vor der Messung
  useEffect(() => {
    const el = headRef.current;
    if (!el) return undefined;
    const measure = () => setHeadH(el.offsetHeight || 0);
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [tab]);

  const buy = (fn) => { if (onProfileChange) onProfileChange(fn(p)); };
  const activate = (pack) => onChoose(hasBattlefield(pack) ? { deckId: pack.deckId, battlefieldId: pack.bfId } : { deckId: pack.deckId });

  const openPack = (cat, i) => { setPackOv({ cat, idx: i }); setPackSel("back"); };
  const stepPack = (d) => { setPackOv((o) => (o ? { ...o, idx: (o.idx + d + catList(o.cat).length) % catList(o.cat).length } : o)); setPackSel("back"); };

  // Ist ein Kauffenster offen, wird der Shop-Hintergrund NICHT mitgescrollt (kein Scroll-Durchgriff auf iOS).
  const anyOverlay = !!packOv;

  return (
    <div className={`fixed inset-0 overlay-root z-40 flex items-start justify-center p-3 sm:p-6 ${anyOverlay ? "overflow-hidden" : "overflow-y-auto"}`}
      style={{ background: "#0c0c10ee", backdropFilter: "blur(3px)" }} onClick={onClose}>
      <style>{FX_CSS}</style>
      <div className="w-full max-w-xl rounded-2xl px-5 pb-5 sm:px-6 sm:pb-6 my-auto overlay-card as-panel"
        style={MODAL_CARD} onClick={(e) => e.stopPropagation()}>
        {/* Sticky Kopf */}
        <div ref={headRef} className="sticky top-0 z-20 -mx-5 sm:-mx-6 px-5 sm:px-6 pt-5 sm:pt-6 pb-3 relative" style={{ background: STICKY_HEAD_BG }}>
          <TopHairline />
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <h2 className="text-lg font-bold whitespace-nowrap">Deck-Werkstatt</h2>
            <div className="flex items-center gap-2.5 shrink-0 ml-auto">
              {/* Nur DP anzeigen — die Werkstatt-Währung (Packs UND Effekte, #307). SP ist hier irrelevant (nur der
                  Upgrade-Baum nutzt SP) und wird deshalb nicht mehr gezeigt. Kompakte Inline-Währung wie im Upgrade-Screen. */}
              <span className="flex items-baseline gap-1 whitespace-nowrap">
                <span className="text-lg font-extrabold tabular-nums" style={{ color: "#35c6e6" }}>{dpBal}</span>
                <span className="text-[10px] font-bold tracking-wider" style={{ color: "#35c6e6", opacity: .8 }}>DP</span>
              </span>
              <button onClick={onClose} className="shrink-0 px-3 py-1.5 rounded-lg text-sm" style={{ background: "#20202a", border: "1px solid #3a3a46" }}>Schließen</button>
            </div>
          </div>
          {/* Tab-Umschalter: Packs · Challenges · Effekte — im Upgrade-Reiter-Stil (gleiche Designsprache): umrandete
              Kacheln, aktiver Reiter in seiner Akzentfarbe (Rand + Text + dezenter Glow), inaktiv grau/transparent. */}
          <div className="flex gap-1.5 mt-3">
            {[["packs", "Packs", "#9b82f0"], ["challenges", "Challenges", "#e05555"], ["fx", "Effekte", "#d4a63a"]].map(([m, label, col]) => {
              const on = tab === m;
              return (
                <button key={m} onClick={() => setTab(m)} role="tab" aria-selected={on}
                  className="flex-1 text-[13px] font-semibold tracking-wide px-3 py-2 rounded-lg transition-colors"
                  style={on
                    ? { color: col, background: "#131318", border: `1px solid ${col}55`, boxShadow: `0 0 16px -9px ${col}` }
                    : { color: "#8a8a95", background: "transparent", border: "1px solid #2a2a33" }}>
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {tab === "packs" ? <PacksView p={p} deckId={deckId} list={catList("packs")} cat="packs" onOpen={openPack} />
          : tab === "challenges" ? <PacksView p={p} deckId={deckId} list={catList("challenges")} cat="challenges" onOpen={openPack} />
          : <FxView p={p} options={options} onChoose={onChoose} onBuyFx={(fx) => buy((pf) => buyGlobalFx(pf, fx))} stickyTop={headH} />}
      </div>

      {/* Kauffenster via Portal an document.body: der Shop-Root trägt backdrop-filter und ist damit der
          Containing-Block für `position:fixed` — das Portal löst das Overlay heraus → echtes Vollbild-Overlay. */}
      {packOv && createPortal(
        <PackDetail pack={catList(packOv.cat)[packOv.idx]} idx={packOv.idx} count={catList(packOv.cat).length} p={p} dpBal={dpBal}
          deckId={deckId} sel={packSel} setSel={setPackSel} onStep={stepPack} onClose={() => setPackOv(null)}
          onActivate={activate} onBuy={(pack) => { buy((pf) => buyPack(pf, pack)); activate(pack); }} />,
        document.body)}
    </div>
  );
}

/* ============================ Packs- / Challenges-Tab ============================ */
// #Shop-Reorg: geteilte Ansicht für „Packs" (Kauf-Packs, nach DP-Preis sortiert) und „Challenges" (freischaltbare
// cond-Packs). `list` kommt vorsortiert rein; die Reihenfolge bleibt (kein erneutes Sortieren) → billig oben, teuer unten.
function PacksView({ p, deckId, list, cat, onOpen }) {
  const challenge = cat === "challenges";
  const [filter, setFilter] = useState("alle");
  const chips = challenge ? [["alle", "Alle"], ["besitz", "Frei"], ["gesperrt", "Gesperrt"]] : [["alle", "Alle"], ["besitz", "Besitz"], ["kaufbar", "Kaufbar"]];
  const stateOf = (pack) => (pack.kind === "std" ? "own" : packState(p, pack));
  const shown = list.filter((pack) => {
    const s = stateOf(pack);
    if (filter === "besitz") return s === "own";
    if (filter === "kaufbar") return s === "buy";
    if (filter === "gesperrt") return s === "lock";
    return true;
  });

  return (
    <>
      <div className="flex gap-1.5 mt-3 flex-wrap">
        {chips.map(([k, label]) => (
          <button key={k} onClick={() => setFilter(k)} className="px-3 py-1.5 rounded-full text-[11.5px] font-bold transition-colors"
            style={{ background: filter === k ? "#26c6e6" : "#14131c", color: filter === k ? "#08181c" : "#9a97ab", border: `1px solid ${filter === k ? "#26c6e6" : "#2a2836"}` }}>{label}</button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-3">
        {shown.map((pack) => {
          const gi = list.indexOf(pack);
          const s = stateOf(pack);
          const active = deckId === pack.deckId;
          // Ausgegraut = noch nicht im Besitz (kaufbar ODER gesperrt) — einheitlich wie die Challenges. Nur besessene/aktive Packs bleiben farbig.
          const owned = s === "own";
          const badge = active ? ["AKTIV", "#123a25", "#54e08a", "#2f7a4f"]
            : s === "buy" ? [`${packPrice(pack)} DP`, "#0e2429", "#35c6e6", "#2b5a68"]
            : s === "lock" ? ["🔒", "#1c1b24", "#9a97ab", "#2e2d38"]
            : null;
          const sub = active ? ["aktiv", "#54e08a"]
            : s === "own" ? ["tippen → Details", "#9a97ab"]
            : s === "buy" ? ["kaufbar", "#f2c14a"]
            : [packUnlock(p, pack).label, "#6d6a80"];
          return (
            <button key={pack.id} type="button" onClick={() => onOpen(cat, gi)}
              className="relative rounded-xl overflow-hidden text-left transition-transform hover:-translate-y-0.5"
              style={{ background: "#14131c", border: `1px solid ${active ? "#54e08a55" : "#2a2836"}`, boxShadow: active ? "0 0 0 1px #54e08a55" : undefined }}>
              <div className="relative" style={{ aspectRatio: CARD_RATIO }}>
                <DeckThumb deckId={pack.deckId} className="absolute inset-0 w-full h-full" style={{ filter: owned ? undefined : "grayscale(.7) brightness(.5)" }} />
                {badge && <span className="absolute top-1.5 right-1.5 text-[9px] font-extrabold px-1.5 py-0.5 rounded" style={{ background: badge[1], color: badge[2], border: `1px solid ${badge[3]}` }}>{badge[0]}</span>}
              </div>
              <div className="px-2 py-1.5">
                <span className="text-[12px] font-extrabold truncate block">{pack.name}</span>
                <span className="text-[10px] truncate block" style={{ color: sub[1] }}>{sub[0]}</span>
              </div>
            </button>
          );
        })}
      </div>

      {shown.length === 0 && (
        <div className="text-center text-[12px] py-6" style={{ color: "#6d6a80" }}>Nichts in dieser Ansicht.</div>
      )}

      <p className="text-[11px] mt-4 leading-snug pt-3" style={{ color: "#9a97ab", borderTop: "1px solid #2a2836" }}>
        {challenge
          ? <>Ein <b>Challenge-Deck</b> wird über eine Herausforderung <b>freigeschaltet</b> (kein Kauf). Tippe es an → Vorschau + Freischalt-Bedingung; sobald erfüllt, aktivierst du es direkt.</>
          : <>Ein <b>Pack</b> bündelt Karte (Front + Back) und Battlefield. Tippe ein Pack an → Detail-Ansicht mit Vorschau; <b>Kaufen aktiviert das Pack direkt</b>.</>}
      </p>
    </>
  );
}

/* Pack-Detailansicht (Portal): Vorschau (Karte vorne/hinten/Hintergrund), ‹ ›/Swipe zwischen Packs, Kaufen/Aktivieren. */
function PackDetail({ pack, idx, count, p, dpBal, deckId, sel, setSel, onStep, onClose, onActivate, onBuy }) {
  const touch = useRef(0);
  const hasBf = hasBattlefield(pack);
  const segs = hasBf ? [["back", "Karte hinten"], ["front", "Karte vorne"], ["bg", "Hintergrund"]]
                     : [["back", "Karte hinten"], ["front", "Karte vorne"]];
  const activeSel = (sel === "bg" && !hasBf) ? "back" : sel;

  const s = pack.kind === "std" ? "own" : packState(p, pack);
  const active = deckId === pack.deckId;
  const price = packPrice(pack);
  const canBuy = pack.kind === "buy" && canBuyPack(p, pack);
  const unlock = pack.kind === "cond" ? packUnlock(p, pack) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 overflow-y-auto overscroll-contain"
      style={{ background: "#05050ad0", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl overflow-hidden my-auto" style={MODAL_CARD} onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
        onTouchEnd={(e) => { const dx = e.changedTouches[0].clientX - touch.current; if (Math.abs(dx) > 45) onStep(dx < 0 ? 1 : -1); }}>
        <div className="h-[3px] w-full" style={HAIRLINE} aria-hidden="true" />
        <div className="p-3.5">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[15px] font-extrabold truncate">{pack.name}</span>
            <button onClick={onClose} className="shrink-0 text-[11px] px-2.5 py-1 rounded-lg" style={{ background: "#20202a", border: "1px solid #3a3a46", color: "#9a97ab" }}>Schließen</button>
          </div>

          {/* Großes Preview mit ‹ › — feste Höhe (Karte↔BF springt nicht) */}
          <div className="flex items-center gap-2" style={{ height: 252 }}>
            <button onClick={() => onStep(-1)} className="shrink-0 grid place-items-center rounded-full text-[15px]" style={{ width: 30, height: 30, background: "#20202c", border: "1px solid #3a3a46" }}>‹</button>
            <div className="flex-1 min-w-0 h-full flex items-center justify-center">
              {activeSel === "bg"
                ? <BfPreview bfId={pack.bfId} a1={pack.a1} className="w-full" showVersion />
                : <CardPreview deckId={pack.deckId} a1={pack.a1} face={activeSel} className="h-[248px] max-h-[46vh]" />}
            </div>
            <button onClick={() => onStep(1)} className="shrink-0 grid place-items-center rounded-full text-[15px]" style={{ width: 30, height: 30, background: "#20202c", border: "1px solid #3a3a46" }}>›</button>
          </div>

          {/* Umschalter Karte vorne / hinten / Hintergrund */}
          <div className="flex gap-1.5 justify-center mt-2.5">
            {segs.map(([k, label]) => (
              <button key={k} onClick={() => setSel(k)} className="flex-1 max-w-[120px] py-1.5 rounded-lg text-[11px] font-extrabold transition-colors"
                style={{ background: activeSel === k ? "#211f2e" : "#14131c", border: `1px solid ${activeSel === k ? "#9b82f0" : "#2a2836"}`, color: activeSel === k ? "#e8e6ff" : "#9a97ab" }}>{label}</button>
            ))}
          </div>

          <div className="flex gap-1.5 justify-center my-2.5">
            {Array.from({ length: count }).map((_, i) => <span key={i} className="rounded-full transition-all" style={{ width: i === idx ? 16 : 6, height: 6, background: i === idx ? "#9b82f0" : "#3a3947" }} />)}
          </div>

          {/* Aktion */}
          {active ? (
            <div className="w-full rounded-xl font-extrabold text-[13px] py-3 text-center" style={{ background: "#123a25", color: "#54e08a", border: "1px solid #2f7a4f" }}>Aktiv ✓</div>
          ) : s === "own" ? (
            <button onClick={() => { onActivate(pack); onClose(); }} className="w-full rounded-xl font-extrabold text-[13px] py-3"
              style={{ background: "#20202c", border: "1px solid #9b82f0", color: "#e8e6ff" }}>Aktivieren</button>
          ) : s === "buy" ? (
            <button onClick={() => { if (canBuy) { onBuy(pack); onClose(); } }} disabled={!canBuy}
              className="w-full rounded-xl font-extrabold text-[13px] py-3 transition-opacity"
              style={{ background: canBuy ? "#35c6e6" : "#12303a", color: "#0a1114",
                boxShadow: canBuy ? "0 0 16px rgba(53,198,230,.3)" : undefined, opacity: canBuy ? 1 : 0.6, cursor: canBuy ? "pointer" : "not-allowed" }}>
              Kaufen · {price} DP{!canBuy && dpBal < price ? " (zu wenig DP)" : ""}
            </button>
          ) : (
            <div className="w-full rounded-xl font-extrabold text-[12px] py-3 text-center leading-snug" style={{ background: "#1c1b24", color: "#9a97ab", border: "1px solid #2e2d38" }}>
              🔒 Freischalten: {unlock.label}
              {unlock.target > 1 && <span className="opacity-70"> · {unlock.cur} / {unlock.target}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ============================ Effekte-Tab (#fx-floater) ============================ */
/* Variante „Bühne + Liste": eine große, ECHTE In-Game-Vorschau klebt als Floater direkt unter dem Sticky-Kopf
   (top = gemessene Kopfhöhe) und läuft beim Scrollen mit — so bleibt sie sichtbar, egal wie viele Kategorien
   darunter kommen. Je Gruppe eine horizontal wischbare Reihe kompakter Chips (kleine Live-Vorschau + Kurzname +
   Status-Marker). Tippen wählt den Effekt → der Floater zeigt ihn groß und bietet die passende Aktion (Kaufen /
   An-Aus / Als Finisher·Ambiente wählen). Kein separates Kauffenster mehr — der Floater IST Vorschau und Kauf. */
// #shopB (Variante B) Kategorie-Tabs statt fünf Wisch-Reihen. Kurzlabel je Slot (Daumen-freundlich).
const TAB_LABEL = { karten: "Karten", stich: "Stich", hintergrund: "Hintergrund", score: "Score" };
// #shopB Kurzbeschreibung je Effekt: NUR der funktionale Bezug (was er im Spiel tut / worauf er reagiert — z. B. Klinge
// skaliert mit der Serie), nicht die Marketing-Langfassung. „none"/„standard" hängen an der Kategorie → über shortDesc().
const FX_SHORT = {
  edgeglow: "Dauerhafter Neon-Rand in der Deckfarbe.",
  holo: "Prismatisches Lichtband, tilt-reaktiv.",
  glitch: "Cyberpunk-Glitch mit gelegentlichen Bursts.",
  aurora: "Weiche Schleier; je Stich ein Bloom-Puls.",
  neonsurf: "Plasma-See am unteren Rand — starke Ansagen drücken das Wasser mittig ein, es steigt an den Rändern hoch.",
  deckglow: "Konturen des Battlefields glühen — frei mit allen anderen Effekten kombinierbar.",
  cubematrix: "Neon-Würfelfeld — reagiert auf die Musik.",
  starfield: "Sternschnuppe je Stich — größer mit dem Score.",
  klinge: "Klingenschnitt — skaliert mit der Siegesserie.",
  scorch: "Laser + organischer Burn; Tempo mit dem Turbo.",
  blackhole: "Schwarzes Loch saugt die Gegnerkarte ein.",
  sonnenPuls: "Outrun-Sonne — feuert beim gottgleichen Sieg.",
  laserFaecher: "Laser fächern auf — gottgleicher Sieg.",
  prismaKaskade: "Prismatische Schockwellen — gottgleicher Sieg.",
  holoCube: "Holowürfel zerspringt — gottgleicher Sieg.",
  supernova: "Kollaps → Detonation → Tunnel — gottgleicher Sieg.",
};
function shortDesc(fx, group) {
  if (fx.key === "none") return group.mode === "cardanim" ? "Alle Karten-Animationen aus." : "Kein Hintergrund-Effekt (Leuchten bleibt möglich).";
  if (fx.group === "spezial") return "Feuer · Blitz · Eis · Pflanze — immer aktiv, nur Farbwahl (Standard/Deckfarbe)."; // #328 ein Tile
  if (fx.key === "standard") return "Verliererkarte fliegt einfach zur Seite weg.";
  if (fx.key === "gottStandard") return "Gottgleicher Sieg ohne Prunk-Effekt.";
  return FX_SHORT[fx.key] || fx.desc;
}

function FxView({ p, options, onChoose, onBuyFx, stickyTop = 0 }) {
  const finisherSel = finisherSelOf(options, p); // #klinge-kaufbar: „klinge" nur bei Besitz aktiv, sonst „standard"
  const bgSel = bgSelOf(options, p);   // #331 EIN exklusiver Hintergrund-Effekt (aurora/cubematrix/embers/starfield) oder „none"
  const cardAnimSel = cardAnimSelOf(options, p); // #331 EINE Karten-Animation (edgeglow/holo/glitch) oder „none"
  const gottSel = gottSelOf(options); // #322 aktiver Score-Prunk oder „gottStandard" (kein Prunk)
  const deckGlowOn = !!options?.fxDeckGlow; // #331 Leuchten (freier Toggle, unabhängig vom Hintergrund-Set)
  const activeKeyOf = (g) => g.mode === "finisher" ? finisherSel : g.mode === "bg" ? bgSel : g.mode === "gott" ? gottSel : g.mode === "cardanim" ? cardAnimSel : null;
  // Auswahl-Status: { group (aktive Kategorie/Tab), key (Effekt in der Bühne) }. Default = erster Effekt der ersten Gruppe.
  const [sel, setSel] = useState(() => defaultSelFor(FX_GROUPS[0].key)); // #373 Karten-Reiter startet auf „Keine Animation" (kein Auto-Showcase)
  const selGroup = FX_GROUPS.find((g) => g.key === sel.group) || FX_GROUPS[0];
  const selItems = fxGroupItems(selGroup.key, options, p); // #353 Standard oben → aktiver darunter → Rest nach Seltenheit
  const selFx = selItems.find((f) => f.key === sel.key) || selItems[0];

  // Ist ein Effekt in seiner Gruppe „aktiv"? (als Finisher/Prunk/Hintergrund/Animation gewählt bzw. Toggle an).
  // Zentrale Wahrheit → Zeilen-Marker + Bühnen-Aktion. Reihenfolge: Skill-Effekt & Leuchten sind Sonderfälle vor den Modi.
  const isActive = (g, fx) =>
      fx.group === "spezial" ? true                    // #328 Skill-Effekt ist IMMER aktiv (nur Farbwahl) → „AKTIV"-Badge korrekt
    : fx.key === "deckglow" ? deckGlowOn              // #331 Leuchten: freier Toggle (unabhängig vom Hintergrund-Set)
    : g.mode === "finisher" ? finisherSel === fx.key
    : g.mode === "gott" ? gottSel === fx.key          // #322 Score-Prunk einfach-exklusiv (gottStandard = kein Prunk)
    : g.mode === "cardanim" ? (fx.key === "none" ? cardAnimSel === "none" : cardAnimSel === fx.key) // #331 einfach-exklusiv
    : g.mode === "bg" ? (fx.key === "none" ? bgSel === "none" : bgSel === fx.key) // #331 EIN Hintergrund-Effekt (oder keiner)
    : false;

  // #shopB Tab-Wechsel: die Bühne springt auf den AKTIVEN Effekt der Kategorie (oder den ersten) → man sieht sofort, was läuft.
  const pickCat = (gKey) => {
    // #373 Karten: bewusst „Keine Animation" als Default (kein Auto-Loslaufen der Skill-Effekt-Showcase), auch beim
    // erneuten Anwählen des Reiters. Übrige Reiter springen wie bisher auf ihren AKTIVEN Effekt (oder das erste Item).
    if (DEFAULT_FX_KEY[gKey]) { setSel(defaultSelFor(gKey)); return; }
    const g = FX_GROUPS.find((x) => x.key === gKey);
    const its = fxGroupItems(gKey, options, p);
    const aKey = activeKeyOf(g);
    setSel({ group: gKey, key: (aKey && its.some((f) => f.key === aKey)) ? aKey : its[0].key });
  };
  // Doppeltippen in der Liste schaltet direkt um (wie zuvor der Chip).
  const toggleFx = (g, fx) => {
    const on = isActive(g, fx);
    if (!on && !(fx.alwaysOwned || globalFxOwned(p, fx))) return; // nicht im Besitz → erst über die Bühne kaufen
    if (fx.group === "spezial") return; // #328 Skill-Effekt: immer aktiv, Farbe NUR über den Toggle (Tile-Klick = no-op)
    else if (fx.key === "deckglow") onChoose({ [fx.option]: !on }); // #331 Leuchten: freier Toggle
    else if (g.mode === "finisher") onChoose(finisherFlags(on ? "none" : fx.key));
    else if (g.mode === "gott") onChoose(gottFlags(on ? "gottStandard" : fx.key));
    else if (g.mode === "cardanim") onChoose(fx.key === "none" ? animNoneFlags() : cardAnimFlags(on ? "none" : fx.key)); // #331 einfach-exklusiv
    else if (g.mode === "bg") onChoose(bgFlags(fx.key === "none" ? "none" : (on ? "none" : fx.key))); // #331 EIN Hintergrund-Effekt
  };

  return (
    <>
      {/* #shopB STICKY: Kategorie-Tabs + Bühne + Aktion floaten oben — beim Scrollen der Liste bleibt die Vorschau sichtbar. */}
      <div className="sticky z-[15] -mx-5 sm:-mx-6 px-5 sm:px-6 pt-2 pb-2.5" style={{ top: stickyTop, background: STICKY_HEAD_BG, borderBottom: "1px solid #23222e" }}>
        <div className="flex gap-1.5 mb-2.5">
          {FX_GROUPS.map((g) => {
            const on = g.key === sel.group;
            return (
              <button key={g.key} onClick={() => pickCat(g.key)}
                className="grow basis-auto py-1.5 px-2.5 whitespace-nowrap rounded-lg text-[11px] font-extrabold transition-colors"
                style={{ background: on ? "#241f38" : "#14131c", border: `1px solid ${on ? "#9b82f0" : "#2a2836"}`, color: on ? "#e9e4ff" : "#9a97ab", boxShadow: on ? "0 0 0 1px #9b82f0" : undefined }}>
                {TAB_LABEL[g.key]}
              </button>
            );
          })}
        </div>
        <FxStage fx={selFx} group={selGroup} p={p} active={isActive(selGroup, selFx)} onChoose={onChoose} onBuyFx={onBuyFx} options={options} />
      </div>

      {/* #shopB Vertikale Liste der AKTIVEN Kategorie (scrollt unter der Bühne). Tippen → Bühne; Doppeltippen → umschalten. */}
      <div className="mt-3">
        <div className={EYEBROW} style={{ color: "#9a97ab" }}>
          {selGroup.title}
          <span className="flex-1 h-px" style={{ background: "#2a2836" }} />
          <span className="normal-case tracking-normal font-semibold text-[10px]" style={{ color: "#6d6a80" }}>{selGroup.hint}</span>
        </div>
        <div className="flex flex-col gap-2">
          {selItems.map((fx) => (
            <FxRow key={fx.key} fx={fx}
              selected={sel.key === fx.key}
              owned={fx.standard || fx.alwaysOwned || globalFxOwned(p, fx)}
              active={isActive(selGroup, fx)}
              onPick={() => setSel({ group: selGroup.key, key: fx.key })}
              onToggle={() => toggleFx(selGroup, fx)} />
          ))}
        </div>
      </div>

      <p className="text-[11px] mt-4 leading-snug pt-3" style={{ color: "#9a97ab", borderTop: "1px solid #2a2836" }}>
        Effekte sind <b>global</b> — einmal gekauft, für alle Packs. Kategorie oben wählen, Effekt tippen → er läuft in der Bühne; dort <b>kaufen</b> bzw. <b>wählen / an-aus</b>. <b>Doppeltippen</b> in der Liste schaltet direkt um.
      </p>
    </>
  );
}

/* #shopB Bühne: die große Vorschau + kontextabhängige Aktion. Sitzt im STICKY-Kopf von FxView (Tabs + Bühne floaten
   gemeinsam oben), zeigt den gewählten Effekt als ECHTE In-Game-Vorschau (GlobalFxScenePreview, key trägt Farbmodus →
   sauberer Remount beim Wechsel) + Name/Status + Kurzbeschreibung (nur der funktionale Bezug) + Kaufen/Wählen/Toggle. */
function FxStage({ fx, group, p, active, onChoose, onBuyFx, options }) {
  const owned = fx.standard || fx.alwaysOwned || globalFxOwned(p, fx);
  // #: Effekte mit Farbmodus (Standard/Deckfarbe): Aurora + Glutfunken. deckOpt = das zugehörige Options-Flag.
  // #336: „deckglow" (Leuchten) hat KEINEN Farbmodus mehr — Glow ist immer Deckfarbe. Kein deckOpt → kein BR-Chip.
  const deckOpt = fx.key === "aurora" ? "fxAuroraDeck" : fx.key === "neonsurf" ? "fxNeonsurfDeck" : fx.key === "starfield" ? "fxStarfieldDeck" : fx.key === "cubematrix" ? "fxCubeMatrixDeck" : fx.key === "scorch" ? "fxScorchDeck" : fx.key === "blackhole" ? "fxBlackholeDeck" : fx.key === "klinge" ? "fxKlingeDeck" : fx.key === "hologridSlice" ? "fxHologridDeck"
    // #322–#326 Gottgleich-Prunk-Farbmodus (Standard-Palette ↔ Deckfarbe) je Effekt.
    : fx.key === "sonnenPuls" ? "fxSonnenPulsDeck" : fx.key === "laserFaecher" ? "fxLaserFaecherDeck" : fx.key === "prismaKaskade" ? "fxPrismaKaskadeDeck" : fx.key === "holoCube" ? "fxHoloCubeDeck" : fx.key === "supernova" ? "fxSupernovaDeck" : null;
  // #328 Skill-Effekt hat KEIN eigenes …Deck-Flag → Farbmodus kommt aus archColor (spezialSel); sonst aus deckOpt.
  const spezialSel = options?.archColor === "deck" ? "deck" : "standard";
  const deckTintOn = fx.group === "spezial" ? spezialSel === "deck" : (deckOpt ? !!options?.[deckOpt] : false);
  // #330 Farbmodus-Gate: BR-Chip „Standard/Deckfarbe" nur bei Effekten MIT Farbmodus (eigenes …Deck-Flag oder Skill-
  //   Effekt/spezial). Immer-Deckfarbe-Effekte ohne Umschalter (Karten-Anims) bleiben ohne BR-Chip.
  const hasColorMode = !!deckOpt || fx.group === "spezial";
  const canBuy = !fx.standard && !fx.alwaysOwned && canBuyGlobalFx(p, fx);
  const price = globalFxPrice(fx);
  const dpBal = Math.max(0, Math.floor(Number(p?.deckPoints) || 0));
  const actBtn = "w-full rounded-xl font-extrabold text-[12.5px] py-2.5";
  const onStyle = { background: "#123a25", color: "#54e08a", border: "1px solid #2f7a4f" };
  const offStyle = { background: "#20202c", border: "1px solid #9b82f0", color: "#e8e6ff" };

  let action;
  if (fx.standard) {
    action = <div className="w-full rounded-xl font-extrabold text-[12px] py-2.5 text-center" style={{ background: "#1c2433", color: "#7fb4ff", border: "1px solid #33507a" }}>Standard — immer aktiv, kein Kauf nötig</div>;
  } else if (!owned) {
    action = (
      <button onClick={() => { if (canBuy) onBuyFx(fx); }} disabled={!canBuy}
        className={`${actBtn} transition-opacity`}
        style={{ background: canBuy ? "#35c6e6" : "#12303a", color: "#0a1114", boxShadow: canBuy ? "0 0 16px rgba(53,198,230,.3)" : undefined, opacity: canBuy ? 1 : 0.6, cursor: canBuy ? "pointer" : "not-allowed" }}>
        Kaufen · {price} DP{!canBuy && dpBal < price ? " (zu wenig DP)" : ""}
      </button>
    );
  } else if (group.mode === "finisher") {
    const chooseBtn = <button onClick={() => onChoose(finisherFlags(fx.key))} className={actBtn} style={active ? onStyle : offStyle}>{active ? "✓ Ausgewählt" : "Als Finisher wählen"}</button>;
    // #319 Scorch: Standard-Feuer ↔ Deckfarbe (Farbrampe von Laser/Glut). #320 Schwarzes Loch: Standard blau/pink ↔
    // Deckfarbe. Andere Finisher (Standard/Klinge) haben keinen Farbmodus.
    const finDeckOpt = fx.key === "scorch" ? "fxScorchDeck" : fx.key === "blackhole" ? "fxBlackholeDeck"
      : fx.key === "klinge" ? "fxKlingeDeck" : fx.key === "hologridSlice" ? "fxHologridDeck" : null;
    const finDeckOn = finDeckOpt ? !!options?.[finDeckOpt] : false;
    action = !finDeckOpt ? chooseBtn : (
      <div className="flex flex-col gap-2">
        {chooseBtn}
        <div className="flex rounded-lg overflow-hidden self-center" style={{ border: "1px solid #33324a" }}>
          {[{ v: false, l: "Standard" }, { v: true, l: "Deckfarbe" }].map((o) => {
            const on = finDeckOn === o.v;
            return <button key={o.l} onClick={() => onChoose({ [finDeckOpt]: o.v })} className="px-3.5 py-1.5 text-[11px] font-extrabold"
              style={{ background: on ? "#211f2e" : "#16151f", color: on ? "#e8e6ff" : "#8a879a" }}>{o.l}</button>;
          })}
        </div>
      </div>
    );
  } else if (fx.key === "deckglow") {
    // #331 Leuchten: FREIER Toggle (unabhängig vom Hintergrund-Set). #336: KEINE Farbauswahl mehr — Glow ist immer
    //   Deckfarbe. Nur noch An/Aus.
    action = <button onClick={() => onChoose({ [fx.option]: !active })} className={actBtn} style={active ? onStyle : offStyle}>{active ? "✓ An — tippen zum Ausschalten" : "Einschalten"}</button>;
  } else if (group.mode === "bg") {
    // #331 Hintergrund: EIN exklusiver Effekt (Aurora/Würfel-Matrix/Glutfunken/Komet) ODER „Kein Effekt". „Als Hintergrund
    // wählen" schreibt bgFlags (genau einer an, „none" = keiner). Effekte mit Farbmodus zeigen zusätzlich Standard/Deckfarbe;
    // Würfel-Matrix zusätzlich Gefüllt/Nur Rahmen. Leuchten (deckglow) läuft NICHT hier durch (eigener Toggle-Zweig oben).
    if (fx.key === "none") {
      action = <button onClick={() => onChoose(bgFlags("none"))} className={actBtn} style={active ? onStyle : offStyle}>{active ? "✓ Aktiv — kein Hintergrund" : "Kein Hintergrund"}</button>;
    } else {
      const chooseBtn = <button onClick={() => onChoose(bgFlags(fx.key))} className={actBtn} style={active ? onStyle : offStyle}>{active ? "✓ Ausgewählt" : "Als Hintergrund wählen"}</button>;
      const wireOn = !!options?.fxCubeMatrixWire;
      action = !deckOpt ? chooseBtn : (
        <div className="flex flex-col gap-2">
          {chooseBtn}
          <div className="flex rounded-lg overflow-hidden self-center" style={{ border: "1px solid #33324a" }}>
            {[{ v: false, l: "Standard" }, { v: true, l: "Deckfarbe" }].map((o) => {
              const on = deckTintOn === o.v;
              return <button key={o.l} onClick={() => onChoose({ [deckOpt]: o.v })} className="px-3.5 py-1.5 text-[11px] font-extrabold"
                style={{ background: on ? "#211f2e" : "#16151f", color: on ? "#e8e6ff" : "#8a879a" }}>{o.l}</button>;
            })}
          </div>
          {fx.key === "cubematrix" && (
            <div className="flex flex-wrap gap-2 justify-center">
              {/* #317 Würfel-Optik: gefüllt (solide) vs. nur leuchtende Neon-Rahmen (Drahtgitter, keine Füllung). */}
              <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid #33324a" }}>
                {[{ v: false, l: "Gefüllt" }, { v: true, l: "◇ Nur Rahmen" }].map((o) => {
                  const on = wireOn === o.v;
                  return <button key={o.l} onClick={() => onChoose({ fxCubeMatrixWire: o.v })} className="px-3 py-1.5 text-[11px] font-extrabold"
                    style={{ background: on ? "#211f2e" : "#16151f", color: on ? "#e8e6ff" : "#8a879a" }}>{o.l}</button>;
                })}
              </div>
            </div>
          )}
        </div>
      );
    }
  } else if (group.mode === "gott") {
    // #322–#326 Gottgleich-Prunk (einfach-exklusiv): „Als Prunk wählen" schreibt gottFlags (genau einer an, gottStandard
    // = kein Prunk). Jeder Prunk-Effekt bietet zusätzlich Standard/Deckfarbe (deckOpt); „Gottgleich · Standard" nicht.
    const chooseBtn = <button onClick={() => onChoose(gottFlags(fx.key))} className={actBtn} style={active ? onStyle : offStyle}>{active ? "✓ Ausgewählt" : (fx.key === "gottStandard" ? "Als Standard wählen (kein Prunk)" : "Als Prunk wählen")}</button>;
    action = !deckOpt ? chooseBtn : (
      <div className="flex flex-col gap-2">
        {chooseBtn}
        <div className="flex rounded-lg overflow-hidden self-center" style={{ border: "1px solid #33324a" }}>
          {[{ v: false, l: "Standard" }, { v: true, l: "Deckfarbe" }].map((o) => {
            const on = deckTintOn === o.v;
            return <button key={o.l} onClick={() => onChoose({ [deckOpt]: o.v })} className="px-3.5 py-1.5 text-[11px] font-extrabold"
              style={{ background: on ? "#211f2e" : "#16151f", color: on ? "#e8e6ff" : "#8a879a" }}>{o.l}</button>;
          })}
        </div>
      </div>
    );
  } else if (fx.group === "spezial") {
    // #328 Skill-Effekt (immer aktiv) → KEIN „auswählen"-Button, nur die Farbwahl als Segmented-Control (schreibt archColor).
    action = (
      <div className="flex justify-center">
        <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid #33324a" }}>
          {[{ v: "standard", l: "Standard" }, { v: "deck", l: "Deckfarbe" }].map((o) => {
            const on = spezialSel === o.v;
            return <button key={o.v} onClick={() => onChoose(spezialFlags(o.v))} className="px-3.5 py-1.5 text-[11px] font-extrabold"
              style={{ background: on ? "#211f2e" : "#16151f", color: on ? "#e8e6ff" : "#8a879a" }}>{o.l}</button>;
          })}
        </div>
      </div>
    );
  } else if (group.mode === "cardanim" && fx.key === "none") {
    // #318/#331 „Keine Animation" (Aus-Zustand der einfach-exklusiven Karten-Animationen): schaltet alle ab.
    action = <button onClick={() => onChoose(animNoneFlags())} className={actBtn} style={active ? onStyle : offStyle}>{active ? "✓ Aktiv — keine Animation" : "Alle Animationen aus"}</button>;
  } else if (group.mode === "cardanim") {
    // #331 Karten-Animation ist jetzt EINFACH-EXKLUSIV (genau eine): „Als Animation wählen". Läuft immer in der
    //   Deckfarbe (kein Standard/Deckfarbe-Farbmodus). Abwählen über „Keine Animation" bzw. Doppeltippen in der Liste.
    action = <button onClick={() => onChoose(cardAnimFlags(fx.key))} className={actBtn} style={active ? onStyle : offStyle}>{active ? "✓ Ausgewählt" : "Als Animation wählen"}</button>;
  } else {
    action = <button onClick={() => onChoose({ [fx.option]: !active })} className={actBtn} style={active ? onStyle : offStyle}>{active ? "✓ An — tippen zum Ausschalten" : "Einschalten"}</button>;
  }

  return (
    <>
      {/* #shopB „Bühne für alle gleich skaliert" — feste Höhe, unabhängig vom Effekt. */}
      <div className="relative w-full rounded-xl overflow-hidden" style={{ height: "clamp(146px, 22vh, 208px)", border: "1px solid #34324a" }}>
        {/* #313: Der Key trägt den Farbmodus mit → beim Toggle Standard↔Deckfarbe remountet die Vorschau sofort
            (frischer AuroraFieldGL-/PixiStage-Canvas mit der neuen Farbe). Ohne das übernahm der Effekt-Canvas den
            Farbwechsel nicht, man musste erst weg- und zurückwechseln. Für Effekte ohne Farbmodus bleibt deckTintOn
            konstant false → Key stabil, kein unnötiger Remount. */}
        {/* #perf-shop (Plan B): key trägt NUR den Effekt (nicht den Farbmodus) → Standard↔Deckfarbe-Toggle remountet die
            Pixi-Bühne NICHT mehr (kein WebGL-Neuaufbau), sondern reicht deckTint als Live-Prop durch; die Effekte lesen
            ihn zur Laufzeit (gott: st.current · Blackhole: ctrlRef · Feld: setParams · Cube: propsRef). Effekt-Wechsel
            (anderer fx.key) remountet weiterhin, da ein anderer Effekt-Typ.
            #345-perf: Auch der Skill-Effekt („spezial") trägt den Farbmodus NICHT mehr im Key. Alle vier Archetyp-
            Renderer färben live um (FireHead: Palette je Render in stateRef, Ticker liest sie pro Frame · IonStorm/
            FrostIce: stateRef + Sync-Effekt · MossGrow: Effekt-Deps [growth,nA,nB]). Der frühere `spezial:deck/std`-Key
            remountete die GANZE Bühne bei jedem Farb-Toggle → riss FireHeads Pixi/WebGL-Context + 700 Partikel ab und
            baute sie neu auf (spürbarer Ruckler). Jetzt stabiler Key → deckTint fließt als Live-Prop, kein Remount. */}
        <GlobalFxScenePreview key={fx.key} fx={fx} deckTint={deckTintOn} sun={false} wire={!!options?.fxCubeMatrixWire} />
        {/* #330 Verbindliches 4-Ecken-Template — hier zentral, EINMAL. Scenes bringen KEIN eigenes Chrome mehr mit.
            TL: Effekt-Name · TR: AKTIV (grün) / Preis (Rarity-Farbe) · BR: Standard/Deckfarbe (nur mit Farbmodus) ·
            BL: leer — reservierter Ausnahme-Slot (aktuell nur Deck-Glow zeichnet dort „mit/ohne" im PanelChip-Design). */}
        <PanelChip corner="tl">{fx.name}</PanelChip>
        {active
          ? <PanelChip corner="tr" style={{ background: "#123a25", color: "#54e08a", border: "1px solid #2f7a4f" }}>AKTIV</PanelChip>
          : !owned ? <PanelChip corner="tr" style={{ color: rarityTint(fx), border: `1px solid ${rarityTint(fx)}66` }}>{price} DP</PanelChip> : null}
        {hasColorMode && <PanelChip corner="br">{deckTintOn ? "Deckfarbe" : "Standard"}</PanelChip>}
      </div>
      {/* #shopB Kurzbeschreibung: nur der funktionale Bezug (was der Effekt tut / worauf er reagiert). */}
      <div className="text-[10.5px] leading-snug mt-1.5 mb-2 text-center" style={{ color: "#9a97ab", minHeight: 20 }}>{shortDesc(fx, group)}</div>
      {action}
    </>
  );
}

/* #farbsystem: Rarity-Farbe je Effekt-Chip (linker Farbbalken) NACH PREIS-STUFE — das neue, einheitliche System.
   Grau = Default/„nichts" (Standard/Kein Feld-Effekt/gottStandard, ohne Preis) · Grün 10 · Blau 20 · Lila 30 ·
   Legendär Gelb 40. Der Preis bestimmt die Farbe → die Rarity ist auf einen Blick lesbar, auch vor dem Kauf. */
const RARITY_COLOR = { default: "#6b6880", 10: "#46d17f", 20: "#4a9dff", 30: "#a575ff", 40: "#f5c542" };
const rarityTint = (fx) => RARITY_COLOR[globalFxPrice(fx)] || RARITY_COLOR.default;

/* #fx-floater: Text-Chip einer Kategorie-Reihe (horizontal wischbar) — KEIN Grafik-Icon. Linker Signatur-Farbbalken
   + Name + Status (aktiv = grün · kaufbar = Preis gold · sonst „im Besitz"). Die echte Optik zeigt der Floater oben;
   der Chip ist ein reiner Wähler. Tippen wählt den Effekt. */
/* #shopB Effekt-ZEILE (vertikale Liste, full-width) — Signatur-Farbbalken (Rarity) + Name + Status (aktiv/Preis/Besitz).
   Tippen wählt den Effekt in die Bühne (onPick), Doppeltippen schaltet direkt um (onToggle). */
function FxRow({ fx, selected, owned, active, onPick, onToggle }) {
  const tint = rarityTint(fx); // #farbsystem: Rarity-Farbe nach Preis-Stufe (grau/grün/blau/lila/gelb)
  const status = active ? { c: "#54e08a", label: "aktiv", dot: "#54e08a" }
    : !owned ? { c: tint, label: `${globalFxPrice(fx)} DP`, dot: tint } // Preis in der Rarity-Farbe
    : { c: "#6d6a80", label: "im Besitz", dot: null };
  // Doppel-TIPP/-Klick SCHALTET UM (Touch-sicher über eigene Zeitmessung: zwei Taps < 320 ms). Einzeltipp wählt.
  const lastTap = useRef(0);
  const handleTap = () => {
    onPick();
    const now = Date.now();
    if (now - lastTap.current < 320) { lastTap.current = 0; onToggle && onToggle(); }
    else lastTap.current = now;
  };
  return (
    <button type="button" onClick={handleTap} title={active ? "Doppeltippen: abwählen" : owned ? "Doppeltippen: auswählen" : undefined}
      className="relative w-full overflow-hidden rounded-xl text-left transition-transform active:scale-[.99] flex items-center gap-3"
      style={{ padding: "11px 13px", background: selected ? "#211f2e" : "#14131c",
        border: `1px solid ${selected ? "#9b82f0" : tint + "55"}`,
        boxShadow: selected ? "0 0 0 1px #9b82f0" : undefined }}>
      <span aria-hidden="true" className="absolute left-0 top-0 bottom-0" style={{ width: 4, background: tint, opacity: owned ? 1 : 0.85 }} />
      <span className="flex-1 min-w-0 text-[13px] font-extrabold leading-tight truncate" style={{ color: selected ? "#e8e6ff" : owned ? "#e3e1ec" : "#7d7a8b" }}>{fx.name}</span>
      <span className="flex items-center gap-1.5 text-[10px] font-bold shrink-0" style={{ color: status.c }}>
        {status.dot && <span className="rounded-full shrink-0" style={{ width: 7, height: 7, background: status.dot, boxShadow: `0 0 6px ${status.dot}` }} />}
        {status.label}
      </span>
    </button>
  );
}
