import { useState, useEffect, useRef } from "react";
import { Card, CardBack } from "./Card.jsx";
import { clamp } from "../game/deck.js";
import { TRICKS_PER_CYCLE, suitColor, AUSLAEUFER_HARVEST } from "../game/constants.js";
import { linkedPartnerOf } from "../game/shop.js";
import { formationBorder } from "./formationStyle.js";
import { formationLabel } from "./formationLabels.js";
import { audio } from "./audio.js";
import { useReducedFx } from "./useReducedFx.js";
import { fmtScore } from "./format.js";
import glacierIcon from "./assets/glacier.webp"; // Eis-Treffer-Identität: das echte Gletscher-Asset im Score-Float
import cardBackImg  from "../assets/cards/card-back.png";  // (#180) Spieler-Deck: Schwerter-Rücken
import cardFrontImg from "../assets/cards/card-front.png"; // (#180) Spieler-Deck: Rahmen-Front (Zahl/Effekte darüber)
// (#186/#214) Gegner-Deck: je Auswahl-Typ ein eigenes Deck (Cover = Rücken, Front = Rahmen). Der Gegner spielt jede
// Runde das Deck der KOMMENDEN Auswahl (DECISION_SCHEDULE) — die App reicht den Typ als `oppDeck` durch. #214: die
// Gegner-Decks tragen jetzt die Archetyp-Motive (dieselbe Kunst wie die Spieler-Challenge-Decks #215, deck_c5–c9).
import c5Front from "../assets/cards/decks_player/deck_c5/front.png"; // 🔥 Feuer  → stat
import c5Back  from "../assets/cards/decks_player/deck_c5/back.png";
import c6Front from "../assets/cards/decks_player/deck_c6/front.png"; // ⚡ Blitz  → shop/architekt
import c6Back  from "../assets/cards/decks_player/deck_c6/back.png";
import c7Front from "../assets/cards/decks_player/deck_c7/front.png"; // ❄️ Eis    → perk
import c7Back  from "../assets/cards/decks_player/deck_c7/back.png";
import c8Front from "../assets/cards/decks_player/deck_c8/front.png"; // 🌱 Pflanze → formation
import c8Back  from "../assets/cards/decks_player/deck_c8/back.png";
import c9Front from "../assets/cards/decks_player/deck_c9/front.png"; // 🎴 Mix    → skill
import c9Back  from "../assets/cards/decks_player/deck_c9/back.png";

