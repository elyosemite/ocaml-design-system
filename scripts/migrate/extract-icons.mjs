// Migração (uso único, 14 nov 2026): tira o sprite de dentro de site/docs.js (decisão L2, agora revista) e grava
// um .svg por ícone em src/icons/, mais src/icons/icons.json com a ordem e a categoria.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const docsJs = readFileSync(join(root, "site", "docs.js"), "utf8");
const m = docsJs.match(/document\.body\.insertAdjacentHTML\('afterbegin', ("(?:[^"\\]|\\.)*")\);/);
if (!m) throw new Error("sprite não encontrado em site/docs.js");
const sprite = JSON.parse(m[1]);
const BRAND = new Set(["github", "x-brand", "discord"]);
const dir = join(root, "src", "icons");
mkdirSync(dir, { recursive: true });
const list = [];
for (const s of sprite.matchAll(/<symbol id="i-([\w-]+)" viewBox="([^"]+)">([\s\S]*?)<\/symbol>/g)) {
  const [, name, viewBox, inner] = s;
  const brand = BRAND.has(name);
  const paint = brand ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  writeFileSync(join(dir, `${name}.svg`), `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" ${paint}>${inner}</svg>\n`);
  list.push({ name, category: brand ? "marca" : "interface" });
}
writeFileSync(join(dir, "icons.json"), JSON.stringify(list, null, 2) + "\n");
writeFileSync(join(root, "baseline", "sprite.svg"), sprite);
console.log(`${list.length} ícones extraídos.`);
