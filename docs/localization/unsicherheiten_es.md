# Unsicherheitsliste Spanisch — wo ich deine Meinung will

> **Stand: 2026-08-26 — OFFEN.** Der Katalog ist vollständig und die Suite grün; alles hier ist
> bereits **umgesetzt**, die Spalte „Mein Vorschlag" ist also die geltende Fassung. Was du hier
> änderst, ist ein Einzeiler im Katalog, kein Nacharbeiten.
>
> Alles hier ist **Klang, nicht Korrektheit.** Die Mechanik stimmt in allen Fällen; die Frage ist,
> ob es sich gut anhört. Wo ein Begriff prüfbar war (Fachbegriff, Kollisionsfreiheit, Genre-Norm),
> steht er in der eingefrorenen Begriffstabelle `TERMS.es` und nicht hier.
>
> **Sprache dieses Dokuments.** Repository-Dokumente sind sonst englisch. Dieses hier ist deutsch,
> weil es seinem Vorbild folgt (`unsicherheiten_en.md`) und weil es aus dem Deutschen heraus
> argumentiert. Abweichung vermerkt (`AGENTS.md` — *Appending to an existing German document*,
> sinngemäß).

Nicht auf dieser Liste, weil bereits entschieden: neutrales Spanisch · Deutsch als Quelle ·
`Autobaza` · die Rückfallkette `es → en → de` · der Layout-Durchgang.

---

## 1. Die Score-Ansagen — die einzige Kette, die hörbar steigern muss

Das ist die wichtigste Klangfrage und sie steht **auch im Entscheidungsblock**, weil sie als
einzige eine Freigabe braucht: die englische Kette trägt ein Freigabedatum (15.08.2026), die
spanische noch nicht. Sie ist deshalb bewusst **nicht** in den Wächter eingefroren.

| DE | EN (eingefroren) | Mein Vorschlag ES | Warum unsicher |
|---|---|---|---|
| Stark | NICE | **BIEN** | Kürzeste Stufe, muss die schwächste sein. Alternative: **GENIAL** (wärmer, aber schon fast zu stark für Stufe 1). |
| Brutal | BRUTAL | **BRUTAL** | Identisch, funktioniert im Spanischen genauso. |
| Irre | INSANE | **DEMENCIAL** | 9 Zeichen in Versalien — die breiteste Stufe der Kette. Alternative: **DE LOCOS** (kürzer, umgangssprachlicher). |
| Gottgleich | GODLIKE | **DIVINO** | Kurz und steigernd. Alternative: **DIVINIDAD**. |
| Lawine | AVALANCHE | **AVALANCHA** | Nah am Deutschen. |
| Gönn dir | LET’S GO! | **¡VAMOS!** | Trifft den Ton; das Deutsche ist ironischer. Alternative: **¡A POR ELLO!** (länger). |

`options.float.desc` und `fx.starfield.desc` nennen die Kette im Fließtext und ziehen mit.

---

## 2. Kosmetik-Namen — die eigentliche Flavour-Frage

27 Sets. Die Regel, nach der ich sortiert habe: **was das Deutsche deutsch sagt, wird spanisch
gesagt; was das Deutsche fremd stehen lässt, bleibt fremd** (Paket §8). Deshalb wird `Beryll`
zu `Berilo`, während `Scarab` stehen bleibt — obwohl beides Mineral-und-Käfer ist.

