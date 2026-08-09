import { useState, useRef, useEffect } from "react";
import { useEscape } from "./useEscape.js";
import { MODAL_CARD, TopHairline, STICKY_HEAD_BG, HAIRLINE } from "./modalStyle.jsx";
import {
  THEMES, ELEMENT_DEFS, ELEMENT_BY_KEY, FX_KEYS, FX_OPTION_KEY,
  elementState, elementPrice, elementUnlock, elementOwned, themeState,
  buyAllInfo, sharedUnlock, canBuyElement, buyElement, buyAllForTheme,
} from "../game/themes.js";
import { deckAssets, battlefieldAssets } from "./cosmeticAssets.js";

/* #deckshop — DECK-WERKSTATT: Themes (Deck · Battlefield · Animationen) einzeln kaufen & mischen.
   Zwei Modi: „Meine Sammlung" (Besessenes an/aus, Deck & Battlefield mischbar) und „Vorschau · Alle"
   (Kachel-Galerie → Kauffenster mit Element-Vorschau & Einzelkauf). Kauf spendet SP (onProfileChange),
   Aktiv-Wahl/Animations-Toggles schreiben in die Optionen (onChoose). Reine Kosmetik. */

// Echtes Seitenverhältnis der Deck-Bilder (1066×1476) → object-contain zeigt die Karte vollständig
// (kein Anschnitt oben/unten), der bemalte Neon-Rahmen bleibt intakt und der Frame-Glow sitzt bündig.
const CARD_RATIO = "1066 / 1476";

// Gleiche Schwelle wie das In-Run-Battlefield (<picture media="(max-width: 640px)">): so zeigt die
// Vorschau exakt die Version (mobile/desktop), mit der gerade auch gespielt wird.
function useIsMobile() {
  const [m, setM] = useState(() => typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const on = () => setM(mq.matches);
    mq.addEventListener ? mq.addEventListener("change", on) : mq.addListener(on);
    return () => (mq.removeEventListener ? mq.removeEventListener("change", on) : mq.removeListener(on));
  }, []);
  return m;
}

// Einmalig injizierte Keyframes für die Element-Vorschauen (Frame Glow / Holo Swipe / Hologrid).
const FX_CSS = `
@keyframes ws-frameglow{0%,100%{box-shadow:0 0 10px -2px var(--a1),inset 0 0 14px -8px var(--a1)}50%{box-shadow:0 0 26px 2px var(--a1),inset 0 0 22px -4px var(--a1)}}
@keyframes ws-swipe{0%{transform:translateX(-120%) rotate(18deg)}55%,100%{transform:translateX(320%) rotate(18deg)}}
@keyframes ws-sweep{0%{bottom:-4%;opacity:0}18%{opacity:1}70%{opacity:1}100%{bottom:106%;opacity:0}}
.ws-sweep{animation:ws-sweep 2.9s ease-in-out infinite}
@keyframes ws-laser{0%{top:-6%;opacity:0}12%{opacity:1}88%{opacity:1}100%{top:106%;opacity:0}}
.ws-laser{animation:ws-laser 1.9s linear infinite}
`;

// Karten-Vorschau: illustrierter Deck-Rücken (Motiv), vollständig (object-contain) + optionaler Effekt.
// Frame Glow = pulsierender Schein am Kartenrand (liegt bündig, egal wie der bemalte Rahmen sitzt).
function CardPreview({ deckId, a1, fx, className = "" }) {
  const img = deckAssets(deckId).back;
  const glow = fx === "frameGlow";
  return (
    <div className={`relative rounded-lg ${className}`}
      style={{ aspectRatio: CARD_RATIO, background: "#0b0a16", "--a1": a1, animation: glow ? "ws-frameglow 2s ease-in-out infinite" : undefined }}>
      <img src={img} alt="" className="absolute inset-0 w-full h-full object-contain rounded-lg" />
      {fx === "holoSwipe" && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-lg">
          <div className="absolute" style={{ top: "-60%", left: 0, width: "40%", height: "220%",
            background: "linear-gradient(90deg,transparent,rgba(255,255,255,.28),rgba(120,220,255,.16),transparent)",
            animation: "ws-swipe 2.6s ease-in-out infinite" }} />
        </div>
      )}
      {fx === "laser" && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-lg">
          <div className="ws-laser absolute left-0 right-0" style={{ height: 2,
            background: `linear-gradient(90deg,transparent,${a1} 12%,#ffffff 50%,${a1} 88%,transparent)`,
            boxShadow: `0 0 10px 1px ${a1}, 0 0 3px 1px #ffffffcc` }} />
        </div>
      )}
    </div>
  );
}

