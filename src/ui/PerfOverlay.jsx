import { useState, useEffect } from "react";
import { startPerf, stopPerf, resetPerf, getLive, getReport, formatReport } from "./perfRecorder.js";
import { t } from "../i18n/index.js"; // #sprache

/* Perf-HUD + Report-Steuerung — NUR im Preview-Build (Gate in App.jsx: VITE_PREVIEW === "1").
   Landet NICHT im echten Spiel. Startet den Hintergrund-Recorder (perfRecorder.js), zeigt live:
     FPS · p95-Frame-Zeit · kumulierte Jank-Frames (>50 ms)
   Buttons:
     ⧉ Report → volle Zusammenfassung in die Konsole + JSON in die Zwischenablage (auf dem Handy
                per Remote-Debug/„Copy" teilbar). ↺ Reset → Messung neu starten.
     FX:PIXI/DOM → A/B-Umschalter für die Feld-Effekt-Render-Schicht (GPU-Emitter vs. DOM), setzt
                localStorage as_fx + lädt neu → Vorher/Nachher direkt vergleichbar.
   Auto-Dump bei Game-Over macht App (formatReport-Aufruf), damit ein Lauf immer eine Bilanz hinterlässt. */

// A/B-Umschalter für die Feld-Effekte (spiegelt FX_RENDERER in Battlefield.jsx: URL-Param ?fx hat Vorrang,
// dann localStorage as_fx, Standard "pixi"). Toggle schreibt localStorage + räumt einen fixen URL-Param auf
// (sonst würde der den localStorage-Wert nach dem Reload überstimmen) und lädt neu.
function readFxMode() {
  try {
    const q = new URLSearchParams(window.location.search).get("fx");
    if (q === "pixi" || q === "dom") return q;
    const ls = window.localStorage?.getItem("as_fx");
    if (ls === "pixi" || ls === "dom") return ls;
  } catch { /* kein window → Standard */ }
  return "pixi";
}
// #desktop: Viewport-Readout. Beim Desktop-Layout-Pass muss jederzeit ablesbar sein, in WELCHEM CSS-Viewport
// gerade geprüft wird — das eigene Entwicklerfenster ist dafür unbrauchbar: auf einem hochskalierten oder
// ultrabreiten Monitor weicht es stark von dem ab, was ein Standardspieler sieht. Merkposten des Zielbands:
// 1920 = Anker (1080p bei 100 %) · 1536 = dasselbe Gerät bei 125 % Windows-Skalierung · 1280 = unteres Bandende.
// Trifft die Breite einen davon, färbt sich die Anzeige grün — sonst grau („du misst gerade irgendwas").
// DPR steht daneben, weil die Skalierung die zweite Hälfte des Unterschieds ausmacht und sonst unsichtbar bleibt.
const VIEWPORT_MARKS = [1920, 1536, 1280];
function readViewport() {
  return {
    w: Math.round(window.innerWidth),
    h: Math.round(window.innerHeight),
    // Auf 2 Stellen gerundet: Browser-Zoom erzeugt sonst Zahlen wie 1.2000000476837158.
    dpr: Math.round((window.devicePixelRatio || 1) * 100) / 100,
  };
}
function toggleFxMode() {
  const next = readFxMode() === "pixi" ? "dom" : "pixi";
  try {
    window.localStorage?.setItem("as_fx", next);
    const url = new URL(window.location.href);
    if (url.searchParams.has("fx")) { url.searchParams.set("fx", next); window.location.href = url.toString(); return; }
  } catch { /* localStorage/URL nicht verfügbar → einfacher Reload */ }
  window.location.reload();
}
/* #kompositor-Zustand aus der URL (`?fx2=1`, optional `?fxs=<zahl>`). Bewusst NICHT aus FieldLayer importiert:
   das HUD soll den Zustand ANZEIGEN, nicht den Effekt-Chunk in den Preview-Pfad ziehen. */
function readFx2() {
  try {
    const q = new URLSearchParams(window.location.search);
    const s = parseFloat(q.get("fxs"));
    return { on: q.get("fx2") === "1", scale: Number.isFinite(s) ? s : null };
  } catch { return { on: false, scale: null }; }
}
function toggleFx2() {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete("fx2");
    url.searchParams.delete("fxs");
    window.location.href = url.toString();
  } catch { window.location.reload(); }
}

