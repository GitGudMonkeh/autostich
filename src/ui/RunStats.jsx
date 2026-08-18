import { useState } from "react";
import { rarityOf, RARITY_META, CATEGORIES } from "../game/perks.js";

import { ArchIcon } from "./FactionIcon.jsx"; // #308 zentrales Fraktions-Icon
import { fmtScore, fmtScoreShort } from "./format.js";
import { archMeta, familyDef, perkCat, perkDef, skillDef } from "../i18n/labels.js"; // #sprache: Skills/Archetypen/Familien zur Anzeigezeit
import { tierMeta, romanOf } from "../game/rarity.js"; // Familien-Perks: Stufenfarbe + römische Stufe (wie PerkList)
import { TOTAL_NODES } from "../game/progression.js"; // #global: Nenner des Baumstands (x/27)
import { t, fmtPct } from "../i18n/index.js";

/* #169 FB-8: wiederverwendbarer Run-Statblock — dieselben Kennzahlen wie im GameOver-/Victory-Screen plus die
   Perk-/Skill-Chips mit klickbarer Beschreibung. Genutzt vom End-Screen (GameOver) UND der Leaderboard-
   Detailansicht (RunDetail), damit beide denselben Satz zeigen — eine Quelle statt Duplikat (#161 FB-2 → FB-8).

   Victory-Redesign: der Block ist in zwei separat platzierbare Teile zerlegt, damit der Victory-Screen dem
   Mockup folgen kann (Kennzahlen in die „Stats"-Sektion, Build-Chips in die „Build"-Sektion):
     • RunStatCells  — die Kennzahl-Kacheln (Winrate/Serie/Bester Stich/Crit-Quote; + Score-Anteile für RunDetail).
     • RunBuildChips — Archetyp-Zusammenfassung + Perk-/Skill-Chips mit klickbarer Beschreibung.
   `RunStats` bleibt der kombinierte Wrapper (Kennzahlen dann Chips) — unveränderte API für RunDetail.

   Graceful degradation: `entry`-Felder sind alle optional. Fehlt eine Zahl (Alt-Eintrag / pre-Migration), zeigt
   die Kachel „–"; leere Perk-/Skill-Listen blenden ihren Block aus. `perks`/`skills` sind ID-Arrays. */
// #241: bigint-Spalten (score/formation_score/crit_bonus_score/best_trick_score/seed) kommen aus der Supabase-REST-API
// als JSON-STRINGS (PostgREST bewahrt so die Präzision) → als Zahl parsen, sonst „–". Lokale Läufe liefern bereits
// echte Zahlen → No-op. Ohne das zeigten fremde/globale Läufe bei den bigint-Kennzahlen leer (und der Crit-Block,
// dessen Sichtbarkeit an bestTrickScore>0 hängt, verschwand ganz).
const num = (v) => {
  const n = typeof v === "string" && v.trim() !== "" ? Number(v) : v;
  return typeof n === "number" && !Number.isNaN(n) ? n : null;
};

/* Kennzahl-Kachel im Karten-Stil (Victory-Redesign) — Rahmen + Label + Wert, nowrap+truncate gegen Overflow. */
function StatCard({ label, value, title, color }) {
  return (
    <div title={title} className="rounded-lg px-3 py-2 min-w-0" style={{ background: "#141419", border: "1px solid #2a2a34" }}>
      <div className="opacity-50 text-[11px] uppercase tracking-wide truncate">{label}</div>
      <div className="ty-num leading-tight whitespace-nowrap overflow-hidden text-ellipsis text-[15px] mt-0.5" style={color ? { color } : undefined}>{value == null ? "–" : value}</div>
    </div>
  );
}

