// Tokens para outras plataformas, gerados de dist/tokens.css (a única fonte é src/tokens/).
// Lê o tema claro (:root) e o escuro (:root[data-theme="dark"]), segue cada var() até o valor final e grava em
// dist/platforms/:
//   tokens.json                      DTCG (design tokens W3C): cor com o valor escuro em $extensions, dimensões em px
//   tokens.ts                        objetos light e dark, dimensões em número (px), para React Native, Electron, Node
//   OCamlTokens.swift                SwiftUI: cores dinâmicas (claro/escuro) e dimensões em CGFloat (pt)
//   OCamlTokens.kt                   Jetpack Compose: OCamlLightColors, OCamlDarkColors e dimensões em dp/sp
//   android/values/ocaml_tokens.xml  recursos Android (cores claras, dimensões); values-night/ com as cores escuras
// Uso: chamado por scripts/build.mjs. Sozinho: node scripts/platforms.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const REM = 16;
const HEADER = "Gerado por scripts/platforms.mjs a partir de src/tokens/. Não edite este arquivo.";

/** Declarações de um bloco cujo seletor é exatamente `selector` (fora de @media). */
function block(css, selector) {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const out = new Map();
  let depth = 0, start = -1, head = "", i = 0, buf = "";
  for (; i < clean.length; i++) {
    const ch = clean[i];
    if (ch === "{") { if (depth === 0) { head = buf.split(";").pop().trim(); start = i + 1; } depth++; buf = ""; }
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        if (head === selector) for (const m of clean.slice(start, i).matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) out.set(m[1], m[2].trim());
        buf = "";
      }
    } else if (depth === 0) buf += ch;
  }
  return out;
}

function resolver(...layers) {
  const get = (name, seen = new Set()) => {
    if (seen.has(name)) throw new Error(`ciclo em ${name}`);
    seen.add(name);
    let raw;
    for (const l of layers) if (l.has(name)) { raw = l.get(name); break; }
    if (raw === undefined) return undefined;
    return raw.replace(/var\(\s*(--[\w-]+)\s*(?:,\s*([^()]*))?\)/g, (_, n, fb) => get(n, new Set(seen)) ?? fb ?? "");
  };
  return get;
}

const camel = (s) => s.replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
const pascal = (s) => camel(s).replace(/^./, (c) => c.toUpperCase());
const snake = (s) => s.replace(/-/g, "_");

