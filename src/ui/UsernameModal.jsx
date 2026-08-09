import { useState } from "react";
import { useEscape } from "./useEscape.js";
import { MODAL_CARD, ModalHairline } from "./modalStyle.jsx";

/* Lokaler Nickname (#14): dient der Ersteinrichtung (beim ersten Start) und dem
   späteren Ändern. Minimal validiert — nur Trim + Länge 1–20; keine Eindeutigkeit,
   kein Filter. Der Name erscheint an den globalen Highscore-Einträgen.
   Optik an den aktuellen Hub-Stil angeglichen: Gradient-Wortmarke im Kopf (Logo-Verlauf
   Cyan→Violett→Amber), Cyan-Glührahmen ums Eingabefeld (wie „Lauf fortsetzen") und eine
   Live-Vorschau der eigenen Highscore-Zeile. */
const MAX = 20;
const CY = "#26c6e6", VI = "#9b82f0", AM = "#f2a83a"; // Logo-Verlauf (links→mitte→rechts)

export function UsernameModal({ initial = "", firstTime = false, onSave, onClose }) {
  const [name, setName] = useState(initial);
  const trimmed = name.trim();
  const submit = () => { if (trimmed) onSave(trimmed.slice(0, MAX)); };
  useEscape(onClose); // #58: Escape schließt (Backdrop existiert bereits)

  return (
    <div onClick={onClose} className="fixed inset-0 overlay-root z-40 flex items-center justify-center p-4"
      style={{ background: "#0c0c10cc", backdropFilter: "blur(3px)" }}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-xs rounded-2xl overflow-hidden"
        style={MODAL_CARD}>
        <ModalHairline />
        <div className="p-6">
        <div className="text-center mb-4">
          <div className="text-xs uppercase tracking-widest" style={{ color: CY }}>
            {firstTime ? "Willkommen" : "Name ändern"}
          </div>
          {/* Gradient-Wortmarke (Logo-Verlauf) mit weichem Glühschimmer statt schlichter Textzeile. */}
          <h2 className="text-xl font-bold mt-1 font-pixel"
            style={{ backgroundImage: `linear-gradient(90deg, ${CY}, ${VI}, ${AM})`,
                     WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent",
                     filter: "drop-shadow(0 0 10px rgba(155,130,240,0.35))" }}>
            {firstTime ? "Wähle deinen Namen" : "Dein Name"}
          </h2>
        </div>

        {/* Eingabefeld im pulsierenden Cyan-Glührahmen (wie der „Lauf fortsetzen"-Rahmen). */}
        <div className="as-guide-glow rounded-lg">
          <input autoFocus value={name} maxLength={MAX}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
            placeholder="Dein Name"
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none text-center font-semibold tracking-wide"
            style={{ background: "#0e1b22", border: `1px solid ${CY}`, color: "#a8ecf7" }} />
        </div>
        <div className="text-[11px] opacity-45 mt-2 leading-snug">
          1–20 Zeichen · erscheint im globalen Highscore. Jederzeit im Menü änderbar.
        </div>

        {/* Live-Vorschau: so steht der Name später in der Rangliste (eigene Zeile, grün hervorgehoben). */}
        <div className="mt-3">
          <div className="text-[10px] uppercase tracking-widest opacity-40 mb-1">Vorschau · Rangliste</div>
          <div className="flex items-center gap-2 text-sm px-2 py-1.5 rounded"
            style={{ background: "#5ab87a22", border: "1px solid #5ab87a66" }}>
            <span className="w-6 shrink-0 text-center" style={{ fontSize: "14px" }}>🥇</span>
            <span className="flex-1 truncate font-semibold" style={{ color: trimmed ? "#5ab87a" : "#5f6b62" }}>
              {trimmed || "Dein Name"}<span className="opacity-60 text-xs"> · du</span>
            </span>
            <span className="shrink-0 tabular-nums opacity-70" style={{ color: "#cfeede" }}>1.337.000</span>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          {!firstTime && (
            <button onClick={onClose} className="py-2.5 px-4 rounded-lg font-bold transition-all"
              style={{ background: "#20202a", color: "#e8e8ea", border: "1px solid #30303a" }}>
              Abbrechen
            </button>
          )}
          <button onClick={submit} disabled={!trimmed}
            className="flex-1 py-2.5 rounded-lg font-bold transition-all hover:brightness-110"
            style={{ background: trimmed ? "#d4a63a" : "#26262c", color: trimmed ? "#141419" : "#666",
              boxShadow: trimmed ? "0 0 16px rgba(212,166,58,0.4)" : "none",
              cursor: trimmed ? "pointer" : "not-allowed" }}>
            Speichern
          </button>
        </div>
        </div>
      </div>
    </div>
  );
}