/* #205 Anti-Copy, #global neu gezogen: `anonymized` (fremder Board-Eintrag) verdeckt nur noch die PERKS
   (und, beim Aufrufer RunDetail, die finale Aufstellung). Die SKILLS sind seit dem Global-Board sichtbar.
   Begründung für die verschobene Grenze: sechs Skills sind die Identität eines Laufs — ohne sie ist eine
   Bestenliste eine Namensliste mit Zahlen. Nachbauen lässt sich ein Lauf daran nicht; das hängt an den
   ~20 Perks und der Kartenreihenfolge, und genau die bleiben verdeckt. Statt die Perk-Zeile ersatzlos
   fehlen zu lassen, sagt ein Hinweis, dass da etwas absichtlich fehlt. */

/* Victory-Redesign: die reinen Kennzahl-Kacheln. `sourceCells` blendet die Score-Anteil-Kacheln
   (Form.-Score/Geb.-Score/Crit-Bonus) ein — im Victory-Screen aus (die Score-Herkunft deckt sie oben ab),
   in der Leaderboard-Detailansicht (RunDetail) an (dort gibt es keinen Herkunft-Balken). */
export function RunStatCells({ entry = {}, sourceCells = true }) {
  const bestStreak = num(entry.bestStreak);
  const maxFormations = num(entry.maxFormations);
  const formationScore = num(entry.formationScore);
  const buildingScore = num(entry.buildingScore); // #UI: Score-Anteil aus Architekt-Gebäuden
  const crits = num(entry.crits);
  const wins = num(entry.wins);
  const critBonusScore = num(entry.critBonusScore);
  const bestTrickScore = num(entry.bestTrickScore);
  const bestGlacierTrickScore = num(entry.bestGlacierTrickScore); // bester Gletscher-Stich (Bruch) — nur bei Eis-Läufen > 0
  const tricks = num(entry.tricks); // Gesamtzahl gespielter Stiche → Winrate-Nenner (auch im gespeicherten Eintrag vorhanden)

  const winrate = wins != null && tricks != null && tricks > 0 ? `${Math.round((wins / tricks) * 100)} %` : null;
  const critQuote = crits != null && wins != null && wins > 0 ? `${Math.round((crits / wins) * 100)} %` : (crits != null ? "0 %" : null);
  const shortOrNull = (v) => (v == null ? null : fmtScoreShort(v));
  const fullTitle = (desc, v) => (v == null ? desc : desc ? `${desc} · ${fmtScore(v)}` : fmtScore(v));

  return (
    <>
      {/* Kern-Kennzahlen (schlank, wie Mockup A): Winrate · Beste Serie · Bester Stich · Crit-Quote. */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatCard label={t("runstats.winrate")} value={winrate} title={t("runstats.winrate.title")} color="#5cc88a" />
        <StatCard label={t("runstats.bestStreak")} value={bestStreak == null ? null : `${bestStreak}×`} title={t("runstats.bestStreak.title")} />
        <StatCard label={t("runstats.bestTrick")} value={shortOrNull(bestTrickScore)} title={fullTitle(t("runstats.bestTrick.title"), bestTrickScore)} color="#d4a63a" />
        <StatCard label={t("runstats.critRate")} value={critQuote} title={t("runstats.critRate.title")} color="#e879f9" />
      </div>

      {/* #UI: Gletscher-Stich hat seine EIGENE Bestmarke (der Bruch-Score fließt nicht in „Bester Stich"). Nur zeigen,
          wenn im Lauf überhaupt ein Gletscher brach (> 0) → bei Nicht-Eis-Läufen bleibt die Kachel aus. */}
      {bestGlacierTrickScore != null && bestGlacierTrickScore > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
          <StatCard label={t("runstats.bestGlacier")} value={shortOrNull(bestGlacierTrickScore)}
            title={fullTitle("Höchster Score aus einem Gletscher-Stich (Bruch)", bestGlacierTrickScore)} color="#5ec8f0" />
        </div>
      )}

      {/* Score-Anteil-Kacheln — nur in der Detailansicht (im Victory-Screen deckt die Score-Herkunft das ab). */}
      {sourceCells && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2">
          <StatCard label={t("runstats.formations")} value={maxFormations} title={t("runstats.formations.title")} color="#5ab87a" />
          <StatCard label={t("runstats.formScore")} value={shortOrNull(formationScore)} title={fullTitle(t("runstats.formScore.title"), formationScore)} color="#5ab87a" />
          <StatCard label={t("runstats.buildScore")} value={shortOrNull(buildingScore)} title={fullTitle(t("runstats.buildScore.title"), buildingScore)} color="#5a8ade" />
          <StatCard label={t("runstats.critBonus")} value={shortOrNull(critBonusScore)} title={fullTitle(t("runstats.critBonus.title"), critBonusScore)} color="#e879f9" />
        </div>
      )}
    </>
  );
}

