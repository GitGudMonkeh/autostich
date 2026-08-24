import { useState } from "react";
import { useIsWide } from "./useIsWide.js"; // #desktop: ab 1280 px derselbe gerahmte Screen wie nach einem Lauf
import { overlayPortal } from "./overlayPortal.jsx"; // #overlay-portal: eine Regel für alle Vollbild-Overlays
import { useEscape } from "./useEscape.js";
import { RunStatCells, RunBuildChips, RunTreeBlock } from "./RunStats.jsx";
import { Sparkline } from "./Sparkline.jsx";   // #rd-verlauf: derselbe Graph wie im Victory-Screen
import { RunGraphs } from "./RunGraphs.jsx";   // #rd-verlauf: Stich-Score je Durchlauf
import { fmtDuration } from "../game/deck.js";
import { CardGrid } from "./CardGrid.jsx"; // #201.8 Stufe B: finale Aufstellung aus dem Snapshot (schreibgeschützt)
import { SeedChip } from "./SeedChip.jsx"; // #205 Challenger Mode: Seed kopieren / nachspielen
import { MODAL_CARD, TopHairline, STICKY_HEAD_BG, ActionButton } from "./modalStyle.jsx";
import { fmtScore } from "./format.js";
import FormIcon from "./FormIcon.jsx";
import { ArchToggle } from "./ArchPanels.jsx"; // #398: geteilter Gebäude-Umschalter (eine Quelle für alle vier Bildschirme)
import { CATEGORIES, RARITY_META, rarityOf } from "../game/perks.js"; // #rd-zaehlen: die sieben Perk-Kategorien + die Raritätsfarbe
import { ARCHETYPE_ORDER } from "../game/skills.js";                   // #rd-zaehlen: die vier Fraktionen
import { CATEGORIES as ARCH_CATEGORIES } from "../game/architect.js";  // #rd-zaehlen: value · score · formation
import { romanOf, tierMeta } from "../game/rarity.js";
import { archFamily, archCatDef, archMeta, perkCat, perkDef, skillDef, familyDef } from "../i18n/labels.js"; // #sprache: Namen zur Anzeigezeit
import { t, fmtNum } from "../i18n/index.js";

/* #169 FB-8: Detailansicht eines Bestenlisten-Eintrags (lokal ODER global) — Overlay über der Liste, zeigt
   denselben Statblock wie der eigene Victory-Screen (RunStats). Escape/Klick-außen schließt. `entry` ist bereits
   normalisiert (perks/skills als ID-Arrays; global-Strings dekodieren die Aufrufer). Alt-/pre-Migration-Einträge
   liefern nur einen Teil der Felder → RunStats zeigt „–" bzw. blendet leere Blöcke aus. */
/* #205: `anonymized` (fremder Board-Eintrag) blendet Build-Blöcke aus — Perk-/Skill-Chips (via RunStats) UND
   die finale Aufstellung — sodass fremde Runs nicht 1:1 nachbaubar sind (nur Kennzahlen/Icons/Score/Seed).
   Eigene/lokale Läufe bleiben voll. `onPlaySeed` (optional) macht den Seed-Chip nachspielbar. */

/* #menu-rework M7 — DAS LAUF-FENSTER, `docs/statistik-redesign.md` §„Das Lauf-Fenster".

   Drei Umbauten, und alle drei sind DOM-Struktur statt Anordnung:

   1. **Der Kopf verlässt den Scroller**, wie in der Statistik. Die Karte klemmt auf die Fensterhöhe,
      `.rd-body` scrollt. Gemessen war das Fenster beim vollen Lauf 1591,8 px hoch gegen 720 px
      Bildschirm — dass es passt, wird nicht behauptet; erreichbar ist alles.
   2. **Die Aufstellung bekommt eine Spur über beide Reihen** und die erste Reihe misst fest 380 px.
      Damit verschwindet das gemessene Loch unter dem Brett (455–598 px, je nach Größe) — und die
      Klammer `.rd-left`, die es bisher notdürftig eindämmte, wird überflüssig: sie stand nur da,
      weil ein überspannendes Element seine Mehrhöhe auf alle Zeilen verteilt, die es kreuzt. Eine
      FESTE erste Zeile hat dieses Problem nicht.
   3. **Der Build wird gezählt statt aufgezählt** (design-sprache.md §1). Gemessen flossen 27 Chips
      inhaltsbreit (49,97–135,34 px) durch das Panel, und keine einzige Beschreibung war erreichbar.
      Fünfzehn feste Felder sagen dieselbe Menge in fester Fläche — und einen Klick entfernt steht
      jeder Eintrag mit Stufe und Wirkung.

   Unter 1280 px ändert sich nichts: `wide` schaltet die DOM-Struktur, und die schmale Fassung
   behält ihre Chips, ihre eine Spalte und ihren Karten-Scroller. */

