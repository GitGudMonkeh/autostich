import { useState, useRef, useEffect, lazy, Suspense } from "react";
import { createPortal } from "react-dom";
import { useEscape } from "./useEscape.js";
import { MODAL_CARD, TopHairline, STICKY_HEAD_BG, HAIRLINE } from "./modalStyle.jsx";
import {
  THEMES,
  packState, packPrice, packUnlock, canBuyPack, buyPack, hasBattlefield,
  GLOBAL_FX, globalFxPrice, globalFxOwned, canBuyGlobalFx, buyGlobalFx,
} from "../game/themes.js";
import { deckAssets, battlefieldAssets } from "./cosmeticAssets.js";
import { SliceFx, FieldFxLayer, FX_RENDERER, KLINGE_TUNE } from "./Battlefield.jsx";
// Pixi-Umbau: GPU-Emitter für die Feld-Effekt-Vorschau (lazy → Pixi bleibt aus dem main-Bundle; Mount ist env-gegatet).
import { PIXI_FIELD_KEYS } from "./fx/fieldFxKeys.js"; // pixi-frei: welche Feld-Effekte im Showcase auf die GPU-Bühne gehen
import AuroraFieldGL from "./fx/AuroraFieldGL.jsx"; // Aurora-Vorschau als eigene WebGL-Canvas (nicht Pixi)
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
import { suitColor, SUIT_ORDER } from "../game/constants.js";
import { clamp } from "../game/deck.js"; // #: Serien-Kopplung des Brennstrahl-Loops (leiser Start → lauter/heißer)
import { audio } from "./audio.js"; // Showcase-Panel spielt den Klinge-Sound mit

// Standard-Backdrop für alle Effekt-/Finisher-Showcases: das Genesis-Battlefield (bf_onboarding), einheitlich neutral.
const SHOWCASE_BF = "bf_onboarding";

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
// Showcase-Backdrop + Demo-Deckfarben PRO Feldeffekt — so sieht man später am Standard/Deckfarbe-Toggle den Unterschied:
// Aurora auf Moonwhale (kühles Cyan/Blau), Glutfunken auf Feuer (rotes Deck). Andere Effekte: Standard-Backdrop/-Farbe.
const PREVIEW_LOOK = {
  aurora: { bf: "bf_wale",  a1: "#35d0ff", a2: "#7fdcff" }, // Moonwhale (kühl) — kontrastiert mit dem grünen Aurora-Standard
  // #313-Folge: die Glutfunken-Showcase-Deckfarbe muss sich DEUTLICH vom warmen Standard-Feuer abheben, sonst wirkt der
  // Standard↔Deckfarbe-Toggle wirkungslos. Ein rotes Feuer-Deck ist zu fire-nah → jetzt Kosmos (Magenta) auf dunklem
  // Feld: Standard = oranges Feuer, Deckfarbe = Magenta — beide auf dem dunklen Kosmos-Feld klar sichtbar.
  embers: { bf: "bf_kosmos", a1: "#ff4dcb", a2: "#7b5cff" },
  // #311: Sternenfeld ist von Haus aus weiß-blau. Damit die Deck-Demo mit dem Weiß-Blau KONTRASTIERT (Toggle sichtbar)
  // UND nicht mit dem Hintergrund clasht, läuft es auf dem NEUTRALEN Genesis-Feld (statt Kosmos-Magenta) mit einer
  // warmen Bernstein-Deckfarbe — warm auf neutral-dunkel passt zusammen und hebt sich klar vom kühlen Standard ab.
  // #311: Deckfarbe-Showcase auf dem gelben „Goldener Drache"-Deck (bf_drache, a1=#ffcf5a Gold/Gelb) → hebt sich klar
  // vom weiß-blauen Standard-Sternenfeld ab, damit der Standard↔Deckfarbe-Toggle sichtbar ist.
  starfield: { bf: "bf_drache", a1: "#ffcf5a", a2: "#ff5a2a" },
  // Sieg-Finisher — Deckfarbe-Beispiel je Effekt: Deck-Beispielfarben KOMPLEMENTÄR zur Standard-Palette + ein dazu
  // passender Backdrop, der NUR im Deckfarbe-Modus gezeigt wird (Standard-Modus bleibt auf dem neutralen SHOWCASE_BF).
  klinge:    { bf: "bf_drache",    a1: "#ffb43d", a2: "#ff7a2a" }, // Standard = kühles Stahlweiß → Deckfarbe warm-gold auf Drachen-Feld
  scorch:    { bf: "bf_wale",      a1: "#35d0ff", a2: "#6ad0ff" }, // Standard = warmes Feuer → Deckfarbe kühl-cyan auf Moonwhale-Feld
  hologrid:  { bf: "bf_blitz",     a1: "#3ad8ff", a2: "#6a8cff" }, // Standard = cyan/magenta → Deckfarbe cyan/blau auf Blitz-Feld (kühl-elektrisch, harmoniert mit dem Hologrid-Look)
  // #320 Schwarzes Loch: Standard = blau→pink (im Scene-Code fest); Deckfarbe-Showcase = warmes Gold/Grün auf dunklem
  // Kosmos-Feld, damit der Standard↔Deckfarbe-Toggle (kühl-neon ↔ warm) deutlich sichtbar ist.
  blackhole: { bf: "bf_kosmos",    a1: "#ffd15a", a2: "#57e08a" },
  // #318 Karten-Animationen: neutrales Feld, Deck-Dual mit klarem Farbverlauf (Blau→Violett), damit der diagonale
  // Deck-Verlauf des Kantenglühens sichtbar ist. Karten-Animationen laufen IMMER in der Deckfarbe (kein Standard-Toggle).
  edgeglow: { bf: SHOWCASE_BF, a1: "#5a8ade", a2: "#9b82f0" },
  // Holo-Sweep: dunkles neutrales Feld, Deck-Dual als Basis unter dem Regenbogen (prismatik mischt beides).
  holo: { bf: SHOWCASE_BF, a1: "#5a8ade", a2: "#9b82f0" },
  // Glitch: dunkles Feld, Deck-Dual (der Glitch tönt selbst in ghostA/ghostB/Suit).
  glitch: { bf: SHOWCASE_BF, a1: "#5a8ade", a2: "#9b82f0" },
  // #317 Cube-Matrix: Standard = Cyan→Magenta; Deckfarbe-Showcase auf dem grünen Neon-Arcade-Deck
  // (a1=#39e64d Grün, a2=#38c6e0 Cyan auf bf_arcade), damit der Standard↔Deckfarbe-Toggle klar sichtbar ist.
  cubematrix: { bf: "bf_arcade", a1: "#39e64d", a2: "#38c6e0" },
  // #322–#326 Gottgleich-Prunk: jeder Prunk-Showcase bekommt EIGENEN Backdrop + EIGENE Deckfarbe fürs Deckfarbe-Beispiel,
  // damit der Standard↔Deckfarbe-Toggle je Effekt klar sichtbar ist und die 5 Showcases sich optisch unterscheiden.
  // Deckfarbe jeweils KOMPLEMENTÄR zur Standard-Palette des Effekts (kühl↔warm etc.), Backdrop je Effekt verschieden.
  sonnenPuls:    { bf: "bf_gottgleich", a1: "#35d0ff", a2: "#6ad0ff" }, // Standard warm-pink/coral → Deckfarbe kühl-cyan auf Gottgleich-Feld
  laserFaecher:  { bf: "bf_blitz",      a1: "#ff9a3c", a2: "#ffd15a" }, // Standard cyan-Laser → Deckfarbe warm-amber auf Blitz-Feld
  prismaKaskade: { bf: "bf_polarlicht", a1: "#ff4dcb", a2: "#7b5cff" }, // Standard prismatisch → Deckfarbe kräftig magenta/violett auf Polarlicht-Feld
  holoCube:      { bf: "bf_geometrie",  a1: "#39e64d", a2: "#8ee06a" }, // Standard holo-cyan → Deckfarbe grün/lime auf Geometrie-Feld
  supernova:     { bf: "bf_spacedog",   a1: "#5ff6ff", a2: "#7f9bff" }, // Standard gold/gelb → Deckfarbe kühl-cyan/violett auf Weltraum-Feld
  gottStandard:  { bf: "bf_sonne",      a1: "#cbd3ff", a2: "#cbd3ff" }, // Standard-Prunk (nur Ansage) auf Sonnen-Feld
};
// #318 Preview-Key → CardFxStage-Layer-Flag (welcher Layer in der Showcase gezeigt wird).
const ANIM_LAYER = { edgeglow: "edgeGlow", holo: "holo", glitch: "glitch" };

