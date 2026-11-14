// Confere o design system (v3 §4.3 e §12): tokens, temas, registro de páginas e métricas de saúde.
// Lê o CSS gerado (dist/, rode pnpm build antes) e as páginas de documentação (site/).
// Uso: node scripts/check.mjs [--metrics [--list]]
// Sai com código 1 se houver erro (variável sem token, tema escuro divergente, página fora do registro).
// A conferência dos comentários // DS: do app fica no repositório do app, contra dist/pages.json.
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ds = join(root, "site");
const read = (f) => readFileSync(join(ds, f), "utf8");
const errors = [];
const warnings = [];

for (const f of ["tokens.css", "components.css"]) if (!existsSync(join(root, "dist", f))) { console.error(`erro: falta dist/${f}. Rode pnpm build.`); process.exit(1); }
const tokensCss = readFileSync(join(root, "dist", "tokens.css"), "utf8");
const componentsCss = readFileSync(join(root, "dist", "components.css"), "utf8");
const docsCss = read("docs.css");
// Os fontes Sass dos componentes: nenhum pode chamar a paleta nem usar cor fixa fora de src/tokens/primitives/.
const walkFiles = (d, ext) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walkFiles(p, ext) : p.endsWith(ext) ? [p] : []; });
const stylesScss = walkFiles(join(root, "src", "styles"), ".scss").map((p) => readFileSync(p, "utf8")).join("\n");
const componentTokensScss = walkFiles(join(root, "src", "tokens", "components"), ".scss").map((p) => [p, readFileSync(p, "utf8")]);
for (const [p, text] of componentTokensScss) {
  const clean = text.replace(/\/\/.*$/gm, "");
  if (/palette\(|#[0-9a-f]{3,8}\b/i.test(clean)) errors.push(`${p.replace(root, "").replace(/\\/g, "/").slice(1)}: token de componente usa a paleta ou cor fixa (use var(--semântico))`);
  if (/\blight\s*:|\bdark\s*:/.test(clean)) errors.push(`${p.replace(root, "").replace(/\\/g, "/").slice(1)}: token de componente com tema (o tema mora só no nível semântico)`);
}
if (/palette\(/.test(stylesScss.replace(/\/\/.*$/gm, ""))) errors.push("src/styles/ chama palette(): componentes usam só tokens semânticos");

/** Remove comentários e devolve o texto do bloco que começa na linha `start` (até a chave que fecha). */
function blocks(css) {
  // sem comentários, sem @charset e com os seletores de atributo sem aspas (o Sass tira as aspas)
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/@charset[^;]+;/g, "").replace(/\[([\w-]+)="([\w-]+)"\]/g, "[$1=$2]");
  const out = [];
  const re = /([^{}]+)\{/g;
  let m;
  while ((m = re.exec(clean))) {
    let depth = 1, i = re.lastIndex;
    while (depth && i < clean.length) { if (clean[i] === "{") depth++; else if (clean[i] === "}") depth--; i++; }
    out.push({ selector: m[1].trim(), body: clean.slice(re.lastIndex, i - 1) });
    re.lastIndex = i;
  }
  return out;
}
function decls(body) {
  const map = new Map();
  for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) map.set(m[1], m[2].trim());
  return map;
}

// ---- 1. tokens por tema ----
const top = blocks(tokensCss);
const light = new Map();
let darkMedia = new Map();
const darkForced = new Map();
for (const b of top) {
  if (b.selector === ":root") for (const [k, v] of decls(b.body)) light.set(k, v);
  else if (b.selector.startsWith("@media (prefers-color-scheme: dark)")) {
    for (const inner of blocks(b.body)) for (const [k, v] of decls(inner.body)) darkMedia.set(k, v);
  } else if (b.selector === ":root[data-theme=dark]") for (const [k, v] of decls(b.body)) darkForced.set(k, v);
}
for (const [k, v] of darkMedia) if (darkForced.get(k) !== v) errors.push(`tema escuro diverge: ${k} (sistema: ${v} · forçado: ${darkForced.get(k) ?? "ausente"})`);
for (const k of darkForced.keys()) if (!darkMedia.has(k)) errors.push(`tema escuro diverge: ${k} só existe no bloco forçado`);
for (const k of darkMedia.keys()) if (!light.has(k)) errors.push(`token escuro sem token claro: ${k}`);

// ---- 2. var() sem definição ----
const files = { "tokens.css": tokensCss, "components.css": componentsCss, "docs.css": docsCss };
// Variáveis que o app define em tempo de execução (inline style ou JS); não existem em nenhum arquivo CSS.
const RUNTIME_VARS = ["--app-background", "--app-shell-list", "--swatch", "--x", "--y", "--lb-fg"];
const localDecl = new Set(RUNTIME_VARS);
for (const css of Object.values(files)) for (const m of css.matchAll(/(--[\w-]+)\s*:/g)) localDecl.add(m[1]);
const used = new Map();
for (const [name, css] of Object.entries(files)) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const m of clean.matchAll(/var\(\s*(--[\w-]+)/g)) {
    used.set(m[1], (used.get(m[1]) ?? 0) + 1);
    if (!localDecl.has(m[1])) errors.push(`${name}: var(${m[1]}) não está definida em nenhum lugar`);
  }
}

// ---- 2b. breakpoints: os @media do components.css têm de bater com os tokens --breakpoint-* ----
const bp = [...light].filter(([k]) => k.startsWith("--breakpoint-")).map(([, v]) => parseInt(v, 10));
const okWidths = new Set(bp.flatMap((n) => [n, n - 1]));
for (const m of componentsCss.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/@media\s*\((?:max|min)-width:\s*(\d+)px\)/g)) {
  if (!okWidths.has(Number(m[1]))) errors.push(`components.css: @media com ${m[1]}px não corresponde a nenhum token --breakpoint-* (${bp.join(", ")}px)`);
}