/* #rd-verlauf: eine Kennzahl der Kopfzeile — Wert groß, Beschriftung klein darunter. Bewusst KEINE Kachel
   (RunStatCells): das hier ist der Rahmen des Laufs (wie lang, wie weit), nicht sein Ergebnis. */
function HeadStat({ label, value, title }) {
  return (
    <div className="rd-kpi-i min-w-0" title={title}>
      <div className="ty-num text-body-lg-3 leading-none whitespace-nowrap">{value}</div>
      <div className="text-meta-1 uppercase tracking-wider opacity-45 mt-1 truncate">{label}</div>
    </div>
  );
}

/* ============================================================================
   #rd-zaehlen — ZÄHLEN STATT AUFZÄHLEN (design-sprache.md §1).

   Fünfzehn Felder, immer gleich viele, in drei Gruppen. Jede Zahl steht in der Kategoriefarbe — sie
   ist INHALT, kein Chrome (§3). Leere Kategorien bleiben stehen und sind gedämpft (§1, *Ziel*).

   DIE ZAHLEN SIND ABGELESEN, NICHT GESCHÄTZT:
     Skills nach Fraktion    4   `ARCHETYPE_ORDER` — es gibt genau so viele
     Perks nach Kategorie    8   `CATEGORIES` (perks.js) sind sieben, plus Legendär
     Gebäude nach Kategorie  3   `CATEGORIES` (architect.js) = value · score · formation

   EINE MESSUNG, DIE HIERHER GEHÖRT UND EIN BEFUND IST. Ein Lauf in der lokalen Historie trägt KEIN
   `families`-Feld: `App.jsx` schreibt `perks` und `skills` und sonst nichts vom Wahl-Satz, und nur
   der Endscreen reicht `families` aus dem Live-State durch. Seit dem Familien-Umbau (#167) sind die
   gewöhnlichen Perks aber genau das — Familien —, und von `PERK_DEFS` sind 21 von 22 Einträgen
   legendär. Ein gespeicherter Lauf kann in diesem Panel deshalb praktisch nur Legendäre zeigen.
   Das ist eine Aussage über die PERSISTENZ, nicht über dieses Panel, und sie wird hier weder
   versteckt noch repariert: die sieben Kategorien stehen gedämpft da und sagen die Wahrheit über
   das, was gespeichert wurde. (Nachweis: `measurements/M7.md`, Befund M7-F06.)

   DISJUNKT, und das ist die einzige Lesart, die aufgeht: ein Eintrag landet in „Legendär", wenn er
   legendär ist, sonst in seiner Kategorie. Acht Felder, deren Summe die Gesamtzahl ist — ein
   Querschnitts-Feld hätte doppelt gezählt und die Summe zur Lüge gemacht.
   ============================================================================ */

const LEG_KEY = "__leg";

/* Ein Eintrag der geöffneten Liste: Name, Stufe, Wirkung — genau die drei Dinge, die eine Chip-Wolke
   nie zeigen konnte. `tier` ist optional (ein flacher Perk hat keine). */
const entryOf = (id, name, tier, desc, color) => ({ id, name, tier: tier || null, desc: desc || "", color });

