import { useState, useEffect, useRef, useCallback, lazy, Suspense } from "react";
import { Card, CardBack } from "./Card.jsx";
import { clamp } from "../game/deck.js";
import { TRICKS_PER_CYCLE, suitColor, AUSLAEUFER_HARVEST, ION_MAX_STACKS, HEAT_MAX, BASE_FLIP_MS, PLANT_GREEN_THRESHOLD } from "../game/constants.js";
import { linkedPartnerOf } from "../game/shop.js";
import { formationBorder } from "./formationStyle.js";
import { holeSound } from "./blackholeSnd.js"; // Bett-Pegel des Schwarzen Lochs: EINE Quelle mit der Werkstatt-Vorschau
import { supernovaSwellDelay } from "./fx/supernovaTiming.js"; // Swell-Vorlauf: EINE Quelle mit dem Showcase (Pixi-frei)
import { gottSpeedFor } from "./fx/gottTiming.js"; // #prunk-laenge: In-Game-Spieldauer je Prunk (Pixi-frei)
import { formationLabel } from "./formationLabels.js";
import { audio } from "./audio.js";
import { useFxLevel } from "./useReducedFx.js";
// Pixi-Umbau Phase 0/1: koexistierende GPU-Bühne. LAZY geladen → Pixi (~200 KB) landet in einem eigenen Chunk,
// der NUR im Preview/Dev geladen wird (der Mount ist env-gegatet). Produktion (main) zieht Pixi nie in den Bundle.
const PixiStage = lazy(() => import("./fx/PixiStage.jsx").then((m) => ({ default: m.PixiStage })));
// Archetyp-Karteneffekt „Blitz" (Ionensturm-Rahmen) — eigener Pixi-Layer ÜBER den Karten, lazy wie oben.
// #blitz/#flip: Ionensturm-Rahmen als flippendes Kartenkind (Canvas-2D, z-0 = EdgeGlow-Ebene unter Eis/Moos) — ersetzt
// das frühere Pixi-Panel-Overlay (IonStorm.jsx), spart den WebGL-Kontext (analog EdgeGlow/Moos/Eis-Umbau).
const CardIonStorm = lazy(() => import("./fx/CardIonStorm.jsx"));
// Dev-Sicht: ?blitzframe=1 erzwingt den Ionensturm-Rahmen auf JEDER eigenen Karte (zum Designen; nur Preview/Dev).
const BLITZ_FORCE = (import.meta.env.VITE_PREVIEW === "1" || import.meta.env.DEV) &&
  (() => { try { return new URLSearchParams(window.location.search).get("blitzframe") === "1"; } catch { return false; } })();
// Archetyp-Karteneffekt „Feuer" (brennender Kartenkopf, Pixi-Partikel) — Neon-gefärbt (blau→magenta→rot), lazy wie oben.
const FireHead = lazy(() => import("./fx/FireHead.jsx").then((m) => ({ default: m.FireHead })));
// Dev-Sicht: ?fireheat=<0..1> erzwingt eine feste Feuer-Hitze am eigenen Kartenkopf (zum Designen; nur Preview/Dev).
const FIRE_FORCE = (import.meta.env.VITE_PREVIEW === "1" || import.meta.env.DEV) &&
  (() => { try { const v = new URLSearchParams(window.location.search).get("fireheat"); return v == null ? null : Math.max(0, Math.min(1, parseFloat(v) || 0)); } catch { return null; } })();
// Archetyp-Karteneffekt „Pflanze" als Neon-Moos (Moos-Wuchs am Wachstums-Zustand der eigenen Karte) — Canvas-2D, lazy wie oben.
const MossGrow = lazy(() => import("./fx/MossGrow.jsx"));
// Dev-Sicht: ?moss=<0..8> erzwingt eine feste Reifestufe auf der eigenen Karte (zum Designen; nur Preview/Dev).
const MOSS_FORCE = (import.meta.env.VITE_PREVIEW === "1" || import.meta.env.DEV) &&
  (() => { try { const v = new URLSearchParams(window.location.search).get("moss"); return v == null ? null : Math.max(0, Math.min(8, parseFloat(v) || 0)); } catch { return null; } })();
// Archetyp-Karteneffekt „Eis" als Neon-Kristall-Frost (Gletscher-Masse an der eigenen Karte) — Canvas-2D, lazy wie oben.
const FrostIce = lazy(() => import("./fx/FrostIce.jsx"));
// Karten-Animation „Kantenglühen" (Edge-Glow, #318) als Kind IN der Karte — flippt mit ihr, liegt UNTER Eis/Moos.
const CardEdgeGlow = lazy(() => import("./fx/CardEdgeGlow.jsx"));
// Dev-Sicht: ?ice=<0..12> erzwingt eine feste Gletscher-Masse auf der eigenen Karte (zum Designen; nur Preview/Dev).
const ICE_FORCE = (import.meta.env.VITE_PREVIEW === "1" || import.meta.env.DEV) &&
  (() => { try { const v = new URLSearchParams(window.location.search).get("ice"); return v == null ? null : Math.max(0, Math.min(12, parseFloat(v) || 0)); } catch { return null; } })();
// #eis Basis-Frost-Boden: ein frisch gefrorener Gletscher (Masse 0) sieht trotzdem vereist aus (dünner Basis-Frost,
//   Stufe 0), wächst dann mit seiner Firn-Masse. Frost gehört PER KARTE nur auf gefrorene Gletscher, nicht global.
const ICE_BASE_FREEZE = 3;
// #318 Karten-Animationen: geteilte Pixi-Overlay-Bühne ÜBER den Karten (Edge-Glow/Holo/Glitch), lazy wie oben.
const CardFxStage = lazy(() => import("./fx/CardFxStage.jsx").then((m) => ({ default: m.CardFxStage })));
// #322–#326 Gottgleich-Prunk (PIXI) — lazy wie die anderen Pixi-Layer: Pixi lädt erst beim ersten gottgleichen Sieg
// (Render-Branch mountet nur bei gottTrigger>0) → Prod-Bundle bleibt Pixi-frei, bis der Effekt wirklich spielt.
import { GottChromeWord } from "./fx/GottChromeWord.jsx"; // #gott geteilte Chrome-Wortmarke (In-Game-Ansage + Shop-Vorschau)
import { deckChrome, epicWordColors } from "./fx/announceChrome.js"; // #ansage-deck: Ansage-Farben aus der Deckfarbe
const SonnenPulsPixi = lazy(() => import("./fx/SonnenPulsPixi.jsx"));
const LaserFaecherPixi = lazy(() => import("./fx/LaserFaecherPixi.jsx")); // #323 Gottgleich-Prunk „Laser-Fächer"
const PrismaKaskadePixi = lazy(() => import("./fx/PrismaKaskadePixi.jsx")); // #324 Gottgleich-Prunk „Prisma-Kaskade"
const HoloCubePixi = lazy(() => import("./fx/HoloCubePixi.jsx")); // #325 Gottgleich-Prunk „Holo-Würfel-Kollaps"
const SupernovaPixi = lazy(() => import("./fx/SupernovaPixi.jsx")); // #326 Gottgleich-Prunk „Supernova" (Tunnel z-9 + Explosion z-11)
const HologridSlicePixi = lazy(() => import("./fx/HologridSlicePixi.jsx")); // #321 Sieg-Finisher „Hologrid-Slice" (Pixi; persistent gemountet, Replay je Sieg über Trigger)
// Dev-Sicht: ?edgeglow=1 / ?holo=1 erzwingen die jeweilige Karten-Animation auf beiden Karten (zum Designen; nur Preview/Dev).
const cardAnimForce = (name) => (import.meta.env.VITE_PREVIEW === "1" || import.meta.env.DEV) &&
  (() => { try { return new URLSearchParams(window.location.search).get(name) === "1"; } catch { return false; } })();
const EDGEGLOW_FORCE = cardAnimForce("edgeglow");
const HOLO_FORCE = cardAnimForce("holo");
const GLITCH_FORCE = cardAnimForce("glitch");
/* #318 Karten-Animationen sind KAUFBARE Shop-Effekte → sie müssen auch in PRODUKTION laufen (nicht nur Preview/Dev),
   sonst kauft der Spieler etwas, das im Spiel nie sichtbar wird. Die CardFxStage lädt Pixi NUR lazy und startet ihren
   Ticker nur, wenn der Spieler eine Karten-Animation besitzt UND aktiviert hat (sonst rendert der Block null → kein
   Pixi-Import, Prod bleibt pixel-identisch). Die übrigen Pixi-Layer (IonStorm/FireHead = Archetyp-Rollout, noch nicht
   kaufbar) bleiben bewusst Preview/Dev-gegatet. WebGL fehlt → Overlay bleibt leer, das Spiel läuft normal weiter. */
const CARD_FX_ENABLED = true;
import { PIXI_FIELD_KEYS } from "./fx/fieldFxKeys.js"; // pixi-FREI: welche Feld-Effekte der GPU-Emitter übernimmt
const PIXI_FIELD = new Set(PIXI_FIELD_KEYS);
import { floorEffectPlacement, MOBILE_MQ } from "./fx/effectZones.js"; // fest verankerter Feld-Boden → Effekt-Front bündig am Panel-Rahmen
import { useMediaQuery, useIsWide } from "./useIsWide.js";
import FieldLayer from "./fx/FieldLayer.jsx"; // #kompositor: der EINE Renderpfad der Shader-Feldeffekte
import { useOnScreen } from "./fx/useOnScreen.js"; // #perf-scroll: aus dem Bild gescrollt = Effekte anhalten
import { perfMark } from "./perfRecorder.js"; // #perf-scroll: Scroll-Wechsel im Report auffindbar machen
import ScorchFx from "./fx/ScorchFx.jsx"; // #319 Scorch-Sieg-Finisher (Canvas-2D, pixi-frei → läuft auch in Produktion)
import BlackholeFx from "./fx/BlackholeFx.jsx"; // #320 Schwarzes-Loch-Sieg-Finisher (persistentes Panel-Loch, Canvas-2D)
const CubeMatrixField = lazy(() => import("./fx/CubeMatrixField.jsx")); // #317 musik-reaktives Würfelfeld (lazy → nicht im Prod-Bundle)
import { PhaseHairline, DECK_BORDER } from "./modalStyle.jsx"; // #365: deck-getönter Nicht-CRT-Fallback des Battlefield-Rahmens
import { fmtScore } from "./format.js";
import { FactionIcon } from "./FactionIcon.jsx"; // #308 zentrales Fraktions-Icon (Treffer-Identität im Score-Float)
import cardBackImg  from "../assets/cards/card-back.webp";  // Default-Deck-Rücken: „Prisma" (v0.4, ersetzt den Schwerter-Rücken #180)
import cardFrontImg from "../assets/cards/card-front.webp"; // Default-Deck-Front: Rahmen (Zahl/Effekte rendern darüber)
// (#186/#214/v0.4) Gegner-Deck: je Auswahl-Typ ein eigenes Deck (Cover = Rücken, Front = Rahmen). Der Gegner spielt
// jede Runde das Deck der KOMMENDEN Auswahl (DECISION_SCHEDULE) — die App reicht den Typ als `oppDeck` durch. v0.4:
// eigene, phasen-farbcodierte Gegner-Decks (grün Aufstellung · blau Architekt · orange Perk · lila Skill · Diamant Legendär).
import oppFormationFront from "../assets/cards/decks_opponent/deck_opp_formation/front.webp"; // 🟢 Aufstellung → formation
import oppFormationBack  from "../assets/cards/decks_opponent/deck_opp_formation/back.webp";
import oppArchitektFront from "../assets/cards/decks_opponent/deck_opp_architekt/front.webp"; // 🔵 Architekt   → shop
import oppArchitektBack  from "../assets/cards/decks_opponent/deck_opp_architekt/back.webp";
import oppPerkFront      from "../assets/cards/decks_opponent/deck_opp_perk/front.webp";      // 🟠 Perk        → perk
import oppPerkBack       from "../assets/cards/decks_opponent/deck_opp_perk/back.webp";
import oppSkillFront     from "../assets/cards/decks_opponent/deck_opp_skill/front.webp";     // 🟣 Skill       → skill (+ Default)
import oppSkillBack      from "../assets/cards/decks_opponent/deck_opp_skill/back.webp";
import oppLegendaryFront from "../assets/cards/decks_opponent/deck_opp_legendary/front.webp"; // 💎 Legendär    → legendary
import oppLegendaryBack  from "../assets/cards/decks_opponent/deck_opp_legendary/back.webp";
import { t as tr } from "../i18n/index.js"; // #sprache (tr = Alias: `t` ist hier lokal der Stich)
import { TrickBreakdown } from "./TrickBreakdown.jsx"; // §17 Faktorenkette unter dem Feld

// Auswahl-Typ (DECISION_SCHEDULE) → Gegner-Deck-Skin (Cover/Front). Eigene, phasen-farbcodierte v0.4-Decks.
// Fällt auf „stat" zurück = Skill/purple (die erste Runde ist immer Skill).
const OPP_DECK_SKINS = {
  formation: { back: oppFormationBack, front: oppFormationFront }, // 🟢 Aufstellungsphase
  shop:      { back: oppArchitektBack, front: oppArchitektFront }, // 🔵 Architekt-Phase (Auswahl-Typ „shop", #202)
  perk:      { back: oppPerkBack,      front: oppPerkFront },      // 🟠 Perk-Auswahl
  skill:     { back: oppSkillBack,     front: oppSkillFront },     // 🟣 Skill-Auswahl
  legendary: { back: oppLegendaryBack, front: oppLegendaryFront }, // 💎 Legendär-Auswahl (R29)
  stat:      { back: oppSkillBack,     front: oppSkillFront },     // Fallback-Default = Skill (erste Runde ist immer Skill)
};
// #perf: alle (eindeutigen) Gegner-Deck-Bild-URLs — fürs Vorladen im Run-Start-Gate, damit die erste Gegnerkarte
// eines neuen Auswahl-Typs (Perk/Skill/Formation/Architekt/Legendär) nicht erst mitten im Lauf sein Bild dekodiert.
export const OPP_SKIN_URLS = [...new Set(Object.values(OPP_DECK_SKINS).flatMap((s) => [s.front, s.back]))];

// Ergebnis-Banner-Farben (Design-Sweep: frischer/kräftiger, an die neue Palette angeglichen — Grün/Rot/Violett/Neutral).
const BANNER = {
  win:     { key: "bf.banner.win",     color: "#5fce86" },
  win_tie: { key: "bf.banner.winTie",  color: "#a89bf5" },
  loss:    { key: "bf.banner.loss",    color: "#ef6f68" },
  tie:     { key: "bf.banner.tie",     color: "#a6a6b0" },
};
const CRIT_COLOR = "#e879f9";
// Archetyp-„Treffer-Identitäten" des Score-Floats (engine liefert lastTrick.hitTypes[]): EIN Sieg kann mehrere zugleich
// tragen (bis zu alle vier) → alle Icons werden gezeigt. Bedingungen (in der engine): Feuer = voller-Hitze-Sieg (100 %) ·
// Pflanze = Sieg mit voll ausgewachsener grüner Karte · Blitz = Sieg mit voll ionisierter Karte (5 Stapel) · Eis folgt.
// Score-FARBE nach Priorität: Krit-Lila zuerst, dann HIT_COLOR_ORDER (Blitz teilt sich das Lila mit dem Krit). Die Icons
// bleiben unabhängig von der Farbe immer stehen — auch bei Krit.
// #308: nur noch die Fraktions-FARBE hier; das Icon kommt zentral aus <FactionIcon type={faction} /> (kein Emoji/glacier.webp mehr).
const HIT_STYLE = {
  fire:      { color: "#e0714a" },
  plant:     { color: "#5ab87a" },
  ice:       { color: "#5ec8f0" },
  lightning: { color: CRIT_COLOR },
};
const HIT_ICON_ORDER  = ["fire", "plant", "ice", "lightning"]; // gezeigte Icons (Reihenfolge egal — reine Anzeige)
// Score-FARBE: erste zutreffende bestimmt sie (nach dem Krit-Lila). EIS/Blau hat Vorrang (direkt nach Krit) — sonst egal.
// Blitz ist bewusst NICHT dabei: reines Lila bleibt exklusiv dem Krit; ein nicht-kritischer 5-Stapel-Sieg zeigt nur das ⚡.
const HIT_COLOR_ORDER = ["ice", "fire", "plant"];

// #68: vier Streuzonen — gleiche Float-Typen dicht beieinander, verschiedene getrennt. Basis-Lage je Zone.
const FLOAT_ZONES = {
  score:     { left: "7%",  top: "38%" },  // Score-Gewinn (linke Seite, über der Spielerkarte)
  crit:      { left: "50%", top: "2%"  },  // Crit-Text (oben mittig)
  formation: { right: "6%", top: "62%" },  // Formations-Multiplikator (unten rechts)
};
// #105: gestufter Groß-Score-Float — Arcade-Leiter (GREAT→BRUTAL→INSANE→GODLIKE) auf den gewonnenen
// Einzelstich-Score. Höchste erfüllte Stufe gewinnt; oberste bewusst hoch (500k) → „GOTTGLEICH" bleibt selten.
// #169 FB-7: `size` = Peak-Zielgröße (px) je Stufe — höhere Stufe dominiert stärker. Der Render deckelt sie per
// clamp() gegen die Viewport-Breite (mobil kein Überlauf) und zentriert echt (H+V) auf oberster Ebene.
// #315/rework: `cool` = Cooldown-Fenster (ms) je Groß-Ansage-Stufe gegen Spam/Clutter, `rank` = Rangordnung für die
// „nur die höchsten"-Dominanz (höher unterdrückt niedriger kurz danach). Bewusst SANFT gedrosselt, damit die Stufen
// bei starken Runs NICHT verstummen, sondern regelmäßig (aber reduziert) erscheinen — auch Gottgleich (jetzt ebenfalls
// mit `cool`, damit sein Sonder-Effekt/Bass regelmäßig, aber nicht bei JEDEM Stich kommt). Werte tunebar.
// #344: Stark/Brutal/Irre = Neon-Synthwave-CHROME (Light-Variante) — metallischer Verlauf in die Glyphen geclippt, Glow
//   via drop-shadow. „Light" = viel Weiß/Silber mit Farbbändern je Stufe; jede Stufe eine Spur „cooler". KEIN Sweep
//   (Verlauf steht still), reiner Text. Gottgleich (epic) bleibt UNVERÄNDERT (solides Weiß + Bloom, SVG).
/* #322 Gottgleich-Schwelle — EINE Quelle für Ansage UND Prunk-Effekt. Sie stand vorher zweimal als
   Literal 500000 im File (hier und weiter unten), und die beiden Stellen sind auseinandergelaufen:
   die Ansage prüfte den Stich-Score NACH dem Krit, der Effekt den Wert DAVOR. Ein Sieg, der die
   Schwelle erst durch den Krit-Multiplikator reißt, zeigte deshalb „GOTTGLEICH" ohne jeden Effekt. */
const GOTT_FX_MIN = 500000;
// Gottgleich-Swell je Prunk-Effekt: der epische Punch (fx_godlike) bleibt gemeinsam, der darübergelegte Swell trägt
// jetzt den Klang des GEWÄHLTEN Prunks. Ohne eigenen Sound (sonnenPuls/gottStandard) bleibt es beim generischen
// Supernova-Swell (Alt-Verhalten). delay = Versatz nach dem Punch (Supernova/Holo-Würfel bauen langsam auf → 0,85 s
// wie bisher; die kürzeren laufen sofort mit). [TUNING]
const GOTT_SWELL = {
  supernova:     { snd: "fx_supernova", gain: 1.0, delay: supernovaSwellDelay(gottSpeedFor("supernova")) }, // abgeleitetes Timing — MIT dem gestreckten In-Game-Tempo, sonst sitzt der Impuls wieder vor dem Blitz
  holoCube:      { snd: "fx_holocube",  gain: 1.0, delay: 0 },
  laserFaecher:  { snd: "fx_laserfan",  gain: 1.0, delay: 0 },
  prismaKaskade: { snd: "fx_prisma",    gain: 1.0, delay: 0 },
};
const GOTT_SWELL_DEFAULT = { snd: "fx_supernova", gain: 1.0, delay: supernovaSwellDelay(gottSpeedFor("sonnenPuls")) }; // sonnenPuls / gottStandard: generischer Swell
const BIG_SCORE_TIERS = [
  /* #perf-ansage2 (18.08.2026): `cool` 2500 → 4000. Gottgleich hatte den KÜRZESTEN Cooldown der ganzen Leiter
     (Stark 5600 · Brutal 4600 · Irre 3600) und zugleich den höchsten Rang — es wird also von BIG_DOMINANCE_MS nie
     unterdrückt, unterdrückt aber selbst 2 s lang alle anderen. Sobald der Stich-Score dauerhaft über 500k liegt
     (im späten Lauf der Normalzustand), stand die teuerste Ansage bei 1,9 s Lebensdauer auf ~76 % Einschaltdauer:
     ein Dauer-Effekt, genau in der Phase, in der das Handy am heißesten ist — und die anderen drei Stufen kamen
     überhaupt nicht mehr vor. Mit 4000 sind es ~47 %, und die Leiter ist wieder eine Leiter. */
  { min: GOTT_FX_MIN, key: "bf.big.godlike", size: 104, epic: true, rank: 4, cool: 4000 }, // epic = Sonder-Ansage: ~70 % Panelbreite, mittig, weiß
  { min: 150000, key: "bf.big.insane", size: 90, rank: 3, cool: 3600,
    chrome: { grad: "linear-gradient(100deg,#ffffff,#ffe4f5,#ff7ed4,#e2a9ff,#ff7ed4,#ffe4f5,#ffffff)", glow: "#ff2d95", aura: "#b14bff" } },
  { min: 50000,  key: "bf.big.brutal", size: 78, rank: 2, cool: 4600,
    chrome: { grad: "linear-gradient(100deg,#ffffff,#efe4ff,#b98bff,#7a5cff,#b98bff,#efe4ff,#ffffff)", glow: "#8b5cff", aura: "#12d6ff" } },
  { min: 10000,  key: "bf.big.fierce", size: 68, rank: 1, cool: 5600,
    chrome: { grad: "linear-gradient(100deg,#ffffff,#eafcff,#7fe6ff,#ffffff,#7fe6ff,#eafcff,#ffffff)", glow: "#12d6ff" } },
];
const BIG_DOMINANCE_MS = 2000; // #315/#344: eine niedrigere Stufe wird so lange nach einer HÖHEREN unterdrückt → „nur die höchsten"
// #ansage-overlap: effektive Stufe einer Ansage für den „nur die höchste ist sichtbar"-Vergleich. Die epischen
// One-Shots (Lawine, „Gönn dir") tragen bewusst keinen `rank` (sie umgehen Dominanz/Throttle), zählen hier aber als
// oberste Stufe — sonst könnte ein Stark sie von der Bühne schieben.
const bigRankOf = (tier) => tier.rank ?? (tier.epic ? 4 : 0);
// #344: geschichteter Chrome-Glow — enger + weiter Halo in `glow`, optionale weite `aura` für die „coolere" Doppelkante
//   (mobil-bewusst über gBig/gMid = lite ? 16/8 : 32/12). Bei transparentem Fill greift text-shadow nicht → drop-shadow.
const chromeFilter = (c, gBig, gMid) => {
  const parts = [`drop-shadow(0 0 ${gMid}px ${c.glow})`, `drop-shadow(0 0 ${gBig}px ${c.glow}88)`];
  if (c.aura) parts.push(`drop-shadow(0 0 ${Math.round(gBig * 1.4)}px ${c.aura}77)`);
  parts.push("drop-shadow(0 2px 3px #000a)");
  return parts.join(" ");
};
// Exportiert für test/battlefield-gottgleich.test.js: dort wird geprüft, dass Ansage und Effekt
// über den GESAMTEN Wertebereich dieselbe Antwort geben.
export const bigScoreTier = (g) => { for (const s of BIG_SCORE_TIERS) if (g > s.min) return s; return null; };
export { GOTT_FX_MIN };
// Große Lawine (Legendär): der Finisher-Bruch zeigt statt der Score-Stufe („Gottgleich" …) das Wort „Lawine".
// #: Lawine bekommt EXAKT den Gottgleich-Schrifteffekt (kein fester Farbton mehr) → Synthwave-Chrome-Zweiton bzw. im
//   Prunk-Deckfarbe-Modus die Deckfarbe (wie Gottgleich). Zusätzlich löst Lawine denselben Gottgleich-Prunk aus (s. u.).
const LAWINE_TIER = { key: "bf.big.avalanche", size: 104, epic: true };
// Serien-Meilenstein: ab einer Siegesserie von STREAK_GOENN feuert einmalig eine epische „Gönn dir"-Ansage (Gottgleich-Stil).
const STREAK_GOENN = 200;
/* #ansage-deck: „Gönn dir" trug ein festes Gold (`#ffd24a`) und war damit die einzige Ansage, die weder dem Deck
   noch dem Prunk-Schalter folgte. Jetzt `deckAlways` — IMMER Deckfarbe, unabhängig von `gottDeck` (der gehört zu
   Gottgleich/Lawine, wo die Farbe am gekauften Prunk-Effekt hängt, und „Gönn dir" hat gar keinen Prunk). */
