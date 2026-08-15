# Wie andere Spiele des Genres das nennen

> Recherche-Notiz zur Begriffstabelle in `uebersetzerpaket_pixi_2026-08-15.md` §3.
> Zweck: die englischen Begriffe **begründen** statt behaupten. Stand 2026-08-15.
> Verglichene Spiele: Balatro · Slay the Spire (1 + 2) · Hearthstone · Super Auto Pets ·
> Teamfight Tactics · klassische Stichspiele (Whist, Skat, Oh Hell).

---

## 0. Das Muster hinter allen dreien

Erfolgreiche Genre-Vertreter machen **nicht** das, was man erwartet — sie übersetzen ihre Begriffe
nicht in Allerweltswörter, sondern **prägen kurze, eigene Substantive und erklären sie einmal**.

- Balatro nennt eine Spielstufe **Ante** und eine Runde darin **Blind** — beides Pokerwörter, die
  außerhalb von Poker niemand kennt. Statt sie zu vermeiden, erklärt das Spiel sie und macht sie zum
  Vokabular der Community.
- Slay the Spire nennt seine Abschnitte **Act** und **Floor**, seine passiven Gegenstände **Relic**.
- Super Auto Pets nennt die Kaufphase schlicht **Shop Phase**, die Kampfphase **Battle Phase**.

**Folgerung für Autostich:** Unsere eigenwilligen Wörter (Weißglut, Ascheglut, Firn, Glutdividende,
Grenzbonus) sind **kein** Übersetzungsproblem, sondern genau die Genre-Norm. Wir haben mit dem
109-Einträge-Glossar bereits den Apparat, den Balatro für Ante/Blind gebaut hat. Sie dürfen also
distinktiv bleiben — `white heat`, `ash glow`, `firn`, `ember dividend`, `crossover bonus`.
Das Gegenteil (alles auf generische Wörter einebnen) wäre der Fehler.

---

## 1. „Durchlauf" → **cycle** ✅ bestätigt, sogar stärker als angenommen

Ein Durchlauf ist bei uns ein kompletter Durchgang durch alle 40 Karten des Decks.

| Spiel | Wort für die Spielstufe | Wort für die kleinste Einheit |
|---|---|---|
| Balatro | **Ante** (8 pro Lauf) | **Blind** (3 pro Ante) |
| Slay the Spire | **Act** | **Floor** |
| Super Auto Pets | **Round / Turn** | — |
| Autostich | **cycle** (50 pro Lauf) | **trick** (40 pro cycle) |

Entscheidend: **„cycle" ist im Deckbuilder-Englisch bereits der Fachausdruck für genau diese Sache.**
„To cycle your deck" heißt, den Nachziehstapel einmal komplett durchzuspielen und neu zu mischen —
wörtlich unsere Mechanik. Wir übersetzen also nicht, wir treffen den etablierten Begriff.

**„Round" wäre der Fehler.** Es ist das Wort, zu dem Spieler von selbst greifen, und genau deshalb
mehrdeutig: Meinen sie den Stich oder den Deck-Durchlauf? Balatro umgeht dasselbe Problem, indem es
„round" komplett meidet und Ante/Blind einführt. Der Guard in `test/i18n-guards.test.js` verbietet
„round" als Übersetzung von Durchlauf und Stich deshalb hart.

## 2. „Stich" → **trick** ✅ bestätigt

Kein Genre-, sondern ein Fachbegriff: In Whist, Bridge, Skat und Oh Hell heißt die Kartenrunde
**trick**, der Spieler, der beginnt, **leads**, und ein gewonnener Stich wird **taken**. „Trick-taking
game" ist die englische Gattungsbezeichnung. Es gibt keine Alternative und keinen Grund für eine.

Nebenprodukt: **„Autostich" ist im Englischen nicht selbsterklärend.** Der deutsche Name trägt
„Stich" sichtbar; „Autostich" liest sich englisch wie ein Nähbegriff (stitch). Kein Grund zur
Umbenennung — Balatro heißt auch Balatro —, aber der englische Untertitel sollte das Genre klar
nennen: *„Roguelite autobattler trick-taking game"* (steht so im Katalog, `start.tagline`).

## 3. Rarität → **Common · Uncommon · Rare · Epic** ✅ bestätigt, mit neuem Argument

Der Markt kennt drei Leitern:

| Spiel | Leiter |
|---|---|
| Slay the Spire | Common · Uncommon · Rare |
| Balatro | Common · Uncommon · Rare · **Legendary** |
| Hearthstone | Common · Rare · **Epic** · **Legendary** |

Autostich hat **vier** Stufen — und zusätzlich ein davon **unabhängiges** Konzept „Legendär"
(legendäre Perks, Skills und Gebäude sind keine Raritätsstufe, sondern eine eigene Achse, samt
eigener Phase in Durchlauf 29).

Damit scheiden Balatro und Hearthstone als Vorbild aus: Beide enden auf „Legendary", das bei uns
**schon vergeben ist**. Eine Leiter, die auf Legendary endet, würde die Legendär-Phase unlesbar machen.

→ **Common · Uncommon · Rare · Epic** ist die einzige gängige Vierer-Leiter ohne diese Kollision.
„Epic" ist als lila Stufe branchenweit verstanden (die Farbcodierung grau→grün→blau→lila ist
genreübergreifend stabil).

> **Nebenbefund fürs Deutsche — umgesetzt.** Die Leiter hieß Normal · Selten · **Sehr selten** ·
> **Rar**. „Rar" *über* „Sehr selten" steigerte rückwärts — beides sind Synonyme. Kein
> Übersetzungsproblem, sondern ein deutsches, das erst beim Übersetzen auffiel.
> Stufe IV heißt jetzt **„Episch"** (`TIER_META` in `rarity.js`, eine Quelle), passend zur
> englischen Leiter. Der Upgrade-Baum zieht seine Knotennamen seitdem aus `TIER_META`, statt sie
> abzutippen.