function skillFields(skills) {
  const by = new Map(ARCHETYPE_ORDER.map((a) => [a, []]));
  for (const id of skills || []) {
    const d = skillDef(id);
    if (!d || !by.has(d.archetype)) continue;
    by.get(d.archetype).push(entryOf(id, d.name, d.legendary ? t("arch.legendaryCap") : null, d.desc,
      (archMeta(d.archetype) || {}).color || "#8a8a95"));
  }
  return ARCHETYPE_ORDER.map((a) => {
    const m = archMeta(a) || {};
    return { key: a, label: m.label || a, color: m.color || "#8a8a95", items: by.get(a) };
  });
}

function perkFields(perks, families) {
  const by = new Map(Object.keys(CATEGORIES).map((k) => [k, []]));
  by.set(LEG_KEY, []);
  const put = (key, item) => (by.get(key) || by.get(LEG_KEY)).push(item);
  for (const id of perks || []) {
    const d = perkDef(id);
    if (!d) continue;
    const rar = rarityOf(id);
    const rm = RARITY_META[rar] || {};
    put(rar === "legendary" ? LEG_KEY : d.cat,
      entryOf(id, d.label, rar === "common" ? null : rm.label, d.desc, rm.color || perkCat(d.cat)?.color || "#8a8a95"));
  }
  /* Familien gibt es nur, wo der Aufrufer sie mitliefert (heute: der Endscreen). Ein gespeicherter
     Lauf hat sie nicht — s. den Kopf dieses Abschnitts. Der Zweig steht trotzdem hier, damit das
     Panel dieselbe Antwort gäbe, sobald sie persistiert werden. */
  for (const [id, tier] of Object.entries(families || {})) {
    const fd = tier > 0 ? familyDef(id) : null;
    if (!fd) continue;
    put(fd.cat, entryOf(`fam:${id}`, `${fd.name} ${romanOf(tier)}`, null,
      (fd.tiers?.[tier] || {}).desc || "", (tierMeta(tier) || {}).color || perkCat(fd.cat)?.color || "#8a8a95"));
  }
  const cats = Object.keys(CATEGORIES).map((k) => {
    const cm = perkCat(k) || {};
    return { key: k, label: cm.name || k, color: cm.color || "#8a8a95", items: by.get(k) };
  });
  return [...cats, { key: LEG_KEY, label: t("arch.legendaryCap"), color: RARITY_META.legendary.color, items: by.get(LEG_KEY) }];
}

function buildingFields(buildings, cover) {
  const by = new Map(ARCH_CATEGORIES.map((k) => [k, []]));
  for (const b of buildings || []) {
    const fam = archFamily(b.familyId);
    if (!fam || !by.has(fam.category)) continue;
    const anchor = Math.min(...b.footprint);
    const meta = archCatDef(fam.category) || {};
    by.get(fam.category).push(entryOf(b.id, fam.name,
      fam.legendary ? t("arch.legendaryCap") : t("arch.tier", { tier: romanOf(b.tier) }),
      cover?.[anchor]?.effects?.join(" · ") || "", fam.legendary ? "#d4a63a" : (meta.color || "#8a8a92")));
  }
  return ARCH_CATEGORIES.map((k) => {
    const m = archCatDef(k) || {};
    return { key: k, label: m.label || k, color: m.color || "#8a8a95", items: by.get(k) };
  });
}

/* Ein Zählfeld. GESCHLOSSEN ist es eine Kachel (Zahl groß, Name darunter), OFFEN ein Reiter (flach,
   die Unterkante in seiner Farbe, wenn es das gewählte ist) — dieselben Felder, dieselbe Reihenfolge,
   dieselben Farben. Ein leeres Feld bleibt stehen und ist gedämpft; es ist nicht bei null, es ist
   leer, und das ist eine andere Aussage (§5). */