// ---- 3. páginas e registro ----
const docsJs = read("docs.js");
const registry = (0, eval)(docsJs.match(/const OCAML_PAGES = (\[[\s\S]*?\n\]);/)[1]);
const STATUS = new Set(["draft", "experimental", "beta", "stable", "deprecated", "removed"]);
const ids = [];
for (const g of registry) for (const [id, title, desc, status] of g.items) {
  ids.push(id);
  if (!existsSync(join(ds, `${id}.html`))) errors.push(`registro: ${id}.html não existe`);
  else if (!read(`${id}.html`).includes(`data-page="${id}"`)) errors.push(`${id}.html: falta data-page="${id}"`);
  if (!STATUS.has(status)) errors.push(`registro: ${id} sem status válido (${status})`);
  if (!title || !desc) errors.push(`registro: ${id} sem título ou descrição`);
}
for (const f of readdirSync(ds).filter((n) => n.endsWith(".html") && n !== "index.html" && !n.startsWith("rascunho"))) {
  if (!ids.includes(f.slice(0, -5))) errors.push(`${f} não está em OCAML_PAGES`);
}

// ---- 3a. índice lateral: toda página do registro aparece em OCAML_NAV, e todo alvo do índice existe ----
const navMatch = docsJs.match(/const OCAML_NAV = (\[[\s\S]*?\n\]);/);
if (!navMatch) errors.push("docs.js: OCAML_NAV não encontrado");
else {
  const nav = (0, eval)(navMatch[1]);
  const targets = nav.flatMap((c) => c.items || c.groups.flatMap((g) => g.items)).map(([, t]) => t).filter(Boolean);
  const navIds = new Set(targets.map((t) => t.split("#")[0]));
  for (const id of ids) if (!navIds.has(id)) errors.push(`índice: ${id} está em OCAML_PAGES mas não aparece em OCAML_NAV`);
  for (const t of targets) {
    const [id, anchor] = t.split("#");
    if (id !== "index" && !ids.includes(id)) { errors.push(`índice: ${t} aponta para uma página fora do registro`); continue; }
    if (anchor && !read(`${id}.html`).includes(`id="${anchor}"`)) errors.push(`índice: ${t} aponta para uma âncora que não existe`);
  }
}


