// Confere que o CSS gerado pelo Sass equivale ao CSS de antes da migração (baseline/).
// 1. components.css: mesmas regras, na mesma ordem, com as mesmas declarações (ordem dentro da regra não importa).
// 2. tokens.css: cada custom property, em cada contexto (claro, escuro pelo sistema, escuro forçado, alto contraste,
//    movimento reduzido), resolve para o mesmo valor final depois de seguir todos os var().
// Uso: node scripts/compare.mjs   (sai com 1 se houver diferença)
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");
let failures = 0;

/** Remove comentários e @charset; devolve uma árvore simples de regras. */
function parse(css) {
  const text = css.replace(/^﻿/, "").replace(/\/\*[\s\S]*?\*\//g, "").replace(/@charset[^;]+;/g, "");
  let i = 0;
  function block(context) {
    const rules = [];
    let buf = "";
    while (i < text.length) {
      const ch = text[i];
      if (ch === "{") {
        i++;
        const prelude = norm(buf);
        buf = "";
        if (prelude.startsWith("@") && !/^@(font-face|page)/.test(prelude)) rules.push(...block([...context, prelude]));
        else rules.push({ context: context.join(" | "), selector: prelude, decls: declarations(body()) });
      } else if (ch === "}") { i++; return rules; }
      else { buf += ch; i++; }
    }
    return rules;
  }
  function body() {
    let depth = 1, start = i;
    while (i < text.length && depth) { if (text[i] === "{") depth++; else if (text[i] === "}") depth--; i++; }
    return text.slice(start, i - 1);
  }
  return block([]);
}
function norm(s) {
  return s.replace(/\s+/g, " ").replace(/\s*([>+~,(])\s*/g, "$1").replace(/\s*\)/g, ")").replace(/"/g, "'").replace(/\[([\w-]+)([~|^$*]?=)'([a-zA-Z_][\w-]*)'\]/g, "[$1$2$3]").replace(/\s*\/\s*/g, "/")
    .replace(/(^|[^\d.])\.(\d)/g, "$10.$2").replace(/#([0-9a-f]{3,8})\b/gi, (m) => m.toLowerCase())
    .replace(/rgb\((\d+) (\d+) (\d+)\/([\d.]+)\)/g, "rgba($1,$2,$3,$4)").trim(); // o Sass reescreve rgb(r g b / a) como rgba()
}
function declarations(text) {
  const out = [];
  // separa por ; fora de parênteses e aspas
  let depth = 0, quote = null, cur = "";
  for (const ch of text) {
    if (quote) { cur += ch; if (ch === quote) quote = null; continue; }
    if (ch === '"' || ch === "'") { quote = ch; cur += ch; continue; }
    if (ch === "(") depth++; else if (ch === ")") depth--;
    if (ch === ";" && depth === 0) { out.push(cur); cur = ""; } else cur += ch;
  }
  out.push(cur);
  return out.map((d) => d.trim()).filter(Boolean).map((d) => {
    const k = d.indexOf(":");
    return [d.slice(0, k).trim(), norm(decodeEscapes(d.slice(k + 1)))];
  });
}
/** O Sass troca "\201C" pelo caractere; desfaz as duas formas para comparar. */
function decodeEscapes(v) { return v.replace(/\\([0-9a-f]{1,6})\s?/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))); }

// ---------- 1. componentes ----------
function compareRules(label, before, after) {
  const a = parse(before), b = parse(after);
  const key = (r) => `${r.context} || ${r.selector} { ${[...r.decls].sort((x, y) => (x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : 0)).map((d) => d.join(":")).join("; ")} }`;
  const ka = a.map(key), kb = b.map(key);
  const n = Math.max(ka.length, kb.length);
  let diffs = 0;
  for (let j = 0; j < n && diffs < 15; j++) {
    if (ka[j] !== kb[j]) { diffs++; console.log(`  #${j}\n    antes:  ${(ka[j] ?? "(nada)").slice(0, 300)}\n    depois: ${(kb[j] ?? "(nada)").slice(0, 300)}`); }
  }
  if (diffs) { failures++; console.log(`✗ ${label}: ${diffs}+ diferença(s) (${ka.length} regras antes, ${kb.length} depois)`); }
  else console.log(`✓ ${label}: ${ka.length} regras idênticas`);
}

// ---------- 2. tokens ----------
const CONTEXTS = {
  claro: (r) => r.context === "" && r.selector === ":root",
  "escuro (sistema)": (r) => r.context.includes("prefers-color-scheme:dark"),
  "escuro (forçado)": (r) => r.context === "" && r.selector === ":root[data-theme='dark']",
  "alto contraste (sistema)": (r) => r.context.includes("prefers-contrast:more"),
  "alto contraste (atributo)": (r) => r.context === "" && r.selector.startsWith(":root[data-contrast='more']"),
  "movimento reduzido": (r) => r.context.includes("prefers-reduced-motion"),
};
function tokenTable(css) {
  const rules = parse(css);
  const base = new Map();
  for (const r of rules.filter(CONTEXTS.claro)) for (const [k, v] of r.decls) base.set(k, v);
  const out = {};
  for (const [name, test] of Object.entries(CONTEXTS)) {
    const env = new Map(base);
    for (const r of rules.filter(test)) for (const [k, v] of r.decls) env.set(k, v);
    const resolve = (v, seen = new Set()) => v.replace(/var\((--[\w-]+)(?:,([^()]*))?\)/g, (m, n, fb) => {
      if (seen.has(n)) return m;
      const val = env.get(n);
      return val === undefined ? (fb ?? m) : resolve(val, new Set([...seen, n]));
    });
    out[name] = new Map([...env].filter(([k]) => k.startsWith("--")).map(([k, v]) => [k, resolve(v)]));
  }
  return out;
}
function compareTokens(before, after) {
  const a = tokenTable(before), b = tokenTable(after);
  let diffs = 0;
  for (const ctx of Object.keys(CONTEXTS)) {
    const A = a[ctx], B = b[ctx];
    for (const [k, v] of A) {
      if (!B.has(k)) { diffs++; if (diffs < 20) console.log(`  [${ctx}] ${k} sumiu`); }
      else if (B.get(k) !== v) { diffs++; if (diffs < 20) console.log(`  [${ctx}] ${k}\n    antes:  ${v}\n    depois: ${B.get(k)}`); }
    }
    for (const k of B.keys()) if (!A.has(k)) { diffs++; if (diffs < 20) console.log(`  [${ctx}] ${k} é novo`); }
  }
  const total = Object.values(a).reduce((s, m) => s + m.size, 0);
  if (diffs) { failures++; console.log(`✗ tokens: ${diffs} diferença(s)`); }
  else console.log(`✓ tokens: ${a.claro.size} tokens, ${total} valores resolvidos em ${Object.keys(CONTEXTS).length} contextos, todos iguais`);
}

for (const f of ["dist/tokens.css", "dist/components.css"]) if (!existsSync(join(root, f))) { console.error(`falta ${f}: rode pnpm build`); process.exit(1); }
compareTokens(read("baseline/tokens.css"), read("dist/tokens.css"));
compareRules("components.css", read("baseline/components.css"), read("dist/components.css"));

// ---------- 3. sprite ----------
if (read("baseline/sprite.svg") === read("dist/sprite.svg")) console.log(`✓ sprite: ${(read("dist/sprite.svg").match(/<symbol/g) || []).length} ícones, byte a byte igual`);
else { failures++; console.log("✗ sprite: dist/sprite.svg difere de baseline/sprite.svg"); }
process.exit(failures ? 1 : 0);