// „Standard"-Pack (UI-seitig): aktiviert wieder das Grund-Deck/-Battlefield. kind:"std" → immer im Besitz.
const STD_PACK = { id: "default", name: "Standard", kind: "std", a1: "#8a7de0", deckId: "default", bfId: "default", els: ["deck", "bf"] };
// #307/#Shop-Reorg: eigene Kategorien. „Packs" = Standard + Kauf-Packs, nach DP-Preis aufsteigend (billig oben, teuer
// unten; Standard immer zuoberst). „Challenges" = die freischaltbaren cond-Packs (#303), eigene Kategorie ganz separat.
const PACKS_TAB = [STD_PACK, ...THEMES.filter((t) => t.kind === "buy").slice().sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0))];
const CHALLENGES_TAB = THEMES.filter((t) => t.kind === "cond");
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
const SCORCH = { key: "scorch", name: "Scorch", group: "finisher", preview: "scorch", ownKey: "fx:scorch", price: 20,
  desc: "Ein Laser schießt einmalig aus zufälliger Richtung in die Gegnerkarte — dann verglüht sie organisch: eine zerklüftete Brennkante frisst sich mit glühendem Rand über die Karte, während weiche Glut aufsteigt, Asche fällt und Funken sprühen. In Standard-Feuer oder in der Deckfarbe." };

/* #321 Synthetische „Hologrid-Slice"-Kachel: kaufbarer Sieg-Finisher (20 DP, ownKey fx:hologridSlice). Eine Laserlinie
   fährt achsen-parallel über die Gegnerkarte und deckt ein Nahtraster auf; danach zerfällt die Karte in ein Kachelgitter,
   dessen Stücke wegfliegen & vom Boden abprallen, während die Füllung früh zu einem reinen Hologrid-Rahmen verblasst. */
const HOLOGRID_SLICE = { key: "hologridSlice", name: "Hologrid-Slice", group: "finisher", preview: "hologrid", ownKey: "fx:hologridSlice", price: 20,
  desc: "Eine Laserlinie fährt achsen-parallel über die geschlagene Gegnerkarte und deckt dabei ein Nahtraster auf. Danach zerfällt die Karte in ein Kachelgitter: die Stücke fliegen mit Rotation weg und prallen vom Boden ab, während das Kartenbild früh verblasst, sodass nur noch der leuchtende Hologrid-Rahmen bleibt. In Standard-Cyan/Magenta oder in der Deckfarbe." };

/* #320 Synthetische „Schwarzes Loch"-Kachel: kaufbarer Sieg-Finisher (30 DP, violette Rarity, ownKey fx:blackhole). Ein
   PERSISTENTES Serien-Loch — jeder Sieg füttert es (es wächst + saugt die Gegnerkarte ein), eine Niederlage lässt es
   schrumpfen; kollabiert es bei genug Masse, folgt eine Supernova. Standard blau/pink oder in der Deckfarbe. */
const BLACKHOLE = { key: "blackhole", name: "Schwarzes Loch", group: "finisher", preview: "blackhole", ownKey: "fx:blackhole", price: 30,
  desc: "Ein persistentes Schwarzes Loch mitten im Feld, das über deine Siegesserie wächst: Jeder Sieg zieht die geschlagene Gegnerkarte spiralförmig in den Ereignishorizont und speist die rotierende Akkretionsscheibe, eine Niederlage lässt das Loch schrumpfen. Ist es groß genug gewachsen und kollabiert, zerreißt eine Supernova das Feld. In Standard blau/pink oder in der Deckfarbe." };

/* Synthetische „Gottgleich · Standard"-Kachel (kein Kauf, immer aktiv) — nur zum Vergleichen des Gottgleich-
   Siegs OHNE Prunk. Wird in der Gottgleich-Gruppe als reine Vorschau-Zeile geführt. */
const GOTT_STANDARD = { key: "gottStandard", name: "Gottgleich · Standard", group: "gott", alwaysOwned: true, preview: "gottStandard",
  desc: "Gottgleicher Sieg OHNE Prunk-Effekt — die Basis zum Vergleichen (Standard-Auswahl, kein Kauf)." };

/* #spezial Archetyp-Effekte (Hitze/Moos/Blitz/Eis): IMMER aktiv, kein Kauf — es gibt nur die Farbwahl Standard ↔
   Deckfarbe. Zwei synthetische Kacheln (einfach-exklusiv über options.archColor), beide zeigen denselben 4-Karten-
   Showcase (jeweils im maximalen Status), in der jeweiligen Farbe. */
const SPEZIAL_STANDARD = { key: "standard", name: "Standard", group: "spezial", alwaysOwned: true, preview: "spezial",
  desc: "Die vier Archetyp-Effekte (Hitze · Moos · Blitz · Eis) in ihrer festen Neon-Standardfarbe. Immer aktiv." };
const SPEZIAL_DECK = { key: "deck", name: "Deckfarbe", group: "spezial", alwaysOwned: true, preview: "spezial",
  desc: "Die vier Archetyp-Effekte in der Farbe deines aktiven Decks (Verlauf) statt der festen Neon-Palette. Immer aktiv." };

// Effekt-Gruppen des „Effekte"-Tabs. mode: "toggle" (frei kombinierbar) | "finisher" (Einfachauswahl, exklusiv,
// inkl. „Klinge" als Default). Grid-Tunnel wurde entfernt → keine Ambience-Gruppe mehr.
const FX_GROUPS = [
  // #kategorien: zwei UNABHÄNGIGE Feld-Slots (beide gleichzeitig aktivierbar) + Sieg-Finisher.
  // #318: Karten-Animationen sind wieder aktiv (Pixi-Overlay über den Karten, frei kombinierbare Dauer-Layer).
  // Gottgleich-Prunk bleibt vorerst DEAKTIVIERT (Tab entfernt); die Effekte bleiben im Code.
  // #spezial: Archetyp-Effekte (Feuer/Blitz/Eis/Pflanze) laufen MIT unter „Karten" (kein eigener Tab) — immer aktiv, nur
  //   Farbwahl Standard ↔ Deckfarbe; die zwei Kacheln stehen vorne in der Karten-Liste (fxGroupItems).
  { key: "anim",     title: "Karten-Animationen",   hint: "frei kombinierbar", mode: "toggle" }, // #318 Edge-Glow … (Overlay über den Karten)
  { key: "bgfx",     title: "Hintergrund-Effekt",   hint: "nur einer aktiv", mode: "bgfx" },   // reiner BG (Aurora …)
  { key: "bgglow",   title: "Hintergrund-Glow",     hint: "frei kombinierbar", mode: "toggle" }, // #deckglow: eigene Ebene, mit allen Effekten kombinierbar
  { key: "bgfin",    title: "Hintergrund-Finisher", hint: "nur einer aktiv", mode: "bgfin" },  // BG mit Stich-Interaktion (Glutfunken …)
  { key: "finisher", title: "Sieg-Finisher",        hint: "nur einer aktiv", mode: "finisher" },
  // #322–#326 Gottgleich-Prunk (feuert beim gottgleichen Sieg ohne Krit): einfach-exklusiv, „Gottgleich · Standard" = kein Prunk.
  { key: "gott",     title: "Gottgleich-Prunk",     hint: "nur einer aktiv", mode: "gott" },
];
/* #306 Synthetische „Kein Feld-Effekt"-Kachel (immer verfügbar, kein Kauf): der Aus-Zustand der einfach-exklusiven
   Battlefield-Ambiente-Gruppe — wählbar wie „Klinge" beim Finisher. */