const GOENNDIR_TIER = { key: "bf.big.letsgo", size: 104, epic: true, deckAlways: true };
// #FB: Groß-Ansage („wie stark"). Sie hing bislang am Stich-Takt (key=trickNo) und wurde vom Folgestich sofort
// ersetzt → bei 4×/MAX (flipMs ~160–440 ms) nur einen Wimpernschlag sichtbar. Jetzt entkoppelt in einem eigenen
// Pool mit fester, langer Standzeit, damit sie ihre Animation IMMER voll ausspielt (auch bei Turbo).
const BIG_ANNOUNCE_MS = 1900;       // feste Lebensdauer der Groß-Ansage — turbo-unabhängig, damit auch bei 4×/MAX lesbar
// #344: BIG_LANES (vertikale Fächer-Spuren) entfernt — alle Ansagen sind jetzt EXAKT mittig (wie Gottgleich).
// #188: Score-skalierte Effekt-Intensität aus dem Per-Stich-Score (t.gained). Nutzt DIESELBEN Schwellen wie
// BIG_SCORE_TIERS → Slice/Explosion + Groß-Ansage eskalieren gemeinsam. Rückgabe:
//   p    = weicher Anteil 0..1 (0 = heutiger Look/Floor bei ≤ STARK-Schwelle 10k, 1 = GOTTGLEICH 500k) — log-skaliert
//   tier = harte Stufe 0..4 (0 Base · 1 STARK · 2 BRUTAL · 3 IRRE · 4 GOTTGLEICH) für Unlock-Flourishes
// STARK · BRUTAL · IRRE · GOTTGLEICH — AUS BIG_SCORE_TIERS abgeleitet statt abgetippt (dort absteigend,
// hier aufsteigend). Vorher stand dieselbe Leiter ein zweites Mal als Literal-Array da; genau solche
// Doppelungen haben Ansage und Prunk-Effekt auseinanderlaufen lassen.
const FX_TIER_MINS = BIG_SCORE_TIERS.map((s) => s.min).slice().reverse();
// #322 Gottgleich-Prunk: Schwelle = GOTTGLEICH-Stufe, dieselbe wie die epische Ansage (GOTT_FX_MIN, oben
// definiert und von BIG_SCORE_TIERS mitbenutzt). Wer die Ansage sieht, sieht auch den Effekt.
// #322 Cooldown: der volle Prunk höchstens alle 30 s (Echtzeit, ref-basiert). Während des Cooldowns läuft nur die
// (throttled) GOTTGLEICH-Ansage weiter, kein zweiter voller Effekt.
const GOTT_FX_COOLDOWN_MS = 30000;

function fxIntensity(gained) {
  const g = gained > 0 ? gained : 0;
  let tier = 0;
  for (let i = 0; i < FX_TIER_MINS.length; i++) if (g >= FX_TIER_MINS[i]) tier = i + 1;
  const p = g <= 10000 ? 0 : Math.min(1, Math.log(g / 10000) / Math.log(50)); // log(500000/10000) = log(50) → 10k→0 … 500k→1
  return { p, tier };
}
// #klinge: choreografierte Klinge — die Einfahrrichtung rotiert über einen PER-STICH-Zähler (sliceSeq) durch einen
// Zyklus, dessen LÄNGE am Siegesserie-MULTIPLIKATOR (bd.streakMult, ×1.00…2.50) hängt — NICHT am Score-Tier und NICHT
// am rohen Serien-Zähler. Grundzug ist LINKS; je höher der Multiplikator, desto mehr Richtungen fahren nacheinander ein:
//   Mult < 1.25  → nur LINKS
//   Mult ≥ 1.25  → LINKS ↔ RECHTS (im Wechsel)
//   Mult ≥ 1.50  → LINKS · RECHTS · OBEN
//   Mult ≥ 2.00  → LINKS · RECHTS · OBEN · Z (alle vier nacheinander)
// Fällt der Multiplikator (Niederlage) zurück, schrumpft der Zyklus sofort wieder — bei ×1.00 läuft nur noch LINKS.
// Die Score-Höhe (BRUTAL/IRRE/GOTTGLEICH) hat KEINEN Einfluss auf diesen Effekt.
const SLICE_MOVES = ["left", "right", "top", "z"]; // Zyklus-Reihenfolge; der aktive Zyklus ist ein Präfix hiervon
function sliceCycleLen(mult) {                     // Länge des aktiven Zyklus aus dem Siegesserie-Multiplikator
  const m = mult || 1;
  return m >= 2.0 ? 4 : m >= 1.5 ? 3 : m >= 1.25 ? 2 : 1;
}
function sliceMove(mult, seq) {                    // seq = per-Stich-Zähler (sliceSeq.current++), mod aktueller Zyklus-Länge
  return SLICE_MOVES[(seq | 0) % sliceCycleLen(mult)];
}
// #klinge: Tuning-Set (aus dem Vorschau-Artifact; final justierbar). Alles serien- bzw. konstant-getrieben.
export const KLINGE_TUNE = {
  baseDist: 12,        // #klinge: Stücke fallen nur ein kleines Stück auseinander (nicht wegfliegen) — px bei Serie 1
  streakBoost: 0.06,   // + pro Serien-Schritt: Stücke fallen minimal weiter auseinander (gedeckelt niedrig, damit bei hoher Serie nichts wegfliegt)
  streakMax: 6,        // Deckel der Wucht-Steigerung
  rotFactor: 1,        // globaler Rotations-Faktor der Stücke
  zSlashFactor: 0.34,  // Z: Dauer je Einzel-Schlag (× cutDur) — blitzschnell
  zSlashStep: 0.7,     // Z: Abstand zwischen den drei Schlägen (× cutDur) → drei klar getrennte Blitze; enger = Z zerteilt früher
  zOvershoot: 1.2,     // Z: Überschlag der Schläge über die Ecken hinaus
  sparkCount: 18,      // Funken bei Serie 1
  sparkPerStreak: 2,   // + Funken pro Serien-Schritt
  // Klingen-Look: der Streich sieht nach Stahl aus (weiß-heißer Kern + kühler Glow), NICHT nach der Kartenfarbe.
  bladeTint: "#bcd6ff", // Glow-Ton der Klinge (kühles Stahlweiß); Kern bleibt weiß
  bladeTaper: true,     // Schwung-Form: Schnittlinie läuft zu beiden Enden spitz zu (Linse) statt Balken
  sparkMetal: true,     // Metall-Funken: weiß + warme orange (Stahl-auf-Stahl) statt suit-farbig
  bladeThick: 0.5,      // #klinge: Strichstärke des Schnitts (px) — nochmals um die HÄLFTE dünner (1 → 0,5): der Strich
                        // selbst ist nur noch ein Haar, der LOOK kommt aus dem Glow (glowMul) [TUNING]
  bladeThickZ: 0.75,    // Z-Einzelschlag minimal dicker (dasselbe Verhältnis 1,5× wie vorher), damit der blitzschnelle Durchzug klar registriert
  hallExtra: 1,         // #klinge: die Glut-Spur ist um diesen Betrag (px) dicker als die Klinge — mitverdünnt (war fest +2),
                        // sonst wäre der Nachhall bei halbierter Klinge plötzlich 5× so dick wie der Strich statt 3×.
  hallFade: 10,         // #klinge: Nachhall-Dauer (× Schlag-Dauer) — noch langsamer verglühen (6,5 → 10). Deckel ist die
                        // Ghost-Lebensdauer (sRest + max(sHalves,sSpark)); bei 10 endet die Glut auch im langsamsten
                        // Stich-Takt noch vor dem Abräumen des Ghosts. Höher → der Nachhall wird abgeschnitten.
  glowMul: 1.4,         // #klinge: gemeinsamer Faktor auf ALLE Glow-Radien (Klinge + Nachhall) — „mehr Glühen", ohne die
                        // vier abgestimmten Stufen einzeln nachzuziehen. Der dünnere Strich braucht ihn, um zu tragen.
  followSwing: 42,      // #klinge: EINHEITLICHER Nachschwung/Überschlag — die Klinge schwingt nach JEDEM Schnitt gleich
                        // weit (px, entlang ihrer Längsachse) durch. Gilt identisch für rechts/links/oben/Z (Performance-Look).
};
// Serien-Eskalation: 1× bei Serie 1, gedeckelt bei streakMax.
function sliceEsc(streak) {
  const lvl = Math.min(Math.max(streak, 1), KLINGE_TUNE.streakMax);
  return 1 + (lvl - 1) * KLINGE_TUNE.streakBoost;
}
// #188: Farb-Rampe der Crit-Explosion je Stufe — Lila → Magenta → Warmgold → Weißgold (koppelt an die goldene Groß-Ansage).
const CRIT_TIER_COLORS = ["#e879f9", "#e879f9", "#f472d0", "#ffc978", "#fff0b0"];
// #192: Sieg-Farbrampe (Grün → Gold) für Screen-Effekte bei großen NORMALEN Siegen (ohne Crit) — bewusst
// abgesetzt vom Crit-Lila. Basis = Sieg-Grün #5ab87a, zur Spitze hin Gold (koppelt an die goldene Groß-Ansage).
// Normale Siege erreichen nur tier≥2 (BRUTAL+); die unteren Einträge sind nur Fallback.
const WIN_TIER_COLORS = ["#5ab87a", "#5ab87a", "#5ab87a", "#8fce6a", "#d4a63a"];
const JITTER_X = 14, JITTER_Y = 10; // moderate Streuung (px); Panel ist overflow-hidden, nichts läuft raus
// #: Score-Zahlen fächern vertikal in eine aufsteigende Spalte (statt sich auf demselben Punkt zu stapeln). Jede neue
// Zahl rotiert durch diese Y-Versätze (px, um die Score-Zone) → deutlich weniger Overlap bei schnellen Stichen.
const FLOAT_LANES = [0, -30, 30, -58, 58];
// #: Treffer-Icons (Feuer/Pflanze/Eis/Blitz) an den Score-Floats vorerst STILLGELEGT — neue Icons kommen. Auf true zurück, sobald da.
const SHOW_HIT_ICONS = false;
// #: Gemeinsamer „Kartennummern"-Stil für ALLE Score-/Juice-Floats (durchsichtige Füllung + farbige Kontur + Glow) —
// gilt für Score, Formation & Krit; die großen Stufen-Ansagen (Stark/Brutal/Irre/Gottgleich/Lawine) bleiben ausgenommen.
// #ios-glow: Der Glow kommt aus der drop-shadow-Kette in index.css (`.card-num`/`.neon-num`), nicht mehr aus einem
// inline `text-shadow` — Begründung steht dort (WebKit schattiert bei transparenter Füllung die VOLLE Glyphe und
// überstrahlt die Kontur; außerdem schlug der Inline-Wert den `pointer: coarse`-Deckel). Aufrufer müssen daher die
// Klasse `card-num` ODER `neon-num` tragen; hier werden nur Farbe und Stärke durchgereicht.
//   strength  = Faktor auf beide Glow-Radien (1 = Basis der Score-Floats)
//   haloAlpha = Alpha-Suffix der weiten Schicht
const floatNumStyle = (color, stroke = 1.5, strength = 1, haloAlpha = "aa") => ({ fontFamily: '"Orbitron", "Helvetica Neue", Arial, sans-serif', fontWeight: 900,
  WebkitTextFillColor: "transparent", WebkitTextStroke: `${stroke}px ${color}`,
  "--num-glow-c": color, "--num-glow-c2": `${color}${haloAlpha}`, "--num-glow-s": strength });
const FORM_LINGER_MS = 1500; // Formations-Float bleibt ~1,5 s länger stehen (über den nächsten Stich hinaus) und klingt dann aus
// Entzerrung bei Ballung: spät in einem guten Lauf spannen die Stich-Gewinne mehrere Größenordnungen
// (ein Stich +5 Mio, der nächste +8.000) → die kleinen Score-Floats sind nur Rauschen und überlappen alles.
// Regel: NUR wenn viele Floats gleichzeitig leben („zu voll") UND ein Gewinn winzig gegenüber dem laufenden
// Größenmaßstab ist, wird sein Float unterdrückt. Der Score selbst zählt unverändert weiter — nur das Popup entfällt.
const FLOAT_DECLUTTER_MIN = 2;    // erst ab so vielen aktiven Score-Floats wird ausgedünnt (#: früher 3 → früher entzerren)
const FLOAT_MIN_RATIO     = 0.14; // Float nur zeigen, wenn Gewinn ≥ 14 % des laufenden Maßstabs (#: früher 8 % → mehr Mini-Gewinne raus)
const FLOAT_SCALE_DECAY   = 0.9;  // Maßstab = max(Gewinn, Maßstab·DECAY) → folgt der jüngsten Größenordnung, vergisst Einmal-Spitzen langsam
// #110: Karten-Aufdeck-Sound — DEZENTE Turbo-Kopplung der Abspielrate (leicht justierbar). Rate>1 = kürzer/schneller.
const CARDFLIP_RATE_REF = 700;  // ms-Referenz: unter diesem Stich-Takt wird der Sound schneller (bei ~1× bleibt Rate 1)
const CARDFLIP_RATE_CAP = 1.6;  // Deckel bewusst niedrig → bei MAX-Turbo bleibt ein leichtes Überlappen („MG"), wie gewünscht
const CARDFLIP_GAIN_CONST = 0.9; // #: konstante Flip-Lautstärke bei JEDEM Flip (Mitte zwischen altem Sieg-/Niederlage-Pegel)
const STICH_WIN_PITCH = 1.14;    // #finisher-standard: gewonnener Stich stimmt den Flip-Sound dezent höher (nur Standard-Finisher; leicht justierbar)
// Deterministischer Jitter aus einem Integer-Seed (kein Math.random im Render, #68) → [-amp, +amp].
const fjitter = (seed, amp) => { const s = Math.sin(seed * 127.1 + 311.7) * 43758.5; return +(((s - Math.floor(s)) * 2 - 1) * amp).toFixed(1); };

/* #laser: Polygon an einer Halbebene clippen (Sutherland-Hodgman) — behält die Seite mit signed-distance ≥ 0
   (Ebene durch (px,py), Normale (nx,ny)). Baustein fürs Zerteilen der Karte an einer Laserlinie. */
function clipHalf(poly, px, py, nx, ny) {
  const out = [];
  const sd = (p) => (p[0] - px) * nx + (p[1] - py) * ny;
  for (let i = 0; i < poly.length; i++) {
    const A = poly[i], B = poly[(i + 1) % poly.length];
    const da = sd(A), db = sd(B);
    if (da >= 0) out.push(A);
    if ((da >= 0) !== (db >= 0)) {
      const t = da / (da - db);
      out.push([A[0] + t * (B[0] - A[0]), A[1] + t * (B[1] - A[1])]);
    }
  }
  return out;
}

/* #laser: ZWEI getrennte Laserlinien (je {px,py Bruchteil, ang Grad}) zerteilen die Karte. Die Kartenbox (W×H,
   echter Pixelraum → Schnittkanten liegen visuell exakt auf den Lasern) wird nacheinander an beiden Linien in
   Halbebenen geschnitten → 2–4 Stücke (kein gemeinsamer Kreuzungspunkt nötig). Liefert je Stück den clip-Polygon-
   String + Auswärts-Flugrichtung (Schwerpunkt → weg von der Kartenmitte; Fallback-Jitter für ein mittiges Stück). */
function laserPieces(lines, W, H) {
  const rad = (d) => (d * Math.PI) / 180;
  let polys = [[[0, 0], [W, 0], [W, H], [0, H]]];
  for (const ln of lines) {
    const nx = -Math.sin(rad(ln.ang)), ny = Math.cos(rad(ln.ang)); // Normale zur Laserlinie
    const px = ln.px * W, py = ln.py * H;
    const next = [];
    for (const poly of polys) {
      const a = clipHalf(poly, px, py, nx, ny);
      const b = clipHalf(poly, px, py, -nx, -ny);
      if (a.length >= 3) next.push(a);
      if (b.length >= 3) next.push(b);
    }
    polys = next;
  }
  const cx = W / 2, cy = H / 2;
  return polys.map((poly, k) => {
    let sx = 0, sy = 0;
    for (const p of poly) { sx += p[0]; sy += p[1]; }
    const gx = sx / poly.length, gy = sy / poly.length;
    let dx = gx - cx, dy = gy - cy, len = Math.hypot(dx, dy);
    if (len < 8) { const a = rad(fjitter(k * 37 + 1, 180)); dx = Math.cos(a); dy = Math.sin(a); len = 1; }
    const clip = "polygon(" + poly.map(([x, y]) => `${((x / W) * 100).toFixed(2)}% ${((y / H) * 100).toFixed(2)}%`).join(", ") + ")";
    return { clip, mx: dx / len, my: dy / len };
  });
}

/* Eine Seite: gespielte Karte MIT Nachziehstapel dahinter (ragt nur nach außen).
   `overlay` = entkoppelter Layer im Karten-Slot (z. B. Niederlage-Ghosts), der NICHT pro Stich remountet
   (steht nach `children`, also im selben `relative`-Slot, aber außerhalb des trickNo-gekeyten Karten-Wrappers). */
function Side({ label, remaining, position = 0, deckLen = 0, children, overlay = null, backImage = null, slotRef = null, baseCard = false, dealFrom = "left" }) {
  const behind = Math.min(3, Math.max(0, remaining - 1));
  return (
    <div className={`bf-side flex flex-col items-center gap-2 shrink-0 ${dealFrom === "right" ? "is-right" : "is-left"}`}>
      <div className="bf-label text-[11px] uppercase tracking-wide opacity-55">{label}</div>
      {/* #deckflug: Deck-Stapel und Spielfläche sind ZWEI Kästen im selben Rahmen. Unterhalb von 1400 px liegen
          sie exakt aufeinander (beide absolut, `bf-sidebox` gibt das Maß vor) — das ist der Aufbau, den es immer
          gab. Ab 1400 px rückt der Stapel an den Rand und die Karte fliegt von dort auf die Fläche (index.css). */}
      <div className={`bf-sidebox relative ${dealFrom === "right" ? "is-right" : "is-left"}`}>
        {/* #feuer: STABILER Deck-Slot. slotRef zeigt auf DIESE Box — sie remountet NICHT pro Stich und fliegt nicht
            weg → das Feuer (an slotRef verankert) brennt durchgängig weiter, statt bei jedem Sieg/Niederlage neu zu
            starten. Seit der Trennung brennt damit der STAPEL, nicht die gespielte Karte: der Vorrat glüht, und die
            Karte trägt die Glut in den Stich hinaus (Entscheidung, s. #deckflug). */}
        <div ref={slotRef} className="bf-deck bf-slot relative">
          {/* #feuer: PERMANENTER Deck-Rücken als Sockel — liegt IMMER da (auch bei leerem Deck / nach 40 Stichen), damit der
              an den Slot verankerte Effekt (Feuer) auf einer sichtbaren Karte sitzt statt in der Luft zu hängen. Wird von
              dem Nachziehstapel überdeckt, solange etwas oben liegt. */}
          {baseCard && (
            <div className="absolute top-0 left-0"><CardBack label="" image={backImage} /></div>
          )}
          {Array.from({ length: behind }, (_, i) => (
            <div key={i} className="absolute top-0 left-0">
              <CardBack label="" image={backImage} />
            </div>
          ))}
        </div>
        {/* Spielfläche: hier landet die gespielte Karte. `bf-scale` trägt ab 1400 px den Kartenmaßstab, damit die
            Karte darin ihre eigene Bewegung (Flug/Flip/Wegfliegen) behält — Maßstab außen, Bewegung innen. */}
        <div className="bf-play bf-slot relative">
          <div className="bf-scale bf-cardbox">{children}</div>
          {overlay}
        </div>
      </div>
      {/* #deckflug: Ab 1400 px steht der Zähler unter dem STAPEL („wie weit ist das Deck") und das Label über
          der Spielfläche — beides gehört dorthin, wo die Sache liegt, über die es spricht. */}
      <div className="bf-count text-[11px] opacity-55">{tr("bf.trickCount", { n: position, total: deckLen })}</div>
    </div>
  );
}

/* #180 Flip-Reveal: die aufgedeckte Spielerkarte dreht sich aus dem Deck-Rücken (Prisma) in die Front
   (`front` = fertige Karte mit Zahl/Effekten). 3D-rotateY, Dauer an den Flip-Takt gekoppelt. Zwei Faces mit
   `backface-visibility: hidden`: erst die Rückseite, ab der Mitte die Front. Position:relative → malt (wie die
   Karte sonst) über die Ergebnis-Welle. Nur für die Spielerseite; bei reduzierter Bewegung nicht gerendert. */
/* `bf-cardbox` ist die KARTENGRÖSSE (104 × 144) — sie wächst ab 1400 px NICHT selbst, sondern wird vom
   `transform: scale()` des Slots mitgenommen (s. #buehne in index.css). Beides zu skalieren hieße quadrieren. */
function FlipReveal({ front, backImage, dur }) {
  return (
    <div className="as-flip3d bf-cardbox">
      <div className="as-flip3d-inner" style={{ animation: `as-flip-reveal ${dur}ms ease-out both`, willChange: "transform" }}>
        <div className="as-flip3d-face as-flip3d-back"><CardBack label="" image={backImage} /></div>
        <div className="as-flip3d-face as-flip3d-front">{front}</div>
      </div>
    </div>
  );
}

