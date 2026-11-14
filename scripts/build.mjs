// Gera dist/: o que o app, o site e as docs consomem.
//   tokens.css       src/tokens/index.scss
//   components.css   src/styles/index.scss (inclui o trecho @docs-site, com os marcadores)
//   docs-site.css    só o trecho das docs (src/styles/docs-site/)
//   sprite.svg       src/icons/*.svg, na ordem de src/icons/icons.json
//   sprite.js        o mesmo sprite para as páginas de documentação (funciona aberto direto do disco)
//   icons.json       nome e categoria de cada ícone
//   fonts.css, fonts/ Inter e JetBrains Mono do @fontsource (latin e latin-ext, woff2), sem requisição a terceiros
//   pages.json       o registro de páginas (id, título, camada, status), para quem confere os links // DS:
// Uso: node scripts/build.mjs
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as sass from "sass";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const fail = (msg) => { console.error(`erro: ${msg}`); process.exit(1); };
rmSync(dist, { recursive: true, force: true });
mkdirSync(join(dist, "fonts"), { recursive: true });

// ---- CSS ----
const HEADER = "/* OCamlDesignSystem · gerado por scripts/build.mjs a partir de src/. Não edite este arquivo. */\n";
for (const [entry, out] of [["src/tokens/index.scss", "tokens.css"], ["src/styles/index.scss", "components.css"], ["src/styles/docs-site.scss", "docs-site.css"]]) {
  const { css } = sass.compile(join(root, entry), { style: "expanded", charset: true });
  // o @charset tem de ser a primeira coisa do arquivo; o aviso de "gerado" vem logo depois
  const text = css.startsWith("@charset") ? css.replace(/^(@charset[^;]+;\n)/, `$1${HEADER}`) : HEADER + css;
  writeFileSync(join(dist, out), text + "\n");
}

// ---- ícones ----
const icons = JSON.parse(readFileSync(join(root, "src/icons/icons.json"), "utf8"));
const symbols = icons.map(({ name }) => {
  const file = join(root, "src/icons", `${name}.svg`);
  if (!existsSync(file)) fail(`icons.json cita ${name}, mas src/icons/${name}.svg não existe`);
  const svg = readFileSync(file, "utf8");
  const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1] ?? fail(`${name}.svg sem viewBox`);
  const inner = svg.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
  return `  <symbol id="i-${name}" viewBox="${viewBox}">${inner}</symbol>`;
});
const sprite = `<svg width="0" height="0" style="position:absolute" aria-hidden="true">\n${symbols.join("\n")}\n</svg>`;
writeFileSync(join(dist, "sprite.svg"), sprite);
writeFileSync(join(dist, "sprite.js"), `/* Gerado por scripts/build.mjs a partir de src/icons/. Não edite. */\nwindow.OCAML_SPRITE = ${JSON.stringify(sprite)};\n`);
writeFileSync(join(dist, "icons.json"), JSON.stringify(icons, null, 2) + "\n");

// ---- fontes ----
const faces = [];
for (const [pkg, weights] of [["inter", [400, 500, 600, 700]], ["jetbrains-mono", [400, 500]]]) {
  const dir = join(root, "node_modules/@fontsource", pkg);
  for (const w of weights) {
    const css = readFileSync(join(dir, `${w}.css`), "utf8");
    for (const block of css.matchAll(/\/\* ([\w-]+) \*\/\s*@font-face\s*\{([^}]*)\}/g)) {
      const [, id, body] = block;
      if (!/-latin(-ext)?-\d+-normal$/.test(id)) continue;
      const file = body.match(/url\(\.\/files\/([^)]+\.woff2)\)/)[1];
      copyFileSync(join(dir, "files", file), join(dist, "fonts", file));
      faces.push(`/* ${id} */\n@font-face {${body.replace(/src:[^;]+;/, `src: url(fonts/${file}) format('woff2');`)}}`);
    }
  }
}
writeFileSync(join(dist, "fonts.css"), `/* Gerado por scripts/build.mjs a partir do @fontsource (latin e latin-ext). */\n${faces.join("\n\n")}\n`);

// ---- registro de páginas ----
const docsJs = readFileSync(join(root, "site/docs.js"), "utf8");
const registry = (0, eval)(docsJs.match(/const OCAML_PAGES = (\[[\s\S]*?\n\]);/)[1]);
const pages = registry.flatMap((g) => g.items.map(([id, title, description, status]) => ({ id, title, description, layer: g.group, status })));
writeFileSync(join(dist, "pages.json"), JSON.stringify(pages, null, 2) + "\n");

console.log(`dist/ pronto: tokens, componentes, docs-site, ${icons.length} ícones, ${faces.length} faces de fonte, ${pages.length} páginas.`);