const FIELD_NONE = { key: "none", name: "Kein Feld-Effekt", group: "field", preview: "none", alwaysOwned: true,
  desc: "Kein Battlefield-Ambiente — nur das Battlefield-Bild (immer verfügbar)." };
/* #318 Synthetische „Keine Animation"-Kachel (grau, immer verfügbar, kein Kauf): der Aus-Zustand der frei
   kombinierbaren Karten-Animationen. Anwählen schaltet ALLE Karten-Animationen ab (wie „Kein Feld-Effekt" beim
   Ambiente, nur dass die anim-Gruppe eine Mehrfachauswahl ist). preview „none" → schlichte Karte ohne Overlay. */
const ANIM_NONE = { key: "none", name: "Keine Animation", group: "anim", preview: "none", alwaysOwned: true,
  desc: "Keine Karten-Animation — die Karten bleiben schlicht. Anwählen schaltet alle Karten-Animationen ab (immer verfügbar)." };
// Items einer Gruppe (in Detail-Reihenfolge): GLOBAL_FX der Gruppe nach DP-Preis aufsteigend (billig oben, teuer unten);
// der synthetische „Standard"/„Kein …"/„Klinge"-Default wird vorangestellt (Gratis-Aus-Zustand).
const fxGroupItems = (group) => {
  const list = GLOBAL_FX.filter((f) => f.group === group && !f.hidden).slice().sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0)); // #: `hidden` blendet Effekte im Shop aus (bleiben funktional)
  if (group === "finisher") return [FIN_STANDARD, KLINGE, SCORCH, HOLOGRID_SLICE, BLACKHOLE, ...list]; // „Standard" (Default) voran, dann Klinge · Scorch · Hologrid-Slice · Schwarzes Loch
  if (group === "bgfx" || group === "bgfin") return [FIELD_NONE, ...list]; // „Kein Effekt" (Default) voran
  if (group === "anim") return [SPEZIAL_STANDARD, SPEZIAL_DECK, ANIM_NONE, ...list]; // #spezial Archetyp-Farbwahl voran, dann „Keine Animation" + Karten-Anims
  if (group === "gott") return [GOTT_STANDARD, ...list]; // #322 „Gottgleich · Standard" (kein Prunk) voran, dann die Prunk-Effekte nach Preis
  return list;
};
// #shopB: orderFxItems/FX_STD_KEY entfallen — Variante B zeigt je Kategorie eine STABILE vertikale Liste
// (fxGroupItems: „Kein/Standard" voran, dann nach Preis), kein „aktiven an die erste Stelle rücken" mehr.

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
/* #306 Battlefield-Ambiente einfach-exklusiv (genau EINS aktiv, oder „none"). Datengetrieben aus der „field"-Gruppe:
   fieldFxFlags(key) schreibt alle Feld-Optionen in einem Rutsch (genau eine true, „none" = alle false). */
// #kategorien: zwei getrennte, UNABHÄNGIGE Feld-Slots. bgFxFlags/bgFinFlags schreiben NUR die Optionen ihrer
// eigenen Gruppe (genau eine true, „none" = alle false) → Aurora (bgfx) und Glutfunken (bgfin) schließen sich NICHT aus.
const BGFX_FX  = GLOBAL_FX.filter((f) => f.group === "bgfx");
const BGFIN_FX = GLOBAL_FX.filter((f) => f.group === "bgfin");
const bgFxFlags  = (key) => Object.fromEntries(BGFX_FX.map((f) => [f.option, f.key === key]));
const bgFinFlags = (key) => Object.fromEntries(BGFIN_FX.map((f) => [f.option, f.key === key]));
const bgFxSelOf  = (options) => { for (const f of BGFX_FX)  if (options?.[f.option]) return f.key; return "none"; };
const bgFinSelOf = (options) => { for (const f of BGFIN_FX) if (options?.[f.option]) return f.key; return "none"; };
/* Gottgleich-Prunk einfach-exklusiv (genau EINER aktiv, oder „gottStandard" = kein Prunk). Datengetrieben aus der
   „gott"-Gruppe: gottFlags(key) schreibt alle Prunk-Optionen in einem Rutsch (genau eine true, „gottStandard" = alle false). */
const GOTT_FX = GLOBAL_FX.filter((f) => f.group === "gott");
const gottFlags = (key) => Object.fromEntries(GOTT_FX.map((f) => [f.option, f.key === key]));
const gottSelOf = (options) => { for (const f of GOTT_FX) if (options?.[f.option]) return f.key; return "gottStandard"; };
/* #318 Karten-Animationen (frei kombinierbar, mode "toggle"). animAnyOn = ist irgendeine Animation an?
   animNoneFlags = schaltet in einem Rutsch ALLE Animationen aus (für die „Keine Animation"-Kachel). */
