/**
 * Rewrites `playName: "..."` literals in lib/seed/playbooks/*.ts using {@link normalizePlayName}.
 * Run after changing normalization rules: `npx tsx scripts/normalize-seed-play-names.ts`
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizePlayName } from "../lib/utils";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dir = join(__dirname, "..", "lib", "seed", "playbooks");
let files = 0;
for (const fn of readdirSync(dir)) {
  if (!fn.endsWith(".ts")) continue;
  const fp = join(dir, fn);
  const s = readFileSync(fp, "utf8");
  const newS = s.replace(/playName:\s*"([^"]*)"/g, (_, inner: string) => `playName: "${normalizePlayName(inner)}"`);
  if (newS !== s) {
    writeFileSync(fp, newS);
    files++;
    console.log("updated", fn);
  }
}
console.log(files ? `Done (${files} files changed).` : "No changes.");
