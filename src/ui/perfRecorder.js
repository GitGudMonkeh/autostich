/* Perf-Recorder (MVP) — läuft im Hintergrund mit und korreliert Frame-Ruckler mit dem, WAS das Spiel
   gerade tut. Nur im Preview-Build aktiv (App startet ihn unter VITE_PREVIEW; sonst sind alle Aufrufe
   billige No-ops). Kein Prod-Einfluss.

   Warum das mehr bringt als das Live-Overlay UND als Chrome-DevTools: es taggt jeden Spike mit dem
   Spiel-Kontext (Stich / Deck-Wechsel / Overlay / Krit / Phase) — die Semantik kennt kein generisches
   Tool. Läuft außerdem auf dem echten Handy, wo DevTools umständlich ist. Bei diesem bereits stark
   optimierten Stand ist Messen wichtiger als Raten: der Report zeigt, welcher Hebel real noch zieht.

   Design (bewusst speicherarm — ein Lauf kann 100k+ Frames haben):
     - Frame-Zeiten NICHT einzeln speichern, sondern in ein 1-ms-Histogramm (→ Perzentile p50/p95/p99).
     - Nur die K schlimmsten Frames voll behalten (mit Kontext-Snapshot).
     - Pro Event-Label eine Aggregat-Zeile (count / jank / worst) → „welche Aktion ruckelt am meisten".
     - Long Tasks (>50 ms, PerformanceObserver) mit Kontext.
   Alles bounded → konstanter Speicher. */

const JANK_MS = 50;        // Frame-Schwelle „spürbarer Ruckler"
const HIST_MAX = 250;      // Histogramm-Obergrenze in ms (darüber: Overflow-Bucket)
const WORST_K = 10;        // so viele schlimmste Frames voll behalten
const MARK_WINDOW_MS = 400;// ein Jank-Frame wird dem letzten Mark innerhalb dieses Fensters zugeschrieben
const LIVE_WIN = 90;       // gleitendes Fenster (Frames) für die Live-Anzeige

const S = {
  running: false, rafId: null, obs: null,
  startT: 0, lastT: 0,
  frames: 0, totalMs: 0,
  hist: null,               // Int32Array(HIST_MAX+1)
  jank: 0, worstMs: 0,
  worst: [],                // [{ms, t, ctx}] — Top-K, aufsteigend sortiert
  byEvent: new Map(),       // label -> {count, jank, worstMs}
  ctx: { phase: "?", trick: 0, cycle: 0 }, // fortlaufender Kontext (perfMark merged rein)
  lastMark: { label: null, t: 0 },
  lt: { count: 0, totalMs: 0, worstMs: 0, worst: [] }, // Long Tasks
  mem: { start: 0, peak: 0, end: 0 },
  live: [],                 // Ring der letzten LIVE_WIN Frame-Dauern
};

function now() { return performance.now(); }

function onFrame(t) {
  const dt = t - S.lastT; S.lastT = t;
  S.frames++; S.totalMs += dt;
  const b = Math.min(HIST_MAX, Math.max(0, Math.round(dt)));
  S.hist[b]++;
  S.live.push(dt); if (S.live.length > LIVE_WIN) S.live.shift();
  if (dt > S.worstMs) S.worstMs = dt;

  if (dt > JANK_MS) {
    S.jank++;
    // Kontext-Snapshot: laufender Kontext + jüngster Mark (falls frisch)
    const fresh = S.lastMark.label && (t - S.lastMark.t) <= MARK_WINDOW_MS ? S.lastMark.label : null;
    const ctx = { ...S.ctx, at: fresh };
    // Top-K schlimmste Frames pflegen (kleiner sortierter Array)
    if (S.worst.length < WORST_K || dt > S.worst[0].ms) {
      S.worst.push({ ms: Math.round(dt), t: Math.round(t - S.startT), ctx });
      S.worst.sort((a, b2) => a.ms - b2.ms);
      if (S.worst.length > WORST_K) S.worst.shift();
    }
    // Event-Korrelation: dem jüngsten frischen Mark zuschreiben, sonst der Phase
    const key = fresh || `phase:${S.ctx.phase}`;
    const e = S.byEvent.get(key) || { count: 0, jank: 0, worstMs: 0 };
    e.jank++; if (dt > e.worstMs) e.worstMs = Math.round(dt);
    S.byEvent.set(key, e);
  }

  if (performance.memory) {
    const mb = performance.memory.usedJSHeapSize / 1048576;
    if (mb > S.mem.peak) S.mem.peak = mb;
    S.mem.end = mb;
  }
  S.rafId = requestAnimationFrame(onFrame);
}

