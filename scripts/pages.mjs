// Monta _site/, a pasta publicada no GitHub Pages: o conteúdo de site/ na raiz e o dist/ gerado em _site/dist/.
// Em desenvolvimento as páginas apontam para "../dist/"; aqui esses caminhos viram "dist/", e o endereço
// publicado fica sem o "/site/" no meio. Rode depois de pnpm build.
// Uso: node scripts/pages.mjs
import { cpSync, existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "_site");
if (!existsSync(join(root, "dist", "tokens.css"))) { console.error("erro: falta dist/. Rode pnpm build antes."); process.exit(1); }

rmSync(out, { recursive: true, force: true });
// .hallmark/ (capturas e registros de trabalho) não vai para o site
cpSync(join(root, "site"), out, { recursive: true, filter: (src) => !src.includes(".hallmark") });
cpSync(join(root, "dist"), join(out, "dist"), { recursive: true });
// Exemplos em _site/examples/: "../dist/" continua certo a partir dali; as imagens do site sobem um nível
cpSync(join(root, "examples"), join(out, "examples"), { recursive: true });

const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
let rewritten = 0;
for (const file of walk(out).filter((p) => [".html", ".js"].includes(extname(p)) && !p.startsWith(join(out, "dist")) && !p.startsWith(join(out, "examples")))) {
  const before = readFileSync(file, "utf8");
  const after = before.replace(/(["'(])\.\.\/dist\//g, "$1dist/");
  if (after !== before) { writeFileSync(file, after); rewritten++; }
}
for (const file of walk(join(out, "examples")).filter((p) => extname(p) === ".html")) {
  writeFileSync(file, readFileSync(file, "utf8").replace(/(\.\.\/)site\//g, "$1"));
}
// Sem Jekyll: o GitHub Pages serve os arquivos como estão
writeFileSync(join(out, ".nojekyll"), "");

const left = walk(out).filter((p) => [".html", ".js"].includes(extname(p)) && !p.startsWith(join(out, "examples"))).filter((p) => readFileSync(p, "utf8").includes("../dist/"));
if (left.length) { console.error(`erro: ainda apontam para ../dist/: ${left.join(", ")}`); process.exit(1); }
console.log(`_site/ pronto: ${walk(out).length} arquivos, ${rewritten} com os caminhos de dist/ ajustados.`);
