// Stufenbewusste Greedy-/Explore-Policy (exp skill rework, große Auswertung Feuer/Blitz).
//
// Jede Skill-Option ist ein Arm je (Skill, gewürfelte Stufe): `SK_FIRE_01@2` = Glut auf Sehr selten, Legendäre `…@L`.
// Damit misst das Banditengedächtnis die Stärke JE STUFE, nicht nur je Skill — die Frage „gibt es Ausreißer über die
// Raritäten hinweg" braucht genau diese Auflösung. Kontext-Bucket = aktive Archetypen (wie ucb.js).
//
// Zwei Betriebsarten:
//   explore:true   UCB1 über die Arme (mean + c·√(ln N / n), ungesehen = ∞ → jede Stufe wird sicher probiert).
//                  Belohnt wird am Run-Ende durch den Treiber (runOne mit mem).
//   explore:false  GREEDY: die Option mit dem höchsten gelernten Mittelwert aus einer eingefrorenen Wertetabelle
//                  (buildValueTable) — der „kompetente Spieler", der nimmt, was sich als stark erwiesen hat. Unbekannte
//                  Stufen-Arme fallen auf den Skill-Mittelwert über alle Stufen zurück, dann auf alle Buckets; ganz
//                  Unbekanntes wird nicht gewählt. Kein mem, kein Lernen → gepaarte Ablation (`drop`: ein Skill, der auf
//                  keiner Stufe je gewählt wird) bleibt deterministisch.
// Aufstellung und Architekt spielen greedy (wie factionPolicy) — realistische Läufe, nicht die naive Baseline.
import { randomPolicy, canAddSkill, atDoors, bestDoor } from "./random.js";
import { greedyFormationStep } from "../formation.js";
import { armKey } from "../memory.js";
import { perkOptionId, perkActionFor } from "../families-policy.js";
import { isLegendarySkill } from "../../src/game/skills.js";

export const DECLINE = "__decline__"; // „nichts nehmen" ist eine Entscheidung (eigener Arm, wie in ucb.js)
export const byArchetype = (s) => [...(s.activeArchetypes || [])].sort().join(",") || "none";

// Options-Schlüssel einer angebotenen Skill-Stufe; Legendäre haben keine Stufe.
export const tierKey = (id, tier) => (isLegendarySkill(id) ? `${id}@L` : `${id}@${Number.isInteger(tier) ? tier : 0}`);
export const skillOfOption = (opt) => opt.split("@")[0];
export const tierOfOption = (opt) => { const t = opt.split("@")[1]; return t === "L" ? "L" : Number(t); };

/* Eingefrorene Wertetabelle aus einem Explore-Gedächtnis: mean je (kind, option, bucket) plus die Rückfall-Ebenen
   (Skill über alle Stufen je Bucket · Option über alle Buckets · Skill über alles). Die Ebenen sind n-gewichtet. */
export function buildValueTable(mem) {
  const exact = new Map(), bySkillBucket = new Map(), byOpt = new Map(), bySkill = new Map();
  const acc = (map, key, r) => { const a = map.get(key) || { n: 0, sum: 0 }; a.n += r.n; a.sum += r.mean * r.n; map.set(key, a); };
  for (const kind of ["skill", "perk"]) {
    for (const r of mem.ranking(kind)) {
      if (!r.n) continue;
      acc(exact, armKey(kind, r.id, r.bucket), r);
      acc(byOpt, `${kind}|${r.id}`, r);
      if (kind === "skill" && r.id !== DECLINE) {
        const sid = skillOfOption(r.id);
        acc(bySkillBucket, `${sid}|${r.bucket}`, r);
        acc(bySkill, sid, r);
      }
    }
  }
  const meanOf = (a) => (a && a.n ? a.sum / a.n : null);
  return {
    get(kind, opt, bucket) {
      const m = meanOf(exact.get(armKey(kind, opt, bucket)));
      if (m != null) return m;
      if (kind === "skill" && opt !== DECLINE) {
        const sid = skillOfOption(opt);
        return meanOf(bySkillBucket.get(`${sid}|${bucket}`)) ?? meanOf(byOpt.get(`${kind}|${opt}`)) ?? meanOf(bySkill.get(sid));
      }
      return meanOf(byOpt.get(`${kind}|${opt}`));
    },
    // Stufenblinder Wert eines Skills (über alle Stufen, erst je Bucket, dann gesamt) — für die Türwahl.
    skillValue(sid, bucket) { return meanOf(bySkillBucket.get(`${sid}|${bucket}`)) ?? meanOf(bySkill.get(sid)); },
    // Für Berichte: alle exakten Arme als Zeilen.
    rows() { return [...exact.entries()].map(([key, a]) => ({ key, n: a.n, mean: a.sum / a.n })); },
  };
}

