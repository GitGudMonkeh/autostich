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

/* Gemeinsame In-Run-Panel-Schale: StatusBar · Battlefield · Fraktions-Panels · Analyse · Build teilen dieselbe
   Verlaufsfläche + denselben Rahmen, damit der Spielscreen als EIN System liest (statt flachem #17171c/#14131c-Mix
   wie bisher). Akzent (Fraktionsfarbe) + dynamische Sieg-/Krit-Aura liegen weiterhin oben drauf. */
export const PANEL_CARD = {
  background: "linear-gradient(180deg,#1b1a24,#141019)",
  border: "1px solid #2c2a3a",
};

/* ---- Phasen-Schale (In-Run-Overlays an die Hub-Bildsprache angeglichen) ----
   Die Phasen behalten ihre Farb-Identität (Perk/Skill violett, Aufstellung/Ziel grün, Gletscher eisblau,
   Legendär gold, Architekt blau); der Skin macht sie zur Familie, ohne sie gleichzuschalten. NUR die Schale
   (Hintergrund/Rahmen/Schein + gemeinsame Tri-Color-Haarlinie) kommt von hier — das Innenleben der Screens
   (Grids, Karten, Buttons, Klappfelder) bleibt unverändert. */
export const PHASE_ACCENTS = {
  violet: { c: "#9b82f0", rgb: "155,130,240" },
  green:  { c: "#5ab87a", rgb: "90,184,122" },
  ice:    { c: "#7fdcff", rgb: "127,220,255" },
  gold:   { c: "#d4a63a", rgb: "212,166,58" },
  blue:   { c: "#3b7dbe", rgb: "59,125,190" },
  red:    { c: "#e05555", rgb: "224,85,85" }, // #301 Challenge-Modus
};
// Schalen-Style: Akzent-Glow oben + Verlaufsfläche + Akzent-Rahmen + weicher Außenschein. `base` = Verlaufs-
// Grundtöne (Default = Menü-Familienton; der Architekt reicht seinen blauen Grund durch).
export function phaseCard(accent, base = ["#1b1a24", "#141019"]) {
  const rgb = accent.rgb;
  return {
    background:
      `radial-gradient(360px 150px at 50% 0%, rgba(${rgb},.14), transparent 70%),` +
      `linear-gradient(180deg,${base[0]},${base[1]})`,
    border: `1px solid rgba(${rgb},.42)`,
    boxShadow: `0 0 26px rgba(${rgb},.12), 0 14px 44px rgba(0,0,0,.42)`,
  };
}
// Tri-Color-Haarlinie bündig an der oberen Kante der Phasen-Karte. ABSOLUT positioniert (außerhalb des Flusses),
// damit sie den Kopfinhalt NICHT nach oben zieht — die Karte behält ihr volles oberes Padding. Die Karte muss
// `relative` sein; die runden Ecken klippen die Linie (overflow-y-auto ⇒ auch x). padX/padY werden nicht mehr
// gebraucht (die Linie ankert an der Kante, unabhängig vom Padding).
export function PhaseHairline({ className = "" }) {
  return <div aria-hidden="true" className={`absolute top-0 left-0 right-0 z-20 ${className}`}
    style={{ height: 3, background: HAIRLINE.background, opacity: 0.9, borderTopLeftRadius: "1rem", borderTopRightRadius: "1rem" }} />;
}
