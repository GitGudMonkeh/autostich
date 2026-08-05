import { Fragment } from "react";
import { chargeConsumerOf } from "../game/skills.js";
import { ION_MAX_STACKS, ION_SAT_BREADTH_FRAC, ION_SAT_DEPTH_FRAC, ION_SATURATION_VALUE, CRIT_BASE_MULT } from "../game/constants.js";
import { IndicatorPanel } from "./indicators/panelKit.jsx";
import { LIGHTNING, CASCADE, CASCADE_BRIGHT } from "./indicators/vocab.js";

// ⚡ Blitz-Motor (Blitz-Archetyp) — eigener Block, nur sichtbar bei aktivem Blitz (lightning.active). v0.5:
//   • Sturm-Sättigung  zwei Stufen (Sturmgröße = Breite, Sturmintensität = Tiefe) je in % gegen die Schwelle;
//                      ⚡-Marker + Payoff, sobald die Stufe zündet (+Wert / Überschuss→Crit-Multi).
//   • Ladung           Segment-Maximum (Donnergott-Turbo löst früher aus).
//   • Entladungen       Kern-Metrik (volle Verbräuche/Runde) + Crit-Momentum (Gewitterfront/Entladung).
//   • Blitzfrequenz    Balken = Crit-Chance; ab 100 % überlagert der Crit-Multiplikator (von vorne). Pulst je Entladung.
//   • Serienkette      SERIE (winStreak); Label UNTER der Kette; reißt bei Niederlage.
// Rein anzeige-seitig: liest state.lightning + skills + winStreak + Crit-Chance/-Mult, keine Engine-Logik.
const CONSUMER_LABEL = { ionize: "Ionisierung" };
const CHAIN_VISIBLE = 16;  // sichtbare Kettenglieder (v0.5: granularer); darüber zählt „×N" weiter (winStreak ungedeckelt)

const mlt = (x) => x.toFixed(2).replace(".", ",");

// Serienkette → Segment-Kette: VERBUNDENE Glieder (gefüllt = Serienstufen), leading edge glüht. Label UNTER der Kette (v0.5).
function StreakChain({ streak }) {
  const filled = Math.min(streak, CHAIN_VISIBLE);
  return (
    <div>
      <div className="flex items-center">
        {Array.from({ length: CHAIN_VISIBLE }, (_, i) => {
          const on = i < filled;
          const prevOn = i > 0 && i - 1 < filled;
          const leading = on && i === filled - 1; // wachsende Kante glüht heller
          return (
            <Fragment key={i}>
              {i > 0 && (
                <div style={{ width: 3, height: 3, background: on && prevOn ? CASCADE : "#26262e" }} />
              )}
              <div className="flex-1 rounded transition-all" style={{
                height: 11,
                background: on ? (leading ? CASCADE_BRIGHT : CASCADE) : "#26262e",
                boxShadow: leading ? `0 0 7px ${CASCADE}` : undefined,
              }} />
            </Fragment>
          );
        })}
      </div>
      <div className="flex justify-between text-xs mt-1.5">
        <span className="opacity-60">🔗 Serienkette{streak > 0 && <span style={{ color: CASCADE_BRIGHT }}> · hält</span>}</span>
        <span className="font-bold tabular-nums" style={{ color: streak > 0 ? CASCADE_BRIGHT : "#6a6a72" }}>
          {streak > 0 ? `×${streak}` : "gerissen"}
        </span>
      </div>
    </div>
  );
}

// Sturm-Sättigung (v0.5): eine Stufe mit Mini-Balken, in % gegen die Schwelle; ⚡ + Payoff, sobald die Stufe zündet.
function SatRow({ label, cur, max, on, payoff }) {
  const pct = max > 0 ? Math.min(100, Math.round((cur / max) * 100)) : 0;
  return (
    <div>
      <div className="flex justify-between text-[11px] mb-0.5">
        <span className="opacity-55">{label} <span className="tabular-nums opacity-80">{pct}%</span></span>
        {on
          ? <span className="font-semibold" style={{ color: CASCADE_BRIGHT }}>⚡ {payoff}</span>
          : <span className="opacity-35">{payoff}</span>}
      </div>
      <div className="w-full rounded-full overflow-hidden" style={{ background: "#26262e", height: 5 }}>
        <div className="h-full rounded-full transition-all" style={{
          width: `${pct}%`,
          background: on ? CASCADE_BRIGHT : LIGHTNING,
          boxShadow: on ? `0 0 6px ${CASCADE_BRIGHT}` : undefined,
        }} />
      </div>
    </div>
  );
}

