import { useEscape } from "./useEscape.js";
import { MODAL_CARD, ModalHairline } from "./modalStyle.jsx";

/* Optionen-Overlay (#41): erreichbar aus dem Menü UND im laufenden Run (dort pausiert
   der Lauf, solange offen). Bewusst erweiterbar — künftig Sound, Tempo-Default etc.
   Erste Option: der CRT-/Pixel-Skin-Toggle. */

/* Ein/Aus-Schalter im Stil der übrigen UI. */
function Toggle({ on, onClick }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={onClick}
      className="relative rounded-full transition-all shrink-0"
      style={{
        width: 46, height: 26,
        background: on ? "#d4a63a" : "#30303a",
        border: `1px solid ${on ? "#d4a63a" : "#3a3a44"}`,
      }}
    >
      <span
        className="absolute top-1/2 rounded-full transition-all"
        style={{
          width: 20, height: 20, background: "#f2f2f4",
          transform: "translateY(-50%)",
          left: on ? 22 : 2,
        }}
      />
    </button>
  );
}

/* 3-Wege-Auswahl (z. B. Auto/An/Aus) im Stil der übrigen UI. */
function Segmented({ value, options, onChange }) {
  return (
    <div className="flex rounded-lg overflow-hidden shrink-0" style={{ border: "1px solid #3a3a44" }}>
      {options.map((o) => {
        const on = value === o.v;
        return (
          <button key={o.v} role="radio" aria-checked={on} onClick={() => onChange(o.v)}
            className="px-3 py-1.5 text-xs font-bold transition-all"
            style={{ background: on ? "#d4a63a" : "#25252e", color: on ? "#141419" : "#c8c8d0" }}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/* Eine Options-Zeile: Titel + Beschreibung links, Steuerung rechts. */
function Row({ title, desc, children }) {
  return (
    <div className="flex items-center gap-3 rounded-lg p-3" style={{ background: "#20202a" }}>
      <div className="flex-1">
        <div className="font-bold text-sm">{title}</div>
        {desc && <div className="text-sm opacity-70 leading-snug">{desc}</div>}
      </div>
      {children}
    </div>
  );
}

export function OptionsModal({ options, onChange, onClose }) {
  useEscape(onClose); // #58: Escape schließt (Backdrop unten)
  return (
    <div onClick={onClose} className="fixed inset-0 overlay-root z-30 flex items-center justify-center p-4" style={{ background: "#0c0c10cc", backdropFilter: "blur(3px)" }}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-2xl max-h-[90dvh] overflow-hidden overlay-card as-panel flex flex-col" style={MODAL_CARD}>
        <ModalHairline />
        <div className="p-6 overflow-y-auto">
        <div className="text-center mb-4">
          <div className="text-xs uppercase tracking-widest" style={{ color: "#8a7de0" }}>Optionen</div>
          <h2 className="text-xl font-bold mt-1">Einstellungen</h2>
        </div>

        <div className="grid gap-2.5">
          {/* Retro-Skin (CRT) ist jetzt der feste Look des Spiels — immer an, kein Toggle mehr. */}
          {/* #110 Sound: Mute-Toggle + Lautstärke-Slider (persistiert über die Optionen). */}
          <Row title="Ton stumm" desc="Schaltet alle Klick- und Spiel-Sounds ab.">
            <Toggle on={!!options.muted} onClick={() => onChange({ muted: !options.muted })} />
          </Row>
          <Row title="Effekt-Lautstärke" desc="Lautstärke der Klick-/Spiel-Sounds (SFX).">
            <input type="range" min="0" max="1" step="0.05" value={options.sfxVol ?? 0.4}
              disabled={!!options.muted}
              onChange={(e) => onChange({ sfxVol: Number(e.target.value) })}
              aria-label="SFX-Lautstärke"
              style={{ width: 120, accentColor: "#5ab87a", opacity: options.muted ? 0.4 : 1, cursor: options.muted ? "not-allowed" : "pointer" }} />
          </Row>
          {/* #111 Musik: eigener Lautstärke-Slider (Default 0,2). */}
          <Row title="Musik-Lautstärke" desc="Lautstärke der Hintergrundmusik.">
            <input type="range" min="0" max="1" step="0.05" value={options.musicVol ?? 0.2}
              disabled={!!options.muted}
              onChange={(e) => onChange({ musicVol: Number(e.target.value) })}
              aria-label="Musik-Lautstärke"
              style={{ width: 120, accentColor: "#8a7de0", opacity: options.muted ? 0.4 : 1, cursor: options.muted ? "not-allowed" : "pointer" }} />
          </Row>
          {/* #200: Effekte reduziert (auto/an/mittel/aus) — dreistufig. „Mittel"=ausgewogen: Kartenflip + Ambiente + Finisher bleiben, nur Screen-Shake + Partikel-Fontänen fallen weg. */}
          <Row title="Effekte reduziert" desc="„Aus“ = volle Effekte. „Mittel“ behält Kartenflip, Hintergrund & Finisher, lässt aber die teuren Ruckel-Treiber (Screen-Shake, Funken-Fontänen) weg. „An“ reduziert alles. „Auto“ wählt am Handy Mittel, am Desktop volle Effekte.">
            <Segmented value={options.reducedFx ?? "auto"}
              options={[{ v: "auto", label: "Auto" }, { v: "aus", label: "Aus" }, { v: "ausgewogen", label: "Mittel" }, { v: "an", label: "An" }]}
              onChange={(v) => onChange({ reducedFx: v })} />
          </Row>
          {/* #207: Haptik — kurzes Vibrations-Feedback bei Bestätigungen. Wirkt nur auf Touch-Geräten (Handy); System-„reduzierte Bewegung“ schaltet sie ohnehin ab. */}
          <Row title="Haptik (Vibration)" desc="Kurzes Vibrieren bei Bestätigungen. Nur auf Touch-Geräten (Handy) spürbar; System-Einstellung „reduzierte Bewegung“ wird respektiert.">
            <Toggle on={options.haptics !== false} onClick={() => onChange({ haptics: options.haptics === false })} />
          </Row>
          {/* Perf-HUD — NUR im Preview-/Testbranch-Build sichtbar (in „main“ ausgeblendet). Steuert das
              FPS/Report-Overlay: aus = kein Overlay UND keine Aufzeichnung (Recorder mountet erst bei „an“). */}
          {import.meta.env.VITE_PREVIEW === "1" && (
            <Row title="FPS-Zähler & Report" desc="Blendet oben rechts FPS · p95 · Jank ein und zeichnet Perf-Daten auf (⧉ Report → Konsole + Zwischenablage). Nur im Testbranch. Aus = keine Anzeige und keine Messung.">
              <Toggle on={!!options.perfHud} onClick={() => onChange({ perfHud: !options.perfHud })} />
            </Row>
          )}
        </div>

        <div className="rounded-lg p-3 mt-3 text-xs text-center leading-snug" style={{ background: "#8a7de022", color: "#c9c0f0" }}>
          Weitere Optionen (Tempo-Default …) folgen hier.
        </div>

        <button onClick={onClose} className="w-full mt-5 py-2.5 rounded-lg font-bold transition-all hover:brightness-110" style={{ background: "#d4a63a", color: "#141419" }}>
          Schließen
        </button>
        </div>
      </div>
    </div>
  );
}