## 4. „Perk" → **perk** ✅ bestätigt

Im Genre konkurrieren **relic** (Slay the Spire), **trinket**, **boon** (Hades) und **perk**.
Die Wörter sind nicht austauschbar, sie tragen Bedeutung:

- **relic / trinket** = passiver Gegenstand, meist gefunden, nicht gewählt.
- **boon** = Gabe einer Figur, an eine Fiktion gebunden.
- **perk** = gewählter, dauerhafter Vorteil aus einem Angebot.

Unsere Perks kommen als **3er-Angebot zur Wahl**, haben Kategorien, Raritäten und stapeln in
Familien — das ist die Perk-Semantik, nicht die Relic-Semantik. **perk** bleibt.

## 5. „Skill" → **skill**, „Skill-Slot" → **skill slot** ✅ bestätigt

„Ability" wäre die Alternative, ist aber im Kartenspiel-Englisch mit *Kartentext* belegt (die
Fähigkeit einer Karte). Unsere Skills sind **eigene Objekte in begrenzten Plätzen** — „slot" macht
das eindeutig, und „skill slot" ist in Autobattlern (TFT, Underlords) etablierte Sprache.

## 6. Die Bauphase → **build phase**, „Der Architekt" → **the Architect** ✅ bestätigt

Autobattler nennen die Vorbereitungsphase **shop phase** (Super Auto Pets) oder **planning phase**
(TFT, Dota Underlords). Beides passt bei uns **nicht**: Es wird nichts gekauft (der Münz-Shop ist
seit #229 weg) und nicht positioniert, sondern es werden Polyominos auf ein Baufeld gelegt.
**build phase** beschreibt genau das.

„The Architect" als benannte Phase folgt dem Genre-Muster benannter Momente (Boss Blind, Neow's
Blessing) — benannte Phasen bleiben Spielern im Gedächtnis, generische nicht.

## 7. Die Score-Ansagen → **FIERCE · BRUTAL · INSANE · GODLIKE** ✅ bestätigt

Eskalierende Sieg-Ausrufe sind eine eigene Tradition mit klarer Herkunft: die Arena-Shooter-Kette
(Quake/Unreal Tournament) — *Double Kill · Multi Kill · Ultra Kill · **Godlike** · Wicked Sick*.
**„Godlike" ist dort wörtlich die Spitzenstufe.** Unser „Gottgleich" darauf abzubilden ist keine
Übersetzung, sondern das Zitat der Vorlage — genau das, was die Stufe erkennbar macht.

**Freigabe-Korrektur:** Die unterste Stufe heißt **FIERCE**, nicht STRONG. „Strong" ist ein
Allerweltswort und trägt keine Eskalation; FIERCE › BRUTAL › INSANE › GODLIKE steigert hörbar und
bleibt gleich kurz.

Für „Gönn dir" gibt es kein Äquivalent (die Wendung ist deutsches Netz-Idiom). Freigegeben ist
**LET’S GO!** — behält die Ausrufhaftigkeit und die Kürze, statt sie wie „TREAT YOURSELF" gegen
Wörtlichkeit einzutauschen.

## 8. Ein Begriff, den ich nach der Recherche **anders** empfehle

**„Aufstellungsphase" → bisher `layout phase`.**

Die Recherche liefert dafür keinen Rückhalt: TFT nennt das Umstellen **positioning**, Super Auto Pets
**rearrange your team** — beides räumlich, weil dort ein Brett existiert. Bei uns wird kein Raum
umgestellt, sondern die **Ziehreihenfolge** der 40 Karten (`draw order`, §3.2). „Layout" suggeriert
ein Layout im Raum, das es nicht gibt.

→ **Freigegeben: `order phase`**, passend zu `draw order`, und `Formations-Energie` → **`order energy`**.

## 9. Stand der Freigabe

Alles oben ist **prüfbar** (Fachbegriff, Marktkonvention, Kollisionsfreiheit) und seit dem
**15.08.2026 freigegeben**. Die drei Klangfragen sind entschieden: `order phase` (§8),
`LET’S GO!` und `FIERCE` (§7).

Offen bleibt genau eine Klasse: **Kosmetik-/Skin-Namen und Flavour-Texte**. Dafür entsteht beim
Übersetzen eine eigene Unsicherheitsliste, die zur Abstimmung geht — nicht die ganze Tabelle.

---

## Quellen

- [Balatro Wiki — Blinds and Antes](https://balatrogame.fandom.com/wiki/Blinds_and_Antes)
- [Balatro Wiki — Jokers (Raritäten)](https://balatrogame.fandom.com/wiki/Jokers)
- [Slay the Spire Wiki — Keywords](https://slay-the-spire.fandom.com/wiki/Keywords)
- [Slay the Spire Wiki — Cards (Raritäten)](https://slaythespire.wiki.gg/wiki/Cards)
- [Hearthstone Wiki — Rarity](https://hearthstone.fandom.com/wiki/Rarity)
- [Super Auto Pets Wiki — The Basics](https://superautopets.wiki.gg/wiki/The_Basics)
- [Wikipedia — Trick-taking game](https://en.wikipedia.org/wiki/Trick-taking_game)
- [Wikipedia — Whist](https://en.wikipedia.org/wiki/Whist)
- [Wikipedia — Deck-building game](https://en.wikipedia.org/wiki/Deck-building_game)
- [TV Tropes — Color-Coded Item Tiers](https://tvtropes.org/pmwiki/pmwiki.php/Main/ColorCodedItemTiers)