/* #kategorien — Perks und Familien nach KATEGORIE bündeln.
   Sortiert war die Wolke vorher nicht: die flachen Perks standen in ZUGRIFFS-Reihenfolge, die Familien nach
   Stufe, und die Kategorie steckte allein in der Chipfarbe — also in einer Information, die man erst zuordnen
   kann, wenn man die sieben Farben auswendig kennt. Gebündelt beantwortet die Zeile stattdessen die Frage,
   die man an einen fremden (oder den eigenen alten) Build stellt: WORAUF lag der Schwerpunkt.
   Reihenfolge der Gruppen = die des Registers (A Deck · B Stich · C Rolle · D Score · E Form · P Präzision ·
   S Ausbau), nicht die Häufigkeit — sonst wechselt die Anordnung von Lauf zu Lauf und man sucht jedes Mal neu.
   Innerhalb einer Gruppe bleibt es wie gehabt: erst die flachen Perks, dann die Familien nach Stufe. */
function groupByCategory(perks, families) {
  const groups = new Map();
  const put = (cat, item) => { if (!groups.has(cat)) groups.set(cat, []); groups.get(cat).push(item); };
  for (const id of perks || []) { const def = perkDef(id); if (def) put(def.cat, { kind: "perk", id, def }); }
  for (const f of families) { const fd = familyDef(f.id); if (fd) put(fd.cat, { kind: "family", id: f.id, tier: f.tier, fd }); }
  const order = Object.keys(CATEGORIES);
  return [...groups.entries()].map(([cat, items]) => ({ cat, items }))
    .sort((a, b) => order.indexOf(a.cat) - order.indexOf(b.cat));
}

/* Victory-Redesign: die Build-Chips — Archetyp-Zusammenfassung (aus den Skills abgeleitet) + Perk-/Skill-Chips
   mit klickbarer Beschreibung. `anonymized` (fremder Board-Eintrag) verdeckt die Perks, nicht die Skills. */
