/* #172 FB-10 — Statistik-Hub: reine, deterministische Aggregation über die Lauf-Historie
   (`storage.loadRunHistory()`). Kein React, kein localStorage, kein Date/Math.random → unit-testbar
   (test/runStats.test.js). Die UI (StatsScreen.jsx) mappt IDs/Keys auf Labels/Icons; hier fällt nur
   Zahlen-/ID-Material an. Alle Record-Felder sind optional → fehlende Werte zählen als 0 bzw. werden
   übersprungen (Alt-/Teil-Records degradieren sauber).

   „Score-Herkunft" ist bewusst PRAGMATISCH aus den bereits getrackten Feldern (#161 FB-2 / #169 FB-8):
   formationScore + critBonusScore, Rest = Score − beide. Eine feinere 5-Quellen-Zerlegung
   (Serie/Flats/Ionisierung/Hitze) bräuchte einen Engine-Akkumulator und ist bewusst später. */

// Ab wie vielen Läufen sind Best-Works-Insights belastbar (Kleinserien-Schutz, Issue-Abnahme).
export const MIN_SAMPLE = 8;

const num = (v) => (typeof v === "number" && !Number.isNaN(v) ? v : 0);
const clamp0 = (v) => Math.max(0, num(v));
const avg = (arr) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0);
const uniq = (arr) => [...new Set(Array.isArray(arr) ? arr : [])];

export function hasEnoughData(history = []) {
  return history.length >= MIN_SAMPLE;
}

/* Score-Herkunft EINES Laufs (absolut): Formationen / Crits / Übrige.
   „Übrige" fängt Basis, Serie, Flats etc. ab und wird nie negativ (Rundungs-/Alt-Daten-sicher). */
export function scoreOrigin(r = {}) {
  const score = clamp0(r.score);
  const formations = Math.min(score, clamp0(r.formationScore));
  const crits = Math.min(score - formations, clamp0(r.critBonusScore));
  const rest = Math.max(0, score - formations - crits);
  return { formations, crits, rest, total: score };
}

/* Ø Score-Herkunft über eine Menge Läufe — als absolute Ø-Werte UND als Anteile (0..1) am Ø-Gesamt. */
export function avgScoreOrigin(history = []) {
  if (!history.length) return { formations: 0, crits: 0, rest: 0, total: 0, shares: { formations: 0, crits: 0, rest: 0 } };
  const o = history.map(scoreOrigin);
  const formations = avg(o.map((x) => x.formations));
  const crits = avg(o.map((x) => x.crits));
  const rest = avg(o.map((x) => x.rest));
  const total = formations + crits + rest;
  const share = (v) => (total > 0 ? v / total : 0);
  return { formations, crits, rest, total, shares: { formations: share(formations), crits: share(crits), rest: share(rest) } };
}

/* Pick-Raten für ein ID-Feld ("perks" | "skills"): wie oft & in welchem Anteil der Läufe gewählt.
   Absteigend nach Häufigkeit. */
export function pickRates(history = [], key = "perks") {
  const n = history.length || 1;
  const counts = {};
  for (const r of history) for (const id of uniq(r[key])) counts[id] = (counts[id] || 0) + 1;
  return Object.entries(counts)
    .map(([id, count]) => ({ id, count, rate: count / n }))
    .sort((a, b) => b.count - a.count || String(a.id).localeCompare(String(b.id)));
}

/* Archetyp-Nutzung über die Läufe: Anzahl Läufe je Archetyp (unique/Lauf), Anteil & Ø-Score. */
export function archetypeUsage(history = []) {
  const n = history.length || 1;
  const g = {};
  for (const r of history) for (const a of uniq(r.archetypes)) (g[a] ||= []).push(clamp0(r.score));
  return Object.entries(g)
    .map(([arch, scores]) => ({ arch, count: scores.length, rate: scores.length / n, avgScore: avg(scores) }))
    .sort((a, b) => b.count - a.count);
}

/* Bester Archetyp nach Ø-Score (Kleinserien-Schutz: mind. `minRuns` Läufe je Archetyp). */
export function bestArchetype(history = [], { minRuns = 3 } = {}) {
  return archetypeUsage(history)
    .filter((x) => x.count >= minRuns)
    .sort((a, b) => b.avgScore - a.avgScore);
}

/* Score-Lift eines Elements: Ø-Score der Läufe MIT vs. OHNE das Element (Lift = Differenz).
   Nur aussagekräftig, wenn genug Läufe MIT (`minWith`) UND mind. ein Lauf OHNE existieren →
   keine Signal-Vortäuschung bei „immer/nie gewählt". Absteigend nach Lift. */
export function scoreLift(history = [], key = "perks", { minWith = 3 } = {}) {
  const ids = new Set();
  for (const r of history) for (const id of uniq(r[key])) ids.add(id);
  const out = [];
  for (const id of ids) {
    const withR = history.filter((r) => uniq(r[key]).includes(id));
    const without = history.filter((r) => !uniq(r[key]).includes(id));
    if (withR.length < minWith || without.length < 1) continue;
    const avgWith = avg(withR.map((r) => clamp0(r.score)));
    const avgWithout = avg(without.map((r) => clamp0(r.score)));
    out.push({ id, lift: avgWith - avgWithout, avgWith, avgWithout, count: withR.length });
  }
  return out.sort((a, b) => b.lift - a.lift);
}

/* Score-Herkunft der besten `n` Läufe (Rekord-Läufe) — Ø-Anteile, für „woraus zogen die Top-Läufe Score?". */
export function topRunsOrigin(history = [], n = 3) {
  const top = [...history].sort((a, b) => clamp0(b.score) - clamp0(a.score)).slice(0, n);
  return { runs: top.length, ...avgScoreOrigin(top) };
}

/* Der Rekord-Lauf (höchster Score) — für die „Bestes Build"-Karte. null bei leerer Historie. */
export function bestRun(history = []) {
  if (!history.length) return null;
  return [...history].sort((a, b) => clamp0(b.score) - clamp0(a.score))[0];
}

/* Meilensteine/Achievements (#172) — abgeleitet aus Profil-Totals + Historie. Rein deskriptiv.
   `target`/`cur` erlauben eine Fortschrittsanzeige; `done` = erreicht. */
export function achievements(history = [], profile = {}) {
  const games = num(profile.games);
  const best = num(profile.bestScore);
  const streak = num(profile.bestStreak);
  const crits = num(profile.maxCrits);
  const archCount = uniq(profile.archetypesEver).length;
  const mk = (id, icon, label, desc, cur, target) => ({ id, icon, label, desc, cur, target, done: cur >= target });
  return [
    mk("first", "🎬", "Erster Lauf", "Spiele deinen ersten Lauf.", games, 1),
    mk("ten", "🎯", "Dranbleiber", "Spiele 10 Läufe.", games, 10),
    mk("veteran", "🏅", "Veteran", "Spiele 25 Läufe.", games, 25),
    mk("score100k", "💰", "Punktejäger", "Erreiche 100.000 Score in einem Lauf.", best, 100000),
    mk("score500k", "👑", "Score-Gott", "Erreiche 500.000 Score in einem Lauf.", best, 500000),
    mk("streak20", "🔥", "Serienkönig", "Erreiche eine Serie von 20.", streak, 20),
    mk("crit50", "⚡", "Kritmeister", "Lande 50 Crits in einem Lauf.", crits, 50),
    mk("allArch", "🌈", "Allrounder", "Spiele alle 3 Archetypen mindestens einmal.", archCount, 3),
  ];
}