function BuildField({ field, tab, on, onOpen }) {
  const n = field.items.length;
  return (
    <button type="button" onClick={() => onOpen(field.key)} title={field.label}
      className={`rd-bf${tab ? " rd-bf-tab" : ""}${on ? " is-on" : ""}${n === 0 ? " is-empty" : ""}`}
      style={{ "--c": field.color }} aria-pressed={on || undefined}>
      <span className="rd-bf-n ty-num">{n}</span>
      <span className="rd-bf-k truncate">{field.label}</span>
    </button>
  );
}

/* Die Zeile einer Gruppe: Beschriftung links, ihre Felder daneben. Sie ist dieselbe Zeile in beiden
   Zuständen — geschlossen mit Kacheln, geöffnet als Reiterzeile (die gewählte Gruppe) bzw.
   zusammengeklappt auf EINE Zeile (die zwei anderen). Sie verschwinden nicht: sie bleiben sichtbar
   und anklickbar, und genau das ist der Unterschied zu einem Overlay. */
function BuildGroup({ group, tab, openKey, onOpen }) {
  return (
    <div className={`rd-bg${tab ? " rd-bg-tab" : ""}`} data-group={group.key}>
      <span className="rd-bg-k">{group.label}</span>
      <span className="rd-bg-f">
        {group.fields.map((f) => (
          <BuildField key={f.key} field={f} tab={tab} on={tab && f.key === openKey}
            onOpen={(k) => onOpen(group.key, k)} />
        ))}
      </span>
    </div>
  );
}

function BuildPanel({ groups, hidden }) {
  const [open, setOpen] = useState(null); // { group, field } | null
  const onOpen = (g, f) => setOpen((s) => (s && s.group === g && s.field === f ? null : { group: g, field: f }));
  const openGroup = open ? groups.find((g) => g.key === open.group) : null;
  const openField = openGroup ? openGroup.fields.find((f) => f.key === open.field) : null;
  return (
    <>
      {/* Der Kopf sagt, wo man ist: „Build · Perks · Score". Geschlossen bleibt es beim Panel-Namen. */}
      <div className="rd-ph hidden dt:block">
        {t("gameover.build")}{openGroup ? ` · ${openGroup.label}` : ""}{openField ? ` · ${openField.label}` : ""}
      </div>
      <div className="rd-bfs">
        {groups.map((g) => (
          <BuildGroup key={g.key} group={g} tab={!!openGroup && g.key === openGroup.key}
            openKey={open?.field} onOpen={onOpen} />
        ))}
      </div>
      {/* Die einzige Stelle dieses Screens, an der eine Liste beliebig lang sein darf — sie scrollt
          IM Panel, und das Panel behält dabei seine Maße (§1: ein Panel, dessen Inhalt umschaltet,
          behält seine Maße; sonst schiebt es beim Öffnen seine Nachbarn). */}
      {openField && (
        <div className="rd-blist2">
          {openField.items.length === 0
            ? <div className="rd-bl-empty">{t("stats.slot.empty")}</div>
            : openField.items.map((it) => (
              <div key={it.id} className="rd-bl-row">
                <span className="rd-bl-n" style={{ color: it.color }}>{it.name}</span>
                {it.tier && <span className="rd-bl-t">{it.tier}</span>}
                {it.desc && <span className="rd-bl-d">{it.desc}</span>}
              </div>
            ))}
        </div>
      )}
      {hidden && <div className="rs-note rd-bl-hidden">{t("runstats.hidden")}</div>}
    </>
  );
}