export function startPerf() {
  if (S.running) return;
  S.running = true;
  S.hist = new Int32Array(HIST_MAX + 1);
  S.startT = S.lastT = now();
  S.frames = 0; S.totalMs = 0; S.jank = 0; S.worstMs = 0;
  S.worst = []; S.byEvent = new Map(); S.live = [];
  S.lt = { count: 0, totalMs: 0, worstMs: 0, worst: [] };
  S.mem = { start: performance.memory ? performance.memory.usedJSHeapSize / 1048576 : 0, peak: 0, end: 0 };
  S.mem.peak = S.mem.start;
  try {
    S.obs = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        S.lt.count++; S.lt.totalMs += entry.duration;
        if (entry.duration > S.lt.worstMs) S.lt.worstMs = entry.duration;
        // Frische-Regel wie im Frame-Pfad: ein Mark taggt nur, wenn er innerhalb von MARK_WINDOW_MS liegt —
        // sonst klebte hier der letzte Mark aus einer ganz anderen Phase (Minuten alt) am Long Task.
        const t = now();
        const fresh = S.lastMark.label && (t - S.lastMark.t) <= MARK_WINDOW_MS ? S.lastMark.label : null;
        S.lt.worst.push({ ms: Math.round(entry.duration), t: Math.round(t - S.startT), ctx: { ...S.ctx, at: fresh } });
        S.lt.worst.sort((a, b) => a.ms - b.ms);
        if (S.lt.worst.length > WORST_K) S.lt.worst.shift();
      }
    });
    S.obs.observe({ entryTypes: ["longtask"] });
  } catch { S.obs = null; } // longtask nicht überall unterstützt (z. B. Safari) → weglassen
  S.rafId = requestAnimationFrame(onFrame);
}

export function stopPerf() {
  S.running = false;
  if (S.rafId != null) cancelAnimationFrame(S.rafId);
  if (S.obs) { try { S.obs.disconnect(); } catch {} S.obs = null; }
}

export function resetPerf() { const was = S.running; stopPerf(); if (was) startPerf(); }

/* Vom Spiel bei relevanten Events aufgerufen. label = grobe Kategorie („trick", „deck-switch",
   „overlay:options"); detail (optional) merged in den laufenden Kontext (phase/trick/cycle). */
export function perfMark(label, detail) {
  if (!S.running) return;
  const t = now();
  if (detail) Object.assign(S.ctx, detail);
  S.lastMark = { label, t };
  const e = S.byEvent.get(label) || { count: 0, jank: 0, worstMs: 0 };
  e.count++; S.byEvent.set(label, e);
}

function pct(p) {
  const target = S.frames * p;
  let acc = 0;
  for (let ms = 0; ms <= HIST_MAX; ms++) { acc += S.hist[ms]; if (acc >= target) return ms; }
  return HIST_MAX;
}

export function getLive() {
  if (!S.running || S.live.length === 0) return { fps: 0, p95: 0, jank: S.jank };
  const sorted = [...S.live].sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
  return { fps: Math.round((sorted.length * 1000) / sum), p95: Math.round(p95), jank: S.jank };
}