// Auswahl-Typ → Gegner-Deck-Skin (Cover/Front) auf Archetyp-Motiv (#214). Fällt auf „stat" (Feuer) zurück.
const OPP_DECK_SKINS = {
  stat:      { back: c5Back, front: c5Front }, // Feuer
  perk:      { back: c7Back, front: c7Front }, // Eis
  skill:     { back: c9Back, front: c9Front }, // Mix / Element-Bund
  shop:      { back: c6Back, front: c6Front }, // Blitz (Auswahl-Typ „shop" = Architekt-Phase, #202)
  formation: { back: c8Back, front: c8Front }, // Pflanze
};

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
const HIT_STYLE = {
  fire:      { color: "#e0714a", icon: "🔥" },
  plant:     { color: "#5ab87a", icon: "🌿" },
  ice:       { color: "#5ec8f0", icon: "img" }, // Eis nutzt das echte Gletscher-Asset (glacier.webp) statt eines Emojis
  lightning: { color: CRIT_COLOR, icon: "⚡" },
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
const FORM_LINGER_MS = 1500; // Formations-Float bleibt ~1,5 s länger stehen (über den nächsten Stich hinaus) und klingt dann aus
// Entzerrung bei Ballung: spät in einem guten Lauf spannen die Stich-Gewinne mehrere Größenordnungen
// (ein Stich +5 Mio, der nächste +8.000) → die kleinen Score-Floats sind nur Rauschen und überlappen alles.
// Regel: NUR wenn viele Floats gleichzeitig leben („zu voll") UND ein Gewinn winzig gegenüber dem laufenden
// Größenmaßstab ist, wird sein Float unterdrückt. Der Score selbst zählt unverändert weiter — nur das Popup entfällt.
const FLOAT_DECLUTTER_MIN = 3;    // erst ab so vielen aktiven Score-Floats wird ausgedünnt
const FLOAT_MIN_RATIO     = 0.08; // Float nur zeigen, wenn Gewinn ≥ 8 % des laufenden Maßstabs
const FLOAT_SCALE_DECAY   = 0.9;  // Maßstab = max(Gewinn, Maßstab·DECAY) → folgt der jüngsten Größenordnung, vergisst Einmal-Spitzen langsam
// #110: Karten-Aufdeck-Sound — DEZENTE Turbo-Kopplung der Abspielrate (leicht justierbar). Rate>1 = kürzer/schneller.
const CARDFLIP_RATE_REF = 700;  // ms-Referenz: unter diesem Stich-Takt wird der Sound schneller (bei ~1× bleibt Rate 1)
const CARDFLIP_RATE_CAP = 1.6;  // Deckel bewusst niedrig → bei MAX-Turbo bleibt ein leichtes Überlappen („MG"), wie gewünscht
// Ergebnisabhängige Flip-Lautstärke (tunable): Sieg laut & erkennbar, Niederlage deutlich leiser → klarer
// hörbarer Kontrast Sieg↔Niederlage. Effektiv = Gain × SFX-Lautstärke (Default 0,4 → Sieg 0,6 · Niederlage 0,08).
const CARDFLIP_GAIN = { win: 1.5, win_tie: 1.5, tie: 0.6, loss: 0.2 };
// Deterministischer Jitter aus einem Integer-Seed (kein Math.random im Render, #68) → [-amp, +amp].
const fjitter = (seed, amp) => { const s = Math.sin(seed * 127.1 + 311.7) * 43758.5; return +(((s - Math.floor(s)) * 2 - 1) * amp).toFixed(1); };

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

/* #180 Flip-Reveal: die aufgedeckte Spielerkarte dreht sich aus dem Deck-Rücken (Schwerter) in die Front
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
function SliceFx({ cardEl, color, halvesDur, cutDur, sparkDur, seed, delay = 0, intensity = 0, tier = 0, scale = 1 }) {
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

/* Krit-Partikelexplosion (statt Klingenschnitt): dieselbe Funken-DNA wie SliceFx (deterministischer Kranz aus
   `seed`, ~40 % weiß / Rest Farbe, ein paar Konfetti), nur größer & runder — kein Schnitt, sondern die Karte
   „berstet": ein heller Zentral-Flash blitzt auf, ein Schockwellen-Ring dehnt sich, die Karte skaliert kurz auf,
   überstrahlt und zerstiebt, während ~28 Partikel radial nach außen schießen. Farbe = Crit-Lila (passt zum
   KRITISCH-Text & Crit-Puls). Alle Dauern kommen an den Flip-Takt gekoppelt rein → kein Überlaufen. */
function ExplosionFx({ cardEl, color, cardDur, burstDur, flashDur, seed, delay = 0, intensity = 0, tier = 0, scale = 1 }) {
  // Die Krit-Karte zerbirst in ein Raster kleiner PIXEL-SHARDS (clip-path-Klone der Karte): jedes Fragment fliegt
  // radial nach außen, tumbelt (rotate) & fadet — die Karte „zerplatzt in Pixel". Deterministisch aus `seed` (kein
  // Math.random, #68). Bis 0%/9% halten die Shards (fill-mode both + delay) den Ganz-Zustand → Karte liegt erst.
  // #188: score-skaliert. Kontinuierlich: Blast-Radius, Partikelzahl, Dauer. Unlocks je Stufe: 1/2/3 Schockwellen-
  // Ringe + Farb-Shift Lila→Weißgold (CRIT_TIER_COLORS). Shard-Zahl bleibt ~konstant (Wumms kommt aus Radius/Ringen/
  // Farbe/Dauer, nicht aus mehr Slivern). Screen-Effekte (Shake/Flash/Slow-Mo) folgen in v2 (Crit-only).
  const shardMul = 1 + intensity * 0.6;   // Shards fliegen weiter (gedeckelt, sonst überm Panel)
  const radMul   = 1 + intensity;         // Partikel/Flash/Ring: 1..2
  const durMul   = 1 + intensity * 0.3;   // längeres Nachhängen bei großen Treffern (+0..30 %)
  const cd = cardDur * durMul, bd = burstDur * durMul;
  const amp = CRIT_TIER_COLORS[tier] || color;         // Farbe je Stufe (Lila → Weißgold)
  const ringCount = tier >= 4 ? 3 : tier >= 2 ? 2 : 1; // BRUTAL: 2 · GOTTGLEICH: 3
  const fsz = 26 * (1 + intensity * 0.6);              // Flash-Kerngröße
  const ROWS = 7, COLS = 5; // 35 Fragmente → „kleine Pixel"
  const shards = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const i = r * COLS + c;
      const dirX = (c + 0.5) / COLS - 0.5; // −0.5..0.5: Zellmitte relativ zur Kartenmitte (Ecken fliegen weiter)
      const dirY = (r + 0.5) / ROWS - 0.5;
      const spread = (150 + Math.abs(fjitter(seed * 5 + i * 13, 70))) * shardMul; // Streuweite × Intensität
      shards.push({
        i,
        // clip-path inset(top right bottom left) blendet die Karte auf DIESE Rasterzelle aus (Klon zeigt nur sein Stück).
        clip: `inset(${(r / ROWS * 100).toFixed(2)}% ${((COLS - 1 - c) / COLS * 100).toFixed(2)}% ${((ROWS - 1 - r) / ROWS * 100).toFixed(2)}% ${(c / COLS * 100).toFixed(2)}%)`,
        sx: (dirX * spread + fjitter(seed * 3 + i * 7, 24)).toFixed(1),
        sy: (dirY * spread + fjitter(seed * 2 + i * 11, 24) + 22).toFixed(1), // + leichte Schwerkraft nach unten
        sr: fjitter(seed * 7 + i * 5, 70).toFixed(1),
      });
    }
  }
  const N = Math.max(8, Math.round((20 + intensity * 24) * scale)); // 20..44 lose Partikel, turbo-ausgedünnt (#200 A, Boden 8; das Shard-Raster 7×5 bleibt voll)
  const parts = Array.from({ length: N }, (_, i) => {
    const ang = (i / N) * Math.PI * 2 + fjitter(seed * 3 + i * 7, 0.45);  // gleichmäßiger Kranz + Jitter
    const rad = (62 + Math.abs(fjitter(seed * 5 + i * 13, 92))) * radMul; // 62..154 px × Intensität
    return {
      i,
      dx: (Math.cos(ang) * rad).toFixed(1),
      dy: (Math.sin(ang) * rad).toFixed(1),
      sz: (3 + Math.abs(fjitter(seed * 7 + i * 5, 4))).toFixed(1),        // 3..7 px, gemischte Größen
      white: i % 5 < 2,         // ~40 % weiß, Rest Crit-/Stufen-Farbe
      confetti: i % 5 === 0,    // ~4 kleine Konfetti-Rechtecke
    };
  });
  const ease = "cubic-bezier(0.2, 0.7, 0.2, 1)";
  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
      {/* Pixel-Shards: 35 clip-path-Fragmente der Karte, die nach dem Ruhe-Beat (delay) nach außen bersten. */}
      {shards.map((s) => (
        <div key={`sh${s.i}`} className="absolute inset-0" style={{
          clipPath: s.clip,
          "--sx": `${s.sx}px`, "--sy": `${s.sy}px`, "--sr": `${s.sr}deg`,
          animation: `as-boom-shard ${cd}ms ${ease} ${delay}ms both`, willChange: "transform, opacity",
        }}>{cardEl}</div>
      ))}
      {/* Zentral-Flash: heller Kern (weiß → Stufen-Farbe), dehnt sich und fadet. */}
      <div style={{ position: "absolute", left: "50%", top: "50%", width: fsz, height: fsz, marginLeft: -fsz / 2, marginTop: -fsz / 2,
        borderRadius: "50%", background: `radial-gradient(circle, #ffffff 0%, ${amp} 46%, transparent 72%)`,
        animation: `as-boom-flash ${flashDur}ms ease-out ${delay}ms both`, willChange: "transform, opacity" }} />
      {/* Schockwellen-Ringe: 1–3 dünne, glühende Ringe wachsen nach außen (gestaffelt je Stufe). */}
      {Array.from({ length: ringCount }, (_, k) => k).map((k) => (
        <div key={`rg${k}`} style={{ position: "absolute", left: "50%", top: "50%", width: 30, height: 30, marginLeft: -15, marginTop: -15,
          borderRadius: "50%", border: `2px solid ${amp}`, boxShadow: `0 0 10px ${amp}, 0 0 4px #fff inset`,
          animation: `as-boom-ring ${bd}ms ease-out ${delay + k * 90}ms both`, willChange: "transform, opacity" }} />
      ))}
      {/* Lose Partikel aus dem Zentrum (zusätzlich zu den Karten-Shards). */}
      {parts.map((s) => (
        <div key={`pt${s.i}`} style={{
          position: "absolute", left: "50%", top: "50%",
          width: s.confetti ? +(s.sz) + 2 : +s.sz, height: s.confetti ? (+s.sz + 2) / 2 : +s.sz,
          borderRadius: s.confetti ? 1 : "50%",
          background: s.white ? "#ffffff" : amp, boxShadow: `0 0 6px ${s.white ? "#ffffff" : amp}`,
          "--dx": `${s.dx}px`, "--dy": `${s.dy}px`,
          animation: `as-spark ${bd}ms ease-out ${delay}ms both`, willChange: "transform, opacity",
        }} />
      ))}
    </div>
  );
}