export function RunDetail({ entry, rank = null, onClose, anonymized = false, onPlaySeed = null, recordTraj = [] }) {
  useEscape(onClose);
  const wide = useIsWide();                          // #desktop: drei Spalten statt schmaler Karte
  const [showArch, setShowArch] = useState(true);     // Gebäude-Overlay auf dem Brett an/aus (wie im Victory-Screen)
  const [inspectBid, setInspectBid] = useState(null); // Liste ↔ Brett: angetipptes Gebäude glüht am Grid
  if (!entry) return null;
  const name = entry.name;
  const score = typeof entry.score === "number" ? entry.score : 0;
  /* Kopf-Kennzahlen: der RAHMEN des Laufs. Board-Einträge liefern Zahlen teils als Strings (PostgREST bewahrt so
     die bigint-Präzision) → wie in RunStats parsen; fehlende Werte lassen ihre Kachel ganz weg statt „–" zu zeigen
     (in einer Kopfzeile ohne Spalten gibt es nichts zu vergleichen, ein Platzhalter wäre nur Rauschen). */
  const numOf = (v) => { const n = typeof v === "string" && v.trim() !== "" ? Number(v) : v; return typeof n === "number" && !Number.isNaN(n) ? n : null; };
  const cycles = numOf(entry.cycles ?? entry.level);
  const tricks = numOf(entry.tricks);
  const wins = numOf(entry.wins);
  const durationMs = numOf(entry.durationMs);
  const avgTricks = cycles != null && tricks != null && cycles > 0 ? tricks / cycles : null;
  /* #rd-verlauf: Score-Verlauf + Stich-Score je Durchlauf — dieselben zwei Auswertungen wie im Victory-Screen,
     jetzt auch für einen GESPEICHERTEN Lauf. Beide Reihen wandern seit diesem Schritt in die Lauf-Historie;
     Alt-Läufe (und fremde Board-Einträge, die es nie geben wird) haben sie nicht → der Block bleibt ganz weg. */
  const traj = Array.isArray(entry.traj) ? entry.traj : [];
  const trickLog = Array.isArray(entry.trickLog) ? entry.trickLog : [];
  const hasTraj = traj.length >= 2;
  const hasLog = trickLog.some((c) => c && c.length);
  // Architekt-Gebäude aus dem Snapshot (nur neue Läufe haben sie mitgespeichert → sonst kein Gebäude-Block).
  const snap = entry.deckSnapshot || null;
  const archCover = snap && snap.architectCover ? snap.architectCover : null;
  const archBuildings = snap && Array.isArray(snap.buildings) ? snap.buildings : [];
  const hasArch = archBuildings.length > 0 && !!archCover;
  /* #rd-spuren: OHNE Aufstellung fällt die dritte Spur WEG, statt leer zu bleiben — die Spaltenzahl
     folgt dem Inhalt (`docs/statistik-redesign.md`, „Ohne Aufstellung"). Der Ausnahmefall ist der
     Notfallpfad des Speichers (`storage.js:398`, Snapshot fällt aus der Historie) und der fremde
     Board-Lauf; er ist selten und trägt deshalb keine eigene Anordnung, nur eine Spur weniger. */
  const hasForm = !anonymized && entry.deckSnapshot?.cards?.length > 0;
  /* #rd-zaehlen: die fünfzehn Felder. Sie werden bei jedem Render neu gerechnet und nicht gemerkt —
     `entry` ist ein Prop und ändert sich nur, wenn ein anderer Lauf geöffnet wird. */
  const buildGroups = [
    { key: "skills", label: t("runstats.skills"), fields: skillFields(entry.skills) },
    { key: "perks", label: t("bf.bd.perks"), fields: perkFields(anonymized ? [] : entry.perks, anonymized ? null : entry.families) },
    { key: "buildings", label: t("arch.buildings"), fields: buildingFields(anonymized ? [] : archBuildings, archCover) },
  ];
  // Der Hinweis erscheint nur, wenn wirklich etwas verdeckt WIRD (Alt-Eintrag ohne Perk-Spalte: nichts zu verbergen).
  const buildHidden = anonymized && Array.isArray(entry.perks) && entry.perks.length > 0;
  /* #overlay-portal: an document.body statt in den Aufrufer-Baum. Der Statistik-Bildschirm ist der einzige
     Aufrufer, dessen WURZEL zugleich Blur-Ebene (`backdrop-filter`) UND Scroll-Container (`overflow-y-auto`) ist.
     `backdrop-filter` macht ein Element zum Containing Block für `position: fixed`-Nachfahren — dieses Overlay
     hing damit nicht am Viewport, sondern am Scroll-Ursprung der Liste und erschien exakt `scrollTop` Pixel zu
     hoch (gemessen: scrollTop 600 → top −600 px), wo es dann stehenblieb. Der Kopf mit dem Score war abgeschnitten.
     Das Umschalten des Aufrufers auf `overflow-hidden` half nicht: `scrollTop` bleibt dabei erhalten.
     Dieselbe Ursache und dieselbe Lösung stehen schon am Kauffenster der Deck-Werkstatt (CustomizeScreen).
     `document.body` ist farbsicher: `--deck-a1/a2` werden für genau diesen Fall zusätzlich auf `:root`
     gespiegelt (App.jsx). React-Events blubbern weiter durch den REACT-Baum, Escape/Klick-außen bleiben also
     unverändert — auch das Schließen über den Aufrufer. */
  return overlayPortal((
    <div className="rd-root fixed inset-0 overlay-root z-50 flex items-center justify-center p-4"
      style={{ background: "#0c0c10", backdropFilter: "blur(3px)" }} onClick={onClose}>
      {/* #deckui: äußerer Modal-Rahmen zieht die Deckfarbe (as-panel-deck) */}
      {/* #desktop: Ab 1280 px ist das kein Fenster mehr, sondern derselbe gerahmte Screen wie nach einem Lauf —
          gleiche Kopfzeile (Score links, Schließen rechts) und dieselben drei Spalten. Ein gespeicherter Lauf
          trägt weniger als ein laufender (kein Verlauf, kein Verdienst), die Panels sind deshalb die Schnittmenge:
          Kennzahlen · Build · finale Aufstellung. */}
      <div className="rd-card w-full max-w-md rounded-2xl px-6 pb-6 max-h-[90dvh] overflow-y-auto overlay-card as-panel as-panel-deck"
        style={MODAL_CARD} onClick={(e) => e.stopPropagation()}>
        {/* #UI: Kopf mit Schließen-Knopf STICKY → bleibt beim Scrollen oben rechts erreichbar (Abstand opak im Header, kein negativer Margin). */}
        <div className="rd-head sticky top-0 z-20 -mx-6 px-6 pt-6 pb-4 flex items-start justify-between gap-3 relative" style={{ background: STICKY_HEAD_BG }}>
          <TopHairline />
          <div className="rd-title min-w-0">
            {/* #menu-rework M7 — Kopf-Kanon (design-sprache.md §2): der Eyebrow nennt den BEREICH,
                und die Statistik, aus der man kommt, trägt denselben. Er stand bis hierher als
                deutscher Literal-String im JSX — player-sichtbarer Text gehört in den Katalog. */}
            <div className="rd-eyebrow text-body-5 uppercase tracking-widest">
              {t("rundetail.eyebrow")}{rank != null ? ` · #${rank}` : ""}
            </div>
            {name && <div className="text-title-5 font-bold mt-0.5 truncate">{name}</div>}
          </div>
          <ActionButton kind="secondary" className="rd-close shrink-0" onClick={onClose}>{t("common.close")}</ActionButton>
        </div>
        <div className="rd-score text-center my-3">
          <div className="rd-num text-display-2 font-bold" style={{ color: "#d4a63a" }}>{fmtScore(score)}</div>
          <div className="text-body-5 opacity-50 mt-0.5">{t("hud.score")}</div>
          {/* #205: Seed dieses Laufs — kopieren & (optional) nachspielen. Alt-Läufe ohne Seed zeigen nichts. */}
          {entry.seedCode && (
            <div className="flex justify-center mt-2">
              <SeedChip code={entry.seedCode} onReplay={onPlaySeed ? () => onPlaySeed(entry.seed) : null} />
            </div>
          )}
        </div>
        {/* #rd-verlauf: der Rahmen des Laufs neben der Zahl — wie weit kam er (Durchläufe), wie viel wurde
            gespielt (Stiche, Ø je Durchlauf, Siege) und wie lange dauerte er. Auf dem Desktop füllt diese Reihe
            die Kopfzeile rechts der Score-Zahl, auf dem Handy steht sie als eine Zeile darunter. */}
        {(cycles != null || tricks != null) && (
          <div className="rd-kpi flex flex-wrap justify-center gap-x-6 gap-y-2 mb-3">
            {cycles != null && <HeadStat label={t("runstats.cycles")} value={cycles} />}
            {tricks != null && <HeadStat label={t("rail.tricks")} value={tricks} />}
            {avgTricks != null && <HeadStat label={t("runstats.avgTricks")} value={fmtNum(avgTricks.toFixed(1))} title={t("runstats.avgTricks.title")} />}
            {wins != null && <HeadStat label={t("runstats.wins")} value={wins} />}
            {durationMs != null && durationMs > 0 && <HeadStat label={t("runstats.duration")} value={fmtDuration(durationMs)} />}
          </div>
        )}
        {/* #rd-spuren: der Rumpf ist ab 1280 px DER Scroller und das Spurenraster. `data-lanes` sagt,
            ob die Aufstellung dabei ist — die Spaltenzahl folgt dem Inhalt, statt eine leere Spur
            stehen zu lassen. Unter 1280 px ist die Klammer `display: contents` (wie `.rd-left` vor
            ihr) und die Handy-Fassung sieht diese Ebene nicht. */}
        <div className="rd-body" data-lanes={hasForm ? 3 : 2}>
        {/* #global: Baumstand VOR den Kennzahlen — er ist die Vorbedingung des Scores, nicht eine seiner
            Kennzahlen. Fehlt der Wert (lokaler Lauf, Alt-Eintrag), rendert der Block gar nichts. */}
        <div className="rd-c1 as-ring as-ring-quiet">
          <i className="as-ring-run" aria-hidden="true" />
          <div className="rd-ph hidden dt:block">{t("gameover.stats")}</div>
          <RunTreeBlock treeNodes={entry.treeNodes} />
          <RunStatCells entry={entry} sourceCells />
        </div>
        <div className="rd-c2 as-ring as-ring-quiet">
          <i className="as-ring-run" aria-hidden="true" />
          {/* #rd-zaehlen: ab 1280 px zählt das Panel, darunter zählt es auf. Die Chip-Fassung bleibt
              der schmalen Fassung — dieser Auftrag fasst sie nicht an, und die zwei Bilder sind für
              zwei verschiedene Flächen gebaut. */}
          {wide
            ? <BuildPanel groups={buildGroups} hidden={buildHidden} />
            : <div className="mt-4"><RunBuildChips entry={entry} anonymized={anonymized} /></div>}
        </div>
        {/* #rd-verlauf: Verlauf des Laufs — Score-Kurve gegen den besten Lauf der Historie und der Stich-Score
            je Durchlauf. Auf dem Desktop füllt dieses Panel die untere linke Hälfte (Spalte 1+2), die bis hierher
            leer blieb, weil die Aufstellung rechts doppelt so hoch baut wie Kennzahlen und Build zusammen. */}
        {(hasTraj || hasLog) && (
          <div className="rd-c4 as-ring as-ring-quiet">
            <i className="as-ring-run" aria-hidden="true" />
            <div className="rd-ph hidden dt:block">{t("gameover.chart.title")}</div>
            {hasTraj && (
              <div className="rd-spark mt-4">
                <div className="flex items-center justify-between text-meta-3 uppercase tracking-wide opacity-50 mb-2">
                  <span className="dt:hidden">{t("gameover.chart.title")}</span>
                  <span className="hidden dt:inline" />
                  <span className="flex gap-3 normal-case tracking-normal">
                    <span style={{ color: "#d4a63a" }}>{t("gameover.chart.run")}</span>
                    {recordTraj.length >= 2 ? <span style={{ color: "#8a7de0" }}>{t("gameover.chart.record")}</span> : <span className="opacity-40">{t("gameover.chart.first")}</span>}
                  </span>
                </div>
                {/* #graph-achsen: ab 1280 px dieselbe beschriftete Fassung wie im Victory-Screen — es ist
                    derselbe Graph mit derselben x-Achse (Stiche). Ohne sie standen hier zwei Linien ohne
                    einen einzigen Zahlenwert. Am Handy bleibt die kompakte Linie: dort ist die Karte zu
                    schmal fuer eine beschriftete Achse. */}
                <Sparkline current={traj} record={recordTraj} height={110} axes={wide} />
              </div>
            )}
            {hasLog && <RunGraphs state={entry} sourceBar={false} open={wide} />}
          </div>
        )}
        {/* #201.8 Stufe B: finale Deck-Aufstellung, sofern der Lauf einen Snapshot hat (nur eigene/lokale Läufe;
            alte Einträge & globale Fremd-Läufe haben keinen → Abschnitt wird ausgeblendet). #205: bei anonymized aus. */}
        {hasForm && (
          <details className="rd-c3 as-ring as-ring-quiet mt-4 rounded-xl overflow-hidden" open={wide} style={{ background: "#141419", border: "1px solid #2a2a34" }}>
            <summary className="cursor-pointer select-none px-3 py-2 text-meta-3 uppercase tracking-wide opacity-70">{t("gameover.layout.open")}</summary>
            {/* Das Ringband steht NACH dem Griff: `summary` muss das erste Kind bleiben, sonst ist es keiner. */}
            <i className="as-ring-run" aria-hidden="true" />
            <div className="p-3 pt-0">
              {/* Architekt-Gebäude auf dem Brett ein-/ausblenden (Toggle + Kategorie-Legende) — wie im Victory-Screen. */}
              {hasArch && <ArchToggle on={showArch} onToggle={() => setShowArch((v) => !v)} />}
              <CardGrid cards={entry.deckSnapshot.cards} formations={entry.deckSnapshot.formations || []}
                architectCover={hasArch && showArch ? archCover : null} lockedPos={entry.deckSnapshot.challengeBlockForm || []}
                glowBid={hasArch && showArch ? inspectBid : null} quietTiles />

              {/* Gebäude-Liste: welche Gebäude auf welcher Stufe. Antippen lässt den Rahmen am Brett cyan leuchten. */}
              {hasArch && (
                <div className="rd-blist mt-3 rounded-lg p-2.5" style={{ background: "#17171c", border: "1px solid #5a8ade" }}>
                  <div className="text-meta-3 uppercase tracking-wide font-bold mb-0.5" style={{ color: "#6f9bec" }}>🏗 {t("arch.buildingsN", { n: archBuildings.length })}</div>
                  <div className="text-meta-1 opacity-45 mb-1.5">{t("gameover.layout.hint")}</div>
                  <div className="grid gap-1">
                    {archBuildings.map((b) => {
                      const fam = archFamily(b.familyId); if (!fam) return null;
                      const anchor = Math.min(...b.footprint);
                      const eff = archCover?.[anchor]?.effects?.join(" · ") || "";
                      const meta = archCatDef(fam.category) || {};
                      const on = inspectBid === b.id;
                      return (
                        <button key={b.id} onClick={() => { if (!on) setShowArch(true); setInspectBid(on ? null : b.id); }}
                          className="w-full text-left rounded-lg px-2.5 py-1.5 text-meta-3 leading-snug flex flex-col gap-0.5 transition-all"
                          style={{ background: on ? "#12313f" : "#191922", border: `1px solid ${on ? "#5ec8f0" : "#2a2a34"}`, boxShadow: on ? "0 0 8px #5ec8f055" : undefined }}>
                          <span className="inline-flex items-center gap-1.5 flex-wrap">
                            <FormIcon form={fam.form} color={fam.legendary ? "#d4a63a" : (meta.color || "#8a8a92")} title={`${fam.name} · ${fam.form}`} />
                            <b>{fam.name}</b>
                            <span className="opacity-55">{fam.legendary ? t("arch.legendaryCap") : t("arch.tier", { tier: ["", "I", "II", "III", "IV"][b.tier] || b.tier })}</span>
                          </span>
                          {eff && <span className="opacity-75">{eff}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </details>
        )}
        </div>
      </div>
    </div>
  ));
}
