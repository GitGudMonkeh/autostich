import { useState } from "react";
import { SKILL_DEFS, ARCHETYPE_META, ARCHETYPE_ORDER, archetypeOf } from "../game/skills.js";
import { SKILL_SLOTS, LIGHTNING_CRIT_BASE, LIGHTNING_CRIT_PER_SKILL, LIGHTNING_MAX_CHARGE,
         PLANT_GREEN_THRESHOLD, PLANT_GROWTH_SKILL_REF } from "../game/constants.js";
import { GLOSSARY, glossaryKeywords } from "../game/glossary.js";
import { RoundScoreBadge } from "./RoundScoreBadge.jsx";
import { GlossaryPanel, GlossaryText } from "./Glossary.jsx";
import { FormationPanel } from "./FormationPanel.jsx";

// Archetyp-Meta eines Skills (Theming) — Fallback neutral (#93 F0).
const ac = (id) => ARCHETYPE_META[archetypeOf(id)] || { label: "Skill", icon: "•", color: "#8a8a95" };

// #238b: Was verschwindet, wenn der LETZTE Skill eines Archetyps abgelegt wird (Wahrheit: reducer.js stillActive-Pfad).
// Bereits in die Karten gebackener Wert (geschmiedet/gewachsen) bleibt erhalten → Zusatz nur bei Feuer/Pflanze.
const ARCH_LOSS = {
  plant:     { text: "alle grünen Karten & das Wachstum gehen verloren", baked: true },
  ice:       { text: "Frostkarten tauen auf, alle Schichten gehen verloren", baked: false },
  fire:      { text: "Hitze & Asche gehen verloren", baked: true },
  lightning: { text: "die Ladung geht verloren", baked: false },
};

const SOCKET_PCT = Math.round(LIGHTNING_CRIT_BASE * 100);         // einmaliger Aktivierungs-Sockel (5 %)
const PER_SKILL_PCT = Math.round(LIGHTNING_CRIT_PER_SKILL * 100); // je Blitz-Skill (8 %)

// Blitz-Akzent: violett/elektrisch (dieselbe Deck-/Archetyp-Farbe wie im HUD).
const LIGHT = "#8a7de0";

// Kleine Glossar-Liste (label — text) für einen Satz Schlüsselbegriffe. Wiederverwendet für den
// Archetyp-Passiv-Aufklapper (#201 P9) UND die Detailansicht gehaltener Skills (#201 P1).
function KeywordGlossary({ tokens }) {
  if (!tokens.length) return null;
  return (
    <div className="grid gap-1.5 mt-2">
      {tokens.map((k) => (
        <div key={k} className="text-xs leading-snug">
          <span className="font-bold" style={{ color: GLOSSARY[k].color }}>{GLOSSARY[k].icon} {GLOSSARY[k].label}</span>
          <span className="opacity-70"> — {GLOSSARY[k].text}</span>
        </div>
      ))}
    </div>
  );
}

/* Skill-Auswahl (docs/blitz-archetyp.md, Abschnitt 7): erscheint zu festen Zeitpunkten (DECISION_SCHEDULE, erstmals Runde 7) STATT eines Perks.
   Seltene, regelverändernde Motoren. Ablehnen → stattdessen ein Perk (Runde nie verschwendet).
   Bei vollen Slots: neuen Skill wählen → dann den zu ersetzenden Skill antippen (übergibt replaceId).
   #201 P9: Angebot bleibt kompakt (nur Name + Kurztext). Die ausführliche Passiv-Beschreibung des
   Archetyps (inkl. Schlüsselbegriffe) klappt per Tap/Klick auf den Archetyp-Header auf. */