// ---- 4. métricas (v3 §12) ----
const clean = componentsCss.replace(/\/\*(?![^*]*físico)[\s\S]*?\*\//g, "");
const declRe = /(^|[;{])\s*([a-z-]+)\s*:\s*([^;{}]+)(?=[;}])/g;
const VISUAL = /^(color|background(-color)?|border(-color)?|border(-top|-right|-bottom|-left|-inline-start|-inline-end)?(-color)?|outline(-color)?|box-shadow|fill|stroke|font(-family|-size|-weight)?|padding(-\w+)*|margin(-\w+)*|gap|row-gap|column-gap|border-radius|z-index|transition(-duration)?|animation-duration)$/;
let visual = 0, tokenized = 0, hardcoded = [];
for (const m of clean.matchAll(declRe)) {
  const prop = m[2], value = m[3].trim();
  if (prop.startsWith("--") || !VISUAL.test(prop)) continue;
  if (/^(0|none|inherit|initial|auto|transparent|currentColor|unset|normal|revert)$/i.test(value)) continue;
  visual++;
  if (/var\(/.test(value)) tokenized++;
  else if (/#[0-9a-f]{3,8}\b|rgba?\(|\b\d*\.?\d+(px|rem|em|ms|s)\b/i.test(value)) hardcoded.push(`${prop}: ${value}`);
}
// Lido dos fontes Sass: lá o comentário /* físico: … */ continua na mesma linha da propriedade (no CSS gerado, não).
const scssNoComments = stylesScss.split("\n").filter((l) => !l.includes("físico")).join("\n").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
const physical = (scssNoComments.match(/(margin|padding)-(left|right)\s*:|(^|[;{\s])(left|right)\s*:|text-align\s*:\s*(left|right)|border-(left|right)(-\w+)?\s*:|border-(top|bottom)-(left|right)-radius\s*:/g) ?? []).length;
const allTokenNames = [...light.keys()];
const primitives = allTokenNames.filter((n) => n.startsWith("--palette-"));
const semantic = allTokenNames.filter((n) => !n.startsWith("--palette-"));
const corpus = [componentsCss, docsCss, docsJs, ...readdirSync(ds).filter((n) => n.endsWith(".html")).map(read)].join("\n");
// Uso pelos consumidores: um token pode ser usado só no app, no site ou nas docs. Por padrão procura o
// repositório do app ao lado deste (../epistulamail); --app=<pasta> aponta outro lugar.
const appArg = process.argv.find((a) => a.startsWith("--app="));
const appDir = appArg ? appArg.slice(6) : join(root, "..", "epistulamail");
let src = "";
if (existsSync(appDir)) {
  for (const dir of ["src", "site", "docs-site/src"]) {
    const walk = (d) => { for (const e of readdirSync(d, { withFileTypes: true })) { if (e.name === "node_modules" || e.name === "dist" || e.name === "generated") continue; const p = join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.(tsx?|css|html|astro|mdx?|mjs)$/.test(e.name) && !/^ds-/.test(e.name)) src += readFileSync(p, "utf8") + "\n"; } };
    if (existsSync(join(appDir, dir))) walk(join(appDir, dir));
  }
} else warnings.push(`repositório do app não encontrado (${appDir}): tokens usados só pelo app vão aparecer como sem uso`);
// Tokens de cor iguais nos dois temas de propósito: declarados com (value: …) em src/tokens/semantic/color/.
const sameInBothThemes = new Set(walkFiles(join(root, "src", "tokens", "semantic", "color"), ".scss")
  .flatMap((p) => [...readFileSync(p, "utf8").matchAll(/'(color-[\w-]+)': \(value:/g)].map((m) => `--${m[1]}`)));
const tokensBody = tokensCss.replace(/\/\*[\s\S]*?\*\//g, "");
const refs = (n, text) => text.includes(`var(${n})`) || text.includes(`var(${n},`);
// Primitivo: tem de ser usado por algum semântico. Semântico: por componentes, páginas, app, site ou docs (ou por outro token).
const orphanPrimitives = primitives.filter((n) => !refs(n, tokensBody) && !primitives.some((o) => o.startsWith(n + "-a"))); // a base de uma opacidade (-aNN) conta como usada
const orphans = semantic.filter((n) => !refs(n, corpus) && !refs(n, src) && !refs(n, tokensBody) && !/^--(gradient|color-canvas-|breakpoint-)/.test(n));
// Regra de ouro dos três níveis: nada fora de tokens.css usa a paleta direto.
for (const [name, text] of [["components.css", componentsCss], ["docs.css", docsCss], ["docs.js", docsJs], ["app", src]]) {
  const bad = [...new Set([...text.matchAll(/var\(\s*(--palette-[\w-]+)/g)].map((m) => m[1]))];
  if (bad.length) errors.push(`${name} usa primitivo(s) direto (use o token semântico): ${bad.slice(0, 5).join(", ")}`);
}
const darkMissing = semantic.filter((n) => n.startsWith("--color-") && !darkMedia.has(n) && !sameInBothThemes.has(n));

const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 100);
const report = {
  tokens: allTokenNames.length,
  primitivos: primitives.length,
  semanticos: semantic.length,
  tokensComTemaEscuro: [...darkMedia.keys()].length,
  paginas: ids.length,
  paginasPorStatus: Object.fromEntries([...STATUS].map((s) => [s, registry.flatMap((g) => g.items).filter((i) => i[3] === s).length])),
  coberturaDeTokens: `${pct(tokenized, visual)}% (${tokenized} de ${visual} declarações visuais em components.css)`,
  valoresFixosEmComponents: hardcoded.length,
  propriedadesFisicas: physical,
  tokensSemUso: orphans.length,
  primitivosSemUso: orphanPrimitives.length,
};
if (hardcoded.length) warnings.push(`${hardcoded.length} valor(es) fixo(s) em components.css (não passam por token)`);
if (physical) warnings.push(`${physical} propriedade(s) física(s) (left/right) em components.css; prefira as lógicas (inline-start/end)`);
if (orphanPrimitives.length) warnings.push(`${orphanPrimitives.length} primitivo(s) sem nenhum semântico apontando: ${orphanPrimitives.slice(0, 8).join(", ")}`);
if (orphans.length) warnings.push(`${orphans.length} token(s) sem uso: ${orphans.slice(0, 12).join(", ")}${orphans.length > 12 ? "…" : ""}`);
if (darkMissing.length) warnings.push(`${darkMissing.length} token(s) de cor sem valor próprio no escuro (herdam o claro): ${darkMissing.slice(0, 8).join(", ")}${darkMissing.length > 8 ? "…" : ""}`);

if (process.argv.includes("--metrics")) {
  console.log(JSON.stringify(report, null, 2));
  if (process.argv.includes("--list")) { console.log("\nvalores fixos:\n" + hardcoded.join("\n")); console.log("\nsem uso:\n" + orphans.join("\n")); console.log("\nsem escuro:\n" + darkMissing.join("\n")); }
}
for (const w of warnings) console.warn("aviso:", w);
for (const e of errors) console.error("erro:", e);
console.log(errors.length ? `\n${errors.length} erro(s).` : `\nDesign system ok: ${report.tokens} tokens, ${report.paginas} páginas, cobertura de tokens ${report.coberturaDeTokens.split(" ")[0]}.`);
process.exit(errors.length ? 1 : 0);