export function PerfOverlay() {
  const [live, setLive] = useState({ fps: 0, p95: 0, jank: 0 });
  const [copied, setCopied] = useState(false);
  const [vp, setVp] = useState(readViewport);

  useEffect(() => {
    startPerf();
    const id = setInterval(() => setLive(getLive()), 500);
    return () => { clearInterval(id); stopPerf(); };
  }, []);

  // Zwei Quellen, weil eine allein lügt:
  //   • `resize` am window — deckt echtes Fensterziehen ab UND reine DPR-Wechsel (Browser-Zoom, Fenster auf einen
  //     anders skalierten Monitor gezogen), bei denen sich die Pixelmaße gar nicht ändern.
  //   • ResizeObserver am <html> — deckt Viewport-Wechsel ab, die OHNE resize-Event passieren: die
  //     Geräte-Emulation der DevTools bzw. ein per CDP gesetzter Viewport meldet sich nicht am window.
  //     Genau der Fall beim Desktop-Layout-Pass — sonst zeigt das Readout die vorige Auflösung und
  //     ein Screenshot behauptet, bei 1920 entstanden zu sein, obwohl er es nicht ist.
  useEffect(() => {
    const onResize = () => setVp(readViewport());
    window.addEventListener("resize", onResize);
    const ro = new ResizeObserver(onResize);
    ro.observe(document.documentElement);
    return () => { window.removeEventListener("resize", onResize); ro.disconnect(); };
  }, []);

  const doReport = () => {
    const r = getReport();
     
    console.log("%c" + formatReport(r), "font-family:monospace");
     
    console.log("PERF_JSON", r);
    try {
      navigator.clipboard?.writeText(JSON.stringify(r, null, 2));
      setCopied(true); setTimeout(() => setCopied(false), 1200);
    } catch { /* Clipboard braucht ggf. sicheren Kontext — Konsole hat den Report ohnehin */ }
  };

  const col = live.fps >= 55 ? "#5ab87a" : live.fps >= 30 ? "#d4a63a" : "#e0605a";
  const btn = {
    pointerEvents: "auto", cursor: "pointer", background: "#1a1a21", color: "#c8c8d0",
    border: "1px solid #33333e", borderRadius: 4, padding: "1px 5px", font: "inherit",
  };
  const vpCol = VIEWPORT_MARKS.includes(vp.w) ? "#5ab87a" : "#8a8a92";  // grün = auf einem Prüfpunkt des Zielbands
  const fxMode = readFxMode();                            // aktueller Feld-Effekt-Renderer (pixi/dom)
  const fxCol = fxMode === "pixi" ? "#35e0ff" : "#e0a35a";
  const { on: fx2, scale: fx2Scale } = readFx2();         // #kompositor: läuft er, und mit welchem Faktor
  return (
    <div
      className="fixed top-2 right-2 z-50 flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold font-pixel tracking-wide"
      style={{ background: "#141419dd", border: `1px solid ${col}55`, pointerEvents: "none" }}
      aria-hidden="true"
    >
      <span style={{ color: col }}>{live.fps} FPS</span>
      <span style={{ color: "#8a8a92" }}>· p95 {live.p95}ms · jank {live.jank}</span>
      <span style={{ color: vpCol }}>· {vp.w}×{vp.h}</span>
      <span style={{ color: "#8a8a92" }}>· DPR {vp.dpr}</span>
      <button style={btn} onClick={doReport} title={t("perf.report")}>{copied ? "✓" : "⧉"}</button>
      <button style={btn} onClick={resetPerf} title={t("perf.reset")}>↺</button>
      <button style={{ ...btn, color: fxCol, borderColor: `${fxCol}66` }} onClick={toggleFxMode}
        title="Feld-Effekt-Renderer umschalten (GPU-Emitter ↔ DOM) + neu laden">FX:{fxMode === "pixi" ? "PIXI" : "DOM"}</button>
      {/* #kompositor: OB der Kompositor läuft und mit WELCHEM Auflösungsfaktor. Ohne diese Anzeige ist jedes Urteil
          über einen Effekt zweideutig — „sieht grob aus" heißt je nach Schalterstellung etwas völlig anderes, und
          man kann es dem Bildschirmfoto nicht ansehen. Erscheint nur, wenn `?fx2=1` gesetzt ist. */}
      {fx2 && (
        <button style={{ ...btn, color: "#9d7cff", borderColor: "#9d7cff66" }} onClick={toggleFx2}
          title="Feld-Kompositor aus (zurück auf je eine Canvas pro Effekt) + neu laden">FX2{fx2Scale ? `:${fx2Scale}` : ""}</button>
      )}
    </div>
  );
}
