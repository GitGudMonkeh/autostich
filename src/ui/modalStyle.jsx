// Einheitliche Modal-/Menü-Bildsprache des Hubs (Design-Sweep, Variante C).
// Verlaufs-Hintergrund + weicher Violett-Glow oben + Rahmen; dazu die Gradient-Haarlinie (Cyan→Violett→Amber).
// EINE Quelle → hier justieren, überall wirkt es. Felder/Layout der Screens bleiben unberührt.

export const MODAL_CARD = {
  background:
    "radial-gradient(340px 150px at 50% 0%, rgba(155,130,240,.14), transparent 70%)," +
    "linear-gradient(180deg,#1b1a24,#141019)",
  border: "1px solid #2c2a3a",
};

export const HAIRLINE = { background: "linear-gradient(90deg,#26c6e6,#9b82f0,#f2a83a)", opacity: 0.85 };

// Die 3px-Gradient-Haarlinie als eigenes, nicht-scrollendes Element (als erstes Kind der Karte platzieren).
export function ModalHairline() {
  return <div className="h-[3px] w-full shrink-0" style={HAIRLINE} aria-hidden="true" />;
}

// Variante für scrollende Karten mit STICKY Kopf: die Haarlinie absolut an den oberen Rand des (relative gesetzten,
// voll-breiten -mx) Sticky-Kopfs hängen → bleibt beim Scrollen oben, wird von den runden Kartenecken sauber geklippt.
export function TopHairline() {
  // eigene runde Oberecken (rounded-2xl ≈ 16px) → passt sich auch bei Karten OHNE overflow-clip sauber der Ecke an.
  return <div className="absolute top-0 left-0 right-0 h-[3px] z-30" style={{ ...HAIRLINE, borderTopLeftRadius: "1rem", borderTopRightRadius: "1rem" }} aria-hidden="true" />;
}

// Sticky-Kopf-Hintergrund = oberster Stopp des Karten-Verlaufs → nahtloser Übergang (kein Panel-Seam).
export const STICKY_HEAD_BG = "#1b1a24";

// In-Run-Overlays (Skill-/Perk-/Legendär-Wahl, Formation, Ziel-Auswahl …): NUR die flache Panel-Füllung auf einen
// gemeinsamen Menü-Familien-Ton ziehen. KEIN Rahmen/Haarlinie/Glow, Ränder + Skill-/Perk-/Gebäude-/Kartenfarben bleiben.
export const PANEL_BG = "#1b1a24";
