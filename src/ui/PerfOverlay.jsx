import { useState, useEffect } from "react";
import { startPerf, stopPerf, resetPerf, getLive, getReport, formatReport } from "./perfRecorder.js";

/* Perf-HUD + Report-Steuerung — NUR im Preview-Build (Gate in App.jsx: VITE_PREVIEW === "1").
   Landet NICHT im echten Spiel. Startet den Hintergrund-Recorder (perfRecorder.js), zeigt live:
     FPS · p95-Frame-Zeit · kumulierte Jank-Frames (>50 ms)
   Buttons:
     ⧉ Report → volle Zusammenfassung in die Konsole + JSON in die Zwischenablage (auf dem Handy
                per Remote-Debug/„Copy" teilbar). ↺ Reset → Messung neu starten.
   Auto-Dump bei Game-Over macht App (formatReport-Aufruf), damit ein Lauf immer eine Bilanz hinterlässt. */
export function PerfOverlay() {
  const [live, setLive] = useState({ fps: 0, p95: 0, jank: 0 });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    startPerf();
    const id = setInterval(() => setLive(getLive()), 500);
    return () => { clearInterval(id); stopPerf(); };
  }, []);

  const doReport = () => {
    const r = getReport();
    // eslint-disable-next-line no-console
    console.log("%c" + formatReport(r), "font-family:monospace");
    // eslint-disable-next-line no-console
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
  return (
    <div
      className="fixed top-2 right-2 z-50 flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold font-pixel tracking-wide"
      style={{ background: "#141419dd", border: `1px solid ${col}55`, pointerEvents: "none" }}
      aria-hidden="true"
    >
      <span style={{ color: col }}>{live.fps} FPS</span>
      <span style={{ color: "#8a8a92" }}>· p95 {live.p95}ms · jank {live.jank}</span>
      <button style={btn} onClick={doReport} title="Report → Konsole + Zwischenablage">{copied ? "✓" : "⧉"}</button>
      <button style={btn} onClick={resetPerf} title="Messung zurücksetzen">↺</button>
    </div>
  );
}
