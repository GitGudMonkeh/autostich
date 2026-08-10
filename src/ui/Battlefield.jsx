import { useState, useEffect, useRef, memo } from "react";
import { Card, CardBack } from "./Card.jsx";
import { clamp } from "../game/deck.js";
import { TRICKS_PER_CYCLE, suitColor, AUSLAEUFER_HARVEST } from "../game/constants.js";
import { linkedPartnerOf } from "../game/shop.js";
import { formationBorder } from "./formationStyle.js";
import { formationLabel } from "./formationLabels.js";
import { audio } from "./audio.js";
import { useBlackholeSfx } from "./finisherSfx.js"; // #298: Schwarzes-Loch-Ton-Bett (leiser Start → Anschwellen → schneller Kollaps), geteilt mit der Shop-Vorschau
import { useReducedFx } from "./useReducedFx.js";
import { startPrunk } from "./prunkFx.js";
import { PhaseHairline } from "./modalStyle.jsx";
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

const BANNER = {
  win:     { text: "Gewonnen",            color: "#5ab87a" },
  win_tie: { text: "Gleichstand → Sieg",  color: "#8a7de0" },
  loss:    { text: "Verloren",            color: "#e0605a" },
  tie:     { text: "Gleichstand",         color: "#8a8a92" },
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
const BIG_SCORE_TIERS = [
  { min: 500000, text: "Gottgleich", size: 104, epic: true }, // epic = Sonder-Ansage: ~70 % Panelbreite, mittig, weiß (dominiert die Gold-Stufen darunter)
  { min: 150000, text: "Irre",       size: 90 },
  { min: 50000,  text: "Brutal",     size: 78 },
  { min: 10000,  text: "Stark",      size: 68 },
];
const bigScoreTier = (g) => { for (const s of BIG_SCORE_TIERS) if (g > s.min) return s; return null; };
// Große Lawine (Legendär): der Finisher-Bruch zeigt statt der Score-Stufe („Gottgleich" …) das Wort „Lawine" in Eis-Blau.
const LAWINE_TIER = { text: "Lawine", size: 104, epic: true, color: "#5ec8f0" };
// Serien-Meilenstein: ab einer Siegesserie von STREAK_GOENN feuert einmalig eine epische „Gönn dir"-Ansage (Gottgleich-Stil, festliches Gold).
const STREAK_GOENN = 200;
const GOENNDIR_TIER = { text: "Gönn dir", size: 104, epic: true, color: "#ffd24a" };
// #FB: Groß-Ansage („wie stark"). Sie hing bislang am Stich-Takt (key=trickNo) und wurde vom Folgestich sofort
// ersetzt → bei 4×/MAX (flipMs ~160–440 ms) nur einen Wimpernschlag sichtbar. Jetzt entkoppelt in einem eigenen
// Pool mit fester, langer Standzeit, damit sie ihre Animation IMMER voll ausspielt (auch bei Turbo).
const BIG_ANNOUNCE_MS = 1900;       // feste Lebensdauer der Groß-Ansage — turbo-unabhängig, damit auch bei 4×/MAX lesbar
// Vertikale Spuren gegen „zu sehr überlappen": aufeinanderfolgende Ansagen rotieren durch diese Y-Versätze (px, um die
// Bildmitte), damit sie sich fächern statt exakt zu stapeln. Pool ist zusätzlich klein gedeckelt (max 3 gleichzeitig).
const BIG_LANES = [0, -64, 64];
// #188: Score-skalierte Effekt-Intensität aus dem Per-Stich-Score (t.gained). Nutzt DIESELBEN Schwellen wie
// BIG_SCORE_TIERS → Slice/Explosion + Groß-Ansage eskalieren gemeinsam. Rückgabe:
//   p    = weicher Anteil 0..1 (0 = heutiger Look/Floor bei ≤ STARK-Schwelle 10k, 1 = GOTTGLEICH 500k) — log-skaliert
//   tier = harte Stufe 0..4 (0 Base · 1 STARK · 2 BRUTAL · 3 IRRE · 4 GOTTGLEICH) für Unlock-Flourishes
const FX_TIER_MINS = [10000, 50000, 150000, 500000]; // STARK · BRUTAL · IRRE · GOTTGLEICH (aus BIG_SCORE_TIERS)
function fxIntensity(gained) {
  const g = gained > 0 ? gained : 0;
  let tier = 0;
  for (let i = 0; i < FX_TIER_MINS.length; i++) if (g >= FX_TIER_MINS[i]) tier = i + 1;
  const p = g <= 10000 ? 0 : Math.min(1, Math.log(g / 10000) / Math.log(50)); // log(500000/10000) = log(50) → 10k→0 … 500k→1
  return { p, tier };
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
const floatNumStyle = (color, stroke = 1.5) => ({ fontFamily: '"Helvetica Neue", Arial, sans-serif', fontWeight: 900,
  WebkitTextFillColor: "transparent", WebkitTextStroke: `${stroke}px ${color}`, textShadow: `0 0 7px ${color}aa` });
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
// Ergebnisabhängige Flip-Lautstärke (tunable): Sieg laut & erkennbar, Niederlage deutlich leiser → klarer
// hörbarer Kontrast Sieg↔Niederlage. Effektiv = Gain × SFX-Lautstärke (Default 0,4 → Sieg 0,6 · Niederlage 0,08).
const CARDFLIP_GAIN = { win: 1.5, win_tie: 1.5, tie: 0.6, loss: 0.2 };
const CARDFLIP_GAIN_CONST = 0.9; // #: konstante Flip-Lautstärke bei JEDEM Flip (Mitte zwischen altem Sieg-/Niederlage-Pegel)
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
function Side({ label, remaining, position = 0, deckLen = 0, dealFrom, children, overlay = null, backImage = null }) {
  const dir = dealFrom === "left" ? -1 : 1;
  const behind = Math.min(3, Math.max(0, remaining - 1));
  return (
    <div className="flex flex-col items-center gap-2 shrink-0">
      <div className="text-[11px] uppercase tracking-wide opacity-55">{label}</div>
      <div className="relative" style={{ width: 104, height: 144 }}>
        {Array.from({ length: behind }, (_, i) => (
          <div key={i} className="absolute top-0" style={{ left: dir * (i + 1) * 3 }}>
            <CardBack label="" image={backImage} />
          </div>
        ))}
        {children}
        {overlay}
      </div>
      <div className="text-[11px] opacity-55">Deck: {position} / {deckLen}</div>
    </div>
  );
}

/* #180 Flip-Reveal: die aufgedeckte Spielerkarte dreht sich aus dem Deck-Rücken (Prisma) in die Front
   (`front` = fertige Karte mit Zahl/Effekten). 3D-rotateY, Dauer an den Flip-Takt gekoppelt. Zwei Faces mit
   `backface-visibility: hidden`: erst die Rückseite, ab der Mitte die Front. Position:relative → malt (wie die
   Karte sonst) über die Ergebnis-Welle. Nur für die Spielerseite; bei reduzierter Bewegung nicht gerendert. */
function FlipReveal({ front, backImage, dur }) {
  return (
    <div className="as-flip3d" style={{ width: 104, height: 144 }}>
      <div className="as-flip3d-inner" style={{ animation: `as-flip-reveal ${dur}ms ease-out both`, willChange: "transform" }}>
        <div className="as-flip3d-face as-flip3d-back"><CardBack label="" image={backImage} /></div>
        <div className="as-flip3d-face as-flip3d-front">{front}</div>
      </div>
    </div>
  );
}

/* #177 Klingenschnitt: Overlay über der Verliererkarte (fixe 104×144-Box). Rendert zwei clip-path-Klone der
   Karte (Ober-/Unterteil entlang −24°), eine aus der Mitte wachsende Schnittlinie in Suit-Farbe und ~18 Funken
   (≈40 % weiß / 60 % Suit-Farbe, ein paar „Konfetti"-Rechtecke). Deterministisch aus `seed` (kein Math.random
   im Render, #68). Alle Dauern kommen an den Flip-Takt gekoppelt rein → kein Überlaufen in den nächsten Stich.
   Elemente entfernen sich mit dem Karten-Remount des nächsten Stichs (key nach trickNo) → kein Stapeln. */
export function SliceFx({ cardEl, color, halvesDur, cutDur, sparkDur, seed, delay = 0, intensity = 0, tier = 0, scale = 1, laser = false }) {
  // #188: score-skaliert. Kontinuierlich: Funkenzahl/-weite, Hälften-Distanz, Schnittlinien-Länge/Glow.
  // Unlocks: ab BRUTAL (tier≥2) ein zweiter Kreuzschnitt, ab IRRE (tier≥3) zerfällt die Karte in VIER Teile
  // statt zwei Hälften (optische Brücke zur Explosion). Screen-Effekte bleiben dem Crit vorbehalten (v2).
  const sepMul = 1 + intensity * 0.6;   // Hälften/Viertel fliegen weiter
  const radMul = 1 + intensity * 0.6;   // Funken streuen weiter
  const N = Math.max(6, Math.round((18 + intensity * 14) * scale)); // 18..32 Funken, turbo-ausgedünnt (#200 A, Boden 6)
  const cutLen = Math.round(120 * (1 + intensity * 0.4)); // Schnittlinie länger
  const quarters = tier >= 3;           // IRRE+: vier Teile
  const crossCut = tier >= 2;           // BRUTAL+: zweiter Kreuzschnitt
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
  // Schnittlinie (Winkel als CSS-Var → zweiter Kreuzschnitt nutzt dasselbe Keyframe mit anderem --cut-rot).
  const cutLine = (rot, key) => (
    <div key={key} style={{ position: "absolute", left: "50%", top: "50%", width: cutLen, height: 3, marginLeft: -cutLen / 2, marginTop: -1.5,
      background: color, borderRadius: 2, transformOrigin: "center", boxShadow: `0 0 ${(6 + intensity * 6).toFixed(0)}px ${color}, 0 0 ${(14 + intensity * 10).toFixed(0)}px ${color}aa`,
      "--cut-rot": `${rot}deg`, animation: `as-cut-line ${cutDur}ms ease-out ${delay}ms both` }} />
  );

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
  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
      {quarters ? (
        // IRRE+: vier Viertel (2×2-clip), fliegen in die vier Ecken (as-boom-shard-Bahn: --sx/--sy/--sr, 0%/9%-Halt).
        [{ clip: "inset(0 50% 50% 0)", dx: -1, dy: -1 }, { clip: "inset(0 0 50% 50%)", dx: 1, dy: -1 },
         { clip: "inset(50% 50% 0 0)", dx: -1, dy: 1 }, { clip: "inset(50% 0 0 50%)", dx: 1, dy: 1 }].map((q, k) => {
          const dist = 54 * sepMul;
          return (
            <div key={`q${k}`} className="absolute inset-0" style={{ clipPath: q.clip,
              "--sx": `${(q.dx * dist).toFixed(1)}px`, "--sy": `${(q.dy * dist + 12).toFixed(1)}px`, "--sr": `${fjitter(seed * 7 + k * 5, 22)}deg`,
              animation: `as-boom-shard ${halvesDur}ms ${ease} ${delay}ms both`, willChange: "transform, opacity" }}>{cardEl}</div>
          );
        })
      ) : (
        <>
          {/* Zwei Hälften — Klone der Verliererkarte, entlang der −24°-Schnittkante geteilt. Distanz via CSS-Var skaliert. */}
          <div className="absolute inset-0" style={{ clipPath: "polygon(0 0, 100% 0, 100% 34%, 0 66%)",
            "--half-tx": `${(-46 * sepMul).toFixed(1)}px`, "--half-ty": `${(-30 * sepMul).toFixed(1)}px`,
            animation: `as-slice-top ${halvesDur}ms ${ease} ${delay}ms both`, willChange: "transform, opacity" }}>{cardEl}</div>
          <div className="absolute inset-0" style={{ clipPath: "polygon(0 66%, 100% 34%, 100% 100%, 0 100%)",
            "--half-bx": `${(46 * sepMul).toFixed(1)}px`, "--half-by": `${(60 * sepMul).toFixed(1)}px`,
            animation: `as-slice-bottom ${halvesDur}ms ${ease} ${delay}ms both`, willChange: "transform, opacity" }}>{cardEl}</div>
        </>
      )}
      {cutLine(-24, "cut1")}
      {crossCut && cutLine(22, "cut2")}
      {/* Funken aus dem Schnittzentrum. */}
      {sparks.map((s) => (
        <div key={s.i} style={{
          position: "absolute", left: "50%", top: "50%",
          width: s.confetti ? 6 : 4, height: s.confetti ? 3 : 4, borderRadius: s.confetti ? 1 : "50%",
          background: s.white ? "#ffffff" : color, boxShadow: `0 0 5px ${s.white ? "#ffffff" : color}`,
          "--dx": `${s.dx}px`, "--dy": `${s.dy}px`,
          animation: `as-spark ${sparkDur}ms ease-out ${delay}ms both`, willChange: "transform, opacity",
        }} />
      ))}
    </div>
  );
}

// #: ExplosionFx (Krit-Partikelexplosion) entfernt — Krit-Finisher-Animationen raus.

/* #295 Sieg-Finisher „Lasergitter": ein Neon-Gitter (R−1 horizontale + C−1 vertikale Linien) blitzt über die noch
   ganze Gegnerkarte, dann zerfällt sie ENTLANG der Linien in ein Raster aus R×C Stücken (clip-path inset — echter
   Karten-Pixelraum), die radial nach außen bersten (as-boom-shard). Deterministisch aus `seed` (kein Math.random,
   #68). Dichte skaliert mit dem Score/Crit-Tier: 3×4 (grob) bzw. 4×6 (fein ab tier≥2). Die Stücke halten (0%/9% +
   fill both, delay = rest + Linien-Blitz) den Ganz-Zustand → die Karte liegt erst still, das Gitter blitzt, DANN
   zerfällt sie. Deck-/Suit-farbige Linien & Stücke. Wird nur bei normaler Bewegung gerendert (Aufrufer prüft `reduced`). */
export function LaserGridFx({ cardEl, color, diceDur, lineDur, seed, delay = 0, intensity = 0, tier = 0, scale = 1 }) {
  const fine = tier >= 2;                                 // ab BRUTAL feiner (4×6), sonst 3×4
  const ROWS = fine ? 4 : 3, COLS = fine ? 6 : 4;
  const spreadMul = 1 + intensity * 0.6;                  // Stücke fliegen weiter bei großen Treffern
  const lineMs = Math.round(lineDur);                     // Gitter-Blitz; danach erst der Zerfall
  const diceMs = Math.round(diceDur);
  const hLines = Array.from({ length: ROWS - 1 }, (_, r) => ({ k: `h${r}`, horizontal: true, pos: `${(((r + 1) / ROWS) * 100).toFixed(2)}%` }));
  const vLines = Array.from({ length: COLS - 1 }, (_, c) => ({ k: `v${c}`, horizontal: false, pos: `${(((c + 1) / COLS) * 100).toFixed(2)}%` }));
  const pieces = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const i = r * COLS + c;
      const dirX = (c + 0.5) / COLS - 0.5, dirY = (r + 0.5) / ROWS - 0.5; // Zellmitte relativ zur Kartenmitte
      const spread = (70 + Math.abs(fjitter(seed * 5 + i * 13, 44))) * spreadMul;
      pieces.push({
        i,
        clip: `inset(${((r / ROWS) * 100).toFixed(2)}% ${(((COLS - 1 - c) / COLS) * 100).toFixed(2)}% ${(((ROWS - 1 - r) / ROWS) * 100).toFixed(2)}% ${((c / COLS) * 100).toFixed(2)}%)`,
        sx: (dirX * spread + fjitter(seed * 3 + i * 7, 16)).toFixed(1),
        sy: (dirY * spread + fjitter(seed * 2 + i * 11, 16) + 16).toFixed(1), // + leichte Schwerkraft nach unten
        sr: (((r + c) % 2 ? 1 : -1) * (10 + ((r + c) % 3) * 8) + fjitter(seed * 7 + i * 5, 8)).toFixed(1),
      });
    }
  }
  const ease = "cubic-bezier(0.2, 0.7, 0.3, 1)";
  // #303 Gitter deutlich sichtbarer: weiß-glühender Kern im Verlauf, dickere Linien, mehrlagiger Glow (skaliert mit dem
  // Treffer), und ein NACHLEUCHTEN — die Linien blitzen zuerst hell auf (über lineMs) und glühen dann über den Zerfall
  // (afterMs) langsam aus, statt sofort zu verschwinden. So bleibt das Gitter während des Karten-Zerfalls lesbar.
  const glowK = 1 + intensity * 0.85 + (tier >= 2 ? 0.3 : 0);                     // Glow-Intensität (Treffer/Stufe)
  const afterMs = Math.round(diceMs * 0.8);                                       // Nachleucht-Dauer (über den Zerfall)
  const lineTotal = lineMs + afterMs;
  const lineThick = fine ? 1.25 : 1.5;                                            // #: wieder fein/laser-artig (Glow + Nachhall bleiben)
  const lineShadow = `0 0 ${(6 * glowK).toFixed(0)}px 1px #ffffff, 0 0 ${(16 * glowK).toFixed(0)}px ${(3 * glowK).toFixed(1)}px ${color}, 0 0 ${(34 * glowK).toFixed(0)}px ${(10 * glowK).toFixed(0)}px ${color}aa`;
  const lineGrad = (h) => `linear-gradient(${h ? "90deg" : "0deg"}, transparent, ${color}, #ffffff, ${color}, transparent)`; // heißer Weiß-Kern
  // #: Rahmen-Gradient BLEIBT an den Enden hell (kein transparent) → die vier Kanten verbinden sich an den Ecken zu
  // einem geschlossenen Rahmen in Kartengröße; das Gitter sieht dadurch wie ein Laser-Gitter in Kartenform aus.
  const frameGrad = (h) => `linear-gradient(${h ? "90deg" : "0deg"}, ${color}, #ffffff, ${color})`;
  const frameLines = [
    { k: "ft", h: true,  box: { left: 0, right: 0, top: 0, height: lineThick } },
    { k: "fb", h: true,  box: { left: 0, right: 0, bottom: 0, height: lineThick } },
    { k: "fl", h: false, box: { top: 0, bottom: 0, left: 0, width: lineThick } },
    { k: "fr", h: false, box: { top: 0, bottom: 0, right: 0, width: lineThick } },
  ];
  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
      {/* #: Laser-Rahmen außen in Kartengröße — gleiche Blitz-/Nachleucht-Animation wie die Gitterlinien. */}
      {frameLines.map((f) => (
        <div key={f.k} className="absolute" style={{ ...f.box, background: frameGrad(f.h), boxShadow: lineShadow,
          animation: `as-lg-line ${lineTotal}ms ease-out ${delay}ms both` }} />
      ))}
      {/* Raster-Stücke: halten bis delay+lineMs den Ganz-Zustand, dann bersten sie entlang der Linien nach außen. */}
      {pieces.map((s) => (
        <div key={`gp${s.i}`} className="absolute inset-0" style={{ clipPath: s.clip,
          "--sx": `${s.sx}px`, "--sy": `${s.sy}px`, "--sr": `${s.sr}deg`,
          animation: `as-boom-shard ${diceMs}ms ${ease} ${delay + lineMs}ms both`, willChange: "transform, opacity" }}>{cardEl}</div>
      ))}
      {/* Gitterlinien: heller Aufblitz über der (noch ganzen) Karte, danach Nachleuchten über den Zerfall (as-lg-line). */}
      {[...hLines, ...vLines].map((ln) => (
        <div key={ln.k} className="absolute" style={ln.horizontal
          ? { left: 0, right: 0, top: ln.pos, height: lineThick, marginTop: -lineThick / 2, background: lineGrad(true), boxShadow: lineShadow, transformOrigin: "center", animation: `as-lg-line ${lineTotal}ms ease-out ${delay}ms both` }
          : { top: 0, bottom: 0, left: ln.pos, width: lineThick, marginLeft: -lineThick / 2, background: lineGrad(false), boxShadow: lineShadow, transformOrigin: "center", animation: `as-lg-line ${lineTotal}ms ease-out ${delay}ms both` }} />
      ))}
    </div>
  );
}