const ANIM_FX = GLOBAL_FX.filter((f) => f.group === "anim");
const animAnyOn = (options) => ANIM_FX.some((f) => !!options?.[f.option]);
const animNoneFlags = () => Object.fromEntries(ANIM_FX.map((f) => [f.option, false]));

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
const KLINGE_DIR_LABEL = { left: "Links", right: "Rechts", top: "Oben", z: "Z-Schnitt" };
const kMultLabel = (m) => "×" + String(m).replace(".", ",");           // 1.25 → „×1,25"
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
      {/* #312 Stufen-Label: zeigt, WELCHE Serienschwelle (Multiplikator) + Schnittrichtung gerade demonstriert wird.
          #: unten-rechts, damit das „(aktiv)"-Ausgerüstet-Symbol oben-rechts es nicht verdeckt. */}
      {/* #farbsystem: Badge im selben Pill-Design wie die Glutfunken-Tier-Anzeige (eckig, heller Rand, „Label"-Präfix
          in 70 % Deckkraft) — hier „Serie" statt „Tier", Inhalt bleibt Multiplikator + Schnittrichtung. */}
      <div className="absolute bottom-2 right-2 flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-extrabold"
        style={{ background: "#0b0a16cc", border: "1px solid #ffffff22", color: deckTint ? (look?.a1 || "#8fd8ff") : (kstep.d === "z" ? "#8fd8ff" : "#cfe0ff") }}>
        <span className="opacity-70">Serie</span> {kMultLabel(kstep.m)} · {KLINGE_DIR_LABEL[kstep.d]}
      </div>
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
      <div className="absolute bottom-2 right-2 flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-extrabold"
        style={{ background: "#0b0a16cc", border: "1px solid #ffffff22", color: deckTint ? (look?.a1 || "#8fd8ff") : "#ffb27a" }}>
        <span className="opacity-70">Finisher</span> Scorch
      </div>
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
      <div className="absolute bottom-2 right-2 flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-extrabold"
        style={{ background: "#0b0a16cc", border: "1px solid #ffffff22", color: deckTint ? (look?.a1 || "#7ee0ff") : "#7ee0ff" }}>
        <span className="opacity-70">Finisher</span> Hologrid-Slice
      </div>
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
    const seq = [
      ...Array.from({ length: 22 }, () => ({ kind: "win" })),
      ...Array.from({ length: 12 }, () => ({ kind: "loss" })),
    ];
    let id = 0, i = 0, alive = true; const timers = [];
    // #320: eingesogene Karten = wechselnde „verlorene" Karten → echte Werte (1..10) UND wechselnde Suit-Farben, damit die
    //   Vorschau die neue In-Game-Vielfalt zeigt (nicht mehr alle in einer Farbe). SUIT_ORDER-Reihenfolge R/B/G/Y.
    const nums = [10, 7, 4, 9, 2, 8, 5, 6];
    const cols = SUIT_ORDER.map((s) => suitColor(s));
    const tick = () => {
      if (!alive) return;
      const step = seq[i % seq.length]; i++; id++;
      setPulse(step.kind === "win" ? { id, kind: "win", num: nums[id % nums.length], col: cols[id % cols.length] } : { id, kind: "loss" });
      timers.push(setTimeout(tick, step.kind === "win" ? 640 : 340));
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
      <BlackholeFx active pulse={pulse} color={c1} color2={c2} scale={1} panelRef={panelRef} oppRef={oppRef} />
      <div className="absolute bottom-2 right-2 flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-extrabold"
        style={{ background: "#0b0a16cc", border: "1px solid #ffffff22", color: deckTint ? "#8fd8ff" : "#9fc2ff" }}>
        <span className="opacity-70">Finisher</span> Schwarzes Loch
      </div>
    </div>
  );
}

/* #322–#326 Gottgleich-Prunk-Vorschau (PIXI): board-weite Bühne (panelRef) mit unsichtbarem Karten-Anker (cardRef) im
   Zentrum; die übergebene Pixi-Komponente zeichnet den Prunk darüber und feuert im Loop (loop=true → eigenes Re-Fire).
   deckTint schaltet Standard-Palette ↔ Deckfarbe. Lazy (Suspense) → Pixi lädt erst, wenn ein gott-Preview gerendert wird.
   Die geteilte Chrome-„GOTTGLEICH"-Ansage poppt SYNCHRON zum Effekt-Loop (onFire des Prunks → key-Wechsel → Pop neu),
   zentriert, wie in-game (großer Stich → Ansage + Prunk gemeinsam). Fx=null („Gottgleich · Standard") → NUR die Ansage
   (kein Prunk), per Timer geloopt — mehr Animation hat der Standard bewusst nicht. */
function GottScene({ Fx = null, deckTint = false, label = "Gottgleich", tint = "#ff8fc4", cycleMs = 2200, look = null }) {
  const panelRef = useRef(null);
  const cardRef = useRef(null);
  // #gott-showcase: jeder Prunk-Showcase hat seinen EIGENEN Backdrop (look.bf) + seine EIGENE Deckfarbe (look.a1/a2)
  // fürs Deckfarbe-Beispiel — sonst fällt kein Backdrop-Fallback auf das gemeinsame SHOWCASE_BF zurück.
  const bf = battlefieldAssets(look?.bf || SHOWCASE_BF);
  const deckColor = look?.a1 || "#35e0ff";
  const deckColor2 = look?.a2 || "#ff5db1";
  // #perf: Auf Mobile die Vorschau im lite-Pfad laufen lassen (weniger DPR/FPS/Partikel) — dieselbe Stufe wie in-game
  // auf pointer:coarse. Ohne das lief der Loop-Showcase auf dem Handy in voller Auflösung → Jank.
  const isMobile = useIsMobile();
  const [annKey, setAnnKey] = useState(0);
  const pop = () => setAnnKey((k) => k + 1);
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
          <Fx panelRef={panelRef} cardRef={cardRef} trigger={1} loop deckTint={deckTint} deckColor={deckColor} deckColor2={deckColor2} lite={isMobile} onFire={pop} />
        </Suspense>
      )}
      {/* #gott: dieselbe Synthwave-Chrome-GOTTGLEICH-Ansage wie In-Game — mittig, etwas kleiner, poppt je Fire synchron
          rein (key={annKey} → Neustart der Pop-Animation). idKey am Key → eindeutige Gradient-/Mask-IDs je Pop. */}
      <GottChromeWord key={annKey} text="Gottgleich" gBig={isMobile ? 9 : 11} gMid={6} sheen="once" idKey={`sc${annKey}`}
        style={{ left: "50%", top: "50%", width: "62%", zIndex: 20, animation: "ws-gott-word 1.5s ease-out both" }} />
      <div className="absolute bottom-2 right-2 flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-extrabold"
        style={{ background: "#0b0a16cc", border: "1px solid #ffffff22", color: tint }}>
        <span className="opacity-70">Prunk</span> {label}
      </div>
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
      <div className="absolute bottom-2 right-2 flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-extrabold"
        style={{ background: "#0b0a16cc", border: "1px solid #ffffff22", color: "#cfe0ff" }}>
        Wegflug
      </div>
    </div>
  );
}

// #317 Cube-Matrix-Showcase: das ECHTE In-Game-Modul (CubeMatrixField) über dem neutralen BF-Bild. Reagiert live auf
// die laufende (Menü-)Musik. deckTint → Deckfarbe statt Standard-Cyan/Magenta. Nur Preview/Dev (wie die anderen GL-FX).
function CubeMatrixPreview({ deckTint = false, sun = true, wire = false }) {
  const look = PREVIEW_LOOK.cubematrix;
  const bf = battlefieldAssets(look.bf);
  const isMobile = useIsMobile();
  const src = bf ? (isMobile ? bf.mobile : bf.desktop) : null;
  const on = import.meta.env.VITE_PREVIEW === "1" || import.meta.env.DEV;
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
function SpezialScene({ deckTint = false }) {
  const panelRef = useRef(null);
  const fireCardRef = useRef(null);
  const bf = battlefieldAssets(SHOWCASE_BF);
  const DC = SPEZIAL_DECK_A, DC2 = SPEZIAL_DECK_B;
  const CARDS = [
    { key: "feuer", label: "Feuer", ref: fireCardRef, fx: null },
    { key: "blitz", label: "Blitz", ref: null, fx: <CardIonStorm active color={deckTint ? DC : "#5ec8f0"} /> },
    { key: "eis", label: "Eis", ref: null, fx: <FrostIce mass={12} deckTint={deckTint} deckColor={DC} deckColor2={DC2} /> },
    { key: "pflanze", label: "Pflanze", ref: null, fx: <MossGrow growth={8} deckTint={deckTint} deckColor={DC} deckColor2={DC2} /> },
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
            <span className="text-[9px] font-extrabold uppercase tracking-wide" style={{ color: "#cbd3ff" }}>{c.label}</span>
          </div>
        ))}
      </div>
      {/* Hitze = FireHead (Panel-Overlay über der ersten Karte); Flammen loder nach oben in den Freiraum über den Karten. */}
      <Suspense fallback={null}><FireHead heat={1} panelRef={panelRef} cardRef={fireCardRef} deckTint={deckTint} deckColor={DC} deckColor2={DC2} /></Suspense>
      <span className="absolute right-2 bottom-1.5 text-[9px] font-extrabold px-1.5 py-0.5 rounded" style={{ background: "#0b0a16cc", border: "1px solid #ffffff1f", color: deckTint ? "#8fd8ff" : "#cbd3ff" }}>{deckTint ? "Deckfarbe" : "Standard"}</span>
    </div>
  );
}

