# Sichtgate — Befund

Der Gestaltungsdurchgang für den CJK-Zweig, beurteilt an echtem chinesischem Text in den echten
Flächen. `task-lifecycle.md` §7 verlangt drei Dinge: was gezeigt wurde, unter welchen Bedingungen,
und **was es nicht abgedeckt hat**. Der dritte Teil ist der wichtigste und steht deshalb nicht
zuletzt, weil er der längste wäre, sondern weil er der ehrlichste ist.

## Bedingungen

| Feld | Wert |
| --- | --- |
| Datum | 2026-08-26 |
| Gerät | 411 × 840 px, Pixeldichte 2.63 — dasselbe Gerät, von dem die Screenshots des Owners kamen |
| Browser | Chrome 151.0.7922.173, headless, über `scripts/cdp.mjs` |
| Host | Windows 11 (26200), Node v24.18.0 |
| Build | Dev-Server mit `VITE_PREVIEW=1`, Port 5198 |
| Erzeugt von | `node scripts/zh-gate-shots.mjs` |
| Sprachen | `zh-Hans` und `de`, **paarweise dieselbe Fläche** |

Die Paarung ist der Kern des Verfahrens. Ein einzelnes chinesisches Bild beantwortet nicht, ob der
Zweig zu weit greift; zwei Bilder derselben Fläche, die sich nur im `lang` unterscheiden, tun es.
Was sich auf der deutschen Seite bewegt, ist ein Fehler, egal wie gut die chinesische aussieht.

## Was gezeigt wurde

| # | Fläche | Warum sie im Gate ist |
| --- | --- | --- |
| 1 | Willkommens-Dialog | Drei Eyebrows dicht beieinander — die Fläche, an der S6 hängt |
| 2 | Hub | Die meisten Kurzlabels des Spiels auf einem Schirm |
| 3 | Optionen | Lange Beschreibungstexte unter kurzen Titeln |
| 4 | Kartenwerkstatt | Die Deck-Namen, und die Fläche aus dem Screenshot des Owners |
| 5 | Tutorial | Der längste Fließtext, härteste Probe für 13 px und Zeilenumbruch |
| 6 | Lauf-Start | HUD, Status-Leiste, Aufstellungs-Panel — die dichteste Fläche des Spiels |
| 7 | Kartenübersicht | Die einzige Fläche, auf der alle acht Ein-Zeichen-Kürzel nebeneinander stehen |
| 8 | Nach einem Durchlauf | Was bei Höchsttempo nach 40 Stichen kommt |

## Was gemessen wurde

Zahlen, nicht Eindrücke. Alle am laufenden Build erhoben, jeweils durch Umschalten **nur** des
`lang`-Attributs auf demselben DOM.

**Tripwire 1 — greift der Zweig über die Sprache hinaus?** Nein.

| | `zh-Hans` | `de` |
| --- | --- | --- |
| `tracking-widest` | 0 | 1.3 px |
| `text-meta-1` | 13 px | 11 px |
| `text-micro-4` | 12 px | 9 px |

**Passt es noch?** Auf dem Hub: 59 Textknoten, davon 12 gewachsen, **alle um genau 3 px** — das ist
die größere Zeilenhöhe, kein Umbruch in eine neue Zeile. Überlauf über die Containerbreite: **null**,
in beiden Sprachen.

**Wie viel Schrift kostet es?** 101 Scheiben liegen bereit, für den sichtbaren Text des Hubs lädt
der Browser **12** davon. Ein deutscher Spieler lädt keine.

**S6, die Größenverhältnisse.** Die Eyebrow ist nicht flach geworden, sondern dünn: der Schritt zu
ihrer eigenen Ablesung fiel von **1.45×** auf **1.23×**, weil die Grenze aus A2 sie nach oben
gedrückt hat.

## Die Entscheidung des Owners

**S6 → Variante A: Laufweite `.05em` auf Eyebrows.** Entschieden am 2026-08-26, nach Vorlage beider
Varianten als Bild.

Begründung, wie vorgelegt: Laufweite ist das Mittel, mit dem die lateinische Seite ohnehin rangiert;
`.14em` war die falsche Menge, nicht das falsche Mittel. Verworfen wurde Gewicht 600, weil es bei
13 px die Binnenräume dichter Han-Zeichen zufüllt, und Farbe, weil dieses Repo Farbe für Bedeutung
reserviert.

Gebaut ist es als `:lang(zh-Hans) .uppercase[class*="tracking-"]` — also nur dort, wo etwas als
Eyebrow **entworfen** wurde. Fließtext mit Laufweite bleibt bei null.

## Was dieses Gate NICHT abgedeckt hat

Das ist keine Formalie. Wer später eine dieser Lücken für geprüft hält, hat es hier schwarz auf
weiß, dass sie es nicht ist.

1. **Kein Kaltstart.** S3 fragt, ob `font-display: swap` auf der geschnittenen Schrift einen
   sichtbaren Umbruch erzeugt. Das entscheidet sich zwischen zwei Frames beim allerersten Laden.
   Alle Bilder hier entstanden **nach** `document.fonts.ready`, zeigen also garantiert die fertige
   Schrift. Sie können zu dieser Frage nichts sagen, weder ja noch nein.
2. **Nur ein Gerät, nur ein Browser.** 411 × 840 bei Pixeldichte 2.63 in Chrome. Kein Desktop, kein
   Tablet, kein Safari, kein Firefox. Die Desktop-Fassung ab 1280 px hat eigene Regeln und ist
   ungeprüft.
3. **Nur der Anfang eines Laufs.** Erreicht wurden Lauf-Start, Kartenübersicht und der Stand nach
   einem Durchlauf. **Nicht** erreicht: der Architekt mit seinem Brett, die Gletscherwahl, das
   Kartendetail, die Perk- und Skill-Auswahl, der Endscreen, die Bestenliste, die Statistik. Der
   kurze Weg dorthin wäre der DEV RUN gewesen, und der hat keinen Einstieg mehr: `onDevRun` wird in
   `App.jsx` an `StartScreen` übergeben und dort nie ausgepackt.
4. **Keine echten Augen auf Bewegung.** Übergänge, Animationen und der Moment des Schrifttauschs
   sind auf Standbildern nicht beurteilbar.
5. **Kein Muttersprachler.** Beurteilt wurde Typografie, nicht Sprache. Die Terminologie hat den
   externen Durchgang weiterhin vor sich.

## Was daraus folgt

Der Zweig ist an echtem Text beurteilt und trägt auf den geprüften Flächen. Die Leiter steht auf
ihren Grenzen, die Laufweite ist beigelegt statt abgeschafft, und die deutsche Seite hat sich
nachweislich nicht bewegt.

Offen bleiben Punkt 1 und Punkt 3 der Liste oben. Beide brauchen etwas, das ein Skript nicht
liefert: einen ersten Kaltstart mit Augen davor, und einen Weg in die späten Flächen.
