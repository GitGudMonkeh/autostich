import { useState } from "react";
import { useEscape } from "./useEscape.js";

/* Lokaler Nickname (#14): dient der Ersteinrichtung (beim ersten Start) und dem
   späteren Ändern. Minimal validiert — nur Trim + Länge 1–20; keine Eindeutigkeit,
   kein Filter. Der Name erscheint an den globalen Highscore-Einträgen. */
const MAX = 20;

export function UsernameModal({ initial = "", firstTime = false, onSave, onClose }) {
  const [name, setName] = useState(initial);
  const trimmed = name.trim();
  const submit = () => { if (trimmed) onSave(trimmed.slice(0, MAX)); };
  useEscape(onClose); // #58: Escape schließt (Backdrop existiert bereits)

  return (
    <div onClick={onClose} className="fixed inset-0 z-40 flex items-center justify-center p-4"
      style={{ background: "#0c0c10cc", backdropFilter: "blur(3px)" }}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-xs rounded-2xl p-6"
        style={{ background: "#181820", border: "1px solid #33333e" }}>
        <div className="text-center mb-4">
          <div className="text-xs uppercase tracking-widest" style={{ color: "#8a7de0" }}>
            {firstTime ? "Willkommen" : "Name ändern"}
          </div>
          <h2 className="text-xl font-bold mt-1 font-pixel crt-title">
            {firstTime ? "Wähle deinen Namen" : "Dein Name"}
          </h2>
        </div>

        <input autoFocus value={name} maxLength={MAX}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          placeholder="Dein Name"
          className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
          style={{ background: "#12121a", border: "1px solid #2a2a33", color: "#e8e8ea" }} />
        <div className="text-[11px] opacity-45 mt-2 leading-snug">
          1–20 Zeichen · erscheint im globalen Highscore. Jederzeit im Menü änderbar.
        </div>

        <div className="flex gap-2 mt-4">
          {!firstTime && (
            <button onClick={onClose} className="py-2.5 px-4 rounded-lg font-bold transition-all"
              style={{ background: "#20202a", color: "#e8e8ea", border: "1px solid #30303a" }}>
              Abbrechen
            </button>
          )}
          <button onClick={submit} disabled={!trimmed}
            className="flex-1 py-2.5 rounded-lg font-bold transition-all"
            style={{ background: trimmed ? "#5ab87a" : "#26262c", color: trimmed ? "#141419" : "#666",
              cursor: trimmed ? "pointer" : "not-allowed" }}>
            Speichern
          </button>
        </div>
      </div>
    </div>
  );
}
