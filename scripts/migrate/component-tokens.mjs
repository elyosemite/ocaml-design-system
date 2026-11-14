// Migração (uso único, 14 nov 2026): troca as declarações de tokens de componente nos partials pelo
// @include que lê src/tokens/components/. Falha se algum trecho esperado não for encontrado.
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const styles = join(root, "src", "styles");

function patch(file, use, pairs) {
  const path = join(styles, file);
  let s = readFileSync(path, "utf8");
  for (const [from, to] of pairs) {
    if (!s.includes(from)) throw new Error(`${file}: não achei\n${from}`);
    s = s.replace(from, to);
  }
  // @use logo depois do cabeçalho de comentários
  s = s.replace(/^((?:\/\/.*\n)+\n)/, `$1${use}\n\n`);
  writeFileSync(path, s);
}

const btn = (v) => `  @include button.set('${v}');`;
patch("core/_button.scss", "@use '../../tokens/components/button';", [
  [`  --btn-bg: var(--color-bg-neutral);
  --btn-bg-hover: var(--color-bg-neutral-hovered);
  --btn-bg-active: var(--color-bg-neutral-pressed);
  --btn-fg: var(--color-text-subtle);`, btn("default")],
  [`  --btn-bg: var(--color-bg-brand-bold);
  --btn-bg-hover: var(--color-bg-brand-bold-hovered);
  --btn-bg-active: var(--color-bg-brand-bold-pressed);
  --btn-fg: var(--color-text-inverse);`, btn("primary")],
  [`  --btn-bg: transparent;
  --btn-bg-hover: var(--color-bg-neutral-subtle-hovered);
  --btn-bg-active: var(--color-bg-neutral-subtle-pressed);`, btn("subtle")],
  [`  --btn-bg: var(--color-bg-danger-bold);
  --btn-bg-hover: var(--color-bg-danger-bold-hovered);
  --btn-bg-active: var(--color-bg-danger-bold-hovered);
  --btn-fg: var(--color-text-inverse);`, btn("danger")],
  [`  --btn-bg: var(--color-bg-warning-bold);
  --btn-bg-hover: var(--color-bg-warning-bold-hovered);
  --btn-bg-active: var(--color-bg-warning-bold-hovered);
  --btn-fg: var(--color-text-warning-inverse);`, btn("warning")],
  [`  --btn-bg: transparent; --btn-bg-hover: transparent; --btn-bg-active: transparent;
  --btn-fg: var(--color-link);`, btn("link")],
  [`  --btn-bg: var(--color-bg-selected);
  --btn-bg-hover: var(--color-bg-selected-hovered);
  --btn-bg-active: var(--color-bg-selected-hovered);
  --btn-fg: var(--color-text-selected);`, btn("selected")],
  [`  --btn-bg: var(--color-bg-disabled); --btn-bg-hover: var(--color-bg-disabled); --btn-bg-active: var(--color-bg-disabled);
  --btn-fg: var(--color-text-disabled);`, btn("disabled")],
  [`.btn--link:disabled { --btn-bg: transparent; --btn-bg-hover: transparent; }`, `.btn--link:disabled { @include button.set('disabled-transparent'); }`],
]);

const colors = ["teal", "green", "purple", "magenta", "orange"];
patch("core/_avatar.scss", "@use '../../tokens/components/avatar';", [
  [`  --av-bg: var(--color-label-blue-bg); --av-fg: var(--color-label-blue-text);`, `  @include avatar.set('blue');`],
  ...colors.map((c) => [`.avatar--${c} { --av-bg: var(--color-label-${c}-bg); --av-fg: var(--color-label-${c}-text); }`, `.avatar--${c} { @include avatar.set('${c}'); }`]),
]);
patch("product/_mail-archives.scss", "@use '../../tokens/components/avatar';", [
  [`.avatar--archive { --av-bg: var(--color-bg-neutral); --av-fg: var(--color-icon); }`, `.avatar--archive { @include avatar.set('archive'); }`],
]);
patch("product/_labels.scss", "@use '../../tokens/components/label';", [
  [`  --lb-bg: var(--color-bg-neutral); --lb-fg: var(--color-text-subtle);`, `  @include label.set('default');`],
  ...["blue", ...colors].map((c) => [`.label--${c} { --lb-bg: var(--color-label-${c}-bg); --lb-fg: var(--color-label-${c}-text); }`, `.label--${c} { @include label.set('${c}'); }`]),
]);
patch("core/_banner.scss", "@use '../../tokens/components/section-message';", [
  [`  --sm-bg: var(--color-bg-information); --sm-icon: var(--color-icon-brand);`, `  @include section-message.set('information');`],
  ...[["warning", "warning", "warning"], ["error", "danger", "danger"], ["success", "success", "success"], ["discovery", "discovery", "discovery"]].map(([v, bg, ic]) =>
    [`.section-message--${v} { --sm-bg: var(--color-bg-${bg}); --sm-icon: var(--color-icon-${ic}); }`, `.section-message--${v} { @include section-message.set('${v}'); }`]),
]);
patch("core/_toast.scss", "@use '../../tokens/components/toast';", [
  [`  --tt-icon: var(--color-icon-success);`, `  @include toast.set('success');`],
  [`.toast--info { --tt-icon: var(--color-icon-brand); }`, `.toast--info { @include toast.set('info'); }`],
  [`.toast--warning { --tt-icon: var(--color-icon-warning); }`, `.toast--warning { @include toast.set('warning'); }`],
  [`.toast--error { --tt-icon: var(--color-icon-danger); }`, `.toast--error { @include toast.set('error'); }`],
]);
patch("layouts/_app-shell.scss", "@use '../../tokens/components/app-shell';", [
  [`  --app-shell-sidebar: var(--layout-sidebar-width);
  --app-shell-list: var(--layout-list-width);`, `  @include app-shell.set('default');`],
  [`.app-shell { --app-shell-sidebar: var(--layout-sidebar-collapsed); }`, `.app-shell { @include app-shell.set('collapsed'); }`],
]);
patch("layouts/_blocks.scss", "@use '../../tokens/components/app-shell';", [
  [`  --app-shell-gap: var(--space-100);`, `  @include app-shell.set('blocks');`],
]);
patch("layouts/_article.scss", "@use '../../tokens/components/post';", [
  [`  --post-display: clamp(calc(var(--font-size-hero) * 1.4), 5vw, calc(var(--font-size-hero) * 2.1));
  --post-gutter: clamp(var(--space-300), 6vw, var(--space-1000));`, `  @include post.set('default');`],
]);
console.log("tokens de componente ligados aos partials.");
