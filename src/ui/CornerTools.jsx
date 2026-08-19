import { MuteButton } from "./MuteButton.jsx";
import { GlossaryPanel } from "./Glossary.jsx";

/* ============================================================
   #ecke — Glossar und Ton in JEDEM Menü, oben links (19.08.2026)

   Bis hierher hingen beide am Startbildschirm: der Mute-Knopf in dessen linker oberer Ecke, das
   Glossar rechts oben (unter 1400 px) bzw. im Fußband neben Discord (darüber). Sobald man einen
   Menü-Screen öffnete — Werkstatt, Baum, Statistik, Bestenliste, Leitfaden, Optionen — war beides
   weg. Genau dort will man aber nachschlagen („was heißt Struktur?") und stummschalten.

   EIN globales Paar statt sieben Einbauten. Es liegt über allen Menü-Overlays (z 70 gegen deren
   20–60) und ist damit in jedem von ihnen erreichbar, auch im Glossar selbst.

   DREI Entscheidungen, die den Entwurf tragen:

   1. **Nur im Menü, nie im Lauf.** Der Aufrufer rendert es an `phase === "menu"` (App.jsx). Im Lauf
      gibt es beides bereits an seinem eigenen Platz — das ⓘ im Kopf, den Ton in der Steuerzeile —
      und ein schwebendes Paar über dem Brett wäre ein drittes Bedienelement in einer Ecke, in der
      nichts liegen soll.
   2. **Ab 1400 px.** Die Regeln stehen im Desktop-Block von index.css, das Paar ist darunter
      `display: none`. Die Handy-Fassung bleibt Knoten für Knoten dieselbe: dort steht der Mute-Knopf
      weiter in der Ecke des Startbildschirms und das Glossar rechts daneben.
   3. **Glossar LINKS, Ton rechts** — die Reihenfolge, in der der Screen gelesen wird: erst das
      Nachschlagewerk, dann der Schalter.

   Der Platz, den das Paar braucht, wird den Menü-Köpfen als Polster gegeben (index.css, `#ecke`) —
   und zwar nur, solange es wirklich da ist (`:root[data-corner-tools]`, gesetzt in App.jsx). Sonst
   stünde der Titel der Bestenliste auch dann eingerückt da, wenn man sie vom Endscreen aus öffnet,
   wo es das Paar nicht gibt.
   ============================================================ */
export function CornerTools({ muted, onToggleMute, onGlossaryOpenChange = null }) {
  return (
    <div className="as-corner">
      <GlossaryPanel onOpenChange={onGlossaryOpenChange} className="as-corner-btn" />
      <MuteButton muted={muted} onToggle={onToggleMute} className="as-corner-btn" />
    </div>
  );
}
