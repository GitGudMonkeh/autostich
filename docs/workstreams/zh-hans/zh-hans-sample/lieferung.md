# Lieferung: Sample-Übersetzung Deutsch → Vereinfachtes Chinesisch (`zh-Hans`)

Rücklieferung zum Auftrag „Autostich, sample translation order, German → Simplified Chinese".
115 von 115 Strings übersetzt, aus dem Deutschen, nicht über das Englische.

| Feld | Wert |
| --- | --- |
| Quell-Commit (zurückzitiert) | `d9763883bb5e1a2d5433d33f4de1121bb9da0cf9` |
| Zielsprache | Vereinfachtes Chinesisch, `zh-Hans` |
| Datei | `sample-order.csv` (Spalte `zh-Hans` gefüllt, sonst nichts geändert) |
| Datum | 2026-08-26 |

Der Commit existiert im Repo und wurde geprüft, die Quelle ist während der Übersetzung nicht
gedriftet.

## 1. Was zurückkommt

- `sample-order.csv`: identische Zeilenreihenfolge, identische IDs, identisches Quoting
  (RFC-4180, alle Felder gequotet), UTF-8 ohne BOM, LF. Nur Spalte `zh-Hans` wurde beschrieben.
- diese Datei mit Terminologie, Breiten-Messung, Annahmen.

Maschinell gegengeprüft und sauber: alle 115 Platzhalter-Mengen identisch zur deutschen Zeile,
`**bold**`-Paare identisch, keine führenden oder folgenden Leerzeichen, keine manuellen Umbrüche,
keine halbbreite Satzzeichen zwischen chinesischen Zeichen, kein Leerzeichen zwischen Han und
Latein oder Ziffern, kein Leerzeichen vor `%`. Nur Spalte 3 (`zh-Hans`) unterscheidet sich vom
Original.

## 2. Terminologie, Arbeitsstand

> **Status: nicht freigegeben.** Diese Liste geht vor der Freigabe an einen externen Übersetzer.
> Sie ist im Sample konsistent durchgezogen, aber jeder Eintrag ist verhandelbar. Erst nach dem
> externen Durchgang wird sie die bindende Liste für die restlichen 2.524 Strings.

Grundlage war `uebersetzerpaket_pixi_2026-08-15.md` §3, aber nur um zu verstehen, **was** ein
Begriff heißt. Die chinesische Wahl steht hier. Die EN-Spalte dient nur der Quer-Prüfung.

### Grundvokabular

| DE | zh-Hans | EN (eingefroren) | Begründung |
| --- | --- | --- | --- |
| Stich | 墩 | trick | Fachbegriff der chinesischen Stichspiel-Literatur, nicht 回合 |
| Durchlauf | 轮 (`第{cycle}轮`) | cycle | das einzige Wort dafür, sauber getrennt von „Lauf" |
| Lauf / Run | 对局 (gezählt: 局) | run | 局 als Zähleinheit, 对局 als Substantiv |
| Phase | 阶段 | phase | |
| Score | 得分 | score | |
| Serie (Siegesserie) | 连胜 | streak | |
| Multiplikator / Mult | 倍率 | multiplier | Malzeichen bleibt `×` |
| Crit / Crit-Chance | 暴击 / 暴击率 | crit | Genre-Standard im Chinesischen |
| Prozentpunkte | 百分点 | percentage points | klar getrennt von `%` |
| Reroll | 重抽 | reroll | |
| Seed | 种子 | seed | |
| Perk | 天赋 | perk | |
| Skill / Skill-Slot | 技能 / 槽位 | skill / skill slot | |
| Archetyp | 流派 | archetype | Genre-üblich, nicht 阵营 |
| Deck | 卡组 | deck | |
| Karte / Kartenwert | 卡牌 / 卡牌数值 | card / card value | |
| Aufstellung | 布阵 | order | passt zu 阵型 für Formation |
| Formation | 阵型 | formation | |
| Segment | 区段 | segment | |
| Brett | 棋盘 | board | |
| Zelle | 格 | cell | |
| Energie | 能量 | energy | |
| Bestenliste / Board | 排行榜 / 榜单 | leaderboard | |
| Wochen-Modifikator | 修正项 | weekly modifier | |
| Challenger-Archiv | 挑战者档案 | challenger archive | |
| Upgrade-Baum | 升级树 | upgrade tree | |
| Meta-Fortschritt | 局外进度 | meta progress | etablierter Roguelike-Begriff, wörtlich „Fortschritt außerhalb des Laufs" |
| Glossar / Leitfaden | 术语 / 指南 | glossary / guide | |
| Deck-Werkstatt | 卡组工坊 | deck workshop | |
| SP / DP / TP | unverändert | | Codes bleiben lateinisch |
| Autostich | unverändert | Autotrick | Produktname bleibt im Chinesischen stehen, s. §4.9 |