export function greedyPolicy({ explore = true, c = 1.4, table = null, bucket = byArchetype, drop = null,
  solveFormations = true, architectGreedy = true } = {}) {
  if (!explore && !table) throw new Error("greedyPolicy: exploit braucht eine Wertetabelle (buildValueTable)");
  const base = randomPolicy({ architectGreedy });

  function pick(kind, opts, s, mem) {
    const bk = bucket(s);
    let best = null, bestU = -Infinity;
    if (explore) {
      const N = mem.totalPicks(kind) + 1;
      for (const opt of opts) {
        const key = armKey(kind, opt, bk);
        const a = mem.peek(key);
        const u = a.n ? a.sum / a.n + c * Math.sqrt(Math.log(N) / a.n) : Infinity;
        if (u > bestU) { bestU = u; best = { opt, key }; }
      }
      mem.pulled(kind, best.key);
      return best.opt;
    }
    for (const opt of opts) {
      const m = table.get(kind, opt, bk);
      if (m != null && m > bestU) { bestU = m; best = { opt }; }
    }
    return best ? best.opt : opts[0]; // nichts bekannt → erste Option (deterministisch)
  }

  /* Türwahl (stufenblind, wie der Spieler): der Wert eines Skills hinter der Tür ist im Explore der UCB seines über alle
     Stufen zusammengefassten Arms (ungesehen → ∞), im Greedy der gelernte Skill-Mittelwert (unbekannt → nichts). Die Tür
     mit dem besten Skill gewinnt; Gleichstand oder nichts bekannt → Tür 0. Kein mem.pulled — gezogen wird auf dem Angebot. */
  function doorValue(id, s, mem) {
    const bk = bucket(s);
    if (!explore) return table.skillValue(id, bk) ?? -Infinity;
    const N = mem.totalPicks("skill") + 1;
    let n = 0, sum = 0;
    const opts = isLegendarySkill(id) ? [tierKey(id, null)] : Array.from({ length: 4 }, (_, t) => tierKey(id, t));
    for (const opt of opts) { const a = mem.peek(armKey("skill", opt, bk)); n += a.n; sum += a.sum; }
    return n ? sum / n + c * Math.sqrt(Math.log(N) / n) : Infinity;
  }

  const tag = [explore ? "explore" : "greedy", drop && `drop=${drop}`].filter(Boolean).join(",");
  return {
    name: `greedy(${tag})`,
    act(s, rng, mem) {
      if (atDoors(s)) {
        return { type: "CHOOSE_DOOR", index: bestDoor(s, (ids) => Math.max(-Infinity,
          ...ids.filter((id) => id !== drop && canAddSkill(s, id)).map((id) => doorValue(id, s, mem)))) };
      }
      if (s.phase === "levelup" && s.skillOffer) {
        const offered = s.skillOffer.filter((id) => id !== drop && canAddSkill(s, id));
        const opts = [...offered.map((id) => tierKey(id, (s.skillOfferTiers || {})[id])), DECLINE];
        const choice = pick("skill", opts, s, mem);
        return choice === DECLINE ? { type: "DECLINE_SKILL", rng } : { type: "PICK_SKILL", skillId: skillOfOption(choice), rng };
      }
      if (s.phase === "levelup" && s.offer) {
        const ids = s.offer.map(perkOptionId);
        const choice = pick("perk", ids, s, mem);
        return perkActionFor(s.offer[ids.indexOf(choice)], rng);
      }
      if (s.phase === "formation") return solveFormations ? greedyFormationStep(s) : base.act(s, rng, mem);
      return base.act(s, rng, mem);
    },
  };
}