/* #295/#302 Sieg-Finisher „Brennstrahl" — PER-SIEG-BURST auf der Gegnerkarte: ein glühendes Loch brennt in die EXAKTE
   Kartenmitte (left/top 50 % des fixen 104×144-Slots); die Karte DISINTEGRIERT dabei in viele KLEINE warme Partikel
   (Funken/Asche), die aus der Kartenfläche driften, schrumpfen & ausfaden — bewusst DEZENT (weniger/kleiner als der
   künftige „Zerstäuben"-Finisher, gemeinsamer Dichte-Parameter DISINT_DENSITY). Aus dem Loch springen zusätzlich
   Funken. Der eigentliche STRAHL ist persistent (BurnBeamPersist, s. u.). Dichte/Größe/Streuweite/Glow wachsen mit der
   Serie (`streak`). Budget an die Stich-Kadenz (flipMs) gekoppelt. Deterministisch aus `seed`. Reduced-safe (Aufrufer). */
// #302 Disintegrations-Raster: die Karte wird in DISINT_COLS×DISINT_ROWS kleine clip-path-Stücke zerlegt, die
// auseinanderstieben. Fein genug, dass die Karte sichtbar ZERFÄLLT (nicht nur „ein paar Punkte"), aber die spätere
// „Zerstäuben"-Referenz nutzt ein noch dichteres Raster + weitere Streuung → Abstufung bleibt über diese Werte klar.
const DISINT_COLS = 8, DISINT_ROWS = 11;
// #: Sichtbarkeits-Untergrenze der Zerfalls-Animation. Im Turbo ist flipMs klein → body*0.60 wäre zu kurz, um den Zerfall
// überhaupt zu sehen (die Karte wirkte, als würde sie nur „flippen"). Diese Untergrenze hält den Zerfall auch im Turbo
// sichtbar; die Bursts überlappen dann bewusst leicht in den nächsten Stich → der Strahl „zerstört eine Karte nach der
// anderen" (der Ghost lebt entsprechend länger, s. ghostLife). Reines Ausfaden von Fragmenten → kein Verdecken der Folgekarte.
// #: An „Zerstäuben" angeglichen (Wunsch): die Disintegration soll GENAUSO LANGE halten wie der Zerstäuben-Finisher —
// vorher endete sie (v. a. im Turbo) viel zu früh. Höherer Boden + größerer Budget-Anteil → die Fragmente verweilen
// deutlich länger; die Überlappung in den nächsten Stich ist bewusst gewollt (der Ghost lebt entsprechend, s. ghostLife).
const BURN_DISINT_MIN = 760; // #: bewusst knapper/snappier (vorher 1050, an Zerstäuben angeglichen — lief zu lange)
function burnDisintTiming(flipMs, delay) {
  const budget = Math.max(200, flipMs - 30);
  const body = Math.max(150, budget - delay);
  const hitAt = delay + Math.round(body * 0.13);                        // #: Einschlag landet früher/„snappier" auf der Karte (vorher 0.22)
  const disintDur = Math.max(BURN_DISINT_MIN, Math.round(body * 0.70)); // #: kürzerer Zerfall (vorher 0.85)
  return { body, hitAt, disintDur };
}
// #: Zerstäubungs-Dauer mit sichtbarem Boden (bei Max nicht zu schnell) — gemeinsam von DisperseFx (Animation) und
// dem Parent (ghostLife) genutzt, damit der Ghost genau so lange lebt, wie der Zerfall sichtbar ist.
const DISPERSE_MIN = 660;
function disperseDur(flipMs) { return Math.max(DISPERSE_MIN, Math.min((flipMs || 900) - 30, 960)); }
export function BurnBeamFx({ cardEl, color, flipMs = 900, seed, delay = 0, intensity = 0, scale = 1, streak = 0 }) {
  const HOT = "#ff7a2f";                                  // Hitze-Akzent (Ember-Orange)
  const streakK = clamp(streak / 12, 0, 1);               // 0..1: Serien-Eskalation
  const { body, hitAt, disintDur } = burnDisintTiming(flipMs, delay); // #: gemeinsame Turbo-sichere Zeitrechnung (mit Untergrenze)
  const holeMs = Math.round(body * 0.66);                 // endet ~ mit dem Budget (vor dem nächsten Flip)
  const holeMax = (1.8 + intensity * 0.5 + streakK * 0.7).toFixed(2); // #: glühend-rotes Loch wächst sichtbar (bei Serie mehr)
  // #302 Disintegrations-Fragmente: jedes Raster-Stück ist ein clip-path-Klon der ECHTEN Karte (inset auf seine Zelle),
  // driftet von der Kartenmitte weg (+ Schwerkraft = Asche fällt), schrumpft, rotiert leicht & fadet → die Karte selbst
  // zerfällt. Streuung mit der Serie leicht weiter. Ecken/Rand fliegen weiter als die Mitte (dirX/dirY-Skalierung).
  // #perf: Fragment-Raster an das Turbo-Tempo koppeln. Bei MAX (kleines flipMs → scale≈0.45) feuern die Stiche so
  // schnell, dass sich mehrere Brennstrahl-Ghosts überlappen (ghostCap ~6). 6 × 88 clip-path-Kartenklone = >500
  // gleichzeitige Kompositor-Ebenen → Ruckeln. Bei hohem Turbo ist die feine 8×11-Zerlegung ohnehin nicht erkennbar,
  // also gröber rastern (min 5×7=35) → ~60 % weniger Knoten je Ghost, wo die Überlappung am größten ist. Normal: 8×11.
  const DCOLS = Math.max(5, Math.round(DISINT_COLS * scale));
  const DROWS = Math.max(7, Math.round(DISINT_ROWS * scale));
  const NFRAG = DROWS * DCOLS;
  const frags = [];
  for (let r = 0; r < DROWS; r++) {
    for (let c = 0; c < DCOLS; c++) {
      const i = r * DCOLS + c;
      const dirX = (c + 0.5) / DCOLS - 0.5, dirY = (r + 0.5) / DROWS - 0.5; // Zellmitte relativ zur Kartenmitte
      // #: Streuweite an „Zerstäuben" angeglichen — die Fragmente fliegen radial deutlich weiter aus der Kartenmitte,
      // damit sich der Zerfall genauso breit verteilt wie beim Zerstäuben-Finisher (Serie streut zusätzlich weiter).
      const spread = 96 + Math.abs(fjitter(seed * 5 + i * 13, 60 + streakK * 44));
      frags.push({
        i,
        // clip-path inset(top right bottom left) blendet die Karte auf DIESE Zelle aus (Klon zeigt nur sein Stück).
        clip: `inset(${((r / DROWS) * 100).toFixed(2)}% ${(((DCOLS - 1 - c) / DCOLS) * 100).toFixed(2)}% ${(((DROWS - 1 - r) / DROWS) * 100).toFixed(2)}% ${((c / DCOLS) * 100).toFixed(2)}%)`,
        dx: (dirX * spread + fjitter(seed * 3 + i * 7, 8)).toFixed(1),
        dy: (dirY * spread + Math.abs(fjitter(seed * 2 + i * 11, 8)) + 12).toFixed(1),    // + Schwerkraft (Asche fällt)
        ds: (0.28 + Math.abs(fjitter(seed * 6 + i * 5, 0.22))).toFixed(2),                // Schrumpf-Endgröße 0.28..0.5
        dr: fjitter(seed * 7 + i * 9, 40).toFixed(0),                                     // −40..40° Rotation
        d: hitAt + Math.round((i / NFRAG) * disintDur * 0.12),                            // leichte Staffelung (im Budget)
      });
    }
  }
  // Funken springen fortlaufend aus dem Loch — Dichte (Zahl), Größe, Streuweite, Glow UND Streu-Fenster wachsen
  // deutlich mit der Serie (bleibt im Budget). streakK 0..1.
  // #perf: Ember-Funken bei hohem Turbo stärker kappen. Bei MAX (scale≈0.45) überlappen ~6 Brennstrahl-Ghosts → jeder
  // mit vielen leuchtenden Ember-Spans (boxShadow-Glow) summiert sich zu Ruckeln. scale² (statt scale) dünnt die Funken
  // genau dort aus, wo überlappt wird, lässt aber normales Tempo (scale=1 → ×1) unverändert. Bei MAX: ~×0.20 statt ×0.45.
  const N = Math.max(6, Math.round((10 + intensity * 8 + streakK * 54) * scale * scale)); // normal ~18…62 · MAX ~6…14
  const sparkWin = Math.round(body * 0.34 * streakK);
  const sparkAnim = Math.round(body * 0.32);
  const emberGlow = (3 + streakK * 7).toFixed(1);         // Glow-Radius je Funke wächst mit der Serie
  const embers = Array.from({ length: N }, (_, i) => {
    const ang = -Math.PI / 2 + fjitter(seed * 3 + i * 7, 1.2);       // nach oben, gestreut (bei Serie breiter)
    const rad = 18 + Math.abs(fjitter(seed * 5 + i * 13, 34 + streakK * 72)); // Streuweite wächst mit der Serie
    return {
      i,
      dx: (Math.cos(ang) * rad).toFixed(1),
      dy: (Math.sin(ang) * rad).toFixed(1),
      // heißere Mischung bei hoher Serie (mehr Weiß-/Goldglut), sonst Deck-/Ember-Farbe.
      c: i % 4 === 0 ? "#ffffff" : i % 4 === 1 ? "#ffd36a" : i % 4 === 2 ? HOT : color,
      sz: (1.4 + streakK * 1.6 + Math.abs(fjitter(seed * 7 + i * 5, 2.2))).toFixed(1), // größer mit der Serie
      d: hitAt + Math.round((i / N) * sparkWin),          // gestaffelt übers Fenster → springen fortlaufend heraus
    };
  });
  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
      {/* #302 Die Karte zerfällt in ihre Fragmente: R×C clip-path-Klone (zusammen = ganze Karte beim Einschlag),
          die dann auseinanderstieben, schrumpfen, rotieren & ausfaden — die Karte „zerstäubt", statt zu verblassen. */}
      {frags.map((s) => (
        <div key={`fr${s.i}`} className="absolute inset-0" style={{ clipPath: s.clip,
          "--dx": `${s.dx}px`, "--dy": `${s.dy}px`, "--ds": s.ds, "--dr": `${s.dr}deg`,
          animation: `as-burn-disintegrate ${disintDur}ms cubic-bezier(0.2,0.6,0.3,1) ${s.d}ms both`, willChange: "transform, opacity" }}>{cardEl}</div>
      ))}
      {/* #: Einbrenn-Loch am Eintrittspunkt (Kartenmitte) — GLÜHEND ROT, wächst sichtbar (mit der Serie etwas mehr),
          heißer weiß-roter Kern + roter Außen-Glow. Bewusst „nicht zu sehr, aber sichtbar". */}
      <div className="absolute" style={{ left: "50%", top: "50%", width: 12, height: 12, borderRadius: "50%", "--hole-max": holeMax,
        background: `radial-gradient(circle, #fff0e0 8%, #ff3a12 34%, #e01808 58%, #e0180800 80%)`,
        boxShadow: `0 0 ${(14 + streakK * 12).toFixed(0)}px ${(5 + streakK * 4).toFixed(0)}px #ff2a0a, 0 0 ${(26 + streakK * 20).toFixed(0)}px ${(9 + streakK * 7).toFixed(0)}px #e0180877`,
        animation: `as-burn-hole ${holeMs}ms ease-out ${hitAt}ms both`, willChange: "transform, opacity" }} />
      {/* Ember-Funken springen (gestaffelt) aus dem Loch — mehr, größer, weiter & heller bei hoher Serie. */}
      {embers.map((s) => (
        <div key={`em${s.i}`} style={{ position: "absolute", left: "50%", top: "50%", width: +s.sz, height: +s.sz, borderRadius: "50%",
          background: s.c, boxShadow: `0 0 ${emberGlow}px ${s.c}`, "--dx": `${s.dx}px`, "--dy": `${s.dy}px`,
          animation: `as-spark ${sparkAnim}ms ease-out ${s.d}ms both`, willChange: "transform, opacity" }} />
      ))}
    </div>
  );
}

/* #295 Sieg-Finisher „Brennstrahl" — PERSISTENTER Strahl (Panel-Ebene, analog Schwarzes Loch): sobald eine Siegserie
   läuft, bleibt der dünne Laser von der Battlefield-Oberkante bis zur Gegnerkarten-Mitte LIT (fährt beim ersten Sieg
   herab, hält über die Serie, wird bei jedem Sieg heller/intensiver) und zieht sich beim Serienabbruch (Niederlage)
   zurück. Der Einschlag je Sieg (Loch/Funken/Verblassen) kommt vom Per-Sieg-Burst (BurnBeamFx). Position aus
   panelRef+oppRef gemessen (echte Kartenposition). Reines DOM (transform/opacity/Flicker) → GPU-günstig, reduced-safe. */