### Archetypen

| DE | zh-Hans | Anmerkung |
| --- | --- | --- |
| Blitz | 闪电 | |
| Ladung | 充能 | |
| Ionisierung / ionisiert | 电离 | |
| Stapel (Ionisierung) | 层 | Zähler: `+1层` |
| Feuer | 火 | |
| Hitze / Hitzeleiste | 热量 / 热量条 | |
| Weißglut | 白热 | bleibt distinktiv, kein generisches 过载 |
| Überhitzung | 过热 | |
| Eis | 冰 | |
| Gletscher | 冰川 | |
| Masse | 质量 | |
| Bersten / bricht | 碎裂 | Berst-Score: 碎裂得分 |
| Schwelle | 阈值 | nie mit 阶 (Stufe) verwechseln |
| Kollision | 碰撞 | |
| Schnee (früher Firn) | 积雪 | entschieden, s. §4.3 |
| Boden-Reserve | 地面储量 | |
| Dauerfrost / Schneetreiben / Eiszeit | 永冻 / 暴雪 / 冰期 | |
| Pflanze | 植物 | |
| Wachstum | 生长 | |
| Setzling | 树苗 | |
| grün / reif | 变绿 / 长成 | |
| Wurzel-Score | 根系得分 | |
| Mutterbaum / Weltenbaum | 母树 / 世界树 | |
| Überlauf | 溢出 | Überlauf-Wachstum: 溢出生长 |
| Trimmen / trimmbar | 修剪 / 可修剪 | folgt dem Pflanzen-Bild, nicht 精简 |
| Konsument | 消耗者 | |
| Wert-Deckel | 数值上限 | |

### Architekt

| DE | zh-Hans |
| --- | --- |
| Der Architekt / Bauphase | 建筑师 / 建造阶段 |
| Gebäude | 建筑 |
| Bauplan | 蓝图 |
| Struktur | 结构 |
| Distrikt | 街区 |
| Stufe (Familie/Gebäude) | 阶 (`{tier}阶`) |
| Familie | 系列 |
| legendär | 传说 |
| Aufwerten / Versetzen / Abriss | 升级 / 移动 / 拆除 |
| Speicherstadt / Sternwarte | 仓库城 / 天文台 |

## 3. Passt das rein

Der Auftrag sagt, `limit` ist überall leer, und bittet um eine Einschätzung statt um eigenmächtiges
Kürzen. Zeichenzahl ist dafür das falsche Maß: ein Han-Zeichen ist doppelt so breit wie ein
durchschnittlicher lateinischer Buchstabe. Gemessen wurde deshalb in em (Han und Vollbreiten-
Satzzeichen 1.0em, Latein und Ziffern 0.5em, Leerzeichen 0.28em), pro String gegen das Deutsche.

**Ergebnis: Chinesisch ist fast überall schmaler, Median ×0.74.** Nach Rolle:

