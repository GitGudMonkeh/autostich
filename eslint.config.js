import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import react from "eslint-plugin-react";

// Schlankes Flat-Config-Setup (#292 §3): fängt v. a. ungenutzte Vars/Imports und tote Zweige automatisch —
// genau der Ballast, der bei den Reworks anfällt. Bewusst minimal: recommended + React-Hooks, keine Style-Regeln
// (kein Prettier-Zwang). Zahlen/Verhalten prüfen weiterhin die Tests, ESLint nur die Code-Hygiene.
export default [
  /* Was ERZEUGT wird, wird nicht gelintet. Die Liste ist bewusst die „Build output"-Gruppe aus
     .gitignore plus die Test- und Sim-Ausgaben — wer dort etwas ergänzt, ergänzt es hier mit.

     Warum das mehr als Kosmetik ist: `.vite/` (der Dependency-Cache des Dev-Servers) fehlte, und darin
     liegen vorgebündelte Fremdpakete. `npm run lint` meldete dadurch lokal 419 Probleme, davon 159
     Fehler — alle aus fremdem Code. Die eigenen gingen darin unter, und weil CI mit frischem `npm ci`
     und ohne je gelaufenen Dev-Server baut, sah man dort ein ganz anderes Bild als auf dem eigenen
     Rechner: genau die Konstellation, in der man aufhört, lokal zu linten. Am 19.08.2026 ist deshalb
     ein Push an vier `no-useless-escape` in einer Testdatei gescheitert, die lokal niemand gesehen
     hatte — die Pipeline fährt `lint --max-warnings=0`, Tests und Build waren grün. */
  {
    ignores: [
      "node_modules/**",
      "dist/**", "build/**", "out/**", ".cache/**", ".vite/**",
      "coverage/**", ".nyc_output/**",
      "sim/out/**", "logs/**",
      ".claude/**", "**/*.scratch.mjs",
      // Prototypen laden Pixi aus einer lokalen Kopie (git-ignoriert, CI sieht sie nie). Ohne
      // diesen Eintrag meldet ein lokales `lint` hunderte Fehler aus dem minifizierten Bundle.
      "prototypes/*/vendor/**",
    ],
  },
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx,mjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      // Browser (UI) + Node (sim/scripts/config) gemeinsam → keine falschen no-undef über die gemischte Codebasis.
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: { "react-hooks": reactHooks, react },
    rules: {
      // JSX-Referenzen als „Nutzung" zählen — sonst meldet no-unused-vars jede nur in JSX verwendete Komponente/Variable
      // fälschlich als ungenutzt (kein automatischer JSX-Runtime-Zähler in js.recommended).
      "react/jsx-uses-vars": "error",
      // Gegenstück dazu: eine in JSX benutzte, aber nirgends importierte Komponente meldet `no-undef` NICHT (die Regel
      // sieht den JSX-Bezeichner nicht). Beim Zusammenziehen der vier Gebäude-Umschalter (#398) war genau das der
      // Fehler — Lint und Tests blieben grün, der Bildschirm wäre erst zur Laufzeit gestorben.
      "react/jsx-no-undef": "error",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // Der Kern-Nutzen: toten/ungenutzten Code melden. `_`-Präfix erlaubt bewusst Ungenutztes; caughtErrors aus.
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none", ignoreRestSiblings: true }],
      "no-empty": ["warn", { allowEmptyCatch: true }],
    },
  },
];