// Battlefield-Vorschau: echtes BF-Bild in der AKTUELL gespielten Version (mobile/desktop, gleiche 640px-
// Schwelle wie im Spiel) + optionales Hologrid-Gitter in der Deck-Hauptfarbe (a1). showVersion blendet ein
// kleines Label ein, welche Version man gerade sieht.
function BfPreview({ bfId, a1, fx, className = "", showVersion = false }) {
  const bf = battlefieldAssets(bfId);
  const isMobile = useIsMobile();
  const src = bf ? (isMobile ? bf.mobile : bf.desktop) : null;
  return (
    <div className={`relative rounded-lg overflow-hidden ${className}`} style={{ aspectRatio: "16 / 10", background: "#0b0a16" }}>
      {src ? <img src={src} alt="" className="absolute inset-0 w-full h-full object-cover" />
          : <div className="absolute inset-0 grid place-items-center text-xs opacity-40">Kein Battlefield</div>}
      {showVersion && bf && (
        <span className="absolute top-1.5 left-1.5 text-[9px] font-extrabold tracking-wider px-1.5 py-0.5 rounded"
          style={{ background: "#0b0a16cc", border: "1px solid #34333f", color: "#9a97ab" }}>{isMobile ? "MOBILE" : "DESKTOP"}</span>
      )}
      {fx === "hologrid" && (
        // Ruhiges Gitter + durchfahrende Leucht-Linie (wie im Spiel je Stich; hier als Endlos-Demo).
        <div className="absolute pointer-events-none" style={{
          left: "-20%", right: "-20%", bottom: 0, height: "48%",
          transform: "perspective(140px) rotateX(60deg)", transformOrigin: "bottom" }}>
          <div className="absolute inset-0" style={{
            backgroundImage: `linear-gradient(${a1} 1px,transparent 1px),linear-gradient(90deg,${a1} 1px,transparent 1px)`,
            backgroundSize: "16px 16px", opacity: 0.26 }} />
          <div className="ws-sweep absolute left-0 right-0" style={{ height: 7,
            background: `linear-gradient(90deg,transparent,${a1} 15%,#ffffff 50%,${a1} 85%,transparent)`,
            boxShadow: `0 0 20px 4px ${a1}, 0 0 52px 12px ${a1}, 0 0 6px 2px #ffffff` }} />
        </div>
      )}
    </div>
  );
}

// Großes Vorschaufeld im Kauffenster — schaltet je nach gewähltem Element (Karte/BF/Animation).
// Wird in einer festen Höhe zentriert (BuyOverlay), damit der Rahmen beim Wechsel Karte↔BF nicht springt.
function BigPreview({ theme, sel }) {
  if (sel === "bf" || sel === "hologrid") return <BfPreview bfId={theme.bfId} a1={theme.a1} fx={sel === "hologrid" ? "hologrid" : null} className="w-full" showVersion />;
  const fx = sel === "frameGlow" || sel === "holoSwipe" || sel === "laser" ? sel : null;
  return (
    <div className="flex justify-center">
      <CardPreview deckId={theme.deckId} a1={theme.a1} fx={fx} className="h-[248px] max-h-[46vh]" />
    </div>
  );
}

// Kleine Deck-Rücken-Miniatur (für Sammlungs-Zeilen & Kacheln). object-contain → nie angeschnitten
// (der schwarze Kartengrund verschmilzt mit dem Panel-Hintergrund, Letterboxing bleibt unsichtbar).
function DeckThumb({ deckId, className = "", face = "back", style }) {
  const img = deckAssets(deckId)[face];
  return <img src={img} alt="" className={`object-contain ${className}`} style={{ aspectRatio: CARD_RATIO, background: "#0b0a16", ...style }} />;
}