| Rolle (context) | n | Median | min | max |
| --- | --- | --- | --- | --- |
| längste Beschreibung im Katalog | 14 | ×0.68 | 0.60 | 0.79 |
| Tutorial-Lektion (Fließtext) | 14 | ×0.71 | 0.40 | 0.88 |
| eyebrow | 13 | ×0.72 | 0.58 | 0.82 |
| text-micro | 13 | ×0.72 | 0.50 | 1.00 |
| text-meta längste | 10 | ×0.72 | 0.58 | 0.77 |
| text-body längste | 10 | ×0.75 | 0.60 | 0.82 |
| text-body-lg längste | 8 | ×0.77 | 0.57 | 0.88 |
| text-title | 8 | ×0.60 | 0.36 | 1.00 |
| Laufweite ohne uppercase | 6 | ×0.67 | 0.57 | 0.82 |
| **text-meta kürzeste** | **10** | **×1.00** | **0.80** | **1.33** |
| text-body kürzeste | 5 | ×0.80 | 0.80 | 1.00 |
| text-body-lg kürzeste | 4 | ×0.84 | 0.44 | 1.12 |

Der längste String im Sample, `privacy.sec.telemetry.body`, schrumpft von 277em auf 207em.
Die langen Rollen haben also durchweg Luft.

**Das eigentliche Risiko liegt bei den kürzesten Labels, nicht bei den längsten Texten.** Sie
schrumpfen nicht mit, weil unter zwei Han-Zeichen nichts mehr geht. Nur diese beiden werden echt
breiter:

| id | Rolle | DE | zh-Hans | Differenz |
| --- | --- | --- | --- | --- |
| `feedback.kind` | text-meta kürzeste | Art | 类型 | +0.5em (×1.33) |
| `start.seed.play` | text-body-lg kürzeste | ↻ Spielen | ↻ 开始游戏 | +0.5em (×1.12) |

Gleich breit, also ohne jede Reserve, sind zusätzlich `upgrades.ranked.free`, `skill.replace.new`,
`rail.trend.run`, `gameover.chart.run`, `name.preview.you`, `hud.time`, `hud.mult`,
`form.collapse.more`, `feedback.name`. Beide `common.cur.*` und `dev.run.title` bleiben unverändert
lateinisch.

Falls eine dieser Zellen später ein hartes Limit bekommt, sind das die Stellen, an denen wir reden
müssen. Kürzer als zwei Zeichen geht bei fast allen nicht mehr, ohne dass sie unverständlich werden.
`start.seed.play` ließe sich als `↻ 游玩` auf 0.5em unter das Deutsche drücken, liest sich aber
knapper als der deutsche Ton.

Zwei Dinge für die Typografie, die aus dem Material folgen:

1. **Eyebrows verlieren ihre Auszeichnung.** Kein uppercase, kein letter-spacing, also fällt die
   Hierarchie weg, die im Deutschen aus der Versalie kommt. Die 13 Eyebrow-Strings schrumpfen dabei
   auf ×0.72. Der Platz ist da, um die Hierarchie über Größe, Farbe oder Gewicht neu zu bauen.
2. **Die Laufweiten-Strings** (`tracking-*` ohne uppercase, 6 Stück) brauchen im Chinesischen
   `letter-spacing: 0` oder einen eigenen, viel kleineren Wert. Positive Laufweite zwischen
   Han-Zeichen zerlegt das Wort optisch.

## 4. Annahmen und Mehrdeutigkeiten

Wo es das Deutsche nicht hergab, wurde am Code nachgesehen statt geraten. Die englische Spalte wurde
nur an einer Stelle als Gegenprobe herangezogen, nicht als Übersetzungsvorlage.

