/* TUTORIAL-SKRIPT (geführter Lauf) — Ablauf und Anker als DATEN, kein Anzeigetext.

   Der Plan (docs/tutorial-guided-run-plan.md §6/§14) verlangt genau diese Trennung: hier stehen
   Schrittfolge, Auslöser und Spotlight-Anker; die Sätze liegen als Schlüssel in src/i18n/de.js und
   src/i18n/en.js. Ein deutscher Satz in dieser Datei wäre ein einsprachiges Tutorial.

   Diese Datei ist bewusst pur (kein React, kein `t`, kein Zustand) — sie wird von useTutorial.js
   gelesen und von TutorialOverlay.jsx gerendert. Ein `import { t }` wäre hier zwar kein Zyklus wie in
   den game/-Registern, aber er würde die Sprache beim Laden einfrieren (Modul-Konstante); die
   Auflösung gehört deshalb an die Anzeigezeit.

   SCHRITT-SCHEMA
     id          eindeutig; zugleich der Merker in `seen` (Persistenz je Lauf, nicht je Profil)
     match       wann der Schritt fällig ist:
                   phase  — Reducer-Phase (state.phase)
                   field  — zusätzlich verlangtes Angebots-Feld; `levelup` trägt DREI Auswahlarten
                            (offer = Perk, skillOffer = Skill), die sich nur daran unterscheiden
                   atStart— true: fällt einmal beim Lauf-Start, vor der ersten Phase
     titleKey    Überschrift des Pop-ups
     bodyKey     Fließtext (höchstens drei Sätze — docs/text-style-guide.md)
     vars        Konstanten, die im Text als {platzhalter} stehen. Nie abgetippt: das Tutorial soll
                 beim nächsten Balancing nicht lügen.
     coachmarks  Spotlights nach dem Pop-up: [{ anchor, key }] — `anchor` ist der data-tut-Wert des
                 Panels, `key` der Ein-Satz-Text. Leer = nur Pop-up (Plan §13.5: die bedingten Phasen
                 bekommen bewusst keine Coach-Marks, sonst zerfasert der Bogen).
     closing     true: dieser Schritt beendet den erklärten Bogen (setzt „Tutorial gesehen"). */
import * as C from "../../game/constants.js";
import { SEGMENT_SIZE } from "../../game/formations.js";

/* Fester Seed des geführten Laufs (Plan §3). Läuft über den GANZ normalen Seed-Pfad von START_RUN —
   derselbe, den der Seed-Chip im Hub benutzt. Dadurch bleibt src/game/ unangetastet und die
   Determinismus-Tests unberührt: der Seed pinnt nur den INHALT (Karten, Angebote, Crits), die
   Phasenreihenfolge steht ohnehin fest in DECISION_SCHEDULE.

   Vom Nutzer freigegeben (2026-08-15). Die Wahl ist bewusst frei: die beiden Kriterien aus §3 sind
   gemessen seed-unabhängig — Formationen in der ersten Aufstellungsphase zeigen 2000 von 2000 Seeds
   (§13.9c), einen frühen Crit garantiert KEIN Seed (§13.9b). Der feste Seed trägt deshalb nur noch
   Reproduzierbarkeit: alle Spieler sehen denselben geführten Lauf, und Support-Fragen haben eine
   gemeinsame Grundlage. */
export const TUTORIAL_SEED = 952;

/* Die vier Hauptphasen + Stichspiel bekommen volle Coach-Marks, die bedingten Phasen nur einen Satz
   (Plan §13.5). Reihenfolge hier = Reihenfolge der Fortschrittsanzeige „Schritt n/m". */