export function BurnBeamPersist({ active, pulse = null, color = "#35e0ff", scale = 1, flipMs = 900, panelRef, oppRef, reduced = false }) {
  const HOT = "#ff7a2f";
  const [geo, setGeo] = useState(null);   // { cx, cy } in Panel-Pixeln
  const [on, setOn] = useState(false);    // Strahl lit?
  const [lvl, setLvl] = useState(0);      // 0..1 Intensität (Serie)
  useEffect(() => {
    if (!active || reduced || !panelRef?.current) { setGeo(null); return undefined; }
    const panel = panelRef.current;
    const measure = () => {
      const pr = panel.getBoundingClientRect();
      if (pr.width < 4) return;
      const orr = oppRef?.current?.getBoundingClientRect();
      const cx = orr && orr.width ? orr.left - pr.left + orr.width / 2 : pr.width * 0.72;
      const cy = orr && orr.width ? orr.top - pr.top + orr.height / 2 : pr.height * 0.5;
      setGeo({ cx, cy });
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [active, reduced, panelRef, oppRef]);
  useEffect(() => {
    if (!pulse) return;
    if (pulse.kind === "win") { setOn(true); setLvl(clamp((pulse.streak || 1) / 12, 0.12, 1)); }
    else if (pulse.kind === "loss") { setOn(false); setLvl(0); }
  }, [pulse]);
  if (!active || reduced || !geo) return null;
  const beamH = geo.cy;                    // Panel-Oberkante → Kartenmitte
  const glow = 5 + lvl * 10, tip = 5 + lvl * 8;
  // #: Der Strahl fährt bei höherem Turbo (kleineres flipMs) schneller herab → „snappier" Erscheinen, im Takt der Stiche.
  const descend = Math.round(clamp(flipMs * 0.34, 120, 280));
  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true" style={{ zIndex: 26 }}>
      {/* Persistenter Strahl: fährt beim ersten Sieg herab (scaleY-Transition), bleibt über die Serie lit (innerer
          Flicker = Laser-Energie); zieht sich beim Serienabbruch zurück. Außen-Wrapper gated on/off, innen flackert es. */}
      <div style={{ position: "absolute", left: geo.cx, top: 0, height: beamH, width: 3, marginLeft: -1.5, transformOrigin: "top center",
        transform: on ? "scaleY(1)" : "scaleY(0.02)", opacity: on ? 1 : 0, transition: `transform ${descend}ms ease-in, opacity ${Math.round(descend * 0.92)}ms ease-out` }}>
        <div className="as-burn-flicker" style={{ position: "absolute", inset: 0, borderRadius: 3,
          background: `linear-gradient(180deg, ${color}00, ${color} 20%, #ffffff 86%, ${HOT})`,
          boxShadow: `0 0 ${glow}px 1px ${HOT}, 0 0 ${glow * 2}px 3px ${HOT}55` }} />
      </div>
      {/* Heißer, pulsierender Strahl-Fußpunkt an der Kartenmitte (Einbrenn-Glut). */}
      <div style={{ position: "absolute", left: geo.cx, top: geo.cy, width: tip, height: tip, marginLeft: -tip / 2, marginTop: -tip / 2,
        opacity: on ? 1 : 0, transition: "opacity 240ms" }}>
        <div className="as-burn-flicker" style={{ position: "absolute", inset: 0, borderRadius: "50%",
          background: `radial-gradient(circle, #ffffff, ${HOT} 55%, transparent 78%)`, boxShadow: `0 0 ${glow}px ${(2 + lvl * 3).toFixed(0)}px ${HOT}` }} />
      </div>
    </div>
  );
}

/* #300 Wertdifferenz-Stufe (1..4) für die diff-gekoppelten Finisher (Überladung/Zerstäubung). Erste Stufe ab Differenz 2;
   Schwellen als Konstanten justierbar. Reine, deterministische Funktion. Kartenwerte wachsen über den Lauf → späte klare
   Siege liegen bewusst auf Stufe 4 (entscheidende Siege sehen maximal aus). */
const FX_DIFF_THRESH = [4, 8, 16]; // <4 → 1 · <8 → 2 · <16 → 3 · ≥16 → 4
export function fxDiffTier(diff) {
  const d = Math.max(0, diff | 0);
  return d < FX_DIFF_THRESH[0] ? 1 : d < FX_DIFF_THRESH[1] ? 2 : d < FX_DIFF_THRESH[2] ? 3 : 4;
}
// Kleiner deterministischer PRNG (mulberry32) für die Canvas-Sims: gleicher seed → gleiche Sequenz (kein Math.random →
// deterministisch wie fjitter). Wird pro Mount einmal geseedet; jeder Frame verbraucht die Sequenz → Flackern/Streuung.
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* #300 Sieg-Finisher „Überladung" — ein prozeduraler Blitz schlägt von oben in die Gegnerkarte ein (Midpoint-
   Displacement-Pfad, je Frame neu gewürfelt = Flackern). Glow AUSSCHLIESSLICH additiv (globalCompositeOperation
   'lighter' + mehrere breite transparente Pässe, KEIN shadowBlur → kein Lag). Stufe (diff) skaliert Zahl/Helligkeit
   der Blitze, Gabeln (ab Stufe 3) und Funken. Danach glüht der Einschlag mit feinen additiven Funken-Streifen aus.
   Budget an flipMs gekoppelt (löst vor dem nächsten Flip auf). Deterministisch aus seed (mulberry32). Reduced-safe (Aufrufer). */
export function OverloadFx({ cardEl, color = "#35e0ff", flipMs = 900, seed = 1, tier = 1, scale = 1, delay = 0 }) {
  const wrapRef = useRef(null), canvasRef = useRef(null);
  const dur = Math.max(220, Math.round(((flipMs || 900) - 40)));   // Gesamt-Budget (vor dem nächsten Flip)
  const strikeMs = Math.min(Math.round(dur * 0.5), 300);           // Blitz-/Flacker-Fenster
  useEffect(() => {
    const cv = canvasRef.current, wrap = wrapRef.current;
    if (!cv || !wrap) return undefined;
    const r0 = wrap.getBoundingClientRect();
    const W0 = Math.max(40, Math.round(r0.width || 104)), H0 = Math.max(40, Math.round(r0.height || 144));
    const CW = Math.round(W0 * 1.8), CH = Math.round(H0 * 1.7);     // größere Canvas → Blitz/Funken dürfen über die Karte hinaus
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    cv.width = CW * dpr; cv.height = CH * dpr; cv.style.width = CW + "px"; cv.style.height = CH + "px";
    const ctx = cv.getContext("2d");
    const rng = mulberry32((seed * 2654435761) >>> 0);
    const nBolts = tier >= 4 ? 3 : tier >= 3 ? 2 : 1;
    const glare = tier >= 4 ? 1 : tier >= 2 ? 0.72 : 0.48;
    const cx = CW / 2, cy = CH / 2 + H0 * 0.02;                     // Einschlag ~ Kartenmitte
    const build = (x0, y0, x1, y1, disp, r) => {
      let pts = [[x0, y0], [x1, y1]];
      for (let it = 0; it < 5; it++) {
        const np = [];
        for (let i = 0; i < pts.length - 1; i++) {
          const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
          const mx = (ax + bx) / 2, my = (ay + by) / 2;
          let nx = -(by - ay), ny = bx - ax; const ln = Math.hypot(nx, ny) || 1; nx /= ln; ny /= ln;
          const off = (r() - 0.5) * disp;
          np.push([ax, ay], [mx + nx * off, my + ny * off]);
        }
        np.push(pts[pts.length - 1]); pts = np; disp *= 0.55;
      }
      return pts;
    };
    const stroke = (pts, w, col, alpha) => {
      ctx.globalCompositeOperation = "lighter"; ctx.strokeStyle = col; ctx.globalAlpha = alpha;
      ctx.lineWidth = w; ctx.lineJoin = "round"; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.stroke();
    };
    let start = null, raf = 0, stopped = false;
    const frame = (ts) => {
      if (stopped) return;
      if (start == null) start = ts;
      const el = ts - start - delay;                     // Karte liegt erst (delay), dann schlägt der Blitz ein
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, CW, CH);
      if (el < 0) { raf = requestAnimationFrame(frame); return; }
      if (el < strikeMs) {
        const flick = 0.55 + rng() * 0.45;
        // #: Blitze schlagen von KLAR VERSCHIEDENEN Seiten von oben ein (Stufe III = 2 → links/rechts, Stufe IV = 3 →
        // links/mitte/rechts) statt geclustert nahe der Mitte. Kleiner Jitter je Blitz, Einschlag bleibt Kartenmitte.
        const boltX = nBolts >= 3 ? [0.16, 0.5, 0.84] : nBolts === 2 ? [0.2, 0.8] : [0.5];
        for (let b = 0; b < nBolts; b++) {
          const sx = CW * (boltX[b] + (rng() - 0.5) * 0.06);
          const pts = build(sx, -4, cx + (rng() - 0.5) * 10, cy, CW * 0.45, rng);
          stroke(pts, 7 * glare, color, 0.11 * flick);            // breiter additiver Glow
          stroke(pts, 3.4 * glare, color, 0.2 * flick);
          stroke(pts, 1.5, "#ffffff", 0.92 * flick);              // heißer weißer Kern
          if (tier >= 3) {                                        // Gabel-Verästelung
            const gi = Math.min(4 + ((rng() * 3) | 0), pts.length - 2);
            const [gx, gy] = pts[gi];
            const fk = build(gx, gy, gx + (rng() - 0.5) * CW * 0.5, gy + CH * 0.22, CW * 0.28, rng);
            stroke(fk, 2.2 * glare, color, 0.15 * flick);
            stroke(fk, 1, "#ffffff", 0.7 * flick);
          }
        }
        ctx.globalCompositeOperation = "lighter";                 // Einschlag-Glut
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 24 * glare);
        g.addColorStop(0, "#ffffff"); g.addColorStop(0.4, color); g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.globalAlpha = 0.85 * flick; ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(cx, cy, 24 * glare, 0, Math.PI * 2); ctx.fill();
      } else {
        const p = Math.min(1, (el - strikeMs) / (dur - strikeMs)); // Funken glühen aus
        // #: Funken am Einschlag NOCHMALS stark reduziert (nur noch ein knapper radialer Spritzer). „Stärker je Stufe"
        // kommt aus Geschwindigkeit/Helligkeit, nicht aus der Menge.
        const nS = 2 + tier * 2;
        ctx.globalCompositeOperation = "lighter";
        for (let i = 0; i < nS; i++) {
          // #: Funken entspringen konzentriert AUS DEM EINSCHLAGPUNKT (enger Ursprung ~20px) statt über die ganze Kartenfläche.
          const ox = cx + (rng() - 0.5) * 20, oy = cy + (rng() - 0.5) * 20;
          // Voll zufälliger Winkel (0..2π) → radial in alle Richtungen; nur ein winziger Auftrieb, damit es nicht nach
          // oben „schießt", sondern rundum wegspringt. Geschwindigkeit/Streuweite steigt spürbar mit der Stufe.
          const a = rng() * Math.PI * 2, sp = (24 + rng() * 74) * (0.7 + tier * 0.3);
          const x = ox + Math.cos(a) * sp * p, y = oy + Math.sin(a) * sp * p - p * 6;
          // #: KLEINE Funken-PUNKTE (winzig, wie echte Funken — KEINE „Bälle"). „Stärker je Stufe" kommt aus Anzahl +
          // Geschwindigkeit + Helligkeit, NICHT aus dem Radius; ein kleiner additiver Glow gibt Leuchtkraft ohne Größe.
          const r = 0.6 + rng() * 0.9;
          ctx.globalAlpha = (1 - p) * (0.85 + tier * 0.04); ctx.fillStyle = i % 3 ? color : "#ffffff";
          ctx.shadowBlur = 3 + tier; ctx.shadowColor = i % 3 ? color : "#ffffff";
          ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over"; ctx.shadowBlur = 0;
      if (el < dur) raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { stopped = true; cancelAnimationFrame(raf); };
  }, [seed, tier, flipMs, scale, color, dur, strikeMs, delay]);
  // #300b Karte ZERSPRINGT beim Einschlag in Funken-artige Stücke (starker Auftrieb, weite Streuung) — statt zu faden.
  const [scols, srows] = SHATTER_GRID[Math.max(0, Math.min(3, tier - 1))];
  const ofrags = cardShatterFrags({ cols: scols, rows: srows, seed: seed * 7 + 3, spread: 72 + tier * 24, upBias: 40 + tier * 12, sizeMin: 0.14, rot: 90 });
  const ON = ofrags.length;
  return (
    <div ref={wrapRef} className="absolute inset-0 pointer-events-none" aria-hidden="true">
      {/* Karte zersplittert in die gleichen Funken, die der Blitz wirft (Zündung ≈ hitAt); die Stücke stieben auf & aus. */}
      {ofrags.map((s) => (
        <div key={`of${s.i}`} className="absolute inset-0" style={{ clipPath: s.clip,
          "--dx": `${s.dx}px`, "--dy": `${s.dy}px`, "--ds": s.ds, "--dr": `${s.dr}deg`,
          animation: `as-fx-shatter ${dur}ms cubic-bezier(0.12,0.7,0.3,1) ${delay + Math.round(strikeMs * 0.28) + Math.round((s.i / ON) * dur * 0.08)}ms both`,
          willChange: "transform, opacity" }}>{cardEl}</div>
      ))}
      <canvas ref={canvasRef} className="absolute" style={{ left: "50%", top: "50%", transform: "translate(-50%,-50%)" }} />
    </div>
  );
}

/* #300b Karten-Zersplitterungs-Raster: die Karte wird in cols×rows clip-path-Klone zerlegt (zusammen = ganze Karte),
   die aus der Kartenmitte auseinanderstieben (--dx/--dy), schrumpfen (--ds), rotieren (--dr) & ausfaden (as-fx-shatter).
   So ZERSPRINGT die Karte sichtbar in Partikel (statt zu faden). Deterministisch aus seed (fjitter). upBias = Auftrieb
   nach oben, spread = Streuweite, sizeMin = Schrumpf-Endgröße. */
function cardShatterFrags({ cols, rows, seed, spread, upBias = 0, sizeMin = 0.24, rot = 55 }) {
  const frags = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      const dirX = (c + 0.5) / cols - 0.5, dirY = (r + 0.5) / rows - 0.5;   // Zellmitte relativ zur Kartenmitte
      const sp = spread * 0.6 + Math.abs(fjitter(seed * 5 + i * 13, spread));
      frags.push({
        i,
        clip: `inset(${((r / rows) * 100).toFixed(2)}% ${(((cols - 1 - c) / cols) * 100).toFixed(2)}% ${(((rows - 1 - r) / rows) * 100).toFixed(2)}% ${((c / cols) * 100).toFixed(2)}%)`,
        dx: (dirX * sp + fjitter(seed * 3 + i * 7, 9)).toFixed(1),
        dy: (dirY * sp - upBias + fjitter(seed * 2 + i * 11, 10)).toFixed(1), // Auswärts + Auftrieb (nach oben)
        ds: (sizeMin + Math.abs(fjitter(seed * 6 + i * 5, 0.24))).toFixed(2),
        dr: fjitter(seed * 7 + i * 9, rot).toFixed(0),
      });
    }
  }
  return frags;
}
// Zersplitterungs-Raster je Stufe (dichter bei höherer Stufe → mehr „Partikel"; Karten-Klon-Zahl bewusst gedeckelt).
const SHATTER_GRID = [[7, 10], [8, 11], [9, 13], [10, 14]]; // Stufe 1..4 → cols×rows (dichter = mehr „Partikel")

/* #300 Sieg-Finisher „Zerstäubung" — die Gegnerkarte ZERSPRINGT in ein Partikelgitter: clip-path-Stücke der ECHTEN Karte
   stieben nach außen/oben, schrumpfen & faden (kein bloßes Ausblenden mehr). Dichte/Streuweite wachsen mit der Stufe
   (diff). Budget an flipMs gekoppelt. Deterministisch aus seed. Reduced-safe (Aufrufer). */
export function DisperseFx({ cardEl, color = "#35e0ff", flipMs = 900, seed = 1, tier = 1, scale = 1, delay = 0 }) {
  // #: Sichtbarkeits-Boden. Bei ~4× war die Zerstäubung gut, bei MAX (kleinstes flipMs) rauschte sie zu schnell durch →
  // deutlich höherer Boden (disperseDur), der den Zerfall auch bei Max sichtbar hält. Die Bursts überlappen dann bewusst
  // leicht in den nächsten Stich (Ghost lebt entsprechend länger); die Stücke faden aus → verdecken die Folgekarte nicht.
  const dur = disperseDur(flipMs);
  // #perf: wie beim Brennstrahl das Fragment-Raster ans Turbo-Tempo koppeln. Bei MAX (scale≈0.45) überlappen mehrere
  // Zerstäubungs-Ghosts (ghostCap ~6), jeder mit bis zu 10×14 = 140 clip-path-Kartenklonen → >500 Ebenen = Ruckeln.
  // Bei hohem Turbo ist die feine Zerlegung ohnehin nicht erkennbar → gröber rastern (min 5×6). Normal: volles Raster.
  const [gCols, gRows] = SHATTER_GRID[Math.max(0, Math.min(3, tier - 1))];
  const cols = Math.max(5, Math.round(gCols * scale)), rows = Math.max(6, Math.round(gRows * scale));
  // #: Größere Sprünge je Stufe + weite RADIALE Streuung in ALLE Richtungen (nur minimaler Auftrieb, kein „nach oben").
  // Stufe 4 = „größere Wucht" (weitere Streuung) UND die Stücke PRALLEN am Battlefield-Rahmen ab (Rückprall zur Mitte).
  const bounce = tier >= 4;
  const spread = 58 + tier * 40 + (bounce ? 46 : 0);
  const frags = cardShatterFrags({ cols, rows, seed, spread, upBias: 6, sizeMin: 0.24, rot: 75 });
  const N = frags.length;
  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
      {frags.map((s) => {
        // #: Rückprall nur Stufe 4: ~44 % des Auswärts-Vektors zurück zur Mitte (--bx/--by) → liest sich als „am Rahmen
        // abgeprallt". Darunter (Stufe 1–3) bleibt die deckende „…-hold"-Variante (klar sichtbar auch im Turbo).
        const bx = bounce ? (-parseFloat(s.dx) * 0.44).toFixed(1) : 0;
        const by = bounce ? (-parseFloat(s.dy) * 0.44).toFixed(1) : 0;
        return (
          <div key={`df${s.i}`} className="absolute inset-0" style={{ clipPath: s.clip,
            "--dx": `${s.dx}px`, "--dy": `${s.dy}px`, "--ds": s.ds, "--dr": `${s.dr}deg`,
            "--bx": `${bx}px`, "--by": `${by}px`,
            animation: `${bounce ? "as-fx-shatter-bounce" : "as-fx-shatter-hold"} ${dur}ms cubic-bezier(0.12,0.7,0.3,1) ${delay + Math.round((s.i / N) * dur * 0.1)}ms both`,
            willChange: "transform, opacity" }}>{cardEl}</div>
        );
      })}
    </div>
  );
}

