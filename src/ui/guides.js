/* ============================================================
   ARCHETYP-LEITFÄDEN — die Datenquelle für das Leitfaden-Overlay (GuideOverlay.jsx).
   Ein kurzer „Wie spiele ich das"-Guide je Archetyp (Prinzip/Strategie), bewusst KONZEPTIONELL
   (keine Balancing-Zahlen — die wandern auf balancing ständig; das erklärt der Begriffs-Glossar).
   Trennung: Glossar = Begriffe/Sonderregeln · Leitfaden = Spielprinzip.

   Struktur je Eintrag (Schlüssel = Archetyp-Key aus ARCHETYPE_META):
     subtitle       — ein Satz unter dem Titel
     kernidee       — Lead-Absatz (Fantasy)
     pillarsLabel   — Überschrift der Säulen-/Ressourcen-Sektion
     pillars[]      — { glyph, color, name, sub?, text }
     loop           — { nodes:[oben,rechts,unten,links], center:[zeile1,zeile2], steps:[…], valve }
     status         — { label, bars:[ { name, glyph, fill, color, payoff? , ticks?:[%], breakMarker?, overflow?, scale?:[…] } ] }
     principle[]    — { tag, text }   (text beginnt mit **fettem Titel**)
   Fett-Markup in Texten: **so**. Kein ${}-Interpol — reine Strings (Backticks nur der Quotes wegen).
   ============================================================ */

