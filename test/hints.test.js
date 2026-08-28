/* ONBOARDING-HINTS — Wächter für die Hint-Schicht (docs/tutorial-onboarding-design.md §5).

   Drei Fehlerklassen, die still durchrutschen würden:
   1. Ein „Mehr dazu"-Ziel zeigt auf eine Lektion, die der nächste Katalog-Schnitt gelöscht hat
      (genau das ist der T-O4-Umbau) → jeder Target-Pfad muss im Sektions-Katalog existieren.
   2. Ein Hint-Schlüssel fehlt im Katalog → der Spieler sähe den rohen Schlüssel.
   3. Eine abgetippte Zahl im Text — dieselbe Ratsche, die schon der geführte Lauf und die
      Sektionen trugen: Zahlen kommen als Platzhalter, sonst lügt der Hint nach dem nächsten
      Balancing. */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import de from "../src/i18n/de.js";
import { HINT_DEFS, SEQUENCES, hintForScreen, screenOf, eventForPlay, resolveTarget, resolveAnchor,
  resolveBodyKey, ARCH_SECTION } from "../src/ui/hints/hintScript.js";
import { SECTIONS } from "../src/ui/tutorial-sections/catalog.js";

const ARCH_CTXS = Object.keys(ARCH_SECTION).map((arch) => ({ state: { activeArchetypes: [arch] } }));

const LESSON_PATHS = new Set(SECTIONS.flatMap((s) => s.lessons.map((l) => `${s.id}/${l.id}`)));

describe("hints · Skript-Integrität", () => {
  it("jedes „Mehr dazu“-Ziel existiert im Sektions-Katalog — Funktions-Ziele über alle Archetypen", () => {
    const bad = [];
    for (const [id, d] of Object.entries(HINT_DEFS)) {
      if (!d.target) continue;
      const targets = typeof d.target === "function"
        ? Object.keys(ARCH_SECTION).map((arch) => resolveTarget(d, { state: { activeArchetypes: [arch] } }))
        : [d.target];
      for (const tgt of targets) if (!LESSON_PATHS.has(tgt)) bad.push(`${id} → ${tgt}`);
    }
    expect(bad).toEqual([]);
  });

  it("jeder referenzierte Schlüssel steht im deutschen Katalog — Funktions-bodyKeys über alle Archetypen", () => {
    const keys = Object.values(HINT_DEFS).flatMap((d) => [
      ...(typeof d.bodyKey === "function" ? ARCH_CTXS.map((c) => resolveBodyKey(d, c)) : [d.bodyKey]),
      d.titleKey,
    ].filter(Boolean));
    const missing = keys.filter((k) => typeof de[k] !== "string" || !de[k]);
    expect(missing).toEqual([]);
  });

  it("jeder Anker existiert als data-hint-anchor im UI-Quelltext — Funktions-Anker über alle Archetypen", () => {
    const uiDir = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "ui");
    const src = (function walk(dir) {
      return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(join(dir, e.name))
        : e.name.endsWith(".jsx") || e.name.endsWith(".js") ? [readFileSync(join(dir, e.name), "utf8")] : []);
    })(uiDir).join("\n");
    const bad = [];
    for (const [id, d] of Object.entries(HINT_DEFS)) {
      if (!d.anchor) continue;
      const anchors = typeof d.anchor === "function" ? ARCH_CTXS.map((c) => resolveAnchor(d, c)) : [d.anchor];
      // Direktes Attribut ODER die anchor-Prop der FactionShell (sie rendert data-hint-anchor selbst).
      for (const a of anchors)
        if (!src.includes(`data-hint-anchor="${a}"`) && !src.includes(`anchor="${a}"`)) bad.push(`${id} → ${a}`);
    }
    expect(bad).toEqual([]);
  });

  it("kein Hint-Text nennt eine Zahl direkt (Platzhalter statt Abtippen)", () => {
    const bad = Object.entries(de)
      .filter(([k]) => k.startsWith("hint."))
      .filter(([, v]) => /\d/.test(String(v).replace(/\{[^}]*\}/g, "")));
    expect(bad.map(([k]) => k)).toEqual([]);
  });

  it("jeder Sequenz-Schritt hat eine Definition, und die Banner-Slots kennen ihre Screens", () => {
    for (const seq of Object.values(SEQUENCES)) for (const s of seq) expect(HINT_DEFS[s.id], s.id).toBeTruthy();
  });
});