/* #296 Sieg-Finisher „Schwarzes Loch" — Serien-Wachstum. Statt pro Sieg einzeln zu implodieren + kollabieren, ist das
   Loch bei einer Siegserie EIN persistentes, wachsendes Objekt: der Ereignishorizont wächst mit `streak` (an die
   Feldhöhe gekoppelt, Max-Deckel; darf großzügig über den Karten liegen — bewusst keine Lesbarkeits-Deckelung), jede
   weitere Gegnerkarte wird als Flyer in das BESTEHENDE Loch gesogen, und die Akkretions-Orbs kreisen auf WACHSENDEM
   Bahnradius. Serienabbruch (Niederlage / `streak` fällt) → Kollaps (Flash + Schockwelle), danach dormant/zurück auf
   Ausgangsgröße (unsichtbar bis zum nächsten Sieg). Reine <canvas>-Kosmetik mit rAF-Physik (wie BounceBurst/PrunkFx)
   über dem Panel (zIndex über den Karten). Turbo: `scale` (fxScale) treibt das Tempo (Rotation/Sog/Kollaps) wie bei
   Klinge/Laser. Die Physik lebt nur im Canvas (kein React-Render) → Math.random ist hier zulässig (analog BounceBurst).
   Persistenz: die Setup-Effect läuft NICHT pro Stich neu — laufende Steuerwerte (streak/pulse/scale/color) fließen über
   ein ref in die rAF-Schleife, sonst würde das Loch bei jedem Stich zurückgesetzt. */
export function BlackholeFieldFx({ active, pulse = null, color = "#35e0ff", scale = 1, panelRef, oppRef, reduced = false }) {
  const canvasRef = useRef(null);
  const simRef = useRef(null);
  const ctrlRef = useRef({ pulse: null, scale: 1, color });
  useEffect(() => { ctrlRef.current.scale = scale; }, [scale]);
  useEffect(() => { ctrlRef.current.color = color; }, [color]);
  useEffect(() => { if (pulse) ctrlRef.current.pulse = pulse; }, [pulse]);

  useEffect(() => {
    if (!active || reduced || !panelRef?.current || !canvasRef.current) return undefined;
    const panel = panelRef.current, canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;
    const PI2 = Math.PI * 2;
    // Farbe → rgba (für die Aura/Flash-Verläufe mit Teil-Alpha); Fallback Cyan, falls kein Hex.
    const hexA = (hex, a) => {
      const h = (hex || "").replace("#", "");
      const n = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
      const r = parseInt(n.slice(0, 2), 16), g = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16);
      return Number.isNaN(r + g + b) ? `rgba(53,224,255,${a})` : `rgba(${r},${g},${b},${a})`;
    };
    // Hex→Hex-Interpolation (für den Rand-Farbpuls Cyan→Violett ab Serien-Mult ×2.0).
    const lerpHex = (h1, h2, tt) => {
      const p = (h) => { const n = h.replace("#", ""); return [parseInt(n.slice(0, 2), 16), parseInt(n.slice(2, 4), 16), parseInt(n.slice(4, 6), 16)]; };
      const a = p(h1), b = p(h2), k = clamp(tt, 0, 1), m = (i) => Math.round(a[i] + (b[i] - a[i]) * k);
      return `rgb(${m(0)},${m(1)},${m(2)})`;
    };
    let W = 0, H = 0, dpr = 1, cx = 0, cy = 0, ox = 0, oy = 0;
    const cardW = 104, cardH = 144; // Battlefield-Kartenbox ist fix 104×144 (der Flyer bildet die Gegnerkarte ab)
    const measure = () => {
      const pr = panel.getBoundingClientRect();
      W = pr.width; H = pr.height;
      if (W < 4 || H < 4) return false;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cx = W * 0.5; // Loch mittig zwischen den Karten (die Gegnerkarte fliegt von rechts hinein)
      // oppRef nur für die POSITION (Mitte der Gegner-Seite); die Kartengröße bleibt fix (s. o.).
      const orr = oppRef?.current?.getBoundingClientRect();
      if (orr && orr.width) { ox = orr.left - pr.left + orr.width / 2; oy = orr.top - pr.top + orr.height / 2; }
      else { ox = W * 0.72; oy = H * 0.5; }
      cy = oy;
      return true;
    };
    if (!measure()) return undefined;
    const onResize = () => measure();
    window.addEventListener("resize", onResize);

    const baseR = () => Math.max(12, H * 0.06);   // Ausgangsgröße (erster Sieg)
    const maxR = () => H * 0.30;                   // großzügiger Deckel (darf über die Karten reichen)
    const stepR = () => H * 0.017;                 // „wächst langsam" je Sieg
    const maxLevel = () => (maxR() - baseR()) / stepR(); // ~14: Deckel in „Sieg-Schritten"
    // Größe rein EVENT-getrieben (kein Bezug mehr auf winStreak): jeder Sieg wächst das Loch (level+1) und saugt eine
    // Karte ein; ab Serien-Mult ×2.0 zittert es + der Rand pulsiert farblich. Eine Niederlage = Serienabbruch → das
    // Loch kollabiert (Flash + Schockwelle), danach dormant/Ausgangsgröße (unsichtbar bis zum nächsten Sieg).
    const sim = (simRef.current = { alive: false, R: 0, level: 0, mult: 0, frame: 0, phase: 0, orbs: [], flyers: [], sparks: [], collapse: null, pulseId: null });
    const seedOrbs = () => {
      sim.orbs = [];
      const n = 7;
      for (let i = 0; i < n; i++) sim.orbs.push({ ang: (i / n) * PI2, spd: 0.010 + Math.random() * 0.014,
        rf: 1.55 + Math.random() * 1.15, sz: 1.6 + Math.random() * 1.8, w: Math.random() < 0.3 });
    };
    const spawnFlyer = (p) => {
      sim.flyers.push({ a0: Math.atan2(oy - cy, ox - cx), d0: Math.hypot(ox - cx, oy - cy) || W * 0.2,
        t: 0, dur: 560, num: p.num, col: p.col || ctrlRef.current.color, spin: (p.id % 2 ? 1 : -1) * (3 + (p.id % 3)) });
    };
    const roundRect = (x, y, w, h, r) => { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };
    const drawCard = (x, y, sc, rot, num, col, alpha) => {
      const w = cardW * sc, h = cardH * sc;
      ctx.save(); ctx.globalCompositeOperation = "source-over";
      ctx.translate(x, y); ctx.rotate(rot); ctx.globalAlpha = Math.max(0, alpha);
      ctx.fillStyle = "#12121a"; ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.shadowBlur = 10; ctx.shadowColor = col;
      roundRect(-w / 2, -h / 2, w, h, Math.max(3, w * 0.06)); ctx.fill(); ctx.stroke();
      ctx.shadowBlur = 8; ctx.fillStyle = col; ctx.font = `700 ${Math.round(h * 0.42)}px system-ui, sans-serif`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(String(num), 0, 1);
      ctx.restore();
    };

    let raf = 0, last = 0;
    const step = (now) => {
      if (!last) last = now;
      const dt = Math.min(50, now - last); last = now;
      const ctrl = ctrlRef.current;
      const speed = 1 / clamp(ctrl.scale || 1, 0.45, 1); // Turbo: kleiner scale → schneller (Rotation/Sog/Schrumpfen)
      const sdt = dt * speed;
      const DC = ctrl.color || "#35e0ff";

      // Puls verarbeiten: Sieg → wachsen + Karte einsaugen; Niederlage → schrumpfen (3. Niederlage → Kollaps).
      if (ctrl.pulse && ctrl.pulse.id !== sim.pulseId) {
        sim.pulseId = ctrl.pulse.id;
        const p = ctrl.pulse;
        if (p.kind === "loss") {
          // #296 Serienabbruch → KOLLAPS (Flash + Schockwelle), danach dormant/Ausgangsgröße. Der Kollaps ist der
          // EINZIGE nach außen laufende Ring; im laufenden Streak gibt es bewusst keine wandernden Pulse.
          if (sim.alive) {
            sim.alive = false; sim.level = 0; sim.mult = 0; sim.orbs = [];
            sim.collapse = { t: 0, R0: Math.max(sim.R, baseR()), col: DC };
          }
        } else { // Sieg
          if (!sim.alive) { sim.alive = true; sim.level = 0; seedOrbs(); }
          sim.collapse = null;                                 // ein Sieg lässt einen (theoretischen) Kollaps fallen
          sim.level = Math.min(maxLevel(), sim.level + 1);
          sim.mult = p.mult || sim.mult || 0;                  // aktueller Serien-Mult → Schwelle Zittern/Randpuls ab ×2.0
          if (Math.round(sim.level) % 2 === 0 && sim.orbs.length < 16) sim.orbs.push({ ang: Math.random() * PI2,
            spd: 0.010 + Math.random() * 0.012, rf: 1.5 + Math.random() * 1.2, sz: 1.6 + Math.random() * 1.8, w: Math.random() < 0.3 });
          spawnFlyer(p);
        }
      }

      // Größe smooth an das Level annähern (lebendig: baseR..maxR; tot: → 0, schrumpft lautlos in sich zusammen).
      const targetR = sim.alive ? clamp(baseR() + sim.level * stepR(), baseR(), maxR()) : 0;
      sim.R += (targetR - sim.R) * Math.min(1, 0.08 * speed);

      const R = sim.R;
      ctx.clearRect(0, 0, W, H);
      // #296 Ab Serien-Mult ×2.0: das GANZE Loch zittert leicht + der Ereignishorizont-RING pulsiert farblich
      // (Cyan→Violett + Glow-Atmung). KEINE nach außen laufenden Pulsringe — nur Rand-Farbe + Jitter. Der Jitter-
      // Offset ist deterministisch über fjitter (kein Math.random); die Puls-Phase läuft über sdt → skaliert mit Turbo.
      const trembling = sim.alive && sim.mult >= 2.0 && R > 0.5;
      sim.frame += 1;
      if (trembling) sim.phase += 0.06 * (sdt / 16);
      const jAmp = trembling ? clamp(1 + R * 0.03, 1, 3) : 0;             // Zitter-Amplitude wächst leicht mit dem Loch
      const jx = trembling ? fjitter(sim.frame, jAmp) : 0;
      const jy = trembling ? fjitter(sim.frame * 1.7 + 13, jAmp) : 0;
      const busy = sim.alive || R > 0.5 || sim.flyers.length || sim.sparks.length || sim.collapse;
      if (busy) {
        ctx.save(); ctx.translate(jx, jy);                                // Zittern: das ganze Loch verschiebt sich minimal
        ctx.globalCompositeOperation = "lighter";
        // Akkretions-Aura (weicher Farbring hinter dem Loch)
        if (R > 0.5) {
          const auraR = R * 2.6;
          const g = ctx.createRadialGradient(cx, cy, R * 0.6, cx, cy, auraR);
          g.addColorStop(0, hexA(DC, 0.20)); g.addColorStop(0.5, hexA(DC, 0.09)); g.addColorStop(1, "transparent");
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, auraR, 0, PI2); ctx.fill();
        }
        // Karten, die eingesogen werden (spiralen nach innen, schrumpfen)
        for (let i = sim.flyers.length - 1; i >= 0; i--) {
          const f = sim.flyers[i]; f.t += sdt / f.dur;
          if (f.t >= 1) { sim.flyers.splice(i, 1);
            for (let s2 = 0; s2 < 5; s2++) sim.sparks.push({ a: Math.random() * PI2, sp: 0.6 + Math.random() * 1.2, t: 0, c: f.col });
            continue; }
          const ease = 1 - Math.pow(1 - f.t, 2);
          const r = f.d0 * (1 - ease), a = f.a0 + ease * 3.4 * f.spin * 0.3;
          drawCard(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 1 - ease * 0.9, a * f.spin * 0.15, f.num, f.col, 1 - ease * 0.6);
        }
        // Funken (beim Verschlucken)
        for (let i = sim.sparks.length - 1; i >= 0; i--) { const sp = sim.sparks[i]; sp.t += sdt / 500; if (sp.t >= 1) { sim.sparks.splice(i, 1); continue; }
          const rr = 30 * sp.t * sp.sp; ctx.globalAlpha = 1 - sp.t; ctx.fillStyle = sp.c; ctx.shadowBlur = 6; ctx.shadowColor = sp.c;
          ctx.beginPath(); ctx.arc(cx + Math.cos(sp.a) * rr, cy + Math.sin(sp.a) * rr, 2, 0, PI2); ctx.fill(); }
        ctx.globalAlpha = 1;
        // Orbs (Bahnradius + Größe wachsen mit dem Level)
        const orbScale = 1 + sim.level * 0.05;
        for (const o of sim.orbs) { o.ang += o.spd * (sdt / 16);
          const orad = R * o.rf + R * 0.15;
          const x = cx + Math.cos(o.ang) * orad, y = cy + Math.sin(o.ang) * orad * 0.82; // leicht elliptisch
          const col = o.w ? "#ffffff" : DC;
          ctx.fillStyle = col; ctx.shadowBlur = 8; ctx.shadowColor = col;
          ctx.beginPath(); ctx.arc(x, y, o.sz * orbScale, 0, PI2); ctx.fill(); }
        ctx.shadowBlur = 0;
        // Ereignishorizont-Ring — ab ×2.0 pulsiert SEINE FARBE (Cyan→Violett) + Glow atmet; sonst Deckfarbe.
        if (R > 0.5) {
          const br = trembling ? 0.5 + 0.5 * Math.sin(sim.phase) : 0;      // 0..1 Atem-Phase (nur Rand-Farbe, kein Ring nach außen)
          const ringCol = trembling ? lerpHex("#35e0ff", "#a24bff", br) : DC;
          const ringGlow = trembling ? 18 + br * 16 : 18;
          ctx.lineWidth = Math.max(1.5, R * 0.08); ctx.strokeStyle = ringCol; ctx.shadowBlur = ringGlow; ctx.shadowColor = ringCol;
          ctx.beginPath(); ctx.arc(cx, cy, R, 0, PI2); ctx.stroke();
          ctx.lineWidth = 1.5; ctx.strokeStyle = "#ffffff"; ctx.globalAlpha = 0.7;
          ctx.beginPath(); ctx.arc(cx, cy, R * 0.96, 0, PI2); ctx.stroke(); ctx.globalAlpha = 1; ctx.shadowBlur = 0;
          // Schwarzer Kern (dunkle Scheibe) — normal composite, damit's wirklich schwarz ist
          ctx.globalCompositeOperation = "source-over";
          const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
          core.addColorStop(0, "#000000"); core.addColorStop(0.72, "#04040a"); core.addColorStop(1, "rgba(4,4,12,0)");
          ctx.fillStyle = core; ctx.beginPath(); ctx.arc(cx, cy, R, 0, PI2); ctx.fill();
        }
        // #296 Kollaps-Sequenz (Serienabbruch): heller Flash + EINE Schockwelle nach außen (wie der frühere Einzel-
        // Kollaps), danach ist das Loch weg (dormant). Tempo über sdt → skaliert mit Turbo (fxScale).
        if (sim.collapse) {
          const cc = sim.collapse; cc.t += sdt / 520;
          if (cc.t >= 1) { sim.collapse = null; }
          else {
            const fade = 1 - cc.t;
            ctx.globalCompositeOperation = "lighter";
            const fr = cc.R0 * (1 + cc.t * 1.2);                          // Flash-Radius
            const fg = ctx.createRadialGradient(cx, cy, 0, cx, cy, fr);
            fg.addColorStop(0, hexA("#ffffff", 0.55 * fade)); fg.addColorStop(0.4, hexA(cc.col, 0.30 * fade)); fg.addColorStop(1, "transparent");
            ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(cx, cy, fr, 0, PI2); ctx.fill();
            const sw = cc.R0 * (0.6 + cc.t * 3.2);                        // Schockwellen-Ring (läuft nach außen)
            ctx.globalAlpha = fade; ctx.lineWidth = Math.max(1.5, 4 * fade); ctx.strokeStyle = cc.col; ctx.shadowBlur = 20; ctx.shadowColor = cc.col;
            ctx.beginPath(); ctx.arc(cx, cy, sw, 0, PI2); ctx.stroke();
            ctx.globalAlpha = 1; ctx.shadowBlur = 0;
          }
        }
        ctx.globalAlpha = 1; ctx.shadowBlur = 0; ctx.globalCompositeOperation = "source-over";
        ctx.restore();
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onResize); ctx.clearRect(0, 0, W, H); simRef.current = null; };
    // Deps bewusst nur [active, reduced, panelRef, oppRef]: die laufenden Steuerwerte (streak/pulse/scale/color) kommen
    // über ctrlRef in die rAF-Schleife — als Deps würden sie die persistente Schleife pro Stich zurücksetzen.
  }, [active, reduced, panelRef, oppRef]);

  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none rounded-xl" style={{ zIndex: 22 }} aria-hidden="true" />;
}

