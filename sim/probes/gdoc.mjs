// Baut das Owner-Dokument (HTML, in Google Docs importierbar): alle Feuer- und Blitz-Skills mit Text je Rarität,
// Raritäten-Tabelle, Sim-Auswertung aus den Logs eines Messstands. Logs liegen in GDOC_LOGDIR (Default: Arbeitsverzeichnis)
// und heißen skills-<TAG>.log, legendaries-<TAG>.log, duel-<TAG>.log, motor-<TAG>.log, fire-lifts-<TAG>.log,
// blitz-lifts-<TAG>.log (GDOC_TAG, Default 725; GDOC_STAND = Spec-Stand im Titel). Ausgabe: <LOGDIR>/skills-gdoc.html.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { SKILL_DEFS, BLITZ_TIERS, FEUER_TIERS } from "../../src/game/skills.js";
import * as C from "../../src/game/constants.js";
const S = process.env.GDOC_LOGDIR || process.cwd();
const TAG = process.env.GDOC_TAG || "725";
const STAND = process.env.GDOC_STAND || "7.25";
const read = (f) => (existsSync(`${S}/${f}`) ? readFileSync(`${S}/${f}`, "utf8") : "");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const TIERS = ["Normal", "Selten", "Sehr selten", "Episch"];
const AXIS = {
  SK_LIGHTNING_01: "Rate", SK_LIGHTNING_05: "Rate", SK_LIGHTNING_02: "Feld nach jeder Leiste", SK_LIGHTNING_06: "Rampe Crit-Chance",
  SK_LIGHTNING_10: "Rampe Crit-Multiplikator", SK_LIGHTNING_07: "Serie zu Crit-Chance", SK_LIGHTNING_13: "Glättung", SK_LIGHTNING_12: "Serie zu Crit-Multiplikator",
  SK_LIGHTNING_03: "Tiefe", SK_LIGHTNING_15: "Tiefen-Motor", SK_LIGHTNING_11: "Ionisierung zu Wert", SK_LIGHTNING_09: "Tiefe zu Score",
  SK_LIGHTNING_04: "Überschuss zu Ladung", SK_LIGHTNING_17: "Schutz",
  SK_LIGHTNING_L01: "Rate und Tiefe", SK_LIGHTNING_L02: "Tiefe und Crit", SK_LIGHTNING_L03: "Stufen", SK_LIGHTNING_L04: "Formation × Ionisierung",
  SK_FIRE_01: "Formation und Wert zu Score", SK_FIRE_02: "Rate", SK_FIRE_03: "Serie zu Score", SK_FIRE_04: "Schutz", SK_FIRE_05: "Takt",
  SK_FIRE_06: "Hitze zu Wert", SK_FIRE_07: "Multiplikator", SK_FIRE_08: "Zustand", SK_FIRE_09: "Vorsprung zu Score",
  SK_FIRE_12: "Überlauf zu Score", SK_FIRE_13: "Gegner", SK_FIRE_14: "Gegner", SK_FIRE_15: "Dauerwert", SK_FIRE_16: "Wert zu Score",
  SK_FIRE_L01: "Gegner", SK_FIRE_L02: "Rampe", SK_FIRE_L03: "Multiplikator", SK_FIRE_L04: "Schmiede",
};
const ORDER = {
  lightning: ["SK_LIGHTNING_01", "SK_LIGHTNING_05", "SK_LIGHTNING_02", "SK_LIGHTNING_06", "SK_LIGHTNING_10", "SK_LIGHTNING_07", "SK_LIGHTNING_13", "SK_LIGHTNING_12", "SK_LIGHTNING_03", "SK_LIGHTNING_15", "SK_LIGHTNING_11", "SK_LIGHTNING_09", "SK_LIGHTNING_04", "SK_LIGHTNING_17"],
  fire: ["SK_FIRE_01", "SK_FIRE_02", "SK_FIRE_03", "SK_FIRE_04", "SK_FIRE_05", "SK_FIRE_06", "SK_FIRE_07", "SK_FIRE_08", "SK_FIRE_09", "SK_FIRE_12", "SK_FIRE_13", "SK_FIRE_14", "SK_FIRE_15", "SK_FIRE_16"],
};
const LEG = { lightning: ["SK_LIGHTNING_L01", "SK_LIGHTNING_L02", "SK_LIGHTNING_L03", "SK_LIGHTNING_L04"], fire: ["SK_FIRE_L01", "SK_FIRE_L02", "SK_FIRE_L03", "SK_FIRE_L04"] };
const table = (head, rows) => `<table border="1" cellpadding="4" cellspacing="0"><thead><tr>${head.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table>`;

