import { useEffect, useState } from "react";
import { leaderboardConfigured, fetchGlobalTop, fetchBoardTop } from "../game/leaderboard.js";
import { decodeArchetypes } from "../game/skills.js";
import { FactionIcon } from "./FactionIcon.jsx"; // #308 zentrales Fraktions-Icon
import { RunDetail } from "./RunDetail.jsx";
import { fmtScore } from "./format.js";
import { TOTAL_NODES } from "../game/progression.js"; // #global: Nenner der Baum-Pille (x/27)
import { formatSeed } from "../game/rng.js"; // #205: Seed der Board-Zeile → SeedChip/Nachspielen in RunDetail
import { archMeta } from "../i18n/labels.js"; // #sprache: Skills/Archetypen zur Anzeigezeit
import { t } from "../i18n/index.js";

// Gespeicherte Archetyp-Kodierung ("fire,ice") → Icon-Meta in fester Reihenfolge Blitz→Feuer→Eis (#139).
// Alt-Einträge ohne Wert ergeben einfach keine Icons.
const archetypeIcons = (value) => decodeArchetypes(value).map((a) => archMeta(a));

// #169 FB-8: DB-Zeile (snake_case; perks/skills als kompakte ID-Liste) → normalisierter RunStats-Eintrag.
// Alt-/pre-Migration-Zeilen liefern die Zusatzfelder nicht → RunStats zeigt „–" bzw. blendet leere Blöcke aus.
const toRunEntry = (r) => ({
  name: r.name, score: r.score,
  bestStreak: r.best_streak,
  perks: r.perks !== undefined ? (r.perks || "").split(",").filter(Boolean) : undefined,
  skills: r.skills !== undefined ? (r.skills || "").split(",").filter(Boolean) : undefined,
  maxFormations: r.max_formations, formationScore: r.formation_score,
  crits: r.crits, wins: r.wins, critBonusScore: r.crit_bonus_score, bestTrickScore: r.best_trick_score,
  tricks: r.tricks, // Victory-Redesign: Winrate-Nenner (Siege / gespielte Stiche) auch in der globalen Detailansicht
  // #217/#201 P8-C: finale Aufstellung (nur bei Meister-Läufen befüllt) → RunDetail zeigt sie NUR für die eigene
  // Zeile (Anti-Copy #205 blendet sie bei anonymized aus).
  deckSnapshot: r.deck_snapshot,
  // #205: Seed → RunDetail zeigt den (kopierbaren, nachspielbaren) SeedChip. Kein Anti-Copy-Thema (Seed ist die
  // Herausforderung, kein Build-Detail).
  // #241: seed ist bigint → kommt als String aus der REST-API → als Zahl casten, sonst zeigt SeedChip nichts
  // (formatSeed toleriert Strings) UND startRun ignoriert den Seed (akzeptiert nur typeof number) → Nachspielen kaputt.
  seed: r.seed != null ? Number(r.seed) : null, seedCode: r.seed != null ? formatSeed(Number(r.seed)) : null,
  // #global: Baumstand des Laufs (x von 27). Fehlt bei Alt-Zeilen und solange die Spalte nicht migriert ist
  // → RunTreeBlock rendert dann gar nichts.
  treeNodes: r.tree_nodes,
});

/* #global: Baumstand als Pille — die FÜLLUNG trägt den Anteil, nicht nur die Zahl. Über zwanzig Zeilen
   liest man daran „viel Baum gegen wenig Baum", ohne zwei Zahlen im Kopf zu vergleichen; das ist der
   ganze Zweck der Angabe (ein Score ohne Baumstand lässt sich nicht einordnen).
   Fehlt der Wert, steht bewusst eine GESTRICHELTE „–/27"-Pille da statt nichts: In einer Spalte muss eine
   Lücke sichtbar bleiben, sonst vergleicht man Zeilen mit ungleicher Grundlage, ohne es zu merken. */
