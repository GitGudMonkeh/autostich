/* Wochen-Seed (Schritt 6 · Meister-Rangliste) — REIN & node-testbar (kein RNG/localStorage; Date wird als Argument
   hereingereicht, damit Tests deterministisch sind).

   Idee: der Meister-Modus spielt jede Woche EINEN für ALLE gleichen Seed. Damit weltweit alle denselben Seed +
   dieselbe Wochengrenze sehen, rechnen wir in UTC nach ISO-8601 (Woche beginnt Montag, Woche 1 = die mit dem ersten
   Donnerstag). Der Seed wird deterministisch aus (ISO-Jahr, ISO-Woche) gehasht → ein uint32 (kompatibel zum
   Seed-System, formatSeed/parseSeed in rng.js). Standard-Modus nutzt KEINEN Wochen-Seed (zufällig, Allzeit-Board). */

const WEEK_MS = 7 * 86400000;

// ISO-8601-Woche + zugehöriges ISO-Jahr (in UTC). Rückgabe { week: 1..53, year }.
export function isoWeek(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = (d.getUTCDay() + 6) % 7;            // Mo=0 … So=6
  d.setUTCDate(d.getUTCDate() - day + 3);         // auf den Donnerstag dieser Woche (bestimmt das ISO-Jahr)
  const year = d.getUTCFullYear();
  const firstThu = new Date(Date.UTC(year, 0, 4)); // 4. Januar liegt immer in Woche 1
  const firstDay = (firstThu.getUTCDay() + 6) % 7;
  firstThu.setUTCDate(firstThu.getUTCDate() - firstDay + 3);
  const week = 1 + Math.round((d.getTime() - firstThu.getTime()) / WEEK_MS);
  return { week, year };
}

// (ISO-Jahr, ISO-Woche) → deterministischer uint32-Seed. xorshift-Mix für gute Streuung; nie 0.
export function weekSeed(wy) {
  let h = (((wy.year >>> 0) * 53 + (wy.week >>> 0)) >>> 0) || 1;
  h ^= h << 13; h >>>= 0;
  h ^= h >>> 17;
  h ^= h << 5;  h >>>= 0;
  return (h >>> 0) || 1;
}

export const weekLabel = (wy) => `Woche ${wy.week} · ${wy.year}`;
export const weekLabelShort = (wy) => `W${wy.week} · ${wy.year}`;

// Ende der aktuellen ISO-Woche in UTC = Sonntag 23:59:59.999 (nächster Reset-Zeitpunkt).
export function weekEndUTC(date) {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = (d.getUTCDay() + 6) % 7;            // Mo=0 … So=6
  d.setUTCDate(d.getUTCDate() + (6 - day));       // auf den Sonntag dieser Woche
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

// Millisekunden bis zum Wochen-Reset (>= 0).
export const msUntilWeekEnd = (date) => Math.max(0, weekEndUTC(date).getTime() - date.getTime());

// Kompaktinfo zur aktuellen Woche (fürs UI): { week, year, seed, label, labelShort, endUTC }.
export function currentWeek(date) {
  const wy = isoWeek(date);
  return { ...wy, seed: weekSeed(wy), label: weekLabel(wy), labelShort: weekLabelShort(wy), endUTC: weekEndUTC(date) };
}

// Die letzten `n` ABGESCHLOSSENEN Wochen (vor der aktuellen), jüngste zuerst — Basis fürs Champions-Archiv.
export function pastWeeks(date, n) {
  const out = [];
  for (let i = 1; i <= n; i++) {
    const wy = isoWeek(new Date(date.getTime() - i * WEEK_MS));
    out.push({ ...wy, seed: weekSeed(wy), label: weekLabel(wy), labelShort: weekLabelShort(wy) });
  }
  return out;
}