| Deutsch | Mein Vorschlag | Warum unsicher |
|---|---|---|
| **Quecksilber** | Azogue | `Azogue` ist das alte, bildhafte Wort; `Mercurio` wäre klarer, kollidiert aber mit Planet und Gott. Das Deutsche ist hier das nüchterne Wort, das Englische (`Quicksilver`) das poetische — ich bin dem Englischen gefolgt. |
| **Sparfuchs** | Tacaño | Trifft die Sparsamkeit, verliert den Fuchs — genau wie `Penny Pincher`. Alternative: **Zorro Ahorrador** (behält das Tier, klingt zahmer). |
| **Königspfau** | Pavo Real | Muss sich von `Peacock` (niedrigere Serien-Stufe) unterscheiden. `Pavo Real` ist schlicht das spanische Wort für Pfau; **Pavo Real Regio** wäre pompöser und deutlicher abgesetzt. |
| **Nachtklinge** | Hoja Nocturna | `hoja` folgt der Begriffstabelle (Klinge → hoja). **Filo Nocturno** klingt schärfer, bricht aber die Vokabel. |
| **Kosmospanther** | Pantera Cósmica | ziemlich sicher |
| **Kolossus** | Coloso | ziemlich sicher |
| **Laternenfest** | Fiesta de los Faroles | ziemlich sicher |
| **Schwarzes Loch** / **Roter Oni** | Agujero Negro / Oni Rojo | ziemlich sicher |
| **Obsidian** / **Beryll** / **Paradox** | Obsidiana / Berilo / Paradoja | ziemlich sicher |

**Nicht verhandelbar:** Die vier Element-Decks heißen exakt wie ihre Archetypen — Fuego · Hielo ·
Rayo · Planta. Ein Test hält das fest.

---

## 3. Architekt-Gebäude — Fachwort oder Alltagswort

Das Paket verlangt in §3 ausdrücklich, dass ein eigenwilliges deutsches Wort auch spanisch
eigenwillig bleibt. Ich habe deshalb überall das **bautechnische** Wort genommen, wo es eins gibt.
Wenn dir das zu speziell ist, sag es — die Alltagsvariante steht daneben.

| Deutsch | Mein Vorschlag | Alltagsvariante |
|---|---|---|
| Wehrgang | **Adarve** | Camino de ronda |
| Giebel | **Hastial** | Frontón |
| Meilenstein | **Miliario** | Mojón |
| Vorwerk | **Revellín** | Antemuro |
| Zwinger | **Liza** | Patio de armas |
| Marktplatz | **Mercado** | Plaza del mercado (länger) |

---

## 4. Einzelne Vokabeln, bei denen ich geschwankt habe

| Stelle | Deutsch | Mein Vorschlag | Warum unsicher |
|---|---|---|---|
| `name.eyebrow.first` | Willkommen | **Bienvenida** | Als **Substantiv** gelesen ist es geschlechtslos, als Adjektiv wäre es feminin — und das Deutsche verrät über den Spieler nichts. Alternative: **Te damos la bienvenida** (eindeutig, aber doppelt so lang für eine Kopfzeile). |
| `rail.jackpot` | Jackpot | **Bote** | Echtes spanisches Wort. Das Deutsche borgt hier aus dem Englischen; **Jackpot** wäre auch im Spanischen verstanden und stünde dann als bewusste Ausnahme in `SAME_OK.es`. |
| `shop.chooseGott` | Prunk | **efecto de gala** | Das Englische hat den Prunk zu „score effect" eingeebnet. Ich habe den Schwung behalten. |
| `C_SACRIFICE` / `perk.L_OPFER` | Opfergabe / Opfergang | **Ofrenda** / **Sacrificio** | Zwei deutsche Wörter, zwei spanische. Das Englische benutzt für beide „Sacrifice" — ich habe sie getrennt gehalten. |
| `C_SURVIVOR` | Überlebensvorteil | **Ventaja de Supervivencia** | Wörtlich richtig, aber `ventaja` ist auch das eingefrorene Wort für Perk. Als **Name** ist das unkritisch; wenn es dich stört: **Instinto de Supervivencia**. |
| `perkcat.D.name` | Score | **Punt.** | Abgekürzt, weil der Chip eng ist — dasselbe Mittel, das §3.1 für `crít.` ausdrücklich erlaubt. Die Beschreibung daneben trägt das volle Wort. |

---

## 5. Abweichungen vom Paket, die ich melden muss

**§3.4 „Firn → neviza" gilt nicht mehr.** Der deutsche Text wurde vor diesem Task von „Firn" auf
„Schnee" umbenannt (die Schlüssel heißen noch `firn*`, die Strings sagen Schnee). `neviza` hätte
ein Wort übersetzt, das das Spiel nicht mehr sagt. Spanisch heißt es **`nieve`**.