function TreePill({ value }) {
  // #241-Falle: PostgREST liefert Zahlenspalten je nach Typ als String → vor dem Rechnen casten.
  const n = value == null || value === "" ? null : Number(value);
  const ok = n != null && Number.isFinite(n);
  const frac = ok && TOTAL_NODES > 0 ? Math.max(0, Math.min(1, n / TOTAL_NODES)) : 0;
  return (
    <span className="relative shrink-0 inline-flex items-center rounded-full overflow-hidden px-1.5 leading-none"
      title={ok ? t("board.tree.title", { done: n, total: TOTAL_NODES }) : t("board.tree.none.title")}
      style={{ border: `1px ${ok ? "solid" : "dashed"} #3a3a48`, background: ok ? "#15151d" : "transparent" }}>
      {ok && (
        <span aria-hidden="true" className="absolute left-0 top-0 bottom-0"
          style={{ width: `${frac * 100}%`, background: "color-mix(in srgb, var(--deck-a1, #8a7de0) 30%, transparent)" }} />
      )}
      <b className="relative ty-num-sm text-micro-4 font-semibold py-[1px]" style={{ color: ok ? "#cfcbe4" : "#4e4e5a" }}>
        {ok ? `${n}/${TOTAL_NODES}` : `–/${TOTAL_NODES}`}
      </b>
    </span>
  );
}

/* Globaler Highscore (#14): additiv UNTER dem lokalen Block. Holt Top-N selbst und
   degradiert lautlos — fehlende Config blendet den Block ganz aus, offline/Fehler zeigt
   einen dezenten Hinweis. Der lokale Block (beim Aufrufer) bleibt immer unberührt.

   mine        — der eigene, gerade gepostete Lauf → wird in der Liste hervorgehoben.
   reloadToken — neu laden, sobald er sich ändert (nach dem Submit, damit der eigene
                 Lauf enthalten ist).
   framed      — eigener Panel-Rahmen (StartScreen). Ohne: schlichte Sektion (Game-Over).
   board       — §7: gesetzt ('standard'|'meister') → getrenntes Ranglisten-Board (fetchBoardTop) statt des
                 Global-Boards (fetchGlobalTop, alle CASUAL-Läufe — Ranglisten-Zeilen filtert die Abfrage weg).
   showTree    — #global: Baum-Pille je Zeile. NUR im Global-Board sinnvoll: Ranglisten-Läufe fahren auf fixer
                 Baseline, dort ist der Baum wirkungslos und die Pille behauptete einen Vorteil, den es in
                 dieser Zeile nicht gab. */