// #klinge: Geometrie der choreografierten Klinge je Einfahrrichtung (`dir`) & Serie (`streak`). Liefert die Karten-Stücke
// (clip-path + Flugvektor über `as-boom-shard` --sx/--sy/--sr) und die Schnittlinien-Segmente (--cut-rot, optional
// versetzt/gestaffelt). Die Wucht (Distanz/Drall) steigt über `sliceEsc(streak)`; die Score-Höhe fließt NICHT ein.
//   left → klassische +24°-Diagonale (Grundzug) · right → gespiegelte −24° · top → vertikaler Schnitt (Karte teilt sich LINKS/RECHTS)
//   z     → kohärenter X aus drei diagonalen Vollschlägen (╲ ╱ ╲), Karte zerfällt danach in VIER Dreieck-Stücke
function sliceGeometry(dir, streak) {
  const e = sliceEsc(streak), d = KLINGE_TUNE.baseDist * e, rf = KLINGE_TUNE.rotFactor, cutLen = 120;
  switch (dir) {
    case "left": // Klinge von LINKS → Diagonale +24° — der GRUNDZUG (läuft bei jedem Sieg, ×1.00)
      return { cuts: [{ rot: 24, len: cutLen }], pieces: [
        { clip: "polygon(0 0, 100% 0, 100% 66%, 0 34%)", sx: d,  sy: -30 * e, sr: 16 * e * rf },
        { clip: "polygon(0 34%, 100% 66%, 100% 100%, 0 100%)", sx: -d, sy: 60 * e, sr: -20 * e * rf } ] };
    case "top": // Klinge von OBEN → (fast) vertikaler Schnitt, Karte teilt sich in LINKS/RECHTS
      return { cuts: [{ rot: 90, len: cutLen }], pieces: [
        { clip: "polygon(0 0, 52% 0, 48% 100%, 0 100%)", sx: -d, sy: 14, sr: -14 * e * rf },
        { clip: "polygon(52% 0, 100% 0, 100% 100%, 48% 100%)", sx: d, sy: 14, sr: 14 * e * rf } ] };
    case "z": { // #312 ab ×2.0: ZWEI diagonale volle Schläge Ecke-zu-Ecke (╲ ╱) → sie bilden ein X und teilen die Karte
                // entlang genau dieser Diagonalen in VIER Dreieck-Stücke (oben/rechts/unten/links), erst NACHDEM beide
                // Schläge durch sind (`hold`). Gestaffelt → zwei klar getrennte Blitze (Doppel-Slash) + zwei Sound-Hits.
      const DIAG = Math.atan2(144, 104) * 180 / Math.PI; // Karten-Diagonalwinkel (Ecke→Ecke) → Schlag deckt sich mit den Bruchkanten
      const step = KLINGE_TUNE.zSlashStep;
      const len = Math.hypot(104, 144) * KLINGE_TUNE.zOvershoot; // volle Diagonale + Überschlag → Schlag geht ganz durch
      const mk = (rot, stg) => ({ rot, len, cx: 50, cy: 50, stagger: stg, fast: true, thick: true });
      return {
        cuts: [mk(DIAG, 0), mk(-DIAG, step)],                     // ╲ ╱ (X)
        hold: step + KLINGE_TUNE.zSlashFactor,                    // Karte hält (× cutDur), bis beide Schläge durch sind
        pieces: [
          { clip: "polygon(0 0, 100% 0, 50% 50%)",       sx: 0,  sy: -d, sr: -14 * e * rf }, // oben
          { clip: "polygon(100% 0, 100% 100%, 50% 50%)", sx: d,  sy: 0,  sr: 14 * e * rf },  // rechts
          { clip: "polygon(100% 100%, 0 100%, 50% 50%)", sx: 0,  sy: d,  sr: 14 * e * rf },  // unten
          { clip: "polygon(0 100%, 0 0, 50% 50%)",       sx: -d, sy: 0,  sr: -14 * e * rf } ] }; // links
    }
    case "right":
    default: // Klinge von RECHTS → gespiegelte −24°-Diagonale (kommt ab ×1.25 im Wechsel mit LINKS dazu)
      return { cuts: [{ rot: -24, len: cutLen }], pieces: [
        { clip: "polygon(0 0, 100% 0, 100% 34%, 0 66%)", sx: -d, sy: -30 * e, sr: -16 * e * rf },
        { clip: "polygon(0 66%, 100% 34%, 100% 100%, 0 100%)", sx: d, sy: 60 * e, sr: 20 * e * rf } ] };
  }
}

/* #177 Klingenschnitt: Overlay über der Verliererkarte (fixe 104×144-Box). Rendert zwei clip-path-Klone der
   Karte (Ober-/Unterteil entlang −24°), eine aus der Mitte wachsende Schnittlinie in Suit-Farbe und ~18 Funken
   (≈40 % weiß / 60 % Suit-Farbe, ein paar „Konfetti"-Rechtecke). Deterministisch aus `seed` (kein Math.random
   im Render, #68). Alle Dauern kommen an den Flip-Takt gekoppelt rein → kein Überlaufen in den nächsten Stich.
   Elemente entfernen sich mit dem Karten-Remount des nächsten Stichs (key nach trickNo) → kein Stapeln. */
export function SliceFx({ cardEl, color, halvesDur, cutDur, sparkDur, seed, delay = 0, intensity = 0, scale = 1, laser = false, dir = "right", streak = 0, bladeColor = null }) {
  // #188/#klinge: Die KLINGE ist als choreografierte Performance umgebaut: KEIN Doppelschnitt mehr auf EINE Karte —
  // stattdessen wechselt die Einfahrrichtung (`dir`) über einen per-Stich-Zähler, dessen Zyklus-Länge am Siegesserie-
  // Multiplikator hängt (Aufrufer wählt via sliceMove(mult, seq)), und die Wucht steigt mit der Serie (sliceEsc, aus
  // `streak`). Die Score-Höhe fließt NICHT ein. Der LASER-Schnitt (laser) behält seine
  // eigene, score-skalierte Charakteristik (Funkenzahl/-weite über `intensity`).
  const e = sliceEsc(streak);           // Serien-Eskalation (nur Klinge; Laser ignoriert sie)
  const sepMul = 1 + intensity * 0.6;   // Laser-Stück-Distanz (Klinge holt ihre Distanz aus sliceGeometry(streak))
  const radMul = laser ? 1 + intensity * 0.6 : 1 + (e - 1) * 0.5;   // Funken-Streuung: Laser score-, Klinge serien-getrieben
  const N = laser
    ? Math.max(6, Math.round((18 + intensity * 14) * scale))        // Laser: 18..32, score-skaliert
    : Math.max(6, Math.round((KLINGE_TUNE.sparkCount + (Math.min(Math.max(streak, 1), KLINGE_TUNE.streakMax) - 1) * KLINGE_TUNE.sparkPerStreak) * scale)); // Klinge: serien-skaliert
  const cutLen = laser ? Math.round(120 * (1 + intensity * 0.4)) : 120; // Klinge: konstante Schnittlinie (score-unabhängig)
  const sparks = Array.from({ length: N }, (_, i) => {
    const ang = (i / N) * Math.PI * 2 + fjitter(seed * 3 + i * 7, 0.55); // gleichmäßiger Kranz + leichter Jitter
    const rad = (46 + Math.abs(fjitter(seed * 5 + i * 13, 70))) * radMul; // 46..116 px × Intensität
    return {
      i,
      dx: (Math.cos(ang) * rad).toFixed(1),
      dy: (Math.sin(ang) * rad).toFixed(1),
      white: i % 5 < 2,        // ~40 % weiß, Rest Suit-Farbe
      confetti: i % 6 === 0,   // ~3 kleine Konfetti-Rechtecke in Suit-Farbe
    };
  });
  const ease = "cubic-bezier(0.3, 0.7, 0.3, 1)";
  // Schnittlinie (Winkel als CSS-Var → dasselbe Keyframe je Segment mit anderem --cut-rot). `opts` erlaubt versetzte
  // Position (cx/cy %) + eigene Länge + zeitlichen Versatz (stagger × cutDur) → der Z-Schnitt zeichnet sich als 3 Segmente.
  // #klinge: Der Streich ist ein STAHL-Schwung, nicht die Kartenfarbe: weiß-heißer Kern (Verlauf), kühler Glow und —
  // wenn `bladeTaper` — eine zu beiden Enden spitz zulaufende Linsenform (Katana-Wisch) statt eines Balkens.
  // #klinge-laser: Der Streich glüht jetzt in der DECKFARBE (weiß-heißer Kern bleibt) und hinterlässt einen kurz
  // sichtbaren NACHHALL (glühende Spur, die am Einschlag stehen bleibt und ausglüht) → Look einer schnell durchgezogenen
  // Laserklinge. bladeGlow = Deckfarbe (Fallback: kühles Stahlweiß, falls kein Deck gesetzt ist, z. B. reine Options-Sicht).
  const bladeGlow = bladeColor || KLINGE_TUNE.bladeTint;
  const bladeLens = "polygon(0 50%, 4% 0, 96% 0, 100% 50%, 96% 100%, 4% 100%)";
  const cutLine = (rot, key, opts = {}) => {
    const len = opts.len || cutLen;
    const h = opts.thick ? KLINGE_TUNE.bladeThickZ : KLINGE_TUNE.bladeThick;   // #klinge: dünne Klinge (Z minimal dicker)
    const dur = opts.fast ? Math.round(cutDur * KLINGE_TUNE.zSlashFactor) : cutDur; // Z-Einzelschlag fährt blitzschnell durch
    const stMs = Math.round((opts.stagger || 0) * cutDur);
    const startMs = delay + stMs;
    const hallDur = Math.round(dur * KLINGE_TUNE.hallFade);   // #klinge: Nachhall-Dauer (Begründung am Tuning-Set) [TUNING]
    const hh = h + KLINGE_TUNE.hallExtra;                     // Dicke der Glut-Spur (mit der Klinge mitverdünnt)
    // #klinge: EIN Faktor auf alle Glow-Radien (glowMul). `gr(basis, jeIntensity)` → gerundeter px-Wert; die Staffelung
    // der vier Stufen (Kern → Halo) bleibt dieselbe, sie wird nur gemeinsam skaliert.
    const gr = (base, per = 0) => Math.round((base + intensity * per) * KLINGE_TUNE.glowMul);
    const common = { position: "absolute", left: `${opts.cx ?? 50}%`, top: `${opts.cy ?? 50}%`, width: len, marginLeft: -len / 2,
      transformOrigin: "center", clipPath: KLINGE_TUNE.bladeTaper ? bladeLens : undefined, borderRadius: KLINGE_TUNE.bladeTaper ? undefined : 2 };
    return (
      // display:contents → der Wrapper erzeugt keine eigene Box; beide Linien positionieren sich relativ zur SliceFx-Bühne.
      <div key={key} style={{ display: "contents" }}>
        {/* NACHHALL/Glut-Spur (Deckfarbe): bleibt am Einschlag stehen (kein Nachschwung) und glüht SATT aus (verstärkt). */}
        <div style={{ ...common, height: hh, marginTop: -hh / 2, filter: "blur(0.5px)",
          background: `linear-gradient(90deg, transparent 0%, ${bladeGlow} 20%, #ffffff 50%, ${bladeGlow} 80%, transparent 100%)`,
          boxShadow: `0 0 ${gr(20)}px ${bladeGlow}, 0 0 ${gr(52, 22)}px ${bladeGlow}, 0 0 ${gr(96, 34)}px ${bladeGlow}, 0 0 ${gr(150, 44)}px ${bladeGlow}cc`, // #klinge: dünne Klinge → kräftigerer, weiter reichender Glow (Halo-Alpha aa → cc)
          "--cut-rot": `${rot}deg`, animation: `as-blade-hall ${hallDur}ms ease-out ${startMs}ms both` }} />
        {/* Die Klinge selbst: weiß-heißer Kern + Deck-Glow, wächst heraus und schwingt einheitlich durch (--cut-swing). */}
        <div style={{ ...common, height: h, marginTop: -h / 2,
          background: `linear-gradient(90deg, transparent 0%, ${bladeGlow}cc 12%, #ffffff 50%, ${bladeGlow}cc 88%, transparent 100%)`,
          boxShadow: `0 0 ${gr(8)}px #ffffff, 0 0 ${gr(22, 10)}px ${bladeGlow}, 0 0 ${gr(42, 16)}px ${bladeGlow}, 0 0 ${gr(64, 20)}px ${bladeGlow}cc`,
          "--cut-rot": `${rot}deg`, "--cut-swing": `${KLINGE_TUNE.followSwing}px`, animation: `as-cut-line ${dur}ms ease-out ${startMs}ms both` }} />
      </div>
    );
  };

  // LASER-SCHNITT (#deckshop): EIN Laser schießt über das GANZE Feld und trifft die Gegnerkarte; er kommt bei jedem
  // Sieg aus einer ANDEREN Richtung (volle 360°, deterministisch aus der Stich-Nr.). Die Karte teilt sich ENTLANG der
  // Laserlinie (Sektoren im echten Karten-Pixelraum → Schnittkante liegt exakt auf dem Strahl). Wichtig: die Karte
  // bleibt INTAKT & STILL, bis der Strahl durchgezogen ist (delay+cut) — erst DANN bersten die Stücke auseinander.
  if (laser) {
    const dist = 44 * sepMul;                               // Auswärts-Flug der Karten-Stücke nach dem Schnitt
    // EIN Laser, der bei jedem Sieg aus einer ANDEREN Richtung übers Battlefield kommt (volle 360°) und die Karte
    // durchschneidet. Winkel & Durchlaufpunkt sind deterministisch aus `seed` (= Stich-Nr.) → jede Runde eine andere
    // Position/Richtung, aber der Punkt liegt IN der Karte → sie wird immer sauber in zwei Stücke geteilt.
    const ang = fjitter(seed * 3 + 1, 180);                                  // −180..180 → volle 360°
    const px = clamp(0.5 + fjitter(seed * 7, 0.24), 0.26, 0.74);            // Durchlaufpunkt auf der Karte (variiert)
    const py = clamp(0.5 + fjitter(seed * 11, 0.24), 0.26, 0.74);
    const lines = [{ px, py, ang }];
    const pieces = laserPieces(lines, 104, 144);            // Kartenbox 104×144 (echte Winkel-Ausrichtung)
    const cutMs = Math.round(cutDur);                       // Strahl-Durchzug; danach erst der Zerfall
    // Strahl spannt über das GANZE Feld (viewport-breit) → das overflow-hidden Panel klippt an seinen Rändern.
    // Wächst per as-cut-line (scaleX) aus seinem Treffer-Punkt heraus, in seinem echten Winkel.
    const beamAt = (ln, k) => (
      <div key={`lb${k}`} className="absolute" style={{ left: `${(ln.px * 100).toFixed(1)}%`, top: `${(ln.py * 100).toFixed(1)}%` }}>
        <div style={{ position: "absolute", left: 0, top: 0, width: "220vw", height: 2, marginLeft: "-110vw", marginTop: -1,
          background: `linear-gradient(90deg, transparent 2%, ${color} 12%, ${color} 46%, #ffffff 50%, ${color} 54%, ${color} 88%, transparent 98%)`,
          boxShadow: `0 0 ${(10 + intensity * 8).toFixed(0)}px ${color}, 0 0 ${(26 + intensity * 12).toFixed(0)}px ${color}, 0 0 5px 1px #ffffffdd`,
          transformOrigin: "center", "--cut-rot": `${ln.ang}deg`, animation: `as-cut-line ${cutMs}ms ease-out ${delay}ms both` }} />
        {/* Funken am Treffer-Punkt (voller Kranz am einzelnen Laser), zünden mit dem Schnitt (delay+cut). */}
        {sparks.filter((s) => s.i % lines.length === k).map((s) => (
          <div key={s.i} style={{ position: "absolute", left: 0, top: 0,
            width: s.confetti ? 6 : 4, height: s.confetti ? 3 : 4, borderRadius: s.confetti ? 1 : "50%",
            background: s.white ? "#ffffff" : color, boxShadow: `0 0 5px ${s.white ? "#ffffff" : color}`,
            "--dx": `${s.dx}px`, "--dy": `${s.dy}px`,
            animation: `as-spark ${sparkDur}ms ease-out ${delay + cutMs}ms both`, willChange: "transform, opacity" }} />
        ))}
      </div>
    );
    return (
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        {/* Karten-Stücke entlang der Laserlinie — bleiben ganz & still bis delay+cut, dann bersten sie weg. */}
        {pieces.map((s, k) => (
          <div key={`lw${k}`} className="absolute inset-0" style={{ clipPath: s.clip,
            "--sx": `${(s.mx * dist).toFixed(1)}px`, "--sy": `${(s.my * dist).toFixed(1)}px`, "--sr": `${fjitter(seed * 7 + k * 5, 10)}deg`,
            animation: `as-laser-wedge ${(halvesDur * 0.72).toFixed(0)}ms ${ease} ${delay + cutMs}ms both`, willChange: "transform, opacity" }}>{cardEl}</div>
        ))}
        {/* Ein Laser (zufällige Richtung/Position übers Feld). */}
        {lines.map((ln, k) => beamAt(ln, k))}
      </div>
    );
  }
  // `delay` (ms = Ruhe-Beat) + fill-mode `both`: die Karte liegt erst still, dann setzt der Schnitt ein — während der
  // Wartezeit zeigen die Teile den 0 %-Zustand (Karte ganz), Schnittlinie/Funken bleiben unsichtbar. Das Wegfloaten
  // übernimmt der Wrapper (as-loss-drift-rand) mit eigenem, späterem Delay (erst NACH dem Schnitt).
  // #klinge: Geometrie aus der Einfahrrichtung — die Karten-Stücke (clip-path-Klone) fliegen über as-boom-shard weg,
  // die Schnittlinien-Segmente wachsen über as-cut-line. Ein Klingen-Sieg = EIN Schnitt (die Choreografie entsteht über
  // die WECHSELNDE Richtung aufeinanderfolgender Stiche, nicht über Mehrfachschnitte auf derselben Karte).
  const geo = sliceGeometry(dir, streak);
  // #klinge: Der Z-Schlag hält die Karte ganz, bis die drei Schläge durch sind (geo.hold × cutDur), DANN bersten die
  // Stücke + zünden die Funken. Für die Einzelschnitte (rechts/links/oben) ist hold 0 → unverändertes Timing.
  const holdMs = geo.hold ? Math.round(geo.hold * cutDur) : 0;
  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
      {geo.pieces.map((p, k) => (
        <div key={`sp${k}`} className="absolute inset-0" style={{ clipPath: p.clip,
          "--sx": `${p.sx.toFixed(1)}px`, "--sy": `${p.sy.toFixed(1)}px`, "--sr": `${p.sr.toFixed(0)}deg`,
          animation: `as-boom-shard ${halvesDur}ms ${ease} ${delay + holdMs}ms both`, willChange: "transform, opacity" }}>{cardEl}</div>
      ))}
      {geo.cuts.map((c, k) => cutLine(c.rot, `cut${k}`, c))}
      {/* Funken aus dem Schnittzentrum — beim Z erst mit dem Bersten nach den drei Schlägen. Metall-Funken (weiß +
          warme orange, Stahl-auf-Stahl) statt suit-farbig, passend zum Stahl-Schwung. */}
      {sparks.map((s) => {
        const sc = KLINGE_TUNE.sparkMetal ? (s.white ? "#ffffff" : (s.i % 3 === 0 ? "#ffb060" : "#dfeaff")) : (s.white ? "#ffffff" : color);
        return (
          <div key={s.i} style={{
            position: "absolute", left: "50%", top: "50%",
            width: s.confetti ? 6 : 4, height: s.confetti ? 3 : 4, borderRadius: s.confetti ? 1 : "50%",
            background: sc, boxShadow: `0 0 5px ${sc}`,
            "--dx": `${s.dx}px`, "--dy": `${s.dy}px`,
            animation: `as-spark ${sparkDur}ms ease-out ${delay + holdMs}ms both`, willChange: "transform, opacity",
          }} />
        );
      })}
    </div>
  );
}

// #: ExplosionFx (Krit-Partikelexplosion) entfernt — Krit-Finisher-Animationen raus.

/* #177+/#186: Schnitt-/Explosions-Ghost-Pool für BEIDE Seiten. Verliert eine Karte (Spieler bei Niederlage,
   Gegner bei Sieg), wird sie in-place ausgeblendet und stattdessen ein entkoppelter Klon in diesem Layer
   (im jeweiligen Karten-Slot, absolute inset-0) gerendert: die Karte liegt erst kurz (rest), dann setzt der Schnitt
   bzw. die Pixel-Explosion IN PLACE ein, und DANACH floatet der Ghost weg (as-loss-drift-rand, #187: zufällige
   Richtung rundum, deterministisch aus seed; nur beim Slice — die Explosion zerbirst an Ort und Stelle). Weil der
   Pool NICHT pro Stich remountet, floatet der Ghost in voller Länge aus und überlappt bei hohem Turbo/vielen Siegen
   mit dem nächsten Stich — Spieler- UND Gegnerkarte fühlen sich damit gleich lang an (#186). Ghosts entfernen sich
   nach ihrer Lebensdauer selbst. */
/* #kompositor-cleanup: Die DOM-Fassung der Aurora ist entfallen — und mit ihr die letzte Ebene, die `FieldFxLayer`
   überhaupt noch gerendert hat (alle anderen Feld-Effekte waren längst auf Pixi/WebGL umgezogen, die Komponente gab
   für sie `null` zurück). Damit gab es Aurora DREIFACH: raw-WebGL-Canvas, Kompositor-Ebene und diese DOM-Bögen mit
   einem sichtbar anderen Look. Erreichbar war die DOM-Fassung ohnehin nur im Preview/Dev über `?fx=dom`; in
   Produktion lief immer WebGL. Genau so entsteht Drift: drei Fassungen, von denen zwei niemand mehr ansieht. */
function SlashGhostLayer({ ghosts }) {
  return (
    <>
      {ghosts.map((g) => {
        const cardEl = (
          <Card suit={g.suit} value={g.value} baseRank={g.baseRank} stichBonus={g.stichBonus}
            ionStacks={g.ionStacks} green={g.green}
            forged={g.forged || 0} branded={g.branded || 0} growth={g.growth || 0} colonized={g.colonized || 0}
            allyColor={g.allyColor} frontImage={g.frontImage} />
        );
        // Reihenfolge (Wunsch): Karte liegt (rest) → Klingenschnitt IN PLACE (delay = g.rest) → DANACH floatet der
        // Ghost weg. #187: Slice driftet nach dem SCHNITT (driftDelay = rest + cut) in eine ZUFÄLLIGE Richtung
        // (rundum, deterministisch aus g.seed via fjitter, kein Neu-Würfeln bei Re-Render).
        // #klinge: Nach dem Schnitt fällt die Karte nur ein KLEINES Stück auseinander (die Stücke stieben über
        // as-boom-shard) und wird ausgeblendet — sie fliegt NICHT mehr quer übers Feld weg (früher 40..66 px in eine
        // zufällige 360°-Richtung → bei Turbo/vielen Stichen überdeckte das alles). Der Wrapper macht jetzt nur noch
        // eine dezente Schwerkraft: leicht nach unten + minimaler Seiten-Jitter.
        const drx = fjitter(g.seed * 3 + 2, 3);                              // −3..3 px minimaler Seiten-Jitter
        const dry = 4 + Math.abs(fjitter(g.seed * 5 + 3, 5));                // 4..9 px leicht nach unten (Schwerkraft)
        const drot = fjitter(g.seed * 7 + 5, 5);                             // −5..5° minimale Rotation
        // #klinge-z: Der Z-Schlag hält die Karte GANZ, bis alle drei Schläge durch sind (zHold), erst DANN berstet sie
        // (SliceFx: pieces starten bei delay+holdMs). Der Float-Away muss diese Haltezeit mitnehmen, sonst driftet die
        // Karte im Turbo schon weg, BEVOR sie überhaupt zerteilt ist. Andere Schnitte bersten sofort → +cut wie gehabt.
        const zHoldMs = (g.sliceDir === "z")
          ? Math.round((KLINGE_TUNE.zSlashStep + KLINGE_TUNE.zSlashFactor) * g.cut) : 0;
        const driftDelay = g.rest + Math.max(g.cut, zHoldMs); // Float-Away startet NACH dem Schnitt (Z: nach dem Bersten)
        return (
          <div key={g.id} className="absolute inset-0 pointer-events-none" aria-hidden="true"
            style={{ animation: `as-loss-drift-rand ${g.float}ms cubic-bezier(0.2, 0.6, 0.3, 1) ${driftDelay}ms forwards`, willChange: "transform",
                     "--drx": `${drx.toFixed(1)}px`, "--dry": `${dry.toFixed(1)}px`, "--drot": `${drot}deg` }}>
            <SliceFx cardEl={cardEl} color={g.color} bladeColor={g.bladeColor} halvesDur={g.halves} cutDur={g.cut} sparkDur={g.spark} seed={g.seed} delay={g.rest} intensity={g.fxP} scale={g.scale} dir={g.sliceDir} streak={g.streak} />
          </div>
        );
      })}
    </>
  );
}

// #: CritScreenFx (Vollbild-Flash/Vignette bei Krit) entfernt — Krit-Finisher-Animationen raus.