/* GOTTGLEICH-Prunk: bei der obersten Krit-Stufe (tier 4) berstet die Karte — zusätzlich zu ExplosionFx — in einen
   dichten Schwarm deckkräftiger Weißgold-Partikel, die vom Panel-RAHMEN nach innen ABPRALLEN und hin- und herspringen
   (Flipper-Look). Reine Kosmetik auf einem <canvas> über dem Feld: rAF-Physik mit Geschwindigkeit, Wand-Reflexion
   (Restitution), leichtem Drag & Schwerkraft. Nur die oberste Stufe → bleibt selten & besonders; bei reduzierter
   Bewegung wird gar nicht erst getriggert. Bounds = das Battlefield-Panel (panelRef); Ursprung = Mitte der zerstörten
   Gegnerkarte (oppRef), sonst rechte Feldhälfte. */
function BounceBurst({ trigger, panelRef, oppRef }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (!trigger || !panelRef?.current || !canvasRef.current) return undefined;
    const panel = panelRef.current, canvas = canvasRef.current;
    const pr = panel.getBoundingClientRect();
    const W = pr.width, H = pr.height;
    if (W < 4 || H < 4) return undefined;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    canvas.style.width = `${W}px`; canvas.style.height = `${H}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;
    ctx.scale(dpr, dpr);
    // Ursprung = Mitte der Gegnerkarte (die zerstörte) in Panel-Koordinaten; Fallback: rechte Feldhälfte.
    let ox = W * 0.68, oy = H * 0.42;
    const orr = oppRef?.current?.getBoundingClientRect();
    if (orr && orr.width) { ox = orr.left - pr.left + orr.width / 2; oy = orr.top - pr.top + orr.height / 2; }
    const PAL = ["#fff0b0", "#ffd873", "#ffffff", "#ffc978"]; // Weißgold-Palette (GOTTGLEICH)
    const N = 96; // „mehr Partikel"
    const parts = [];
    for (let i = 0; i < N; i++) {
      const ang = Math.random() * Math.PI * 2;
      const spd = 3.5 + Math.random() * 9.5;
      parts.push({ x: ox, y: oy, vx: Math.cos(ang) * spd, vy: Math.sin(ang) * spd - 3.5,
                   r: 1.8 + Math.random() * 3.2, c: PAL[i % PAL.length] });
    }
    const REST = 0.82, DRAG = 0.992, G = 0.16, TTL = 1650, FADE = 0.28; // spät & kurz ausfaden → „weniger transparent"
    let raf = 0, start = 0;
    const step = (now) => {
      if (!start) start = now;
      const k = (now - start) / TTL;
      ctx.clearRect(0, 0, W, H);
      const alpha = k > 1 - FADE ? Math.max(0, (1 - k) / FADE) : 1;
      ctx.globalAlpha = alpha;
      for (const p of parts) {
        p.vy += G; p.vx *= DRAG; p.vy *= DRAG;
        p.x += p.vx; p.y += p.vy;
        if (p.x < p.r) { p.x = p.r; p.vx = -p.vx * REST; }
        else if (p.x > W - p.r) { p.x = W - p.r; p.vx = -p.vx * REST; }
        if (p.y < p.r) { p.y = p.r; p.vy = -p.vy * REST; }
        else if (p.y > H - p.r) { p.y = H - p.r; p.vy = -p.vy * REST; }
        ctx.fillStyle = p.c;
        ctx.shadowBlur = 8; ctx.shadowColor = p.c;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
      if (k < 1) raf = requestAnimationFrame(step);
      else { ctx.globalAlpha = 1; ctx.clearRect(0, 0, W, H); }
    };
    raf = requestAnimationFrame(step);
    return () => { cancelAnimationFrame(raf); ctx.clearRect(0, 0, W, H); };
  }, [trigger?.id, panelRef, oppRef]);
  return <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none rounded-xl" style={{ zIndex: 20 }} aria-hidden="true" />;
}

/* #177+/#186: Schnitt-/Explosions-Ghost-Pool für BEIDE Seiten. Verliert eine Karte (Spieler bei Niederlage,
   Gegner bei Sieg), wird sie in-place ausgeblendet und stattdessen ein entkoppelter Klon in diesem Layer
   (im jeweiligen Karten-Slot, absolute inset-0) gerendert: die Karte liegt erst kurz (rest), dann setzt der Schnitt
   bzw. die Pixel-Explosion IN PLACE ein, und DANACH floatet der Ghost weg (as-loss-drift-rand, #187: zufällige
   Richtung rundum, deterministisch aus seed; nur beim Slice — die Explosion zerbirst an Ort und Stelle). Weil der
   Pool NICHT pro Stich remountet, floatet der Ghost in voller Länge aus und überlappt bei hohem Turbo/vielen Siegen
   mit dem nächsten Stich — Spieler- UND Gegnerkarte fühlen sich damit gleich lang an (#186). Ghosts entfernen sich
   nach ihrer Lebensdauer selbst. */
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
        // Reihenfolge (Wunsch): Karte liegt (rest) → Slice/Explosion IN PLACE (delay = g.rest) → DANACH floatet der
        // Ghost weg. #187: Slice driftet nach dem SCHNITT (driftDelay = rest + cut) in eine ZUFÄLLIGE Richtung
        // (rundum, deterministisch aus g.seed via fjitter, kein Neu-Würfeln bei Re-Render). Die Krit-Explosion
        // zerbirst an Ort und Stelle in Pixel-Shards (die Shards fliegen selbst nach außen) → kein Wrapper-Drift.
        const isBoom = g.fx === "explode";
        const dang = fjitter(g.seed * 3 + 2, Math.PI);                        // −π..π → volle 360° rundum
        const drad = isBoom ? 0 : 40 + Math.abs(fjitter(g.seed * 5 + 3, 26)); // Slice: 40..66 px Driftweite; Explosion: kein Drift
        const drot = isBoom ? 0 : fjitter(g.seed * 7 + 5, 8);                 // −8..8° leichte Rotation (nur Slice)
        const driftDelay = g.rest + (isBoom ? 0 : g.cut);                     // Float-Away startet NACH dem Schnitt
        return (
          <div key={g.id} className="absolute inset-0 pointer-events-none" aria-hidden="true"
            style={{ animation: `as-loss-drift-rand ${g.float}ms cubic-bezier(0.2, 0.6, 0.3, 1) ${driftDelay}ms forwards`, willChange: "transform",
                     "--drx": `${(Math.cos(dang) * drad).toFixed(1)}px`, "--dry": `${(Math.sin(dang) * drad).toFixed(1)}px`, "--drot": `${drot}deg` }}>
            {isBoom
              ? <ExplosionFx cardEl={cardEl} color={g.color} cardDur={g.halves} burstDur={g.spark} flashDur={g.boom} seed={g.seed} delay={g.rest} intensity={g.fxP} tier={g.fxTier} scale={g.scale} />
              : <SliceFx cardEl={cardEl} color={g.color} halvesDur={g.halves} cutDur={g.cut} sparkDur={g.spark} seed={g.seed} delay={g.rest} intensity={g.fxP} tier={g.fxTier} scale={g.scale} />}
          </div>
        );
      })}
    </>
  );
}

/* #188 v2: Vollbild-Screen-Effekte bei großem Krit-Sieg (Crit-only). FIXED → viewport-weit; MUSS außerhalb des
   shake-Panels liegen (ein Transform-Vorfahre würde `fixed` relativ zum Panel positionieren und mit-verschieben).
   Vollbild-Flash ab IRRE (tier≥3), Vignette ab GOTTGLEICH (tier≥4). pointer-events-none, aria-hidden. Nur bei
   normaler Bewegung gerendert (Aufrufer prüft `reduced`). */
function CritScreenFx({ tier, color }) {
  const flash = tier >= 3, vignette = tier >= 4;
  const flashMax = tier >= 4 ? 0.42 : 0.28;
  return (
    <>
      {flash && (
        <div aria-hidden="true" className="fixed inset-0 pointer-events-none" style={{ zIndex: 30,
          background: color, mixBlendMode: "screen", "--flash-max": flashMax, animation: "as-crit-flash 360ms ease-out both" }} />
      )}
      {vignette && (
        <div aria-hidden="true" className="fixed inset-0 pointer-events-none" style={{ zIndex: 30,
          background: `radial-gradient(120% 100% at 50% 50%, transparent 50%, ${color}55 100%)`, animation: "as-crit-vignette 520ms ease-out both" }} />
      )}
    </>
  );
}

export function Battlefield({ lastTrick, remaining = TRICKS_PER_CYCLE, deckLen = TRICKS_PER_CYCLE, flipMs = 1000, pe = {}, heat = null, lightning = null, oppDeck = "stat",
  // Feuer-Rework (#206): geschmiedete Dauerwerte (eigene Karten) + aktive Brandmarken (Gegnerkarten) für die Karten-Indikatoren.
  forged = {}, brandActive = {},
  // Pflanze-Rework (#211): Wachstum je eigener Karte-id (Wachstumsring + grüne Zahl) + kolonisierte Gegnerkarten (Ausläufer-Marker).
  growth = {}, colonized = {},
  // #190 Kosmetik: gewähltes Spieler-Deck (front=Rahmen, back=Cover) + Battlefield-Skin ({desktop,mobile}|null).
  // Defaults = bestehende Karten → ohne Auswahl identisches Verhalten (Gegner-Deck bleibt OPP_DECK_SKINS).
  deckFront = cardFrontImg, deckBack = cardBackImg, battlefield = null,
  // #200 B: „Effekte reduziert" (auto|an|aus). Löst zusammen mit prefers-reduced-motion/Mobile den `reduced`-Modus aus.
  reducedFx = "auto" }) {
  const reduced = useReducedFx(reducedFx);
  // GOTTGLEICH-Prunk: Panel = Prallwand-Rahmen, oppSlot = Ursprung (zerstörte Gegnerkarte); burst triggert den Schwarm.
  const panelRef = useRef(null);
  const oppSlotRef = useRef(null);
  const [burst, setBurst] = useState(null);
  const burstSeq = useRef(0);
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
  // #135: Ergebnis-Puls-Dauer an den Flip-Takt gekoppelt (wie die übrigen „Juice"-Animationen).
  const pulseDur = clamp(flipMs * 0.7, 300, 700);
  const fx = (a) => (reduced ? undefined : a);
  // #200 A — Effekt-Budget: je schneller der Takt, desto weniger lose Partikel/Funken und desto flacher der Ghost-Pool.
  // flipMs ≥ 2× (875) = voll; 4× (~437) ≈ 0,5; MAX (~291) = Boden 0,45. Rein visuell (score-neutral wie der Turbo).
  const fxScale  = clamp(flipMs / 875, 0.45, 1);
  const ghostCap = Math.max(2, Math.round(6 * fxScale)); // gleichzeitige Schnitt-/Explosions-Ghosts (ältester wird recycelt)
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
  const sFloat   = clamp(flipMs * 0.55, 220, 820);   // Float-Away NACH dem Slice: Ghost driftet in Zufallsrichtung (#187)
  // Suit-Farbe der GESCHNITTENEN (Verlierer-)Karte → Schnittlinie + Funken. Sieg: Gegnerkarte · Niederlage: Spielerkarte.
  const loserColor = sliceOn ? suitColor(win ? t.oCard.suit : t.pCard.suit) : null;
  // Sieg: Gegnerkarte wird in-place geschnitten, Spielerkarte kippt an. Niederlage: Spielerkarte wird NICHT in-place
  // geschnitten, sondern als entkoppelter Ghost (floaten → schneiden, überlappt bei Turbo, s. slashGhosts unten) —
  // in-place bleibt sie nur unsichtbarer Platzhalter; Gegnerkarte (Sieger) kippt an.
  const lossGhost    = sliceOn && lost;            // Spielerkarte verliert → entkoppelter Drift-+-Slice-Ghost
  const critBoom     = sliceOn && win && isCrit;   // Krit-Sieg → Gegnerkarte explodiert (statt Schnitt)
  const oppSliced    = sliceOn && win && !isCrit;  // normaler Sieg → Gegnerkarte in-place geschnitten
  const playerWinner = sliceOn && win;    // Spielerkarte gewinnt → kippt an
  const oppWinner    = sliceOn && lost;   // Gegnerkarte gewinnt → kippt an
  const winnerTilt = (dur) => ({ animation: `as-slice-winner ${dur}ms ease-out`, willChange: "transform" });
  // #180 Flip-Reveal der Spielerkarte: nur bei normaler Bewegung, echtem Stich, nicht bei der Niederlage
  // (dort übernimmt der entkoppelte Slice-Ghost) und nicht bei sehr hohem Turbo. Dauer an den Flip-Takt gekoppelt.
  const flipOn = !reduced && !!t && !lossGhost && flipMs > 170;
  // #186 Flip-Reveal der Gegnerkarte: analog zur Spielerkarte, aber NICHT wenn die Gegnerkarte gerade geschnitten
  // wird/explodiert (dort übernimmt der entkoppelte Ghost). Bei Gegner-Sieg (oppWinner) darf sie flippen + ankippen.
  const oppFlipOn = !reduced && !!t && !(oppSliced || critBoom) && flipMs > 170;
  const flipDur = clamp(flipMs * 0.55, 220, 460);

  // Kartenelemente einmal bauen — als sichtbare Karte, als (unsichtbarer) Größen-Platzhalter unter dem Slice und
  // als Klon-Quelle in SliceFx wiederverwendbar (Elemente sind unveränderliche Beschreibungen → mehrfach nutzbar).
  // #180: die Spielerkarte trägt den Skin-Front-Rahmen (Zahl/Effekte kommen darüber).
  const pCardEl = t && (
    <Card suit={t.pCard.suit} value={t.pCard.value} baseRank={t.pCard.baseRank}
          stichBonus={t.pValue - t.pCard.value} glow={win ? (isCrit ? critColor : "#5ab87a") : null}
          ionStacks={t.pCard.ionStacks || 0} green={!!t.pCard.green} forged={forged[t.pCard.id] || 0} growth={growth[t.pCard.id] || 0} allyColor={allyColorFor(t.pCard.suit)}
          frontImage={deckFront} />
  );
  // #186: die Gegnerkarte trägt den Skin-Front-Rahmen der kommenden Auswahl (Holo entfällt); Zahl/Effekte darüber.
  const oCardEl = t && (
    <Card suit={t.oCard.suit} value={t.oValue} baseRank={t.oCard.baseRank} glow={lost ? "#e0605a" : null}
          green={!!t.oCard.green} branded={brandActive[t.oCard.id] || 0} colonized={colonized[t.oCard.id] ? AUSLAEUFER_HARVEST : 0} allyColor={allyColorFor(t.oCard.suit)} frontImage={oppFrontImg} />
  );

  // Sieger kippt an (as-slice-winner); im Flip-Fall steckt die (evtl. gekippte) Karte als Front-Face im Flip.
  const playerFront = playerWinner ? <div style={winnerTilt(sWinner)}>{pCardEl}</div> : pCardEl;
  const playerCard = t ? (
    <div key={`p${t.trickNo}`} className="relative" style={(lossGhost || flipOn) ? undefined : dealStyle("as-deal-left")}>
      {resultPulse(win ? (isCrit ? critColor : "#5ab87a") : null, isCrit)}
      {lossGhost ? (
        <div style={{ opacity: 0 }} aria-hidden="true">{pCardEl}</div>   /* in-place unsichtbar — der entkoppelte Ghost (Side-overlay) floatet + schneidet */
      ) : flipOn ? (
        <FlipReveal front={playerFront} backImage={deckBack} dur={flipDur} />   /* #180: Rücken → Front */
      ) : playerFront}
    </div>
  ) : <div className="relative"><CardBack label="" image={deckBack} /></div>;

  // Sieger kippt an; im Flip-Fall steckt die (evtl. gekippte) Karte als Front-Face im Flip.
  const oppFront = oppWinner ? <div style={winnerTilt(sWinner)}>{oCardEl}</div> : oCardEl;
  const oppCard = t ? (
    <div key={`o${t.trickNo}`} className="relative" style={(oppSliced || critBoom || oppFlipOn) ? undefined : dealStyle("as-deal-right")}>
      {resultPulse(lost ? "#e0605a" : null, false)}
      {(oppSliced || critBoom) ? (
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
  const bigScore = baseBigTier && t && t.grosseLawine ? LAWINE_TIER : baseBigTier;

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
  useEffect(() => () => floatTimers.current.forEach(clearTimeout), []); // Timer bei Unmount aufräumen
  useEffect(() => {
    if (!t) { seenTrick.current = -1; floatScaleRef.current = 0; floatCountRef.current = 0; setFloats([]); return; } // Menü/neuer Lauf → Pool + Maßstab leeren
    if (t.trickNo === seenTrick.current) return;
    seenTrick.current = t.trickNo;
    // #110/#196: Karten-Aufdeck-Sound je Stich — startet zeitgleich mit der Flip-Animation (Ergebnis steht bei
    // RESOLVE_TRICK fest). Rate steigt dezent mit dem Turbo. #196: bei Sieg lauter (×1,2) + Bass-Anhebung, die mit
    // Crit und der Effekt-Stufe (fxIntensity, 0–4) wächst → der Klang zieht mit der visuellen Wucht mit;
    // Niederlage/Gleichstand bleiben unverändert (kein Bass, kein Lautstärke-Boost).
    const w = t.result === "win" || t.result === "win_tie";
    const flipTier = fxIntensity(t.gained || 0).tier; // 0–4 (STARK…GOTTGLEICH); tier 0 (<10k) → nur Sieg-Basis
    audio.play("cardflip", {
      rate: Math.min(CARDFLIP_RATE_CAP, Math.max(1, CARDFLIP_RATE_REF / flipMs)),
      gain: (CARDFLIP_GAIN[t.result] ?? 1) * (w ? 1.2 : 1),
      bass: w ? 4 + 1.5 * flipTier + (t.isCrit ? 4 : 0) : 0,
    });
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
      if (!declutter)
        entries.push({ id: `s${t.trickNo}`, zone: "score", dur, seed: t.trickNo * 2, value: t.gained,
                       text: `+${fmtScore(t.gained)}`, color: critC, icons: hitIcons }); // #184: Score ganzzahlig (floor), keine Nachkommastelle
    }
    if (!entries.length) return;
    setFloats((cur) => { const next = [...cur, ...entries].slice(-6); floatCountRef.current = next.length; return next; }); // Pool gedeckelt — kein unbegrenztes Stapeln
    const ids = entries.map((e) => e.id);
    const tm = setTimeout(() => {
      setFloats((cur) => { const next = cur.filter((f) => !ids.includes(f.id)); floatCountRef.current = next.length; return next; });
      floatTimers.current = floatTimers.current.filter((x) => x !== tm); // #159: erledigten Timer aus dem Ref splicen → kein unbegrenztes Wachstum über einen langen Lauf
    }, dur);
    floatTimers.current.push(tm);
  }, [t?.trickNo]);

  // #FB: Groß-Ansage-Pool („wie stark") — entkoppelt vom Stich-Takt (wie der Score-Float-Pool). Jeder Eintrag lebt
  // BIG_ANNOUNCE_MS und entfernt sich selbst, unabhängig davon, wie schnell die Folgestiche kommen. So bleibt die
  // Ansage auch bei 4×/MAX voll sichtbar, statt vom nächsten Stich abgeschnitten zu werden. Spur (lane) rotiert →
  // aufeinanderfolgende Ansagen fächern vertikal, Pool klein gedeckelt → kein „zu sehr Überlappen".
  const [bigFloats, setBigFloats] = useState([]);
  const bigTimers = useRef([]);
  const bigSeq = useRef(0);
  useEffect(() => () => bigTimers.current.forEach(clearTimeout), []);
  useEffect(() => {
    if (!t) { setBigFloats([]); return; }   // Menü/neuer Lauf → Pool leeren
    if (!bigScore) return;                   // nur bei einem großen Sieg-Stich
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
    const base = { rest: sRest, halves: sHalves, cut: sCut, spark: sSpark, boom: sBoom, float: sFloat, fxP, fxTier, scale: fxScale };
    const spawned = [];
    if (lost) {  // Spielerkarte verliert → Schnitt-Ghost auf der Spielerseite
      spawned.push({ ...base, id: `pg${t.trickNo}-${ghostSeq.current++}`, side: "player", fx: "slice",
        color: suitColor(t.pCard.suit), seed: t.trickNo * 2 + 7,
        suit: t.pCard.suit, value: t.pCard.value, baseRank: t.pCard.baseRank, stichBonus: t.pValue - t.pCard.value,
        ionStacks: t.pCard.ionStacks || 0, green: !!t.pCard.green,
        forged: forged[t.pCard.id] || 0, growth: growth[t.pCard.id] || 0, allyColor: allyColorFor(t.pCard.suit), frontImage: deckFront });
    }
    if (win) {   // Gegnerkarte verliert → Schnitt- (normal) bzw. Explosions-Ghost (Krit) auf der Gegnerseite
      spawned.push({ ...base, id: `og${t.trickNo}-${ghostSeq.current++}`, side: "opp", fx: isCrit ? "explode" : "slice",
        color: isCrit ? critColor : suitColor(t.oCard.suit), seed: t.trickNo * 3 + 1,
        suit: t.oCard.suit, value: t.oValue, baseRank: t.oCard.baseRank, stichBonus: 0,
        ionStacks: 0, green: !!t.oCard.green,
        branded: brandActive[t.oCard.id] || 0, colonized: colonized[t.oCard.id] ? AUSLAEUFER_HARVEST : 0, allyColor: allyColorFor(t.oCard.suit), frontImage: oppFrontImg });
    }
    if (!spawned.length) return;
    setSlashGhosts((cur) => [...cur, ...spawned].slice(-ghostCap)); // Pool gedeckelt (turbo-abhängig, #200 A)
    const ids = spawned.map((g) => g.id);
    const tm = setTimeout(() => {
      setSlashGhosts((cur) => cur.filter((g) => !ids.includes(g.id)));
      ghostTimers.current = ghostTimers.current.filter((x) => x !== tm); // #159: erledigten Timer aus dem Ref splicen (wie floatTimers)
    }, sRest + Math.max(sHalves, sSpark) * (1 + fxP * 0.3) + 100); // Lebensdauer: Ruhe + längster FX-Teil (#188: um die skalierte Dauer verlängert)
    ghostTimers.current.push(tm);
    // GOTTGLEICH-Krit (oberste Stufe): den abprallenden Partikel-Schwarm feuern, synchron zum Bersten nach dem Ruhe-Beat.
    if (win && isCrit && fxTier >= 4 && !reduced) {
      const bt = setTimeout(() => { burstSeq.current += 1; setBurst({ id: burstSeq.current }); }, sRest);
      ghostTimers.current.push(bt); // gemeinsame Ghost-Timer-Aufräumung (unmount → clearTimeout)
    }
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
  }, [t?.trickNo, showFormation, formLabel, formationStr, formColor, formPeak]);
  // „Verlässt gerade": der Float gehört zu einem früheren Stich als dem aktuell gezeigten Formations-Sieg.
  const formLeaving = !!formFloat && formFloat.key !== (t ? t.trickNo : null);
  useEffect(() => {
    clearTimeout(formOutTimer.current);
    if (formLeaving) formOutTimer.current = setTimeout(() => setFormFloat(null), FORM_LINGER_MS); // nach dem Ausklang entfernen
  }, [formLeaving, formFloat?.key]);

  // --- Archetyp-Ambiente hinter den Karten (#142 Feuer / #143 Blitz / #144 Eis), rein kosmetisch ---
  // Werte kommen aus dem State; ohne aktiven Archetyp bleibt alles unsichtbar (0 → kein Effekt).
  const heatRatio  = heat?.active ? clamp((heat.value || 0) / (heat.max || 100), 0, 1) : 0;
  const charge     = lightning?.active ? (lightning.charge || 0) : 0;
  const maxCharge  = lightning?.maxCharge || 10;
  const chargeR    = clamp(charge / maxCharge, 0, 1);
  const lightOn    = !!lightning?.active && charge >= 2;   // Blitz-Rahmen erst ab Ladung 2 (#143)
  const chargeFull = lightOn && charge >= maxCharge;
  // Panel-Rand: bei aktivem Blitz elektrisch blau (voll: violett), sonst Standard.
  const panelBorder = chargeFull ? "1px solid rgba(138,125,224,0.75)"
    : lightOn ? `1px solid rgba(94,200,240,${(0.35 + 0.5 * chargeR).toFixed(2)})`
    : "1px solid #26262e";
  // Äußerer Bloom als panel-eigenes box-shadow (NICHT vom overflow-hidden geklippt): Feuer bei hoher Hitze,
  // Blitz ab Ladung 2 (+ violetter Bloom bei voll). Leer → CRT-Skin-Glow bleibt unangetastet.
  const outerParts = [];
  if (heatRatio >= 0.55) outerParts.push(`0 0 ${Math.round(18 * heatRatio)}px ${Math.round(4 * heatRatio)}px rgba(224,113,74,${(0.22 * heatRatio).toFixed(2)})`);
  if (lightOn)           outerParts.push(`0 0 ${Math.round(12 + 24 * chargeR)}px ${Math.round(chargeR * 4)}px rgba(94,200,240,${(0.14 + 0.34 * chargeR).toFixed(2)})`);
  if (chargeFull)        outerParts.push("0 0 44px 8px rgba(138,125,224,0.32)");
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
      style={{ background: "#17171c", border: panelBorder, boxShadow: outerGlow,
               // #188 v2 / #192: Screen-Shake bei großem Sieg — Panel jittert, Amplitude via --shake-amp nach Stufe.
               // Krit ab STARK, normaler Sieg ab BRUTAL (grün/gold Aura via outerGlow, kein Flash/Vignette).
               animation: shakeName ? `${shakeName} ${shakeDur}ms ease-in-out` : undefined,
               ...(shakeAmp ? { "--shake-amp": `${shakeAmp}px` } : {}) }}>
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
      {/* Feuer-Glut (#142): warmer Radial-Verlauf von unten + innerer Glow, Deckkraft = Hitze-Verhältnis.
          Puls ab ~90 %. Liegt zuunterst (z-0), hinter Eis und Karten. */}
      {heatRatio > 0.001 && (
        <div aria-hidden="true"
          className={`absolute inset-0 rounded-xl pointer-events-none${heatRatio >= 0.9 && !reduced ? " as-heat-pulse" : ""}`}
          style={{ zIndex: 0, opacity: heatRatio,
                   background: "radial-gradient(135% 95% at 50% 122%, #f0a83a55 0%, #e0714a44 34%, transparent 68%)",
                   boxShadow: "inset 0 -28px 66px -10px #e0714a99, inset 0 0 54px #e0714a2e" }} />
      )}
      {/* Blitz-Rahmen (#143): innerer blauer Glow, Intensität = Ladung (ab 2). Voll → violetter Akzent + Puls. */}
      {lightOn && (
        <div aria-hidden="true"
          className={`absolute inset-0 rounded-xl pointer-events-none${chargeFull && !reduced ? " as-charge-pulse" : ""}`}
          style={{ zIndex: 2, boxShadow: `inset 0 0 ${Math.round(8 + 22 * chargeR)}px ${Math.round(1 + 5 * chargeR)}px rgba(94,200,240,${(0.16 + 0.5 * chargeR).toFixed(2)})${chargeFull ? ", inset 0 0 40px 6px rgba(138,125,224,0.42)" : ""}` }} />
      )}
      {/* Ein Blitz ⚡ oben mittig am Rahmen (#143), Glow steigt mit der Ladung; voll → Puls + „VOLL GELADEN". */}
      {lightOn && (
        <div aria-hidden="true"
          className={`absolute pointer-events-none${chargeFull && !reduced ? " as-charge-pulse" : ""}`}
          style={{ left: "50%", top: 3, transform: "translateX(-50%)", zIndex: 3, fontSize: 20, lineHeight: 1,
                   opacity: 0.5 + 0.5 * chargeR,
                   filter: `drop-shadow(0 0 ${Math.round(4 + 8 * chargeR)}px #5ec8f0)${chargeFull ? " drop-shadow(0 0 10px #8a7de0)" : ""}` }}>
          ⚡
          {chargeFull && (
            <div className="font-pixel-dense" style={{ position: "absolute", top: 21, left: "50%", transform: "translateX(-50%)", fontSize: 8, letterSpacing: 1, whiteSpace: "nowrap", color: "#bfe9f7", textTransform: "uppercase" }}>Voll geladen</div>
          )}
        </div>
      )}
      {/* GOTTGLEICH-Prunk: abprallender Weißgold-Schwarm über dem Feld (Bounds = Panel-Rahmen). Nur bei tier-4-Krit. */}
      <BounceBurst trigger={burst} panelRef={panelRef} oppRef={oppSlotRef} />
      <div className="relative z-10 flex items-center justify-center gap-4 sm:gap-8">
        {/* KRITISCH-Text (#33) — bei reduzierter Bewegung statisch „… ×N". */}
        {isCrit && (
          <div key={`krit${t.trickNo}`} className="pointer-events-none absolute font-extrabold whitespace-nowrap z-10"
            style={{ left: `calc(${FLOAT_ZONES.crit.left} + ${fjitter(t.trickNo * 5 + 2, JITTER_X)}px)`,
                     top:  `calc(${FLOAT_ZONES.crit.top} + ${fjitter(t.trickNo * 5 + 9, JITTER_Y)}px)`,
                     fontSize: 26, color: critColor, textShadow: `0 0 12px ${critColor}aa`, textTransform: "uppercase", // Loc: Caps via CSS
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
                overlay={oppGhosts.length ? <SlashGhostLayer ghosts={oppGhosts} /> : null}>{oppCard}</Side>
        </div>

        {/* Aufsteigende Zahlen (#49/#68): je Typ eigene Streuzone (Score links / Leben rechts) mit
            kleinem, deterministischem Jitter aus trickNo → gleiche Typen dicht, verschiedene getrennt,
            aufeinanderfolgende überlappen nur leicht statt exakt zu stapeln. Pool gedeckelt. */}
        {floats.map((f) => {
          const z = FLOAT_ZONES[f.zone];
          const dx = fjitter(f.seed, JITTER_X), dy = fjitter(f.seed * 1.7 + 3, JITTER_Y);
          const pos = { top: `calc(${z.top} + ${dy}px)` };
          if (z.left != null)  pos.left  = `calc(${z.left} + ${dx}px)`;
          if (z.right != null) pos.right = `calc(${z.right} + ${dx}px)`;
          return (
            <div key={f.id} className="pointer-events-none absolute font-bold whitespace-nowrap"
              style={{ ...pos, color: f.color, fontSize: floatSize(f.value || 0), lineHeight: 1,
                       animation: fx(`as-float ${f.dur}ms ease-out forwards`) }}>
              {f.icons && f.icons.length > 0 && (
                <span className="mr-1 inline-flex items-center gap-0.5 align-middle" style={{ WebkitTextFillColor: "initial" }}>
                  {f.icons.map((k) => k === "ice"
                    ? <img key={k} src={glacierIcon} alt="" aria-hidden="true" className="inline-block object-contain" style={{ width: "0.85em", height: "0.85em", filter: "drop-shadow(0 0 3px #5ec8f0)" }} />
                    : <span key={k}>{HIT_STYLE[k].icon}</span>)}
                </span>
              )}{f.text}
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
    {/* #188 v2 / #192: Vollbild-Flash/Vignette NUR bei Krit (screenFx.isCrit) — normale Siege bekommen ausschließlich
        den Shake (+ grün/gold Panel-Aura), erreichen Flash/Vignette also nie. key=n → Neustart je Sieg. */}
    {screenFx && screenFx.isCrit && <CritScreenFx key={screenFx.n} tier={screenFx.tier} color={screenFx.color} />}
   </>
  );
}
