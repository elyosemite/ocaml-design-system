# OCaml Design System

[![CI](https://github.com/elyosemite/ocaml-design-system/actions/workflows/ci.yml/badge.svg)](https://github.com/elyosemite/ocaml-design-system/actions/workflows/ci.yml)

Um design system para qualquer produto: tokens, componentes CSS, ícones e a documentação de cada peça. Feito para telas densas, que se leem rápido e se usam com um gesto. Meta de **WCAG 2.2 AA**, com temas claro, escuro e alto contraste.

CSS puro no resultado: quem consome não precisa de Sass nem de framework. Nenhuma página carrega nada de terceiros (fontes, ícones e scripts são locais).

## Começar

```sh
pnpm install
pnpm dev        # gera dist/ e abre a documentação em http://localhost:4400/
```

| Comando | O que faz |
|---|---|
| `pnpm build` | Gera `dist/` a partir de `src/`. |
| `pnpm compare` | Confere que o CSS gerado equivale ao de antes da migração (`baseline/`): regras, valores dos tokens em cada tema e o sprite. |
| `pnpm check` | Tokens, temas, registro de páginas, uso da paleta e métricas (`--metrics`, `--metrics --list`). |
| `pnpm verify` | `build` + `compare` + `check`. Rode antes de cada commit. |
| `pnpm serve` | Só o servidor da documentação, sem gerar de novo. |

## Usar

```html
<link rel="stylesheet" href="dist/fonts.css">
<link rel="stylesheet" href="dist/tokens.css">
<link rel="stylesheet" href="dist/components.css">
```

```css
/* sempre o token semântico */
.minha-linha { color: var(--color-text-subtlest); font: var(--font-body); padding: var(--space-150) var(--space-200); }
```

Ícones: `dist/sprite.svg` (símbolos `#i-<nome>`), usados como `<svg class="i"><use href="#i-inbox"/></svg>`.

## O que há em `dist/`

| Arquivo | Conteúdo |
|---|---|
| `tokens.css` | Todas as custom properties: paleta, semânticos, tema escuro (sistema e forçado), alto contraste, movimento reduzido. |
| `components.css` | Todas as classes de componente. Inclui o trecho das docs entre `@docs-site:start` e `@docs-site:end`. |
| `docs-site.css` | Só o trecho das docs (gradiente, brilho, ícones de marca, idioma, timeline). |
| `sprite.svg`, `sprite.js`, `icons.json` | O sprite de ícones, a versão para as páginas e a lista com a categoria. |
| `fonts.css`, `fonts/` | Inter e JetBrains Mono (latin e latin-ext, woff2), do `@fontsource`. |
| `pages.json` | O registro de páginas (id, título, camada, status), para conferir links vindos de outros projetos. |

## Estrutura

```
src/
  tokens/
    primitives/   nível 1: valores brutos (color/ por família, space, font, shape, size, layer, motion, opacity, breakpoint)
    semantic/     nível 2: o significado (color/ por assunto, typography, space, shape, layout, density…)
    components/   nível 3: variantes de um componente (button, avatar, label, toast…)
    themes/       alto contraste e movimento reduzido
    index.scss    → dist/tokens.css
  styles/
    base/ core/ patterns/ product/ layouts/ docs-site/   um partial por peça, na camada da página
    index.scss    → dist/components.css (a ordem dos @use é a ordem da cascata)
  icons/          um .svg por ícone + icons.json
site/             as páginas da documentação (HTML), docs.css, docs.js, fichas.js
baseline/         o CSS e o sprite de antes da migração, referência do pnpm compare
docs/             fundamentos (v3) e o plano de migração
scripts/          build, compare, check, serve e os scripts de uso único da migração (migrate/)
```

### Claro e escuro

O tema existe **só no nível semântico**. Cada token de cor traz os dois valores lado a lado, e a compilação falha se faltar um:

```scss
// src/tokens/semantic/color/_text.scss
'color-text': (light: p.palette('blue-810'), dark: p.palette('slate-85')),
```

A mixin `themes()` gera, da mesma fonte, o tema claro, o escuro que segue o sistema e o escuro forçado por `data-theme="dark"`. Os tokens de componente apontam para semânticos com `var()`, então acompanham o tema sem declarar nada.

## Contribuir

Leia [`CONTRIBUTING.md`](CONTRIBUTING.md) (fluxo, onde fica cada coisa, gates e definição de pronto). As decisões duradouras estão em [`DECISIONS.md`](DECISIONS.md) e a ordem de trabalho em [`ROADMAP.md`](ROADMAP.md). O plano completo da migração e das próximas fases está em [`docs/plano-migracao.md`](docs/plano-migracao.md).

Licença: ainda não definida (plano, Fase 0).
