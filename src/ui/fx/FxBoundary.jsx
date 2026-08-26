import { Component } from "react";

/* Auffangnetz für EXPERIMENTELLE Effekt-Pfade.

   Anlass: der Feld-Kompositor hängt an `React.lazy`. Scheitert der Chunk-Ladevorgang — Deploy-Rennen, wackliges
   Netz, ein Service-Worker mit alter index.html und neuen Chunk-Namen —, dann WIRFT `lazy` beim Rendern. Die App
   hat keine einzige Error-Boundary, also reißt so ein Wurf den kompletten Baum ab: schwarzer Bildschirm, kein
   Spiel, kein Hinweis. Genau das ist passiert, wenige Minuten nach dem ersten Kompositor-Deploy.

   Ein Effekt ist Schmuck. Er darf nie das Spiel mitnehmen. Diese Grenze fängt den Wurf ab und rendert
   stattdessen den `fallback` — beim Kompositor also die bisherige Canvas-Fassung. Der Spieler sieht dann den
   alten Effekt statt gar nichts und merkt im Zweifel nichts.

   Bewusst klein gehalten und NICHT als globale Boundary gedacht. Die App-weite Fehlerbehandlung ist seit
   #health-check S3 ihre eigene Schicht (src/ui/AppErrorBoundary.jsx: Meldung + Neu laden, Resume über den
   gespeicherten Lauf). Diese Grenze hier bleibt trotzdem: bei einem Effekt-Fehler ist der ALTE Effekt die
   bessere Antwort als der Fehler-Screen — es geht nur um Schmuck. */
export class FxBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(err) {
    // Nur Konsole: ein Effekt-Ausfall ist keine Spieler-Nachricht. Der Name macht ihn im Log auffindbar.
    try { console.warn(`[fx] ${this.props.name || "Effekt"} ausgefallen — Rückfall auf den bisherigen Pfad:`, err); }
    catch { /* ignore */ }
  }

  render() {
    return this.state.failed ? (this.props.fallback ?? null) : this.props.children;
  }
}