export function Battlefield({ lastTrick, remaining = TRICKS_PER_CYCLE, deckLen = TRICKS_PER_CYCLE, flipMs = 1000, pe = {}, heat = null, oppDeck = "stat", score = 0,
  // Feuer-Rework (#206): geschmiedete Dauerwerte (eigene Karten) + aktive Brandmarken (Gegnerkarten) für die Karten-Indikatoren.
  forged = {}, brandActive = {},
  // Pflanze-Rework (#211): Wachstum je eigener Karte-id (Wachstumsring + grüne Zahl) + kolonisierte Gegnerkarten (Ausläufer-Marker).
  growth = {}, colonized = {},
  // #190 Kosmetik: gewähltes Spieler-Deck (front=Rahmen, back=Cover) + Battlefield-Skin ({desktop,mobile}|null).
  // Defaults = bestehende Karten → ohne Auswahl identisches Verhalten (Gegner-Deck bleibt OPP_DECK_SKINS).
  deckFront = cardFrontImg, deckBack = cardBackImg, battlefield = null,
  // #deckshop: Deck-Werkstatt-Animationen (an das aktive Theme gekoppelt): deckA1 = Deck-Hauptfarbe für
  // #kategorien: zwei UNABHÄNGIGE Feld-Slots — bgFx = reiner Hintergrund-Effekt (Aurora), bgFinisher = Hintergrund-
  // Finisher mit Stich-Interaktion (Glutfunken). Beide können gleichzeitig aktiv sein (bg hinter Finisher gerendert).
  deckA1 = null, deckA2 = null, bgFx = null, bgFinisher = null, auroraDeck = false, neonsurfDeck = false, starfieldDeck = false, cubematrixDeck = false, cubematrixWire = false, // #glutfunken-raus: emberDeck entfernt
  cardAnims = [], // #318 aktive Karten-Animationen (group "anim", stapelbar) — von App via activeCardAnims

  // #finisher: gewählter Sieg-Finisher — "standard" (Gratis-Default: Verliererkarte fliegt zur Seite weg + höherer
  // Flip-Sound) oder "klinge" (choreografierter Klingen-Schnitt). Default = "standard".
  finisher = "standard",
  scorchDeck = false, // #319 Scorch-Farbmodus: false = warmes Feuer, true = Deckfarbe
  blackholeDeck = false, // #320 Schwarzes-Loch-Farbmodus: false = Standard (blau/pink), true = Deckfarbe (deckA1/deckA2)
  klingeDeck = false,   // #klinge-deck: false = kühles Stahlweiß (bladeTint), true = Klinge glüht in der Deckfarbe
  hologridDeck = false, // #hologrid-deck: false = Standard Cyan/Magenta, true = Hologrid in der Deckfarbe
  // #322–#326 Gottgleich-Prunk (PIXI): gewählter Prunk-Effekt ("gottStandard" = kein Prunk) + dessen Farbmodus.
  gottEffect = "gottStandard", gottDeck = false,
  // #spezial Archetyp-Effekte (Hitze/Moos/Blitz/Eis): Farbmodus false = Standard-Neon, true = Deckfarbe (deckA1/deckA2).
  archDeckColor = false,
  // #200/#363 B: „Effekte reduziert" (aus|mobile|an). Löst zusammen mit prefers-reduced-motion den `reduced`-Modus aus.
  reducedFx = "aus",
  // #389 Floating-Text ausblenden (Default sichtbar = false). Score/Werte zählen unabhängig weiter — nur die aufsteigenden
  // Popups verschwinden. Die großen Ansagen (Stark/Brutal/Irre/Gottgleich, bigFloats) bleiben IMMER sichtbar.
  hideFloatScore = false, hideFloatMult = false, hideFloatWinLose = false,
  // Stich-Aufschlüsselung (§17) unter dem Feld: Basis × Serie × Perks × Form × Crit (+ Direkt) = Summe.
  // Default SICHTBAR (false) wie die Floating-Text-Schalter; die Zeile hält ihre Höhe auch ausgeblendet.
  hideBreakdown = false,
  // #perf-overlay: „Das Brett ist wirklich zu sehen." Jede Auswahl-Phase (Architekt/Perk/Skill/Aufstellung/Ziel/
  // Legendär) legt ein Vollbild-Overlay ÜBER das weiterhin gemountete Battlefield — die Effekt-Schleifen liefen
  // dort mit voller Rate für ein Bild, das niemand sieht. Gemessen: 99 von 386 Rucklern eines Laufs fielen in
  // 4 Architekt-Besuche. Bisher hielt nur `visibilitychange` (Tab im Hintergrund) sie an.
  boardVisible = true }) {
  /* #perf-scroll: …und „zu sehen" heißt AUCH: nicht aus dem Bild gescrollt. Die Spielseite ist deutlich höher als
     ein Handy-Viewport (Fraktions-Panels unter dem Brett); wer nach unten scrollt, lässt das Battlefield oben
     stehen — bisher liefen alle Effektschleifen dort mit voller Rate für ein Bild, das niemand sieht. Es gab im
     ganzen Projekt keine einzige Stelle, die auf Scrollen reagiert hat.
     Derselbe Hebel wie beim Overlay-Gate, nur die andere Achse. `rootMargin` startet die Effekte ein Stück VOR dem
     Einscrollen wieder — sonst sieht man beim Hochscrollen das Anlaufen. */
  const klinge = finisher === "klinge"; // Klinge-Schnitt aktiv? Sonst schlichter Standard-Wegflug.
  const scorch = finisher === "scorch"; // #319 Scorch: Laser + organischer Burn statt Wegflug.
  const hologrid = finisher === "hologridSlice"; // #321 Hologrid-Slice: Laser-Reveal + Kachel-Zerfall statt Wegflug.
  const blackhole = finisher === "blackhole"; // #320 Schwarzes Loch: persistentes Serien-Loch saugt die Gegnerkarte ein.
  // #: Dreistufig. `reduced` (minimal) behält EXAKT die alte Semantik → Kartenflip/Ambient/Finisher/Glows aus.
  // `lite` (balanced ODER minimal) kappt zusätzlich nur die TEUREN Dauer-/Schwarm-Layer: Screen-Shake + die
  // Glutfunken-Partikelfontänen (bis 72 DOM-Nodes/Stich). In „ausgewogen" ist reduced=false (Feel-Good bleibt),
  // aber lite=true → die Ruckel-Treiber fallen weg. Finisher bleiben bewusst unangetastet (Nutzer-Wunsch).
  const fxLevel = useFxLevel(reducedFx);
  const reduced = fxLevel === "minimal";
  const lite    = fxLevel !== "full";
  /* Die Shader-Feldeffekte laufen über den Feld-Kompositor — EIN Renderpfad, in Preview wie in Produktion. Es gab
     hier lange eine env-abhängige Verzweigung („in Prod immer WebGL, im Preview A/B gegen die DOM-Fassung"); die
     DOM-Fassungen sind entfallen, damit auch die Verzweigung. Opt-in bleibt es: eine Ebene baut nur auf, wenn der
     Spieler den Effekt gewählt hat, und der Kompositor-Chunk lädt lazy. */
  const auroraGL = bgFx === "aurora" && !!deckA1;
  const neonsurfGL = bgFx === "neonsurf" && !!deckA1;
  const pixiFin = PIXI_FIELD.has(bgFinisher) && !!deckA1;      // BG-Finisher (Komet/Sternenfeld) läuft auf der GPU-Bühne (Pixi)
  const cubeMatrixOn = bgFx === "cubematrix" && !!deckA1;      // #317 Cube-Matrix: eigene Canvas-Bühne (musik-reaktiv)
  /* #boden-zeile: Läuft ein BODEN-Effekt, steht die Stich-Aufschlüsselung ÜBER den Karten statt darunter.
     Gemessen (390×844, Produktionsbuild): Brett 358×347, der Boden beginnt laut `EFFECT_ZONES.mobile.y` (86 %)
     bei 298 px — die Zeile lag mit 302–322 px komplett darin, und über Würfeln/Brandung ist die feine
     Faktorenkette dort nicht mehr zu lesen.
     NUR die Aufschlüsselung wandert. Die Sieg/Niederlage-Ansage bleibt, wo sie war (Feldmitte unter den
     Karten): sie ist großer, fetter, farbiger Text und über dem Effekt weiterhin lesbar — und sie ist die
     Stelle, an der das Auge nach jedem Stich ohnehin steht.
     Nur mobil (MOBILE_MQ = dieselbe 640-px-Grenze, an der auch die Zonen-Wahl hängt) und nur bei den zwei
     BODEN-Effekten: Aurora ist ein Himmels-Effekt (oben), Sternenfeld/Komet sind Finisher (kurz, kein Dauerbild). */
  const bodenFx = bgFx === "cubematrix" || bgFx === "neonsurf";
  const ketteOben = useMediaQuery(MOBILE_MQ) && bodenFx;
  /* Die drei Abstände der Spalte (Zeile · Kartenreihe · Ansage) werden dabei UMVERTEILT, nicht gekürzt:
     4+32+16 = 52 px im Normalfall, −12+24+40 = 52 px mit der Zeile oben. Der negative Abstand holt die Zeile
     in das obere Panel-Polster hinein (`p-6` = 24 px) — die Hälfte davon war über ihr ungenutzte Luft, und
     jedes Pixel, das sie dort gewinnt, ist ein Pixel, das die Karten weiter vom Effekt weg stehen. Die Panelhöhe bleibt damit gleich —
     und das ist hier keine Kosmetik, sondern die Bedingung, unter der die Verschiebung überhaupt etwas
     bringt: das Effekt-Band ist ein PROZENTSATZ der Panelhöhe (`EFFECT_ZONES.mobile.y` = 86 %). Ein kürzeres
     Panel zöge den Boden mit nach oben, die Karten kämen ihm also genauso nah wie vorher. Wer an einem der
     drei Werte dreht, muss einen anderen gegenrechnen — der Wächter addiert beide Seiten. */
  // #zone: fest verankerter Feld-Boden → Effekt-Front bündig am unteren Panel-Rahmen (höhenunabhängig, für ALLE Boden-Effekte).
  const cmZone = floorEffectPlacement();
  // Panel = Feld-Rahmen (Ref für Layout/Position), oppSlot = Gegnerkarten-Slot.
  const panelRef = useRef(null);
  /* #perf-scroll: …und „zu sehen" heißt AUCH: nicht aus dem Bild gescrollt. Die Spielseite ist deutlich höher als
     ein Handy-Viewport (Fraktions-Panels unter dem Brett); wer nach unten scrollt, lässt das Battlefield oben
     stehen — bisher liefen alle Effektschleifen dort mit voller Rate für ein Bild, das niemand sieht. Es gab im
     ganzen Projekt keine einzige Stelle, die auf Scrollen reagiert hat. Derselbe Hebel wie das Overlay-Gate, nur
     die andere Achse. */
  const panelOnScreen = useOnScreen(panelRef);   // Hook IMMER aufrufen, erst danach verknüpfen (Hook-Regel)
  const boardOn = boardVisible && panelOnScreen;
  /* #perf-scroll: Scroll-Wechsel als Mark, damit der Perf-Report Ruckler daran festmachen kann. Ohne den Mark
     landen sie im Eimer der laufenden Phase und sind von normalem Spiel nicht zu unterscheiden — bei einem
     Verdacht wie „beim Zurückscrollen bricht die Bildrate ein" ist genau das die Frage. */
  useEffect(() => { perfMark(panelOnScreen ? "scroll:board-in" : "scroll:board-out"); }, [panelOnScreen]);
  const oppSlotRef = useRef(null);
  // #376 Neon-Brandung Loop-Bett (Plasma-See-Ambience): startet/endet mit dem aktiven Effekt. Nahtloser Loop über die
  // gleichförmige Mitte der 29,9-s-Aufnahme (loopStart/loopEnd meiden die Anfang-/Ende-Fades → kein Naht-Klick). Gating
  // (Pause/Overlays/Victory) erledigt die bestehende Loop-Suspend-Logik; beim Deselektieren/Unmount sanft ausklingen.
  const surfSndRef = useRef(null);
  useEffect(() => {
    if (!neonsurfGL) return undefined;
    surfSndRef.current = audio.loop("fx_neonsurf", { gain: 0.7, loopStart: 1.5, loopEnd: 28.4 }); // dezente Dauer-Ambience
    return () => { audio.stopLoop(surfSndRef.current, { fade: 0.4 }); surfSndRef.current = null; };
  }, [neonsurfGL]);
  const playerCardRef = useRef(null); // #blitz: Box der eigenen Karte für den Ionensturm-Rahmen (IonStorm)
  const oppCardRef = useRef(null);    // #318: Box der Gegnerkarte für die Karten-Animationen (CardFxStage)
  const deckSlotRef = useRef(null);   // #feuer: STABILER Karten-Slot der Spielerseite (Deck) — Anker für durchgängiges Feuer (remountet nicht pro Stich)
  const oppDeckSlotRef = useRef(null); // #318: STABILER Karten-Slot der Gegnerseite — Anker für den Puls-Rahmen auf dem liegenden Deck (Rückseite)
  const t = lastTrick;
  // Deck-Zähler zählt HOCH = 1-indizierte Deckposition der gerade gespielten Karte (t.originalPosition = actualPos,
  // 0..deckLen-1). Aus dem gezeigten Stich (nicht aus state.pos → das resettet am Durchlauf-Ende auf 0). Vor dem
  // ersten Stich (kein t) 0. Beide Seiten spielen dieselbe Position → identischer Zähler.
  const deckPos = t ? (t.originalPosition ?? 0) + 1 : 0;
  // #186: Gegner-Deck-Skin nach kommender Auswahl. back = Cover (verdeckter Stapel), front = Rahmen (Zahl darüber, Holo entfällt).
  const oppSkin = OPP_DECK_SKINS[oppDeck] || OPP_DECK_SKINS.stat;
  const oppBackImg = oppSkin.back, oppFrontImg = oppSkin.front;
  // F4 Farballianz (#125): Partnerfarbe einer Kartenfarbe → diagonaler Split auf der Karte (rein kosmetisch).
  const allyColorFor = (suit) => { const a = linkedPartnerOf(pe, suit); return a ? suitColor(a) : null; };
  const win = t && (t.result === "win" || t.result === "win_tie");
  const lost = t && t.result === "loss";
  const isCrit = !!(t && t.isCrit);
  const critColor = CRIT_COLOR;
  const banner = t
    ? (isCrit ? { key: "bf.banner.winCrit", color: CRIT_COLOR } : BANNER[t.result])
    : null;

  // Effektdauern an den Flip-Takt koppeln; unter reduzierter Bewegung Animationen weglassen
  // (Element bleibt statisch sichtbar statt zu Ende-Opacity 0 zu springen).
  const anim = clamp(flipMs * 0.5, 120, 450);
  // #deckshop/#306/#: Feld-Ambiente-Reaktion je Stich — GLEICHE Geschwindigkeit wie der Flip/Stich. Die Sweep-Dauer folgt
  // direkt flipMs (eine Reaktion je Stich, exakt so lang wie der Stich dauert), damit die Zeile im Turbo synchron mit den
  // Flips läuft statt hinterherzuhinken. (Früher deckelte ein Boden von 560 ms die Dauer → im Turbo lief die Reaktion
  // langsamer als die Flips und der Throttle übersprang Stiche = „nicht synchron".) Weite Klammern binden praktisch nie.
  // Da die Feld-Effekte einfach-exklusiv sind, treibt EIN sweepId alle (nur einer aktiv).
  const sweepDur = clamp(flipMs, 150, 1800);
  // #319 Scorch-Tempo = Turbo-Faktor (BASE_FLIP_MS/flipMs, 1..8) — treibt die ANIMATION (Laser/Burn bleiben bei
  // 1×/2×/4×/MAX getimt).
  const scorchSpeed = Math.max(1, Math.min(8, BASE_FLIP_MS / Math.max(1, flipMs)));
  // #: Die SOUND-rate wird separat bei 2× gedeckelt. Bei 4×/MAX würde rate=scorchSpeed (bis 8×) den 0,73-s-Sound auf
  // ~0,09 s zusammenstauchen (+3 Oktaven) → er verliert seinen Charakter. Gedeckelt bleibt er ~0,29–0,37 s / max +1
  // Oktave, klar erkennbar. Die Animation bleibt voll turbo-gekoppelt; der etwas längere Burn-Ausklang wirkt eher voller.
  const SCORCH_SND_RATE_MAX = 2;
  const scorchSndRate = Math.min(scorchSpeed, SCORCH_SND_RATE_MAX);
  const [sweepId, setSweepId] = useState(0);
  const lastSweepAt = useRef(-1e9);
  const trickNo = lastTrick ? lastTrick.trickNo : null;
  useEffect(() => {
    if (!(bgFx || bgFinisher) || reduced || trickNo == null) return;
    const now = (typeof performance !== "undefined" ? performance.now() : Date.now());
    if (now - lastSweepAt.current >= sweepDur - 20) { lastSweepAt.current = now; setSweepId((k) => k + 1); }
    // Auslöser ist der STICH, nicht die Bedingungen: bgFx/bgFinisher/reduced/sweepDur sind Filter, keine Trigger.
    // Als Deps würde ein Umschalten des Hintergrund-Effekts mitten im Stich einen zusätzlichen Sweep zünden.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trickNo]);
  const fx = (a) => (reduced ? undefined : a);
  // #200 A — Effekt-Budget: je schneller der Takt, desto weniger lose Partikel/Funken und desto flacher der Ghost-Pool.
  // flipMs ≥ 2× (875) = voll; 4× (~437) ≈ 0,5; MAX (~291) = Boden 0,45. Rein visuell (score-neutral wie der Turbo).
  const fxScale  = clamp(flipMs / 875, 0.45, 1);
  // #: Der Pool-Deckel darf im Turbo NICHT unter die Zahl gleichzeitig noch laufender Finisher fallen — sonst würde ein
  // neuer Stich den vorigen Finisher-Ghost per slice() vorzeitig ABBRECHEN (statt ihn ausklingen zu lassen). Da Brennstrahl/
  // Zerstäubung jetzt länger nachwirken (~540 ms) und im Turbo dicht getaktet sind, sichert ein fester Boden (6) das
  // gewünschte ÜBERLAPPEN — die Ghosts entfernen sich ohnehin selbst über ihre Lebensdauer (ghostLife).
  const ghostCap = Math.max(6, Math.round(6 * fxScale)); // gleichzeitige Finisher-/Schnitt-Ghosts (Selbst-Removal via ghostLife; Deckel nur Backstop)
  // #95: einheitliche Float-Dauer für Score- UND Formations-Float (letzterer war zuvor kürzer).
  const floatDur = clamp(flipMs * 0.7, 360, 760) + 1300;
  // #95: Float-Größe skaliert mit dem Gewinn — klein bleibt lesbar (20 px), groß gedeckelt (52 px).
  const floatSize = (v) => Math.round(clamp(20 + 9 * Math.log10(Math.max(1, v) / 40), 20, 52));

  // Karten „dealen" nur noch rein — der zusätzliche Pop-Bounce der Gewinnerkarte ist
  // raus (Wunsch: ruhiger). Der Score-/Schaden-Float über der Karte bleibt erhalten.
  const dealStyle = (dealName) => ({ animation: `${dealName} ${anim}ms ease-out` });
  // #177 Klingenschnitt-Timings — an den Flip-Takt gekoppelt (wie das übrige Juice), gedeckelt, damit der Effekt
  // den nächsten Stich nicht verzögert/überläuft. Bei sehr hohem Turbo (winziger flipMs) oder reduzierter Bewegung
  // wird der Slice gar nicht gerendert → Fallback aufs bestehende Ergebnis-Juice (Puls/Glow/Banner).
  const sliceOn  = !reduced && !!t && (win || lost) && flipMs > 170;
  // Reihenfolge (Wunsch): Karte liegt kurz still (sRest) → Slice/Explosion setzt IN PLACE ein → DANACH floatet der
  // geschnittene Ghost weg (sFloat, nur beim Slice; die Krit-Explosion zerbirst an Ort und Stelle in Pixel-Shards).
  const sRest    = clamp(flipMs * 0.16, 70, 190);    // Ruhe-Beat: Karte liegt, BEVOR Slice/Explosion startet
  const sHalves  = clamp(flipMs * 0.55, 150, 600) + 800;   // Hälften/Pixel-Shards gleiten auseinander & faden
  const sCut     = clamp(flipMs * 0.13, 55, 130);    // Schnittlinie wächst (~120 ms) & fadet
  const sSpark   = clamp(flipMs * 0.5, 150, 520) + 800;    // Funken/Krit-Partikel
  const sBoom    = clamp(flipMs * 0.22, 90, 230);    // Krit-Zentral-Flash (kurz & hell)
  const sWinner  = clamp(flipMs * 0.5, 170, 520);    // Sieger-Ankippen (~500 ms)
  const sFloat   = clamp(flipMs * 0.55, 220, 820);   // Float-Away NACH dem Slice (nur noch Gegnerseite, #187)
  const flyDur   = clamp(flipMs * 0.7, 320, 900);    // Wegflug-Dauer der eigenen Verlierer-Karte (kein Schnitt mehr)
  const flipDur  = clamp(flipMs * 0.55, 220, 460);   // Flug vom Stapel + Flip der einlaufenden Karte
  /* #deckzug: Ab 1400 px läuft ein Stich in ZWEI Takten — erst ZIEHEN beide Seiten (Flug vom Stapel + Flip),
     danach wird AUFGELÖST (Sieger kippt an, Finisher/Wegflug der Verliererkarte). Vorher fiel beides in denselben
     Frame: der Stich ist beim Rendern längst entschieden, also stand `flyAway`/`oppFlyAway` schon im ersten Bild —
     und `flipOn`/`oppFlipOn` schließen die wegfliegende Seite aus. Gezogen hat damit IMMER nur eine Seite (die
     Gewinnerin), bei gewähltem Finisher (Klinge/Scorch/Hologrid/Loch) flippte die Gegnerkarte gar nicht, und nur
     beim Unentschieden zogen beide. Genau das las sich als „mal ziehen beide Decks, mal nur eines".
     `zugMs` ist die Zugdauer (= Flug/Flip); unterhalb 1400 px, bei reduzierter Bewegung und bei hohem Turbo ist
     sie 0 — dort bleibt alles wie bisher, die Handy-Fassung ist unberührt.
     Der Zustand hängt an der STICH-NUMMER, nicht an einem Flag: `drawnNo !== t.trickNo` ist schon im ERSTEN Render
     des neuen Stichs falsch. Ein `setState(false)` im Effekt käme einen Frame zu spät und ließe die Auflösung für
     ein Bild aufblitzen. */
  const wide = useIsWide();
  const zugMs = wide && !reduced && !!t && flipMs > 170 ? Math.round(flipDur) : 0;
  const [drawnNo, setDrawnNo] = useState(null);
  const gezogen = !zugMs || drawnNo === trickNo;   // trickNo: oben aus lastTrick (= t) abgeleitet
  useEffect(() => {
    if (!zugMs || trickNo == null) return undefined;
    const id = setTimeout(() => setDrawnNo(trickNo), zugMs);
    return () => clearTimeout(id);
  }, [trickNo, zugMs]);
  /* „Erst nach dem Zug": die Finisher, die ihren eigenen Effekt-Trigger am Stich hängen (Klinge-Ghost,
     Hologrid-Sweep, Loch-Puls), müssen mit derselben Verzögerung starten wie die Karten-Auflösung — sonst
     schneidet/saugt der Effekt eine Karte, die noch flippt. Ohne Zug-Takt läuft `fn` SOFORT, also exakt wie
     bisher. Rückgabewert ist die Aufräumfunktion für den aufrufenden Effekt. */
  const zugRef = useRef(0); zugRef.current = zugMs;   // über ein Ref, damit `nachZug` STABIL bleibt: als Dependency
  // würde ein Turbo-Wechsel mitten im Stich die Effekte erneut laufen lassen → zweiter Ghost auf demselben Stich.
  const nachZug = useCallback((fn) => {
    const ms = zugRef.current;
    if (!ms) { fn(); return undefined; }
    const id = setTimeout(fn, ms);
    return () => clearTimeout(id);
  }, []);
  // Der Klingenschnitt trifft NUR die Gegnerkarte, und NUR wenn WIR gewinnen (Wunsch). Die eigene Karte wird nie
  // geschnitten: bei einer Niederlage fliegt sie einfach weg (as-flyaway). Sieg: Gegnerkarte in-place geschnitten
  // (Krit: Explosion), Spielerkarte kippt als Sieger an.
  // #deckzug: `aufOn` ist `sliceOn` NACH dem Zug — alles, was die Verliererkarte betrifft, hängt daran. `sliceOn`
  // selbst bleibt das Gate „dieser Stich wird überhaupt animiert" (Ghost-Spawn, Loch-Puls); die verzögern über nachZug.
  const aufOn = sliceOn && gezogen;
  const flyAway      = aufOn && lost;                         // eigene Karte verliert → fliegt einfach weg (ohne Schnitt)
  // #finisher: Der Sieg-Finisher ist wählbar. „klinge" → Gegnerkarte wird in-place vom Klinge-Ghost geschnitten.
  // „standard" (Default) → die Gegnerkarte fliegt einfach zur Seite weg (spiegelbildlich zum eigenen Wegflug bei
  // Niederlage), kein Schnitt. Beide Fälle gelten auch für Krits (nur „Kritisch!"-Anzeige + Lila bleiben zusätzlich).
  const oppSliced    = aufOn && win && klinge;              // Sieg + Klinge → Gegnerkarte in-place vom Klinge-Ghost übernommen
  const oppScorched  = aufOn && win && scorch;              // #319 Sieg + Scorch → Gegnerkarte verglüht IN-PLACE (Laser + Burn); kein Wegflug
  const oppHologrid  = aufOn && win && hologrid;            // #321 Sieg + Hologrid-Slice → Gegnerkarte zerfällt IN-PLACE (Laser-Reveal + Kachel-Zerfall)
  const oppBlackholed = aufOn && win && blackhole;          // #320 Sieg + Schwarzes Loch → Gegnerkarte wird ins Loch gesogen (Canvas-Flyer); kein Wegflug
  const oppFlyAway   = aufOn && win && !klinge && !scorch && !hologrid && !blackhole;  // Sieg + Standard → Gegnerkarte fliegt zur Seite weg (kein Schnitt/Burn/Slice/Sog)
  // #320 Persistentes Serien-Loch: aktiv solange der Finisher „blackhole" gewählt ist (nicht reduced, echter Stich).
  const holeActive   = !reduced && blackhole && flipMs > 170 && !!t;
  const holeFinish   = sliceOn && win && blackhole;           // dieser Sieg meldet einen „Sog-Puls" ans Loch
  const [holePulse, setHolePulse] = useState(null);           // #320 Puls-Kanal ans persistente Loch (win → wachsen+saugen · loss → schrumpfen)
  const [holeGrown, setHoleGrown] = useState(false);          // #: Loch nach einem Sieg tatsächlich aktiv/gewachsen → steuert das Loop-Bett (false vor dem 1. Sieg UND nach dem Kollaps auf 0)
  // #375/#380 Schwarzes-Loch Loop-Bett (Sog/Drone): läuft NUR, wenn das Loch nach einem Sieg aktiv ist (holeGrown) —
  //   nicht schon vor dem ersten Sieg und nicht mehr nach dem Kollaps. Nicht an den pro-Stich-`holeActive` gekoppelt
  //   (das stoppte/startete es je Stich neu → nie hörbar aufgebaut, #380), sondern an den Sieg/Kollaps-Zustand. Nahtloser
  //   Loop über die gleichförmige Mitte (loopStart/loopEnd meiden Ein-/Ausklang der 32,6-s-Aufnahme). Gain/Rate wachsen
  //   über onSize mit der Lochgröße mit; sanfter Ausklang (fade 0.3) beim Kollaps/Verschwinden.
  const holeSndRef = useRef(null);
  // Zwei unabhängige Eingänge des Betts (Lochgröße + Vorbeben) — getrennt gemerkt, gemeinsam angewandt.
  const holeFillRef = useRef(0);
  const holeShudRef = useRef(0);
  const applyHoleSnd = useCallback(() => {
    const h = holeSndRef.current;
    if (!h) return;
    const { gain, rate } = holeSound(holeFillRef.current, holeShudRef.current);
    audio.setLoopGain(h, gain); audio.setLoopRate(h, rate);
  }, []);
  useEffect(() => {
    if (reduced || !blackhole || !holeGrown) return undefined;
    holeFillRef.current = 0; holeShudRef.current = 0;   // neuer Loop startet auf dem Grundpegel
    holeSndRef.current = audio.loop("fx_blackhole", { gain: holeSound(0, 0).gain, loopStart: 1.5, loopEnd: 31.0 });
    return () => { audio.stopLoop(holeSndRef.current, { fade: 0.3 }); holeSndRef.current = null; };
  }, [blackhole, reduced, holeGrown]);
  const [surfSurge, setSurfSurge] = useState(null);           // #345 Puls-Kanal an die Neon-Brandung (Groß-Ansage → Impact-Welle); { id, mag }
  const playerWinner = aufOn && win;    // Spielerkarte gewinnt → kippt an
  const oppWinner    = aufOn && lost;   // Gegnerkarte gewinnt → kippt an
  const winnerTilt = (dur) => ({ animation: `as-slice-winner ${dur}ms ease-out`, willChange: "transform" });
  // #180 Flip-Reveal der Spielerkarte: nur bei normaler Bewegung, echtem Stich, nicht beim Wegflug (Niederlage)
  // und nicht bei sehr hohem Turbo. Dauer an den Flip-Takt gekoppelt.
  const flipOn = !reduced && !!t && !flyAway && flipMs > 170;
  // #186 Flip-Reveal der Gegnerkarte: analog zur Spielerkarte, aber NICHT wenn die Gegnerkarte gerade geschnitten
  // wird/explodiert (dort übernimmt der entkoppelte Ghost) und NICHT beim Standard-Wegflug (sie fliegt dann einfach
  // weg, wie die eigene Karte bei Niederlage — ohne Flip). Bei Gegner-Sieg (oppWinner) darf sie flippen + ankippen.
  const oppFlipOn = !reduced && !!t && !oppSliced && !oppHologrid && !oppBlackholed && !oppFlyAway && flipMs > 170;
  const useFlip    = flipOn;      // #180 3D-Flip-Reveal der eigenen Karte
  const useOppFlip = oppFlipOn;   // #186 3D-Flip-Reveal der Gegnerkarte

  // Kartenelemente einmal bauen — als sichtbare Karte, als (unsichtbarer) Größen-Platzhalter unter dem Slice und
  // als Klon-Quelle in SliceFx wiederverwendbar (Elemente sind unveränderliche Beschreibungen → mehrfach nutzbar).
  // #180: die Spielerkarte trägt den Skin-Front-Rahmen (Zahl/Effekte kommen darüber).
  // #pflanze/#flip: Das Neon-Moos hängt jetzt ALS KIND in der Kartenvorderseite (relativer Wrapper) → es flippt/dealt/
  //   fliegt mit der Karte mit (CSS-Transform-Vererbung), statt als flache Panel-Overlay den 3D-Flip zu verdecken.
  //   „grün" (reif/ausgewachsen) = volle Reifestufe, auch ohne growth-Zähler (Start-Anker/Ranken/Blüte). ?moss=<0..8> (Dev).
  const pGrowth = t ? (MOSS_FORCE != null ? MOSS_FORCE : (t.pCard.green ? PLANT_GREEN_THRESHOLD : (growth[t.pCard.id] || 0))) : 0;
  // #eis/#flip: Wie das Moos hängt jetzt auch der Eis-Frost ALS KIND in der Kartenvorderseite → flippt mit der Karte.
  //   Liegt UNTER dem Moos (Eis z-1, Moos z-2, früher im DOM → darunter). Masse aus ICE_FORCE (?ice=<0..12>, Dev; echte
  //   per-Karte-Bindung noch offen). #flip: Der Blitz-Rahmen (CardIonStorm) liegt jetzt auf der EdgeGlow-Ebene (z-0)
  //   UNTER Eis/Moos (früher Panel-Overlay z-11 darüber) — Stack: Skin < Blitz/EdgeGlow (z-0) < Eis (z-1) < Moos (z-2).
  // #eis PER-KARTE: Frost NUR auf der gefrorenen Gletscher-Karte dieses Stichs (t.pGlacier) mit ihrer eigenen Firn-Masse
  //   (t.pGlacierMass), Basis-Frost-Boden für frisch gefrorene Gletscher. KEIN globaler Basis-Frost mehr auf jede Karte
  //   (das ließ über die Durchläufe „viele" Karten vereisen). ?ice=<n> (Dev) übersteuert weiterhin auf JEDER Karte.
  const pIceMass = ICE_FORCE != null ? ICE_FORCE
    : (t && t.pGlacier ? Math.max(ICE_BASE_FREEZE, t.pGlacierMass || 0) : 0);
  // #318/#flip: Kantenglühen (kaufbare Karten-Animation) hängt jetzt ALS KIND in der Kartenvorderseite (z-0) → flippt mit
  //   der Karte, liegt UNTER Eis (z-1) und Moos (z-2), aber ÜBER dem Karten-Skin. Kaufbarer Shop-Effekt → läuft auch in
  //   Produktion (NICHT preview-gegatet). Aus cardAnims-Toggle bzw. ?edgeglow=1 (Dev). Immer in der Deckfarbe.
  const cardEdgeGlow = (cardAnims || []).includes("edgeglow") || EDGEGLOW_FORCE;
  const edgeGlowEl = cardEdgeGlow ? (
    <Suspense fallback={null}><CardEdgeGlow color={deckA1 || "#5a8ade"} color2={deckA2 || deckA1 || "#5a8ade"} reduced={reduced} lite={lite} active={boardOn} /></Suspense>
  ) : null;
  const pCardEl = t && (
    <div className="relative" style={{ display: "inline-block", lineHeight: 0 }}>
      <Card suit={t.pCard.suit} value={t.pCard.value} baseRank={t.pCard.baseRank}
            stichBonus={t.pValue - t.pCard.value} glow={win ? (isCrit ? critColor : "#5ab87a") : null}
            ionStacks={t.pCard.ionStacks || 0} green={!!t.pCard.green} forged={forged[t.pCard.id] || 0} growth={growth[t.pCard.id] || 0} allyColor={allyColorFor(t.pCard.suit)}
            frontImage={deckFront} />
      {edgeGlowEl /* z-0: unter Eis/Moos, über dem Skin */}
      {/* #blitz/#flip: Ionensturm-Rahmen als flippendes Kind auf der EdgeGlow-Ebene (z-0), UNTER Eis/Moos, ÜBER dem Skin.
          Aktiv bei voll ionisierter Karte (ionStacks >= ION_MAX_STACKS) bzw. ?blitzframe=1 (Dev). Farbe: Standard-Cyan
          oder Deckfarbe (archDeckColor). #spezial: immer aktiv (nicht mehr Preview/Dev-gegatet). */}
      {((t.pCard.ionStacks || 0) >= ION_MAX_STACKS || BLITZ_FORCE) && (
        <Suspense fallback={null}><CardIonStorm active={boardOn} color={archDeckColor ? (deckA1 || "#5ec8f0") : "#5ec8f0"} reduced={reduced} /></Suspense>
      )}
      {pIceMass > 0 && (
        <Suspense fallback={null}><FrostIce mass={pIceMass} active={boardOn} reduced={reduced} deckTint={archDeckColor} deckColor={deckA1} deckColor2={deckA2} /></Suspense>
      )}
      {pGrowth > 0 && (
        <Suspense fallback={null}><MossGrow growth={pGrowth} deckTint={archDeckColor} deckColor={deckA1} deckColor2={deckA2} /></Suspense>
      )}
    </div>
  );
  // #186: die Gegnerkarte trägt den Skin-Front-Rahmen der kommenden Auswahl (Holo entfällt); Zahl/Effekte darüber.
  // #318/#flip: auch die Gegnerkarte bekommt das Kantenglühen als flippendes Kind (Parität zum bisherigen Deck-Slot-Rahmen).
  const oCardEl = t && (
    <div className="relative" style={{ display: "inline-block", lineHeight: 0 }}>
      <Card suit={t.oCard.suit} value={t.oValue} baseRank={t.oCard.baseRank} glow={lost ? "#e0605a" : null}
            green={!!t.oCard.green} branded={brandActive[t.oCard.id] || 0} colonized={colonized[t.oCard.id] ? AUSLAEUFER_HARVEST : 0} allyColor={allyColorFor(t.oCard.suit)} frontImage={oppFrontImg} />
      {edgeGlowEl}
    </div>
  );

  // Sieger kippt an (as-slice-winner); im Flip-Fall steckt die (evtl. gekippte) Karte als Front-Face im Flip.
  const playerFront = playerWinner ? <div style={winnerTilt(sWinner)}>{pCardEl}</div> : pCardEl;
  const playerCard = t ? (
    /* #deckflug: Ab 1400 px kommt die Karte vom Deck-Stapel herübergeflogen, während sie flippt — `bf-fly-in`
       trägt die Bewegung, der Flip sitzt eine Ebene tiefer im `as-flip3d-inner`. Beides auf EINEM Knoten würde
       sich überschreiben und die Perspektive mitkippen (dieselbe Regel wie Animation/Filter, #ios-word).
       Ohne Flip (reduzierte Bewegung, Turbo) bleibt es beim kurzen Einschieben von früher. */
    <div key={`p${t.trickNo}`} ref={playerCardRef} className={`relative${useFlip ? " bf-fly-in" : ""}`}
      style={flyAway ? { animation: `as-flyaway ${flyDur}ms ease-in forwards`, willChange: "transform, opacity" }
           : useFlip ? { "--bf-fly-ms": `${flipDur}ms` } : dealStyle("as-deal-left")}>
      {/* #ui: Ergebnis-Puls (grün bei Sieg / rot bei Niederlage) auf Wunsch ENTFERNT. */}
      {useFlip ? (
        <FlipReveal front={playerFront} backImage={deckBack} dur={flipDur} />   /* #180: Rücken → Front */
      ) : playerFront}
    </div>
  ) : <div className="relative"><CardBack label="" image={deckBack} /></div>;

  // Sieger kippt an; im Flip-Fall steckt die (evtl. gekippte) Karte als Front-Face im Flip.
  const oppFront = oppWinner ? <div style={winnerTilt(sWinner)}>{oCardEl}</div> : oCardEl;
  const oppCard = t ? (
    <div key={`o${t.trickNo}`} ref={oppCardRef} className={`relative${useOppFlip ? " bf-fly-in" : ""}`}
      style={oppFlyAway ? { animation: `as-flyaway-r ${flyDur}ms ease-in forwards`, willChange: "transform, opacity" }
           : useOppFlip ? { "--bf-fly-ms": `${flipDur}ms` }
           : (oppSliced || oppScorched || oppHologrid || oppBlackholed) ? undefined : dealStyle("as-deal-right")}>
      {(oppSliced || oppScorched || oppHologrid || oppBlackholed) ? (
        <div style={{ opacity: 0 }} aria-hidden="true">{oCardEl}</div>   /* in-place unsichtbar — Klinge-Ghost / Scorch-Canvas / Hologrid-Pixi / Schwarzes-Loch-Flyer zeichnet die Karte darüber (#186/#319/#321/#320) */
      ) : useOppFlip ? (
        <FlipReveal front={oppFront} backImage={oppBackImg} dur={flipDur} />   /* #186: Cover → Front */
      ) : oppFront}
    </div>
  ) : <div className="relative"><CardBack label="" image={oppBackImg} /></div>;

  const critMultStr = t ? (Number.isInteger(t.critMultiplier) ? t.critMultiplier : Math.round(t.critMultiplier * 100) / 100) : 2;

  // Formations-Feedback (§17): benannte Formation + Multiplikator; Peak-Styling ab ×6 / ×12.
  const formMult = t ? (t.formationMult || 1) : 1;
  const showFormation = win && t && formMult > 1.001;
  const activeForms = t ? (t.formations || []).filter((f) => f.factor > 1) : [];
  const formLabel = activeForms.length === 1 ? formationLabel(activeForms[0].type) : "Formation"; // Loc: Caps via CSS (formFloat textTransform), Quelle normal geschrieben
  const formationStr = formMult.toFixed(2).replace(".", ",");
  const formPeak = formMult >= 12 ? 2 : formMult >= 6 ? 1 : 0; // 0 normal · 1 verstärkt · 2 Peak
  // #128: Float-Farbe = Rahmenfarbe der Übersicht — Tier nach Formations-Anzahl (formationBorder, kein Drift).
  const formColor = formationBorder({ mult: formMult, formations: (t && t.formations) || [] }).color || "#5ab87a";
  // #105: großes „Wow"-Wort mittig ab hohem Einzelstich-Score (nur bei Sieg). Höchste erfüllte Stufe.
  // Große-Lawine-Bruch (Finisher) → „Lawine" in Blau statt der Score-Stufe; sonst die normale Stufe nach Score.
  const baseBigTier = win && t && t.gained > 0 ? bigScoreTier(t.gained) : null;
  // Pixi-Glutfunken: Hit-Tier des gewonnenen Stichs (0 Schwach · 1 Stark · 2 Brutal · 3 Irre · 4 Gottgleich) — ab Stark
  // bündelt sich die Fontäne zu EINER großen mittigen (Eskalation). Die Groß-Ansage kommt weiterhin vom Spiel.
  const hitTier = win && t && t.gained > 0 ? fxIntensity(t.gained).tier : 0;
  // Serien-Meilenstein: eine 200er-Serie feiert „Gönn dir" (unabhängig vom Stich-Score). #355: NICHT mehr hier vorab zu
  // `bigScore` kollabieren — die Ansage-Auswahl (Gönn dir → sonst Lawine/Score-Stufe) fällt jetzt IM Effekt, NACH den
  // Once-Guards, damit ein bereits gezeigter Meilenstein die zugrunde liegende Stufe (Lawine/Gottgleich) nicht verschluckt.
  const goennMilestone = win && t && (t.winStreak || 0) >= STREAK_GOENN;

  // #ui: Die Ergebnis-Aufschlüsselung (Faktorenkette Basis/Serie/Perks/Form/Crit + Summe) war zwischenzeitlich
  // ENTFERNT („im Spielfluss nicht lesbar") und ist WIEDER DA — als kompakte Zeile unter der Sieg/Niederlage-
  // Ansage (TrickBreakdown, ganz unten in diesem Render), abschaltbar über `hideBreakdown`. Der gewonnene Score
  // steigt weiterhin zusätzlich als Float aus der Karte auf, der Gesamt-Score steht in der StatusBar.

  // #49: aufsteigende Zahlen (Score-Gewinn & Lebensverlust) ~1 s länger + Überlappen erlaubt.
  // Statt eines je Stich ersetzten Einzel-Elements ein kleiner Pool — jeder Float lebt unabhängig
  // und entfernt sich nach seiner Dauer selbst, sodass aufeinanderfolgende Floats überlappen.
  const [floats, setFloats] = useState([]);
  const seenTrick = useRef(-1);
  const floatTimers = useRef([]);
  const floatScaleRef = useRef(0);  // laufender Größenmaßstab der Gewinne (decaying max, für die Entzerrung)
  const floatCountRef = useRef(0);  // aktuell aktive Score-Floats (für die „zu voll"-Schwelle)
  const floatLaneSeq = useRef(0);   // #: rotierender Spur-Index für die vertikale Staffelung der Score-Zahlen
  useEffect(() => () => floatTimers.current.forEach(clearTimeout), []); // Timer bei Unmount aufräumen
  useEffect(() => {
    if (!t) { seenTrick.current = -1; floatScaleRef.current = 0; floatCountRef.current = 0; setFloats([]); return; } // Menü/neuer Lauf → Pool + Maßstab leeren
    if (t.trickNo === seenTrick.current) return;
    seenTrick.current = t.trickNo;
    // #110/#196: Karten-Aufdeck-Sound je Stich — startet zeitgleich mit der Flip-Animation (Ergebnis steht bei
    // RESOLVE_TRICK fest). Rate steigt dezent mit dem Turbo; Lautstärke bleibt konstant (die Stich-/Finisher-Sounds tragen
    // die Wucht). #: Bass-Anhebung entfernt — Bass gibt es nur noch beim „Schwarzen Loch".
    const w = t.result === "win" || t.result === "win_tie";
    // #: Jetzt tragen die Stich-/Finisher-Sounds die Wucht → der Flip-Sound bekommt eine KONSTANTE Lautstärke bei jedem
    // Flip (Mitte zwischen dem alten Sieg- und Niederlage-Pegel), damit er gleichmäßig „tickt" statt bei Sieg/Niederlage
    // stark zu springen. Tempo (rate) bleibt an flipMs gekoppelt. #: Bass entfernt — Bass gibt es nur noch beim „Schwarzen Loch".
    // #finisher-standard: Beim Standard-Finisher trägt der Flip selbst das Sieg-Gefühl — auf einem gewonnenen Stich
    // wird der Aufdeck-Sound dezent HÖHER gestimmt (rate ×STICH_WIN_PITCH), sonst normal. Bei der Klinge bleibt der
    // Flip neutral (dort vertont der fx_blade-Hit den Sieg). Niederlagen klingen in beiden Fällen normal.
    const flipPitch = (w && !klinge) ? STICH_WIN_PITCH : 1;
    audio.play("cardflip", {
      rate: Math.min(CARDFLIP_RATE_CAP, Math.max(1, CARDFLIP_RATE_REF / flipMs)) * flipPitch,
      gain: CARDFLIP_GAIN_CONST,
    });
    // #glutfunken-raus: Glutfunken-Aufstoß-Sound entfernt.
    // #komet: Sternenfeld-Finisher — je Stich EIN Komet, exakt wie der Pixi-Erupt (Sieg UND Niederlage, nur bei reduced
    // aus; NICHT lite-gegatet, der Komet läuft auch auf lite). Der FLUG-Whoosh (fx_comet, Vorlauf-Stille entfernt →
    // sitzt jetzt am Start) läuft bei JEDEM Kometen. Ab Tier ≥ 1 (Siege mit Einschlag) kommt ZUSÄTZLICH die Explosion
    // (fx_comet_impact = nur der Boom, der Woosh der Datei ist stumm; die datei-interne Stille hält den Boom auf ~0,8 s
    // = deckt sich mit dem visuellen Impact IMP_AT×SHOOT_DUR = 0,9 s). rate BEWUSST 1: der Komet fliegt turbo-unabhängig
    // feste 1 s Echtzeit → würde man rate an den Turbo koppeln, wanderte der Einschlag vom sichtbaren Impact weg.
    if (bgFinisher === "starfield" && !reduced) {
      const cometGain = CARDFLIP_GAIN_CONST * 0.29 * 1.7; // Pegel über Glutfunken, +70 %
      audio.play("fx_comet", { gain: cometGain });                                 // Flug für ALLE Kometen
      if (hitTier >= 1) audio.play("fx_comet_impact", { gain: cometGain });         // + Explosion nur bei großen Tiers
    }
    // #320 Schwarzes Loch: Sieg → „Sog-Puls" (Loch wächst + Gegnerkarte einsaugen); Niederlage bei aktivem Loch →
    // „Schrumpf-Puls" (heat-artig verkleinern, kein Sofort-Kollaps). Persistentes Panel-Loch verarbeitet die Pulse.
    if (blackhole) {
      // #deckzug: Der Sog-Puls wartet auf den Zug — sonst saugt das Loch eine Karte, die noch flippt. Der Timer
      // läuft über `floatTimers` (Unmount-Aufräumung); er feuert immer VOR dem nächsten Stich, weil zugMs
      // (= flipDur ≤ 0,55 × flipMs) kürzer ist als der Stich-Takt.
      const pulsZug = (fn) => { if (!zugMs) { fn(); return; } floatTimers.current.push(setTimeout(fn, zugMs)); };
      // #320: Die eingesogene Karte IST die verlorene Stich-Karte des Gegners → echter Kartenwert (t.oValue) UND echte
      //   Suit-Farbe (suitColor(t.oCard.suit)). Vorher zwang „deckA1 ||" jede Karte in die Deckfarbe → alle gleich/gleiche
      //   Farbe. Jetzt variiert Farbe je nach Suit der tatsächlich verlorenen Karte (auch im Deck-Farbmodus des Lochs).
      if (holeFinish) { pulsZug(() => { setHolePulse({ id: t.trickNo, kind: "win", num: t.oValue, col: suitColor(t.oCard.suit) }); setHoleGrown(true); }); } // #: Sieg → Loch aktiv → Loop-Bett an
      else if (holeActive && lost) pulsZug(() => setHolePulse({ id: t.trickNo, kind: "loss" }));
    }
    // #312: Der Klingen-Sound (fx_blade) wird NICHT mehr hier gespielt, sondern richtungs-abhängig im Ghost-Spawn-Block
    // unten — dort ist die Einfahrrichtung (sliceDir) bekannt. So kann der Z-Schnitt seine ZWEI Slashes mit zwei
    // synchronen Hits vertonen, und der Sound sitzt auf dem sichtbaren Schnitt (delay = rest) statt schon beim cardflip.
    // Treffer-Identitäten (Feuer/Pflanze/Eis/Blitz, mehrere zugleich möglich) → alle Icons + Score-Farbe.
    // Farbe: Krit-Lila zuerst, sonst die erste zutreffende Identität nach HIT_COLOR_ORDER, sonst DECKFARBE (#390; Gold nur
    // noch als Rückfall, wenn kein Deck gewählt ist → deckA1 null, z. B. Standard-/Genesis-Deck). Icons bleiben immer.
    const hits = t.hitTypes || [];
    const hitIcons = HIT_ICON_ORDER.filter((k) => hits.includes(k)); // Icon-KEYS (Eis rendert als Bild, Rest als Emoji)
    const hitColorKey = HIT_COLOR_ORDER.find((k) => hits.includes(k));
    const critC = t.isCrit ? CRIT_COLOR : (hitColorKey ? HIT_STYLE[hitColorKey].color : (deckA1 || "#d4a63a"));
    const entries = [];
    // V2: nur noch der Score-Gewinn floatet (Leben/Schaden entfernt).
    if (w && t.gained > 0) {
      // Größenmaßstab fortschreiben (folgt der jüngsten Gewinn-Größenordnung, vergisst Spitzen langsam).
      const scale = floatScaleRef.current = Math.max(t.gained, floatScaleRef.current * FLOAT_SCALE_DECAY);
      // Entzerrung: bei Ballung („zu voll") winzige Gewinne (relativ zum Maßstab) NICHT als Float zeigen — Score zählt trotzdem.
      const declutter = floatCountRef.current >= FLOAT_DECLUTTER_MIN && t.gained < scale * FLOAT_MIN_RATIO;
      if (!declutter) {
        // #: Score-Zahlen kürzer sichtbar als der Formations-Float (dur) — im Turbo enger an flipMs gekoppelt, damit sie
        // schneller weg sind, wenn die Stiche schnell kommen (weniger gleichzeitig). Zusätzlich rotierende Spur (lane).
        const scoreDur = Math.round(clamp(flipMs * 0.8, 340, 720) + clamp(flipMs * 1.6, 420, 1000));
        entries.push({ id: `s${t.trickNo}`, zone: "score", dur: scoreDur, seed: t.trickNo * 2, value: t.gained,
                       lane: (floatLaneSeq.current++) % FLOAT_LANES.length,
                       text: `+${fmtScore(t.gained)}`, color: critC, icons: hitIcons }); // #184: Score ganzzahlig (floor), keine Nachkommastelle
      }
    }
    if (!entries.length) return;
    // #315: Score-Float-Deckel — bei Max-Tempo weniger gleichzeitige Floats (sonst Überlappungs-Cluster). Beim Deckeln
    // werden die NIEDRIGSTEN Werte zuerst verworfen → die grossen, aussagekräftigen Gewinne bleiben stehen (niedrigste
    // zuerst abgebaut). Ausserhalb von Max-Tempo bleibt es bei bis zu 4.
    const floatCap = flipMs < 300 ? 2 : flipMs < 520 ? 3 : 4;
    setFloats((cur) => {
      const merged = [...cur, ...entries];
      const next = merged.length <= floatCap
        ? merged
        : [...merged].sort((a, b) => (b.value || 0) - (a.value || 0)).slice(0, floatCap);
      floatCountRef.current = next.length;
      return next;
    });
    const ids = entries.map((e) => e.id);
    const removeAfter = Math.max(...entries.map((e) => e.dur)); // #: nach der EIGENEN (kürzeren) Score-Dauer aufräumen → floatCount fällt schneller
    const tm = setTimeout(() => {
      setFloats((cur) => { const next = cur.filter((f) => !ids.includes(f.id)); floatCountRef.current = next.length; return next; });
      floatTimers.current = floatTimers.current.filter((x) => x !== tm); // #159: erledigten Timer aus dem Ref splicen → kein unbegrenztes Wachstum über einen langen Lauf
    }, removeAfter);
    floatTimers.current.push(tm);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- bewusst gekeyt/eingefroren, Werte wechseln synchron mit den Deps — #292 geprüft
  }, [t?.trickNo]);

  // #FB: Groß-Ansage-Pool („wie stark") — entkoppelt vom Stich-Takt (wie der Score-Float-Pool). Jeder Eintrag lebt
  // BIG_ANNOUNCE_MS und entfernt sich selbst, unabhängig davon, wie schnell die Folgestiche kommen. So bleibt die
  // Ansage auch bei 4×/MAX voll sichtbar, statt vom nächsten Stich abgeschnitten zu werden. Spur (lane) rotiert →
  // aufeinanderfolgende Ansagen fächern vertikal, Pool klein gedeckelt → kein „zu sehr Überlappen".
  const [bigFloats, setBigFloats] = useState([]);
  const bigTimers = useRef([]);
  const bigSeq = useRef(0);
  const lawineShown = useRef(false); // Große Lawine feuert 1×/Lauf → nur der ERSTE Finale-Bruch zeigt „LAWINE" (kein Schwarm)
  const goennShown = useRef(false);  // „Gönn dir" nur EINMAL je 200er-Serie → Ref scharf, sobald die Serie wieder unter die Schwelle fällt
  const goennPrunkPending = useRef(false); // #gott-goenn: Signal vom Ansage-Effekt an den Prunk-Effekt — „Gönn dir" zeigt an → denselben aktiven Prunk feuern (im selben Stich konsumiert)
  const bigCoolRef = useRef({});     // #315: letzter Anzeige-Zeitpunkt (ms) je Ansage-Stufe (text → ts) für den Cooldown
  useEffect(() => () => bigTimers.current.forEach(clearTimeout), []);
  useEffect(() => {
    if (!t) { setBigFloats([]); lawineShown.current = false; goennShown.current = false; goennPrunkPending.current = false; bigCoolRef.current = {}; return; }   // Menü/neuer Lauf → Pool leeren + Merker zurücksetzen
    if ((t.winStreak || 0) < STREAK_GOENN) goennShown.current = false;  // Serie unter der Schwelle (z. B. Niederlage) → nächster 200er darf wieder feiern
    // #355: Auswahl der anzuzeigenden Ansage ERST hier (nach dem Meilenstein-Once-Guard). Kann „Gönn dir" nicht (mehr)
    // gezeigt werden (schon gelaufen), fällt es auf die zugrunde liegende Stufe zurück — Lawine bzw. Score-Stufe
    // (Gottgleich/Irre/…) — statt die Ansage komplett zu verschlucken. Der Prunk-Trigger läuft separat → Text + Prunk synchron.
    let toShow;
    if (goennMilestone && !goennShown.current) { toShow = GOENNDIR_TIER; goennShown.current = true; goennPrunkPending.current = true; } // #gott-goenn: „Gönn dir" → auch den Prunk anstoßen (Konsum im Prunk-Effekt)
    else { toShow = (baseBigTier && t.grosseLawine) ? LAWINE_TIER : baseBigTier; } // Fallback: Lawine bzw. Score-Stufe
    if (!toShow) return;                      // nichts anzuzeigen (kein großer Sieg-Stich)
    if (toShow === LAWINE_TIER) {             // Große Lawine: die Groß-Ansage nur EINMAL pro Finale, danach still weiterzählen
      if (lawineShown.current) return;
      lawineShown.current = true;
    }
    // #315/rework: Gating der Stufen-Ansagen (Stark/Brutal/Irre/Gottgleich). Zwei Regeln, beide nur für Stufen mit
    // `rank` (die epischen Serien-/Lawine-Ansagen haben ihre eigene 1×-Logik oben und werden hier NICHT angefasst):
    //   1) Dominanz: eine NIEDRIGERE Stufe kurz (BIG_DOMINANCE_MS) nach einer HÖHEREN unterdrücken → „nur die höchsten".
    //   2) Throttle je Stufe (`cool`): dieselbe Stufe nicht bei jedem Stich → erscheint regelmäßig, aber reduziert.
    // Übersprungene Ansagen kosten NICHTS am Score (der floatet unverändert weiter).
    if (toShow.rank) {
      const nowMs = Date.now();
      if (toShow.rank < (bigCoolRef.current._rank || 0) && nowMs - (bigCoolRef.current._at || 0) < BIG_DOMINANCE_MS) return;
      if (toShow.cool > 0 && nowMs - (bigCoolRef.current[toShow.key] || 0) < toShow.cool) return;
      bigCoolRef.current[toShow.key] = nowMs;
      bigCoolRef.current._rank = toShow.rank;
      bigCoolRef.current._at = nowMs;
    }
    // #377: epische Ansagen (Gottgleich ≥500k, „Gönn dir", „Lawine"; alle epic:true, Stark/Brutal/Irre nicht) →
    // sofortiger fx_godlike-Bass-Punch + darübergelegter 11-s-Supernova-Swell, der den Moment austrägt (Layer, nicht
    // Ersatz). Cooldowns in audio.js (godlike 1,8 s · supernova 3,0 s) verhindern Dröhnen bei dichten epischen Stichen.
    // Ansagen sind vom Stich-Takt entkoppelt (feste Standzeit, eigener Pool) → einmaliger Trigger, KEINE rate-Kopplung.
    if (toShow.epic) {
      audio.play("fx_godlike", { gain: 1.2, bass: 4 }); // Punch (leiser gezogen, macht Platz für den Swell)
      // #gott-standard-sound: Der Swell IST der Sound der Prunk-Animation. Ohne Prunk (gottStandard = „Gottgleich anzeigen
      //   ohne Animation") bleibt es allein beim Bass-Punch (fx_godlike), KEIN Animations-Swell. Mit Prunk (sonnenPuls/
      //   Laser-Fächer/Prisma/Holo/Supernova) legt sich der Swell wie bisher über den Punch — je gewähltem Effekt eigener
      //   Klang (Supernova mit abgeleitetem Timing aus supernovaTiming.js), sonst der generische Supernova-Swell.
      if (gottEffect !== "gottStandard") {
        const sw = GOTT_SWELL[gottEffect] || GOTT_SWELL_DEFAULT;
        audio.play(sw.snd, { gain: sw.gain, delay: sw.delay });
      }
    }
    bigSeq.current += 1;
    // #345 Neon-Brandung: dieselbe Groß-Ansage treibt den Impact-Puls der Plasma-See. Magnitude je Stufe:
    //   Stark 0.7 · Brutal 1.0 · Irre 1.4 · epische Ansagen (Gottgleich/Gönn dir/Lawine) 1.4. Nur wenn der Effekt aktiv
    //   ist (sonst ungenutzter State); der Shader klingt den Puls über SURGE_DUR selbst ab.
    if (neonsurfGL) {
      const surgeMag = toShow.epic ? 1.4 : (toShow.rank <= 1 ? 0.7 : toShow.rank === 2 ? 1.0 : 1.4);
      setSurfSurge({ id: `s${t.trickNo}-${bigSeq.current}`, mag: surgeMag });
      // #376 Splash „on top" beim Surge — Lautstärke skaliert mit der Magnitude (Stark leiser ↔ Irre/Gott lauter),
      //   Extra-Bass bei starkem Impact. Cooldown (audio.js 0,3 s) gegen Doppel-Trigger. Feste Surge-Dauer → keine rate.
      audio.play("fx_neonsurf_splash", { gain: 0.6 + 0.7 * surgeMag, bass: surgeMag >= 1.2 ? 3 : 0 });
    }
    // #Fix: id global eindeutig über den monotonen bigSeq (nicht nur trickNo) → keine duplicate-key-Kollision.
    /* #ansage-overlap: Seit #344 liegen ALLE Ansagen exakt mittig (left/top 50 %). Ein Pool von zwei gleichzeitigen
       Einträgen heißt damit: zwei Wortmarken exakt übereinander. Im Playtest ergab BRUTAL + IRRE das unlesbare
       „BIRRRE". Die bestehende Dominanz-Regel oben half nicht — sie unterdrückt nur eine NIEDRIGERE Stufe kurz NACH
       einer höheren, nicht die höhere ÜBER einer noch laufenden niedrigeren. Und die epischen Ansagen (Lawine,
       „Gönn dir") haben gar keinen `rank` und laufen an dem Gate komplett vorbei.
       Regel jetzt, am Pool statt am Gate: es ist IMMER nur eine Ansage sichtbar.
         • Läuft gerade eine HÖHERWERTIGE → die neue tritt nicht an (der größere Moment behält die Bühne).
         • Sonst → die neue ERSETZT alles, was noch steht.
       Rangvergleich über eine effektive Stufe: `rank`, und epische Ansagen ohne rank (Lawine/Gönn dir) zählen als
       oberste Stufe — sie sind One-Shot-Höhepunkte und dürfen von einem Stark nicht weggeschoben werden. */
    const entry = { id: `b${t.trickNo}-${bigSeq.current}`, tier: toShow, rank: bigRankOf(toShow) };
    let superseded = false;
    setBigFloats((cur) => {
      if (cur.some((f) => f.rank > entry.rank)) { superseded = true; return cur; } // Höherwertige Ansage läuft → nicht antreten
      return [entry];                                                              // sonst: ersetzt alles Laufende
    });
    if (superseded) return;
    const tm = setTimeout(() => {
      setBigFloats((cur) => cur.filter((f) => f.id !== entry.id));
      bigTimers.current = bigTimers.current.filter((x) => x !== tm);
    }, BIG_ANNOUNCE_MS + 80);
    bigTimers.current.push(tm);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- bewusst gekeyt/eingefroren, Werte wechseln synchron mit den Deps — #292 geprüft
  }, [t?.trickNo]);

  // #322 Gottgleich-Prunk-Trigger: feuert den gewählten Pixi-Prunk bei einem gottgleichen Sieg, dessen Wert VOR dem
  // Krit-Multiplikator die Schwelle erreicht — also auch bei Krit (dann zählt t.scoreBeforeCrit, sonst t.gained). So
  // triggert ein echt-großer Stich den Prunk auch dann, wenn zusätzlich ein Krit lag; ein nur krit-aufgeblähter kleiner
  // Stich aber NICHT. Höchstens alle GOTT_FX_COOLDOWN_MS (Echtzeit, ref-basiert). Während des Cooldowns bleibt nur die
  // (eigen throttled) GOTTGLEICH-Ansage. Trigger = monotoner Zähler → replay der persistent gemounteten Pixi-Komponente.
  // Bei „reduced" (Barrierefreiheit) läuft kein voller Prunk.
  const [gottTrigger, setGottTrigger] = useState(0);
  const gottLastAt = useRef(0);
  /* #perf-warm: Der Prunk hing bisher am ERSTEN gottgleichen Sieg — dort fielen Chunk-Laden und Pixi-Init auf
     einen Schlag an (gemessen: 362 ms blockierter Hauptthread, ausgerechnet im lautesten Moment des Laufs;
     Supernova zieht dafür zwei Pixi-Apps auf). Jetzt wird die Bühne schon vorgewärmt, sobald das Brett zum
     ERSTEN Mal von einem Vollbild-Overlay verdeckt ist (Auswahl-Phase/Pause): dort sieht niemand einen Hitch,
     und bis zum ersten Gottgleich steht alles. `warm` baut auf, ohne abzuspielen (s. die Prunk-Dateien).
     Einmal wahr, bleibt wahr — die Bühne soll nicht bei jedem Overlay neu entstehen. */
  const [gottWarm, setGottWarm] = useState(false);
  useEffect(() => { if (!boardOn) setGottWarm(true); }, [boardOn]);
  const gottMounted = gottTrigger > 0 || gottWarm;   // gemountet = spielbereit (abgespielt wird erst am Trigger)
  useEffect(() => {
    if (!t) { gottLastAt.current = 0; return; }
    /* Derselbe Wert wie die Ansage: `t.gained`, also der Stich-Score NACH dem Krit-Multiplikator.
       Vorher stand hier bei Krit `scoreBeforeCrit` — ein Stich, der die 500k erst DURCH den Krit
       erreicht (z. B. 250k × 2,4), fiel damit durch dieses Gatter, während die Ansage längst
       „GOTTGLEICH" rief. Genau das war im Playtest zu sehen: Wort ja, Effekt nie.
       Die Häufigkeit bremst weiterhin der 30-s-Cooldown unten, nicht ein zweiter Schwellenwert. */
    const gottBase = t.gained || 0;
    // #gott-goenn: „Gönn dir" (200er-Serien-Höhepunkt) setzt im Ansage-Effekt oben ein Flag → feuert HIER denselben
    //   aktiven Prunk. Einmal je Stich konsumiert (das Flag lebt nie über den Stich hinaus).
    const goennFires = goennPrunkPending.current; goennPrunkPending.current = false;
    // #: Die Große Lawine löst denselben Gottgleich-Prunk aus wie ein gottgleicher Sieg — unabhängig vom Score (t.grosseLawine
    //   ist der One-Shot-Finisher-Bruch). Gleicher reduced-Gate wie Gottgleich. „Gönn dir" ebenso (goennFires).
    const gottWin = win && (gottBase > GOTT_FX_MIN || !!t.grosseLawine || goennFires) && gottEffect !== "gottStandard" && !reduced;
    if (!gottWin) return;
    const now = Date.now();
    // Cooldown gilt für die Score-getriebenen Gottgleich-Prunks (sonst nur die Ansage). „Gönn dir" ist ein seltener
    //   Serien-Höhepunkt (200er-Serie, 1× je Serie) und umgeht ihn bewusst → der Prunk kommt dort verlässlich.
    if (!goennFires && now - gottLastAt.current < GOTT_FX_COOLDOWN_MS) return;
    gottLastAt.current = now;
    setGottTrigger((n) => n + 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- gekeyt am Stich; win/isCrit/gained/gottEffect wechseln synchron mit t.trickNo
  }, [t?.trickNo]);

  // #321 Hologrid-Slice — monotoner Trigger → Replay der persistent gemounteten Pixi-Komponente (kein WebGL-Remount/Sieg).
  const [hologridTrigger, setHologridTrigger] = useState(0);
  useEffect(() => {
    if (t && win && hologrid && !reduced && flipMs > 170) {
      // #deckzug: erst ziehen, dann zerlegen — sonst läuft der Laser-Sweep über eine noch flippende Karte.
      return nachZug(() => {
      setHologridTrigger((n) => n + 1);
      // #374 Laser-Sweep vertonen (war stumm): rate an die Sweep-Geschwindigkeit gekoppelt — der Effekt läuft mit
      //   speed={scorchSpeed}, also denselben Turbo-Faktor nehmen und (wie fx_scorch) bei 2× deckeln (scorchSndRate) →
      //   Ton bleibt bei schnellen Stichen synchron, hängt nicht nach. gain wie Klinge/Scorch. flipMs>170-Gate +
      //   Cooldown (audio.js 0,08 s) verhindern Stapeln/„MG" bei Max-Turbo.
      audio.play("fx_lasergrid", { rate: scorchSndRate, gain: 1.05 });
      });
    }
    return undefined;
  // eslint-disable-next-line react-hooks/exhaustive-deps -- gekeyt am Stich; win/hologrid wechseln synchron mit t.trickNo
  }, [t?.trickNo]);

  // #177+/#186: Schnitt-/Explosions-Ghost-Pool — entkoppelt vom Stich-Takt (wie der Score-Float-Pool), damit die
  // geschnittene/berstende Karte erst wegfloatet, dann zerschneidet/explodiert und bei hohem Turbo/vielen Siegen mit
  // dem nächsten Stich überlappt. Gilt jetzt für BEIDE Seiten (Spieler bei Niederlage, Gegner bei Sieg) mit
  // identischen Timings → beide „laden gleich lang aus". Jeder Ghost hält die Daten SEINES Stichs fest.
  const [slashGhosts, setSlashGhosts] = useState([]);
  const ghostTimers = useRef([]);
  // Fix (Turbo-Duplikat-Keys): monotoner Spawn-Zähler → jede Ghost-id ist GLOBAL eindeutig. `og${trickNo}`/`pg${trickNo}`
  // allein kollidierte, wenn derselbe Stich zweimal einen Ghost spawnte (Turbo-Überlappung/Remount) → React „duplicate key".
  const ghostSeq = useRef(0);
  const sliceSeq = useRef(0);   // #klinge: per-Stich-Zähler der Klingen-Einfahrrichtung (mod aktueller Zyklus-Länge, s. sliceMove)
  useEffect(() => () => ghostTimers.current.forEach(clearTimeout), []);
  useEffect(() => {
    if (!t) { setSlashGhosts([]); return undefined; }   // Menü/neuer Lauf → Pool leeren
    if (!sliceOn) return undefined;                     // nur bei einem echten (animierten) Sieg/Niederlage-Stich
    // #deckzug: Der Schnitt setzt erst ein, wenn die Karten LIEGEN — auf dem Desktop also um die Zugdauer
    // verzögert. Ohne das slasht der Ghost eine Gegnerkarte, die noch vom Stapel herüberfliegt und flippt.
    return nachZug(() => {
    // #188: Effekt-Intensität aus dem Per-Stich-Score. Niederlage → t.gained 0 → Base (kein Skalieren).
    const { p: fxP, tier: fxTier } = fxIntensity(t.gained || 0);
    const base = { rest: sRest, halves: sHalves, cut: sCut, spark: sSpark, boom: sBoom, float: sFloat, streak: t.winStreak || 0, fxP, fxTier, scale: fxScale, flipMs };
    const spawned = [];
    // Niederlage: KEIN Schnitt-Ghost mehr auf der Spielerseite — die eigene Karte fliegt nur weg (as-flyaway, s. o.).
    // #finisher: Der Klinge-Ghost entsteht NUR, wenn die Klinge als Finisher gewählt ist. Beim Standard-Finisher
    // fliegt die Gegnerkarte stattdessen einfach weg (oppFlyAway, s. o.) — kein Ghost, kein Schnitt-Sound.
    if (win && klinge) {   // Gegnerkarte verliert → Klinge-Ghost — auch bei Krit
      // #klinge: Einfahrrichtung aus dem Siegesserie-MULTIPLIKATOR (t.breakdown.streakMult) + per-Stich-Zähler (sliceSeq).
      // Grundzug LINKS; mit steigendem Multiplikator wächst der Zyklus (≥1.25 +rechts, ≥1.5 +oben, ≥2.0 +Z).
      // (Früher aus der render-lokalen `bd`-Variable — die ist mit der Multiplikator-Leiste entfernt worden; hier
      //  direkt aus dem Stich lesen, sonst ReferenceError → grauer Bildschirm beim ersten Klinge-Schnitt.)
      const sliceDir = sliceMove(t.breakdown ? t.breakdown.streakMult : 1, sliceSeq.current++);
      spawned.push({ ...base, id: `og${t.trickNo}-${ghostSeq.current++}`, side: "opp",
        fx: "slice", sliceDir,
        color: suitColor(t.oCard.suit), bladeColor: klingeDeck ? (deckA1 || deckA2 || null) : null, seed: t.trickNo * 3 + 1, // #klinge-deck: Deckfarbe → Deck-Glühen · sonst null → kühles Stahlweiß (bladeTint)
        suit: t.oCard.suit, value: t.oValue, baseRank: t.oCard.baseRank, stichBonus: 0,
        ionStacks: 0, green: !!t.oCard.green,
        branded: brandActive[t.oCard.id] || 0, colonized: colonized[t.oCard.id] ? AUSLAEUFER_HARVEST : 0, allyColor: allyColorFor(t.oCard.suit), frontImage: oppFrontImg });
    }
    if (!spawned.length) return;
    setSlashGhosts((cur) => [...cur, ...spawned].slice(-ghostCap)); // Pool gedeckelt (turbo-abhängig, #200 A)
    const ids = spawned.map((g) => g.id);
    // #klinge: Der Z-Schlag (Serie 4) hält die Karte, bis die drei Schläge durch sind (zHold), erst dann berstet sie →
    // die Ghost-Lebensdauer muss diese Haltezeit mitnehmen, sonst wird der Zerfall abgeschnitten.
    const zHold = spawned.some((g) => g.sliceDir === "z")
      ? Math.round((KLINGE_TUNE.zSlashStep + KLINGE_TUNE.zSlashFactor) * sCut) : 0;
    const ghostLife = sRest + zHold + Math.max(sHalves, sSpark) * (1 + fxP * 0.3) + 100;
    const tm = setTimeout(() => {
      setSlashGhosts((cur) => cur.filter((g) => !ids.includes(g.id)));
      ghostTimers.current = ghostTimers.current.filter((x) => x !== tm); // #159: erledigten Timer aus dem Ref splicen (wie floatTimers)
    }, ghostLife);
    ghostTimers.current.push(tm);
    // #312: Klingen-Sound synchron zum sichtbaren Schnitt. Der Ghost slasht bei delay = sRest; der Z-Schnitt sind ZWEI
    // Slashes (Stagger 0 und zSlashStep × cutDur) → zwei schnelle Hits exakt auf die beiden Slash-Zeitpunkte. Andere
    // Richtungen: EIN Hit auf dem einzelnen Schnitt. Timer laufen über ghostTimers (Cleanup bei Unmount/Trickwechsel).
    if (flipMs > 170) {
      const fxRate = Math.min(CARDFLIP_RATE_CAP, Math.max(1, CARDFLIP_RATE_REF / flipMs));
      const isZ = spawned.some((g) => g.sliceDir === "z");
      const bladeAt = (ms) => { const st = setTimeout(() => audio.play("fx_blade", { rate: fxRate, gain: 1.05 }), ms); ghostTimers.current.push(st); };
      bladeAt(sRest);                                                       // erster Slash
      if (isZ) bladeAt(sRest + Math.round(KLINGE_TUNE.zSlashStep * sCut));  // zweiter Slash (Z-Doppelschnitt)
    }
    // #cleanup: GOTTGLEICH-Prunk-Overlays (Feuerwerk/Goldregen/Prisma-Welle) entfernt — die „gott"-Kategorie bleibt
    // im Shop (nur „Standard"), neuer Prunk kommt später.
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- bewusst gekeyt/eingefroren, Werte wechseln synchron mit den Deps — #292 geprüft
  }, [t?.trickNo]);
  const playerGhosts = slashGhosts.filter((g) => g.side === "player");
  const oppGhosts    = slashGhosts.filter((g) => g.side === "opp");

  // #188 v2 / #192: Screen-Effekte bei großem SIEG. Der Screen-Shake läuft jetzt für BEIDE Ergebnisse, gestaffelt
  // nach Score: Krit-Sieg ab STARK (tier≥1, unverändert), normaler Sieg erst ab BRUTAL (tier≥2) — eine Stufe höher,
  // damit der Crit die stärkere Stufe bleibt und große Siege seit SCORE_PER_WIN 100→400 (#178) nicht abstumpfen.
  // Flash/Vignette (CritScreenFx) bleiben Crit-exklusiv (isCrit im State mitgeführt). Bei reduzierter Bewegung gar
  // nicht gesetzt (kein Shake/Flash/Vignette). Auto-Reset nach ~700 ms → Overlay/Aura entfernt sich.
  const [screenFx, setScreenFx] = useState(null);
  const screenFxN = useRef(0);
  const screenFxTimer = useRef(null);
  useEffect(() => () => clearTimeout(screenFxTimer.current), []);
  useEffect(() => {
    if (t && win && !lite) {   // #: Screen-Shake ist ein Haupt-Ruckel-Treiber (wackelt den ganzen Teilbaum per transform → Dauer-Repaint) → in „ausgewogen" (lite) UND minimal aus
      const { tier } = fxIntensity(t.gained || 0);
      const minTier = isCrit ? 1 : 2; // Crit ab STARK (10k), normaler Sieg erst ab BRUTAL (50k)
      if (tier >= minTier) {
        screenFxN.current += 1;
        const colors = isCrit ? CRIT_TIER_COLORS : WIN_TIER_COLORS;
        setScreenFx({ n: screenFxN.current, tier, isCrit, color: colors[tier] || (isCrit ? critColor : "#5ab87a") });
        clearTimeout(screenFxTimer.current);
        screenFxTimer.current = setTimeout(() => setScreenFx(null), 700);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- bewusst gekeyt/eingefroren, Werte wechseln synchron mit den Deps — #292 geprüft
  }, [t?.trickNo]);
  // #: Screenshake NUR noch bei GOTTGLEICH (Tier 4) — überall sonst raus (Nutzer-Wunsch). Wichtig: nicht bloß die
  // Amplitude nullen (die Keyframes drehen zusätzlich fest per rotate), sondern die ganze Animation weglassen. Die
  // grün/gold Panel-Aura großer Siege (outerGlow, BRUTAL→GOTTGLEICH) bleibt davon unberührt — nur der Jitter entfällt.
  const shakeOn   = !!screenFx && screenFx.tier >= 4;
  const shakeAmp  = shakeOn ? 7 : 0;
  const shakeDur  = shakeOn ? 160 + screenFx.tier * 50 : 0;
  const shakeName = shakeOn ? (screenFx.n % 2 ? "as-crit-shake-a" : "as-crit-shake-b") : undefined;

  // Formations-Float: soll ~1,5 s LÄNGER stehen bleiben als sein Stich, dann sanft ausklingen. Deshalb vom aktuellen
  // Stich entkoppelt in eigenem State. Ein Formations-Sieg setzt ihn (Phase „aktiv" = hält bei Opacity 1); sobald ein
  // Folgestich ihn nicht mehr zeigt, klingt er über FORM_LINGER_MS aus und wird entfernt. In Pause (kein Folgestich)
  // bleibt er stehen. `key` = Stich-Nr. → derselbe Float bleibt beim Ausklang erhalten (kein Remount/Neustart).
  const [formFloat, setFormFloat] = useState(null);
  const formOutTimer = useRef(null);
  useEffect(() => () => clearTimeout(formOutTimer.current), []);
  useEffect(() => {
    if (!t) { setFormFloat(null); return; }
    if (showFormation) setFormFloat({ key: t.trickNo, label: formLabel, mult: formationStr, color: formColor, peak: formPeak });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- bewusst gekeyt/eingefroren, Werte wechseln synchron mit den Deps — #292 geprüft
  }, [t?.trickNo, showFormation, formLabel, formationStr, formColor, formPeak]);
  // „Verlässt gerade": der Float gehört zu einem früheren Stich als dem aktuell gezeigten Formations-Sieg.
  const formLeaving = !!formFloat && formFloat.key !== (t ? t.trickNo : null);
  useEffect(() => {
    clearTimeout(formOutTimer.current);
    if (formLeaving) formOutTimer.current = setTimeout(() => setFormFloat(null), FORM_LINGER_MS); // nach dem Ausklang entfernen
  }, [formLeaving, formFloat?.key]);

  // --- Panel-Rahmen + äußerer Bloom ---
  // Archetyp-Ambiente (Feuer-Glut / Blitz-Glow) ist zu den jeweiligen Fraktions-Panels gewandert (HeatBar/ChargeBar);
  // das Battlefield bleibt neutral, nur die Sieg-/Krit-Aura des aktuellen Stich-Ergebnisses liegt noch am Panel.
  /* #kompositor: die WebGL-Feld-Ebenen als DATEN statt als drei fast gleiche JSX-Blöcke — nur so lassen sie sich zu
     EINER Bühne bündeln. Aurora und Brandung schließen einander aus (beide sind `bgFx`) — seit #deckglow-raus gibt es
     keine Ebene mehr, die gleichzeitig mit ihnen läuft, also liegt hier immer HÖCHSTENS EINE. */
  const bgLayer = auroraGL
    ? {
      key: "aurora",
      props: { color: deckA1, color2: deckA2, deckColored: auroraDeck, animate: !reduced },
    }
    : neonsurfGL
      ? {
        key: "neonsurf",
        props: { color: deckA1, color2: deckA2 || deckA1, deckColored: neonsurfDeck, animate: !reduced, surge: surfSurge },
      }
      : null;

  const panelBorder = `1px solid ${DECK_BORDER}`; // #365/#356: Nicht-CRT-Fallback deck-getönt (unter CRT übernimmt die .as-panel-deck-Regel)
  const outerParts = [];
  // #192: der Screen-Shake eines großen NORMALEN Siegs bekommt eine dezente grün/gold Panel-Aura (Sieg-Identität,
  // WIN_TIER_COLORS), damit die „grün/gold"-Wirkung sichtbar ist, ohne Flash/Vignette (die Crit-exklusiv bleiben).
  // Nur bei normalem Sieg (kein Crit) → der Crit-Look bleibt unverändert. Stärke wächst BRUTAL→GOTTGLEICH.
  if (screenFx && !screenFx.isCrit) {
    const gi = clamp((screenFx.tier - 2) / 2, 0, 1); // BRUTAL 0 · IRRE 0,5 · GOTTGLEICH 1
    outerParts.push(`0 0 ${Math.round(30 + 26 * gi)}px ${Math.round(5 + 6 * gi)}px ${screenFx.color}${gi > 0.5 ? "66" : "4d"}`);
  }
  const outerGlow = outerParts.length ? outerParts.join(", ") : undefined;

  /* Die Aufschlüsselungs-Zeile als EIN Block — je nach `ketteOben` über den Karten oder an ihrem alten Platz
     unter der Ansage (s. #boden-zeile). Die Klassen sind in beiden Fällen dieselben, auch die Abstände: der
     Block kostet oben wie unten `mt-1` + `min-h-5` = 24 px, die Panelhöhe ändert sich beim Umschalten also
     nicht und es springt nichts.
     MINDEST-Höhe (min-h-5): bei Niederlage/Gleichstand und bei ausgeblendeter Zeile bleibt der Platz
     reserviert, damit die Karten NICHT springen (genau der Grund, aus dem die alte Fassung damals rausflog).
     Kein overflow-hidden: passt die Kette bei sehr vielen Faktoren nicht in eine Zeile, darf sie per
     flex-wrap auf eine zweite Zeile ausweichen, statt am Rand abgeschnitten zu werden (#ui). */
  const kette = (
    <div className={`bf-kette relative z-10 min-h-5 ${ketteOben ? "-mt-3" : "mt-1"} flex items-center justify-center`}>
      {!hideBreakdown && <TrickBreakdown trick={t} />}
    </div>
  );

  return (
   <>
    <div ref={panelRef} data-tut="bf-board" className="bf-panel rounded-xl p-6 overflow-hidden as-panel as-panel-deck relative"
      style={{ background: "radial-gradient(360px 130px at 50% 0%, rgba(155,130,240,.10), transparent 70%), linear-gradient(180deg,#1b1a24,#141019)",
               // #296: eigener Stacking-Context → die Panel-Overlays (Schwarzes Loch/BounceBurst/PrunkFx mit hohem
               // zIndex) bleiben INNERHALB des Battlefields und liegen nie über anderen Screens (z. B. Perk-Auswahl).
               isolation: "isolate",
               border: panelBorder, boxShadow: outerGlow,
               // #188 v2 / #192: Screen-Shake bei großem Sieg — Panel jittert, Amplitude via --shake-amp nach Stufe.
               // Krit ab STARK, normaler Sieg ab BRUTAL (grün/gold Aura via outerGlow, kein Flash/Vignette).
               animation: shakeName ? `${shakeName} ${shakeDur}ms ease-in-out` : undefined,
               ...(shakeAmp ? { "--shake-amp": `${shakeAmp}px` } : {}) }}>
      {/* Battlefield = „Bühne" des Spielscreens: die gemeinsame Tri-Color-Haarlinie (Hub-Signet). Der dynamische
          Sieg-/Krit-Schein liegt weiter über outerGlow — die Farbe kommt vom Spielausgang, nicht vom Skin. */}
      <PhaseHairline />
      {/* Pixi-Umbau: GPU-Bühne als z-2-Overlay (über BF-Bild z-0 + Ambiente z-1, unter Karten z-10). Transparent +
          pointer-events:none. Baut je nach aktivem Feld-Effekt den passenden GPU-Emitter (Komet/Sternenfeld),
          sobald der Effekt portiert ist (PIXI_FIELD). Der Ticker pausiert im Hintergrund-Tab. #346: läuft auch in
          Produktion — Pixi lädt aber lazy und NUR, wenn der Spieler den Effekt tatsächlich aktiviert hat. */}
      {/* Hintergrund-Effekt (reiner BG) — z-2 HINTER dem Finisher. Seit #deckglow-raus trägt diese Bühne genau EINE
          Ebene: Aurora und Brandung schließen einander aus, und „Leuchten" — die einzige Ebene, die je gleichzeitig
          mit ihnen lief — gibt es nicht mehr. */}
      {bgLayer && (
        <div aria-hidden="true" className="absolute inset-0 z-[2] pointer-events-none">
          <FieldLayer layer={bgLayer.key} {...bgLayer.props} active={boardOn} />
        </div>
      )}
      {/* #317 Cube-Matrix — zwei Ebenen: Würfelfeld/Boden/Sonne z-2 HINTER den Karten (Ambiente), Scheinwerfer als
          additive Overlay-Bühne z-11 ÜBER den Karten → sie leuchten die Karten von oben an. */}
      {cubeMatrixOn && (
        <>
          <div aria-hidden="true" className="absolute inset-0 z-[2] pointer-events-none">
            <Suspense fallback={null}>
              <CubeMatrixField mode="field" color={deckA1} color2={deckA2 || deckA1} deckColored={cubematrixDeck} reduced={reduced} lite={lite} sun={false} wire={cubematrixWire} floorBottom={cmZone.floorBottom} active={boardOn} />
            </Suspense>
          </div>
          <div aria-hidden="true" className="absolute inset-0 z-[11] pointer-events-none">
            <Suspense fallback={null}>
              <CubeMatrixField mode="spots" color={deckA1} color2={deckA2 || deckA1} deckColored={cubematrixDeck} reduced={reduced} lite={lite} active={boardOn} />
            </Suspense>
          </div>
        </>
      )}
      {(import.meta.env.VITE_PREVIEW === "1" || import.meta.env.DEV || pixiFin) && (
        <Suspense fallback={null}>
          {/* Hintergrund-Finisher (reagiert je Stich) — Pixi, z-3 VOR dem BG-Effekt. #346: mountet in Produktion NUR,
              wenn pixiFin aktiv ist (Komet/Sternenfeld gewählt) → Pixi lädt dann lazy; ohne aktiven Effekt bleibt es aus. */}
          <PixiStage className="z-[3]"
            active={boardOn}
            effect={pixiFin ? bgFinisher : null}
            color={deckA1 || "#ffffff"}
            color2={deckA2 || "#b06bff"}
            deckTint={starfieldDeck}
            score={pixiFin ? Math.round((score || 0) / 20000) * 20000 : 0}
            reduced={reduced} lite={lite}
            sweepId={sweepId} sweepDur={sweepDur} win={win} hitTier={hitTier} />
        </Suspense>
      )}
      {/* #blitz/#flip: Der Ionensturm-Rahmen wird NICHT mehr hier als Pixi-Panel-Overlay (z-11) gemountet, sondern hängt
          als flippendes Kind IN der Kartenvorderseite (siehe pCardEl oben, CardIonStorm auf z-0 = EdgeGlow-Ebene, UNTER
          Eis/Moos) → er flippt/dealt/fliegt mit der Karte mit und liegt zwischen Karte und Eis/Moos (User-Vorgabe). */}
      {/* #eis/#flip: Der Eis-Frost wird NICHT mehr hier als Panel-Overlay gemountet, sondern hängt als Kind IN der
          Kartenvorderseite (siehe pCardEl oben, z-1 unter dem Moos) → er flippt/dealt/fliegt mit der Karte mit. */}
      {/* #pflanze/#flip: Das Neon-Moos wird NICHT mehr hier als Panel-Overlay gemountet, sondern hängt als Kind IN der
          Kartenvorderseite (siehe pCardEl oben) → es flippt/dealt/fliegt mit der Karte mit, statt den 3D-Flip flach zu
          verdecken. Hinweis: dadurch liegt das Moos im Karten-Stacking-Context (nicht mehr über dem Panel-IonStorm). */}
      {/* #318 Karten-Animationen — geteilte Pixi-Overlay-Bühne ÜBER beiden Karten (z-11). Stapelbare Dauer-Layer
          (Edge-Glow/Holo/Glitch), pro Karten-Rechteck gezeichnet. Aktiv aus cardAnims (Shop-Toggle) bzw.
          ?edgeglow=1 (Dev). KAUFBARE Shop-Effekte → laufen auch in Produktion (CARD_FX_ENABLED); Pixi lädt nur lazy,
          wenn wirklich eine Animation an ist (sonst return null → kein Pixi). */}
      {CARD_FX_ENABLED && (() => {
        const animSet = new Set(cardAnims || []);
        const holo = animSet.has("holo") || HOLO_FORCE;
        const glitch = animSet.has("glitch") || GLITCH_FORCE;
        // #318/#flip: Edge-Glow läuft NICHT mehr hier (Panel-Overlay), sondern als flippendes Kind IN der Karte (CardEdgeGlow,
        // siehe pCardEl/oCardEl oben) → unter Eis/Moos. Diese Bühne trägt nur noch Holo/Glitch (Face-Effekte).
        if (!holo && !glitch) return null;
        return (
          <Suspense fallback={null}>
            <CardFxStage
              panelRef={panelRef}
              cards={[
                { ref: playerCardRef, active: !!t && !flyAway, num: t ? t.pValue : "", color: t ? suitColor(t.pCard.suit) : null,
                  layers: { edgeGlow: false, holo, glitch } },
                { ref: oppCardRef, active: !!t && !oppFlyAway && !oppSliced, num: t ? t.oValue : "", color: t ? suitColor(t.oCard.suit) : null,
                  layers: { edgeGlow: false, holo, glitch } },
              ]}
              layers={{ edgeGlow: false, holo, glitch }}
              /* Karten-Animationen IMMER in der Deckfarbe: color2 = deckA2 (oder deckA1, wenn das Deck nur eine Farbe
                 hat) → mono-Deckfarbe statt Verlauf zu einem Fremdton. */
              color={deckA1 || "#5a8ade"} color2={deckA2 || deckA1 || "#5a8ade"}
              tier={hitTier} reduced={reduced} lite={lite} active={boardOn} />
          </Suspense>
        );
      })()}
      {/* #feuer Archetyp-Karteneffekt — brennender KARTENKOPF (Pixi-Partikel), neon-gefärbt: Flammen lodern ÜBER dem
          oberen Rand nach oben, Farbverlauf über die Flammenhöhe unten blau→Mitte magenta→oben rot glühend (Weiß nur
          aus Überlappung). Hitze aus dem heat-Prop (Hitzeleiste 0–HEAT_MAX) → blendet zwischen den Phasen 20/50/80/100
          über; ?fireheat=<0..1> erzwingt sie (Dev). #feuer: an den STABILEN Deck-Slot (deckSlotRef) verankert (nicht an
          die gespielte Karte) → das Feuer brennt DURCHGÄNGIG weiter, auch wenn die Karte gewinnt/verliert/wegfliegt
          (kein Neustart, kein flyAway-Reset mehr). Gate wie IonStorm (Preview/Dev). */}
      {/* #feuer/#spezial: Neon-Seiden-Feuer am Kartenkopf — immer aktiv (nicht mehr Preview/Dev-gegatet). Farbe: Standard-
          Neon (blau→magenta→rot) oder Deckfarbe (archDeckColor → deckA1→deckA2). Pixi lädt lazy nur bei Hitze > 0. */}
      {(
        <Suspense fallback={null}>
          <FireHead
            heat={FIRE_FORCE != null ? FIRE_FORCE
              : (heat && heat.active ? Math.max(0, Math.min(1, (heat.value || 0) / (heat.max || HEAT_MAX))) : 0)}
            panelRef={panelRef} cardRef={deckSlotRef}
            deckTint={archDeckColor} deckColor={deckA1} deckColor2={deckA2} />
        </Suspense>
      )}
      {/* #319 Scorch-Finisher: Laser + organischer Burn über der geschlagenen Gegnerkarte. Canvas-2D (kein Pixi-Shader →
          mobiltauglich UND produktionsfähig, anders als die env-gegateten GPU-Effekte). Nur bei Sieg+Scorch, nicht bei
          „reduced" (Barrierefreiheit → dann greift der schlichte Standard-Wegflug/kein Effekt). Key/Trigger am trickNo. */}
      {oppScorched && !reduced && (
        <ScorchFx key={`scorch${t.trickNo}`} trigger={t.trickNo} panelRef={panelRef} cardRef={oppCardRef}
          frontImage={oppFrontImg} value={t.oValue} suit={suitColor(t.oCard.suit)}
          deckColor={deckA1 || "#ff6a30"} deckTint={scorchDeck} reduced={reduced} lite={lite}
          speed={scorchSpeed}
          /* #319 Sound (Laser+Burn) genau zum Effekt-Start; rate bei 2× gedeckelt (scorchSndRate), damit er bei 4×/MAX
             nicht zu einem hohen Chirp zusammenschrumpft. Lautstärke wie Klinge (1,05). */
          onFire={() => audio.play("fx_scorch", { rate: scorchSndRate, gain: 1.05 })} />
      )}
      {/* #321 Hologrid-Slice (PIXI): lazy gemountet erst beim ersten Hologrid-Sieg (hologridTrigger>0), dann persistent →
          Replay je weiterem Sieg über den Trigger (kein WebGL-Remount). Die Gegnerkarte ist dabei in-place unsichtbar
          (oppHologrid) — der Effekt backt & zerlegt sie selbst. Nicht bei „reduced" (dann Standard-Wegflug). Farbe = Deck. */}
      {hologridTrigger > 0 && hologrid && !reduced && (
        <Suspense fallback={null}>
          <HologridSlicePixi trigger={hologridTrigger} panelRef={panelRef} cardRef={oppCardRef}
            frontImage={oppFrontImg} value={t ? t.oValue : null} suit={t ? suitColor(t.oCard.suit) : "#e0605a"}
            deckColor={hologridDeck ? (deckA1 || "#2ff0ff") : "#2ff0ff"} deckColor2={hologridDeck ? (deckA2 || deckA1 || "#ff2d9b") : "#ff2d9b"} deckTint={hologridDeck} reduced={reduced} lite={lite}
            speed={scorchSpeed} />
        </Suspense>
      )}
      {/* #320 Schwarzes-Loch-Finisher: PERSISTENTES Serien-Loch (kein Ein-Stich-One-Shot). Liegt als Canvas-2D-Ebene
          über dem Panel (pixi-frei → mobiltauglich UND produktionsfähig). Aktiv solange der Finisher gewählt ist
          (holeActive); Sieg/Niederlage kommen als Puls (holePulse) rein → Loch wächst + saugt die Gegnerkarte ein bzw.
          schrumpft. Nicht bei „reduced". Standardfarben blau→pink; im Deckmodus (blackholeDeck) Deckfarben. */}
      {holeActive && (
        <BlackholeFx active={holeActive} pulse={holePulse}
          color={blackholeDeck ? (deckA1 || "#4aa0ff") : "#4aa0ff"}
          color2={blackholeDeck ? (deckA2 || deckA1 || "#ff3ea8") : "#ff3ea8"}
          scale={fxScale} panelRef={panelRef} oppRef={oppSlotRef} backSrc={oppBackImg} reduced={reduced} boardVisible={boardOn}
          /* #375 Zusammenzieh-Impact am Kollaps-Start: große Nova wuchtiger (gain+bass); rate an den Turbo-Kollaps gekoppelt (spd), bei 2× gedeckelt. */
          onImplode={(big, spd, grew) => { setHoleGrown(false); if (big || grew) audio.play("fx_blackhole_implode", { gain: big ? 1.2 : 1.0, bass: big ? 6 : 3, rate: Math.min(spd || 1, 2) }); }} /* #: Kollaps auf 0 → Loop-Bett aus; Implosions-Sound nur bei großem Kollaps (big) oder wenn das Loch vorher ausreichend gewachsen war (grew) */
          /* #380 Nova-Flash NACH dem Zusammenziehen (nur großer Kollaps): der Supernova-Puls (Pegel wie im Gott-Showcase). */
          onNova={(big) => { if (big) audio.play("fx_supernova", { gain: 0.9 }); }}
          /* #375 Bett wächst mit der Lochgröße UND mit dem Vorbeben (holeSound, EINE Quelle mit der
             Werkstatt-Vorschau). Beide Signale laufen unabhängig — deshalb liegen sie in Refs und der
             Pegel wird aus BEIDEN gerechnet; würde jeder Callback direkt setLoopGain rufen, überschriebe
             der eine den anderen. */
          onSize={(level, maxL) => { holeFillRef.current = maxL > 0 ? level / maxL : 0; applyHoleSnd(); }}
          onShudder={(sh) => { holeShudRef.current = sh; applyHoleSnd(); }} /> /* #338-4: eingesogene Karte zeigt die Gegner-Deck-Rückseite (pro Phase konstant → einmal gecacht) */
      )}
      {/* #322–#326 Gottgleich-Prunk (PIXI): lazy gemountet erst beim ersten gottgleichen Sieg (gottTrigger>0), dann
          persistent → Replay je weiterem Sieg über den Trigger. Nicht bei „reduced". Der Effekt-Layer positioniert sich
          selbst (z-9 hinter der Karte bzw. eigene Ebenen bei Supernova). cardRef=null → der Prunk zentriert sich auf die
          PANEL-Mitte (pr.width/2), nicht auf die außermittige Gegnerkarte — sonst saß der Effekt v. a. auf Mobile rechts. */}
      {gottMounted && gottEffect === "sonnenPuls" && !reduced && (
        <Suspense fallback={null}>
          <SonnenPulsPixi trigger={gottTrigger} warm={gottTrigger === 0} panelRef={panelRef} cardRef={null} speed={gottSpeedFor("sonnenPuls")}
            deckColor={deckA1 || "#ff3d81"} deckColor2={deckA2 || deckA1 || "#ffb43d"} deckTint={gottDeck}
            reduced={reduced} lite={lite} />
        </Suspense>
      )}
      {gottMounted && gottEffect === "laserFaecher" && !reduced && (
        <Suspense fallback={null}>
          <LaserFaecherPixi trigger={gottTrigger} warm={gottTrigger === 0} panelRef={panelRef} cardRef={null} speed={gottSpeedFor("laserFaecher")}
            deckColor={deckA1 || "#2ff0ff"} deckColor2={deckA2 || deckA1 || "#ff2d9b"} deckTint={gottDeck}
            reduced={reduced} lite={lite} />
        </Suspense>
      )}
      {gottMounted && gottEffect === "prismaKaskade" && !reduced && (
        <Suspense fallback={null}>
          <PrismaKaskadePixi trigger={gottTrigger} warm={gottTrigger === 0} panelRef={panelRef} cardRef={null} speed={gottSpeedFor("prismaKaskade")}
            deckColor={deckA1 || "#31d0ff"} deckColor2={deckA2 || deckA1 || "#ff5db1"} deckTint={gottDeck}
            reduced={reduced} lite={lite} />
        </Suspense>
      )}
      {gottMounted && gottEffect === "holoCube" && !reduced && (
        <Suspense fallback={null}>
          <HoloCubePixi trigger={gottTrigger} warm={gottTrigger === 0} panelRef={panelRef} cardRef={null} speed={gottSpeedFor("holoCube")}
            deckColor={deckA1 || "#35e0ff"} deckColor2={deckA2 || deckA1 || "#ff5db1"} deckTint={gottDeck}
            reduced={reduced} lite={lite} />
        </Suspense>
      )}
      {gottMounted && gottEffect === "supernova" && !reduced && (
        <Suspense fallback={null}>
          <SupernovaPixi trigger={gottTrigger} warm={gottTrigger === 0} panelRef={panelRef} cardRef={null} speed={gottSpeedFor("supernova")}
            deckColor={deckA1 || "#ffd24a"} deckColor2={deckA2 || deckA1 || "#ff2d9b"} deckTint={gottDeck}
            reduced={reduced} lite={lite} />
        </Suspense>
      )}
      {/* #190: gewähltes Battlefield-Skin als Hintergrund (responsive desktop/mobile). Liegt als erstes Kind
          bei z-0 → überdeckt die opake Panelfläche, bleibt aber HINTER Feuer-Glut/Frost/Blitz (spätere z-0/1/2)
          und den Karten (z-10). Dunkler Scrim hält Karten/Text lesbar. Ohne Skin (null) → nichts, Standard bleibt. */}
      {battlefield && (
        <div aria-hidden="true" className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
          <picture>
            <source media="(max-width: 640px)" srcSet={battlefield.mobile} />
            <img src={battlefield.desktop} alt="" className="w-full h-full object-cover" />
          </picture>
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(12,12,16,0.55) 0%, rgba(12,12,16,0.38) 45%, rgba(12,12,16,0.62) 100%)" }} />
        </div>
      )}
      {/* #cleanup: Der DOM-Hintergrund-Finisher entfällt — Glutfunken & Sternenfeld laufen nur noch über den
          Pixi-Emitter (PixiStage). Es gibt keine DOM-Finisher-Fassung mehr. */}
      {/* Archetyp-Ambiente (Feuer-Glut / Blitz-Glow / ⚡) ist entfernt → wandert in die Fraktions-Panels
          (HeatBar/ChargeBar). Das Battlefield bleibt für Deck-Skin + das Stich-Juice reserviert. */}
      {ketteOben && kette}
      <div className={`bf-cards relative z-10 ${ketteOben ? "mt-6" : "mt-8"} flex items-center justify-center gap-4 sm:gap-8`}>
        {/* KRITISCH-Text (#33) — bei reduzierter Bewegung statisch „… ×N". #389: per hideFloatMult ausblendbar. */}
        {isCrit && !hideFloatMult && (
          <div key={`krit${t.trickNo}`} className="pointer-events-none absolute font-extrabold whitespace-nowrap z-10"
            style={{ left: `calc(${FLOAT_ZONES.crit.left} + ${fjitter(t.trickNo * 5 + 2, JITTER_X)}px)`,
                     top:  `calc(${FLOAT_ZONES.crit.top} + ${fjitter(t.trickNo * 5 + 9, JITTER_Y)}px)`,
                     fontSize: 26, color: critColor, textTransform: "uppercase", // Loc: Caps via CSS
                     transform: reduced ? "translateX(-50%)" : undefined,
                     animation: fx(`as-krit ${clamp(flipMs * 0.8, 400, 900) + 1000}ms ease-out forwards`) }}>
            {/* #ios-word: Glow bewusst auf einem INNEREN Element — Filter und (skalierende) Animation am selben Knoten
                lassen WebKit die Filter-Region unvollständig invalidieren (Geister-Kopie, s. GottChromeWord.jsx). */}
            <span className="neon-num" style={floatNumStyle(critColor, 1.5, 1.4)}>{reduced ? `Kritisch ×${critMultStr}` : "Kritisch!"}</span>
          </div>
        )}

        <Side label={tr("bf.side.you")} remaining={remaining} position={deckPos} deckLen={deckLen} dealFrom="left" backImage={deckBack} slotRef={deckSlotRef} baseCard
              overlay={playerGhosts.length ? <SlashGhostLayer ghosts={playerGhosts} /> : null}>{playerCard}</Side>

        {/* #214: „vs"-Schwerter-Icon (#42) entfernt — die beiden Seiten stehen sich jetzt ohne Trenn-Icon gegenüber. */}

        <div ref={oppSlotRef} className="flex">
          <Side label={tr("bf.side.opponent")} remaining={remaining} position={deckPos} deckLen={deckLen} dealFrom="right" backImage={oppBackImg} slotRef={oppDeckSlotRef}
                overlay={oppGhosts.length ? <SlashGhostLayer ghosts={oppGhosts} panelRef={panelRef} /> : null}>{oppCard}</Side>
        </div>

        {/* Aufsteigende Zahlen (#49/#68): je Typ eigene Streuzone (Score links / Leben rechts) mit
            kleinem, deterministischem Jitter aus trickNo → gleiche Typen dicht, verschiedene getrennt,
            aufeinanderfolgende überlappen nur leicht statt exakt zu stapeln. Pool gedeckelt.
            #389: per hideFloatScore ausblendbar (Score zählt unabhängig weiter — nur die Popups verschwinden). */}
        {!hideFloatScore && floats.map((f) => {
          const z = FLOAT_ZONES[f.zone];
          // #: Score-Zahlen fächern über die Spur (lane) vertikal auf; nur noch kleiner Rest-Jitter (statt voller JITTER_Y),
          // damit die aufsteigende Spalte sauber lesbar bleibt statt sich zu stapeln.
          const laneY = f.lane != null ? FLOAT_LANES[f.lane] : 0;
          const dx = fjitter(f.seed, JITTER_X), dy = laneY + fjitter(f.seed * 1.7 + 3, f.lane != null ? 4 : JITTER_Y);
          const pos = { top: `calc(${z.top} + ${dy}px)` };
          if (z.left != null)  pos.left  = `calc(${z.left} + ${dx}px)`;
          if (z.right != null) pos.right = `calc(${z.right} + ${dx}px)`;
          return (
            <div key={f.id} className="pointer-events-none absolute font-bold whitespace-nowrap"
              style={{ ...pos, color: f.color, fontSize: floatSize(f.value || 0), lineHeight: 1,
                       animation: fx(`as-float ${f.dur}ms ease-out forwards`) }}>
              {SHOW_HIT_ICONS && f.icons && f.icons.length > 0 && (
                <span className="mr-1 inline-flex items-center gap-0.5 align-middle" style={{ WebkitTextFillColor: "initial" }}>
                  {f.icons.map((k) => <FactionIcon key={k} type={k} style={{ width: "0.85em", height: "0.85em" }} />)}
                </span>
              )}
              {/* #: Score-Zahlen im selben Stil wie die Kartennummern (durchsichtige Füllung + farbige Kontur + Glow). */}
              <span className="card-num" style={floatNumStyle(f.color)}>{f.text}</span>
            </div>
          );
        })}
        {/* Benanntes Formations-Feedback (§17): unten rechts, eigene Bahn; Peak-Styling ab ×6/×12.
            Aus formFloat (stich-entkoppelt): aktiv → as-combo-hold (hält); beim Verlassen → as-combo-out
            (klingt über FORM_LINGER_MS aus) → bleibt so ~1,5 s länger stehen als sein Stich. #389: per hideFloatMult ausblendbar. */}
        {formFloat && !hideFloatMult && (
          <div key={`form${formFloat.key}`} className="pointer-events-none absolute font-extrabold whitespace-nowrap z-10"
            style={{ right: `calc(${FLOAT_ZONES.formation.right} + ${fjitter(formFloat.key * 4 + 5, JITTER_X)}px)`,
                     top:  `calc(${FLOAT_ZONES.formation.top} + ${fjitter(formFloat.key * 4 + 11, JITTER_Y)}px)`,
                     fontSize: formFloat.peak === 2 ? 26 : formFloat.peak === 1 ? 21 : 17,
                     textTransform: "uppercase", // Loc: Formations-Label-Caps via CSS
                     color: formFloat.color,
                     animation: fx(formLeaving
                       ? `as-combo-out ${FORM_LINGER_MS}ms ease-out forwards`
                       : `as-combo-hold ${floatDur}ms ease-out forwards`) }}>
            {/* #: Kartennummern-Stil (Kontur); Peak-Stufen leuchten stufig stärker (vorher als eigener text-shadow gesetzt).
                #ios-word: Glow auf dem INNEREN Element, nicht auf dem animierten (s. Krit-Float oben). */}
            <span className="neon-num" style={floatNumStyle(formFloat.color, formFloat.peak === 2 ? 1.6 : 1.4,
                                                            formFloat.peak === 2 ? 1.6 : formFloat.peak === 1 ? 1.3 : 1.1,
                                                            formFloat.peak ? "cc" : "88")}>
              {formFloat.peak === 2 && "★ "}{formFloat.label} ×{formFloat.mult}
            </span>
          </div>
        )}
      </div>

      {/* #ansage-vorn: Die Groß-Score-Ansagen (STARK/BRUTAL/IRRE/GOTTGLEICH/Lawine/Gönn dir) liegen in einer EIGENEN
          panelweiten Top-Ebene (z-40) ÜBER ALLEN Effekt-Layern (Karten-Anims z11, Schwarzes Loch z22, Finisher …).
          Vorher steckten sie im z-10-Karten-Container (eigener Stacking-Context) → dessen z-30/31 kam nie über die
          Effekt-Geschwister hinaus, die Ansagen lagen HINTER den Karten-Effekten. Panelweites Overlay → immer ganz vorne. */}
      <div className="pointer-events-none absolute inset-0" style={{ zIndex: 40 }}>
        {bigFloats.map((b) => {
          // #perf-B: Groß-Ansage-Glow auf Mobile (lite) enger ziehen. Die 32/34px-Blur-Radien sind teuer (Blur-
          // Repaint über die 1,9-s-Animation) UND divergieren stark: WebKit (iPhone) malt sie deutlich breiter als
          // Blink (Android) → auf dem iPhone „überzogen". Kleiner = günstiger + beide Geräte näher beieinander.
          // Desktop/voll behält den vollen, dramatischen Bloom.
          const gBig = lite ? 16 : 32, gMid = lite ? 8 : 12;
          /* #ansage-deck: Beide Zweige holen ihre Farbe jetzt aus `announceChrome.js` statt sie hier auszurechnen.
             Epische Wortmarke: „Gönn dir" (deckAlways) immer Deckfarbe · Gottgleich/Lawine weiter am Prunk-Schalter.
             Nicht-epische Stufen: der `chrome`-Block wird aus den Deckfarben gebaut; `null` (kein lesbares Deck)
             fällt auf den fest eingetragenen Satz der Stufe zurück, die Ansage bleibt also nie ohne Farbe. */
          const [wordC1, wordC2] = epicWordColors(b.tier, gottDeck, deckA1, deckA2);
          const chrome = deckChrome(deckA1, deckA2, b.tier.rank) || b.tier.chrome;
          // #gott: Synthwave-Chrome-Ansage (geteilter Look für GOTTGLEICH/Lawine/Gönn dir). Chrome-Verlauf (Weiß →
          // Akzent oben → dunkle Horizontlinie → Weiß → Akzent unten), Neon-Glow im Akzent, Sheen-Sweep über die
          // Buchstaben. Ohne Farbe (Gottgleich/Lawine außerhalb des Deckfarbe-Modus) = Synthwave-Zweiton Cyan→Magenta.
          return b.tier.epic ? (
            // #gott: geteilte Synthwave-Chrome-Wortmarke (identisch mit der Shop-Vorschau → eine Wahrheit, kein Drift).
            <GottChromeWord key={b.id} text={tr(b.tier.key)}
              color={wordC1} color2={wordC2}
              gBig={gBig} gMid={gMid} reduced={reduced}
              /* #perf-ansage2: Der Sheen-Sweep fällt auf `lite` weg — bis hierher hing er allein an `reduced`,
                 lief auf dem Handy (Default „ausgewogen" → lite, nicht reduced) also mit. Er ist der teuerste
                 Posten der epischen Ansage: eine `<mask>` mit einer ZWEITEN vollen Textinstanz plus ein per SMIL
                 0,95 s lang bewegtes `<rect>`. Weil die Maske eine Paint-Operation INNERHALB des SVG ist, wird der
                 gesamte gefilterte Teilbaum — samt der drei drop-shadow-Lagen — eine Sekunde lang JE FRAME neu
                 gerastert. Die `willChange`-Promotion in GottChromeWord schützt davor nicht: sie verhindert
                 Re-Raster durch die TRANSFORMATION, nicht durch geänderten Inhalt.
                 Die Wortmarke selbst bleibt unangetastet (Chrome-Verlauf, Kontur, Glow) — nur der Lichtstreifen
                 fehlt. Damit bleibt Gottgleich auf dem Handy als eigene Stufe erkennbar, und die Shop-Vorschau
                 (`sheen="loop"`) zeigt weiter denselben Aufbau. */
              sheen={reduced || lite ? "off" : "once"} idKey={b.id}
              style={{ left: "50%", top: "50%", width: "72%", zIndex: 31,
                       transform: reduced ? "translate(-50%, -50%)" : undefined,
                       animation: fx(`as-bigscore ${BIG_ANNOUNCE_MS}ms ease-out forwards`) }} />
          ) : (
          // #344/#354: Neon-Synthwave-CHROME (statisch, kein Sweep). ZWEI-SCHICHT für Präsenz wie Gottgleich: eine solide,
          //   kontrastreiche Basis-Glyphe (near-white + kräftiger Farb-Glow-Halo) UNTER dem metallischen Chrome-Verlauf.
          //   #354: Vorher war die Wortmarke NUR transparent-gefülltes Chrome → deutlich blasser als der solide Gottgleich-
          //   SVG-Text und darum neben dem Krit-Trubel leicht zu übersehen. Die Basis macht Stark/Brutal/Irre bei JEDEM Sieg
          //   (auch Krit) sicher lesbar; das Chrome (leicht durchscheinend) legt den Metallic-Look darüber. Exakt mittig.
          <div key={b.id} className="pointer-events-none absolute" aria-hidden="true"
            /* #perf-ansage2: `willChange` gab es bis hierher NUR am epischen Zweig (GottChromeWord.jsx) — ohne
               Grund, die Konstruktion ist dieselbe: außen die skalierende `as-bigscore`-Animation, innen die
               gefilterten Wortschichten. Ohne die Promotion muss der Browser die Blur-Lagen über die 1,9 s
               möglicherweise je Frame neu rastern, statt die fertige Ebene auf dem Compositor zu skalieren.
               Diese Stufen feuern häufiger als die epische — und seit `cool` oben auf 4000 steht, wieder deutlich
               häufiger. Kostet eine Compositor-Ebene für 1,9 s; das ist bei einer Vollbild-Blur-Animation der
               richtige Tausch. GERECHNET, nicht am Gerät gemessen. */
            style={{ left: "50%", top: "50%", zIndex: 30, willChange: "transform, opacity",
                     transform: reduced ? "translate(-50%, -50%)" : undefined,
                     animation: fx(`as-bigscore ${BIG_ANNOUNCE_MS}ms ease-out forwards`) }}>
            {(() => {
              /* #typo: Die Groß-Ansage bleibt bewusst bei 800 — die Drei-Sprossen-Leiter (400/500/600) gilt für
                 die BEDIENOBERFLÄCHE. Hier steht ein Effekt: ein einzelnes Wort auf 40–100 px, das eine halbe
                 Sekunde lang den Bildschirm besitzt und dabei gegen Klinge, Glut und Screenshake bestehen muss.
                 Auf dieser Größe liest sich 600 nicht ruhiger, sondern dünn. Schriftfamilie erbt es (Geist). */
              const ws = { margin: 0, fontWeight: 800, whiteSpace: "nowrap", lineHeight: 1, textTransform: "uppercase", // Q2/Loc: Caps zentral über CSS
                fontSize: `clamp(40px, 10vw, ${b.tier.size}px)`, letterSpacing: `${b.tier.rank}px` }; // höhere Stufe = luftiger
              /* #perf-ansage: Auf `lite` fällt die CHROME-Schicht weg — es bleibt die solide Basis-Glyphe.

                 Warum ausgerechnet hier: die Groß-Ansage ist das EINZIGE gefilterte Element des Bretts, das über
                 seine ganze Lebensdauer (BIG_ANNOUNCE_MS = 1,9 s) SKALIERT animiert wird (`as-bigscore`, Überschwinger
                 auf 1,2). Ein Filter auf einem skalierenden Element muss je Frame neu gerastert werden — bei den
                 Kartenzahlen und Floats passiert das nur einmal je Aufdecken bzw. gar nicht (die steigen über
                 transform/opacity, das komponiert der Browser ohne Neuraster). Zwei Wortschichten à 40–90 px mit
                 zusammen SIEBEN drop-shadow-Lagen werden damit zu drei Lagen auf EINER Schicht.

                 Warum die Basis bleibt und nicht das Chrome: die Basis ist die lesbare Schicht (#354 hat sie genau
                 dafür eingeführt — das reine Chrome mit transparenter Füllung war neben dem Krit-Trubel zu blass).
                 Ohne Chrome verliert das Wort den Metallic-Verlauf, nicht seine Präsenz; ohne Basis wäre es umgekehrt.

                 `lite` ist bewusst derselbe Knopf wie bei gBig/gMid zwei Zeilen höher (= alles außer „Effekte: aus",
                 also Handy-Default UND Desktop-„ausgewogen"). Genau das bedeutet die Einstellung: teure Schichten weg.
                 NICHT angefasst ist der epische Zweig (GottChromeWord, SVG) — eigene Komponente, eigener Glow, und
                 sie feuert selten statt bei jedem stärkeren Sieg. GERECHNET, nicht am Gerät gemessen.

                 Falle beim Umschalten: die Chrome-Schicht war die IM FLUSS liegende (position: relative) und hat dem
                 Wrapper seine Größe gegeben, die Basis lag absolut darüber. Fällt das Chrome weg, muss die Basis in den
                 Fluss — sonst ist der Wrapper 0×0 und die Zentrierung (translate −50 %) sitzt auf nichts. */
              const chromeOn = !lite;
              return (<>
                <span style={{ ...ws, position: chromeOn ? "absolute" : "relative", left: 0, top: 0, color: "#f6f2ff", WebkitTextFillColor: "#f6f2ff",
                  filter: `drop-shadow(0 0 ${gMid}px ${chrome.glow}) drop-shadow(0 0 ${gBig}px ${chrome.glow}cc) drop-shadow(0 2px 3px #000b)` }}>{tr(b.tier.key)}</span>
                {chromeOn && (
                  <span style={{ ...ws, position: "relative", backgroundImage: chrome.grad, backgroundSize: "100% auto", // 100% → KEIN wandernder Sweep
                    WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", WebkitTextFillColor: "transparent",
                    filter: chromeFilter(chrome, gBig, gMid), opacity: 0.8 }}>{tr(b.tier.key)}</span>
                )}
              </>);
            })()}
          </div>
          );
        })}
      </div>

      {/* Sieg/Niederlage-Ansage — sitzt jetzt tiefer (etwa dort, wo früher die Multiplikator-Leiste stand): die Karten
          rücken per mt-8 nach unten, wodurch diese Ansage mitwandert und auf der alten Multiplikator-Höhe landet. */}
      <div className={`bf-result relative z-10 h-8 ${ketteOben ? "mt-10" : "mt-4"} flex items-center justify-center`}>
        {/* #389: Sieg/Niederlage-Text per hideFloatWinLose ausblendbar. Die feste Höhe (h-8) bleibt reserviert →
            kein Layout-Sprung; nur der Text verschwindet. Ausgang zählt unabhängig weiter. */}
        {banner && hideFloatWinLose ? null : banner ? (
          <span className="text-lg font-extrabold tracking-wide uppercase" style={{ color: banner.color }}>{tr(banner.key)}</span>
        ) : (
          <span className="opacity-40 text-sm">{tr("bf.ready")}</span>
        )}
      </div>

      {!ketteOben && kette}
    </div>
    {/* #: Krit-Vollbild-Flash/Vignette (CritScreenFx) entfernt — Krit-Finisher-Animationen raus. Der Screen-Shake bleibt
        (für große Siege, gemeinsam mit normalen Siegen); die „Kritisch!"-Anzeige + Lila bleiben unverändert. */}
   </>
  );
}