// ---- Skills je Fraktion: Name, Achse, Text je Rarität ----
const skillRows = (arch) => ORDER[arch].map((id) => { const d = SKILL_DEFS[id]; return [`<b>${esc(d.name)}</b>`, esc(AXIS[id] || ""), ...d.descTiers.map(esc)]; });
const legRows = (arch) => LEG[arch].map((id) => { const d = SKILL_DEFS[id]; return [`<b>${esc(d.name)}</b>`, esc(AXIS[id] || ""), esc(d.desc)]; });

// ---- Raritäten-Tabelle: Kennwerte je Stufe aus den Tabellen ----
const KEYS = { critEvery: "jeder N. Crit", back: "Rückgabe", noCritCharge: "Ladung je Sieg ohne Crit", floor: "Boden", bar: "Leiste voll bei", tricks: "Stiche", value: "Wert", critPerBar: "Crit je Leiste", multPerBar: "Crit-Mult je Leiste", fillDouble: "Leisten-Crit ×2", critPerStreak: "Crit je Serienpunkt", chargeFromStreak: "Ladung ab Serie", step: "Schritt", critKeep: "Crit behält", minStreak: "ab Serie", multPerStreak: "Crit-Mult je Serienpunkt", barEvery: "jede N. Leiste", extra: "Stapel", second: "zweittiefste", minStacks: "ab Stapel", perStack: "je Stapel", factor: "Faktor", onLoss: "auch bei Niederlage", stacks: "Stapel", frac: "Ladung", freePerRound: "gratis je Runde", perOver: "je N× über dem Deckel", chancePer: "je Chance über 100 %", heat: "Hitze", lossHeat: "Hitze je Niederlage", minHeat: "ab Hitze", noCool: "keine Kühlung", perHeat: "je Hitze", multPer10: "je 10 %", afterLoss: "auch nach Niederlage", minMargin: "ab Vorsprung", mult: "Faktor", heatToo: "auch auf Hitze", perPoint: "je Punkt", cost: "kostet Hitze", perFormation: "je Formation", every: "jeder N. Sieg", lossPays: "Kühlung zahlt", reach: "Reichweite", cards: "Karten", forgedDouble: "Schmiedewert doppelt" };
const fmt = (k, v) => { if (v === true) return KEYS[k] || k; const n = typeof v === "number" ? String(v).replace(".", ",") : String(v); return `${KEYS[k] || k} ${n}`; };
const rowText = (r) => Object.entries(r).map(([k, v]) => fmt(k, v)).join(", ");
const TIER_MAP = { lightning: { SK_LIGHTNING_01: "ableiter", SK_LIGHTNING_05: "reststrom", SK_LIGHTNING_02: "ionenfeld", SK_LIGHTNING_06: "gewitter", SK_LIGHTNING_10: "entladung", SK_LIGHTNING_07: "serie", SK_LIGHTNING_13: "stau", SK_LIGHTNING_12: "vorentladung", SK_LIGHTNING_03: "kette", SK_LIGHTNING_15: "blitzschlag", SK_LIGHTNING_11: "faenger", SK_LIGHTNING_09: "kurzschluss", SK_LIGHTNING_04: "ueberspannung", SK_LIGHTNING_17: "serienschutz" },
  fire: { SK_FIRE_01: "feuerlinie", SK_FIRE_02: "zunder", SK_FIRE_03: "feuersturm", SK_FIRE_04: "glutbett", SK_FIRE_05: "rueckzuendung", SK_FIRE_06: "klinge", SK_FIRE_07: "weissglut", SK_FIRE_08: "feuerwalze", SK_FIRE_09: "verbrennung", SK_FIRE_12: "schmelzpunkt", SK_FIRE_13: "brandmal", SK_FIRE_14: "lauffeuer", SK_FIRE_15: "schmiede", SK_FIRE_16: "glutstahl" } };
