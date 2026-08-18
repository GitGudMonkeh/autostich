/* Schloss/Pokal — das Ranglisten-Zeichen des Spiels, als Vektor in der jeweiligen Textfarbe.

   Warum kein Emoji: 🏆 bringt seine eigene Farbe mit und steht damit quer zu Bildschirmen, die ihre
   Farben aus dem aktiven Deck ziehen. Am Ranglisten-Knopf des Startbildschirms ist die Emoji-Fassung
   deshalb schon entfallen (#premium/#pokal); dieselbe Begründung gilt für die Bestenliste, die den Pokal
   im Kopf, am Challenger-Reiter und an jeder Wochensieger-Zeile trägt. Ein zweites Mal abzeichnen wollte
   ich ihn nicht — deshalb steht er seit #pokal-eins hier statt in StartScreen.jsx.

   Die Pfade sind Daten, kein JSX: eine Tabelle aus `<path>`-Elementen ließe die i18n-Ratsche anschlagen,
   deren `>…<`-Greifer den nächsten Bezeichner als „fest verdrahteten Anzeigetext" fischt (dieselbe Falle
   wie bei GLYPHS in StartScreen.jsx). */
const RANK_PATHS = {
  // Zu: Bügel über geschlossenem Kasten.
  lock: ["M8 10V7a4 4 0 0 1 8 0v3"],
  /* Frei: der Pokal nach der Vorlage — zwei nach oben geschwungene Flügel, der Bogen darüber, die
     Raute in der Mitte, der Stufensockel. Er ersetzt den klassischen Henkelpokal, weil die Vorlage
     genau diese Form zeigt und weil er damit in derselben Strichsprache steht wie die vier
     Kachel-Zeichen des Startbildschirms (GLYPHS).
     Der BOGEN ist der Teil, den man nicht weglassen darf: ohne ihn stehen zwei geschwungene Linien
     nebeneinander, und die lesen sich bei 15 px als Blattpaar — also ausgerechnet wie das
     Pflanzen-Icon des Spiels. Erst der geschlossene Rand macht daraus einen Kelch. Die Raute ist
     klein gehalten, sonst läuft der Innenraum bei 13 px zu; der Funke über dem Pokal (die Vorlage
     hat einen) ist entfallen, er verschmilzt auf dieser Größe mit dem Bogen. */
  cup: ["M7.2 6.4a6.4 6.4 0 0 1 9.6 0", "M5.6 5.6c-.4 5.6 1.9 8.8 6.4 10.2",
    "M18.4 5.6c.4 5.6-1.9 8.8-6.4 10.2", "M12 8l1.9 2.4-1.9 3.9-1.9-3.9z",
    "M12 15.8V18.4", "M8.8 18.7h6.4", "M7 21.2h10"],
};

/* `free` wählt die Pfade, nicht zwei Codepfade — zwei Zustände, EIN Ausdruck.
   Größe kommt aus `.as-rank-icon` (0.9em) und skaliert damit mit der Schriftgröße der Fundstelle;
   `className` erlaubt einer Fundstelle, das zu übersteuern, ohne eine zweite Klasse zu erfinden. */
export function RankIcon({ free = true, className = "as-rank-icon" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true" focusable="false"
      fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {(free ? RANK_PATHS.cup : RANK_PATHS.lock).map((d) => <path key={d} d={d} />)}
      {!free && <rect x="4.5" y="10" width="15" height="10.5" rx="2" />}
    </svg>
  );
}