// Radio-Punkt (Aktiv-Wahl).
function Radio({ on }) {
  return (
    <span className="relative shrink-0 rounded-full" style={{ width: 20, height: 20, border: `2px solid ${on ? "#54e08a" : "#44424f"}` }}>
      {on && <span className="absolute rounded-full" style={{ inset: 3, background: "#54e08a" }} />}
    </span>
  );
}

// Umschalter (Animationen an/aus).
function Switch({ on, disabled }) {
  return (
    <span className="relative shrink-0 rounded-full transition-colors" style={{
      width: 42, height: 23, background: disabled ? "#26262c" : on ? "#54e08a" : "#33323f", opacity: disabled ? 0.5 : 1 }}>
      <span className="absolute rounded-full transition-all" style={{ top: 2, left: on ? 21 : 2, width: 19, height: 19, background: "#f2f2f6" }} />
    </span>
  );
}

const EYEBROW = "flex items-center gap-2 text-[10px] font-extrabold tracking-[0.13em] uppercase mt-4 mb-2";

export function CustomizeScreen({ options, profile, onChoose, onClose, onProfileChange }) {
  useEscape(onClose);
  const p = profile || {};
  const [mode, setMode] = useState("mine");   // "mine" | "prev"
  const [ov, setOv] = useState(null);          // Kauffenster: { list: theme[], idx } | null (kategorie-lokal)
  const [sel, setSel] = useState("deck");      // gewähltes Element im Kauffenster
  const spBal = Math.max(0, Math.floor(Number(p.stichPoints) || 0));

  const deckId = options?.deckId || "default";
  const bfId = options?.battlefieldId || "default";
  const activeTheme = THEMES.find((t) => t.deckId === deckId) || null; // Theme des aktiven Decks (für Animationen)

  const buy = (fn) => { if (onProfileChange) onProfileChange(fn(p)); };

  // Sammlungs-Listen: Themes, deren Deck bzw. Battlefield im Besitz ist.
  const ownedDeckThemes = THEMES.filter((t) => t.els.includes("deck") && elementOwned(p, t, "deck"));
  const ownedBfThemes   = THEMES.filter((t) => t.els.includes("bf")   && elementOwned(p, t, "bf"));

  const openOv = (list, idx) => { setOv({ list, idx }); setSel(ELEMENT_DEFS[0].key); };
  const stepOv = (d) => { setOv((o) => (o ? { ...o, idx: (o.idx + d + o.list.length) % o.list.length } : o)); setSel("deck"); };
  const ovTheme = ov ? ov.list[ov.idx] : null;

  return (
    <div className="fixed inset-0 overlay-root z-40 flex items-start justify-center p-3 sm:p-6 overflow-y-auto"
      style={{ background: "#0c0c10ee", backdropFilter: "blur(3px)" }} onClick={onClose}>
      <style>{FX_CSS}</style>
      <div className="w-full max-w-xl rounded-2xl px-5 pb-5 sm:px-6 sm:pb-6 my-auto overlay-card as-panel"
        style={MODAL_CARD} onClick={(e) => e.stopPropagation()}>
        {/* Sticky Kopf */}
        <div className="sticky top-0 z-20 -mx-5 sm:-mx-6 px-5 sm:px-6 pt-5 sm:pt-6 pb-3 relative" style={{ background: STICKY_HEAD_BG }}>
          <TopHairline />
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Deck-Werkstatt</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg" style={{ background: "#141320", border: "1px solid #34333f", color: "#f2c14a" }}>{spBal} SP</span>
              <button onClick={onClose} className="shrink-0 px-3 py-1.5 rounded-lg text-sm" style={{ background: "#20202a", border: "1px solid #3a3a46" }}>Schließen</button>
            </div>
          </div>
          {/* Modus-Umschalter */}
          <div className="flex gap-1.5 mt-3 p-1 rounded-xl" style={{ background: "#131219", border: "1px solid #2a2836" }}>
            {[["mine", "Verfügbare Decks"], ["prev", "Vorschau · Alle"]].map(([m, label]) => (
              <button key={m} onClick={() => setMode(m)} className="flex-1 py-2 rounded-lg text-[12.5px] font-extrabold transition-colors"
                style={{ background: mode === m ? "#9b82f0" : "transparent", color: mode === m ? "#141419" : "#9a97ab" }}>{label}</button>
            ))}
          </div>
        </div>

        {mode === "mine" ? (
          <MineView p={p} deckId={deckId} bfId={bfId} activeTheme={activeTheme} options={options}
            ownedDeckThemes={ownedDeckThemes} ownedBfThemes={ownedBfThemes} onChoose={onChoose} onBrowse={() => setMode("prev")} />
        ) : (
          <PreviewView p={p} onOpen={openOv} />
        )}
      </div>

      {ov && ovTheme && (
        <BuyOverlay theme={ovTheme} list={ov.list} idx={ov.idx} p={p} sel={sel} setSel={setSel} spBal={spBal}
          deckId={deckId} bfId={bfId} options={options} onChoose={onChoose}
          onStep={stepOv} onClose={() => setOv(null)}
          onBuy={(el) => buy((pf) => buyElement(pf, ovTheme, el))}
          onBuyAll={() => buy((pf) => buyAllForTheme(pf, ovTheme))} />
      )}
    </div>
  );
}