describe("hints · Auswahl-Logik (pur, ohne React)", () => {
  const ctx = (over = {}) => ({ seen: new Set(), visits: {}, state: {}, firstRun: false,
    blitzOnly: false, multiArch: false, slotsFull: false, ...over });

  it("Skill-Screen: H2 nur im Erstlauf UND nur über einem Blitz-only-Angebot", () => {
    expect(hintForScreen("skill", ctx({ firstRun: true, blitzOnly: true }))).toBe("H2");
    // T-O1 kann vor T-O3 landen: frisches Profil, aber Mehr-Archetypen-Angebot → das generische H2b.
    expect(hintForScreen("skill", ctx({ firstRun: true, multiArch: true }))).toBe("H2b");
    expect(hintForScreen("skill", ctx({ multiArch: true }))).toBe("H2b");
    expect(hintForScreen("skill", ctx({ slotsFull: true }))).toBe("H5");
    expect(hintForScreen("skill", ctx({ seen: new Set(["H2b"]), multiArch: true, slotsFull: true }))).toBe("H5");
    expect(hintForScreen("skill", ctx())).toBe(null);
  });

  it("Perk-Screen: H3 beim ersten Besuch, H3b ab dem zweiten, H4 (Glossar) ab dem dritten", () => {
    expect(hintForScreen("perk", ctx({ visits: { perk: 1 } }))).toBe("H3");
    expect(hintForScreen("perk", ctx({ seen: new Set(["H3"]), visits: { perk: 2 } }))).toBe("H3b");
    expect(hintForScreen("perk", ctx({ seen: new Set(["H3", "H3b"]), visits: { perk: 3 } }))).toBe("H4");
    expect(hintForScreen("perk", ctx({ seen: new Set(["H3", "H3b", "H4"]), visits: { perk: 4 } }))).toBe(null);
  });

  it("Q15: neu freigeschaltete Archetypen melden sich im Skill-Angebot — beide zugleich als C7b", () => {
    expect(hintForScreen("skill", ctx({ iceAvail: true }))).toBe("C7");
    expect(hintForScreen("skill", ctx({ plantAvail: true }))).toBe("C8");
    expect(hintForScreen("skill", ctx({ iceAvail: true, plantAvail: true }))).toBe("C7b");
    // C7b räumt per markSeen-Aliasing auch C7/C8 ab — danach fällt der Screen auf H5/null zurück.
    expect(hintForScreen("skill", ctx({ iceAvail: true, plantAvail: true,
      seen: new Set(["C7b", "C7", "C8"]) }))).toBe(null);
    expect(hintForScreen("skill", ctx({ iceAvail: true, seen: new Set(["C7"]), slotsFull: true }))).toBe("H5");
  });

  it("Q8: der erste Anker-Perk im Angebot bringt H6 — nach H3, vor H3b", () => {
    expect(hintForScreen("perk", ctx({ visits: { perk: 1 }, offerHasAnker: true }))).toBe("H3");
    expect(hintForScreen("perk", ctx({ seen: new Set(["H3"]), visits: { perk: 2 }, offerHasAnker: true }))).toBe("H6");
    expect(hintForScreen("perk", ctx({ seen: new Set(["H3", "H6"]), visits: { perk: 2 }, offerHasAnker: true }))).toBe("H3b");
    expect(hintForScreen("perk", ctx({ seen: new Set(["H3"]), visits: { perk: 2 } }))).toBe("H3b");
  });

  it("C5: kein Bauplan passt mehr — schlaegt die Architekt-Sequenz, einmalig", () => {
    expect(hintForScreen("architect", ctx({ visits: { architect: 2 }, architectStuck: true }))).toBe("C5");
    expect(hintForScreen("architect", ctx({ visits: { architect: 2 }, architectStuck: true,
      seen: new Set(["C5", "S-A1"]) }))).toBe("S-A2");
    expect(hintForScreen("architect", ctx({ visits: { architect: 1 } }))).toBe("S-A1");
  });

  it("Sequenzen: ein Schritt je Besuch, spätere Schritte warten auf ihren Besuch", () => {
    expect(hintForScreen("formation", ctx({ visits: { formation: 1 } }))).toBe("S-F1");
    // S-F1 gesehen, aber erst Besuch 1 → S-F2 wartet.
    expect(hintForScreen("formation", ctx({ seen: new Set(["S-F1"]), visits: { formation: 1 } }))).toBe(null);
    expect(hintForScreen("formation", ctx({ seen: new Set(["S-F1"]), visits: { formation: 2 } }))).toBe("S-F2");
    expect(hintForScreen("architect", ctx({ visits: { architect: 4 },
      seen: new Set(["S-A1", "S-A2", "S-A3"]) }))).toBe("S-A4");
  });

  it("Sequenzen ignorieren den Brettzustand: auch ein zufällig erfülltes Ziel wird gezeigt (Owner-Entscheidung 2026-08-28)", () => {
    // Das ausgeteilte Deck trägt schon Farbblock, zwei Typen und Überlappung — die Vorschläge laufen trotzdem.
    const st = { formations: [{ formations: [{ type: "farbblock", ordinal: 1 }, { type: "treppe", ordinal: 1 }], mult: 1.4 }] };
    expect(hintForScreen("formation", ctx({ visits: { formation: 1 }, state: st }))).toBe("S-F1");
    expect(hintForScreen("formation", ctx({ seen: new Set(["S-F1"]), visits: { formation: 2 }, state: st }))).toBe("S-F2");
    expect(hintForScreen("formation", ctx({ seen: new Set(["S-F1", "S-F2"]), visits: { formation: 3 }, state: st }))).toBe("S-F3");
  });

  it("bedingte Phasen: einmalig je Profil", () => {
    expect(hintForScreen("glacier", ctx())).toBe("C1");
    expect(hintForScreen("glacier", ctx({ seen: new Set(["C1"]) }))).toBe(null);
    expect(hintForScreen("legendary", ctx())).toBe("C4");
  });
});

