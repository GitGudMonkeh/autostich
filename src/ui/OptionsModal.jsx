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
        background: on ? "#5ab87a" : "#30303a",
        border: `1px solid ${on ? "#5ab87a" : "#3a3a44"}`,
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
  const crtOn = options.skin === "crt";
  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-4" style={{ background: "#0c0c10cc", backdropFilter: "blur(3px)" }}>
      <div className="w-full max-w-lg rounded-2xl p-6 max-h-[90vh] overflow-y-auto" style={{ background: "#181820", border: "1px solid #33333e" }}>
        <div className="text-center mb-4">
          <div className="text-xs uppercase tracking-widest" style={{ color: "#8a7de0" }}>Optionen</div>
          <h2 className="text-xl font-bold mt-1 font-pixel crt-title">Einstellungen</h2>
        </div>

        <div className="grid gap-2.5">
          <Row title="Retro-Skin (CRT)" desc="Pixel-Schrift, Scanlines, Neon-Glow. Rein optisch — Layout & Spiel bleiben gleich.">
            <Toggle on={crtOn} onClick={() => onChange({ skin: crtOn ? "off" : "crt" })} />
          </Row>
        </div>

        <div className="rounded-lg p-3 mt-3 text-xs text-center leading-snug" style={{ background: "#8a7de022", color: "#c9c0f0" }}>
          Weitere Optionen (Sound, Tempo-Default …) folgen hier.
        </div>

        <button onClick={onClose} className="w-full mt-5 py-2.5 rounded-lg font-bold transition-all" style={{ background: "#5ab87a", color: "#141419" }}>
          Schließen
        </button>
      </div>
    </div>
  );
}