/** #RGB, #RRGGBB, #RRGGBBAA ou transparent → [r, g, b, a] (0–255) */
function rgba(v) {
  if (v === "transparent") return [0, 0, 0, 0];
  const m = v.match(/^#([0-9a-f]{3,8})$/i);
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  if (h.length === 6) h += "FF";
  if (h.length !== 8) return null;
  return [0, 2, 4, 6].map((k) => parseInt(h.slice(k, k + 2), 16));
}
const hex2 = (n) => n.toString(16).toUpperCase().padStart(2, "0");
const cssHex = ([r, g, b, a]) => `#${hex2(r)}${hex2(g)}${hex2(b)}${a === 255 ? "" : hex2(a)}`;
const argb = ([r, g, b, a]) => `${hex2(a)}${hex2(r)}${hex2(g)}${hex2(b)}`;
/** 2rem → 32, 12px → 12; o resto → null */
function px(v) {
  const m = v.match(/^(-?\d*\.?\d+)(px|rem)$/);
  if (!m) return v === "0" ? 0 : null;
  return Math.round(parseFloat(m[1]) * (m[2] === "rem" ? REM : 1) * 100) / 100;
}
const num = (n) => String(n);

// Quais tokens viram dimensão nativa (o resto, como z-index e tipografia em atalho, fica só no JSON e no TS)
const DIMENSIONS = /^--(space|radius|border-width|font-size|line-height|control-height|row-height|input-height|layout|icon-size|focus-ring-(width|offset))/;

export function exportPlatforms(root) {
  const dist = join(root, "dist");
  const css = readFileSync(join(dist, "tokens.css"), "utf8");
  const light = block(css, ":root");
  const darkOnly = block(css, ":root[data-theme=dark]");
  const getLight = resolver(light);
  const getDark = resolver(darkOnly, light);
  const names = [...light.keys()].filter((n) => !n.startsWith("--palette-"));

  const colors = [], dims = [], weights = [], durations = [], opacities = [], other = [];
  for (const n of names) {
    const lv = getLight(n), dv = getDark(n);
    if (n.startsWith("--color-")) {
      const l = rgba(lv), d = rgba(dv);
      if (l && d) { colors.push({ n, key: n.slice(8), l, d }); continue; }
    }
    if (DIMENSIONS.test(n) && px(lv) !== null) { dims.push({ n, key: n.slice(2), v: px(lv) }); continue; }
    if (n.startsWith("--font-weight-")) { weights.push({ n, key: n.slice(14), v: Number(lv) }); continue; }
    if (/^--duration-/.test(n) && /ms$/.test(lv)) { durations.push({ n, key: n.slice(11), v: parseFloat(lv) }); continue; }
    if (/^--opacity-/.test(n) && !isNaN(Number(lv))) { opacities.push({ n, key: n.slice(10), v: Number(lv) }); continue; }
    other.push({ n, key: n.slice(2), l: lv, d: dv });
  }

  const out = join(dist, "platforms");
  mkdirSync(join(out, "android", "values"), { recursive: true });
  mkdirSync(join(out, "android", "values-night"), { recursive: true });

  // ---- DTCG ----
  const json = { $description: HEADER, color: {}, dimension: {}, fontWeight: {}, duration: {}, number: {}, other: {} };
  for (const c of colors) json.color[c.key] = { $type: "color", $value: cssHex(c.l), $extensions: { "dev.ocaml.modes": { dark: cssHex(c.d) } } };
  for (const d of dims) json.dimension[d.key] = { $type: "dimension", $value: { value: d.v, unit: "px" } };
  for (const w of weights) json.fontWeight[w.key] = { $type: "fontWeight", $value: w.v };
  for (const t of durations) json.duration[t.key] = { $type: "duration", $value: { value: t.v, unit: "ms" } };
  for (const o of opacities) json.number[`opacity-${o.key}`] = { $type: "number", $value: o.v };
  for (const o of other) json.other[o.key] = o.l === o.d ? { $value: o.l } : { $value: o.l, $extensions: { "dev.ocaml.modes": { dark: o.d } } };
  writeFileSync(join(out, "tokens.json"), JSON.stringify(json, null, 2) + "\n");

  // ---- TypeScript ----
  const tsColors = (pick) => colors.map((c) => `    ${JSON.stringify(camel(c.key))}: ${JSON.stringify(cssHex(pick(c)))},`).join("\n");
  const tsObj = (list, f = (x) => x.v) => list.map((x) => `  ${JSON.stringify(camel(x.key))}: ${JSON.stringify(f(x))},`).join("\n");
  writeFileSync(join(out, "tokens.ts"), `// ${HEADER}
// Cores por tema; dimensões em px (no React Native, use direto como número de pontos).
export const color = {
  light: {
${tsColors((c) => c.l)}
  },
  dark: {
${tsColors((c) => c.d)}
  },
} as const;
export type ColorScheme = keyof typeof color;
export type ColorToken = keyof typeof color.light;

export const dimension = {
${tsObj(dims)}
} as const;

export const fontWeight = {
${tsObj(weights)}
} as const;

export const duration = {
${tsObj(durations)}
} as const;

export const opacity = {
${tsObj(opacities)}
} as const;

/** Valores compostos como estão no CSS (fontes, sombras, z-index), já resolvidos. */
export const css = {
  light: {
${other.map((o) => `    ${JSON.stringify(camel(o.key))}: ${JSON.stringify(o.l)},`).join("\n")}
  },
  dark: {
${other.map((o) => `    ${JSON.stringify(camel(o.key))}: ${JSON.stringify(o.d)},`).join("\n")}
  },
} as const;

export const fontFamily = { body: "Inter", code: "JetBrains Mono" } as const;
`);

  // ---- Swift (SwiftUI) ----
  const f3 = (n) => (n / 255).toFixed(3);
  const swiftRGBA = ([r, g, b, a]) => `(${f3(r)}, ${f3(g)}, ${f3(b)}, ${f3(a)})`;
  writeFileSync(join(out, "OCamlTokens.swift"), `// ${HEADER}
// Uso: Text("Olá").foregroundStyle(OCamlColor.textSubtle).padding(OCamlSpace.space150)
// As cores seguem o tema do sistema (claro/escuro) sozinhas.
import SwiftUI
#if canImport(UIKit)
import UIKit
#elseif canImport(AppKit)
import AppKit
#endif

extension Color {
    /// Cor que troca entre o valor claro e o escuro conforme a aparência do sistema.
    init(ocamlLight l: (Double, Double, Double, Double), dark d: (Double, Double, Double, Double)) {
        #if canImport(UIKit)
        self.init(uiColor: UIColor { trait in
            let c = trait.userInterfaceStyle == .dark ? d : l
            return UIColor(red: c.0, green: c.1, blue: c.2, alpha: c.3)
        })
        #elseif canImport(AppKit)
        self.init(nsColor: NSColor(name: nil) { appearance in
            let dark = appearance.bestMatch(from: [.darkAqua, .aqua]) == .darkAqua
            let c = dark ? d : l
            return NSColor(srgbRed: c.0, green: c.1, blue: c.2, alpha: c.3)
        })
        #else
        self.init(.sRGB, red: l.0, green: l.1, blue: l.2, opacity: l.3)
        #endif
    }
}

public enum OCamlColor {
${colors.map((c) => `    public static let ${camel(c.key)} = Color(ocamlLight: ${swiftRGBA(c.l)}, dark: ${swiftRGBA(c.d)})`).join("\n")}
}

public enum OCamlSpace {
${dims.filter((d) => d.key.startsWith("space-")).map((d) => `    public static let ${camel(d.key)}: CGFloat = ${num(d.v)}`).join("\n")}
}

public enum OCamlRadius {
${dims.filter((d) => d.key.startsWith("radius-")).map((d) => `    public static let ${camel(d.key.slice(7))}: CGFloat = ${num(d.v)}`).join("\n")}
}

public enum OCamlSize {
${dims.filter((d) => !/^(space|radius)-/.test(d.key)).map((d) => `    public static let ${camel(d.key)}: CGFloat = ${num(d.v)}`).join("\n")}
}

public enum OCamlFontWeight {
${weights.map((w) => `    public static let ${camel(w.key)}: Font.Weight = .${({ 400: "regular", 500: "medium", 600: "semibold", 700: "bold" })[w.v] ?? "regular"}`).join("\n")}
}

public enum OCamlDuration {
${durations.map((t) => `    public static let ${camel(t.key)}: Double = ${num(t.v / 1000)}`).join("\n")}
}
`);

  // ---- Kotlin (Jetpack Compose) ----
  const ktColors = (name, pick) => `object ${name} {\n${colors.map((c) => `    val ${pascal(c.key)} = Color(0x${argb(pick(c))})`).join("\n")}\n}`;
  const unit = (d) => (/^(font-size|line-height)/.test(d.key) ? "sp" : "dp");
  writeFileSync(join(out, "OCamlTokens.kt"), `// ${HEADER}
// Uso: val c = if (isSystemInDarkTheme()) OCamlDarkColors else OCamlLightColors
//      Text("Olá", color = c.TextSubtle, modifier = Modifier.padding(OCamlDimens.Space150))
package dev.ocaml.designsystem

import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

${ktColors("OCamlLightColors", (c) => c.l)}

${ktColors("OCamlDarkColors", (c) => c.d)}

object OCamlDimens {
${dims.map((d) => `    val ${pascal(d.key)} = ${num(d.v)}.${unit(d)}`).join("\n")}
}

object OCamlFontWeight {
${weights.map((w) => `    val ${pascal(w.key)} = FontWeight(${w.v})`).join("\n")}
}

object OCamlDuration {
${durations.map((t) => `    const val ${pascal(t.key)} = ${t.v}`).join("\n")}
}
`);

  // ---- Android (recursos XML) ----
  const xmlColors = (pick) => colors.map((c) => `    <color name="ocaml_color_${snake(c.key)}">#${argb(pick(c))}</color>`).join("\n");
  writeFileSync(join(out, "android", "values", "ocaml_tokens.xml"), `<?xml version="1.0" encoding="utf-8"?>
<!-- ${HEADER} -->
<resources>
${xmlColors((c) => c.l)}
${dims.map((d) => `    <dimen name="ocaml_${snake(d.key)}">${num(d.v)}${unit(d)}</dimen>`).join("\n")}
</resources>
`);
  writeFileSync(join(out, "android", "values-night", "ocaml_tokens.xml"), `<?xml version="1.0" encoding="utf-8"?>
<!-- ${HEADER} -->
<resources>
${xmlColors((c) => c.d)}
</resources>
`);
  return { colors: colors.length, dimensions: dims.length };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const r = exportPlatforms(join(dirname(fileURLToPath(import.meta.url)), ".."));
  console.log(`dist/platforms/: ${r.colors} cores, ${r.dimensions} dimensões.`);
}