describe("hints · Screen-Erkennung", () => {
  it("levelup allein identifiziert keinen Screen — das Angebots-Feld tut es", () => {
    expect(screenOf({ phase: "levelup", skillOffer: ["SK_LIGHTNING_01"] })).toBe("skill");
    expect(screenOf({ phase: "levelup", offer: [{}] })).toBe("perk");
    expect(screenOf({ phase: "formation" })).toBe("formation");
    expect(screenOf({ phase: "architect" })).toBe("architect");
    expect(screenOf({ phase: "glacier-target" })).toBe("glacier");
    expect(screenOf({ phase: "play" })).toBe(null);
    expect(screenOf(null)).toBe(null);
  });
});

describe("hints · Ereignis-Auswahl im Stichspiel (T-O2, pur)", () => {
  const ectx = (over = {}) => ({ seen: new Set(), state: {}, atPhaseStart: false, playVisit: 1,
    shownThisPhase: 0, sameTrickAsLast: false, ...over });
  const win = { result: "win", winStreak: 1, isCrit: false, formationMult: 1, pCard: { value: 7 }, pValue: 7 };

  it("Quoten: höchstens zwei je Stichphase, höchstens eine je Stich", () => {
    expect(eventForPlay(ectx({ state: { lastTrick: win }, shownThisPhase: 2 }))).toBe(null);
    expect(eventForPlay(ectx({ state: { lastTrick: win }, sameTrickAsLast: true }))).toBe(null);
    expect(eventForPlay(ectx({ state: { lastTrick: win } }))).toBe("E1");
  });

  it("E5 hat Vorrang und darf auch am Phasenstart feuern (die Leiste ist ein bleibender Referent)", () => {
    expect(eventForPlay(ectx({ state: { lastTrick: win, activeArchetypes: ["lightning"] } }))).toBe("E5");
    expect(eventForPlay(ectx({ state: { activeArchetypes: ["lightning"] }, atPhaseStart: true }))).toBe("E5");
  });

  it("E5: Blitz bekommt den Mechanik-Text (Crits → Ladung → Ionisierung), andere Leisten den generischen", () => {
    const d = HINT_DEFS.E5;
    expect(resolveBodyKey(d, { state: { activeArchetypes: ["lightning"] } })).toBe("hint.e5.blitz.body");
    expect(resolveBodyKey(d, { state: { activeArchetypes: ["fire"] } })).toBe("hint.e5.body");
    expect(resolveAnchor(d, { state: { activeArchetypes: ["ice"] } })).toBe("faction-ice");
  });

  it("Q7/E10: die erste ionisierte Karte im Deck — einmalig, nach E5", () => {
    const ion = { deck: [{ value: 4 }, { value: 7, ionStacks: 1 }] };
    expect(eventForPlay(ectx({ state: ion, seen: new Set(["E5"]) }))).toBe("E10");
    // E5 (die Leisten-Erklärung) geht vor, solange sie aussteht und eine Leiste läuft.
    expect(eventForPlay(ectx({ state: { ...ion, activeArchetypes: ["lightning"] } }))).toBe("E5");
    expect(eventForPlay(ectx({ state: { deck: [{ value: 4 }] }, seen: new Set(["E5"]) }))).toBe(null);
    expect(eventForPlay(ectx({ state: ion, seen: new Set(["E5", "E10"]) }))).toBe(null);
  });

  it("die Ereignisse erkennen ihre Bedingungen aus lastTrick", () => {
    expect(eventForPlay(ectx({ state: { lastTrick: { ...win, result: "tie" } }, seen: new Set(["E1"]) }))).toBe("E2");
    expect(eventForPlay(ectx({ state: { lastTrick: { ...win, winStreak: 3 } }, seen: new Set(["E1"]) }))).toBe("E3");
    expect(eventForPlay(ectx({ state: { lastTrick: { ...win, isCrit: true } }, seen: new Set(["E1", "E3"]) }))).toBe("E4");
    // E6 wartet auf die erste Aufstellphase (Review Zeile 8): ohne formationVisit kein E6 …
    expect(eventForPlay(ectx({ state: { lastTrick: { ...win, formationMult: 1.4 } }, seen: new Set(["E1"]) }))).toBe(null);
    // … mit Farbblock ab Besuch 1, ohne Farbblock erst ab Besuch 2 (Fallback gegen Verhungern).
    expect(eventForPlay(ectx({ formationVisit: 1, state: { lastTrick: { ...win, formationMult: 1.4,
      formations: [{ type: "farbblock" }] } }, seen: new Set(["E1"]) }))).toBe("E6");
    expect(eventForPlay(ectx({ formationVisit: 1, state: { lastTrick: { ...win, formationMult: 1.4,
      formations: [{ type: "treppe" }] } }, seen: new Set(["E1"]) }))).toBe(null);
    expect(eventForPlay(ectx({ formationVisit: 2, state: { lastTrick: { ...win, formationMult: 1.4,
      formations: [{ type: "treppe" }] } }, seen: new Set(["E1"]) }))).toBe("E6");
    // Kampfwert weicht vom Kartenwert ab → E9, mit den echten Zahlen.
    expect(eventForPlay(ectx({ state: { lastTrick: { ...win, pValue: 9 } }, seen: new Set(["E1"]) }))).toBe("E9");
    // Ein hoher Score über dem ersten Meilenstein → E7 (über die echte milestoneBarState).
    expect(eventForPlay(ectx({ state: { lastTrick: win, score: 1e9 }, seen: new Set(["E1"]) }))).toBe("E7");
  });

  it("UI-Hints nur am Phasenstart, getaktet über den play-Besuchs-Ordinal, nie in Besuch 1", () => {
    expect(eventForPlay(ectx({ atPhaseStart: true, playVisit: 1 }))).toBe(null);
    expect(eventForPlay(ectx({ atPhaseStart: true, playVisit: 2 }))).toBe("U1");
    expect(eventForPlay(ectx({ atPhaseStart: true, playVisit: 6, seen: new Set(["U1"]) }))).toBe("U2");
    expect(eventForPlay(ectx({ atPhaseStart: true, playVisit: 9, seen: new Set(["U1", "U2"]) }))).toBe("U3");
    // mitten in der Phase feuern die U-Hints nicht — sie haben dort keinen freien Slot.
    expect(eventForPlay(ectx({ playVisit: 9, state: {} }))).toBe(null);
  });

  it("U4: spät im Lauf, nach einem Sieg mit Aufschlüsselung, nur solange die Options-Zeile sichtbar ist", () => {
    const bd = { lastTrick: { ...win, breakdown: { total: 100 } } };
    const late = { seen: new Set(["E1"]), breakdownOn: true, playVisit: 12 };
    expect(eventForPlay(ectx({ ...late, state: bd }))).toBe("U4");
    // Zu früh, Zeile ausgeblendet, oder Sieg ohne Aufschlüsselung → kein U4.
    expect(eventForPlay(ectx({ ...late, playVisit: 5, state: bd }))).toBe(null);
    expect(eventForPlay(ectx({ ...late, breakdownOn: false, state: bd }))).toBe(null);
    expect(eventForPlay(ectx({ ...late, state: { lastTrick: win } }))).toBe(null);
  });

  it("E8 sitzt als Banner auf dem Endscreen, einmalig", () => {
    expect(screenOf({ phase: "gameover" })).toBe("gameover");
    expect(hintForScreen("gameover", { seen: new Set() })).toBe("E8");
    expect(hintForScreen("gameover", { seen: new Set(["E8"]) })).toBe(null);
  });
});