export function GlobalLeaderboard({ limit = 10, mine = null, reloadToken = 0, framed = false, board = null, seed = null, hideHeader = false, onPlaySeed = null, showTree = false }) {
  const [rows, setRows] = useState(null);   // null = lädt · [] = leer · [...] = Daten
  const [error, setError] = useState(false);
  const [detail, setDetail] = useState(null); // #169 FB-8: gewählte Zeile → RunDetail-Overlay

  useEffect(() => {
    if (!leaderboardConfigured) return;
    let alive = true;
    setError(false);
    setRows(null);
    (board ? fetchBoardTop(board, limit, seed) : fetchGlobalTop(limit))
      .then((data) => { if (alive) setRows(Array.isArray(data) ? data : []); })
      .catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
   
  }, [limit, reloadToken, board, seed]);

  if (!leaderboardConfigured) return null; // ohne Config: Block entfällt komplett

  // Eigenen Lauf genau einmal hervorheben (erste Übereinstimmung).
  // #229 N2: bevorzugt per eindeutiger id (das Board vergibt sie, publishRun reicht sie in myEntry nach) → trifft
  // nie eine gleichnamige Fremd-Zeile. Fallback auf die name+score-Heuristik nur, wenn keine id vorliegt
  // (z. B. Preview-Build schreibt nie → kein eigener Eintrag im Board, dann ist der Fallback ohnehin folgenlos).
  let flagged = false;
  const isMine = (r) => {
    if (flagged || !mine) return false;
    const hit = mine.id != null
      ? r.id === mine.id
      : (!!mine.name && r.name === mine.name && r.score === mine.score
          && r.tricks === mine.tricks && r.cycles === mine.cycles);
    if (hit) flagged = true;
    return hit;
  };

  const body = (
    <>
      {/* #global: Der Kopf nennt links den Umfang, rechts die Auswahlregel — „Top 20" allein beantwortet nicht,
          Top 20 WOVON. Vorher stand hier ein fest verdrahtetes „Global — Top N". */}
      {!hideHeader && (
        <div className="lb-listhead flex items-baseline justify-between gap-2 mb-2">
          <span className="lb-listtitle text-meta-3 uppercase tracking-wide opacity-50">{t("board.global.head", { n: limit })}</span>
          <span className="lb-listsub text-meta-1 opacity-35">{t("board.global.sub")}</span>
        </div>
      )}
      {error ? (
        <div className="text-body-5 opacity-40 text-center py-3">{t("board.unavailable")}</div>
      ) : rows === null ? (
        <div className="text-body-5 opacity-40 text-center py-3">{t("board.loading")}</div>
      ) : rows.length === 0 ? (
        <div className="text-body-5 opacity-40 text-center py-3">{t(board ? "board.empty" : "board.global.empty")}</div>
      ) : (
        /* `grid-cols-1` statt nur `grid`: Die implizite Spalte eines nackten `grid` ist `auto` und damit
           MAX-CONTENT-breit — ein langer Nickname zieht die ganze Liste über das Panel hinaus (gemessen bei
           390 px: Zeilen 313 statt 292 px breit, waagerechte Scrollleiste). `truncate` hilft dagegen NICHT,
           es kappt nur die Darstellung, nicht den max-content-Beitrag. `grid-cols-1` = `minmax(0, 1fr)`
           deckelt die Spur. (Bestand schon vor der Zweizeiligkeit — die längere Zeile macht es nur sichtbar.) */
        /* #desktop: `lb-rows` ist der Haken für die ZWEISPALTIGE Fassung im Ranglisten-Screen (10 + 10).
           Die Regel hängt dort an `.lb-page .lb-rows` — dieselbe Komponente steht auch im Hub (framed) und im
           Victory-Screen in schmalen Spalten, die dürfen NICHT mitgehen. */
        /* Spaltenköpfe und Zeilen sind zwei Geschwister an einer Stelle, an der ein Ausdruck steht — die
           Klammer ist deshalb Pflicht, nicht Geschmack. */
        <>
        {/* #lb-premium: Spaltenköpfe NUR ab 1280 px (`as-deskonly`). Auf dem Handy stehen die Zeilen
            zweizeilig und die Köpfe hätten nichts, worüber sie stehen könnten. */}
        <div className="lb-cols as-deskonly" aria-hidden="true">
          <span>{t("board.col.rank")}</span><span>{t("board.col.pilot")}</span><span>{t("board.col.score")}</span>
        </div>
        <div className="lb-rows grid grid-cols-1 gap-1">
          {rows.map((r, i) => {
            const mineRow = isMine(r);
            const icons = archetypeIcons(r.archetypes); // #139: ein Icon je Skill (leer bei Alt-Einträgen)
            /* #kante: Die Kante trägt den Rang — Gold, Silber, Bronze fürs Podium, Grün für den eigenen
               Eintrag (der zusätzlich den Schein bekommt, damit man ihn beim Scrollen sofort wiederfindet),
               neutral für den Rest. Vorher waren alle Zeilen gleich grau und das Podium hing allein an den
               Medaillen-Emoji. Der eigene Eintrag schlägt die Medaille: seine Zeile zu finden ist der
               häufigere Grund, warum man diese Liste öffnet. */
            const rankTone = mineRow ? "#5ab87a" : i === 0 ? "#d4a63a" : i === 1 ? "#c8ccd8" : i === 2 ? "#c98b4b" : "#3a3a48";
            return (
              // #169 FB-8: Zeile klickbar → Detailansicht (RunStats). Alt-Einträge degradieren.
              /* #global ZWEIZEILIG. Einzeilig gerechnet (390-px-Handy, Karte + Panel + Zeile abgezogen) bleiben
                 ~278 px: Rang 24 · bis zu sieben Fraktions-Icons ~90 · Baum-Pille ~44 · Score ~55 · Abstände ~14
                 = 227 — für den NAMEN blieben ~50 px, also gut fünf Zeichen. Deshalb trägt Zeile 1 die Identität
                 (Rang · Name · Score) und Zeile 2 die Einordnung (Icons · Baum · Durchlauf).
                 Der Score steht VOLL da. Die Kurzform (fmtScoreShort) war der erste Entwurf und ist nach dem
                 Nachmessen wieder rausgeflogen: Sie rundet auf EINE Nachkommastelle, und in einer Liste, in der
                 zwanzig Läufe im Milliardenbereich liegen, lesen sich mehrere Zeilen dann als dasselbe
                 „1,8 Mrd." — bei einer RANGLISTE ist das der eine Fehler, den man nicht machen darf. Platz ist
                 da: Zeile 1 trägt nur Name und Score, die volle Zahl braucht ~85 px von ~281. */
              <button key={r.id ?? `${r.name}:${r.score}:${r.tricks}:${r.cycles}`} onClick={() => setDetail({ entry: toRunEntry(r), rank: i + 1, anonymized: !mineRow })}
                title={t("stats.showDetails")}
                className={`as-edge-card as-edge-thin${mineRow ? " is-sel" : ""} flex items-center gap-2 px-2 py-1.5 rounded text-left w-full transition-all hover:brightness-125`}
                style={{ "--c": rankTone }}>
                {/* #lb-podest: Die Rangzahl IST die Auszeichnung — sie steht ab 1280 px in einer Kante aus
                    Gold/Silber/Bronze (`--c`, dieselbe Farbe wie die Zeilenkante). Emoji-Medaillen sind draußen:
                    sie bringen ihre eigene Farbe mit und stehen quer zur Deckfarbe (s. RankIcon.jsx). */}
                <span className="lb-rank w-6 shrink-0 text-center ty-num-sm" style={{ opacity: 0.5 }}>{`#${i + 1}`}</span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-baseline gap-2 min-w-0">
                    <span className="flex-1 truncate text-body-lg-5" style={{ color: mineRow ? "#5ab87a" : "#e8e8ea" }}>
                      {r.name || "—"}{mineRow && <span className="opacity-60 text-body-5"> · du</span>}
                    </span>
                    <span className="ty-num font-bold shrink-0 text-body-3" style={{ color: "#d4a63a" }}>{fmtScore(r.score)}</span>
                  </span>
                  <span className="flex items-center gap-1.5 mt-0.5 min-w-0">
                    {icons.length > 0 && (
                      <span className="flex items-center gap-px shrink-0 leading-none">
                        {icons.map((m, k) => <FactionIcon key={k} type={m.key} size={12} title={m.label} />)}
                      </span>
                    )}
                    {showTree && <TreePill value={r.tree_nodes} />}
                    <span className="ty-num-sm text-meta-1 opacity-40 truncate">{t("board.row.cycle", { n: r.cycles ?? 0 })}</span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        </>
      )}
    </>
  );

  return (
    <>
      {framed ? (
        <div className="w-full max-w-sm rounded-xl p-4 as-panel" style={{ background: "#17171c", border: "1px solid #26262e" }}>
          {body}
        </div>
      ) : (
        <div className="gl-wrap mt-5">{body}</div>
      )}
      {/* #205 Anti-Copy, #global neu gezogen: fremde Board-Läufe zeigen Kennzahlen, Icons, Score, Baumstand
          UND die Skills — verdeckt bleiben die Perks und die finale Aufstellung (kein 1:1-Nachbau). */}
      {detail && <RunDetail entry={detail.entry} rank={detail.rank} onClose={() => setDetail(null)} anonymized={detail.anonymized} onPlaySeed={onPlaySeed} />}
    </>
  );
}
