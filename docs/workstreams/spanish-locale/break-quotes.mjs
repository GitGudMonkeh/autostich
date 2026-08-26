import { writeFileSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
const R = resolve(dirname(fileURLToPath(import.meta.url)), "../../..") + "/";  // Repository-Wurzel
if (process.argv[2] === "es") {
  // Ein KORREKT deutsches Zitatpaar im spanischen Katalog: oeffnend U+201E, schliessend U+201C.
  writeFileSync(R + "src/i18n/es.js", `export default { "common.close": "Cerrar \u201Eesto\u201C" };\n`);
} else {
  // Quellsprache: schliessendes U+201C ohne oeffnendes U+201E.
  const f = R + "src/i18n/de.js";
  writeFileSync(f, readFileSync(f, "utf8").replace("export default {",
    `export default {\n  "zz.quote": "nur ein \u201C hier",`));
}