1. **`bar.plant.tallest.title`, „der tiefste Baum".** Tief kann Höhe oder Wurzeltiefe meinen.
   Angenommen: Wurzeltiefe, weil der Satz mit „verdoppelt seinen Wurzel-Score" endet.
   `en.js` bestätigt „your deepest tree". Übersetzt als 你最深的那棵树. Falls „der größte Baum"
   gemeint war, wird daraus 最高的那棵树.
2. **`rail.rate`, „Quote".** Aus `src/ui/StatusRail.jsx:106` ist es die Siegquote in Prozent, also
   胜率, nicht eine allgemeine Rate. Dasselbe Wort in `perk.L_ZINS.desc` („Verfehlst du die Quote")
   meint die 65-%-Schwelle und steht dort als 这个比率.
3. **`arch.firn.title`, „Schnee". Entschieden am 2026-08-26: 积雪.**
   Firn wurde auf der deutschen Seite bewusst gegen Schnee getauscht, das Chinesische folgt dem
   sichtbaren Wort. Der glaziologische Fachbegriff 粒雪 (genauso distinktiv wie „Firn") kommt damit
   nicht zum Einsatz. Das deckt sich mit dem bereits ausgelieferten Englisch: `en.js` sagt
   „Snow · reserve" und „Ground reserve", nicht „firn".

   Nebenbefund, gehört nicht zu dieser Lieferung: `uebersetzerpaket_pixi_2026-08-15.md` §3.4 führt
   in Zeile 226 weiterhin `Firn / Firn-Boden / Firn-Reserve → firn / firn ground / firn reserve`,
   und Zeile 111 nennt Firn als Beispiel für die bewusst distinktiven Wörter. Beides ist nach dem
   Tausch veraltet. Die Tabelle ist als eingefroren markiert und hängt an
   `test/i18n-guards.test.js`, deshalb hier nur der Hinweis statt einer Änderung. Die String-IDs
   (`arch.firn.title`, `bar.ice.firnGround`, `bar.ice.firnReserve`) tragen das Wort weiter, das ist
   folgenlos, solange sie nur Schlüssel sind.
4. **`glossary.ionize.text`, „JEDER" in Versalien.** Chinesisch kennt keine Versalien und der String
   trägt kein `**bold**`, das ich hätte übernehmen dürfen. Die Betonung steht jetzt lexikalisch:
   任意一张获胜卡牌 („jede beliebige Siegkarte"). Wenn die Betonung tragen soll, wäre `**` im
   deutschen Quellstring der sauberere Weg.
5. **`skill.passive.plant`, „bei jeder {everyLoss}. Niederlage".** Der Punkt ist die deutsche
   Ordnungszahl-Markierung, kein Satzende. Im Chinesischen entfällt er: 每{everyLoss}次失败.
6. **`arch.struct.head`, „×Score je Durchlauf". Entschieden am 2026-08-26: das `×` fällt weg,
   der String lautet 结构与街区 · 每轮得分倍率.**
   Grundlage der Empfehlung war die Fundstelle, nicht das Sprachgefühl.
   `src/ui/ArchitectScreen.jsx:917` setzt den String als Überschrift über vier Zeilen, die ihr
   Rechenzeichen jeweils selbst mitbringen: `arch.struct.row` „volle Zeile ×{f}", `.col`, `.diag`
   und `.district` „+{pct} %/Nachbar". Das `×` in der Überschrift ist damit kein Datum, sondern ein
   Typ-Hinweis auf die Zeilen darunter. Im Deutschen trägt er, weil „×Score" als Kürzel lesbar ist.
   Im Chinesischen steht ein `×` ohne Zahl im Nichts, während 倍率 („Multiplikator") dasselbe
   ausspricht. Es geht also nichts verloren, und die Zeilen darunter behalten ihr `×` unverändert.

   Zweiter Punkt an derselben Fundstelle: die Überschrift hängt an
   `className="uppercase tracking-wide opacity-55"`. `uppercase` ist im Chinesischen wirkungslos,
   `tracking-wide` schädlich (s. §3, Punkt 2). Dieses Element braucht eine `zh-Hans`-Variante.
7. **`fxsyn.klinge.desc`, „×1,25".** Nach §5 des Auftrags werden Zahlen westlich gesetzt, das
   deutsche Dezimalkomma wird also zum Punkt: ×1.25, ×1.5, ×2.0.
8. **`arch.noRotate.title`, „belegt eine ganze Segment-Zeile".** Angenommen: die Form füllt eine
   komplette Zeile eines Segments, deshalb 占满整行区段.
9. **`Autostich` in `privacy.intro`.** Bleibt stehen, wie der Auftrag es verlangt. Zur Information,
   nicht als Vorschlag: §3 des Übersetzerpakets hat den Titel für Englisch am 18.08.2026 auf
   `Autotrick` gedreht, weil „Stich" im Namen den Mechanismus mitsagt. Dieselbe Frage stellt sich
   fürs Chinesische. Sie gehört aber ins Marken-Ressort, nicht in eine Sample-Übersetzung.
10. **`dev.run.title`, „DEV RUN".** Als Dev-only-String unübersetzt gelassen. Falls er doch sichtbar
    ist, wird daraus 开发对局.

## 5. Zwei Befunde im Code, behoben auf diesem Branch

Beide betrafen Strings, die im JSX aus drei Fragmenten zusammengesetzt wurden. Im Deutschen ging das
auf, im Chinesischen nicht.

**a) Die Wortstellung.** `src/ui/FormationPhase.jsx` baute den Satz als `pre` + fettes `within` +
`post{size}`. Deutsch: „Formationen entstehen nur **innerhalb** der 5er-Segmente". Das
fettgesetzte „innerhalb" ist im Deutschen eine Präposition und steht vor dem Nomen. Das chinesische
Gegenstück (内 / 之内) ist eine Postposition und steht dahinter. Die feste Reihenfolge pre → fett →
post ergab damit einen kaputten Satz, egal wie man die drei Teile übersetzt.

**b) Die hartkodierten Leerzeichen.** `FormationPhase.jsx` und `src/ui/GlacierPick.jsx` schrieben
beide `{a} <b>{m}</b> {b}` mit Literal-Leerzeichen im JSX. Im Chinesischen reißt das zwei sichtbare
Lücken um das fette Wort, genau das, was §5 des Auftrags („kein Leerzeichen zwischen Han-Zeichen")
verhindern soll, nur eben aus dem Code statt aus der Übersetzung.

### Was umgesetzt wurde

Beide Ursachen sind dieselbe: der Satzbau lag im JSX statt im String. Die drei Fragmente wurden
deshalb je zu **einem** Katalog-String mit `**`-Auszeichnung zusammengeführt und werden über
`split(/\*\*/)` gerendert. Das ist keine neue Mechanik, sondern die Konvention, die im Repo schon
steht: `src/ui/BuildSummary.jsx` macht es genauso und nennt sie dort „dieselbe Markup-Konvention wie
die Leitfaden-Texte".

Damit verschwinden beide Probleme auf einmal. Es gibt keine Leerzeichen mehr im JSX, und die
Wortstellung ist frei, weil der ganze Satz in einem String steht.

Zwei Alternativen wurden verworfen. Den Trenner aus dem Locale zu ziehen (ein Leerzeichen im
Deutschen, ein leerer String im Chinesischen) war die ursprüngliche Empfehlung: es repariert aber nur
b), nicht a). Als Katalog-String bräche ein Wert aus einem Leerzeichen zwei Guards
(`test/i18n-guards.test.js` „kein Katalogtext ist leer" und „englische Texte unterscheiden sich vom
deutschen Original"), und einen Guard zu schwächen statt ihn über N Sprachen zu verallgemeinern ist
genau das, was Tripwire 2 des `zh-hans-plan`-Contracts stoppt. Als Locale-Metadatum gehörte er in die
i18n-Seam, die Tripwire 3 desselben Contracts für `task/spanish-locale` reserviert.

### Was das für das Sample heißt

Vier IDs aus dem Sample gibt es nicht mehr, sie sind durch zwei ersetzt:

| entfallen | ersetzt durch |
| --- | --- |
| `form.hint.pre`, `form.hint.within`, `form.hint.post` | `form.hint` |
| `glacierpick.intro.a`, `glacierpick.intro.rigid`, `glacierpick.intro.b` | `glacierpick.intro` |

**`sample-order.csv` wurde bewusst nicht angefasst.** Sie ist die Antwort auf die Order, die auf
`d9763883` eingefroren ist, und ihre Zeilenreihenfolge ist laut §7 des Auftrags der Merge-Key-Check.
Die vier Zeilen stehen dort also weiter, mit ihrer Übersetzung, und sind ab hier überholt. Die zwei
Nachfolger stehen stattdessen hier:

| id | de | zh-Hans |
| --- | --- | --- |
| `form.hint` | Tippe zwei Karten zum Tauschen (1 Energie) · Formationen entstehen nur \*\*innerhalb\*\* der {size}er-Segmente | 点击两张卡牌交换位置（1能量） · 阵型只能\*\*在段内\*\*形成（每段{size}张） |
| `glacierpick.intro` | Sie friert auf ihrer Zelle fest. Ab dann \*\*starr\*\* (nicht mehr verschiebbar) und sammelt Masse, bis sie bricht. Entscheide zwischen Position und Wert. | 它会冻结在所在的格子上，从此\*\*僵固\*\*（无法再移动），并每轮积累质量，直到碎裂。请在位置和数值之间做出取舍。 |

### Gegenprobe

Der sichtbare Text hat sich in keiner der beiden bestehenden Sprachen geändert. Gemessen, nicht
angenommen: die alten drei Fragmente mit einem Leerzeichen verbunden ergeben zeichengleich denselben
String wie der neue Wert ohne seine `**`-Marker, für Deutsch und Englisch, an beiden Stellen.

Gates auf diesem Branch: `npm test` 2178 von 2178 grün, `npm run lint` ohne Befund. Der Loc-Export
(`npm run loc:export`) wurde neu erzeugt, weil zwei Tests in `test/loc-csv.test.js` sonst über die
sechs verwaisten Zeilen fallen. Sein Diff ist genau minus sechs, plus zwei Zeilen, keine weitere
Drift.

## 6. Stand der offenen Punkte

Beide Sprachfragen sind am 2026-08-26 entschieden und oben eingearbeitet: 积雪 bleibt (§4.3), das
`×` in `arch.struct.head` fällt weg (§4.6). Die CSV enthält beides bereits so, sie musste dafür
nicht geändert werden.

**Die Terminologie in §2 ist damit noch nicht bindend.** Sie ist meine Wahl, nicht die eines
Muttersprachlers, und soll vor der Freigabe extern gegengelesen werden. Bis dahin gilt sie als
Arbeitsstand. Für den externen Durchgang ist relevant, dass die Liste in sich konsistent
durchgezogen ist: wer einen Begriff kippt, kippt ihn über alle 115 Zeilen, und die Stellen dafür
stehen in §2. Die drei Entscheidungen mit dem größten Hebel, weil sie sich durch fast jeden
Regeltext ziehen, sind 墩 für Stich, das Paar 轮 (Durchlauf) gegen 对局 (Lauf) und 天赋 für Perk.

Die beiden Code-Punkte aus §5 sind auf diesem Branch behoben, nicht nur notiert. Damit ist
offen: der externe Terminologie-Durchgang, und die Frage, ob weitere Fragment-Stellen im Katalog
dasselbe Muster haben. Geprüft wurden nur die zwei, die im Sample auffielen; der Volljob über alle
2.639 Schlüssel wird zeigen, ob es mehr sind.