/* #deckglow 4-BG-Showcase: rotiert durch verschieden FARBIGE Battlefields und zeigt jeden erst OHNE, dann MIT dem
   Deck-Glow (weiche Überblendung). Deckfarbe-Modus → jedes BG glüht in der Farbe seines Packs (a1); Standard → festes
   Neon. Genau EINE WebGL-Canvas (pro BG frisch gekeyt), das darunterliegende <img> ist die „Ohne"-Referenz. */
const DECKGLOW_BGS = [
  { bf: "bf_eis", a1: "#46c6ff", name: "Eis" },
  { bf: "bf_samurai", a1: "#ff3a5e", name: "Samurai" },
  { bf: "bf_kosmos", a1: "#ff4dcb", name: "Schwarzes Loch" },
  { bf: "bf_drache", a1: "#ffcf5a", name: "Drache" },
  { bf: "bf_polarlicht", a1: "#7cc6ff", name: "Polarlicht" },
];
function DeckGlowScene({ deckTint = false }) {
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
  const accent = cur.a1; // Akzentfarbe des Labels = die Eigenfarbe des BGs (nicht relevant für den Effekt selbst)
  return (
    <div className="relative w-full h-full overflow-hidden rounded-lg" style={{ background: "#0b0a16" }}>
      {src && <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover" />}
      {bf && <DeckGlowFieldGL srcDesktop={bf.desktop} srcMobile={bf.mobile} deckColor={cur.a1} deckTint={deckTint} on={on} animate />}
      <div className="absolute inset-x-0 top-0 h-14" style={{ background: "linear-gradient(180deg,#0b0a1699,transparent)" }} />
      <div className="absolute left-2 bottom-2 text-[10px] font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1.5"
        style={{ background: "#0b0a16cc", border: "1px solid #ffffff22", color: on ? "#e8ecff" : "#9aa0c4" }}>
        <span style={{ opacity: 0.7 }}>{cur.name}</span>
        <span style={{ color: on ? accent : "#9aa0c4" }}>{on ? "· mit Deck-Glow" : "· ohne"}</span>
      </div>
      <span className="absolute right-2 bottom-2 text-[9px] font-extrabold px-1.5 py-0.5 rounded"
        style={{ background: "#0b0a16cc", border: "1px solid #ffffff1f", color: deckTint ? "#8fd8ff" : "#cbd3ff" }}>{deckTint ? "Deckfarbe" : "Eigenfarbe"}</span>
    </div>
  );
}

// Große In-Game-Vorschau eines Effekts im Kauffenster. Karten-Animationen → Karte/BF-Demo; Finisher/Krit →
// echte In-Game-Komponente; Gottgleich (inkl. Standard) → das komplette Ereignis nachgespielt.
function GlobalFxScenePreview({ fx, deckTint = false, sun = true, wire = false }) {
  // #kategorien: Hintergrund-Effekt (Aurora) / Hintergrund-Finisher (Glutfunken) / „Kein Feld-Effekt": echte
  // In-Game-Komponente (FieldFxLayer bzw. GPU-Emitter) über dem BF-Bild.
  if (fx.preview === "cubematrix") return <CubeMatrixPreview deckTint={deckTint} sun={sun} wire={wire} />; // #317 musik-reaktives Würfelfeld
  if (["aurora", "embers", "starfield", "none"].includes(fx.preview)) return <FieldFxPreview effect={fx.preview} deckTint={deckTint} />;
  if (fx.preview === "deckglow") return <DeckGlowScene deckTint={deckTint} />; // #deckglow: mehrere farbige BGs, je erst ohne, dann mit
  if (ANIM_LAYER[fx.preview]) return <CardAnimPreview anim={fx.preview} />; // #318 Karten-Animation über echter Vorschau-Karte
  if (fx.preview === "gottStandard") return <GottScene Fx={null} label="Standard" tint="#cbd3ff" look={PREVIEW_LOOK.gottStandard} />; // #322 „Gottgleich · Standard" = nur der Chrome-Schriftzug (kein Prunk)
  if (fx.preview === "standard") return <StandardFinisherScene />;
  if (fx.preview === "klinge") return <FinisherScene variant={fx.preview} deckTint={deckTint} look={PREVIEW_LOOK.klinge} />;
  if (fx.preview === "scorch") return <ScorchScene deckTint={deckTint} look={PREVIEW_LOOK.scorch} />; // #319 Scorch-Finisher (Laser + organischer Burn)
  if (fx.preview === "hologrid") return <HologridScene deckTint={deckTint} look={PREVIEW_LOOK.hologrid} />; // #321 Hologrid-Slice-Finisher (Pixi)
  if (fx.preview === "spezial") return <SpezialScene deckTint={fx.key === "deck"} />; // #spezial 4-Karten-Showcase (Hitze/Moos/Blitz/Eis) — Farbmodus aus dem Tile-Key
  if (fx.preview === "blackhole") return <BlackholeScene deckTint={deckTint} />; // #320 Schwarzes-Loch-Finisher (persistentes Serien-Loch)
  // #gott-showcase: je Effekt eigener Backdrop + eigene Deckfarbe (look) fürs Deckfarbe-Beispiel; Label-Tint im
  // Deckfarbe-Modus = die jeweilige Deck-Primärfarbe (look.a1), damit die Kachel farblich zum gezeigten Prunk passt.
  if (fx.preview === "sonnenPuls") return <GottScene Fx={SonnenPulsPixi} deckTint={deckTint} label="Sonnen-Puls" tint={deckTint ? PREVIEW_LOOK.sonnenPuls.a1 : "#ff8fc4"} look={PREVIEW_LOOK.sonnenPuls} />; // #322 (Pixi)
  if (fx.preview === "laserFaecher") return <GottScene Fx={LaserFaecherPixi} deckTint={deckTint} label="Laser-Fächer" tint={deckTint ? PREVIEW_LOOK.laserFaecher.a1 : "#5ff6ff"} look={PREVIEW_LOOK.laserFaecher} />; // #323 (Pixi)
  if (fx.preview === "prismaKaskade") return <GottScene Fx={PrismaKaskadePixi} deckTint={deckTint} label="Prisma-Kaskade" tint={deckTint ? PREVIEW_LOOK.prismaKaskade.a1 : "#7ee0ff"} look={PREVIEW_LOOK.prismaKaskade} />; // #324 (Pixi)
  if (fx.preview === "holoCube") return <GottScene Fx={HoloCubePixi} deckTint={deckTint} label="Holo-Würfel" tint={deckTint ? PREVIEW_LOOK.holoCube.a1 : "#7ff0ff"} look={PREVIEW_LOOK.holoCube} />; // #325 (Pixi)
  if (fx.preview === "supernova") return <GottScene Fx={SupernovaPixi} deckTint={deckTint} label="Supernova" tint={deckTint ? PREVIEW_LOOK.supernova.a1 : "#ffd24a"} look={PREVIEW_LOOK.supernova} />; // #326 (Pixi)
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
// #: Glutfunken sind an den Lauf-Score gekoppelt → die Vorschau rampt einen Demo-Score durch mehrere Stufen und blendet
// eine Score-Anzeige ein, damit man sieht, wie die Fontänen bei welchem Score aussehen (mehr/höher je Score, bis 500k).
const EMBER_DEMO_SCORES = [40000, 150000, 320000, 500000];
// Hit-Tier-Leiter für die Glutfunken-Eskalations-Vorschau (Pixi): ab „Stark" eine große mittige Fontäne.
const EMBER_TIER_LABELS = ["Schwach", "Stark", "Brutal", "Irre", "Gottgleich"];
// Der GPU-Emitter zeigt die Glutfunken als Eskalation — nur im Preview/Dev-Build mit „pixi"-Renderer; sonst DOM-Fassung.
const EMBER_PIXI_PREVIEW = (import.meta.env.VITE_PREVIEW === "1" || import.meta.env.DEV) && FX_RENDERER === "pixi";
function FieldFxPreview({ effect, deckTint = false }) {
  const look = PREVIEW_LOOK[effect] || { bf: SHOWCASE_BF, a1: DEMO_C, a2: "#b06bff" };
  const bf = battlefieldAssets(look.bf);
  const isMobile = useIsMobile();
  const src = bf ? (isMobile ? bf.mobile : bf.desktop) : null;
  const [sweep, setSweep] = useState(1);
  const [emberStep, setEmberStep] = useState(0);
  const [tierStep, setTierStep] = useState(0);
  const tierRef = useRef(0); // #komet: spiegelt tierStep (der setTierStep-Updater darf keinen Sound spielen → StrictMode ruft ihn doppelt)
  const pixiEmbers = effect === "embers" && EMBER_PIXI_PREVIEW;
  const pixiField = EMBER_PIXI_PREVIEW && PIXI_FIELD_KEYS.includes(effect); // Sternenfeld/Glutfunken → Pixi-Bühne im Showcase
  const auroraGL = EMBER_PIXI_PREVIEW && effect === "aurora";              // Aurora → eigene WebGL-Canvas
  useEffect(() => {
    if (effect === "none") return undefined;
    // #: Glutfunken — Score-/Tier-Wechsel UND Funkenstoß aus EINEM Timer, damit Puls und Label immer zusammenpassen.
    // Pixi-Vorschau: durch die Hit-Tier-Leiter eskalieren (Schwach → Gottgleich). DOM/andere: Score-Rampe bzw. Sweep-Puls.
    const isEmbers = effect === "embers";
    const id = setInterval(() => {
      setSweep((s) => s + 1);
      if (pixiField) {
        // #311: alle Pixi-Feldeffekte (Glutfunken/Sternenfeld) durch die Tier-Leiter eskalieren. Nächsten Tier über den
        // Ref bestimmen (nicht im Updater Sound spielen — StrictMode ruft ihn doppelt).
        const nextTier = (tierRef.current + 1) % EMBER_TIER_LABELS.length;
        tierRef.current = nextTier; setTierStep(nextTier);
        // #komet: Sternenfeld-Sound auch im Showcase — Datei nach gezeigtem Tier (≥1 Woosh+Impact, sonst kleiner Komet).
        // Beim Tick gestartet → der Einschlag (~0,9 s im File) sitzt auf dem visuellen Impact. Pegel wie Glutfunken-Vorschau.
        if (effect === "starfield") audio.play(nextTier >= 1 ? "fx_comet_impact" : "fx_comet", { gain: 0.27 });
      } else if (isEmbers) setEmberStep((s) => (s + 1) % EMBER_DEMO_SCORES.length);
      if (isEmbers) audio.play("fx_embers", { gain: 0.27 }); // #glutfunken: Aufstoß-Sound auch in der Vorschau hörbar (gleicher Pegel wie in-game)
    }, isEmbers ? (pixiEmbers ? 1600 : 2000) : 1500);
    return () => clearInterval(id);
  }, [effect, pixiField, pixiEmbers]);
  const demoScore = effect === "embers" ? EMBER_DEMO_SCORES[emberStep] : 0;
  // #313-Folge: Im DOM-Pfad (Produktion, FX_RENDERER=dom) kennt FieldFxLayer den deckTint NICHT und färbt die Glutfunken
  // stur nach `color`. Darum hier die Ember-Farbe je Modus wählen — Standard = warmes Feuer (== Pixi-FIRE), Deckfarbe =
  // Demo-Deckfarbe (look.a1). So schaltet der Standard↔Deckfarbe-Toggle die Showcase-Glutfunken sichtbar um.
  // (Der Pixi-Vorschau-Pfad braucht das nicht — dort tönt der Emitter intern FIRE↔params.deck.)
  const domColor = effect === "embers" && !deckTint ? "#ff6a30" : look.a1;
  return (
    <div className="relative w-full h-full overflow-hidden rounded-lg" style={{ background: "#0b0a16" }}>
      {src && <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover" />}
      <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,#0c0c10aa,#0c0c1055 45%,#0c0c10cc)" }} />
      {/* Pixi-Feldeffekte (Aurora/Sternenfeld/Glutfunken) auf der GPU-Bühne — sonst die DOM-Fassung (FieldFxLayer). */}
      {pixiField && (
        <Suspense fallback={null}>
          <PixiStage className="absolute inset-0 z-[2]" effect={effect} color={look.a1} color2={look.a2} deckTint={deckTint}
            score={pixiField ? 250000 : demoScore} reduced={false} lite={false}
            sweepId={sweep} sweepDur={1100} win hitTier={pixiField ? tierStep : 0} />
        </Suspense>
      )}
      {auroraGL && (
        <div className="absolute inset-0 z-[2] pointer-events-none">
          <AuroraFieldGL color={look.a1} color2={look.a2} deckColored={deckTint} animate />
        </div>
      )}
      {effect !== "none" && !pixiField && !auroraGL && <FieldFxLayer effect={effect} color={domColor} color2={look.a2} sweepId={sweep} sweepDur={1100} reduced={false} win score={demoScore} />}
      {(effect === "embers" || effect === "starfield") && (
        <div className="absolute right-2 bottom-2 text-[10px] font-extrabold px-2 py-0.5 rounded-md flex items-center gap-1.5"
          style={{ background: "#0b0a16cc", border: "1px solid #ffffff22", color: effect === "starfield" ? "#cfe0ff" : "#ffd7b0" }}>
          {pixiField
            ? (<><span className="opacity-70">Tier</span> {EMBER_TIER_LABELS[tierStep]}</>)
            : (<><span className="opacity-70">Score</span> {demoScore.toLocaleString("de-DE")}</>)}
        </div>
      )}
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
  const p = profile || {};
  const [tab, setTab] = useState("packs");           // "packs" | "challenges" | "fx"
  const [packOv, setPackOv] = useState(null);        // offene Pack-Detailansicht: { cat, idx } | null
  const [packSel, setPackSel] = useState("back");   // "back" | "front" | "bg" — Cover (Rücken) zuerst, dann Front
  const deckId = options?.deckId || "default";
  // #Shop-Reorg: Detail navigiert innerhalb seiner Kategorie; aktives Pack steht nach Standard vorn (orderPacks).
  const catList = (cat) => orderPacks(cat === "challenges" ? CHALLENGES_TAB : PACKS_TAB, deckId);
  const spBal = Math.max(0, Math.floor(Number(p.stichPoints) || 0));
  const dpBal = Math.max(0, Math.floor(Number(p.deckPoints) || 0)); // #299 Deckpunkte — Währung der Packs

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
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Deck-Werkstatt</h2>
            <div className="flex items-center gap-2">
              {/* DP = Werkstatt-Währung (Packs UND Effekte, #307); SP-Guthaben nur zur Info (Upgrade-Baum). */}
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg" style={{ background: "#141320", border: "1px solid #2b5a68", color: "#35c6e6" }}>{dpBal} DP</span>
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg" style={{ background: "#141320", border: "1px solid #34333f", color: "#f2c14a" }}>{spBal} SP</span>
              <button onClick={onClose} className="shrink-0 px-3 py-1.5 rounded-lg text-sm" style={{ background: "#20202a", border: "1px solid #3a3a46" }}>Schließen</button>
            </div>
          </div>
          {/* Tab-Umschalter: Packs · Challenges · Effekte */}
          <div className="flex gap-1.5 mt-3 p-1 rounded-xl" style={{ background: "#131219", border: "1px solid #2a2836" }}>
            {[["packs", "Packs"], ["challenges", "Challenges"], ["fx", "Effekte"]].map(([m, label]) => (
              <button key={m} onClick={() => setTab(m)} className="flex-1 py-2 rounded-lg text-[12.5px] font-extrabold transition-colors"
                style={{ background: tab === m ? "#9b82f0" : "transparent", color: tab === m ? "#141419" : "#9a97ab" }}>{label}</button>
            ))}
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
              style={{ background: "#14131c", border: `1px solid ${active ? "#54e08a55" : "#2a2836"}`, boxShadow: active ? "0 0 0 1px #54e08a55, 0 0 16px #54e08a22" : undefined }}>
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
const TAB_LABEL = { anim: "Karten", bgfx: "Feld", bgglow: "Glow", bgfin: "Finisher", finisher: "Sieg", gott: "Prunk" };
// #shopB Kurzbeschreibung je Effekt: NUR der funktionale Bezug (was er im Spiel tut / worauf er reagiert — z. B. Klinge
// skaliert mit der Serie), nicht die Marketing-Langfassung. „none"/„standard" hängen an der Kategorie → über shortDesc().
const FX_SHORT = {
  edgeglow: "Dauerhafter Neon-Rand in der Deckfarbe.",
  holo: "Prismatisches Lichtband, tilt-reaktiv.",
  glitch: "Cyberpunk-Glitch mit gelegentlichen Bursts.",
  aurora: "Weiche Schleier; je Stich ein Bloom-Puls.",
  deckglow: "Linien des Battlefields glühen; Lauflicht wandert an den Konturen entlang.",
  cubematrix: "Neon-Würfelfeld — reagiert auf die Musik.",
  embers: "Glut steigt auf; je Sieg ein Funken-Aufstoß.",
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
  if (fx.key === "none") return group.mode === "anim" ? "Alle Karten-Animationen aus." : "Kein Effekt in diesem Slot.";
  if (fx.group === "spezial") return fx.key === "deck" ? "Feuer · Blitz · Eis · Pflanze in der Deckfarbe." : "Feuer · Blitz · Eis · Pflanze in der Standard-Neonfarbe."; // #spezial (vor „standard"-Kollision)
  if (fx.key === "standard") return "Verliererkarte fliegt einfach zur Seite weg.";
  if (fx.key === "gottStandard") return "Gottgleicher Sieg ohne Prunk-Effekt.";
  return FX_SHORT[fx.key] || fx.desc;
}

function FxView({ p, options, onChoose, onBuyFx, stickyTop = 0 }) {
  const finisherSel = finisherSelOf(options, p); // #klinge-kaufbar: „klinge" nur bei Besitz aktiv, sonst „standard"
  const bgFxSel = bgFxSelOf(options);
  const bgFinSel = bgFinSelOf(options);
  const gottSel = gottSelOf(options); // #322 aktiver Gottgleich-Prunk oder „gottStandard" (kein Prunk)
  const spezialSel = options?.archColor === "deck" ? "deck" : "standard"; // #spezial Farbwahl der Archetyp-Effekte (unter „Karten")
  const activeKeyOf = (g) => g.mode === "finisher" ? finisherSel : g.mode === "bgfx" ? bgFxSel : g.mode === "bgfin" ? bgFinSel : g.mode === "gott" ? gottSel : null;
  // Auswahl-Status: { group (aktive Kategorie/Tab), key (Effekt in der Bühne) }. Default = erster Effekt der ersten Gruppe.
  const [sel, setSel] = useState(() => { const g = FX_GROUPS[0]; return { group: g.key, key: fxGroupItems(g.key)[0].key }; });
  const selGroup = FX_GROUPS.find((g) => g.key === sel.group) || FX_GROUPS[0];
  const selItems = fxGroupItems(selGroup.key);
  const selFx = selItems.find((f) => f.key === sel.key) || selItems[0];

  // Ist ein Effekt in seiner Gruppe „aktiv"? (Toggle an / als Finisher·Ambiente gewählt). Zentrale Wahrheit → Zeilen-Marker + Bühnen-Aktion.
  const isActive = (g, fx) => g.mode === "finisher" ? finisherSel === fx.key
    : g.mode === "bgfx" ? bgFxSel === fx.key
    : g.mode === "bgfin" ? bgFinSel === fx.key
    : g.mode === "gott" ? gottSel === fx.key   // #322 Gottgleich-Prunk einfach-exklusiv (gottStandard = kein Prunk)
    : fx.group === "spezial" ? spezialSel === fx.key   // #spezial Standard ↔ Deckfarbe (einfach-exklusiv; Tiles leben in der anim-Gruppe)
    : fx.key === "none" ? !animAnyOn(options)   // #318 „Keine Animation" aktiv, solange keine Karten-Animation an ist
    : fx.standard ? false : !!options?.[fx.option];

  // #shopB Tab-Wechsel: die Bühne springt auf den AKTIVEN Effekt der Kategorie (oder den ersten) → man sieht sofort, was läuft.
  const pickCat = (gKey) => {
    const g = FX_GROUPS.find((x) => x.key === gKey);
    const its = fxGroupItems(gKey);
    const aKey = activeKeyOf(g);
    setSel({ group: gKey, key: (aKey && its.some((f) => f.key === aKey)) ? aKey : its[0].key });
  };
  // Doppeltippen in der Liste schaltet direkt um (wie zuvor der Chip).
  const toggleFx = (g, fx) => {
    if (fx.standard) return;
    const on = isActive(g, fx);
    if (!on && !(fx.alwaysOwned || globalFxOwned(p, fx))) return; // nicht im Besitz → erst über die Bühne kaufen
    if (g.mode === "finisher") onChoose(finisherFlags(on ? "none" : fx.key));
    else if (g.mode === "bgfx") onChoose(bgFxFlags(on ? "none" : fx.key));
    else if (g.mode === "bgfin") onChoose(bgFinFlags(on ? "none" : fx.key));
    else if (g.mode === "gott") onChoose(gottFlags(on ? "gottStandard" : fx.key));
    else if (fx.group === "spezial") onChoose(spezialFlags(fx.key)); // #spezial immer aktiv → wählt (kein Aus-Zustand); Tiles in der anim-Gruppe
    else if (fx.key === "none") onChoose(animNoneFlags());
    else onChoose({ [fx.option]: !on });
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
                className="flex-1 py-1.5 rounded-lg text-[11px] font-extrabold transition-colors"
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
  const deckOpt = fx.key === "aurora" ? "fxAuroraDeck" : fx.key === "deckglow" ? "fxDeckGlowDeck" : fx.key === "embers" ? "fxEmberDeck" : fx.key === "starfield" ? "fxStarfieldDeck" : fx.key === "cubematrix" ? "fxCubeMatrixDeck" : fx.key === "scorch" ? "fxScorchDeck" : fx.key === "blackhole" ? "fxBlackholeDeck" : fx.key === "klinge" ? "fxKlingeDeck" : fx.key === "hologridSlice" ? "fxHologridDeck"
    // #322–#326 Gottgleich-Prunk-Farbmodus (Standard-Palette ↔ Deckfarbe) je Effekt.
    : fx.key === "sonnenPuls" ? "fxSonnenPulsDeck" : fx.key === "laserFaecher" ? "fxLaserFaecherDeck" : fx.key === "prismaKaskade" ? "fxPrismaKaskadeDeck" : fx.key === "holoCube" ? "fxHoloCubeDeck" : fx.key === "supernova" ? "fxSupernovaDeck" : null;
  const deckTintOn = deckOpt ? !!options?.[deckOpt] : false;
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
  } else if (group.mode === "bgfx" || group.mode === "bgfin") {
    const label = group.mode === "bgfx" ? "Als Hintergrund wählen" : "Als Hintergrund-Finisher wählen";
    const flags = group.mode === "bgfx" ? bgFxFlags(fx.key) : bgFinFlags(fx.key);
    const chooseBtn = <button onClick={() => onChoose(flags)} className={actBtn} style={active ? onStyle : offStyle}>{active ? "✓ Ausgewählt" : label}</button>;
    // #: Aurora + Glutfunken bieten Standard/Deckfarbe. Toggle setzt das Farbmodus-Flag (deckOpt).
    // #317 Cube-Matrix: zusätzliche Optik-Wahl (gefüllt ↔ nur Rahmen). Die Retro-Sonne-Wahl wurde entfernt (Sonne fix aus).
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
    // #spezial: Archetyp-Effekte (unter „Karten") sind immer aktiv — nur die Farbwahl Standard ↔ Deckfarbe (über archColor).
    action = <button onClick={() => onChoose(spezialFlags(fx.key))} className={actBtn} style={active ? onStyle : offStyle}>{active ? "✓ Ausgewählt" : (fx.key === "deck" ? "Deckfarbe wählen" : "Standard wählen")}</button>;
  } else if (group.key === "anim" && fx.key === "none") {
    // #318 „Keine Animation" (Aus-Zustand der Karten-Animationen): schaltet alle Karten-Animationen ab.
    action = <button onClick={() => onChoose(animNoneFlags())} className={actBtn} style={active ? onStyle : offStyle}>{active ? "✓ Aktiv — keine Animation" : "Alle Animationen aus"}</button>;
  } else if (deckOpt) {
    // #deckglow: frei kombinierbarer Toggle MIT Farbmodus — An/Aus + Farbwahl. „Eigenfarbe" = verstärkt die vorhandenen
    // Farben des Backgrounds (kein Umfärben); „Deckfarbe" = bewusstes Einfärben in die Deckfarbe.
    const toggleBtn = <button onClick={() => onChoose({ [fx.option]: !active })} className={actBtn} style={active ? onStyle : offStyle}>{active ? "✓ An — tippen zum Ausschalten" : "Einschalten"}</button>;
    action = (
      <div className="flex flex-col gap-2">
        {toggleBtn}
        <div className="flex rounded-lg overflow-hidden self-center" style={{ border: "1px solid #33324a" }}>
          {[{ v: false, l: "Eigenfarbe" }, { v: true, l: "Deckfarbe" }].map((o) => {
            const on = deckTintOn === o.v;
            return <button key={o.l} onClick={() => onChoose({ [deckOpt]: o.v })} className="px-3.5 py-1.5 text-[11px] font-extrabold"
              style={{ background: on ? "#211f2e" : "#16151f", color: on ? "#e8e6ff" : "#8a879a" }}>{o.l}</button>;
          })}
        </div>
      </div>
    );
  } else {
    action = <button onClick={() => onChoose({ [fx.option]: !active })} className={actBtn} style={active ? onStyle : offStyle}>{active ? "✓ An — tippen zum Ausschalten" : "Einschalten"}</button>;
  }

  return (
    <>
      {/* #shopB „Bühne für alle gleich skaliert" — feste Höhe, unabhängig vom Effekt. */}
      <div className="relative w-full rounded-xl overflow-hidden" style={{ height: "clamp(146px, 22vh, 208px)", border: "1px solid #34324a", boxShadow: "0 0 22px -10px #35e0ff66" }}>
        {/* #313: Der Key trägt den Farbmodus mit → beim Toggle Standard↔Deckfarbe remountet die Vorschau sofort
            (frischer AuroraFieldGL-/PixiStage-Canvas mit der neuen Farbe). Ohne das übernahm der Effekt-Canvas den
            Farbwechsel nicht, man musste erst weg- und zurückwechseln. Für Effekte ohne Farbmodus bleibt deckTintOn
            konstant false → Key stabil, kein unnötiger Remount. */}
        <GlobalFxScenePreview key={`${fx.key}:${deckTintOn ? "deck" : "std"}`} fx={fx} deckTint={deckTintOn} sun={false} wire={!!options?.fxCubeMatrixWire} />
        {/* Gruppen-Schild oben links */}
        <span className="absolute left-2 top-2 text-[9px] font-extrabold tracking-[0.1em] uppercase px-2 py-0.5 rounded-md"
          style={{ background: "#0b0a16aa", border: "1px solid #ffffff1f", color: "#cbd3ff" }}>{fx.group === "spezial" ? "Archetyp-Effekte" : group.title}</span>
        {/* Status-Schild oben rechts: aktiv (grün) bzw. Preis in der Rarity-Farbe (#farbsystem) bei noch nicht gekauft. */}
        {active
          ? <span className="absolute right-2 top-2 text-[9px] font-extrabold tracking-wide px-2 py-0.5 rounded-md" style={{ background: "#123a25", color: "#54e08a", border: "1px solid #2f7a4f" }}>AKTIV</span>
          : !owned ? <span className="absolute right-2 top-2 text-[9px] font-extrabold tracking-wide px-2 py-0.5 rounded-md" style={{ background: "#0b0a16cc", color: rarityTint(fx), border: `1px solid ${rarityTint(fx)}66` }}>{price} DP</span> : null}
        {/* Name unten links */}
        <span className="absolute left-2.5 bottom-2 text-[15px] font-extrabold" style={{ textShadow: "0 1px 8px #000, 0 0 3px #000" }}>{fx.name}</span>
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
        border: `1px solid ${selected ? "#9b82f0" : "#2a2836"}`,
        boxShadow: selected ? "0 0 0 1px #9b82f0, 0 0 14px #9b82f022" : undefined }}>
      <span aria-hidden="true" className="absolute left-0 top-0 bottom-0" style={{ width: 4, background: tint, boxShadow: `0 0 8px ${tint}66`, opacity: owned ? 1 : 0.85 }} />
      <span className="flex-1 min-w-0 text-[13px] font-extrabold leading-tight truncate" style={{ color: selected ? "#e8e6ff" : owned ? "#e3e1ec" : "#7d7a8b" }}>{fx.name}</span>
      <span className="flex items-center gap-1.5 text-[10px] font-bold shrink-0" style={{ color: status.c }}>
        {status.dot && <span className="rounded-full shrink-0" style={{ width: 7, height: 7, background: status.dot, boxShadow: `0 0 6px ${status.dot}` }} />}
        {status.label}
      </span>
    </button>
  );
}