export function ChargeBar({ lightning, skills = [], winStreak = 0, critChance = 0, critMult = CRIT_BASE_MULT, deck = [] }) {
  if (!lightning || !lightning.active) return null;
  const { charge, maxCharge } = lightning;
  // Sturm-Sättigung: Sturmgröße = Karten mit ≥1 Stapel gegen Schwelle · Sturmintensität = volle (5-Stapel-)Karten gegen Schwelle.
  const ionN = deck.reduce((t, c) => t + ((c.ionStacks || 0) > 0 ? 1 : 0), 0);
  const ionFull = deck.reduce((t, c) => t + ((c.ionStacks || 0) >= ION_MAX_STACKS ? 1 : 0), 0);
  const breadthThresh = Math.ceil(deck.length * ION_SAT_BREADTH_FRAC);
  const depthThresh = Math.ceil(deck.length * ION_SAT_DEPTH_FRAC);
  const breadthOn = deck.length > 0 && ionN >= breadthThresh;
  const depthOn = deck.length > 0 && ionFull >= depthThresh;
  // Crit-Momentum + Motor-Zähler (v0.5).
  const stormPp = Math.round((lightning.stormCritBonus || 0) * 100);
  const entMult = lightning.entladungMult || 0;
  const consumeCount = lightning.consumeCount || 0;
  const shieldCount = lightning.serienschutzCount || 0;
  const full = charge >= maxCharge;
  const consumer = CONSUMER_LABEL[chargeConsumerOf(skills)];
  const streak = winStreak || 0;

  // Blitzfrequenz (v0.5): Balken zeigt Crit-Chance; ab 100 % (Überladen) überlagert der Crit-Multiplikator von vorne.
  const critPct = Math.round(Math.max(0, critChance) * 100);
  const overcharge = critChance >= 1;
  // Overlay-Füllung: wie weit der Crit-Mult über der Basis liegt (Basis = leer, 2×Basis = voll) — grobe Visualisierung; die Zahl ist exakt.
  const critMultFrac = Math.min(1, Math.max(0, (critMult - CRIT_BASE_MULT) / CRIT_BASE_MULT));

  return (
    <IndicatorPanel className="relative grid gap-3">
      {/* Blitzfrequenz-Puls (v0.5): violettes Rahmen-Glühen je Entladung (wie der Battlefield-Bloom); remount je consumeCount replayt die Animation. */}
      <div key={consumeCount} className="as-blitz-pulse pointer-events-none absolute inset-0 rounded-xl" aria-hidden="true" />
      {/* Sturm-Sättigung (v0.5): die zwei Stufen + ihre Payoffs live — das Herzstück des Reworks. */}
      {ionN > 0 && (
        <div className="grid gap-1.5">
          <div className="text-xs opacity-60">🌐 Sturm-Sättigung</div>
          <SatRow label="Sturmgröße" cur={ionN} max={breadthThresh} on={breadthOn} payoff={`+${ION_SATURATION_VALUE} Wert / Karte`} />
          <SatRow label="Sturmintensität" cur={ionFull} max={depthThresh} on={depthOn} payoff="Überschuss → Crit-Multi" />
        </div>
      )}

      {/* Ladung — Segment-Maximum (Cyan), glüht bei VOLL. */}
      <div>
        <div className="flex justify-between text-xs mb-1.5">
          <span className="opacity-60">⚡ Ladung{full && <span style={{ color: LIGHTNING }}> · VOLL GELADEN</span>}</span>
          <span className="font-bold tabular-nums" style={{ color: LIGHTNING }}>{charge} / {maxCharge}</span>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: maxCharge }, (_, i) => {
            const on = i < charge;
            return (
              <div key={i} className="flex-1 rounded-sm transition-all" style={{
                height: 12,
                background: on ? LIGHTNING : "#26262e",
                boxShadow: on && full ? `0 0 7px ${LIGHTNING}` : undefined,
              }} />
            );
          })}
        </div>
      </div>

      {/* Entlade-Motor (v0.5): Entladungen/Runde (Kern-Metrik) + Crit-Momentum (Gewitterfront/Entladung). */}
      {(consumeCount > 0 || stormPp > 0 || entMult > 0) && (
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-[11px]">
          <span className="opacity-60" title="Volle Ladungsverbräuche diesen Lauf — der Kern-Rhythmus des Sturms.">⚡ Entladungen <b className="tabular-nums" style={{ color: LIGHTNING }}>{consumeCount}</b></span>
          {stormPp > 0 && <span className="opacity-60" title="Gewitterfront: Crit-Chance-Momentum je Entladung (uncapped, Überschlag ist das Ventil).">Gewitterfront <b style={{ color: CASCADE_BRIGHT }}>+{stormPp} pp</b></span>}
          {entMult > 0 && <span className="opacity-60" title="Entladung: dauerhaftes Crit-Multiplikator-Momentum je Entladung.">Entladung <b style={{ color: CASCADE_BRIGHT }}>+{mlt(entMult)}×</b></span>}
        </div>
      )}

      {/* Blitzfrequenz — Balken = Crit-Chance; ab 100 % überlagert der Crit-Multiplikator (von vorne). Pulst je Entladung. */}
      <div>
        <div className="flex justify-between text-xs mb-1">
          <span className="opacity-60">⚡ Blitzfrequenz</span>
          <span className="font-bold tabular-nums" style={{ color: overcharge ? CASCADE_BRIGHT : LIGHTNING }}
            title={overcharge ? "Crit voll — die Leiste zeigt jetzt den Crit-Multiplikator." : "Crit-Chance des nächsten Siegs."}>
            {overcharge ? `Crit ×${mlt(critMult)}` : `${critPct}%`}
          </span>
        </div>
        <div className="relative w-full rounded-full overflow-hidden" style={{ background: "#26262e", height: 9 }}>
          <div className="h-full rounded-full transition-all" style={{
            width: `${Math.min(critPct, 100)}%`,
            background: `linear-gradient(90deg, ${LIGHTNING}, ${CASCADE}, ${CASCADE_BRIGHT})`,
          }} />
          {overcharge && (
            <div className="absolute inset-y-0 left-0 rounded-full transition-all" style={{
              width: `${Math.round(critMultFrac * 100)}%`,
              background: "linear-gradient(90deg, #e9d67a, #fff4b8)", // leichtes Gelb = Crit-Multiplikator
              boxShadow: "0 0 8px rgba(240,220,130,0.75)",
            }} />
          )}
        </div>
      </div>

      {/* Serienkette (SERIE) — direkt unter der Blitzfrequenz; Label unter der Kette; reißt bei Niederlage. */}
      <StreakChain streak={streak} />
      {/* Serienschutz (v0.5): sichtbar, wenn ein Verlust die Serie gehalten hat (½ Ladung). */}
      {shieldCount > 0 && (
        <div className="flex">
          <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold" title="Serienschutz: eine Niederlage mit genug Ladung hielt die Serie (½ Ladung verbraucht)."
            style={{ background: `${CASCADE}22`, color: CASCADE_BRIGHT, border: `1px solid ${CASCADE}66` }}>
            🛡 {shieldCount}× Serie gehalten
          </span>
        </div>
      )}

      {consumer ? (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[10px] px-1.5 py-0.5 rounded font-semibold"
            style={{ background: `${LIGHTNING}22`, color: LIGHTNING, border: `1px solid ${LIGHTNING}66` }}>
            Konsument: {consumer}
          </span>
        </div>
      ) : full ? (
        <div className="text-[11px] leading-snug rounded px-2 py-1.5"
          style={{ background: `${LIGHTNING}14`, color: LIGHTNING, border: `1px solid ${LIGHTNING}44` }}>
          ⚡ Voll — ohne Konsument verpufft die Ladung. Wähle <b>Ionisierung</b>, um sie zu verbrauchen.
        </div>
      ) : null}
    </IndicatorPanel>
  );
}