export const TUTORIAL_STEPS = [
  {
    id: "intro",
    match: { atStart: true },
    titleKey: "tutorial.intro.title",
    bodyKey: "tutorial.intro.body",
    vars: { cycles: C.MAX_CYCLES },
    coachmarks: [],
  },
  {
    id: "play",
    match: { phase: "play" },
    titleKey: "tutorial.play.title",
    bodyKey: "tutorial.play.body",
    vars: { win: C.SCORE_PER_WIN, cards: C.TRICKS_PER_CYCLE },
    coachmarks: [
      { anchor: "bf-board",  key: "tutorial.play.mark.board" },
      { anchor: "bf-status", key: "tutorial.play.mark.status" },
      { anchor: "bf-rail",   key: "tutorial.play.mark.rail" },
    ],
  },
  {
    id: "skill",
    match: { phase: "levelup", field: "skillOffer" },
    titleKey: "tutorial.skill.title",
    bodyKey: "tutorial.skill.body",
    vars: { slots: C.SKILL_SLOTS },
    coachmarks: [
      { anchor: "skill-offer", key: "tutorial.skill.mark.offer" },
      { anchor: "skill-slots", key: "tutorial.skill.mark.slots" },
    ],
  },
  {
    id: "perk",
    match: { phase: "levelup", field: "offer" },
    titleKey: "tutorial.perk.title",
    bodyKey: "tutorial.perk.body",
    vars: {},
    coachmarks: [
      { anchor: "perk-offer", key: "tutorial.perk.mark.offer" },
      { anchor: "perk-build", key: "tutorial.perk.mark.build" },
    ],
  },
  {
    id: "formation",
    match: { phase: "formation" },
    titleKey: "tutorial.formation.title",
    bodyKey: "tutorial.formation.body",
    // `segments` ist abgeleitet (Deckgröße ÷ Segmentlänge) — die „acht" stand vorher im Text und wäre
    // beim ersten Deck-Umbau still falsch geworden.
    vars: { energy: C.FORMATION_ENERGY, segment: SEGMENT_SIZE, cards: C.TRICKS_PER_CYCLE,
            segments: Math.floor(C.TRICKS_PER_CYCLE / SEGMENT_SIZE) },
    coachmarks: [
      { anchor: "form-board",  key: "tutorial.formation.mark.board" },
      { anchor: "form-energy", key: "tutorial.formation.mark.energy" },
      { anchor: "form-legend", key: "tutorial.formation.mark.legend" },
    ],
  },
  {
    id: "architect",
    match: { phase: "architect" },
    titleKey: "tutorial.architect.title",
    bodyKey: "tutorial.architect.body",
    vars: {},
    coachmarks: [
      { anchor: "arch-board",  key: "tutorial.architect.mark.board" },
      { anchor: "arch-offers", key: "tutorial.architect.mark.offers" },
      { anchor: "arch-done",   key: "tutorial.architect.mark.done" },
    ],
    // Der Architekt schließt den Viererblock aus DECISION_SCHEDULE (Skill → Perk → Aufstellen →
    // Architekt) und damit den erklärten Bogen — ab hier läuft ein ganz normaler Lauf weiter.
    closing: true,
  },

  /* ---- Bedingte Phasen: erscheinen nur, wenn der Build sie auslöst. Ein Satz, keine Coach-Marks. ---- */
  {
    id: "glacier",
    match: { phase: "glacier-target" },
    titleKey: "tutorial.glacier.title",
    bodyKey: "tutorial.glacier.body",
    vars: {},
    coachmarks: [],
  },
  {
    id: "target",
    match: { phase: "target" },
    titleKey: "tutorial.target.title",
    bodyKey: "tutorial.target.body",
    vars: {},
    coachmarks: [],
  },
  {
    id: "familyTarget",
    match: { phase: "family-target" },
    titleKey: "tutorial.familyTarget.title",
    bodyKey: "tutorial.familyTarget.body",
    vars: {},
    coachmarks: [],
  },
  {
    id: "legendary",
    // Eigene Reducer-Phase, NICHT `levelup` + legendaryOffer (der Plan §4 vermutete das; siehe §13.9).
    match: { phase: "legendary" },
    titleKey: "tutorial.legendary.title",
    bodyKey: "tutorial.legendary.body",
    vars: { cycle: C.LEG_PHASE_CYCLE },
    coachmarks: [],
  },
];

/* Der Abschluss-Hinweis ist KEIN Schritt: er hängt nicht an einer Phase, sondern folgt dem letzten
   erklärten Schritt (Plan §13.3). Deshalb steht er hier für sich — sonst zählte er in „Schritt n/m"
   mit und der Fortschritt liefe über sein eigenes Ende hinaus. */
export const TUTORIAL_OUTRO = {
  id: "outro",
  titleKey: "tutorial.outro.title",
  bodyKey: "tutorial.outro.body",
  vars: {},
};

/* Fortschrittsanzeige: aus der Skriptlänge abgeleitet, nie in den Text geschrieben (Plan §10) —
   sonst driftet die Zahl beim ersten neuen Schritt. Gezählt werden nur die Schritte des erklärten
   Bogens; die bedingten Phasen kommen unregelmäßig und würden den Nenner unehrlich machen. */
export const TUTORIAL_MAIN_STEPS = TUTORIAL_STEPS.filter((s) => s.coachmarks.length > 0 || s.match.atStart);
export const TUTORIAL_TOTAL = TUTORIAL_MAIN_STEPS.length;

/* Fällt dieser Schritt im aktuellen Zustand? Zwei Bedingungen, beide notwendig:
   die Phase stimmt UND — wo verlangt — das Angebots-Feld ist gesetzt. */
export function stepMatches(step, phase, state) {
  const m = step.match || {};
  if (m.atStart) return false;              // der Intro-Schritt wird direkt beim Lauf-Start gesetzt
  if (m.phase !== phase) return false;
  if (m.field) return !!(state && state[m.field]);
  return true;
}