/* ---- „Meine Sammlung" ---- */
function MineView({ p, deckId, bfId, activeTheme, options, ownedDeckThemes, ownedBfThemes, onChoose, onBrowse }) {
  const fxOwnedActive = (fx) => activeTheme && activeTheme.els.includes(fx) && elementOwned(p, activeTheme, fx);
  const isMobile = useIsMobile();
  const accent = activeTheme?.a1 || "#8a7de0";
  const stdThumb = <span className="shrink-0" style={{ width: 34, height: 44, borderRadius: 6, background: "#171622", border: "1px solid #2a2836" }} />;
  return (
    <>
      <p className="text-[11px] opacity-45 mt-2 leading-snug">
        Nur <b>Gekauftes/Freigeschaltetes</b> erscheint hier. Karte &amp; Battlefield sind über Themes hinweg <b>mischbar</b> (nur je eins aktiv); Animationen einzeln zuschaltbar.
      </p>

      {/* Kartendeck */}
      <div className={EYEBROW} style={{ color: "#9a97ab" }}>Kartendeck <span className="flex-1 h-px" style={{ background: "#2a2836" }} /><span className="normal-case tracking-normal font-semibold text-[10px]" style={{ color: "#6d6a80" }}>nur eins aktiv</span></div>
      <div className="flex flex-col gap-2">
        <SelectRow active={deckId === "default"} onClick={() => onChoose({ deckId: "default" })}
          thumb={stdThumb} title="Standard" sub="Grund-Deck" />
        {ownedDeckThemes.map((t) => (
          <SelectRow key={t.id} active={deckId === t.deckId} onClick={() => onChoose({ deckId: t.deckId })}
            thumb={<DeckThumb deckId={t.deckId} className="rounded-md" style={{ width: 34, height: 44 }} />}
            title={t.name} sub="Karte Front + Back" />
        ))}
      </div>

      {/* Battlefield */}
      <div className={EYEBROW} style={{ color: "#9a97ab" }}>Battlefield <span className="flex-1 h-px" style={{ background: "#2a2836" }} /><span className="normal-case tracking-normal font-semibold text-[10px]" style={{ color: "#6d6a80" }}>nur eins aktiv</span></div>
      <div className="flex flex-col gap-2">
        <SelectRow active={bfId === "default"} onClick={() => onChoose({ battlefieldId: "default" })}
          thumb={stdThumb} title="Standard" sub="Schlichter Grund" />
        {ownedBfThemes.map((t) => {
          const a = battlefieldAssets(t.bfId);
          return (
            <SelectRow key={t.id} active={bfId === t.bfId} onClick={() => onChoose({ battlefieldId: t.bfId })}
              thumb={<img src={isMobile ? a?.mobile : a?.desktop} alt="" className="object-cover rounded-md" style={{ width: 34, height: 44 }} />}
              title={t.name} sub={`Neon-Szene · ${isMobile ? "Mobile" : "Desktop"}`} />
          );
        })}
      </div>

      {/* Animationen (global an/aus, an das aktive Theme gebunden) */}
      <div className={EYEBROW} style={{ color: "#9a97ab" }}>Animationen <span className="flex-1 h-px" style={{ background: "#2a2836" }} /><span className="normal-case tracking-normal font-semibold text-[10px]" style={{ color: "#6d6a80" }}>frei kombinierbar</span></div>
      <div className="flex flex-col gap-2">
        {FX_KEYS.map((fx) => {
          const def = ELEMENT_BY_KEY[fx];
          const owned = fxOwnedActive(fx);
          const on = owned && !!options?.[FX_OPTION_KEY[fx]];
          return (
            <button key={fx} type="button" disabled={!owned}
              onClick={owned ? () => onChoose({ [FX_OPTION_KEY[fx]]: !on }) : undefined}
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-left" style={{ background: "#14131c", border: "1px solid #2a2836", cursor: owned ? "pointer" : "default", opacity: owned ? 1 : 0.55 }}>
              <span className="shrink-0 rounded-md" style={{ width: 30, height: 30, background: owned ? `${accent}22` : "#171622", border: `1px solid ${owned ? `${accent}66` : "#2a2836"}` }} />
              <span className="flex-1 min-w-0">
                <span className="block text-[12.5px] font-extrabold">{def.name}</span>
                <span className="block text-[10.5px]" style={{ color: "#9a97ab" }}>{owned ? def.desc : "Im aktiven Theme nicht im Besitz"}</span>
              </span>
              <Switch on={on} disabled={!owned} />
            </button>
          );
        })}
      </div>
      <p className="text-[11px] mt-4 leading-snug pt-3" style={{ color: "#9a97ab", borderTop: "1px solid #2a2836" }}>
        Animationen gehören zu den kaufbaren Themes und wirken auf das <b>aktive</b> Deck/Battlefield.
        Fehlt dir etwas? <button onClick={onBrowse} className="underline font-semibold" style={{ color: "#26c6e6" }}>Alle Themes ansehen →</button>
      </p>
    </>
  );
}

