import { SKILL_DEFS, isLegendarySkill } from "../skills.js";
import { ROLES, TIER_MULT, GEO_LINIE, neighbors4, neighbors8, EISZEIT_BURST_PER } from "../glacier.js";

/* ============================================================
   EIS — Fraktionsmodul (exp skill rework, docs/skill-rework.md §5). Reine Logik: kein React, kein Math.random.

   Die MECHANIK liegt in glacier.js (Masse, Schwellen, Bruch, Geometrien, Legendäre) und ist skill-frei: das Fundament
   läuft, sobald eine Karte als Gletscher festgefroren ist. Dieses Modul liefert nur die ZAHLEN, mit denen die 15 Skills
   das Fundament verstellen — aus den Stufentabellen in SKILL_DEFS (`tiers[0..3]`, Normal … Episch).

   Warum eine Rollen-Tabelle statt der Skill-IDs: die Engine fragt an zwei Dutzend Stellen `glacierRoles.includes(…)`,
   und die Tests bauen ihre Szenarien über genau diese Rollen. `iceTuning` bleibt deshalb auf derselben Achse — Rollen
   rein, Zahlen raus — und nimmt die Stufe je Rolle als zweites Argument. Fehlt sie, gilt Normal.
   ============================================================ */

// Skill-IDs der Fraktion — lesbare Namen für Modul, Engine und Tests. (§5.2 gestrichen: SK_ICE_05 Verschmelzen,
// SK_ICE_12 Zermalmen, SK_ICE_L04 Erstarrung.)
export const I = Object.freeze({
  ANFRIEREN: "SK_ICE_01", SCHNEETREIBEN: "SK_ICE_02", DAUERFROST: "SK_ICE_03", VERDICHTUNG: "SK_ICE_04",
  PACKEIS: "SK_ICE_06", EISBRUECKE: "SK_ICE_07", EISWALL: "SK_ICE_08", VERZAHNUNG: "SK_ICE_09",
  ABBRUCHKANTE: "SK_ICE_10", KETTENBRUCH: "SK_ICE_11", RISSBILDUNG: "SK_ICE_13", GLETSCHERSTURZ: "SK_ICE_14",
  EINFRIEREN: "SK_ICE_15", FROSTBUND: "SK_ICE_16", EISPANZER: "SK_ICE_17",
  EISZEIT: "SK_ICE_L01", EWIGES_SCHILD: "SK_ICE_L02", GROSSE_LAWINE: "SK_ICE_L03",
});

// Rolle → Skill-ID. Eine Quelle: aus der Registry gelesen, damit ein umgehängtes `role` nicht stillschweigend driftet.
export const ROLE_SKILL = Object.freeze(Object.fromEntries(
  Object.values(SKILL_DEFS).filter((s) => s.archetype === "ice" && s.role).map((s) => [s.role, s.id]),
));

/* Die Stufenzeile einer Rolle. `roleTiers` ist die im Lauf gehaltene Stufe je Rolle (Reducer seedet sie beim Pick);
   fehlt ein Eintrag, gilt Normal — so bleibt ein Szenario, das nur Rollen setzt, gültig und liest die unterste Stufe. */
export function iceRow(role, roleTiers = {}) {
  const def = SKILL_DEFS[ROLE_SKILL[role]];
  if (!def || !def.tiers) return null;
  const t = roleTiers[role];
  return def.tiers[Number.isInteger(t) ? Math.min(Math.max(t, 0), def.tiers.length - 1) : 0];
}

/* Alle Zahlen der aktiven Rollen in einem Objekt — einmal je Stich gebaut, von der Engine und vom Snapshot gelesen.
   Nur gehaltene Rollen stehen darin; die Engine gattert ohnehin über `glacierRoles.includes(…)`. */