export function getReport() {
  const durS = (S.lastT - S.startT) / 1000;
  const byEvent = [...S.byEvent.entries()]
    .map(([label, e]) => ({ label, count: e.count, jank: e.jank, worstMs: e.worstMs }))
    .filter((e) => e.jank > 0 || e.worstMs > 0)
    .sort((a, b) => b.worstMs - a.worstMs);
  return {
    durationS: +durS.toFixed(1),
    frames: S.frames,
    avgFps: durS > 0 ? +(S.frames / durS).toFixed(1) : 0,
    frameMs: { p50: pct(0.5), p95: pct(0.95), p99: pct(0.99), worst: Math.round(S.worstMs) },
    jankFrames: S.jank,
    jankPerMin: durS > 0 ? +((S.jank / durS) * 60).toFixed(1) : 0,
    // #perf: Die schlimmsten Long Tasks MIT Kontext ausgeben. Sie wurden immer schon gesammelt, aber nie
    // ausgeliefert — ein Report mit „36 Long Tasks · 2693 ms" nannte damit den größten Einzelposten, ohne zu
    // sagen, WO er anfällt. Long Tasks blockieren den Hauptthread am Stück und erklären die dicksten Frames.
    longTasks: { count: S.lt.count, worstMs: Math.round(S.lt.worstMs), totalMs: Math.round(S.lt.totalMs),
      worst: [...S.lt.worst].reverse().map((w) => ({ ms: w.ms, atS: w.t != null ? +(w.t / 1000).toFixed(1) : null, ctx: w.ctx })) },
    worstFrames: [...S.worst].reverse().map((w) => ({ ms: w.ms, atS: +(w.t / 1000).toFixed(1), ctx: w.ctx })),
    byEvent,
    memoryMB: performance.memory ? { start: +S.mem.start.toFixed(0), peak: +S.mem.peak.toFixed(0), end: +S.mem.end.toFixed(0) } : null,
  };
}

/* Lesbare Konsolen-Zusammenfassung. dump=true → auch in die Konsole loggen (Auto-Dump bei Game-Over). */
export function formatReport(r = getReport()) {
  const lines = [];
  lines.push(`── PERF-REPORT · ${r.durationS}s · ${r.frames} Frames · Ø ${r.avgFps} FPS ──`);
  lines.push(`Frame-Zeit  p50 ${r.frameMs.p50}ms · p95 ${r.frameMs.p95}ms · p99 ${r.frameMs.p99}ms · max ${r.frameMs.worst}ms`);
  lines.push(`Jank (>${JANK_MS}ms): ${r.jankFrames} Frames (${r.jankPerMin}/min) · LongTasks: ${r.longTasks.count} (max ${r.longTasks.worstMs}ms)`);
  if (r.memoryMB) lines.push(`Heap: ${r.memoryMB.start}→${r.memoryMB.end} MB (Peak ${r.memoryMB.peak} MB)`);
  if (r.byEvent.length) {
    lines.push(`Ruckler nach Event (schlimmster zuerst):`);
    for (const e of r.byEvent.slice(0, 8)) lines.push(`   ${e.label.padEnd(20)} jank ${e.jank}× · max ${e.worstMs}ms · ${e.count}× ausgelöst`);
  }
  if (r.longTasks.worst && r.longTasks.worst.length) {
    lines.push(`Schlimmste Long Tasks (blockierter Hauptthread):`);
    for (const w of r.longTasks.worst.slice(0, 5)) lines.push(`   ${String(w.ms).padStart(4)}ms @${w.atS}s  [${w.ctx.at || "phase:" + w.ctx.phase} · c${w.ctx.cycle}·t${w.ctx.trick}]`);
  }
  if (r.worstFrames.length) {
    lines.push(`Schlimmste Frames:`);
    for (const w of r.worstFrames.slice(0, 6)) lines.push(`   ${String(w.ms).padStart(4)}ms @${w.atS}s  [${w.ctx.at || "phase:" + w.ctx.phase} · c${w.ctx.cycle}·t${w.ctx.trick}]`);
  }
  return lines.join("\n");
}
