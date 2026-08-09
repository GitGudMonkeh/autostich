import { useState, useRef } from "react";
import { useEscape } from "./useEscape.js";
import { MODAL_CARD, TopHairline, STICKY_HEAD_BG, HAIRLINE } from "./modalStyle.jsx";
import {
  THEMES, THEME_DEFS, ELEMENT_DEFS, ELEMENT_BY_KEY, FX_KEYS, FX_OPTION_KEY,
  elementState, elementPrice, elementUnlock, elementOwned, themeState,
  buyAllInfo, sharedUnlock, canBuyElement, buyElement, buyAllForTheme,
} from "../game/themes.js";
import { deckAssets, battlefieldAssets } from "./cosmeticAssets.js";

/* #deckshop — DECK-WERKSTATT: Themes (Deck · Battlefield · Animationen) einzeln kaufen & mischen.
   Zwei Modi: „Meine Sammlung" (Besessenes an/aus, Deck & Battlefield mischbar) und „Vorschau · Alle"
   (Kachel-Galerie → Kauffenster mit Element-Vorschau & Einzelkauf). Kauf spendet SP (onProfileChange),
   Aktiv-Wahl/Animations-Toggles schreiben in die Optionen (onChoose). Reine Kosmetik. */

// Einmalig injizierte Keyframes für die Element-Vorschauen (Frame Glow / Holo Swipe / Hologrid).
const FX_CSS = `
@keyframes ws-frameglow{0%,100%{box-shadow:0 0 8px -2px var(--a1),inset 0 0 12px -6px var(--a1)}50%{box-shadow:0 0 22px 0 var(--a1),inset 0 0 20px -3px var(--a1)}}
@keyframes ws-swipe{0%{transform:translateX(-120%) rotate(18deg)}55%,100%{transform:translateX(320%) rotate(18deg)}}
@keyframes ws-gridmove{to{background-position:0 16px}}
`;

// Karten-Vorschau: illustrierter Deck-Rücken (Motiv) + optionaler Effekt-Overlay (frameGlow/holoSwipe).
function CardPreview({ deckId, a1, fx, className = "" }) {
  const img = deckAssets(deckId).back;
  return (
    <div className={`relative rounded-lg overflow-hidden ${className}`} style={{ aspectRatio: "3 / 4", background: "#0b0a16" }}>
      <img src={img} alt="" className="absolute inset-0 w-full h-full object-cover" />
      {fx === "frameGlow" && (
        <div className="absolute rounded-md pointer-events-none" style={{ inset: 5, border: `1.5px solid ${a1}`, animation: "ws-frameglow 2s ease-in-out infinite" }} />
      )}
      {fx === "holoSwipe" && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute" style={{ top: "-60%", left: 0, width: "40%", height: "220%",
            background: "linear-gradient(90deg,transparent,rgba(255,255,255,.28),rgba(120,220,255,.16),transparent)",
            animation: "ws-swipe 2.6s ease-in-out infinite" }} />
        </div>
      )}
    </div>
  );
}

// Battlefield-Vorschau: echtes BF-Bild + optionales Hologrid-Gitter in der Deck-Hauptfarbe (a1).
function BfPreview({ bfId, a1, fx, className = "" }) {
  const bf = battlefieldAssets(bfId);
  return (
    <div className={`relative rounded-lg overflow-hidden ${className}`} style={{ aspectRatio: "16 / 10", background: "#0b0a16" }}>
      {bf ? <img src={bf.desktop} alt="" className="absolute inset-0 w-full h-full object-cover" />
          : <div className="absolute inset-0 grid place-items-center text-xs opacity-40">Kein Battlefield</div>}
      {fx === "hologrid" && (
        <div className="absolute pointer-events-none" style={{
          left: "-20%", right: "-20%", bottom: 0, height: "48%",
          backgroundImage: `linear-gradient(${a1} 1px,transparent 1px),linear-gradient(90deg,${a1} 1px,transparent 1px)`,
          backgroundSize: "16px 16px", transform: "perspective(140px) rotateX(60deg)", transformOrigin: "bottom",
          opacity: 0.5, animation: "ws-gridmove 2.4s linear infinite" }} />
      )}
    </div>
  );
}

