import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { PERK_LIST } from "../src/game/perks.js";
import { FAMILY_DEFS } from "../src/game/families.js";
import { SKILL_DEFS } from "../src/game/skills.js";
import { UPGRADE_TYPES } from "../src/game/rarity.js";

/* ============================================================
   REGISTRY-GUARDS (Testumgebung, „wichtig für zukünftige Zugänge").
   Meta-Tests, die AUTOMATISCH über die Content-Registries laufen. Sie fangen genau die
   Fehlerklassen ab, die ein neuer Perk/Skill/Familien-Stufe/Shop-Eintrag still einführen kann:

     1. Dead-Marker/Hook  — ein Effekt-Key ist im Registry definiert, wird aber von KEINEM
        Consumer (engine/formations/reducer/…) gelesen → der Effekt tut still nichts.
     2. Phantom-Stufe     — eine REGELERSETZUNGS-Stufe wirkt mechanisch identisch zur
        Nachbarstufe (gleiche Hook-Outputs + gleiche Marker), obwohl ihr Text mehr verspricht.
        (Historie: #189 B_INITIATIVE III, #195 E_COLOR_ALLIANCE/E_RPM/E_SEGMENT.)
     3. Coverage-Gate     — jeder Registry-Eintrag muss in mindestens einem Test namentlich
        vorkommen → ein neuer Eintrag ohne eigenen Test lässt die Suite rot werden.

   Diese Datei liest die Consumer-Quellen + die übrigen Testdateien als Text (node:fs),
   damit die Guards ohne Pflege einer Handliste mit jedem neuen Eintrag mitwachsen.
   ============================================================ */

const gameSrc = (p) => readFileSync(new URL(`../src/game/${p}`, import.meta.url), "utf8");

// Consumer-Quellen: hier werden Marker/Hooks tatsächlich ausgelesen (Engine, Formationen, Reducer, Helfer).
const CONSUMER_FILES = [
  "engine.js", "formations.js", "reducer.js", "stats.js", "runStats.js",
  "shop.js", "perks.js", "skills.js", "families.js", "deck.js",
];
const CONSUMER_SRC = CONSUMER_FILES.map(gameSrc).join("\n");

// Strukturelle/Meta-Keys — beschreiben KEINEN Effekt, brauchen also keinen Consumer.
const STRUCTURAL = new Set([
  "id", "cat", "name", "desc", "tiers", "upgradeType", "rarity", "label",
  "legacyIds", "keywords", "archetype", "repeatable", "enabled", "offerable", "legendary", "anchorType",
]);

// Alle Effekt-Keys (Hook-Funktionen + Wert-Marker) je Registry — dedupliziert auf den Key-NAMEN,
// mit einem Beispiel-Eintrag für die Fehlermeldung.
function collectEffectKeys() {
  const byKey = new Map(); // key -> { count, sample }
  const add = (key, sample) => {
    if (STRUCTURAL.has(key)) return;
    const e = byKey.get(key) || { count: 0, sample };
    e.count += 1;
    byKey.set(key, e);
  };
  for (const p of PERK_LIST) for (const k of Object.keys(p)) add(k, `Perk ${p.id}`);
  for (const fam of Object.values(FAMILY_DEFS))
    for (const [t, def] of Object.entries(fam.tiers)) for (const k of Object.keys(def)) add(k, `Familie ${fam.id} Stufe ${t}`);
  for (const s of Object.values(SKILL_DEFS)) for (const k of Object.keys(s)) add(k, `Skill ${s.id}`);
  return byKey;
}

// Ein Key gilt als „konsumiert", wenn er im Consumer-Code als String-Literal ("key") ODER als
// Property-Zugriff (.key) vorkommt. Die Objekt-Definition (`key:` im Literal) zählt NICHT — so wird
// echtes Auslesen von der bloßen Definition unterschieden.
function isConsumed(key) {
  const esc = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const strLit = new RegExp(`["'\`]${esc}["'\`]`);
  const propAccess = new RegExp(`\\.${esc}\\b`);
  return strLit.test(CONSUMER_SRC) || propAccess.test(CONSUMER_SRC);
}