/* #294 GOTTGLEICH-Prunk OHNE Krit: bei einem tier-4-Sieg ohne Kritischen Treffer feuern die (kaufbaren) Prunk-
   Overlays — stapelbar. Wie EpicFx/BounceBurst reine <canvas>-Kosmetik mit rAF-Physik über dem Feld (zIndex 20),
   auf die gleiche Wucht ausgelegt (Partikelmenge/Bloom/Dauer). Nur getriggert bei normaler Bewegung (Aufrufer
   prüft `reduced`). Drei Modi, per Flag zuschaltbar:
     • fireworks  — mehrere Feuerwerks-Bursts über dem Board, radiale Partikel in der Deckfarbe (+ weiße Kerne).
     • goldRain   — dichter Schauer goldener Funken rieselt von oben (bleibt IMMER gold, Gottgleich-Identität).
     • prismaWave — prismatischer Schockwellen-Ring läuft einmal übers ganze Board (Regenbogen, Hue-Rotation). */
function PrunkFx({ trigger, panelRef, oppRef, color }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!trigger || !panelRef?.current || !canvasRef.current) return undefined;
    const pr = panelRef.current.getBoundingClientRect();
    if (pr.width < 4 || pr.height < 4) return undefined;
    // Ursprung (Impuls/Prisma) = Mitte der Gegnerkarte als Bruchteil des Panels; Fallback Feldmitte.
    let ox = 0.5, oy = 0.5;
    const orr = oppRef?.current?.getBoundingClientRect();
    if (orr && orr.width) { ox = (orr.left - pr.left + orr.width / 2) / pr.width; oy = (orr.top - pr.top + orr.height / 2) / pr.height; }
    // #: Bass-Impact hier ENTFERNT — nur noch „Schwarzes Loch" bekommt Bass. Die Prunk-Animation läuft ohne Bass-Layer.
    return startPrunk(canvasRef.current, {
      fireworks: trigger.fireworks, goldRain: trigger.goldRain, prismaWave: trigger.prismaWave,
      color, originX: ox, originY: oy, loop: false });
  // eslint-disable-next-line react-hooks/exhaustive-deps -- bewusst gekeyt/eingefroren, Werte wechseln synchron mit den Deps
  }, [trigger?.id, panelRef, oppRef]);
  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none rounded-xl" style={{ zIndex: 21 }} aria-hidden="true" />;
}

/* #177+/#186: Schnitt-/Explosions-Ghost-Pool für BEIDE Seiten. Verliert eine Karte (Spieler bei Niederlage,
   Gegner bei Sieg), wird sie in-place ausgeblendet und stattdessen ein entkoppelter Klon in diesem Layer
   (im jeweiligen Karten-Slot, absolute inset-0) gerendert: die Karte liegt erst kurz (rest), dann setzt der Schnitt
   bzw. die Pixel-Explosion IN PLACE ein, und DANACH floatet der Ghost weg (as-loss-drift-rand, #187: zufällige
   Richtung rundum, deterministisch aus seed; nur beim Slice — die Explosion zerbirst an Ort und Stelle). Weil der
   Pool NICHT pro Stich remountet, floatet der Ghost in voller Länge aus und überlappt bei hohem Turbo/vielen Siegen
   mit dem nächsten Stich — Spieler- UND Gegnerkarte fühlen sich damit gleich lang an (#186). Ghosts entfernen sich
   nach ihrer Lebensdauer selbst. */
// #306 Battlefield-Ambiente-Layer (einfach-exklusiv): rendert genau EINEN Feld-Effekt als z-1-Overlay in der Deckfarbe
// (color). Ambiente = ruhige Endlos-Animation; die Reaktion je Stich remountet über key={sweepId} (Turbo-Throttle sitzt
// im Battlefield). reduced → nur statisches Ambiente. Nur transform/opacity/gradient/background-position (GPU-günstig).
// #: „Glutfunken" = 2–3 FONTÄNEN (feste X-Punkte) statt gleichmäßig übers Feld verteilter Funken. Anzahl UND Höhe der
// Fontänen sind an den LAUF-SCORE gekoppelt (linear bis EMBER_MAX_SCORE) → je höher der Score, desto mehr/höhere Funken.
// Die Höhe (rise) ist SLOT-FEST je Funke: mehr Slots (höherer Score) ⇒ höhere/vollere Fontäne, ohne dass bestehende
// Funken beim Score-Anstieg springen (nur neue, höhere Slots kommen dazu). Deterministisch (fjitter, kein Math.random).
const EMBER_FOUNTAINS_N = 3;    // Anzahl gleichzeitiger Fontänen
const EMBER_MAX_SCORE = 500000;
const EMBER_MAX_STUFE = 3;      // 0..3 → Partikel/Fontäne verdoppeln sich je Stufe
const emberNorm = (score) => clamp((score || 0) / EMBER_MAX_SCORE, 0, 1);
// Score → Stufe (0..EMBER_MAX_STUFE): je Stufe verdoppelt sich die Partikelzahl pro Fontäne.
const emberStufe = (score) => clamp(Math.floor(emberNorm(score) * (EMBER_MAX_STUFE + 1)), 0, EMBER_MAX_STUFE);
// Zufällige Fontänen-Positionen (x %) am unteren Rand — deterministisch aus `seed`. Für die Ambiente-Funken ein FESTER
// Seed (Positionen bleiben stabil), für den Per-Stich-Stoß ein sweepId-Seed (jede Eruption an anderen Stellen).
function emberFountainXs(seed) {
  const xs = [];
  for (let f = 0; f < EMBER_FOUNTAINS_N; f++) xs.push(clamp(8 + Math.abs(fjitter(seed + f * 53, 84)), 6, 94));
  return xs;
}
// Ambiente: dauerhaft aufsteigende Funken je Fontäne (Endlos-Loop). Positionen zufällig aber STABIL; Anzahl moderat
// (läuft dauerhaft) mit der Stufe wachsend.
function emberFountainDots(score) {
  const per = 4 + emberStufe(score) * 2; // 4 … 10 je Fontäne (Ambiente bleibt ruhig)
  const xs = emberFountainXs(7);
  const out = [];
  for (let f = 0; f < xs.length; f++) for (let s = 0; s < per; s++) {
    const seed = f * 97 + s * 31;
    out.push({ key: `f${f}s${s}`, l: clamp(xs[f] + fjitter(seed, 3.4), 3, 97),
      size: 1.3 + Math.abs(fjitter(seed + 5, 1.5)), rise: 150 + s * 20,
      rdx: 5 + fjitter(seed + 9, 12), t: 8 + Math.abs(fjitter(seed + 3, 4)),
      d: (s / per) * 8 + Math.abs(fjitter(seed + 7, 1.5)) });
  }
  return out;
}
// Per-Stich-Eruption („Vulkan"): Fontänen an ZUFÄLLIGEN Positionen (je Stich neu, aus sweepId). Die Partikelzahl je
// Fontäne VERDOPPELT sich mit jeder Stufe (3·2^Stufe = 3/6/12/24); die Partikel werden mit mehr Wucht hochgeschossen.
function emberFountainJets(score, sweepId, turbo = 1) {
  const per = Math.max(2, Math.round(3 * Math.pow(2, emberStufe(score)) * turbo)); // 3/6/12/24 je Fontäne, bei MAX ~×0.45
  const xs = emberFountainXs(sweepId * 7 + 1);
  const out = [];
  for (let f = 0; f < xs.length; f++) for (let s = 0; s < per; s++) {
    const seed = sweepId * 131 + f * 61 + s * 19;
    out.push({ key: `f${f}j${s}`, white: s % 3 === 0, l: clamp(xs[f] + fjitter(seed, 5), 3, 97),
      jy: 118 + Math.abs(fjitter(seed + 3, 64)), dx: fjitter(seed + 9, 16), d: Math.abs(fjitter(seed + 5, 150)) });
  }
  return out;
}
// #perf A2-lite: memoisiert — alle Props sind Primitive (effect/color/sweepId/sweepDur/reduced/win). Re-rendert das
// Ambiente-DOM (Sternenfeld/Glutfunken/… — teils viele Knoten) NUR, wenn sich diese Werte ändern; bei sonstigen
// Battlefield-Re-Renders (ohne Stich/Feld-Wechsel) bleibt die Ebene stehen. Kein visueller Unterschied (Desktop unverändert).
// #: dezente Sterne für die Aurora (obere Feldhälfte). x/y in %, s = Größe (px), d = Twinkle-Versatz (s).
const AURORA_STARS = [{ x: 12, y: 14, s: 2, d: 0 }, { x: 26, y: 24, s: 1.4, d: 0.8 }, { x: 43, y: 9, s: 2.2, d: 1.5 }, { x: 57, y: 20, s: 1.5, d: 0.5 }, { x: 71, y: 12, s: 2, d: 1.2 }, { x: 85, y: 27, s: 1.4, d: 0.9 }, { x: 36, y: 33, s: 1.5, d: 1.9 }, { x: 64, y: 34, s: 1.3, d: 0.3 }];
const FieldFxLayerInner = function FieldFxLayer({ effect, color, color2 = null, sweepId, sweepDur, reduced, win, score = 0 }) {
  const react = !reduced && sweepId > 0; // per-Stich-Reaktion aktiv?
  const A = (c) => (reduced ? "" : c); // Ambiente-Animationsklasse nur ohne „Effekte reduziert" → sonst statisches Bild
  let inner = null;
  if (effect === "hologrid") {
    inner = (
      <div className="absolute" style={{ left: "-20%", right: "-20%", bottom: 0, height: "46%", transform: "perspective(160px) rotateX(60deg)", transformOrigin: "bottom" }}>
        <div className="absolute inset-0" style={{ backgroundImage: `linear-gradient(${color} 1px,transparent 1px),linear-gradient(90deg,${color} 1px,transparent 1px)`, backgroundSize: "18px 18px", opacity: 0.24 }} />
        {react && (
          <div key={sweepId} className="as-deck-sweep absolute left-0 right-0" style={{ height: 0, animationDuration: `${sweepDur}ms` }}>
            <div className="absolute left-0 right-0" style={{ top: win ? -12 : -4, height: win ? 24 : 8, background: win ? `linear-gradient(180deg, transparent, ${color} 34%, ${color} 66%, transparent)` : "linear-gradient(180deg, transparent, rgba(200,205,220,0.85) 45%, transparent)", filter: `blur(${win ? 5 : 2}px)`, opacity: win ? 0.95 : 0.4 }} />
            <div className="absolute left-0 right-0" style={{ top: win ? -2.5 : -1.5, height: win ? 5 : 3, background: win ? `linear-gradient(90deg, transparent, ${color} 12%, ${color} 42%, #ffffff 50%, ${color} 58%, ${color} 88%, transparent)` : "linear-gradient(90deg, transparent, rgba(220,224,235,0.8) 50%, transparent)", boxShadow: win ? `0 0 14px 2px ${color}, 0 0 36px 7px ${color}, 0 0 5px 1px #ffffff` : "none", opacity: win ? 1 : 0.55 }} />
          </div>
        )}
      </div>
    );
  } else if (effect === "starfield") {
    inner = (
      <>
        <div className={`${A("as-field-drift-a")} absolute inset-0`} style={{ backgroundImage: `radial-gradient(1.3px 1.3px at 15% 20%, ${color}, transparent 60%), radial-gradient(1px 1px at 70% 38%, ${color}cc, transparent 60%), radial-gradient(1.5px 1.5px at 40% 72%, ${color}, transparent 60%), radial-gradient(1px 1px at 86% 80%, ${color}aa, transparent 60%), radial-gradient(1px 1px at 55% 12%, ${color}, transparent 60%), radial-gradient(1.2px 1.2px at 25% 90%, ${color}bb, transparent 60%)`, opacity: 0.55 }} />
        <div className={`${A("as-field-drift-b")} absolute inset-0`} style={{ backgroundImage: `radial-gradient(1px 1px at 32% 55%, ${color}aa, transparent 60%), radial-gradient(1.6px 1.6px at 90% 22%, ${color}, transparent 60%), radial-gradient(1px 1px at 62% 88%, ${color}cc, transparent 60%), radial-gradient(1px 1px at 8% 45%, ${color}99, transparent 60%)`, opacity: 0.4 }} />
        {react && <div key={sweepId} className="as-field-shoot absolute" style={{ top: "10%", left: "-15%", width: "45%", height: 2, background: `linear-gradient(90deg, transparent, ${win ? "#ffffff" : color}, transparent)`, boxShadow: `0 0 8px 1px ${color}`, opacity: win ? 1 : 0.7, animationDuration: `${sweepDur}ms` }} />}
      </>
    );
  } else if (effect === "aurora") {
    // #: Echte Aurora statt Mittel-Bloom — ein „umgedrehter Halbkreis" (Dome) hängt oben am Feld: zwei versetzte
    // Farb-Bögen (Deckfarbe + zweite Farbe) mit weichem Glow, sanft undulierend, dazu ein paar dezente twinkelnde
    // Sterne. Je Stich pulsiert der Bogen kurz heller. transformOrigin oben-mittig → der Bogen „atmet" vom oberen Rand.
    const c2 = color2 || "#b06bff"; // zweite Aurora-Farbe (Deck-Sekundärfarbe, sonst sanftes Violett)
    inner = (
      <>
        <div className={`${A("as-field-aurora-a")} absolute`} style={{ left: "-8%", right: "-8%", top: "-10%", height: "64%", transformOrigin: "50% 0%", mixBlendMode: "screen",
          background: `radial-gradient(130% 82% at 50% 0%, ${color}99, ${color}33 34%, transparent 66%)`, filter: "blur(12px)", opacity: 0.75 }} />
        <div className={`${A("as-field-aurora-b")} absolute`} style={{ left: "-8%", right: "-8%", top: "-6%", height: "60%", transformOrigin: "50% 0%", mixBlendMode: "screen",
          background: `radial-gradient(118% 74% at 44% 0%, ${c2}77, transparent 60%)`, filter: "blur(18px)", opacity: 0.6 }} />
        {AURORA_STARS.map((st, i) => (
          <span key={i} className={A("as-star-twinkle")} style={{ position: "absolute", left: `${st.x}%`, top: `${st.y}%`, width: st.s, height: st.s,
            borderRadius: "50%", background: "#ffffff", boxShadow: `0 0 ${(st.s * 2).toFixed(0)}px #ffffffcc`, opacity: 0.6, animationDelay: `${st.d}s` }} />
        ))}
        {react && <div key={sweepId} className="as-field-bloom absolute" style={{ left: "-8%", right: "-8%", top: "-10%", height: "66%", mixBlendMode: "screen",
          background: `radial-gradient(130% 84% at 50% 0%, ${win ? color : c2}${win ? "aa" : "66"}, transparent 64%)`, animationDuration: `${sweepDur}ms` }} />}
      </>
    );
  } else if (effect === "embers") {
    // #: 2–3 Fontänen statt gleichmäßiger Verteilung; Anzahl/Höhe an den Score gekoppelt (emberFountainDots/Jets).
    const dots = emberFountainDots(score);
    // #perf: bei hohem Turbo (kleines sweepDur) die Jet-Anzahl runterskalieren — sonst feuern bei MAX volle 3·2^Stufe
    // Jets je Fontäne alle ~180ms → Ruckeln (analog Brennstrahl). turbo 0.45 (MAX) … 1 (normal).
    const emberTurbo = clamp((sweepDur || 900) / 875, 0.45, 1);
    const jets = react ? emberFountainJets(score, sweepId, emberTurbo) : null;
    inner = (
      <>
        {dots.map((e) => (
          <span key={e.key} className={`${A("as-field-rise")} absolute rounded-full`} style={{
            left: `${e.l}%`, bottom: reduced ? `${12 + e.rise / 8}%` : "-4%", width: e.size, height: e.size,
            background: color, boxShadow: `0 0 ${(e.size * 2.5).toFixed(1)}px ${color}`, opacity: 0.7,
            "--rise": `${e.rise}%`, "--rdx": `${e.rdx}px`, animationDuration: `${e.t}s`, animationDelay: `${e.d}s` }} />
        ))}
        {jets && jets.map((jt) => (
          <span key={`${sweepId}-${jt.key}`} className="as-field-spark absolute rounded-full" style={{
            left: `${jt.l}%`, bottom: "0%", width: win ? 3.2 : 2.6, height: win ? 3.2 : 2.6,
            background: jt.white ? "#ffffff" : color, boxShadow: `0 0 6px ${color}`,
            "--sx": `${jt.dx}px`, "--sy": `-${Math.round(jt.jy * (win ? 1.15 : 1))}px`,
            animationDuration: `${Math.max(560, Math.round(sweepDur * 0.9))}ms`, animationDelay: `${jt.d}ms` }} />
        ))}
      </>
    );
  } else if (effect === "dataRain") {
    inner = (
      <>
        <div className={`${A("as-field-datarain")} absolute left-0 right-0`} style={{ top: "-26px", bottom: "-26px", backgroundImage: `repeating-linear-gradient(0deg, ${color}55 0 5px, transparent 5px 26px)`, backgroundSize: "14px 26px", opacity: 0.4 }} />
        {react && <div key={sweepId} className="as-field-drop absolute" style={{ left: `${18 + (sweepId * 37) % 64}%`, top: "-24%", width: 3, height: "26%", background: `linear-gradient(180deg, transparent, ${win ? "#ffffff" : color}, transparent)`, boxShadow: `0 0 8px 1px ${color}`, opacity: win ? 1 : 0.7, animationDuration: `${sweepDur}ms` }} />}
      </>
    );
  } else if (effect === "scanline") {
    inner = (
      <>
        <div className={`${A("as-field-flicker")} absolute inset-0`} style={{ backgroundImage: `repeating-linear-gradient(0deg, ${color}1a 0 1px, transparent 1px 4px)`, opacity: 0.45 }} />
        {react && <div key={sweepId} className="as-field-scan absolute left-0 right-0" style={{ height: 1, top: 0, background: `linear-gradient(90deg, transparent, ${win ? "#ffffff" : color}, transparent)`, boxShadow: `0 0 6px 0 ${color}`, opacity: win ? 1 : 0.7, animationDuration: `${sweepDur}ms` }} />}
      </>
    );
  } else if (effect === "vignette") {
    inner = (
      <>
        <div className={`${A("as-field-vignette")} absolute inset-0`} style={{ background: `radial-gradient(125% 125% at 50% 50%, transparent 52%, ${color}33 88%, ${color}55 100%)` }} />
        {react && <div key={sweepId} className="as-field-bloom absolute inset-0" style={{ background: `radial-gradient(120% 120% at 50% 55%, ${color}${win ? "55" : "33"} 0%, transparent 68%)`, animationDuration: `${sweepDur}ms` }} />}
      </>
    );
  } else return null;
  return <div aria-hidden="true" className="absolute inset-0 rounded-xl overflow-hidden pointer-events-none" style={{ zIndex: 1 }}>{inner}</div>;
};
export const FieldFxLayer = memo(FieldFxLayerInner);
function SlashGhostLayer({ ghosts, panelRef = null }) {
  return (
    <>
      {ghosts.map((g) => {
        const cardEl = (
          <Card suit={g.suit} value={g.value} baseRank={g.baseRank} stichBonus={g.stichBonus}
            ionStacks={g.ionStacks} green={g.green}
            forged={g.forged || 0} branded={g.branded || 0} growth={g.growth || 0} colonized={g.colonized || 0}
            allyColor={g.allyColor} frontImage={g.frontImage} />
        );
        // Reihenfolge (Wunsch): Karte liegt (rest) → Slice/Explosion IN PLACE (delay = g.rest) → DANACH floatet der
        // Ghost weg. #187: Slice driftet nach dem SCHNITT (driftDelay = rest + cut) in eine ZUFÄLLIGE Richtung
        // (rundum, deterministisch aus g.seed via fjitter, kein Neu-Würfeln bei Re-Render). Die Krit-Explosion
        // zerbirst an Ort und Stelle in Pixel-Shards (die Shards fliegen selbst nach außen) → kein Wrapper-Drift.
        const isGrid = g.fx === "lasergrid";   // #295 Lasergitter: Raster-Dicing
        const isBurn = g.fx === "burn";        // #295 Brennstrahl: Loch + Bruch
        const isOvl  = g.fx === "overload";    // #300 Überladung: Blitzeinschlag (Canvas)
        const isDisp = g.fx === "disperse";    // #300 Zerstäubung: Partikelgitter (Canvas)
        const inPlace = isGrid || isBurn || isOvl || isDisp; // zerfällt/bricht an Ort und Stelle → kein Wrapper-Drift (Schwarzes Loch läuft im Panel-Canvas, nicht als Ghost)
        const dang = fjitter(g.seed * 3 + 2, Math.PI);                        // −π..π → volle 360° rundum
        // Laser-Treffer zerfallen NAH am Deck (wenig Drift); normaler Klingenschnitt driftet weiter ins Feld.
        const drad = inPlace ? 0 : g.laser ? 10 + Math.abs(fjitter(g.seed * 5 + 3, 12)) : 40 + Math.abs(fjitter(g.seed * 5 + 3, 26)); // Laser 10..22 · Klinge 40..66 px
        const drot = inPlace ? 0 : fjitter(g.seed * 7 + 5, 8);                // −8..8° leichte Rotation (nur Slice)
        const driftDelay = g.rest + (inPlace ? 0 : g.cut);                    // Float-Away startet NACH dem Schnitt
        return (
          <div key={g.id} className="absolute inset-0 pointer-events-none" aria-hidden="true"
            style={{ animation: `as-loss-drift-rand ${g.float}ms cubic-bezier(0.2, 0.6, 0.3, 1) ${driftDelay}ms forwards`, willChange: "transform",
                     "--drx": `${(Math.cos(dang) * drad).toFixed(1)}px`, "--dry": `${(Math.sin(dang) * drad).toFixed(1)}px`, "--drot": `${drot}deg` }}>
            {isGrid
              ? <LaserGridFx cardEl={cardEl} color={g.color} diceDur={g.halves} lineDur={g.boom} seed={g.seed} delay={g.rest} intensity={g.fxP} tier={g.fxTier} scale={g.scale} />
              : isBurn
              ? <BurnBeamFx cardEl={cardEl} color={g.color} flipMs={g.flipMs} seed={g.seed} delay={g.rest} intensity={g.fxP} scale={g.scale} streak={g.streak} />
              : isOvl
              ? <OverloadFx cardEl={cardEl} color={g.color} flipMs={g.flipMs} seed={g.seed} tier={g.dtier} scale={g.scale} />
              : isDisp
              ? <DisperseFx cardEl={cardEl} color={g.color} flipMs={g.flipMs} seed={g.seed} tier={g.dtier} scale={g.scale} />
              : <SliceFx cardEl={cardEl} color={g.color} halvesDur={g.halves} cutDur={g.cut} sparkDur={g.spark} seed={g.seed} delay={g.rest} intensity={g.fxP} tier={g.fxTier} scale={g.scale} laser={g.laser} />}
          </div>
        );
      })}
    </>
  );
}