export function RunBuildChips({ entry = {}, anonymized = false }) {
  // null = unbekannt (Alt-Eintrag ohne die Spalte) → nicht rendern; [] = bekannt leer.
  const perks = Array.isArray(entry.perks) ? entry.perks : null;
  const skills = Array.isArray(entry.skills) ? entry.skills : null;
  /* FAMILIEN-Perks (#167). Seit der Rarität-Umbau die Kategorie-A-Perks zu FAMILIEN gemacht hat, ist der
     größte Teil dessen, was ein Spieler im Lauf wählt, gar kein Eintrag in `perks` mehr, sondern eine Stufe
     in `familyTiers`. Der Block zeigte deshalb nur die flachen Perks und die Legendären — für den Spieler
     „meine Perks fehlen". `entry.families` ist die Stufen-Map des Laufs ({ familyId: tier }), genau wie sie
     im State steht; die Leaderboard-Detailansicht übergibt sie nicht (die Spalte gibt es in der Datenbank
     nicht) und zeigt darum unverändert nur die flachen Perks. */
  const families = entry.families && typeof entry.families === "object"
    ? Object.entries(entry.families)
        .filter(([id, tier]) => tier > 0 && familyDef(id))
        .map(([id, tier]) => ({ id, tier }))
        .sort((a, b) => b.tier - a.tier || familyDef(a.id).name.localeCompare(familyDef(b.id).name))
    : [];

  // Archetyp-Zusammenfassung: Skills nach Archetyp gruppieren + zählen (z. B. Eis ×4 · Pflanze ×3).
  const archCounts = [];
  if (skills && skills.length) {
    const by = {};
    for (const id of skills) { const a = skillDef(id)?.archetype; if (a) by[a] = (by[a] || 0) + 1; }
    for (const a of Object.keys(by)) { const m = archMeta(a); if (m) archCounts.push({ ...m, n: by[a] }); }
    archCounts.sort((x, y) => y.n - x.n);
  }

  const [sel, setSel] = useState(null); // { kind, id } | null
  const toggle = (kind, id) => setSel((s) => (s && s.kind === kind && s.id === id ? null : { kind, id }));
  const famTier = (id) => (families.find((f) => f.id === id) || {}).tier;
  const selDetail = !sel ? null
    : sel.kind === "perk"
      ? (perkDef(sel.id) ? { title: perkDef(sel.id).label, desc: perkDef(sel.id).desc, color: RARITY_META[rarityOf(sel.id)].color } : null)
      : sel.kind === "family"
        // Beschreibung der GEHALTENEN Stufe (nicht der Familie insgesamt) — dieselbe Auflösung wie in PerkList.
        ? (familyDef(sel.id) && famTier(sel.id)
            ? { title: `${familyDef(sel.id).name} ${romanOf(famTier(sel.id))}`,
                desc: (familyDef(sel.id).tiers[famTier(sel.id)] || {}).desc || "",
                color: (tierMeta(famTier(sel.id)) || {}).color || perkCat(familyDef(sel.id).cat)?.color || "#8a8a95" }
            : null)
        : (skillDef(sel.id) ? { title: skillDef(sel.id).name, desc: skillDef(sel.id).desc, color: (archMeta(skillDef(sel.id).archetype) || {}).color || "#8a8a95" } : null);

  const showPerks = !anonymized && ((perks !== null && perks.length > 0) || families.length > 0);
  const showSkills = skills !== null && skills.length > 0;
  // Der Hinweis erscheint nur, wenn wirklich etwas verdeckt WIRD — bei einem Alt-Eintrag ohne Perk-Spalte
  // (perks === null) gibt es nichts zu verbergen, da wäre er eine Lüge.
  const showHidden = anonymized && perks !== null && perks.length > 0;
  if (!archCounts.length && !showSkills && !showPerks && !showHidden) return null;
  const perkTotal = (perks ? perks.length : 0) + families.length;
  const perkGroups = groupByCategory(perks, families);

  return (
    <div>
      {/* Archetyp-Zusammenfassung — auch bei anonymized sichtbar (nur Icons/Zahlen, kein 1:1-Nachbau). */}
      {/* #buildzeilen: Kopfreihe — Archetypen links, die Perk-Zahl rechts am Rand. Sie stand vorher als eigene
          zentrierte Zeile über den Chips und teilte den Block in zwei Mitten; als rechter Anschlag derselben
          Reihe beantwortet sie „wie viel habe ich genommen", ohne eine Zeile zu kosten. */}
      {(archCounts.length > 0 || showPerks) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          {archCounts.map((a) => (
            <span key={a.key} className="inline-flex items-center gap-1.5 text-[12px] font-bold px-2.5 py-0.5 rounded-full"
              style={{ background: `${a.color}1f`, color: a.color, border: `1px solid ${a.color}55` }}>
              <ArchIcon meta={a} size={13} /> {a.label} ×{a.n}
            </span>
          ))}
          {showPerks && (
            <span className="text-[10px] uppercase tracking-wider opacity-45 ml-auto">{t("runstats.perks", { n: perkTotal })}</span>
          )}
        </div>
      )}

      {(showSkills || showPerks || showHidden) && (
        <div className="rs-rows mt-3">
          {showPerks && (
            <div className="rs-groups">
              {perkGroups.map((g) => {
                const cm = perkCat(g.cat);
                const cc = cm?.color || "#8a8a95";
                return (
                  /* #buildzeilen: eine Zeile je Kategorie — Beschriftung in einer eigenen linken Spalte, Chips
                     links anschlagend daneben. Vorher lag beides in EINER zentrierten Flex-Reihe: die Zeilen
                     hatten damit weder eine gemeinsame linke Kante noch eine gemeinsame Beschriftungsbreite,
                     und je nach Chipzahl wanderte das Kategoriewort quer über den Block. */
                  <div key={g.cat} className="rs-row">
                    {/* Die Kategorie steht als Wort vor ihren Chips — in ihrer Farbe, damit Beschriftung und
                        Chipfarbe dasselbe sagen und die Farbe nicht mehr allein tragen muss. */}
                    <span className="rs-lbl text-[10px] uppercase tracking-wider font-bold" style={{ color: cc, opacity: 0.85 }}>
                      {cm?.name || g.cat}
                    </span>
                    <span className="rs-chips flex flex-wrap items-center gap-1.5">
                    {g.items.map((it) => {
                      if (it.kind === "perk") {
                        const rar = rarityOf(it.id);
                        const rm = RARITY_META[rar];
                        const on = sel && sel.kind === "perk" && sel.id === it.id;
                        return (
                          <button key={it.id} onClick={() => toggle("perk", it.id)} title={t("runstats.showDesc")}
                            className="text-[11px] px-2 py-0.5 rounded transition-all hover:brightness-125"
                            style={{ background: `${cc}22`, color: cc, border: `1px solid ${on ? cc : rar !== "common" ? rm.color : "transparent"}` }}>
                            {rm.mark ? `${rm.mark} ` : ""}{it.def.label}
                          </button>
                        );
                      }
                      /* Familien in DERSELBEN Gruppe wie die flachen Perks — für den Spieler ist beides „ein Perk,
                         das ich genommen habe"; die Trennung ist eine Implementierungsgrenze (#167), keine
                         Spielregel. Farbe kommt weiter von der STUFE (grau/grün/blau/lila wie in PerkList): die
                         Stufe ist die Information, die man an einer Familie sucht — die Kategorie sagt jetzt
                         die Beschriftung. */
                      const col = (tierMeta(it.tier) || {}).color || cc;
                      const on = sel && sel.kind === "family" && sel.id === it.id;
                      return (
                        <button key={`fam:${it.id}`} onClick={() => toggle("family", it.id)} title={t("runstats.showDesc")}
                          className="text-[11px] px-2 py-0.5 rounded transition-all hover:brightness-125"
                          style={{ background: `${col}22`, color: col, border: `1px solid ${on ? col : `${col}66`}` }}>
                          {it.fd.name} {romanOf(it.tier)}
                        </button>
                      );
                    })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
          {/* Die Skills sind dieselbe Sorte Zeile wie eine Perk-Kategorie — also auch dieselbe Form: Beschriftung
              links, Chips daneben. Als zentrierte Überschrift über einer zentrierten Wolke war sie die einzige
              Zeile des Blocks, die aus der Reihe fiel. */}
          {showSkills && (
            <div className="rs-row rs-row-sep">
              <span className="rs-lbl text-[10px] uppercase tracking-wider font-bold opacity-45">{t("runstats.skills")}</span>
              <span className="rs-chips flex flex-wrap items-center gap-1.5">
              {skills.map((id) => {
                const d = skillDef(id);
                if (!d) return null;
                const am = archMeta(d.archetype) || { color: "#8a8a95", icon: "" };
                const on = sel && sel.kind === "skill" && sel.id === id;
                return (
                  <button key={id} onClick={() => toggle("skill", id)} title={t("runstats.showDesc")}
                    className="text-[11px] px-2 py-0.5 rounded transition-all hover:brightness-125"
                    style={{ background: `${am.color}22`, color: am.color, border: `1px solid ${on ? am.color : d.legendary ? "#d4a63a" : "transparent"}` }}>
                    <ArchIcon meta={am} size={13} /> {d.legendary ? "★ " : ""}{d.name}
                  </button>
                );
              })}
              </span>
            </div>
          )}
          {selDetail && (
            <div className="mt-2 rounded-lg px-3 py-2 text-xs leading-snug" style={{ background: "#0e0e13", border: `1px solid ${selDetail.color}55` }}>
              <span className="font-bold" style={{ color: selDetail.color }}>{selDetail.title}</span>
              <span className="opacity-80"> — {selDetail.desc}</span>
            </div>
          )}
          {showHidden && (
            <div className="mt-2 rounded-lg px-3 py-2 text-[11px] leading-snug opacity-60" style={{ background: "#131318", border: "1px dashed #2f2f3b" }}>
              {t("runstats.hidden")}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* #global: Der Baumstand, mit dem ein Lauf gespielt wurde (x von 27 Upgrade-Knoten).
   Er steht hier und nicht in den Kennzahl-Kacheln, weil er KEINE Kennzahl des Laufs ist, sondern seine
   Vorbedingung — die Antwort auf „wie viel Meta-Fortschritt steckte hinter diesem Score".

   Rendert NICHTS, wenn der Wert fehlt (Alt-Eintrag, lokaler Lauf, noch nicht migriertes Schema). Das ist die
   bewusste Asymmetrie zur Liste: dort zeigt die Pille ein gestricheltes „–/27", weil ein fehlender Wert in
   einer Spalte sichtbar bleiben muss (sonst vergleicht man Zeilen mit ungleicher Grundlage). In der
   Einzelansicht gibt es nichts zu vergleichen, da wäre ein „kein Wert gespeichert"-Kasten nur Rauschen. */
export function RunTreeBlock({ treeNodes }) {
  const n = num(treeNodes);
  if (n == null) return null;
  const frac = Math.max(0, Math.min(1, TOTAL_NODES > 0 ? n / TOTAL_NODES : 0));
  return (
    // Der Abstand nach unten gehört zum Block selbst: der Aufrufer kann ihn nicht setzen, ohne bei fehlendem
    // Wert eine leere Lücke zu hinterlassen (die Komponente rendert dann null).
    <div className="rounded-xl px-3 py-2.5 mb-4" style={{ background: "#141419", border: "1px solid #2a2a34" }}>
      <div className="text-[10px] uppercase tracking-wider opacity-45 mb-1.5">{t("runstats.tree")}</div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="ty-num text-[15px]">{t("runstats.tree.nodes", { done: n, total: TOTAL_NODES })}</span>
        <span className="ty-num-sm text-[11px]" style={{ color: "var(--deck-a1, #8a7de0)" }}>{fmtPct(frac)}</span>
      </div>
      {/* Der Balken ist die eigentliche Aussage — die Zahl daneben liest man erst, wenn der Balken auffällt. */}
      <div className="h-1.5 rounded-full mt-2 overflow-hidden" style={{ background: "#1e1e26" }}>
        <div className="h-full rounded-full" style={{ width: `${frac * 100}%`, background: "var(--deck-a1, #8a7de0)" }} />
      </div>
      <div className="text-[10.5px] opacity-45 leading-snug mt-2">{t("runstats.tree.note")}</div>
    </div>
  );
}

/* Kombinierter Wrapper — Kennzahlen dann Build-Chips. Genutzt von der Leaderboard-Detailansicht (RunDetail);
   der Victory-Screen platziert RunStatCells und RunBuildChips separat (Stats- vs. Build-Sektion). */
/* Den kombinierten Wrapper `RunStats` gibt es nicht mehr: sein einziger Aufrufer (RunDetail) setzt die zwei
   Teile seit dem Desktop-Pass selbst, weil sie dort in ZWEI Spalten stehen. Beide Teile bleiben exportiert. */
