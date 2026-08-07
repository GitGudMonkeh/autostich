import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";

// Schlankes Flat-Config-Setup (#292 §3): fängt v. a. ungenutzte Vars/Imports und tote Zweige automatisch —
// genau der Ballast, der bei den Reworks anfällt. Bewusst minimal: recommended + React-Hooks, keine Style-Regeln
// (kein Prettier-Zwang). Zahlen/Verhalten prüfen weiterhin die Tests, ESLint nur die Code-Hygiene.
export default [
  { ignores: ["dist/**", "node_modules/**", "sim/out/**", "coverage/**", ".claude/**"] },
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
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // Der Kern-Nutzen: toten/ungenutzten Code melden. `_`-Präfix erlaubt bewusst Ungenutztes; caughtErrors aus.
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrors: "none" }],
      "no-empty": ["warn", { allowEmptyCatch: true }],
    },
  },
];