// Großes Vorschaufeld im Kauffenster — schaltet je nach gewähltem Element (Karte/BF/Animation).
function BigPreview({ theme, sel }) {
  if (sel === "bf" || sel === "hologrid") return <BfPreview bfId={theme.bfId} a1={theme.a1} fx={sel === "hologrid" ? "hologrid" : null} className="w-full max-h-[42vh]" />;
  const fx = sel === "frameGlow" || sel === "holoSwipe" ? sel : null;
  return (
    <div className="flex justify-center">
      <CardPreview deckId={theme.deckId} a1={theme.a1} fx={fx} className="max-h-[42vh]" />
    </div>
  );
}

// Kleine Deck-Rücken-Miniatur (für Sammlungs-Zeilen & Kacheln).
function DeckThumb({ deckId, className = "", face = "back", style }) {
  const img = deckAssets(deckId)[face];
  return <img src={img} alt="" className={`object-cover ${className}`} style={{ aspectRatio: "3 / 4", background: "#0b0a16", ...style }} />;
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
  const [ovIdx, setOvIdx] = useState(-1);      // Kauffenster-Theme-Index (-1 = zu)
  const [sel, setSel] = useState("deck");      // gewähltes Element im Kauffenster
  const spBal = Math.max(0, Math.floor(Number(p.stichPoints) || 0));

  const deckId = options?.deckId || "default";
  const bfId = options?.battlefieldId || "default";
  const activeTheme = THEMES.find((t) => t.deckId === deckId) || null; // Theme des aktiven Decks (für Animationen)

  const buy = (fn) => { if (onProfileChange) onProfileChange(fn(p)); };

  // Sammlungs-Listen: Themes, deren Deck bzw. Battlefield im Besitz ist.
  const ownedDeckThemes = THEMES.filter((t) => t.els.includes("deck") && elementOwned(p, t, "deck"));
  const ownedBfThemes   = THEMES.filter((t) => t.els.includes("bf")   && elementOwned(p, t, "bf"));

  const openOv = (i) => { setOvIdx(i); setSel(ELEMENT_DEFS[0].key); };
  const stepOv = (d) => { setOvIdx((i) => { const n = (i + d + THEMES.length) % THEMES.length; return n; }); setSel("deck"); };

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
            <h2 className="text-lg font-bold">🎴 Deck-Werkstatt</h2>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold px-2.5 py-1 rounded-lg" style={{ background: "#141320", border: "1px solid #34333f", color: "#f2c14a" }}>{spBal} SP</span>
              <button onClick={onClose} className="shrink-0 px-3 py-1.5 rounded-lg text-sm" style={{ background: "#20202a", border: "1px solid #3a3a46" }}>Schließen</button>
            </div>
          </div>
          {/* Modus-Umschalter */}
          <div className="flex gap-1.5 mt-3 p-1 rounded-xl" style={{ background: "#131219", border: "1px solid #2a2836" }}>
            {[["mine", "Meine Sammlung"], ["prev", "Vorschau · Alle"]].map(([m, label]) => (
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

      {ovIdx >= 0 && (
        <BuyOverlay theme={THEMES[ovIdx]} p={p} sel={sel} setSel={setSel} spBal={spBal}
          onStep={stepOv} onClose={() => setOvIdx(-1)}
          onBuy={(el) => buy((pf) => buyElement(pf, THEMES[ovIdx], el))}
          onBuyAll={() => buy((pf) => buyAllForTheme(pf, THEMES[ovIdx]))} />
      )}
    </div>
  );
}

/* ---- „Meine Sammlung" ---- */
function MineView({ p, deckId, bfId, activeTheme, options, ownedDeckThemes, ownedBfThemes, onChoose, onBrowse }) {
  const fxOwnedActive = (fx) => activeTheme && activeTheme.els.includes(fx) && elementOwned(p, activeTheme, fx);
  return (
    <>
      <p className="text-[11px] opacity-45 mt-2 leading-snug">
        Nur <b>Gekauftes/Freigeschaltetes</b> erscheint hier. Karte &amp; Battlefield sind über Themes hinweg <b>mischbar</b> (nur je eins aktiv); Animationen einzeln zuschaltbar.
      </p>

      {/* Kartendeck */}
      <div className={EYEBROW} style={{ color: "#9a97ab" }}>Kartendeck <span className="flex-1 h-px" style={{ background: "#2a2836" }} /><span className="normal-case tracking-normal font-semibold text-[10px]" style={{ color: "#6d6a80" }}>nur eins aktiv</span></div>
      <div className="flex flex-col gap-2">
        <SelectRow active={deckId === "default"} onClick={() => onChoose({ deckId: "default" })}
          thumb={<span className="grid place-items-center text-[10px] opacity-50" style={{ width: 34, height: 44, borderRadius: 6, background: "#171622" }}>▦</span>}
          title="Standard" sub="Grund-Deck" />
        {ownedDeckThemes.map((t) => (
          <SelectRow key={t.id} active={deckId === t.deckId} onClick={() => onChoose({ deckId: t.deckId })}
            thumb={<DeckThumb deckId={t.deckId} className="rounded-md" style={{ width: 34, height: 44 }} />}
            title={`${t.emblem} ${t.name}`} sub="Karte Front + Back" />
        ))}
      </div>

      {/* Battlefield */}
      <div className={EYEBROW} style={{ color: "#9a97ab" }}>Battlefield <span className="flex-1 h-px" style={{ background: "#2a2836" }} /><span className="normal-case tracking-normal font-semibold text-[10px]" style={{ color: "#6d6a80" }}>nur eins aktiv</span></div>
      <div className="flex flex-col gap-2">
        <SelectRow active={bfId === "default"} onClick={() => onChoose({ battlefieldId: "default" })}
          thumb={<span className="grid place-items-center text-[10px] opacity-50" style={{ width: 34, height: 44, borderRadius: 6, background: "#171622" }}>▦</span>}
          title="Standard" sub="Schlichter Grund" />
        {ownedBfThemes.map((t) => (
          <SelectRow key={t.id} active={bfId === t.bfId} onClick={() => onChoose({ battlefieldId: t.bfId })}
            thumb={<img src={battlefieldAssets(t.bfId)?.desktop} alt="" className="object-cover rounded-md" style={{ width: 34, height: 44 }} />}
            title={`${t.emblem} ${t.name}`} sub="Neon-Szene" />
        ))}
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
              <span className="grid place-items-center shrink-0" style={{ width: 34, height: 34, borderRadius: 7, background: "#171622", color: activeTheme?.a1 || "#8a7de0" }}>{def.icon}</span>
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

/* ---- „Vorschau · Alle" (Kachel-Galerie) ---- */
function PreviewView({ p, onOpen }) {
  return (
    <>
      <div className={EYEBROW} style={{ color: "#9a97ab" }}>Alle Themes <span className="flex-1 h-px" style={{ background: "#2a2836" }} /><span className="normal-case tracking-normal font-semibold text-[10px]" style={{ color: "#6d6a80" }}>tippen → Elemente einzeln kaufen</span></div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {THEMES.map((t, i) => {
          const s = themeState(p, t);
          const locked = s === "lock";
          const badge = s === "own" ? ["KOMPLETT", "#123a25", "#54e08a", "#2f7a4f"]
            : s === "mix" ? ["TEILS", "#251a2e", "#ff4dcb", "#5a3a63"]
            : s === "buy" ? ["KAUFBAR", "#2e2410", "#f2c14a", "#6b5320"] : null;
          const state = s === "own" ? ["✓ alle Elemente", "#54e08a"] : s === "mix" ? ["teils im Besitz", "#54e08a"]
            : s === "buy" ? ["Elemente kaufbar", "#f2c14a"] : ["🔒 Challenge", "#6d6a80"];
          return (
            <button key={t.id} type="button" onClick={() => onOpen(i)} className="relative rounded-xl overflow-hidden text-left transition-transform hover:-translate-y-0.5"
              style={{ background: "#14131c", border: "1px solid #2a2836" }}>
              <div className="relative" style={{ aspectRatio: "3 / 4" }}>
                <DeckThumb deckId={t.deckId} className="absolute inset-0 w-full h-full" style={{ filter: locked ? "grayscale(.7) brightness(.5)" : undefined }} />
                {locked && <div className="absolute inset-0 grid place-items-center text-2xl" style={{ textShadow: "0 1px 8px #000" }}>🔒</div>}
                {badge && <span className="absolute top-1.5 right-1.5 text-[9px] font-extrabold px-1.5 py-0.5 rounded" style={{ background: badge[1], color: badge[2], border: `1px solid ${badge[3]}` }}>{badge[0]}</span>}
              </div>
              <div className="px-2 py-1.5">
                <span className="text-[12px] font-extrabold flex items-center gap-1 truncate">{t.emblem} {t.name}</span>
                <span className="text-[10px]" style={{ color: state[1] }}>{state[0]}</span>
              </div>
            </button>
          );
        })}
      </div>
      <p className="text-[11px] mt-4 leading-snug pt-3" style={{ color: "#9a97ab", borderTop: "1px solid #2a2836" }}>
        Im Kauffenster hat <b>jedes Element</b> (Karte · Battlefield · jede Animation) eine <b>eigene Vorschau</b> und einen eigenen Kauf. Per ‹ › / Wischen durch alle Themes.
      </p>
    </>
  );
}

/* ---- Kauffenster (Element-Ebene) ---- */
function BuyOverlay({ theme, p, sel, setSel, spBal, onStep, onClose, onBuy, onBuyAll }) {
  const idx = THEMES.indexOf(theme);
  const shared = sharedUnlock(p, theme);        // Challenge → gemeinsame Freischalt-Beschreibung (statt Preisen)
  const isChallenge = !!shared;
  const info = buyAllInfo(p, theme);
  const ed = ELEMENT_BY_KEY[sel];
  const touch = useRef(0);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 overflow-y-auto"
      style={{ background: "#05050ad0", backdropFilter: "blur(4px)" }} onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl overflow-hidden my-auto" style={MODAL_CARD} onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
        onTouchEnd={(e) => { const dx = e.changedTouches[0].clientX - touch.current; if (Math.abs(dx) > 45) onStep(dx < 0 ? 1 : -1); }}>
        <div className="h-[3px] w-full" style={HAIRLINE} aria-hidden="true" />
        <div className="p-3.5">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-[15px] font-extrabold">{theme.emblem} {theme.name}</span>
            <button onClick={onClose} className="text-[11px] px-2.5 py-1 rounded-lg" style={{ background: "#20202a", border: "1px solid #3a3a46", color: "#9a97ab" }}>Schließen</button>
          </div>

          {/* Großes Element-Preview mit ‹ › */}
          <div className="flex items-center gap-2">
            <button onClick={() => onStep(-1)} className="shrink-0 grid place-items-center rounded-full text-[15px]" style={{ width: 30, height: 30, background: "#20202c", border: "1px solid #3a3a46" }}>‹</button>
            <div className="flex-1 min-w-0"><BigPreview theme={theme} sel={sel} /></div>
            <button onClick={() => onStep(1)} className="shrink-0 grid place-items-center rounded-full text-[15px]" style={{ width: 30, height: 30, background: "#20202c", border: "1px solid #3a3a46" }}>›</button>
          </div>
          <div className="text-center text-[10.5px] mt-2" style={{ color: "#9a97ab" }}>Vorschau: <b style={{ color: "#26c6e6" }}>{ed.name}</b> — {ed.desc}</div>
          <div className="flex gap-1.5 justify-center my-2">
            {THEMES.map((_, i) => <span key={i} className="rounded-full transition-all" style={{ width: i === idx ? 16 : 6, height: 6, background: i === idx ? "#9b82f0" : "#3a3947" }} />)}
          </div>

          {/* Challenge → Freischalt-Beschreibung statt Einzelpreisen */}
          {isChallenge && (
            <div className="flex gap-2.5 items-start rounded-xl px-3 py-2.5 mb-2.5" style={{ background: "#1a1622", border: "1px dashed #4a3a5a" }}>
              <span className="text-[17px] shrink-0" style={{ filter: "drop-shadow(0 0 6px #ff4dcb)" }}>🔒</span>
              <span className="text-[11.5px] leading-relaxed" style={{ color: "#cdbce4" }}>
                <b style={{ color: "#ff4dcb" }}>Challenge-Freischaltung</b> — schaltet das ganze Theme <b>auf einmal</b> frei.<br />
                <span className="font-extrabold" style={{ color: "#fff" }}>{shared.label}</span>
                {shared.target > 1 && <span className="opacity-70"> · Fortschritt {shared.cur} / {shared.target}</span>}
              </span>
            </div>
          )}

          {/* „Alles kaufen" (nur Kauf-Themes mit offenen Elementen) */}
          {!isChallenge && info.remainingCount > 0 && (
            <button onClick={onBuyAll} disabled={spBal < info.cost}
              className="w-full rounded-xl font-extrabold text-[12.5px] py-2.5 mb-2.5 transition-opacity"
              style={{ background: spBal < info.cost ? "#3a2f12" : "linear-gradient(90deg,#f2c14a,#ffb84d)", color: "#141419",
                boxShadow: spBal < info.cost ? undefined : "0 0 16px rgba(242,193,74,.3)", opacity: spBal < info.cost ? 0.6 : 1, cursor: spBal < info.cost ? "not-allowed" : "pointer" }}>
              Alles kaufen · {info.cost} SP{info.ownedCount > 0 && <small className="font-semibold opacity-75"> ({info.ownedCount} schon im Besitz)</small>}
            </button>
          )}

          {/* Element-Liste */}
          <div className="text-[10px] font-extrabold tracking-[0.12em] uppercase mb-1.5" style={{ color: "#9a97ab" }}>
            {isChallenge ? "Enthaltene Elemente" : "Elemente — einzeln kaufbar · je 1 SP"}
          </div>
          <div className="flex flex-col gap-1.5">
            {theme.els.map((el) => {
              const def = ELEMENT_BY_KEY[el];
              const st = elementState(p, theme, el);
              const price = elementPrice(theme, el);
              const selected = el === sel;
              return (
                <button key={el} type="button" onClick={() => setSel(el)} className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors"
                  style={{ background: selected ? "#1c1830" : "#141320", border: `1px solid ${selected ? "#9b82f0" : "#2a2836"}` }}>
                  <span className="grid place-items-center shrink-0" style={{ width: 26, height: 26, borderRadius: 7, background: "#20202c", color: theme.a1 }}>{def.icon}</span>
                  <span className="flex-1 text-[12px] font-bold truncate">{def.name}</span>
                  {st === "own" ? (
                    <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-lg" style={{ background: "#123a25", color: "#54e08a", border: "1px solid #2f7a4f" }}>✓ Besitz</span>
                  ) : st === "lock" ? (
                    <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-lg" style={{ background: "#1c1b24", color: "#6d6a80", border: "1px solid #2e2d38" }}>🔒 im Paket</span>
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
          </div>
        </div>
      </div>
    </div>
  );
}