export function iceTuning(roles = [], roleTiers = {}) {
  const row = (role) => (roles.includes(role) ? iceRow(role, roleTiers) : null);
  const a = row(ROLES.ANFRIEREN), s = row(ROLES.SCHNEETREIBEN), d = row(ROLES.DAUERFROST), v = row(ROLES.VERDICHTUNG);
  const pk = row(ROLES.PACKEIS), eb = row(ROLES.EISBRUECKE), ew = row(ROLES.EISWALL), vz = row(ROLES.VERZAHNUNG);
  const ab = row(ROLES.ABBRUCHKANTE), kb = row(ROLES.KETTENBRUCH), ri = row(ROLES.RISSBILDUNG), gs = row(ROLES.GLETSCHERSTURZ);
  const ef = row(ROLES.EINFRIEREN), fb = row(ROLES.FROSTBUND), ep = row(ROLES.EISPANZER);
  return {
    anfrierenMass: a ? a.mass : 0,
    anfrierenForm: a && a.form ? a.form : 0,
    schneetreibenSeed: s ? s.seed : 0,
    schneetreibenFields: s ? s.fields : 0,
    dauerfrostNear: d ? d.near : 0,
    dauerfrostFar: d ? d.far : 0,
    verdichtungRate: v ? v.rate : 0,
    packeisPer: pk ? pk.per : 0,
    eisbrueckeWeight: eb ? eb.weight : 1,
    eiswallLinie: ew ? ew.linie : GEO_LINIE,
    verzahnungPer: vz ? vz.per : 0,
    abbruchTierMult: ab ? [TIER_MULT[0], TIER_MULT[1], ab.t2, ab.t3] : null,
    kettenbruchDepth: kb ? kb.depth : 0,
    rissbildungBurstAt: ri ? ri.burstAt : 0,
    gletschersturzPer: gs ? gs.per : 0,
    einfrierenCards: ef ? ef.cards : 0,
    frostbundBuff: fb ? fb.buff : 0,
    eispanzerMass: ep ? ep.mass : 0,
  };
}

/* Snapshot-Optionen für precomputeGlacier — die Rollen, die den Bruch selbst verstellen (docs §4 Lawine).
   Ersetzt das frühere `glacierOpts(roles)` in glacier.js: dort standen die Zahlen fest, hier kommen sie aus der Stufe. */
export function iceSnapshotOpts(roles = [], tune = null) {
  const t = tune || iceTuning(roles, {});
  const opts = {};
  if (roles.includes(ROLES.RISSBILDUNG)) opts.burstAt = t.rissbildungBurstAt;   // bricht schon bei niedriger Masse
  if (roles.includes(ROLES.ABBRUCHKANTE)) opts.tierMult = t.abbruchTierMult;
  if (roles.includes(ROLES.EISBRUECKE)) { opts.neighborFn = neighbors8; opts.diagWeight = t.eisbrueckeWeight; }
  if (roles.includes(ROLES.KETTENBRUCH)) opts.kettenbruchDepth = t.kettenbruchDepth;
  if (roles.includes(ROLES.GLETSCHERSTURZ)) opts.gletschersturzPer = t.gletschersturzPer;
  // L_LAWINE (Große Lawine) wird NICHT hier gesetzt — sie ist ein EINMALIGER Finisher, die Engine schaltet sie nur im
  // letzten Durchlauf ein (sonst verhinderte sie das Horten).
  if (roles.includes(ROLES.L_SCHILD)) opts.ewigesSchild = true;                 // Legendär: Übergletscher (Dauer-Zustand)
  if (roles.includes(ROLES.L_EISZEIT)) opts.eiszeitBurstPer = EISZEIT_BURST_PER; // Legendär: Bruch × offene Nachbarn (§5.16)
  return opts;
}

// Aktive Nachbarschaftsfunktion: mit Eisbrücke die 8er, sonst die 4er. (Cluster/Frostbund lesen sie.)
export const iceNeighborFn = (roles = []) => (roles.includes(ROLES.EISBRUECKE) ? neighbors8 : neighbors4);

// Stufe je Rolle aus den gehaltenen Skills und ihren Stufen — der Reducer legt das Ergebnis in state.glacierRoleTiers.
export function iceRoleTiers(skills = [], skillTiers = {}) {
  const out = {};
  for (const id of skills) {
    const def = SKILL_DEFS[id];
    if (!def || def.archetype !== "ice" || !def.role || isLegendarySkill(id)) continue;
    out[def.role] = Number.isInteger(skillTiers[id]) ? skillTiers[id] : 0;
  }
  return out;
}
