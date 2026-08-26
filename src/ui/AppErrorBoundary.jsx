import { Component } from "react";
import { t } from "../i18n/index.js";
import { pushError } from "./errorBuffer.js";

/* App-weite Error-Boundary (#health-check S3) — die Entscheidung, die FxBoundary.jsx ausdrücklich
   vertagt hatte, jetzt getroffen: ein Wurf beim Rendern (z. B. ein Deploy-Rennen, das einen
   React.lazy-Chunk beim Rendern scheitern lässt — Suspense fängt das NICHT) reisst nicht mehr den
   ganzen Baum zu einem schwarzen Bildschirm ab, sondern zeigt eine Meldung mit Neu-laden-Knopf.
   Der Fortschritt liegt in localStorage, ein laufender Durchlauf wird nach dem Neuladen über den
   Resume-Pfad (storage.isResumableRunState) fortgesetzt — Neuladen ist also die ehrliche und
   verlustfreie Erholung. Absichtlich schmucklos und ohne Token/CSS-Abhängigkeit: dieser Screen
   muss auch dann noch stehen, wenn genau diese Schichten der Grund des Wurfs sind.
   FxBoundary bleibt daneben bestehen: sie fängt Effekt-Fehler LOKAL und zeigt den alten Effekt —
   besser als der Fehler-Screen, wo es nur um Schmuck geht. */
export class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(error) {
    // In den Ring-Puffer des Melders (#396), damit ein späterer Feedback-Report den Wurf mitbringt.
    try { pushError("[boundary] " + (error && error.message ? error.message : String(error))); } catch (e) {}
  }
  render() {
    if (!this.state.failed) return this.props.children;
    // t() defensiv: wirft ausgerechnet die i18n-Schicht, trägt der zweisprachige Fallback den Screen.
    let title = "Etwas ist schiefgegangen / Something went wrong";
    let body = "Ein Fehler hat die Anzeige unterbrochen. Dein Fortschritt ist gespeichert. / An error interrupted the display. Your progress is saved.";
    let reload = "Neu laden / Reload";
    try { title = t("error.crash.title"); body = t("error.crash.body"); reload = t("error.crash.reload"); } catch (e) {}
    return (
      <div role="alert" style={{
        position: "fixed", inset: 0, background: "#0c0c10", color: "#e8e8ea", zIndex: 9999,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 16, padding: 24, textAlign: "center", fontFamily: "system-ui, sans-serif",
      }}>
        <div style={{ fontSize: 22, fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: 14, opacity: 0.75, maxWidth: 480, lineHeight: 1.5 }}>{body}</div>
        <button onClick={() => window.location.reload()} style={{
          marginTop: 8, padding: "10px 22px", borderRadius: 8, cursor: "pointer",
          background: "#241b34", color: "#e8d9ff", border: "1px solid #6b4fa0", fontSize: 15, fontWeight: 700,
        }}>{reload}</button>
      </div>
    );
  }
}