const tierRows = (arch) => ORDER[arch].map((id) => { const T = arch === "lightning" ? BLITZ_TIERS : FEUER_TIERS; const rows = T[TIER_MAP[arch][id]] || []; return [`<b>${esc(SKILL_DEFS[id].name)}</b>`, ...rows.map((r) => esc(rowText(r)))]; });

// ---- Sim-Logs ----
const greedy = read(`skills-${TAG}.log`);
const gScore = (greedy.match(/Greedy-Score:\s+Median ([\d,]+)\s+Mean ([\d,]+)\s+p90 ([\d,]+).*?Siegquote (\d+)%/) || []);
const parseGreedy = (block) => block.split("\n").map((l) => l.match(/^\s{4}(.+?)\s{2,}(\d+)%\s+([\d.]+)\s+(-?[\d,]+)\s+(-?\d+)%\s+(\d+)%\s+(\d+)%\s+(.*?)\s*$/)).filter(Boolean)
  .map((m) => { const rest = m[8]; const flag = (rest.match(/\s{2,}(\S+)\s*$/) || [])[1] || ""; const tiers = rest.replace(/\s{2,}\S+\s*$/, "").trim(); return { name: m[1].trim(), held: m[2], lift: m[3], delta: m[4], typ: m[5], win: m[6], tiers, flag }; });
const feuerBlock = (greedy.split("FEUER — ")[1] || "").split("BLITZ — ")[0];
const blitzBlock = (greedy.split("BLITZ — ")[1] || "").split("\n  stark:")[0];
const gRows = (rows) => rows.map((r) => [esc(r.name), `${r.held} %`, `${r.typ.startsWith("-") ? "" : "+"}${r.typ} %`, `${r.win} %`, esc(r.tiers.replace(/\bSS\b/g, "X")), esc(r.flag)]);
const legLog = read(`legendaries-${TAG}.log`);
const legBase = legLog.match(/Basis \(ohne Eingriff\): Median ([\d,]+)\s+Mean ([\d,]+)\s+p90 ([\d,]+)/) || [];
const legRowsSim = legLog.split("\n").map((l) => l.match(/^\s{2}(.+?)\s+(Feuer|Blitz)\s+(-?[\d,]+)\s+([+-]\d+) %\s+(\d+) %\s+([\d,]+)\s+([\d.]+)\s+(\d+) %\s+(\d+) %/)).filter(Boolean)
  .map((m) => [esc(m[1]), m[2], `${m[4]} %`, `${m[5]} %`, m[7]]);
const duel = read(`duel-${TAG}.log`);
const dRow = (name) => { const m = duel.match(new RegExp(`${name}\\s+([\\d.]+)\\s+([\\d.]+)\\s+([\\d.]+)\\s+([\\d.]+)\\s+([\\d.]+) %`)); return m ? [name, m[1], m[2], m[3], `${m[5]} %`] : [name, "", "", "", ""]; };
const dFloor = duel.match(/Floor Feuer ÷ Blitz: ([\d.]+)×\s+Mean: ([\d.]+)×\s+p90: ([\d.]+)×/) || [];
const motor = read(`motor-${TAG}.log`);
const mBlitz = (motor.split("MOTOR Blitz")[1] || "");
const rx = (s) => s.replace(/[()+]/g, (c) => `\\${c}`);
const mRow = (name) => { const m = mBlitz.match(new RegExp(`${rx(name)}\\s+([\\d.]+)\\s+(\\d+)\\s+([\\d.]+) %\\s+([\\d.]+)\\s+([\\d.]+)\\s+(\\d+)\\s+([\\d.]+)\\s+([\\d.]+) %\\s+([\\d.]+)\\s+([\\d.]+) %\\s+([\\d.]+) % \\(Ø [\\d.]+ %\\)\\s+([\\d.]+)×\\s+([\\d.]+) %`)); return m ? [name, m[1], `${m[3]} %`, m[4], m[6], `${m[10]} %`, `${m[11]} %`, `${m[12]}×`, `${m[13]} %`] : [name, "", "", "", "", "", "", "", ""]; };
const mFeuer = (motor.split("MOTOR Feuer")[1] || "").split("MOTOR Blitz")[0];
const fRow = (name) => { const m = mFeuer.match(new RegExp(`${rx(name)}\\s+([\\d.]+)\\s+(\\d+) %\\s+([\\d.]+) %\\s+([\\d.]+) %\\s+(\\d+) St\\.`)); return m ? [name, m[1], `${m[2]} %`, `${m[3]} %`, `${m[5]} Stiche`] : [name, "", "", "", ""]; };
const liftLog = (f) => read(f).split("\n").map((l) => l.match(/^\s{2}(.+?)\s{2,}held\s+(\d+)%\s+Lift Mean ([\d.]+)\s+Median ([\d.]+)\s*(.*)$/)).filter(Boolean).map((m) => [esc(m[1].trim()), m[4], m[3], esc(m[5].trim())]);
const fireLifts = liftLog(`fire-lifts-${TAG}.log`), blitzLifts = liftLog(`blitz-lifts-${TAG}.log`);