export function SkillSelect({ offer, onPick, onDecline, onReroll, skills = [], state = {} }) {
  const held = skills.map((id) => SKILL_DEFS[id]).filter(Boolean);
  // Neuwurf (#263): eigener Skill-Reroll-Pool (2 je Lauf), kein Free-Reroll mehr.
  const rerollTokens = state.rerollsSkill || 0;
  const canReroll = !!onReroll && rerollTokens > 0;
  const full = skills.length >= SKILL_SLOTS;
  const [pending, setPending] = useState(null); // bei vollen Slots gewählter neuer Skill — wartet auf Ersetzungsziel
  const [openArch, setOpenArch] = useState(null);   // Archetyp, dessen Passiv-Beschreibung aufgeklappt ist (#201 P9)
  const devMode = !!state.devMode;                  // Dev-Run: Archetyp-Gruppen eingeklappt, Klick öffnet die Skills
  const [openGroup, setOpenGroup] = useState(null); // Dev-Run: welcher Archetyp gerade seine Skills zeigt
  const [pendingConsumer, setPendingConsumer] = useState(null); // #93: Konsumenten-Ersatzdialog { id, replace, type }

  // Ist der jeweilige Archetyp beim Spieler noch inaktiv → DIESER Skill schaltet ihn frei (erster Pick).
  const isFirstPick = {
    lightning: !(state.lightning && state.lightning.active),
    fire: !(state.heat && state.heat.active),
    ice: !(state.activeArchetypes || []).includes("ice"),
    plant: !(state.activeArchetypes || []).includes("plant"),
  };
  // Kurze Passiv-Erklärung je Archetyp (erster Pick = „schaltet frei", sonst = „vertieft"). Style-Guide: knapp,
  // Wirkung vor Bedingung. Ergänzt im Aufklapper durch die Glossar-Einträge der angebotenen Schlüsselbegriffe.
  const unlockLine = (arch) => {
    const first = isFirstPick[arch];
    switch (arch) {
      case "lightning": return first
        ? `Schaltet den Blitz-Archetyp frei: Ladung (Crits erzeugen Ladung, max ${LIGHTNING_MAX_CHARGE}) und eine Crit-Basis von +${SOCKET_PCT + PER_SKILL_PCT} % (Sockel +${SOCKET_PCT} % plus +${PER_SKILL_PCT} % je Blitz-Skill).`
        : `Jeder weitere Blitz-Skill gibt +${PER_SKILL_PCT} % Crit-Chance. Ladung und Crit-Basis sind bereits aktiv.`;
      case "fire": return first
        ? "Schaltet die Hitzeleiste frei (0–100 %): Siege mit klarem Wertvorsprung heizen auf und geben Feuer-Score, klare Niederlagen kühlen ab."
        : "Jeder weitere Feuer-Skill erhöht den Feuer-Score je Vorsprungspunkt. Die Hitzeleiste ist bereits aktiv.";
      case "ice": return first
        ? "Schaltet das Einfrieren frei: eigene Karten werden blau, biegen Formationen und dürfen 1× je Aufstellungsphase kostenlos getauscht werden. Jeder weitere Eis-Skill friert eine weitere Karte ein."
        : "Jeder weitere Eis-Skill friert eine weitere eigene Karte ein und erweitert deine Aufstellungs-Optionen.";
      case "plant": return first
        ? `Schaltet das Wachstum frei: eigene Karten wachsen bei Siegen — je mehr Pflanze-Skills, desto schneller (volles Tempo ab ${PLANT_GROWTH_SKILL_REF} Skills). Eine wachsende, noch nicht reife Karte ist ein Setzling; ab ${PLANT_GREEN_THRESHOLD} Wachstum wird sie grün und bildet einen Farbblock, der Score gibt.`
        : `Jeder weitere Pflanze-Skill beschleunigt das Wachstum (volles Tempo ab ${PLANT_GROWTH_SKILL_REF}) — mehr grüne Karten, größerer Farbblock. Wachstum und Grün sind bereits aktiv.`;
      default: return "";
    }
  };

  // Angebot nach Archetyp gruppieren (feste Reihenfolge). #93 F0: 2+2 …; jetzt bis zu 4 Fraktionen im Angebot.
  // #118: defensiver Guard — ein bereits gehaltener Skill erscheint NIE als Angebots-Karte (selbst bei inkonsistentem State).
  const groups = ARCHETYPE_ORDER
    .map((arch) => ({ arch, meta: ARCHETYPE_META[arch], ids: offer.filter((id) => archetypeOf(id) === arch && !skills.includes(id)) }))
    .filter((g) => g.ids.length);
  const showFormations = groups.some((g) => g.arch === "ice") || (skills || []).some((id) => archetypeOf(id) === "ice"); // #161 FB-1: Formations-Panel bei Eis-Relevanz

  // Konsumenten-Typ eines Skills (#93): Hitze („heat") / Ladung („charge") / kein Konsument (null).
  const consumerTypeOf = (id) => (SKILL_DEFS[id]?.heatConsumer ? "heat" : SKILL_DEFS[id]?.onFullCharge ? "charge" : null);
  const CONSUMER_LABEL = { heat: "Hitze", charge: "Ladungs" };

  // Freier Slot → direkt wählen. Volle Slots → neuen Skill vormerken → Ersetzen-Fenster (#234).
  // #234: Nur Blitz-LADUNGS-Konsumenten sind exklusiv (max 1) → Ersatzdialog beim zweiten. Feuer-HITZE-Konsumenten
  // dürfen mehrere gleichzeitig (heben sich nicht auf) → wie normale Skills behandeln.
  const clickSkill = (id) => {
    if (consumerTypeOf(id) === "charge" && !skills.includes(id)) {
      const existing = skills.find((s) => consumerTypeOf(s) === "charge");
      if (existing && existing !== id) {
        setPendingConsumer((cur) => (cur && cur.id === id ? null : { id, replace: existing, type: "charge" }));
        return;
      }
    }
    if (!full) { onPick(id); return; }
    setPending((cur) => (cur === id ? null : id)); // volle Slots → Ersetzen-Fenster öffnet über `pending`
  };

  return (
    <div className="fixed inset-0 overlay-root z-20 flex items-center justify-center p-4" style={{ background: "#0c0c1099", backdropFilter: "blur(3px)" }}>
      <div className="w-full max-w-3xl">
        <div className="relative w-full rounded-2xl p-6 max-h-[92dvh] overflow-y-auto overlay-card" style={{ background: "#181820", border: `1px solid ${LIGHT}66`, boxShadow: `0 0 26px ${LIGHT}22` }}>
        <GlossaryPanel className="absolute top-3 right-3 z-10" />
        <div className="text-center mb-1">
          <div className="text-xs uppercase tracking-widest" style={{ color: LIGHT }}>⚡ Skill · Durchlauf {(state.cycle || 0) + 1}</div>
          <h2 className="text-xl font-bold mt-1">Wähle einen Skill</h2>
          <p className="text-xs opacity-55 mt-1">
            Skills sind seltene, regelverändernde Motoren — {skills.length}/{SKILL_SLOTS} Slots belegt.
          </p>
          {state.lastCycleScore != null && <div className="mt-3"><RoundScoreBadge state={state} /></div>}
        </div>

        {/* Konsumenten-Ersatzdialog (#93): zweiter Konsument desselben Typs ersetzt den bestehenden. */}
        {pendingConsumer && (
          <div className="mt-3 rounded-lg px-3 py-3 text-xs leading-snug" style={{ background: "#d4a63a1a", border: "1px solid #d4a63a66", color: "#e8dcb8" }}>
            <div className="mb-2">
              Du hältst bereits den {CONSUMER_LABEL[pendingConsumer.type]}-Konsumenten{" "}
              <b style={{ color: ac(pendingConsumer.replace).color }}>{SKILL_DEFS[pendingConsumer.replace]?.name}</b>.{" "}
              <b style={{ color: ac(pendingConsumer.id).color }}>{SKILL_DEFS[pendingConsumer.id]?.name}</b> ersetzt ihn
              (höchstens 1 {CONSUMER_LABEL[pendingConsumer.type]}-Konsument). Deine aktuelle Ressource bleibt erhalten.
            </div>
            <div className="flex gap-2">
              <button onClick={() => { onPick(pendingConsumer.id, pendingConsumer.replace); setPendingConsumer(null); }}
                className="px-3 py-1.5 rounded font-bold transition-all hover:brightness-110" style={{ background: "#d4a63a", color: "#0c0c10" }}>Ersetzen</button>
              <button onClick={() => setPendingConsumer(null)}
                className="px-3 py-1.5 rounded transition-all hover:opacity-80" style={{ background: "#20202a", border: "1px solid #3a3a46", color: "#e8e8ea" }}>Abbrechen</button>
            </div>
          </div>
        )}

        {/* Bei vollen Slots: Hinweis, dass beim Wählen ein Ersetzen-Fenster erscheint (#234). */}
        {full && !pending && (
          <div className="mt-3 rounded-lg px-3 py-2 text-xs" style={{ background: "#d4a63a14", border: "1px solid #d4a63a55", color: "#e8dcb8" }}>
            Alle {SKILL_SLOTS} Slots belegt. Wähle einen neuen Skill — ein Fenster fragt dann, welchen du ersetzt.
          </div>
        )}

        {/* #234: Ersetzen-Fenster bei vollen Slots — zeigt alle gehaltenen Skills MIT Beschreibung; gilt für ALLE Archetypen. */}
        {full && pending && (
          <div className="fixed inset-0 z-30 flex items-center justify-center p-4" style={{ background: "#0c0c10cc", backdropFilter: "blur(3px)" }}>
            <div className="w-full max-w-md rounded-2xl p-5 max-h-[88dvh] overflow-y-auto overlay-card" style={{ background: "#181820", border: `1px solid ${LIGHT}66`, boxShadow: `0 0 26px ${LIGHT}22` }}>
              <div className="text-center mb-3">
                <div className="text-xs uppercase tracking-widest" style={{ color: "#d4a63a" }}>Slots voll</div>
                <h3 className="text-lg font-bold mt-1">Welchen Skill ersetzen?</h3>
                <p className="text-xs opacity-65 mt-1">
                  Neu: <b style={{ color: ac(pending).color }}>{ac(pending).icon} {SKILL_DEFS[pending]?.name}</b>. Tippe den Skill, der weichen soll.
                </p>
              </div>
              <div className="grid gap-2">
                {held.map((s) => {
                  const arch = archetypeOf(s.id);
                  // #238b: Ersetzt man DIESEN Skill, wird sein Archetyp nur dann deaktiviert, wenn er der letzte
                  // seiner Art ist UND der NEUE Skill (pending) nicht selbst denselben Archetyp hat (dann bleibt er aktiv).
                  const deactivates = !!arch && ARCH_LOSS[arch] && archetypeOf(pending) !== arch
                    && held.filter((h) => archetypeOf(h.id) === arch).length === 1;
                  return (
                  <button key={s.id} onClick={() => { onPick(pending, s.id); setPending(null); }}
                    className="text-left rounded-xl p-3 flex flex-col gap-1 transition-all hover:brightness-110"
                    style={{ background: "#20202a", border: `1px solid ${deactivates ? "#d1462f" : ac(s.id).color + "66"}` }}>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] px-1.5 py-0.5 rounded font-bold tracking-wide" style={{ background: `${ac(s.id).color}22`, color: ac(s.id).color, border: `1px solid ${ac(s.id).color}88` }}>{ac(s.id).icon} {ac(s.id).label.toUpperCase()}</span>
                      {(s.heatConsumer || s.onFullCharge) && <span className="text-[10px] px-1.5 py-0.5 rounded font-bold tracking-wide" style={{ background: "#d4a63a22", color: "#d4a63a", border: "1px solid #d4a63a88" }}>KONSUMENT</span>}
                      {s.legendary && <span className="text-[10px] px-1.5 py-0.5 rounded font-bold tracking-wide" style={{ background: "#e0b84522", color: "#e0b845", border: "1px solid #e0b84588" }}>★ LEGENDÄR</span>}
                    </div>
                    <div className="font-bold text-sm" style={{ color: ac(s.id).color }}>{s.name}</div>
                    <div className="text-xs opacity-75 leading-snug"><GlossaryText text={s.desc} /></div>
                    <div className="text-[10px] font-bold mt-0.5" style={{ color: "#e0605a" }}>↔ diesen ersetzen</div>
                    {/* #238b: gezielte Warnung — nur wenn dieses Ersetzen den letzten Skill des Archetyps entfernt. */}
                    {deactivates && (
                      <div className="mt-1 rounded px-2 py-1 text-[10px] font-bold leading-snug" style={{ background: "#3a1518", border: "1px solid #d1462f66", color: "#f0a898" }}>
                        ⚠ Letzter {ac(s.id).label}-Skill: {ARCH_LOSS[arch].text}.{ARCH_LOSS[arch].baked ? " Bereits aufgewerteter Kartenwert bleibt." : ""}
                      </div>
                    )}
                  </button>
                  );
                })}
              </div>
              <button onClick={() => setPending(null)} className="w-full mt-3 rounded-lg py-2 text-sm font-bold" style={{ background: "#20202a", color: "#e8e8ea", border: "1px solid #30303a" }}>Abbrechen</button>
            </div>
          </div>
        )}

        {/* Angebot nach Archetyp gruppiert. Der Header ist tappbar (#201 P9): er klappt die Passiv-Beschreibung
            des Archetyps + die Erklärung seiner Schlüsselbegriffe auf — das Angebot selbst bleibt kompakt. */}
        <div className="mt-5 grid gap-4">
          {groups.map((g) => {
            const detailOpen = openArch === g.arch;
            const groupKws = glossaryKeywords(g.ids, SKILL_DEFS);
            const groupOpen = devMode ? openGroup === g.arch : true; // Dev-Run: Skills erst nach Klick sichtbar
            return (
            <div key={g.arch}>
              <button type="button"
                onClick={() => devMode ? setOpenGroup(groupOpen ? null : g.arch) : setOpenArch(detailOpen ? null : g.arch)}
                className="w-full flex items-center gap-2 mb-2 text-left"
                title={devMode ? `${g.meta.label}: Skills ${groupOpen ? "einklappen" : "ausklappen"}` : `${g.meta.label}: Passiv ${detailOpen ? "einklappen" : "ausklappen"}`}
                aria-expanded={devMode ? groupOpen : detailOpen}>
                <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: g.meta.color }}>{g.meta.icon} {g.meta.label}</span>
                {/* #UI: dezenter, aber klar tappbarer „ausklappen"-Hinweis — kleiner Chip mit rotierendem Chevron.
                    Normal: klappt die Passiv-Beschreibung auf. Dev-Run: klappt die Skill-Liste des Archetyps auf. */}
                <span className="text-[10px] inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full transition-all hover:brightness-125"
                  style={{ color: g.meta.color, background: `${g.meta.color}14`, border: `1px solid ${g.meta.color}3a` }}>
                  <span className="transition-transform" style={{ display: "inline-block", transform: (devMode ? groupOpen : detailOpen) ? "rotate(90deg)" : "none" }}>▸</span>
                  {devMode ? `${g.ids.length} Skills` : "Passiv"}
                </span>
                {!devMode && !detailOpen && <span className="text-[10px] whitespace-nowrap shrink-0" style={{ color: "#6b6b76" }}>klicken für mehr Details</span>}
                <div className="flex-1 h-px" style={{ background: `${g.meta.color}33` }} />
              </button>
              {!devMode && detailOpen && (
                <div className="mb-3 rounded-lg px-3 py-2 text-xs leading-snug"
                  style={{ background: `${g.meta.color}14`, border: `1px solid ${g.meta.color}44` }}>
                  <div className="opacity-90">{unlockLine(g.arch)}</div>
                  <KeywordGlossary tokens={groupKws} />
                </div>
              )}
              {groupOpen && (
              <div className="grid sm:grid-cols-2 gap-3">
                {g.ids.map((id) => {
                  const s = SKILL_DEFS[id];
                  const sel = pending === id;
                  const col = g.meta.color;
                  return (
                    <button key={id} onClick={() => clickSkill(id)}
                      className={`text-left rounded-xl p-4 h-full flex flex-col gap-2 transition-all hover:-translate-y-0.5${s.legendary ? " as-legendary" : ""}`}
                      style={{ background: sel ? "#2a2740" : "#20202a",
                               // Legendär: einheitlicher Gold-Rahmen (Border + animierter Glanz via .as-legendary, #201.3) statt archetyp-farbigem Glow.
                               border: `1px solid ${s.legendary ? "#d4a63a" : (sel ? col : col + "88")}`,
                               boxShadow: s.legendary ? undefined : (sel ? `0 0 16px ${col}88` : `0 0 14px ${col}33`) }}>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] px-1.5 py-0.5 rounded font-bold tracking-wide"
                          style={{ background: `${col}22`, color: col, border: `1px solid ${col}88` }}>
                          {g.meta.icon} {g.meta.label.toUpperCase()}
                        </span>
                        {(s.heatConsumer || s.onFullCharge) && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold tracking-wide"
                            style={{ background: "#d4a63a22", color: "#d4a63a", border: "1px solid #d4a63a88" }}>
                            KONSUMENT
                          </span>
                        )}
                        {s.legendary && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded font-bold tracking-wide"
                            style={{ background: "#e0b84522", color: "#e0b845", border: "1px solid #e0b84588" }}>
                            ★ LEGENDÄR
                          </span>
                        )}
                        {sel && <span className="text-[10px] font-bold" style={{ color: col }}>✓ ausgewählt</span>}
                      </div>
                      <div className="font-bold" style={{ color: col }}>{s.name}</div>
                      <div className="text-sm opacity-75 leading-snug"><GlossaryText text={s.desc} /></div>
                    </button>
                  );
                })}
              </div>
              )}
            </div>
            );
          })}
        </div>

        <div className="text-center mt-5 flex flex-wrap items-center justify-center gap-2">
          {/* Dev-Run: Reroll entfällt (Voll-Katalog), und statt „Ablehnen → Perk" gibt es ein neutrales „Runde überspringen". */}
          {!devMode && canReroll && (
            <button onClick={onReroll}
              className="text-xs px-4 py-2 rounded-lg font-bold transition-all hover:brightness-110"
              style={{ background: "#20202a", color: "#d4a63a", border: "1px solid #d4a63a66" }}>
              🎲 Angebot neu würfeln · {rerollTokens} übrig
            </button>
          )}
          <button
            onClick={onDecline}
            className="text-xs px-4 py-2 rounded-lg transition-all hover:opacity-80"
            style={{ background: "#20202a", color: "#e8e8ea", border: "1px solid #30303a" }}
          >
            {devMode ? "Runde überspringen" : "Ablehnen → stattdessen ein Perk"}
          </button>
        </div>

        {held.length > 0 && (
          <div className="mt-5 pt-4 border-t" style={{ borderColor: "#2a2a33" }}>
            <div className="text-[11px] uppercase tracking-wide opacity-50 mb-2">
              Deine Skills — {held.length}/{SKILL_SLOTS} · bereits gehalten
            </div>
            {/* #201 P1 / #UI: gehaltene Skills zeigen ihre Beschreibung DIREKT (kein Antippen mehr) — man kann seinen
                Build auf einen Blick lesen. NEUTRAL (grau), damit sie nicht wie ein wählbares Angebot wirken. */}
            <div className="flex flex-col gap-2">
              {held.map((s) => (
                <div key={s.id} className="text-xs px-2.5 py-2 rounded leading-snug"
                  style={{ background: "#1c1c22", border: "1px solid #33333e" }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span style={{ color: ac(s.id).color }}>{ac(s.id).icon}</span>
                    <b style={{ color: "#c8c8d0" }}>{s.name}</b>
                    <span className="opacity-40 text-[11px]">✓ gehalten</span>
                  </div>
                  <div className="opacity-70" style={{ color: "#cfcad8" }}><GlossaryText text={s.desc} /></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* #161 FB-1: bei Eis-Relevanz die aktiven Formationen zeigen — Einfrieren biegt die Formationserkennung. */}
        {showFormations && (
          <div className="mt-5 pt-4 border-t" style={{ borderColor: "#2a2a33" }}>
            <FormationPanel state={state} title="Deine aktiven Formationen (Eis biegt die Erkennung)" />
          </div>
        )}
        </div>
      </div>
    </div>
  );
}