describe("Registry-Guard 1 — keine toten Marker/Hooks", () => {
  it("jeder Effekt-Key jeder Registry wird von einem Consumer gelesen", () => {
    const dead = [];
    for (const [key, { count, sample }] of collectEffectKeys()) {
      if (!isConsumed(key)) dead.push(`"${key}" (${sample}${count > 1 ? ` u. ${count - 1} weitere` : ""}) — in keinem Consumer referenziert`);
    }
    expect(dead, `Tote Registry-Marker/Hooks gefunden:\n  ${dead.join("\n  ")}\n→ entweder verdrahten oder aus dem Registry entfernen.`).toEqual([]);
  });
});

/* ---- Guard 2: Phantom-Stufen. Für REGELERSETZUNGS-Familien (nur die höchste Stufe aktiv) darf keine Stufe
        mechanisch identisch zu ihrer Nachbarstufe sein — sonst verspricht der Text mehr, als die Stufe tut.
        Vergleich über eine deterministische ctx-Batterie (Hook-Outputs) + die Wert-Marker (inkl. Funktions-
        Marker wie anchor.at, die über die Positionsdomäne 0..40 ausgewertet werden). ---- */

// Kleiner seedbarer LCG — deterministisch, kein Math.random (bräche die Reproduzierbarkeit).
function lcg(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
const POSFORMS = [
  { mult: 1, formations: [] },
  { mult: 1.25, formations: [{ type: "wiederholung" }] },
  { mult: 1.25, formations: [{ type: "treppe", ordinal: 1 }] },
  { mult: 1.5, formations: [{ type: "treppe", ordinal: 2 }] },
  { mult: 1.8, formations: [{ type: "treppe", ordinal: 3 }] },
  { mult: 1.8, formations: [{ type: "treppe", ordinal: 4 }] },
  { mult: 1.5, formations: [{ type: "wiederholung" }, { type: "treppe", ordinal: 2 }] },
  { mult: 1.25, formations: [{ type: "farbblock" }] },
];
const BATTERY = (() => {
  const r = lcg(0x9e3779b1);
  const pick = (a) => a[Math.floor(r() * a.length)];
  const int = (lo, hi) => lo + Math.floor(r() * (hi - lo + 1));
  return Array.from({ length: 160 }, () => {
    const lastResult = pick(["win", "loss", null]);
    const roleFlag = r() < 0.5; // FIX pro ctx (nicht pro Aufruf) → beide Stufen sehen denselben Wert.
    return {
      winValue: int(0, 12), margin: int(0, 15), winStreak: int(0, 8), wins: int(1, 16),
      hasFormation: r() < 0.5, lastResult, lostLastTrick: lastResult === "loss",
      suitStreak: int(0, 8), recentWinCount: int(0, 5), lastWinValue: r() < 0.8 ? int(0, 12) : null,
      critFollowArmed: r() < 0.5, weaknessArmed: r() < 0.5, weaknessBig: r() < 0.5,
      misfireScore: int(0, 800), rawCrit: 1 + r() * 0.6, posInCycle: int(0, 40),
      sinceWin: int(0, 8), lossStreak: int(0, 5), predValue: r() < 0.8 ? int(0, 12) : null,
      pValueBase: int(0, 12), posForm: pick(POSFORMS), isRole: () => roleFlag,
      triumphActive: r() < 0.5, secondLastResult: pick(["win", "loss", null]),
      segmentLowRank: int(-1, 2), segmentIndex: int(0, 7), trickNo: int(1, 45),
      coverCount: int(0, 24), underBuilding: r() < 0.5, underStructure: r() < 0.5, // Gebäude-Perks (Architekt)
    };
  });
})();

// Verhaltens-Signatur einer Stufen-Def: Funktions-Hooks über die ctx-Batterie ausgewertet, Objekt-Marker mit
// ihren Funktions-Feldern über die Positionsdomäne (anchor.at) — sonst würde JSON.stringify Funktionen verschlucken.
function tierSignature(def) {
  const sig = {};
  for (const [k, v] of Object.entries(def)) {
    if (k === "desc" || STRUCTURAL.has(k)) continue;
    if (typeof v === "function") sig[k] = BATTERY.map((ctx) => { try { const o = v(ctx); return typeof o === "number" ? Math.round(o * 1000) / 1000 : o; } catch { return "ERR"; } });
    else if (v && typeof v === "object") { const sub = {}; for (const [sk, sv] of Object.entries(v)) sub[sk] = typeof sv === "function" ? Array.from({ length: 41 }, (_, p) => !!sv(p)) : sv; sig[k] = sub; }
    else sig[k] = v;
  }
  return JSON.stringify(sig);
}

// Bewusst identische Nachbarstufen (im Registry als §10-Näherung dokumentiert) — jede muss hier explizit stehen,
// damit NEUE, unbeabsichtigte Phantom-Stufen weiter rot werden.
const KNOWN_PHANTOM = new Set(); // (der einzige bewusste Phantom-Eintrag lag bei den Shop-Familien — #229 entfernt)

function phantomPairs(defs) {
  const out = [];
  for (const fam of Object.values(defs)) {
    if (fam.upgradeType !== UPGRADE_TYPES.REPLACEMENT) continue;
    const tiers = [1, 2, 3, 4].filter((t) => fam.tiers[t]);
    for (let i = 0; i < tiers.length - 1; i++) {
      const a = tiers[i], b = tiers[i + 1];
      if (tierSignature(fam.tiers[a]) === tierSignature(fam.tiers[b]) && !KNOWN_PHANTOM.has(`${fam.id}:${a}-${b}`)) {
        out.push(`${fam.id}: Stufe ${a} ≡ Stufe ${b}`);
      }
    }
  }
  return out;
}

describe("Registry-Guard 2 — keine Phantom-Stufen (REGELERSETZUNG)", () => {
  it("Perk-Familien: keine zwei benachbarten Stufen wirken identisch", () => {
    const ph = phantomPairs(FAMILY_DEFS);
    expect(ph, `Phantom-Stufen (mechanisch identisch zur Nachbarstufe, Text verspricht aber mehr):\n  ${ph.join("\n  ")}`).toEqual([]);
  });
  it("Selbsttest: der Guard fängt eine künstlich identische Stufe (keine vacuous-Pass)", () => {
    const R = UPGRADE_TYPES.REPLACEMENT;
    // Zwei mechanisch identische Stufen (gleicher Hook, gleicher Marker) → muss gemeldet werden.
    const dupe = { FAKE: { id: "FAKE", upgradeType: R, tiers: { 1: { scoreFlat: () => 5, tag: 1 }, 2: { scoreFlat: () => 5, tag: 1 } } } };
    expect(phantomPairs(dupe)).toEqual(["FAKE: Stufe 1 ≡ Stufe 2"]);
    // Echt verschiedene Stufen (Hook ODER Marker unterschiedlich) → nichts gemeldet.
    const diffHook = { OK: { id: "OK", upgradeType: R, tiers: { 1: { scoreFlat: () => 5 }, 2: { scoreFlat: () => 9 } } } };
    const diffMark = { OK2: { id: "OK2", upgradeType: R, tiers: { 1: { depth: 1 }, 2: { depth: 2 } } } };
    expect(phantomPairs(diffHook)).toEqual([]);
    expect(phantomPairs(diffMark)).toEqual([]);
  });
});

/* ---- Coverage-Gate: jeder Registry-Eintrag muss namentlich in einem Test vorkommen. ---- */
const TEST_DIR = new URL("./", import.meta.url);
const TEST_BLOB = readdirSync(TEST_DIR)
  .filter((f) => f.endsWith(".test.js") && f !== "registry-guards.test.js")
  .map((f) => readFileSync(new URL(f, TEST_DIR), "utf8"))
  .join("\n");

function uncoveredIds(ids) {
  return ids.filter((id) => !TEST_BLOB.includes(id));
}

describe("Registry-Guard 3 — Coverage-Gate (jeder Eintrag hat einen Test)", () => {
  it("jeder Perk kommt in einem Test vor", () => {
    const missing = uncoveredIds(PERK_LIST.map((p) => p.id));
    expect(missing, `Perks ohne Test: ${missing.join(", ")}`).toEqual([]);
  });
  it("jede Familie kommt in einem Test vor", () => {
    const missing = uncoveredIds(Object.keys(FAMILY_DEFS));
    expect(missing, `Familien ohne Test: ${missing.join(", ")}`).toEqual([]);
  });
  it("jeder Skill kommt in einem Test vor", () => {
    const missing = uncoveredIds(Object.keys(SKILL_DEFS));
    expect(missing, `Skills ohne Test: ${missing.join(", ")}`).toEqual([]);
  });
});