**§10 „Fragen bitte je Zeile in `note`" geht hausintern nicht.** Die Spalte `note` wird von
`scripts/export-strings.mjs` **mitgeneriert** — eine Notiz dort überlebt den nächsten
`npm run loc:export` nicht. Für einen externen Übersetzer, der eine CSV zurückschickt, stimmt die
Anweisung; für den Fall „Übersetzer ist zugleich Umsetzer" nicht. Die Notizen stehen deshalb hier.

---

## 6. Wo Deutsch und Englisch sich widersprechen

Gemeldet statt geglättet (Paket, Kasten oben). Deutsch hat jeweils gewonnen.

| Schlüssel | Deutsch | Englisch | Was ich getan habe |
|---|---|---|---|
| `family.D_CRIT_SCORE.name` | Kritische Chance | Crit Score | Der Effekt ist „+Score je Crit", das englische Wort beschreibt ihn besser — der deutsche Name ist streng genommen ein Fehlgriff. Ich bin dem Deutschen gefolgt: **Ocasión Crítica**. `Probabilidad` habe ich vermieden, damit der Name nicht als die Crit-Chance-Kennzahl gelesen wird. **Wenn du den deutschen Namen nachziehen willst, ist das eine eigene Zeile im deutschen Katalog.** |
| `upgrades.free` / `upgrades.ranked.free` | beide „frei" | „free" / „unlocked" | Das Deutsche ist mehrdeutig, das Englische löst es auf. Ich bin der englischen Auflösung gefolgt: **gratis** bzw. **desbloqueada**. Genau dafür steht `en_ref` da (§2). |
| `glossary.skillrunde` | Skill-**Durchlauf** | Skill **cycle** | Beide sagen Durchlauf/cycle — aber `tut.wahl.skills.0` sagt deutsch „Skill-**Runden**". Ich habe das Glossar auf **`Ciclo de habilidad`** gezogen (§3.1: `ciclo` ist das einzige Wort für Durchlauf) und die Tutorial-Zeile bei `rondas` gelassen, weil das Deutsche dort ein anderes Wort benutzt. Die Uneinheitlichkeit ist deutsch, nicht spanisch. |

---

## 7. Längenschranken, die ich gerissen habe — für `es-layout`

Alle bewusst, keine davon ist ein Übersetzungsfehler. Das Paket ist hier eindeutig: **der Text
gewinnt, das Layout wird nachgemessen** (§6).

| Stelle | Deutsch | Spanisch | Schranke |
|---|---|---|---|
| `suit.Y.name` | Gelb (4) | **Amarillo** (8) | war 6, jetzt 8 — die Schranke rechnet sich mit `ready: true` selbst hoch |
| `archcat.score.label` | Wert/Score | **Puntuación** (10) | war 9, jetzt 10 — dito |
| `hud.score` | Score (5) | **Puntuación** (10) | keine belegte Schranke, aber eine **enge HUD-Zelle**. Doppelte Länge. Die auffälligste Stelle im ganzen Katalog. |
| `options.rfx.*` | Aus (3) / An (2) | **Apagado** (7) / **Encendido** (9) | Dreiweg-Schalter, wächst um das Drei- bis Vierfache |
| `upgrades.lane.cover`, `arch.plot` | Baufeld (7) | **Espacio de construcción** (23) | Lane- und Kachel-Beschriftung |
| `runstats.*Score`, `perkcat.*` | Form.-Score, Score | **Punt. form.**, **Punt.** | schon abgekürzt, mehr geht nicht ohne die Vokabel zu brechen |

Zwei davon (`suit.Y.name`, `archcat.score.label`) lösen sich mechanisch: `export-strings.mjs`
bildet die gemessene Schranke über die **fertigen** Sprachen, und mit `ready: true` zählt Spanisch
mit. Die übrigen brauchen ein Auge.
