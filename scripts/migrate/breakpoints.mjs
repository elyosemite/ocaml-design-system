// Migração (uso único, 14 nov 2026): troca os @media de largura pelos mixins de src/tokens/semantic/_breakpoint.scss.
// O @media (max-width: 960px) do índice do blog fica como está: difere 1px dos outros e mudar alteraria o resultado.
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const styles = join(root, "src", "styles");
const MAP = {
  "@media (max-width: 959px)": "@include bp.down(compact)",
  "@media (max-width: 1279px)": "@include bp.down(commands)",
  "@media (min-width: 960px)": "@include bp.up(compact)",
};
const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
let n = 0;
for (const file of walk(styles).filter((f) => f.endsWith(".scss") && !f.endsWith("index.scss"))) {
  let s = readFileSync(file, "utf8");
  let changed = false;
  for (const [from, to] of Object.entries(MAP)) if (s.includes(from)) { s = s.split(from).join(to); changed = true; n++; }
  if (!changed) continue;
  const rel = relative(dirname(file), join(root, "src", "tokens", "semantic", "breakpoint")).replace(/\\/g, "/");
  s = s.replace(/^((?:\/\/.*\n)+\n(?:@use .*\n)*)/, (m) => m.replace(/\n$/, "") + `@use '${rel}' as bp;\n\n`);
  writeFileSync(file, s);
}
console.log(`${n} @media trocados.`);
