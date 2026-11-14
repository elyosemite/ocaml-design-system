// Migração (uso único, 14 nov 2026): ajusta site/ para a estrutura nova (sprite e CSS em dist/, Sass em src/,
// comando pnpm check). Falha se um trecho esperado não existir.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const site = join(root, "site");
function patch(file, pairs, { all = false } = {}) {
  const path = join(site, file);
  let s = readFileSync(path, "utf8");
  for (const [from, to] of pairs) {
    const hit = from instanceof RegExp ? from.test(s) : s.includes(from);
    if (!hit) throw new Error(`${file}: não achei ${String(from).slice(0, 80)}`);
    s = from instanceof RegExp ? s.replace(from, to) : all ? s.split(from).join(to) : s.replace(from, to);
  }
  writeFileSync(path, s);
}

// docs.js: o sprite sai de dist/sprite.js; o catálogo lê dist/tokens.css
patch("docs.js", [
  [/document\.body\.insertAdjacentHTML\('afterbegin', "(?:[^"\\]|\\.)*"\);/, "document.body.insertAdjacentHTML('afterbegin', window.EPISTULA_SPRITE || ''); // gerado de src/icons/ (dist/sprite.js)"],
  ["fetch('tokens.css')", "fetch('../dist/tokens.css')"],
  ["Abra o arquivo design-system/tokens.css diretamente.", "Abra o arquivo dist/tokens.css diretamente."],
  ["estes valores são a referência, e o pnpm ds:check confere se os @media do components.css batem com eles.",
   "estes valores são a referência. Os componentes usam as mixins down() e up(), que leem o mesmo primitivo, então o @media e o token não divergem."],
  ["    'cor · superfícies':", "    'cor · fundo da janela': 'A cor atrás dos blocos do app e a paleta que a pessoa escolhe em Configurações → Aparência. Muda com o tema.',\n    'cor · superfícies':"],
]);

// variaveis.html: como usar no projeto
patch("variaveis.html", [
  ["As fontes vêm dos pacotes <code>@fontsource</code> no app, no site e nas docs; só estas páginas de documentação carregam do Google Fonts.",
   "As fontes vêm dos pacotes <code>@fontsource</code>, copiadas para <code>dist/fonts/</code>: nenhuma página carrega nada de terceiros."],
  [`&lt;link rel="stylesheet" href="design-system/tokens.css"&gt;\n&lt;link rel="stylesheet" href="design-system/components.css"&gt;`,
   `&lt;link rel="stylesheet" href="dist/fonts.css"&gt;\n&lt;link rel="stylesheet" href="dist/tokens.css"&gt;\n&lt;link rel="stylesheet" href="dist/components.css"&gt;`],
]);

// governanca.html: a fonte dos tokens agora é o Sass
patch("governanca.html", [
  ["<p class=\"lede\">A fonte de verdade é <code>tokens.css</code>.", "<p class=\"lede\">A fonte de verdade são os arquivos Sass de <code>src/tokens/</code> (primitives, semantic e components), compilados em <code>dist/tokens.css</code>."],
  [/<div><dt>Sem Figma, sem Style Dictionary<\/dt><dd>[\s\S]*?<\/dd><\/div>/,
   "<div><dt>Sass, sem Figma nem Style Dictionary</dt><dd>O projeto não usa biblioteca de design. Os tokens são escritos em Sass, uma pasta por nível e um arquivo por assunto; o tema claro e o escuro de cada token ficam lado a lado e a compilação falha se faltar um deles. A conferência é o <code>pnpm check</code> (nomes, referências, uso da paleta, tokens sem uso) e o <code>pnpm compare</code> (o resultado contra o CSS de antes da migração). O registro está em <code>DECISIONS.md</code>.</dd></div>"],
]);
patch("temas.html", [["Um bloco no fim de <code>tokens.css</code> reaponta os tokens.", "Um bloco gerado de <code>src/tokens/themes/_high-contrast.scss</code> reaponta os tokens."]]);
patch("arquitetura.html", [["<code>design-system/ROADMAP.md</code>", "<code>ROADMAP.md</code>"]]);

// o comando mudou de nome no repositório próprio
for (const f of readdirSync(site).filter((n) => n.endsWith(".html") || n === "docs.js")) {
  const path = join(site, f);
  const s = readFileSync(path, "utf8");
  if (s.includes("pnpm ds:check")) writeFileSync(path, s.split("pnpm ds:check").join("pnpm check"));
}
console.log("site/ ajustado.");