export const GUIDES = {
  // ---------------------------------------------------------------- BLITZ
  lightning: {
    subtitle: `Der einzige Archetyp, der seinen kritischen Treffer selbst erzeugt — eine Maschine, die sich mit jedem Sieg weiter auflädt, bis ein sich selbst speisender Sturm über das Feld rollt.`,
    kernidee: `Andere Builds warten auf den Zufall. Blitz **baut** den Crit — und dreht ihn zu einem Kreislauf, der sich selbst antreibt.`,
    pillarsLabel: `Die drei Ressourcen`,
    pillars: [
      { glyph: "✦", color: "#e879f9", name: "Crit", text: `Dein Payoff — ein Crit vervielfacht den Sieg-Score. Blitz erzeugt sowohl die Crit-Chance als auch den Crit-Multiplikator **selbst**; beides wächst mit jedem gehaltenen Blitz-Skill.` },
      { glyph: "⚡", faction: "lightning", color: "#5ec8f0", name: "Ladung", text: `Dein Treibstoff. Siege und Crits laden sie auf. Hältst du einen **Konsumenten** (Ionisierung), feuert er bei voller Ladung und verbraucht sie — ohne Konsumenten bleibt die Leiste einfach voll stehen.` },
      { glyph: "◈", color: "#8a7de0", name: "Ionisierung", sub: "· Stapel", text: `Dauerhafte Marken auf deinen Karten. Der Konsument (Ionisierung) verteilt sie auf noch ungespielte Karten. Jeder Stapel gibt bei einem Sieg mit der Karte extra Score — und **jeder Stapel im Deck hebt feldweit deine Crit-Chance**.` },
    ],
    loop: {
      nodes: ["Crit", "Ladung", "Ionisierung", "Feld ↑"],
      center: ["STURM", "nährt sich selbst"],
      steps: [
        `Ein **Crit** (oder Sieg) erzeugt Ladung.`,
        `Volle Ladung feuert deinen **Konsumenten** → er ionisiert Karten, dann fällt die Ladung zurück.`,
        `Hältst du die Momentum-Skills (Gewitterfront, Entladung, Dauerstrom), gibt jeder Verbrauch **dauerhaft** mehr Crit-Chance und -Multiplikator — den ganzen Lauf.`,
        `Das ionisierte Feld hebt deine Crit-Chance → du crittest öfter → mehr Ladung → mehr Ionisierung → …`,
      ],
      valve: `Fällt mehr Crit-Chance an, als ein Sieg überhaupt braucht, geht der Überschuss **nicht verloren**: Überschlag wandelt ihn in **Ladung** um — je ein paar Prozentpunkte über 100 % eine Ladung, bei voller Sturmintensität doppelt so ergiebig. Der Sturm lädt sich also aus seinem eigenen Übermaß nach.`,
    },
    status: {
      label: `Wie weit ist dein Sturm?`,
      bars: [
        { name: "Sturmgröße", glyph: "🌐", fill: 72, color: "#8a7de0", payoff: `fast alle Karten ionisiert → **alle Karten stärker**` },
        { name: "Sturmintensität", glyph: "⚡", faction: "lightning", fill: 38, color: "#5ec8f0", payoff: `fast alle Karten voll → **Überschlag holt doppelt so viel Ladung**` },
      ],
    },
    principle: [
      { tag: "Mono", text: `**Mono lohnt sich.** Fast jeder Wert von Blitz — Crit-Chance, Crit-Multiplikator, wie schnell du das Feld ionisierst — wächst mit der Zahl deiner Blitz-Skills. Je reiner der Build, desto heftiger der Sturm.` },
      { tag: "Motor", text: `**Genau ein Konsument.** Ionisierung ist dein Motor; ein zweiter Ladungs-Konsument ersetzt ihn nur. Baue alles um diesen einen herum.` },
      { tag: "Tempo", text: `**Früh geduldig, spät explosiv.** Anfangs ist Blitz zurückhaltend — die Maschine läuft erst warm. Der Lohn kommt spät, wenn Momentum und ionisiertes Feld sich gegenseitig hochschaukeln.` },
      { tag: "Serie", text: `**Serie ist Treibstoff.** Manche Blitz-Skills verwandeln deine Siegesserie direkt in Ladung oder Crit-Chance — Siege am Stück halten den Sturm am Laufen.` },
    ],
  },

  // ---------------------------------------------------------------- FEUER
  fire: {
    subtitle: `Hitze belohnt totale Überlegenheit — je klarer du einen Stich dominierst, desto heißer die Leiste und desto mehr Score fällt sofort ab.`,
    kernidee: `Feuer belohnt nicht bloßes Gewinnen, sondern **überlegenes** Gewinnen. Je größer dein **Wertvorsprung**, desto heißer die Leiste — und desto härter schlägt jeder Sieg zu. Der Archetyp der brachialen Dominanz.`,
    pillarsLabel: `Die drei Ressourcen`,
    pillars: [
      { glyph: "⚔", color: "#e85c3c", name: "Wertvorsprung", sub: "· die Marge", text: `Feuers eigentliche Währung. Nicht **ob** du gewinnst zählt, sondern **wie klar**. Ein knapper Sieg zahlt kaum, ein erdrückender zahlt massiv.` },
      { glyph: "🔥", faction: "fire", color: "#f0a63c", name: "Hitze", text: `Die Leiste (leer bis voll). Jeder Sieg heizt sie auf — vor allem mit Vorsprung —, klare Niederlagen kühlen sie ab. Gehaltene Hitze zahlt bei **jedem** Feuer-Sieg eine **Glutdividende** direkt aus; dazu ist sie ein Vorrat zum **Ausschütten**, und mit dem Skill Glühende Klinge macht sie deine Karten stärker.` },
      { glyph: "⚒", color: "#cca366", name: "Asche & Schmiede", text: `Die dauerhafte Investition. Brände senken Gegnerkarten und geben Asche; die Schmiede verwandelt Asche in **bleibenden Kartenwert**.` },
    ],
    loop: {
      nodes: ["Vorsprung", "Hitze ↑", "Karten ↑", "Boni"],
      center: ["FEUERWALZE", "rollt weiter"],
      steps: [
        `Gewinne mit **großem Vorsprung** → viel **Hitze** und sofort direkten Score (er zählt flach, ohne Umwege).`,
        `Gehaltene Hitze zahlt zusätzlich bei jedem Sieg die **Glutdividende** — Feuers Motor, der immer läuft.`,
        `Mit Glühender Klinge schaltet hohe Hitze **Schwellen-Boni** frei → deine Karten bekommen Stichwert → du gewinnst noch klarer. Die oberen Stufen musst du dir je Segment mit einem deutlichen Sieg neu verdienen.`,
        `Parallel: **Brände** schwächen Gegnerkarten und füllen die **Schmiede** → deine Karten werden dauerhaft stärker, die Margen wachsen mit.`,
      ],
      valve: `Ist die Leiste **voll**, verfällt weiterer Hitzegewinn — es sei denn, du hältst den Skill **Weißglut**: dann staut sich der Überschuss als **Überhitzung** auf und hebt deinen gesamten Feuer-Score, solange du sie fütterst. Und wann immer du willst, schüttest du die gesammelte Hitze aus: als einen großen Schlag oder als steten Tropf.`,
    },
    status: {
      label: `Wie heiß bist du?`,
      bars: [
        { name: "Hitze", glyph: "🔥", faction: "fire", fill: 78, color: "#e0714a", ticks: [34, 58, 82], overflow: true, scale: ["kalt", "↑ Schwellen-Boni ↑", "voll → Überlauf"] },
      ],
    },
    principle: [
      { tag: "Marge", text: `**Gewinne groß, nicht knapp.** Feuers Währung ist der Vorsprung. Baue Karten und Aufstellung auf klare Überlegenheit — ein erdrückender Sieg ist ein Vielfaches eines knappen wert.` },
      { tag: "Payoff", text: `**Hitze halten heißt Auszahlung.** Je höher die Leiste, desto größer die Dividende jedes Siegs — und mit Glühender Klinge zusätzlich der Wert deiner Karten. Niederlagen kühlen ab; schütze deine Hitze, um oben zu bleiben.` },
      { tag: "Wahl", text: `**Ausschütten oder halten.** Verwandle die Hitze in Score-Schübe (Feuer-Konsumenten sind **kombinierbar**) — oder halte sie einfach hoch und lebe von den Schwellen-Boni.` },
      { tag: "Schmiede", text: `**Die Schmiede sammelt.** Brand → Asche → dauerhafter Kartenwert. Diese Linie zahlt sich nicht sofort aus, sondern verbreitert deine Margen über den ganzen Lauf.` },
    ],
  },

  // ---------------------------------------------------------------- EIS
  ice: {
    subtitle: `Der räumliche Archetyp — du frierst Karten zu Gletschern fest, sammelst Masse und löst eine Kaskade aus Brüchen aus.`,
    kernidee: `Du **frierst Karten zu Gletschern fest**; sie sammeln unaufhaltsam **Masse** an — und wenn ein Gletscher **bricht**, entlädt sich ein gewaltiger Score, der auf seine Nachbarn übergreift. Wo Pflanze in die Tiefe wächst, wächst Eis in die **Fläche**.`,
    pillarsLabel: `Die drei Säulen`,
    pillars: [
      { glyph: "❆", color: "#5ec8f0", name: "Masse", sub: "· die Ressource", text: `Sie sammelt sich auf dem **Brettfeld** an (nicht auf der Karte), jeden Durchlauf ein Stück — ganz von selbst, ob Sieg oder Niederlage — und mehr, wenn ein Gletscher gewinnt. Masse fällt nie.` },
      { glyph: "✷", color: "#9fe6ff", name: "Der Bruch", sub: "· der Payoff", text: `Ein Gletscher **hält und wächst**, bis seine Masse die **oberste Schwelle** erreicht — dann bricht er mit voller Wucht und **fällt zurück auf null**. Hat das Feld eine **Firn-Reserve**, zieht er daraus sofort wieder hoch; sonst baut er von unten neu auf.` },
      { glyph: "▦", color: "#5a9fd4", name: "Das Cluster", sub: "· der Multiplikator", text: `Gletscher **nebeneinander** verstärken einander: je dichter das Feld, desto heftiger jeder Bruch — und ein Bruch kann eine **Kaskade** durchs ganze Cluster auslösen.` },
    ],
    loop: {
      nodes: ["Masse ↑", "Bruch", "Kaskade", "auf null"],
      center: ["GLETSCHER", "lädt & bricht"],
      steps: [
        `**Friere Karten fest** → sie werden starr, sammeln ab jetzt aber **Masse** (jeden Durchlauf, unaufhaltsam).`,
        `Erreicht ein Gletscher die **oberste Schwelle**, **bricht** er mit voller Wucht → großer Berst-Score; danach **fällt er auf null** und lädt neu auf.`,
        `Stehen Gletscher **dicht beieinander**, verstärkt jeder Bruch die Nachbarn — und kann eine **Kaskade** durchs Cluster rollen lassen.`,
        `Schießt ein Gletscher **über die Schwelle hinaus**, wird der Überschuss sofort als Score ausgezahlt — nichts geht verloren.`,
        `**Firn** sammelt sich auf offenen Feldern (Dauerfrost, Schneetreiben, Eiszeit) und wird zur **Reserve** des Gletschers, der später dort einfriert — sie füllt ihn nach jedem Bruch wieder auf.`,
      ],
      valve: `Ein Gletscher ist **starr** — du gibst seine Umstellbarkeit auf. Dafür ist er **unaufhaltsam**: die Masse steigt nur, und der Bruch hängt an ihr, nicht am Stich — er kommt, ob die Karte den Stich gewinnt oder verliert.`,
    },
    status: {
      label: `Wie voll ist dein Gletscher?`,
      bars: [
        { name: "Masse", glyph: "❆", fill: 82, color: "#5ec8f0", ticks: [29, 59], breakMarker: 88, overflow: true, scale: ["1. Schwelle", "2.", "3.", "Bruch → auf null"] },
      ],
    },
    principle: [
      { tag: "Dichte", text: `**Bau ein dichtes Feld.** Ein einzelner Gletscher ist okay — ein **Cluster** ist der Multiplikator. Friere Karten so, dass sie Nachbarn werden; die Kaskade lebt von der Dichte.` },
      { tag: "Position", text: `**Position statt Flexibilität.** Jeder Gletscher fixiert eine Karte für immer. Plane das Brett voraus — setze Anker, lass Lücken für spätere Nachbarn.` },
      { tag: "Tempo", text: `**Unaufhaltsam, aber geduldig.** Masse steigt von selbst — Eis verliert nie den Fortschritt, braucht aber Zeit, bis die großen Brüche kommen.` },
      { tag: "Bruchstil", text: `**Halten oder splittern.** Wenige mächtige Gletscher liefern seltene, gewaltige Brüche; ein breites Cluster liefert häufige Kaskaden — such dir dein Tempo.` },
    ],
  },

  // ---------------------------------------------------------------- PFLANZE
  plant: {
    subtitle: `Der langsamste, aber unaufhaltsame Archetyp — du ziehst einen Garten hoch, der mit jeder Runde mehr Score trägt.`,
    kernidee: `Siege lassen deine Karten **wachsen**, bis sie dauerhaft grün werden und gemeinsam ein Feld bilden. Kein Sofort-Payoff — ein Garten, der langsam anschwillt und dann alles überwuchert.`,
    pillarsLabel: `Die drei Ressourcen`,
    pillars: [
      { glyph: "🌱", faction: "plant", color: "#85dc9d", name: "Wachstum", text: `Der Motor. Jeder Sieg lässt deine Karte wachsen — **nur aufwärts, nie zurück**. Genug Wachstum macht sie dauerhaft **grün (reif)**; je mehr Pflanzen-Skills, desto schneller.` },
      { glyph: "🌿", faction: "plant", color: "#5ab87a", name: "Grünes Feld", sub: "· Breite", text: `Reife grüne Karten teilen sich einen **Farbblock**. Je größer und grüner dein Feld, desto mehr Score — Blüte, Überwucherung.` },
      { glyph: "🌳", color: "#cca466", name: "Wurzeln", sub: "· Tiefe", text: `Im **reinen** Pflanzen-Build wird Wachstum zu dauerhaftem **Kartenwert**: grüne Karten werden echt stärker; am Deckel zahlt jede weitere Wurzel direkt Score.` },
    ],
    loop: {
      nodes: ["Wachstum", "Grün ↑", "Feld ↑", "Siege ↑"],
      center: ["GARTEN", "wächst weiter"],
      steps: [
        `Siege lassen Karten **wachsen** → ab einer Schwelle werden sie **grün** und bleiben es.`,
        `Grüne Karten **verbreiten Grün** — färben Nachbarn, säen Wachstum, kolonisieren sogar Gegnerkarten.`,
        `Im reinen Build treiben **Wurzeln** den Wert grüner Karten in die Tiefe → sie gewinnen leichter und zahlen Wurzel-Score.`,
        `Je größer das grüne Feld, desto mehr Payoff — und mehr Siege bedeuten wieder mehr Wachstum.`,
      ],
      valve: `Ist eine grüne Karte am **Wert-Deckel**, wächst sie weiter — die legendären Bäume (Weltenbaum, Mutterbaum) zahlen diesen Überlauf als Score aus. Und mit dem Skill Überwucherung schaltet ein fast voll grünes Feld alle Farbblöcke stärker, Blüte zählt doppelt.`,
    },
    status: {
      label: `Wie steht dein Garten?`,
      bars: [
        { name: "Breite", glyph: "🌿", faction: "plant", fill: 64, color: "#5ab87a", payoff: `Feld voll grün → **Überwucherung** (Skill)` },
        { name: "Tiefe", glyph: "🌳", fill: 80, color: "#cca466", payoff: `am Wert-Deckel → **Überlauf-Score** (legendär)` },
      ],
    },
    principle: [
      { tag: "Tempo", text: `**Langsam, aber unaufhaltsam.** Pflanze startet schwach — Wachstum braucht Siege und Zeit. Der Lohn kommt spät, wenn ein reifes grünes Feld steht.` },
      { tag: "Mono", text: `**Mono schaltet die Wurzeln frei.** Nur im reinen Pflanzen-Build wird Wachstum zu echtem Kartenwert — deine grünen Karten werden dann wirklich stärker. Mischst du, bleibt Grün nur eine Farbe fürs Feld.` },
      { tag: "Fokus", text: `**Breite oder Tiefe.** Zwei Wege zum Score: ein weites grünes Feld (Farbblock, Blüte) oder wenige, hoch gewachsene Wurzel-Bäume — such dir deinen Schwerpunkt, oder verbinde beides.` },
      { tag: "Trimmen", text: `**Trimmen ist der Wendepunkt zur Ernte.** Ersetzt du einen Wachstums-Skill, „trimmst" du: dauerhaft mehr Wurzel- und Blüten-Score. Die Wachstums-Skills sterben nicht — sie veredeln die Ernte.` },
    ],
  },
};