/* ---- Runde 2, R18/R19: C5-Prädikat gegen den Owner-Repro + C6 („Phase danach") ---- */
import { noOfferPlaceable, N_POS, shapeRotations, ARCHITECT_FAMILIES } from "../src/game/architect.js";

describe("hints · C5-Prädikat (noOfferPlaceable) und C6-Folge", () => {
  const ctx = (over = {}) => ({ seen: new Set(), visits: {}, state: {}, firstRun: false,
    blitzOnly: false, multiArch: false, slotsFull: false, ...over });
  // Eine echte Familie je Formgröße — das Prädikat rechnet mit den echten Rotationen.
  const famOfSize = (n) => Object.values(ARCHITECT_FAMILIES).find(
    (f) => f && f.form && !f.legendary && shapeRotations(f.form)[0].length === n);

  it("Owner-Repro (Durchlauf 28): 18/20 belegt, drei Angebote ab Größe 3 — kein Bauplan passt", () => {
    const fam3 = famOfSize(3), fam4 = famOfSize(4);
    expect(fam3 && fam4, "Familien der Größen 3/4 existieren").toBeTruthy();
    const buildings = [{ id: 1, footprint: Array.from({ length: 18 }, (_, i) => i) }];
    const architect = { buildings, maxCover: 20,
      offers: [{ familyId: fam4.id }, { familyId: fam4.id }, { familyId: fam3.id }] };
    // 18 + 3 > 20 → schon der Deckel macht jedes Angebot unbaubar; Ersetzen zählt NICHT als Platz.
    expect(noOfferPlaceable(architect, [])).toBe(true);
  });

  it("Geometrie-Fall: Deckel frei, aber die freien Zellen tragen keine Angebots-Form", () => {
    const fam3 = famOfSize(3);
    // Alles voll bis auf zwei einzelne, weit getrennte Zellen — eine 3er-Form findet keinen Platz.
    const frei = new Set([0, N_POS - 1]);
    const buildings = [{ id: 1, footprint: Array.from({ length: N_POS }, (_, i) => i).filter((p) => !frei.has(p)) }];
    const architect = { buildings, maxCover: N_POS, offers: [{ familyId: fam3.id }] };
    expect(noOfferPlaceable(architect, [])).toBe(true);
    // Gegenprobe: leeres Brett → alles baubar.
    expect(noOfferPlaceable({ buildings: [], maxCover: N_POS, offers: [{ familyId: fam3.id }] }, [])).toBe(false);
  });

  it("C6 kommt in der Architekt-Phase NACH C5 (c5Done), einmalig, und schlägt die Sequenz", () => {
    expect(hintForScreen("architect", ctx({ visits: { architect: 3 }, c5Done: true,
      seen: new Set(["C5", "S-A1", "S-A2"]) }))).toBe("C6");
    // Gleiche Phase wie das C5-✕ (c5Done false) → noch kein C6, die Sequenz läuft normal.
    expect(hintForScreen("architect", ctx({ visits: { architect: 3 }, c5Done: false,
      seen: new Set(["C5", "S-A1", "S-A2"]) }))).toBe("S-A3");
    // C6 gesehen → nie wieder.
    expect(hintForScreen("architect", ctx({ visits: { architect: 4 }, c5Done: true,
      seen: new Set(["C5", "C6", "S-A1", "S-A2", "S-A3"]) }))).toBe("S-A4");
  });
});