const de = (x) => String(x).replace(".", ",");
const html = `
<h1>Autostich – Feuer und Blitz: Skills, Raritäten, Sim-Auswertung</h1>
<p>Stand exp (Spec docs/skill-rework.md bis ${esc(STAND)}). 50 Runden je Lauf, 13 Skill-Phasen, Türen-Angebot. Crit-Deckel ${C.CRIT_MULT_CAP}× (Owner-Entscheid), Stapel-Score ${C.ION_SCORE_PER_STACK}.</p>

<h2>1. Passive</h2>
<p><b>Blitz.</b> Jeder gehaltene Blitz-Skill gibt +${Math.round(C.LIGHTNING_CRIT_PER_SKILL * 100)} % Crit-Chance. Jeder Crit gibt +1 Ladung; bei ${C.LIGHTNING_MAX_CHARGE} Ladung ist die Leiste voll und ionisiert die nächste Karte in der Reihenfolge (+1 Stapel, dauerhaft +${C.ION_VALUE_PER_BAR} Wert). Ein Stapel gibt bei Sieg mit der Karte +${C.ION_SCORE_PER_STACK} Score in die Basis und +${de(C.ION_CRIT_MULT_PER_STACK)}× Crit-Multiplikator. Stapel sind ohne Deckel.</p>
<p><b>Feuer.</b> Ein Sieg ab ${C.HEAT_MIN_MARGIN} Kampfwert-Vorsprung gibt (Vorsprung − ${C.HEAT_MARGIN_OFFSET}) % Hitze; eine Niederlage kühlt −${C.HEAT_LOSS} %. Je volle 10 % Hitze zählt der Stich +${Math.round(C.HEAT_MULT_PER_10 * 100)} % Score (×1,2 bei 100 %). Leiste 0 bis ${C.HEAT_MAX} %, mit Weißglut bis ${C.WEISSGLUT_HEAT_MAX} %. Kein Feuer-Score, kein Direkt-Score.</p>
<p><b>Raritäten.</b> Jeder normale Skill hat vier Stufen: Normal, Selten, Sehr selten, Episch. Zwei Stufen desselben Skills haben nie dieselben Werte; Episch hat ein Extra oder ist sehr stark. Legendäre haben keine Stufe und dürfen zwei Dinge tun. Hochspannung (Blitz) hebt jede gehaltene Stufe um eins.</p>

<h2>2. Blitz – 14 Skills</h2>
${table(["Skill", "Achse", ...TIERS], skillRows("lightning"))}
<h3>Blitz – Legendäre</h3>
${table(["Legendär", "Achse", "Effekt"], legRows("lightning"))}

<h2>3. Feuer – 14 Skills</h2>
${table(["Skill", "Achse", ...TIERS], skillRows("fire"))}
<h3>Feuer – Legendäre</h3>
${table(["Legendär", "Achse", "Effekt"], legRows("fire"))}

<h2>4. Raritäten-Tabelle (Kennwerte je Stufe)</h2>
<p>Dieselben Leitern als Zahlen, wie sie im Code stehen (Crit-Chance und Anteile als Dezimalzahl: 0,015 = 1,5 %).</p>
<h3>Blitz</h3>
${table(["Skill", ...TIERS], tierRows("lightning"))}
<h3>Feuer</h3>
${table(["Skill", ...TIERS], tierRows("fire"))}

<h2>5. Sim-Auswertung (Stand ${esc(STAND)})</h2>
<h3>5.1 Wie gemessen wird</h3>
<ul>
<li><b>Gierig</b> (--mode skills): 1000 Explore-Läufe bauen eine Wertetabelle, 150 gierige Läufe spielen danach. Je Skill die gepaarte Ablation: derselbe Seed ohne den Skill. „typ." ist der typische Effekt, „win" der Anteil der Seeds, in denen der Skill gewinnt. Das ist der Schiedsrichter für „trägt" und „schadet". Streuung zwischen zwei Läufen derselben Einstellung: ±20 % im Median, ±30 Punkte bei selten gehaltenen Skills.</li>
<li><b>Duell</b>: 100 Läufe reine Fraktions-Policy, Feuer mono gegen Blitz mono, Floor = Median Feuer ÷ Median Blitz. Ziel: Parität um 1,0×.</li>
<li><b>Motor</b>: 100 Läufe je Build, was Hitze und Ionisierung im Lauf wirklich tun.</li>
<li><b>Legendäre zur Laufmitte</b>: jedes Legendäre in Skill-Phase 7 von 13 (Runde 25) eingesetzt, gepaart gegen denselben Seed ohne. Misst im gemischten gierigen Build.</li>
<li><b>Lifts im reinen Build</b>: 400 Läufe Fraktions-Policy, Median mit ÷ ohne, nur über Läufe ohne Legendäres. Für Skills, die zu 90 % gehalten werden, ist die „ohne"-Gruppe klein — Werte unter 0,9 sind Rauschen, kein Befund.</li>
</ul>

<h3>5.2 Parität Feuer / Blitz (Duell, 100 Läufe)</h3>
${table(["Build", "Median", "Mean", "p90", "Siegquote"], [dRow("Feuer mono"), dRow("Blitz mono"), dRow("Feuer\\+Blitz Split").map((c, i) => (i === 0 ? "Feuer+Blitz Split" : c)), dRow("Mix \\(Random\\)").map((c, i) => (i === 0 ? "Mix (Random)" : c))])}
<p>Floor Feuer ÷ Blitz: <b>${dFloor[1] || "?"}×</b>, Mean ${dFloor[2] || "?"}×, p90 ${dFloor[3] || "?"}×. Floor um 1,0× heißt Parität im Median; Mean und p90 zeigen, bei wem der Schwanz liegt.</p>

<h3>5.3 Motor</h3>
<p>Blitz (Welt nur Blitz): Crits je Lauf, Leisten je Lauf, Stapel je Lauf, Anteil des Scores aus Crits und aus Stapeln, mittlerer Crit-Multiplikator, Anteil der Crits am ${C.CRIT_MULT_CAP}×-Deckel.</p>
${table(["Build", "Median", "Crit-Rate", "Leisten", "Stapel", "Crit-Anteil", "Stapel-Anteil", "Crit-Mult Ø", "am Deckel"], [mRow("Fraktion (zufällig)"), mRow("Stapel zuerst"), mRow("Crit zuerst")])}
<p>Feuer (Welt nur Feuer): Median, Anteil der Stiche mit voller Leiste, Anschlag auf der Leistenlänge des Builds, Stiche bis 100 % Hitze.</p>
${table(["Build", "Median", "≥ 100 %", "Anschlag", "bis 100"], [fRow("Fraktion (zufällig)"), fRow("ohne Verstärker"), fRow("Zunder + Kern")])}

<h3>5.4 Gierige Auswertung (${gScore[4] || "?"} % Siegquote, Median ${gScore[1] || "?"}, Mean ${gScore[2] || "?"}, p90 ${gScore[3] || "?"})</h3>
<p>Spalten: gehalten am Laufende, typischer Effekt der gepaarten Ablation, Anteil der Seeds mit Gewinn, Lift je Stufe aus den Explore-Läufen (N Normal, S Selten, X Sehr selten, E Episch, L Legendär), Flag der Auswertung.</p>
<h4>Feuer</h4>
${table(["Skill", "gehalten", "typ. Effekt", "gewinnt in", "Lift je Stufe", "Flag"], gRows(parseGreedy(feuerBlock)))}
<h4>Blitz</h4>
${table(["Skill", "gehalten", "typ. Effekt", "gewinnt in", "Lift je Stufe", "Flag"], gRows(parseGreedy(blitzBlock)))}
<p>Lesart: „stark" trägt den Lauf, „tot" wird gehalten und ändert nichts, „schadet" kostet gegen den Pick, den es verdrängt, „selten" wird kaum genommen (dann ist der Wert Rauschen).</p>

<h3>5.5 Legendäre zur Laufmitte (Basis Median ${legBase[1] || "?"}, p90 ${legBase[3] || "?"})</h3>
${table(["Legendär", "Fraktion", "typ. Effekt", "besser in", "Lift"], legRowsSim)}

<h3>5.6 Lifts im reinen Build (400 Läufe, ohne Legendäre in der Basis)</h3>
<h4>Feuer</h4>
${table(["Skill", "Lift Median", "Lift Mean", "je Stufe"], fireLifts)}
<h4>Blitz</h4>
${table(["Skill", "Lift Median", "Lift Mean", "je Stufe"], blitzLifts)}

<h3>5.7 Der Crit-Deckel, gemessen (7.22)</h3>
${table(["", "Deckel 8", "ohne Deckel"], [["Gierig Median / p90", "75–125M / 322–365M", "544M / 2,7 Mrd"], ["Blitz mono Median / Mean / p90", "11,7M / 22M / 58M", "15,5M / 68M / 161M"], ["Floor / Mean / p90 Feuer ÷ Blitz", "1,16× / 0,82× / 0,63×", "0,88× / 0,26× / 0,23×"], ["Crit-Mult Ø Stapel-Build", "4,6×", "9,2×"]])}
<p>Ohne Deckel läuft der Schwanz um das Drei- bis Achtfache weg. „Werte niedriger statt Deckel" wurde durchprobiert: selbst mit allen Crit-Quellen gekappt fällt der Blitz-Median zuerst, der Schwanz bleibt. Entscheid Owner: der Deckel bleibt bei 8.</p>

<h3>5.8 Entscheidungen (Kurzfassung, Spec 7.14–7.25)</h3>
<ul>
<li>Schmiede ohne Preis (nur Schwelle), 50 Runden, Stapel-Score 75 als Paritäts-Regler.</li>
<li>Schmelzpunkt als Überlauf-Wandler, Flächenbrand gestrichen, Feuersturm als Serie zu Score.</li>
<li>Blitz-Runde: Blitzableiter nimmt Statische Aufladung und Dauerstrom auf, Ionenfeld und Vorentladung neu, Überschlag gestrichen; Kettenblitz vertieft, Spannungsstau auf den Crit-Multiplikator.</li>
<li>Crit-Deckel 8 → 12 → 8 (12 kippte die Parität).</li>
<li>Donnergott zahlt über die Stapel, Sonnenzorn liest die Spitze und heizt darunter doppelt, Phönixfeuer gestrichen, Ewige Glut neu.</li>
<li>Acht Episch-Extras (Reststrom, Gewitterfront, Vorentladung, Kettenblitz, Blitzfänger, Kurzschluss, Zunder, Verbrennung).</li>
<li>7.23: Ladungsserie ÷10 (0,1–0,25 % je Serienpunkt); Feuerlinie ersetzt Glut (Formations-Sieg +2–5 % je Punkt Kampfwert, verbrennt 3 % Hitze).</li>
<li>7.24: Überspannung verwertet den Überschuss über dem Crit-Deckel als Ladung; Rückzündung im Takt (jeder 5./4./3./2. Sieg in Folge ×1,5); Dauerwert +1 je Leiste als Blitz-Passiv.</li>
<li>7.25: Resonanz ersetzt Durchschlag — ionisierte Karten in einer Formation teilen ihre Stapel.</li>
</ul>

<h3>5.9 Offen</h3>
<ul>
<li>Glutbett und Schmiede stehen gierig auf „schadet" — bleiben auf Wunsch des Owners.</li>
<li>Der Blitz-Schwanz (Dauerwert × Vorentladung × Überspannung Episch, Resonanz × Doppelentladung × Kettenblitz) — Wachpunkt; Regler Stapel-Score und Resonanz-Anteil.</li>
<li>Die Streuung der Auswertung: Urteile über selten gehaltene Skills brauchen zwei Läufe.</li>
</ul>
`;
writeFileSync(`${S}/skills-gdoc.html`, html);
console.log(`geschrieben: ${S}/skills-gdoc.html (${html.length} Zeichen); Greedy-Zeilen Feuer ${parseGreedy(feuerBlock).length}, Blitz ${parseGreedy(blitzBlock).length}; Legendäre ${legRowsSim.length}; Lifts ${fireLifts.length}/${blitzLifts.length}`);