function SelectRow({ active, onClick, thumb, title, sub }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors"
      style={{ background: "#14131c", border: `1px solid ${active ? "#54e08a55" : "#2a2836"}` }}>
      <span className="shrink-0 overflow-hidden">{thumb}</span>
      <span className="flex-1 min-w-0">
        <span className="block text-[12.5px] font-extrabold truncate">{title}</span>
        <span className="block text-[10.5px]" style={{ color: "#9a97ab" }}>{sub}</span>
      </span>
      <Radio on={active} />
    </button>
  );
}

/* ---- „Vorschau · Alle": Kategorien (Packs · Challenges · Effekte), durchwischbar ----
   Packs = mit SP kaufbare Theme-Bündel; Challenges = über Läufe/Challenges freischaltbare Themes;
   Effekte = einzelne Animationen (noch leer, folgt). */
const PREVIEW_CATS = [
  { k: "packs",      label: "Packs",      filter: (t) => t.kind === "buy",  empty: null },
  { k: "challenges", label: "Challenges", filter: (t) => t.kind === "cond", empty: null },
  { k: "effekte",    label: "Effekte",    filter: () => false,              empty: "Einzelne Animationen" },
];

function PreviewView({ p, onOpen }) {
  const [cat, setCat] = useState(0);
  const touch = useRef(0);
  const move = (d) => setCat((c) => Math.min(PREVIEW_CATS.length - 1, Math.max(0, c + d)));
  const active = PREVIEW_CATS[cat];
  const list = THEMES.filter(active.filter);

  return (
    <div onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => { const dx = e.changedTouches[0].clientX - touch.current; if (Math.abs(dx) > 45) move(dx < 0 ? 1 : -1); }}>
      {/* Kategorie-Tabs (wischbar) */}
      <div className="flex gap-1.5 mt-3 overflow-x-auto pb-1 -mx-1 px-1">
        {PREVIEW_CATS.map((c, i) => (
          <button key={c.k} onClick={() => setCat(i)} className="flex-1 px-3 py-1.5 rounded-lg text-[12px] font-extrabold transition-colors"
            style={{ background: i === cat ? "#26c6e6" : "#14131c", color: i === cat ? "#08181c" : "#9a97ab", border: `1px solid ${i === cat ? "#26c6e6" : "#2a2836"}` }}>
            {c.label}
          </button>
        ))}
      </div>

      <div className={EYEBROW} style={{ color: "#9a97ab" }}>{active.label}
        <span className="flex-1 h-px" style={{ background: "#2a2836" }} />
        <span className="normal-case tracking-normal font-semibold text-[10px]" style={{ color: "#6d6a80" }}>{cat === 0 ? "tippen → Elemente einzeln kaufen" : cat === 1 ? "tippen → Freischaltung ansehen" : "‹ wischen ›"}</span>
      </div>

      {list.length ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {list.map((t, i) => {
            const s = themeState(p, t);
            const locked = s === "lock";
            const badge = s === "own" ? ["KOMPLETT", "#123a25", "#54e08a", "#2f7a4f"]
              : s === "mix" ? ["TEILS", "#251a2e", "#ff4dcb", "#5a3a63"]
              : s === "buy" ? ["KAUFBAR", "#2e2410", "#f2c14a", "#6b5320"]
              : ["GESPERRT", "#1c1b24", "#9a97ab", "#2e2d38"];
            const state = s === "own" ? ["alle Elemente", "#54e08a"] : s === "mix" ? ["teils im Besitz", "#54e08a"]
              : s === "buy" ? ["Elemente kaufbar", "#f2c14a"] : ["freischaltbar", "#6d6a80"];
            return (
              <button key={t.id} type="button" onClick={() => onOpen(list, i)} className="relative rounded-xl overflow-hidden text-left transition-transform hover:-translate-y-0.5"
                style={{ background: "#14131c", border: "1px solid #2a2836" }}>
                <div className="relative" style={{ aspectRatio: CARD_RATIO }}>
                  <DeckThumb deckId={t.deckId} className="absolute inset-0 w-full h-full" style={{ filter: locked ? "grayscale(.7) brightness(.5)" : undefined }} />
                  {badge && <span className="absolute top-1.5 right-1.5 text-[9px] font-extrabold px-1.5 py-0.5 rounded" style={{ background: badge[1], color: badge[2], border: `1px solid ${badge[3]}` }}>{badge[0]}</span>}
                </div>
                <div className="px-2 py-1.5">
                  <span className="text-[12px] font-extrabold truncate block">{t.name}</span>
                  <span className="text-[10px]" style={{ color: state[1] }}>{state[0]}</span>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="grid place-items-center text-center rounded-2xl py-12 px-6" style={{ background: "#131219", border: "1px dashed #2e2d38" }}>
          <div className="text-[13px] font-extrabold">{active.label} — noch leer</div>
          <div className="text-[11px] mt-1 leading-snug" style={{ color: "#9a97ab", maxWidth: 260 }}>
            {active.empty} kommen bald einzeln in den Shop. Bis dahin bekommst du sie als Teil der <b>Packs</b>.
          </div>
        </div>
      )}

      <p className="text-[11px] mt-4 leading-snug pt-3" style={{ color: "#9a97ab", borderTop: "1px solid #2a2836" }}>
        {cat === 0
          ? <>Ein <b>Pack</b> bündelt Karte · Battlefield · Animationen. Im Kauffenster hat jedes Element eine eigene Vorschau &amp; einen eigenen Kauf.</>
          : cat === 1
          ? <>Challenge-Themes schalten alle Elemente <b>auf einmal</b> frei — tippe ein Theme an, um die Bedingung zu sehen.</>
          : <>Wische seitwärts zwischen <b>Packs · Challenges · Effekte</b>.</>}
      </p>
    </div>
  );
}

/* Besessenes Element im Kauffenster: direkt anlegen/aktivieren statt nur „Besitz".
   Deck/Battlefield = Radio (nur eins aktiv) → „Anlegen" / „✓ Aktiv"; Animationen = An/Aus-Toggle (Option). */
function OwnedAction({ el, theme, deckId, bfId, options, onChoose }) {
  const stop = (fn) => (e) => { e.stopPropagation(); fn(); };
  const btn = "text-[10px] font-extrabold px-2.5 py-1 rounded-lg whitespace-nowrap transition-colors";
  if (el === "deck" || el === "bf") {
    const active = el === "deck" ? deckId === theme.deckId : bfId === theme.bfId;
    if (active) return <span className={btn} style={{ background: "#123a25", color: "#54e08a", border: "1px solid #2f7a4f" }}>✓ Aktiv</span>;
    const apply = () => onChoose(el === "deck" ? { deckId: theme.deckId } : { battlefieldId: theme.bfId });
    return <button type="button" onClick={stop(apply)} className={btn} style={{ background: "#211d33", color: "#b9a9f2", border: "1px solid #4a3f6e" }}>Anlegen</button>;
  }
  // Animation (frameGlow/holoSwipe/hologrid): globaler An/Aus-Toggle (wirkt auf das aktive Deck-Theme).
  const key = FX_OPTION_KEY[el];
  const on = !!options?.[key];
  return (
    <button type="button" onClick={stop(() => onChoose({ [key]: !on }))} className={btn}
      style={on ? { background: "#123a25", color: "#54e08a", border: "1px solid #2f7a4f" } : { background: "#1c1b24", color: "#9a97ab", border: "1px solid #2e2d38" }}>
      {on ? "✓ An" : "Aus"}
    </button>
  );
}

/* ---- Kauffenster (Element-Ebene) ---- */
function BuyOverlay({ theme, list, idx, p, sel, setSel, spBal, deckId, bfId, options, onChoose, onStep, onClose, onBuy, onBuyAll }) {
  const shared = sharedUnlock(p, theme);        // Challenge → gemeinsame Freischalt-Beschreibung (statt Preisen)
  const isChallenge = !!shared;
  const info = buyAllInfo(p, theme);
  const ed = ELEMENT_BY_KEY[sel];
  const touch = useRef(0);
  // Feste Größe: Element-Liste auf die höchste Element-Zahl der Kategorie auffüllen (Platzhalter-Zeilen),
  // damit der Rahmen beim Wischen zwischen Themes nicht springt.
  const maxEls = Math.max(1, ...list.map((t) => t.els.length));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 overflow-y-auto"
      style={{ background: "#05050ad0", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl overflow-hidden my-auto" style={MODAL_CARD} onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
        onTouchEnd={(e) => { const dx = e.changedTouches[0].clientX - touch.current; if (Math.abs(dx) > 45) onStep(dx < 0 ? 1 : -1); }}>
        <div className="h-[3px] w-full" style={HAIRLINE} aria-hidden="true" />
        <div className="p-3.5">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[15px] font-extrabold truncate">{theme.name}</span>
            <button onClick={onClose} className="shrink-0 text-[11px] px-2.5 py-1 rounded-lg" style={{ background: "#20202a", border: "1px solid #3a3a46", color: "#9a97ab" }}>Schließen</button>
          </div>

          {/* Großes Element-Preview mit ‹ › — feste Höhe (Karte↔BF springt nicht) */}
          <div className="flex items-center gap-2" style={{ height: 252 }}>
            <button onClick={() => onStep(-1)} className="shrink-0 grid place-items-center rounded-full text-[15px]" style={{ width: 30, height: 30, background: "#20202c", border: "1px solid #3a3a46" }}>‹</button>
            <div className="flex-1 min-w-0 h-full flex items-center justify-center"><BigPreview theme={theme} sel={sel} /></div>
            <button onClick={() => onStep(1)} className="shrink-0 grid place-items-center rounded-full text-[15px]" style={{ width: 30, height: 30, background: "#20202c", border: "1px solid #3a3a46" }}>›</button>
          </div>
          <div className="text-center text-[10.5px] mt-2 flex items-center justify-center" style={{ color: "#9a97ab", minHeight: 28 }}>
            <span>Vorschau: <b style={{ color: "#26c6e6" }}>{ed.name}</b> — {ed.desc}</span>
          </div>
          <div className="flex gap-1.5 justify-center my-2">
            {list.map((_, i) => <span key={i} className="rounded-full transition-all" style={{ width: i === idx ? 16 : 6, height: 6, background: i === idx ? "#9b82f0" : "#3a3947" }} />)}
          </div>

          {/* Aktions-Zone (feste Mindesthöhe): Challenge-Freischaltung ODER „Alles kaufen" ODER leer */}
          <div style={{ minHeight: 64 }} className="mb-2.5">
            {isChallenge ? (
              <div className="flex gap-2.5 items-start rounded-xl px-3 py-2.5 h-full" style={{ background: "#1a1622", border: "1px dashed #4a3a5a" }}>
                <span className="shrink-0 mt-0.5 rounded" style={{ width: 12, height: 12, background: "#ff4dcb", boxShadow: "0 0 6px #ff4dcb" }} />
                <span className="text-[11.5px] leading-relaxed" style={{ color: "#cdbce4" }}>
                  <b style={{ color: "#ff4dcb" }}>Challenge-Freischaltung</b> — schaltet das ganze Theme <b>auf einmal</b> frei.<br />
                  <span className="font-extrabold" style={{ color: "#fff" }}>{shared.label}</span>
                  {shared.target > 1 && <span className="opacity-70"> · Fortschritt {shared.cur} / {shared.target}</span>}
                </span>
              </div>
            ) : info.remainingCount > 0 ? (
              <button onClick={onBuyAll} disabled={spBal < info.cost}
                className="w-full rounded-xl font-extrabold text-[12.5px] py-2.5 transition-opacity"
                style={{ background: spBal < info.cost ? "#3a2f12" : "linear-gradient(90deg,#f2c14a,#ffb84d)", color: "#141419",
                  boxShadow: spBal < info.cost ? undefined : "0 0 16px rgba(242,193,74,.3)", opacity: spBal < info.cost ? 0.6 : 1, cursor: spBal < info.cost ? "not-allowed" : "pointer" }}>
                Alles kaufen · {info.cost} SP{info.ownedCount > 0 && <small className="font-semibold opacity-75"> ({info.ownedCount} schon im Besitz)</small>}
              </button>
            ) : (
              <div className="grid place-items-center h-full text-[11px]" style={{ color: "#6d6a80" }}>Alle Elemente im Besitz</div>
            )}
          </div>

          {/* Element-Liste (auf maxEls aufgefüllt → stabile Höhe) */}
          <div className="text-[10px] font-extrabold tracking-[0.12em] uppercase mb-1.5" style={{ color: "#9a97ab" }}>
            {isChallenge ? "Enthaltene Elemente" : info.remainingCount === 0 ? "Elemente" : "Elemente — einzeln kaufbar · je 1 SP"}
          </div>
          <div className="flex flex-col gap-1.5">
            {theme.els.map((el) => {
              const def = ELEMENT_BY_KEY[el];
              const st = elementState(p, theme, el);
              const price = elementPrice(theme, el);
              const selected = el === sel;
              return (
                <button key={el} type="button" onClick={() => setSel(el)} className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors min-h-[40px]"
                  style={{ background: selected ? "#1c1830" : "#141320", border: `1px solid ${selected ? "#9b82f0" : "#2a2836"}` }}>
                  <span className="shrink-0 rounded-md" style={{ width: 22, height: 22, background: `${theme.a1}22`, border: `1px solid ${theme.a1}66` }} />
                  <span className="flex-1 text-[12px] font-bold truncate">{def.name}</span>
                  {st === "own" ? (
                    <OwnedAction el={el} theme={theme} deckId={deckId} bfId={bfId} options={options} onChoose={onChoose} />
                  ) : st === "lock" ? (
                    <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-lg whitespace-nowrap" style={{ background: "#1c1b24", color: "#9a97ab", border: "1px solid #2e2d38" }}>
                      {isChallenge ? "im Paket" : elementUnlock(p, theme, el).label}
                    </span>
                  ) : (
                    <button type="button" disabled={!canBuyElement(p, theme, el)} onClick={(e) => { e.stopPropagation(); onBuy(el); }}
                      className="text-[10px] font-extrabold px-2.5 py-1 rounded-lg transition-opacity"
                      style={{ background: canBuyElement(p, theme, el) ? "#f2c14a" : "#3a2f12", color: "#141419", opacity: canBuyElement(p, theme, el) ? 1 : 0.6, cursor: canBuyElement(p, theme, el) ? "pointer" : "not-allowed" }}>
                      Kaufen · {price}
                    </button>
                  )}
                </button>
              );
            })}
            {Array.from({ length: Math.max(0, maxEls - theme.els.length) }).map((_, i) => (
              <div key={`sp${i}`} className="min-h-[40px] rounded-xl" aria-hidden="true" style={{ border: "1px solid transparent" }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