// #: CritScreenFx (Vollbild-Flash/Vignette bei Krit) entfernt — Krit-Finisher-Animationen raus.

export function Battlefield({ lastTrick, remaining = TRICKS_PER_CYCLE, deckLen = TRICKS_PER_CYCLE, flipMs = 1000, pe = {}, heat = null, lightning = null, oppDeck = "stat", score = 0,
  // Feuer-Rework (#206): geschmiedete Dauerwerte (eigene Karten) + aktive Brandmarken (Gegnerkarten) für die Karten-Indikatoren.
  forged = {}, brandActive = {},
  // Pflanze-Rework (#211): Wachstum je eigener Karte-id (Wachstumsring + grüne Zahl) + kolonisierte Gegnerkarten (Ausläufer-Marker).
  growth = {}, colonized = {},
  // #190 Kosmetik: gewähltes Spieler-Deck (front=Rahmen, back=Cover) + Battlefield-Skin ({desktop,mobile}|null).
  // Defaults = bestehende Karten → ohne Auswahl identisches Verhalten (Gegner-Deck bleibt OPP_DECK_SKINS).
  deckFront = cardFrontImg, deckBack = cardBackImg, battlefield = null,
  // #deckshop: Deck-Werkstatt-Animationen (an das aktive Theme gekoppelt): deckA1 = Deck-Hauptfarbe für
  // Frame Glow (Karte) + Hologrid (Gitterlinien im Battlefield); Holo Swipe = Schimmer über die eigene Karte.
  // #306 fxField = Key des aktiven Battlefield-Ambiente-Effekts ("hologrid"/"starfield"/… | null) — einfach-exklusiv.
  deckA1 = null, deckA2 = null, fxFrameGlow = false, fxHoloSwipe = false, fxAuroraVeil = false, fxGlitch = false, fxField = null, fxLaserSlice = false, fxBlackhole = false, fxLasergrid = false, fxBurnBeam = false, fxOverload = false, fxDisperse = false,
  // Gottgleicher Sieg OHNE Krit (tier 4): kaufbare Prunk-Overlays (stapelbar).
  fxFireworks = false, fxGoldRain = false, fxPrismaWave = false,
  // #200 B: „Effekte reduziert" (auto|an|aus). Löst zusammen mit prefers-reduced-motion/Mobile den `reduced`-Modus aus.
  reducedFx = "auto" }) {
  const reduced = useReducedFx(reducedFx);
  // GOTTGLEICH-Prunk: Panel = Prallwand-Rahmen, oppSlot = Ursprung (zerstörte Gegnerkarte); burst triggert den Schwarm.
  const panelRef = useRef(null);
  const oppSlotRef = useRef(null);
  // #: BounceBurst/Krit-Schwarm entfernt (Krit-Finisher-Animationen raus) → kein burst-Trigger mehr.
  // #294 Gottgleich-Prunk OHNE Krit: getrennter Trigger für die (stapelbaren) Prunk-Overlays.
  const [prunk, setPrunk] = useState(null);
  const prunkSeq = useRef(0);
  // #296 Schwarzes Loch (Serie): persistentes Panel-Loch. Jeder Blackhole-Sieg feuert einen „Puls" (Karte wird
  // eingesogen) an das Loch, das über die Serie hinweg wächst und beim Serienabbruch kollabiert.
  const [holePulse, setHolePulse] = useState(null);
  const [burnPulse, setBurnPulse] = useState(null); // #295 persistenter Brennstrahl: Sieg = lit + Level, Niederlage = zurückziehen
  const burnLoopRef = useRef(null); // #295: Handle des persistenten „Brennstrahl"-Ton-Betts (Loop-SFX, an burnPulse gekoppelt)
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
    ? (isCrit ? { text: "Gewonnen · Kritisch", color: CRIT_COLOR } : BANNER[t.result])
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
  const [sweepId, setSweepId] = useState(0);
  const lastSweepAt = useRef(-1e9);
  const trickNo = lastTrick ? lastTrick.trickNo : null;
  useEffect(() => {
    if (!fxField || reduced || trickNo == null) return;
    const now = (typeof performance !== "undefined" ? performance.now() : Date.now());
    if (now - lastSweepAt.current >= sweepDur - 20) { lastSweepAt.current = now; setSweepId((k) => k + 1); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trickNo]);
  // #135: Ergebnis-Puls-Dauer an den Flip-Takt gekoppelt (wie die übrigen „Juice"-Animationen).
  const pulseDur = clamp(flipMs * 0.7, 300, 700);
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
  // #135: nach außen wegpulsende Ergebnis-Welle HINTER der Karte (Sieg grün / Niederlage rot / Crit lila &
  // kräftiger). Separates Element → die statischen Karten-Glows (Ion/Frost/Wert) bleiben unberührt. Kein Puls
  // bei reduzierter Bewegung. Liegt als erstes (absolutes) Kind hinter der Karte, die (position:relative) darüber malt.
  const resultPulse = (color, crit) => (!reduced && color) ? (
    <div className="as-result-pulse absolute inset-0" aria-hidden="true"
      style={{ "--pulse-color": color, "--pulse-dur": `${pulseDur}ms`, ...(crit ? { "--pulse-scale": 1.55 } : null) }} />
  ) : null;

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
  // Der Klingenschnitt trifft NUR die Gegnerkarte, und NUR wenn WIR gewinnen (Wunsch). Die eigene Karte wird nie
  // geschnitten: bei einer Niederlage fliegt sie einfach weg (as-flyaway). Sieg: Gegnerkarte in-place geschnitten
  // (Krit: Explosion), Spielerkarte kippt als Sieger an.
  const flyAway      = sliceOn && lost;                       // eigene Karte verliert → fliegt einfach weg (ohne Schnitt)
  // #: Krit-Finisher-Animationen entfernt — die (kaufbaren) Custom-Finisher übernehmen jetzt JEDEN Sieg (auch Krits).
  // Ein Krit spielt also denselben Finisher wie ein normaler Sieg; nur die „Kritisch!"-Anzeige + Lila bleiben.
  // #293/#295 Sieg-Finisher (untereinander exklusiv, feste Priorität): Schwarzes Loch › Lasergitter › Brennstrahl ›
  // Überladung › Zerstäubung › Laser-Schnitt/Klinge. Die UI-Einfachauswahl setzt ohnehin nur EINEN Flag.
  const holeFinish   = sliceOn && win && fxBlackhole;
  const gridFinish   = sliceOn && win && !fxBlackhole && fxLasergrid;                 // #295 Lasergitter
  const burnFinish   = sliceOn && win && !fxBlackhole && !fxLasergrid && fxBurnBeam;  // #295 Brennstrahl
  const overloadFinish = sliceOn && win && !fxBlackhole && !fxLasergrid && !fxBurnBeam && fxOverload;                 // #300 Überladung (Blitz)
  const disperseFinish = sliceOn && win && !fxBlackhole && !fxLasergrid && !fxBurnBeam && !fxOverload && fxDisperse;  // #300 Zerstäubung (Partikel)
  // #300 Intensitäts-Stufe (1..4) aus dem absoluten Wertunterschied des Stichs (pValue−oValue). Rein „Juice", deterministisch.
  const diffTier = t ? fxDiffTier(Math.max(0, Math.round((t.pValue || 0) - (t.oValue || 0)))) : 1;
  // #296: Ist der Blackhole-Finisher im Lauf aktiv? Dann läuft das persistente Panel-Loch (unabhängig vom Einzelstich).
  // Kein separater Ghost auf der Gegnerkarte mehr — der Sog/das Loch werden im Canvas gezeichnet.
  const holeActive   = !reduced && fxBlackhole && flipMs > 170 && !!t;
  const burnActive   = !reduced && fxBurnBeam && flipMs > 170 && !!t; // #295 persistenter Brennstrahl im Lauf aktiv
  const oppSliced    = sliceOn && win;                        // Sieg → Gegnerkarte in-place vom Finisher-Ghost übernommen
  const playerWinner = sliceOn && win;    // Spielerkarte gewinnt → kippt an
  const oppWinner    = sliceOn && lost;   // Gegnerkarte gewinnt → kippt an
  const winnerTilt = (dur) => ({ animation: `as-slice-winner ${dur}ms ease-out`, willChange: "transform" });
  // #180 Flip-Reveal der Spielerkarte: nur bei normaler Bewegung, echtem Stich, nicht beim Wegflug (Niederlage)
  // und nicht bei sehr hohem Turbo. Dauer an den Flip-Takt gekoppelt.
  const flipOn = !reduced && !!t && !flyAway && flipMs > 170;
  // #186 Flip-Reveal der Gegnerkarte: analog zur Spielerkarte, aber NICHT wenn die Gegnerkarte gerade geschnitten
  // wird/explodiert (dort übernimmt der entkoppelte Ghost). Bei Gegner-Sieg (oppWinner) darf sie flippen + ankippen.
  const oppFlipOn = !reduced && !!t && !oppSliced && flipMs > 170;
  const flipDur = clamp(flipMs * 0.55, 220, 460);

  // Kartenelemente einmal bauen — als sichtbare Karte, als (unsichtbarer) Größen-Platzhalter unter dem Slice und
  // als Klon-Quelle in SliceFx wiederverwendbar (Elemente sind unveränderliche Beschreibungen → mehrfach nutzbar).
  // #180: die Spielerkarte trägt den Skin-Front-Rahmen (Zahl/Effekte kommen darüber).
  const pCardEl = t && (
    <Card suit={t.pCard.suit} value={t.pCard.value} baseRank={t.pCard.baseRank}
          stichBonus={t.pValue - t.pCard.value} glow={win ? (isCrit ? critColor : "#5ab87a") : null}
          ionStacks={t.pCard.ionStacks || 0} green={!!t.pCard.green} forged={forged[t.pCard.id] || 0} growth={growth[t.pCard.id] || 0} allyColor={allyColorFor(t.pCard.suit)}
          frontImage={deckFront} fxGlow={fxFrameGlow ? deckA1 : null} fxSwipe={fxHoloSwipe}
          fxAurora={fxAuroraVeil ? { a1: deckA1, a2: deckA2 } : null} fxGlitch={fxGlitch} />
  );
  // #186: die Gegnerkarte trägt den Skin-Front-Rahmen der kommenden Auswahl (Holo entfällt); Zahl/Effekte darüber.
  const oCardEl = t && (
    <Card suit={t.oCard.suit} value={t.oValue} baseRank={t.oCard.baseRank} glow={lost ? "#e0605a" : null}
          green={!!t.oCard.green} branded={brandActive[t.oCard.id] || 0} colonized={colonized[t.oCard.id] ? AUSLAEUFER_HARVEST : 0} allyColor={allyColorFor(t.oCard.suit)} frontImage={oppFrontImg} />
  );

  // Sieger kippt an (as-slice-winner); im Flip-Fall steckt die (evtl. gekippte) Karte als Front-Face im Flip.
  const playerFront = playerWinner ? <div style={winnerTilt(sWinner)}>{pCardEl}</div> : pCardEl;
  const playerCard = t ? (
    <div key={`p${t.trickNo}`} className="relative"
      style={flyAway ? { animation: `as-flyaway ${flyDur}ms ease-in forwards`, willChange: "transform, opacity" }
           : flipOn ? undefined : dealStyle("as-deal-left")}>
      {/* Krits zeigen GAR keinen Ergebnis-Puls mehr — nur das Shatter/der Schnitt (+ GOTTGLEICH). Nur normale Siege pulsen (grün). */}
      {resultPulse(win && !isCrit ? "#5ab87a" : null, false)}
      {flipOn ? (
        <FlipReveal front={playerFront} backImage={deckBack} dur={flipDur} />   /* #180: Rücken → Front */
      ) : playerFront}   {/* Niederlage: eigene Karte fliegt (via as-flyaway am Wrapper) einfach weg — kein Schnitt */}
    </div>
  ) : <div className="relative"><CardBack label="" image={deckBack} /></div>;

  // Sieger kippt an; im Flip-Fall steckt die (evtl. gekippte) Karte als Front-Face im Flip.
  const oppFront = oppWinner ? <div style={winnerTilt(sWinner)}>{oCardEl}</div> : oCardEl;
  const oppCard = t ? (
    <div key={`o${t.trickNo}`} className="relative" style={(oppSliced || oppFlipOn) ? undefined : dealStyle("as-deal-right")}>
      {resultPulse(lost ? "#e0605a" : null, false)}
      {oppSliced ? (
        <div style={{ opacity: 0 }} aria-hidden="true">{oCardEl}</div>   /* in-place unsichtbar — der entkoppelte Ghost (Side-overlay) floatet + schneidet/berstet (#186) */
      ) : oppFlipOn ? (
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
  // Serien-Meilenstein hat Vorrang: eine 200er-Serie feiert „Gönn dir" (unabhängig vom Stich-Score), sonst Lawine bzw. Score-Stufe.
  const goennMilestone = win && t && (t.winStreak || 0) >= STREAK_GOENN;
  const bigScore = goennMilestone ? GOENNDIR_TIER : (baseBigTier && t && t.grosseLawine ? LAWINE_TIER : baseBigTier);

  // Ergebnis-Aufschlüsselung (§17): kompakte Faktorenkette (Basis → Flats → Serie → Perks → Formation → Crit)
  // aus der Engine-breakdown — exakt die Faktoren der Score-Formel (kein Drift). Nur bei nennenswerten Treffern.
  const bd = win && t ? t.breakdown : null;
  const nq = (x) => x.toFixed(2).replace(".", ",");
  const chain = [];
  if (bd) {
    chain.push({ main: `${bd.base}`, label: "Basis", c: "#c8c8ce" });
    if (bd.flats > 0.5)        chain.push({ main: `+${Math.round(bd.flats)}`, label: "Flats", c: "#5ab87a" });
    if (bd.streakMult > 1.001) chain.push({ main: `×${nq(bd.streakMult)}`, label: "Serie", c: "#5a8ade" });
    if (bd.perkMult > 1.001)   chain.push({ main: `×${nq(bd.perkMult)}`, label: "Perks", c: "#8a7de0" });
    if (bd.formMult > 1.001)   chain.push({ main: `×${nq(bd.formMult)}`, label: "Form", c: "#5ab87a" });
    if ((bd.afterglowMult || 1) > 1.001) chain.push({ main: `×${nq(bd.afterglowMult)}`, label: "Nachhall", c: "#5ab87a" });
    if ((bd.coreMult || 1) > 1.001)      chain.push({ main: `×${nq(bd.coreMult)}`, label: "Kern", c: "#d4a63a" });
    if (bd.critMult > 1.001)   chain.push({ main: `×${nq(bd.critMult)}`, label: "Crit", c: critColor });
  }
  // Panel nur zeigen, wenn mehr als eine kleine Serie im Spiel ist (Flats/Perks/Formation/Crit oder Serie ≥ +10 %).
  const showBreakdown = !!bd && (bd.flats > 0.5 || bd.perkMult > 1.001 || bd.formMult > 1.001 || (bd.afterglowMult || 1) > 1.001 || (bd.coreMult || 1) > 1.001 || bd.critMult > 1.001 || bd.streakMult >= 1.10);

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
    audio.play("cardflip", {
      rate: Math.min(CARDFLIP_RATE_CAP, Math.max(1, CARDFLIP_RATE_REF / flipMs)),
      gain: CARDFLIP_GAIN_CONST,
    });
    // #295/#296 Sieg-Finisher-SFX (Akzent AUF dem cardflip): Rate an flipMs gekoppelt (wie cardflip) → kein Überlaufen/
    // Stapeln in den nächsten Stich. Priorität wie das Visual. Schwarzes Loch UND Brennstrahl sind PERSISTENT → kein
    // One-Shot hier, sie laufen als Loop-Bett (holeActive-/burnPulse-Effect unten). Nur Lasergitter/Laser/Klinge sind
    // Per-Stich-One-Shots. (Lasergitter teilt sich den Laser-Sound.)
    if (w && flipMs > 170) {
      const fxRate = Math.min(CARDFLIP_RATE_CAP, Math.max(1, CARDFLIP_RATE_REF / flipMs));
      // #: Bass-Impact-Layer auf großen Siegen/Groß-Ansagen (Stark/Irre/Gottgleich) ENTFERNT — Bass gibt es nur noch beim
      // „Schwarzen Loch". Die Finisher-Sounds unten bleiben, aber ohne Bass-Anhebung.
      if (holeFinish || burnFinish) { /* still — persistente Betten (Loop) decken diese Siege ab */ }
      else if (gridFinish)                audio.play("fx_laser", { rate: fxRate, gain: 1.1 }); // Lasergitter
      else if (overloadFinish) {          // #300/#: Überladung — Blitz-Crack, aber weicher: Lowpass rundet die harte Höhe ab,
        // kurzer Attack glättet die Transiente, Release lässt ihn sanft ausklingen (statt hartem Abriss). Im Turbo mehr
        // Softening + etwas leiser → weniger „hart/hektisch".
        const turbo = clamp((fxRate - 1) / 0.6, 0, 1);
        // #: Im Turbo/Max klingt der Blitz-Crack sonst zu ABRUPT ab. Zwei Hebel: (1) die playbackRate wird im Turbo leicht
        // gedrosselt (×0,82 bei Max) → das Sample behält mehr Körper/Ausklang statt abgehackt schnell zu enden; (2) deutlich
        // längeres Release-Nachklingen. Lowpass rundet die harte Höhe zusätzlich ab.
        audio.play("fx_lightning", { rate: fxRate * (1 - turbo * 0.18), gain: (0.8 + diffTier * 0.07) * (1 - turbo * 0.22),
          soft: 6000 - turbo * 2600, attack: 0.006, release: 0.09 + turbo * 0.22 });
      }
      else if (disperseFinish)            audio.play("fx_atomize", { rate: fxRate, gain: 0.85 + diffTier * 0.06 });   // #300 Zerstäubung: Partikel-Auflösung
      else if (oppSliced && fxLaserSlice) audio.play("fx_laser", { rate: fxRate, gain: 1.1 });          // globaler Laser-Schnitt
      else if (oppSliced)                 audio.play("fx_blade", { rate: fxRate, gain: 1.05 });          // Default-Klinge
    }
    const dur = floatDur; // #68/#95: lange Float-Dauer, geteilt mit dem Formations-Float
    // Treffer-Identitäten (Feuer/Pflanze/Eis/Blitz, mehrere zugleich möglich) → alle Icons + Score-Farbe.
    // Farbe: Krit-Lila zuerst, sonst die erste zutreffende Identität nach HIT_COLOR_ORDER, sonst Gold. Icons bleiben immer.
    const hits = t.hitTypes || [];
    const hitIcons = HIT_ICON_ORDER.filter((k) => hits.includes(k)); // Icon-KEYS (Eis rendert als Bild, Rest als Emoji)
    const hitColorKey = HIT_COLOR_ORDER.find((k) => hits.includes(k));
    const critC = t.isCrit ? CRIT_COLOR : (hitColorKey ? HIT_STYLE[hitColorKey].color : "#d4a63a");
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
    setFloats((cur) => { const next = [...cur, ...entries].slice(-4); floatCountRef.current = next.length; return next; }); // Pool gedeckelt (#: 6→4) — kein unbegrenztes Stapeln
    const ids = entries.map((e) => e.id);
    const removeAfter = Math.max(...entries.map((e) => e.dur)); // #: nach der EIGENEN (kürzeren) Score-Dauer aufräumen → floatCount fällt schneller
    const tm = setTimeout(() => {
      setFloats((cur) => { const next = cur.filter((f) => !ids.includes(f.id)); floatCountRef.current = next.length; return next; });
      floatTimers.current = floatTimers.current.filter((x) => x !== tm); // #159: erledigten Timer aus dem Ref splicen → kein unbegrenztes Wachstum über einen langen Lauf
    }, removeAfter);
    floatTimers.current.push(tm);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- bewusst gekeyt/eingefroren, Werte wechseln synchron mit den Deps — #292 geprüft
  }, [t?.trickNo]);

  // #298 „Schwarzes Loch"-Ton-Bett: leiser Start beim ersten Sieg, Anschwellen mit dem Wachstum (Sieg-Pulse), schneller
  // Ausklang beim Kollaps. Nur Ton, WÄHREND das Loch sichtbar ist & wächst (an holePulse gekoppelt, nicht bloß holeActive).
  // Identische Logik wie die Shop-Vorschau (geteilter Hook → kein Drift).
  useBlackholeSfx(holeActive, holePulse);
  // #295 „Brennstrahl": der persistente Strahl ist NUR lit, solange die Serie läuft (Sieg → lit, Niederlage → zieht sich
  // zurück). Das Loop-Bett folgt daher der Lit-Phase (burnPulse), nicht bloß burnActive: Sieg startet den Laser-Loop,
  // Niederlage/Rundenende stoppen ihn. loopStart/End loopen die gleichförmige Strahl-Mitte → nahtlos.
  useEffect(() => {
    const lit = burnActive && burnPulse && burnPulse.kind === "win";
    if (lit) {
      // #: Wie beim Schwarzen Loch — der Strahl-Ton startet LEISE und wird mit der Serie lauter; zusätzlich zieht die
      // playbackRate mit der Serie leicht an (klingt „heißer"/schneller). streakK 0..1 aus burnPulse.streak.
      const sK = clamp((burnPulse.streak || 0) / 12, 0, 1);
      const g = 0.3 + sK * 0.6;   // leiser Start → deutlich lauter mit der Serie
      const r = 1 + sK * 0.28;    // leicht schneller mit der Serie
      if (!burnLoopRef.current) burnLoopRef.current = audio.loop("fx_burnbeam", { gain: g, rate: r, loopStart: 0.1, loopEnd: 0.8 });
      else { audio.setLoopGain(burnLoopRef.current, g); audio.setLoopRate(burnLoopRef.current, r); }
    } else if (burnLoopRef.current) {
      audio.stopLoop(burnLoopRef.current); burnLoopRef.current = null;
    }
  }, [burnActive, burnPulse]);
  // Unmount → Brennstrahl-Bett sicher stoppen (das Schwarzes-Loch-Bett räumt sein eigener Hook auf).
  useEffect(() => () => {
    if (burnLoopRef.current) { audio.stopLoop(burnLoopRef.current, { fade: 0.05 }); burnLoopRef.current = null; }
  }, []);

  // #FB: Groß-Ansage-Pool („wie stark") — entkoppelt vom Stich-Takt (wie der Score-Float-Pool). Jeder Eintrag lebt
  // BIG_ANNOUNCE_MS und entfernt sich selbst, unabhängig davon, wie schnell die Folgestiche kommen. So bleibt die
  // Ansage auch bei 4×/MAX voll sichtbar, statt vom nächsten Stich abgeschnitten zu werden. Spur (lane) rotiert →
  // aufeinanderfolgende Ansagen fächern vertikal, Pool klein gedeckelt → kein „zu sehr Überlappen".
  const [bigFloats, setBigFloats] = useState([]);
  const bigTimers = useRef([]);
  const bigSeq = useRef(0);
  const lawineShown = useRef(false); // Große Lawine feuert 1×/Lauf → nur der ERSTE Finale-Bruch zeigt „LAWINE" (kein Schwarm)
  const goennShown = useRef(false);  // „Gönn dir" nur EINMAL je 200er-Serie → Ref scharf, sobald die Serie wieder unter die Schwelle fällt
  useEffect(() => () => bigTimers.current.forEach(clearTimeout), []);
  useEffect(() => {
    if (!t) { setBigFloats([]); lawineShown.current = false; goennShown.current = false; return; }   // Menü/neuer Lauf → Pool leeren + Merker zurücksetzen
    if ((t.winStreak || 0) < STREAK_GOENN) goennShown.current = false;  // Serie unter der Schwelle (z. B. Niederlage) → nächster 200er darf wieder feiern
    if (!bigScore) return;                   // nur bei einem großen Sieg-Stich
    if (bigScore === GOENNDIR_TIER) {        // Serien-Meilenstein: die Ansage nur EINMAL je 200er-Serie
      if (goennShown.current) return;
      goennShown.current = true;
    }
    if (bigScore === LAWINE_TIER) {          // Große Lawine: die Groß-Ansage nur EINMAL pro Finale, danach still weiterzählen
      if (lawineShown.current) return;
      lawineShown.current = true;
    }
    const lane = BIG_LANES[bigSeq.current % BIG_LANES.length];
    bigSeq.current += 1;
    // #Fix: id global eindeutig über den monotonen bigSeq (nicht nur trickNo) → keine duplicate-key-Kollision.
    const entry = { id: `b${t.trickNo}-${bigSeq.current}`, tier: bigScore, seed: t.trickNo, lane };
    setBigFloats((cur) => [...cur, entry].slice(-3)); // max 3 gleichzeitig (jede auf eigener Spur)
    const tm = setTimeout(() => {
      setBigFloats((cur) => cur.filter((f) => f.id !== entry.id));
      bigTimers.current = bigTimers.current.filter((x) => x !== tm);
    }, BIG_ANNOUNCE_MS + 80);
    bigTimers.current.push(tm);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- bewusst gekeyt/eingefroren, Werte wechseln synchron mit den Deps — #292 geprüft
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
  useEffect(() => () => ghostTimers.current.forEach(clearTimeout), []);
  useEffect(() => {
    if (!t) { setSlashGhosts([]); return; }        // Menü/neuer Lauf → Pool leeren
    if (!sliceOn) return;                           // nur bei einem echten (animierten) Sieg/Niederlage-Stich
    // #188: Effekt-Intensität aus dem Per-Stich-Score. Niederlage → t.gained 0 → Base (kein Skalieren).
    const { p: fxP, tier: fxTier } = fxIntensity(t.gained || 0);
    const base = { rest: sRest, halves: sHalves, cut: sCut, spark: sSpark, boom: sBoom, float: sFloat, streak: t.winStreak || 0, fxP, fxTier, scale: fxScale, flipMs };
    const spawned = [];
    // #296 Schwarzes Loch: bei aktivem Blackhole-Finisher wird die Gegnerkarte NICHT mehr als eigener Ghost
    // geschnitten/implodiert, sondern als „Sieg-Puls" an das persistente Panel-Loch gemeldet (Sog + Wachstum im
    // Canvas + Serien-Mult für die ×2.0-Schwelle). Eine Niederlage meldet einen „loss-Puls" → Serienabbruch → Kollaps.
    // #: Der Kollaps-Bass wird zentral im geteilten Hook useBlackholeSfx gespielt (gekoppelt an growth > 0 = „Loch war
    // entzündet") → In-Game und Shop-Vorschau klingen identisch, und aufeinanderfolgende Niederlagen lösen keinen Bass aus.
    if (holeFinish) setHolePulse({ id: t.trickNo, kind: "win", num: t.oValue, col: deckA1 || suitColor(t.oCard.suit), mult: bd ? bd.streakMult : 1 });
    else if (holeActive && lost) setHolePulse({ id: t.trickNo, kind: "loss" });
    // #295 Brennstrahl: Sieg → Strahl lit + Intensität (Serie); Niederlage → Serienabbruch → Strahl zieht sich zurück.
    if (burnFinish) setBurnPulse({ id: t.trickNo, kind: "win", streak: t.winStreak || 0 });
    else if (burnActive && lost) setBurnPulse({ id: t.trickNo, kind: "loss" });
    // Niederlage: KEIN Schnitt-Ghost mehr auf der Spielerseite — die eigene Karte fliegt nur weg (as-flyaway, s. o.).
    if (win && !holeFinish) {   // Gegnerkarte verliert → Finisher-Ghost (Klinge/Laser/Lasergitter/Brennstrahl/Überladung/Zerstäubung) — auch bei Krit
      spawned.push({ ...base, id: `og${t.trickNo}-${ghostSeq.current++}`, side: "opp",
        fx: gridFinish ? "lasergrid" : burnFinish ? "burn" : overloadFinish ? "overload" : disperseFinish ? "disperse" : "slice",
        dtier: diffTier, // #300 Wertdifferenz-Stufe (Überladung/Zerstäubung)
        laser: fxLaserSlice, // globaler Laser-Schnitt (nur normaler Schnitt)
        // #: Überladung — der Blitz nimmt die DECKFARBE an (nicht die Gegner-Suit-Farbe); alle anderen Finisher bleiben Suit-farbig.
        color: overloadFinish ? (deckA1 || suitColor(t.oCard.suit)) : suitColor(t.oCard.suit), seed: t.trickNo * 3 + 1,
        suit: t.oCard.suit, value: t.oValue, baseRank: t.oCard.baseRank, stichBonus: 0,
        ionStacks: 0, green: !!t.oCard.green,
        branded: brandActive[t.oCard.id] || 0, colonized: colonized[t.oCard.id] ? AUSLAEUFER_HARVEST : 0, allyColor: allyColorFor(t.oCard.suit), frontImage: oppFrontImg });
    }
    if (!spawned.length) return;
    setSlashGhosts((cur) => [...cur, ...spawned].slice(-ghostCap)); // Pool gedeckelt (turbo-abhängig, #200 A)
    const ids = spawned.map((g) => g.id);
    // #295 Brennstrahl löst innerhalb der Stich-Kadenz (flipMs) auf → Ghost wird passend dazu entfernt (liegt nie
    // hinter der neu geflippten Karte). Andere Finisher: Ruhe + längster FX-Teil (#188, skaliert).
    // #: Brennstrahl-Ghost lebt so lange, wie der Zerfall SICHTBAR ist (hitAt + gestaffelte Fragment-Dauer). Im Turbo ist
    // das länger als flipMs → der Burst überlappt bewusst leicht den nächsten Stich, sodass „eine Karte nach der anderen"
    // zerfällt statt bloß zu flippen. Fragmente faden aus (verdecken die Folgekarte nicht); Pool bleibt gedeckelt.
    const burnT = burnFinish ? burnDisintTiming(flipMs, sRest) : null;
    const ghostLife = burnFinish ? burnT.hitAt + Math.round(burnT.disintDur * 1.14) + 40
      : disperseFinish ? Math.round(disperseDur(flipMs) * 1.12) + 40   // #: Zerstäubung mit Sichtbarkeits-Boden (bei Max nicht abgeschnitten)
      : overloadFinish ? Math.max(220, flipMs - 40) + 60               // #300 Canvas-Finisher löst im flipMs-Budget auf
      : sRest + Math.max(sHalves, sSpark) * (1 + fxP * 0.3) + 100;
    const tm = setTimeout(() => {
      setSlashGhosts((cur) => cur.filter((g) => !ids.includes(g.id)));
      ghostTimers.current = ghostTimers.current.filter((x) => x !== tm); // #159: erledigten Timer aus dem Ref splicen (wie floatTimers)
    }, ghostLife);
    ghostTimers.current.push(tm);
    // #: Krit-Finisher-Animation entfernt — der abprallende GOTTGLEICH-Partikel-Schwarm (BounceBurst) feuert nicht mehr.
    // (Die kaufbaren Custom-Finisher decken den Sieg-Look ab; die Prunk-Overlays für Nicht-Krit-GOTTGLEICH bleiben.)
    // #294 GOTTGLEICH-Sieg OHNE Krit (tier 4): kaufbare Prunk-Overlays (stapelbar) feuern ON TOP der Groß-Ansage.
    if (win && !isCrit && fxTier >= 4 && !reduced && (fxFireworks || fxGoldRain || fxPrismaWave)) {
      // #: Der Prunk-Bass wird NICHT mehr hier über einen eigenen Timer gespielt (das driftete gegen die Animation, v. a.
      // im zweiten Durchlauf). Stattdessen spielt PrunkFx den Bass EXAKT beim Mounten/Start seiner Canvas-Animation
      // (trigger.rate trägt das Turbo-Tempo hinein) → Bass und Effekt fallen jeden Stich sicher zusammen.
      const pRate = Math.min(CARDFLIP_RATE_CAP, Math.max(1, CARDFLIP_RATE_REF / flipMs));
      // #: Gottgleich-Prunk ist EXKLUSIV — es feuert immer nur EIN Overlay (auch wenn ein Altstand mehrere Flags true
      // hat). Fester Vorrang: Prisma > Goldregen > Feuerwerk. (Die Shop-Auswahl schreibt ohnehin nur eins.)
      const pWin = fxPrismaWave ? "prismaWave" : fxGoldRain ? "goldRain" : "fireworks";
      const pt = setTimeout(() => {
        prunkSeq.current += 1;
        setPrunk({ id: prunkSeq.current, fireworks: pWin === "fireworks", goldRain: pWin === "goldRain", prismaWave: pWin === "prismaWave", rate: pRate });
      }, sRest);
      ghostTimers.current.push(pt);
    }
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
    if (t && win && !reduced) {
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
  // Shake-Parameter je Stufe (leicht → stark). Amplitude als CSS-Var ans Panel; Keyframe-Name wechselt je Sieg (a/b).
  const shakeAmp  = screenFx ? [0, 3, 6, 9, 13][screenFx.tier] : 0;
  const shakeDur  = screenFx ? 160 + screenFx.tier * 50 : 0;
  const shakeName = screenFx ? (screenFx.n % 2 ? "as-crit-shake-a" : "as-crit-shake-b") : undefined;

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
  const panelBorder = "1px solid #2c2a3a";
  const outerParts = [];
  // #192: der Screen-Shake eines großen NORMALEN Siegs bekommt eine dezente grün/gold Panel-Aura (Sieg-Identität,
  // WIN_TIER_COLORS), damit die „grün/gold"-Wirkung sichtbar ist, ohne Flash/Vignette (die Crit-exklusiv bleiben).
  // Nur bei normalem Sieg (kein Crit) → der Crit-Look bleibt unverändert. Stärke wächst BRUTAL→GOTTGLEICH.
  if (screenFx && !screenFx.isCrit) {
    const gi = clamp((screenFx.tier - 2) / 2, 0, 1); // BRUTAL 0 · IRRE 0,5 · GOTTGLEICH 1
    outerParts.push(`0 0 ${Math.round(30 + 26 * gi)}px ${Math.round(5 + 6 * gi)}px ${screenFx.color}${gi > 0.5 ? "66" : "4d"}`);
  }
  const outerGlow = outerParts.length ? outerParts.join(", ") : undefined;

  return (
   <>
    <div ref={panelRef} className="rounded-xl p-6 overflow-hidden as-panel relative"
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
      {/* #306 Battlefield-Ambiente (einfach-exklusiv): genau EIN Feld-Effekt (Hologrid/Sternenfeld/Aurora/Glutfunken/
          Datenregen/Scanline/Vignette) als z-1-Layer über dem BF-Bild, hinter Glut/Frost/Blitz (z-0/2) & Karten (z-10),
          immer in der Deck-Hauptfarbe. Ambiente läuft ruhig; die Reaktion je Stich (sweepId, Turbo-Throttle) läuft voll
          durch. reduced-motion → nur das statische Ambiente (kein Springen). */}
      {fxField && deckA1 && (
        <FieldFxLayer effect={fxField} color={deckA1} color2={deckA2} sweepId={sweepId} sweepDur={sweepDur} reduced={reduced} win={win}
          score={fxField === "embers" ? Math.round((score || 0) / 20000) * 20000 : 0} />
      )}
      {/* Archetyp-Ambiente (Feuer-Glut / Blitz-Glow / ⚡) ist entfernt → wandert in die Fraktions-Panels
          (HeatBar/ChargeBar). Das Battlefield bleibt für Deck-Skin, Hologrid und das Stich-Juice reserviert. */}
      {/* #: GOTTGLEICH-Krit-Partikel-Schwarm (BounceBurst) entfernt — Krit-Finisher-Animationen raus. */}
      {/* #294 Gottgleich OHNE Krit: kaufbare Prunk-Overlays (Feuerwerk/Goldregen/Prisma-Welle), stapelbar. */}
      <PrunkFx trigger={prunk} panelRef={panelRef} oppRef={oppSlotRef} color={deckA1} />
      {/* #296 Schwarzes Loch (Serien-Wachstum): persistentes Panel-Loch, wächst mit t.winStreak, saugt jede weitere
          Gegnerkarte (Puls) ein, Orbs auf wachsendem Bahnradius, Kollaps beim Serienabbruch. Turbo-Tempo via fxScale. */}
      <BlackholeFieldFx active={holeActive} pulse={holePulse}
        color={deckA1 || "#35e0ff"} scale={fxScale} panelRef={panelRef} oppRef={oppSlotRef} reduced={reduced} />
      {/* #295 Brennstrahl (persistent): Strahl bleibt über die Serie lit, zieht sich beim Serienabbruch zurück; der
          Einschlag je Sieg (Loch/Funken/Verblassen) kommt vom Per-Sieg-Burst (SlashGhostLayer). */}
      <BurnBeamPersist active={burnActive} pulse={burnPulse}
        color={deckA1 || "#ff9a3f"} scale={fxScale} flipMs={flipMs} panelRef={panelRef} oppRef={oppSlotRef} reduced={reduced} />
      <div className="relative z-10 flex items-center justify-center gap-4 sm:gap-8">
        {/* KRITISCH-Text (#33) — bei reduzierter Bewegung statisch „… ×N". */}
        {isCrit && (
          <div key={`krit${t.trickNo}`} className="pointer-events-none absolute font-extrabold whitespace-nowrap z-10"
            style={{ left: `calc(${FLOAT_ZONES.crit.left} + ${fjitter(t.trickNo * 5 + 2, JITTER_X)}px)`,
                     top:  `calc(${FLOAT_ZONES.crit.top} + ${fjitter(t.trickNo * 5 + 9, JITTER_Y)}px)`,
                     fontSize: 26, color: critColor, textTransform: "uppercase", // Loc: Caps via CSS
                     ...floatNumStyle(critColor, 1.5), textShadow: `0 0 12px ${critColor}aa`, // #: Kartennummern-Stil (Kontur), stärkerer Krit-Glow
                     transform: reduced ? "translateX(-50%)" : undefined,
                     animation: fx(`as-krit ${clamp(flipMs * 0.8, 400, 900) + 1000}ms ease-out forwards`) }}>
            {reduced ? `Kritisch ×${critMultStr}` : "Kritisch!"}
          </div>
        )}

        <Side label="Du" remaining={remaining} position={deckPos} deckLen={deckLen} dealFrom="left" backImage={deckBack}
              overlay={playerGhosts.length ? <SlashGhostLayer ghosts={playerGhosts} /> : null}>{playerCard}</Side>

        {/* #214: „vs"-Schwerter-Icon (#42) entfernt — die beiden Seiten stehen sich jetzt ohne Trenn-Icon gegenüber. */}

        <div ref={oppSlotRef} className="flex">
          <Side label="Gegner" remaining={remaining} position={deckPos} deckLen={deckLen} dealFrom="right" backImage={oppBackImg}
                overlay={oppGhosts.length ? <SlashGhostLayer ghosts={oppGhosts} panelRef={panelRef} /> : null}>{oppCard}</Side>
        </div>

        {/* Aufsteigende Zahlen (#49/#68): je Typ eigene Streuzone (Score links / Leben rechts) mit
            kleinem, deterministischem Jitter aus trickNo → gleiche Typen dicht, verschiedene getrennt,
            aufeinanderfolgende überlappen nur leicht statt exakt zu stapeln. Pool gedeckelt. */}
        {floats.map((f) => {
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
            (klingt über FORM_LINGER_MS aus) → bleibt so ~1,5 s länger stehen als sein Stich. */}
        {formFloat && (
          <div key={`form${formFloat.key}`} className="pointer-events-none absolute font-extrabold whitespace-nowrap z-10"
            style={{ right: `calc(${FLOAT_ZONES.formation.right} + ${fjitter(formFloat.key * 4 + 5, JITTER_X)}px)`,
                     top:  `calc(${FLOAT_ZONES.formation.top} + ${fjitter(formFloat.key * 4 + 11, JITTER_Y)}px)`,
                     fontSize: formFloat.peak === 2 ? 26 : formFloat.peak === 1 ? 21 : 17,
                     textTransform: "uppercase", // Loc: Formations-Label-Caps via CSS
                     color: formFloat.color,
                     ...floatNumStyle(formFloat.color, formFloat.peak === 2 ? 1.6 : 1.4), // #: Kartennummern-Stil (Kontur)
                     textShadow: `0 0 ${formFloat.peak === 2 ? 16 : formFloat.peak === 1 ? 12 : 10}px ${formFloat.color}${formFloat.peak ? "cc" : "88"}`,
                     animation: fx(formLeaving
                       ? `as-combo-out ${FORM_LINGER_MS}ms ease-out forwards`
                       : `as-combo-hold ${floatDur}ms ease-out forwards`) }}>
            {formFloat.peak === 2 && "★ "}{formFloat.label} ×{formFloat.mult}
          </div>
        )}
        {/* #105/#169 FB-7 / #FB: Gestufte Groß-Score-Ansage — dominiert Peak-Momente: oberste Ebene (z-30, über allen
            Floats), zentriert mit Spur-Versatz (BIG_LANES, gegen Überlappung), Größe je Stufe (clamp deckelt mobil gegen
            Überlauf), Legendär-Gold. Aus dem entkoppelten Pool → volle Standzeit auch bei 4×/MAX. */}
        {bigFloats.map((b) => (
          b.tier.epic ? (
            /* GOTTGLEICH — Sonder-Ansage: als SVG skaliert das Wort exakt auf ~70 % der Panelbreite (textLength),
               echt mittig (H+V, kein Spur-/Jitter-Versatz), in Weiß mit weißem Bloom → hebt sich klar von den
               goldenen Stufen darunter ab. Gleiche Standzeit/Animation wie die anderen Groß-Ansagen. */
            <svg key={b.id} aria-hidden="true" className="pointer-events-none absolute" viewBox="0 0 1000 210" preserveAspectRatio="xMidYMid meet"
              style={{ left: "50%", top: "50%", width: "70%", zIndex: 31,
                       filter: b.tier.color
                         ? `drop-shadow(0 0 32px ${b.tier.color}) drop-shadow(0 0 12px ${b.tier.color}) drop-shadow(0 3px 8px rgba(0,0,0,0.55))`
                         : "drop-shadow(0 0 32px rgba(255,255,255,0.9)) drop-shadow(0 0 12px rgba(255,255,255,0.7)) drop-shadow(0 3px 8px rgba(0,0,0,0.55))",
                       transform: reduced ? "translate(-50%, -50%)" : undefined,
                       animation: fx(`as-bigscore ${BIG_ANNOUNCE_MS}ms ease-out forwards`) }}>
              <text x="500" y="170" textAnchor="middle" textLength="984" lengthAdjust="spacingAndGlyphs"
                style={{ fontSize: "200px", fontWeight: 900, fill: b.tier.color || "#ffffff", letterSpacing: "1px" }}>
                {b.tier.text.toUpperCase()}
              </text>
            </svg>
          ) : (
          <div key={b.id} className="pointer-events-none absolute font-extrabold whitespace-nowrap"
            style={{ left: `calc(50% + ${fjitter(b.seed * 3 + 2, 12)}px)`, top: `calc(50% + ${b.lane}px)`, zIndex: 30,
                     textTransform: "uppercase", // Q2/Loc: Groß-Score-Ansage-Caps zentral über CSS (Übersetzer liefert STARK/BRUTAL/… normal geschrieben)
                     fontSize: `clamp(40px, 10vw, ${b.tier.size}px)`, color: "#d4a63a", textShadow: "0 0 34px #d4a63add, 0 0 12px #d4a63a, 0 2px 4px #0009",
                     transform: reduced ? "translate(-50%, -50%)" : undefined,
                     animation: fx(`as-bigscore ${BIG_ANNOUNCE_MS}ms ease-out forwards`) }}>
            {b.tier.text}
          </div>
          )
        ))}
      </div>

      <div className="relative z-10 h-8 mt-4 flex items-center justify-center">
        {banner ? (
          <span className="text-lg font-bold tracking-wide font-pixel as-banner" style={{ color: banner.color }}>{banner.text}</span>
        ) : (
          <span className="opacity-40 text-sm">Bereit — starte den Autobattler</span>
        )}
      </div>

      {/* Treffer-Aufschlüsselung (§17): Faktorenkette des letzten nennenswerten Siegs. Feste Höhe → kein Layout-Sprung. */}
      <div className="relative z-10 h-6 mt-1 flex items-center justify-center gap-2 text-[13px] flex-wrap font-pixel-dense">
        {showBreakdown && (
          <>
            {chain.map((s, i) => (
              <span key={i} className="whitespace-nowrap" style={{ color: s.c }}>
                <span className="font-semibold">{s.main}</span>
                <span className="opacity-45 ml-1">{s.label}</span>
              </span>
            ))}
            <span className="opacity-25">=</span>
            <span className="font-bold" style={{ color: isCrit ? critColor : "#e8e8ea" }}>{fmtScore(bd.total)}</span>
          </>
        )}
      </div>
    </div>
    {/* #: Krit-Vollbild-Flash/Vignette (CritScreenFx) entfernt — Krit-Finisher-Animationen raus. Der Screen-Shake bleibt
        (für große Siege, gemeinsam mit normalen Siegen); die „Kritisch!"-Anzeige + Lila bleiben unverändert. */}
   </>
  );
}
