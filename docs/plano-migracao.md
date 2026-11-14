# Plano de ação · EpistulaDesignSystem

Plano para tirar o design system de `epistulamail/design-system/` e transformá-lo num projeto próprio, **EpistulaDesignSystem**, com tokens em Sass divididos por nível e assunto, documentação escrita em MDX e publicada como site estático, e um pacote versionado que o app, o site e as docs consomem.

> Estado: proposta, 14 nov 2026. Nada aqui foi executado. As decisões marcadas **[decidir]** precisam do OK de quem mantém o DS antes da fase em que aparecem.

---

## 0. Diagnóstico do ponto de partida

Medido no repositório em 14 nov 2026.

| O quê | Hoje |
|---|---|
| Páginas | 54 arquivos HTML escritos à mão; o `<head>`, o tema e a casca se repetem em cada um |
| `tokens.css` | 596 linhas, 466 declarações: 117 primitivos `--palette-*`, ~190 semânticos, 80 linhas do tema escuro **escritas duas vezes** (por `@media` e por `data-theme`) e 20 de alto contraste, também duplicadas |
| `components.css` | 1886 linhas. Parte é organizada por componente ("Botões", "Avatar"), parte por entrega ("Aparência, rolagem, arrastar e sinalizadas (L35–L39, US6)"), misturando peças sem relação |
| Tokens de componente | 7 famílias declaradas soltas no `components.css`: `--btn-*`, `--av-*`, `--lb-*`, `--app-shell-*`, `--sm-*`, `--tt-*`, `--post-*` |
| `docs.js` | 1095 linhas: casca das páginas, registro `EPISTULA_PAGES`, demonstrações interativas e o sprite de ícones numa string só |
| `fichas.js` | 928 linhas de dados em JS; o campo `usadoEm` aponta para arquivos de `src/` do app |
| Consumidores | `index.html` e `vite.config.ts` (app), `site/build.mjs`, `docs-site/scripts/sync-ds.mjs`, `scripts/check-design-system.mjs`. Os três primeiros extraem o sprite do `docs.js` por regex |

### O que ainda não tinha sido apontado

1. **Falta suporte a `forced-colors`.** O DS trata `prefers-contrast: more`, mas o Alto Contraste do Windows ativa `forced-colors: active`, que substitui as cores por cores do sistema. Hoje não há nenhuma regra para isso, e num app que é principalmente para Windows esse é o modo de contraste que as pessoas de fato usam. Bordas feitas só com `background`, selos coloridos e o ponto de "não lida" podem sumir.
2. **O tema escuro é duplicado à mão.** São 80 linhas idênticas em dois blocos, e a paridade só é garantida pelo `ds:check`. Uma mixin Sass gera os dois blocos a partir de uma fonte só.
3. **Os primitivos existem em tempo de execução.** `--palette-*` está no CSS publicado, por isso precisa de uma regra que proíba o uso. Se os primitivos forem variáveis Sass, eles somem do CSS final e a regra passa a ser garantida pelo compilador.
4. **Não há `@layer`.** Quem consome o DS (o Starlight, por exemplo) briga com a especificidade. Com camadas de cascata (`@layer epistula.base, epistula.components`), qualquer CSS sem camada do consumidor vence sem `!important`.
5. **Acoplamentos que quebram ao separar o repositório:**
   - `fichas.js > usadoEm` lista arquivos do app;
   - o `ds:check` confere se os comentários `// DS: x.html` de `src/` apontam para páginas existentes;
   - o trecho `@docs-site:start/end` é recortado por regex;
   - o `CONTRIBUTING.md` cita `EpistulaMailDesignSystem-v3.md`, que está na raiz do app, fora de `design-system/`.
6. **Licença.** O repositório não tem `LICENSE`. Um repositório de DS público precisa de uma; as fotos de `images/people` são CC0 e o `CREDITS.md` já registra isso, o que é bom.
7. **WebView no Linux.** O app também roda no Linux (AppImage e `.deb`), em WebKitGTK. Recursos novos de CSS (`light-dark()`, `@scope`, aninhamento nativo) precisam funcionar nas duas engines; o Sass resolve aninhamento e mixins na compilação, sem depender delas.

---

## 1. O que pegar do Atlassian Design System

A única referência externa é o **Atlassian Design System (ADS)**, base do projeto desde a decisão 0001. Nenhum outro design system entra no plano. O que não vem do ADS é necessidade própria do EpistulaMail e está marcado como tal. Por exemplo: o Alto Contraste do Windows, porque o app roda no Windows, e o Sass, porque foi pedido.

| Parte do ADS | Como está aqui hoje | O que fazer | Fase |
|---|---|---|---|
| **Tokens base × tokens de design.** O ADS separa a paleta bruta (Blue500, Neutral200…) dos tokens com significado (`color.text.subtle`). | Já existe: `--palette-*` e os semânticos. | Vira a divisão em pastas `primitives/` e `semantic/`. O nível `components/` é adaptação nossa (decisão 0004) e continua raro, como no ADS, que não expõe tokens de componente. | 2 |
| **Nome do token por propriedade → papel → ênfase → estado** (`color.background.neutral.subtle.hovered`). | Já segue, em forma de CSS (`--color-bg-neutral-subtle-hovered`). | Escrever a regra de nomes no site e fazer o `check.mjs` validar os nomes novos contra ela. | 2, 7 |
| **Temas aplicados por atributo no `<html>`**, seguindo o sistema por padrão. | Já existe (`data-theme`), mas o escuro está duplicado à mão. | Gerar os blocos de tema com uma mixin, a partir de uma fonte só. | 2 |
| **Ciclo de vida dos tokens:** ativo, descontinuado (com substituto indicado) e apagado. | Não existe. Os tokens sem uso ficam soltos (ROADMAP 6). | Cada token ganha um estado; um token descontinuado aponta o substituto e o `check.mjs` avisa quem ainda usa. | 2, 7 |
| **Lint de tokens:** regras que proíbem cor fixa e exigem token. | Parcial: o `ds:check` proíbe `--palette-*` fora dos tokens. | Proibir hex, px soltos e fonte por nome fora de `primitives/`, no `check.mjs`. | 7 |
| **Elevação:** superfícies `surface`, `sunken`, `raised`, `overlay` e as sombras `raised` e `overlay`. | Já existe. | Só reorganizar em `semantic/color/_surface.scss` e `semantic/_elevation.scss`. | 2 |
| **Escala de espaço** `space.0` a `space.1000`, base 8. | Já existe. | `primitives/_space.scss` (valores brutos) + `semantic/_space.scss` (os nomes públicos). | 2 |
| **Tipografia por atalho** (`font.heading.*`, `font.body.*`). | Já existe (`--font-hero`, `--font-body`…). | `semantic/_typography.scss`. | 2 |
| **Escala de camadas** (card 100, navigation 200, dialog 300, layer 400, blanket 500, modal 510, flag 600, tooltip 800). | Já existe. | `semantic/_layer.scss`. | 2 |
| **Explorador de ícones:** busca por nome e palavra-chave. | Não existe; o sprite é uma string no `docs.js`. | Um `.svg` por ícone, `icons.json` com palavras-chave e uma página de ícones com busca. | 4, 5 |
| **Componentes de layout do ADS** (Box, Stack, Inline). | Não existe; as páginas usam `style=""` (criptografia 73, arquivos 47, regras 43). | Utilitários de layout para as páginas de documentação com a mesma ideia (pilha, linha, caixa) em CSS, para tirar os estilos inline. No ADS o nome disso é "primitives", mas aqui `primitives/` já é a pasta dos tokens brutos. Por isso os utilitários se chamam "layout". | 3 |
| **Página de componente em três partes: Exemplos, Código e Uso.** O Uso traz quando usar, anatomia, boas práticas, diretrizes de conteúdo, acessibilidade e relacionados. | Parcial: exemplos sem código; "Quando usar" curto; ficha no rodapé. | Modelo de página novo (§4, Fase 5), seguindo essa ordem. | 5 |
| **Anatomia:** o componente com as partes numeradas e uma legenda. | Não existe. | Componente `<Anatomy>` no site. | 5, 6 |
| **Faça / Não faça** com rótulo e exemplo lado a lado. | Só em texto, na ficha. | Componente `<DoDont>` com exemplo ao vivo, rótulo e ícone (nunca só a cor). | 5, 6 |
| **Acessibilidade por componente,** com o comportamento de teclado. | Atalhos globais em `acessibilidade.html`; por componente, não. | Seção Acessibilidade em cada página, com tabela de teclado e os atributos ARIA. | 5, 6 |
| **Fundamentos de conteúdo:** voz e tom, escrita inclusiva, linguagem e gramática, e textos de mensagens (erro, vazio, sucesso). | Parcial: `conteudo.html`. | Uma seção Conteúdo com essas quatro páginas, em pt-BR. | 6 |
| **Status dos componentes** com lozenge. | Já existe (`EPISTULA_STATUS`). | Escrever critérios do que cada status exige (adaptação nossa, porque o ADS mostra o status mas não publica os critérios). | 7 |
| **Meta WCAG AA,** claro e escuro. | Já existe (WCAG 2.2 AA). | Contraste conferido no build. | 7 |

O que **não** se pega do ADS: o CSS-em-JS (Compiled) e os pacotes React por componente (o EpistulaDS é CSS puro), a marca Atlassian e o prefixo `--ds-` nos tokens (mudaria todos os nomes; fica como possibilidade para uma 2.0).

### O que é necessidade nossa, não do ADS

- **Alto Contraste do Windows** (`forced-colors: active`): o app é de Windows, e o modo existe no sistema.
- **Sass** para escrever tokens e componentes: pedido explícito, e resolve a duplicação dos temas.
- **Densidade nomeada** (Confortável, Padrão, Compacta): já existe no DS e vira um conjunto de tokens.


---

## 2. Estrutura do novo repositório

```
EpistulaDesignSystem/
├─ package.json                 # pacote @epistula/design-system (nome [decidir])
├─ LICENSE                      # [decidir] MIT para código, CC BY 4.0 para documentação
├─ README.md / README.pt-BR.md
├─ CHANGELOG.md                 # Keep a Changelog, semver
├─ CONTRIBUTING.md · DECISIONS.md · ROADMAP.md
├─ docs/
│  └─ fundamentos-v3.md         # o atual EpistulaMailDesignSystem-v3.md
├─ src/
│  ├─ tokens/
│  │  ├─ primitives/            # nível 1: valores brutos, só variáveis Sass
│  │  ├─ semantic/              # nível 2: o significado, vira custom property
│  │  ├─ components/            # nível 3: ajustes de um componente
│  │  ├─ themes/                # mecanismo de temas e sobreposições
│  │  ├─ _functions.scss        # helpers (rem, alpha, emit)
│  │  └─ index.scss             # entrada → dist/tokens.css
│  ├─ styles/
│  │  ├─ base/                  # reset, ícone, foco, rolagem
│  │  ├─ core/                  # componentes genéricos
│  │  ├─ patterns/              # composições recorrentes
│  │  ├─ product/               # conceitos de e-mail
│  │  ├─ layouts/               # casca do app, telas inteiras
│  │  ├─ docs-site/             # o atual trecho @docs-site
│  │  └─ index.scss             # entrada → dist/components.css
│  └─ icons/                    # um .svg por ícone
├─ site/                        # documentação em Astro + MDX
│  ├─ src/content/pages/*.mdx
│  ├─ src/components/           # Example, Anatomy, TokenTable, KeyboardTable, DoDont…
│  └─ astro.config.mjs
├─ scripts/
│  ├─ build-icons.mjs           # svg → sprite.svg + icons.json
│  ├─ compare-tokens.mjs        # compara valores resolvidos antigos × novos
│  └─ check.mjs                 # o atual ds:check, adaptado
├─ tests/
│  ├─ visual/                   # Playwright: cada exemplo, claro/escuro/contraste
│  └─ a11y/                     # axe-core em cada página
└─ dist/                        # o que se publica (gerado)
   ├─ tokens.css                # todos os tokens
   ├─ tokens/{color,space,typography,…}.css   # opcional, por assunto
   ├─ components.css
   ├─ docs-site.css             # o atual trecho @docs-site, sem regex
   ├─ sprite.svg · icons.json
   └─ scss/                     # os fontes, para quem quiser compilar com @use … with
```

---

## 3. Tokens: três níveis, uma pasta por nível, um arquivo por assunto

### 3.1 Regras

| Nível | Pasta | Forma no Sass | Sai no CSS? | Pode ter claro/escuro? | Quem usa |
|---|---|---|---|---|---|
| **Primitives** | `tokens/primitives/` | variáveis e mapas Sass (`$blue-810`) | **não** **[decidir]** | não: um valor é um valor | só `semantic/` |
| **Semantic** | `tokens/semantic/` | mapas com `light`/`dark` (se forem de tema) ou valor único | sim, `--color-text`, `--space-100` | **sim, e só aqui** | componentes, app, site |
| **Components** | `tokens/components/` | mapas por variante, com valores `var(--semantic)` | sim, `--btn-bg` escopado na classe | não: aponta para semânticos, que já mudam com o tema | só o próprio componente |

**O tema mora apenas no nível semântico.** Os primitivos são fixos, e os de componente apontam para semânticos com `var()`, por isso acompanham o tema sem declarar nada. Essa é a regra que evita os erros de claro/escuro: se um arquivo de `components/` precisar de um valor diferente no escuro, falta um token semântico.

### 3.2 Árvore de arquivos e de onde vem cada token

```
src/tokens/
├─ primitives/
│  ├─ color/
│  │  ├─ _neutral.scss          # branco (8), ardósia (19), preto (3)
│  │  ├─ _blue.scss             # azul (43)
│  │  ├─ _green.scss            # verde (11), verde-água (2)
│  │  ├─ _warm.scss             # amarelo (6), laranja (10), vermelho (9)
│  │  ├─ _magenta.scss          # magenta (6)
│  │  └─ _index.scss            # @forward de todos + mapa $palette para a documentação
│  ├─ _space.scss               # a escala bruta: 0, 2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80
│  ├─ _font.scss                # famílias, pesos, tamanhos brutos, alturas de linha
│  ├─ _radius.scss              # 2, 3, 6, 8, 999
│  ├─ _shadow.scss              # desvios e desfoques (sem cor)
│  ├─ _motion.scss              # durações e curvas brutas
│  ├─ _opacity.scss             # 0.22, 0.45, 0.55, 0.6, 0.8
│  ├─ _size.scss                # tamanhos de ícone, controle e alvo de toque
│  ├─ _breakpoint.scss          # 960, 1280 (também usado nos @media)
│  └─ _index.scss
├─ semantic/
│  ├─ color/
│  │  ├─ _text.scss             # 15 · texto, links, marca, estados
│  │  ├─ _surface.scss          # 16 · os quatro níveis, papel do e-mail, rolagem
│  │  ├─ _background.scss       # 26 · fundos de componente, hover, pressionado, selecionado
│  │  ├─ _border.scss           # 8
│  │  ├─ _icon.scss             # 8
│  │  ├─ _label.scss            # 6 pares · etiquetas de e-mail e avatares
│  │  ├─ _canvas.scss           # paleta do fundo da janela (Aparência)
│  │  ├─ _gradient.scss         # L77 · ocean, aurora, sunset, meadow, potato
│  │  └─ _index.scss
│  ├─ _typography.scss          # famílias por papel, escala e os atalhos `font` (9)
│  ├─ _space.scss               # --space-025 … --space-1000 (14), públicos
│  ├─ _shape.scss               # raios por papel (7)
│  ├─ _elevation.scss           # sombras por tema (2 + escuro)
│  ├─ _layout.scss              # larguras da casca e medida de leitura (9)
│  ├─ _density.scss             # linhas e controles por densidade (5)
│  ├─ _layer.scss               # z-index: card, dialog, modal, flag… (8)
│  ├─ _motion.scss              # durações e curvas por intenção (5)
│  ├─ _focus.scss               # anel: cor, largura, deslocamento (4)
│  ├─ _opacity.scss             # desabilitado, arraste, sobreposição (5)
│  ├─ _icon-size.scss           # pequeno, médio, grande (4)
│  ├─ _breakpoint.scss          # --breakpoint-* para referência (2)
│  └─ _index.scss
├─ components/
│  ├─ _button.scss              # --btn-* por variante (padrão, primário, sutil, perigo, aviso, link, selecionado, desabilitado)
│  ├─ _avatar.scss              # --av-* por cor
│  ├─ _label.scss               # --lb-*
│  ├─ _app-shell.scss           # --app-shell-* (o divisor ajusta em tempo de execução)
│  ├─ _section-message.scss     # --sm-*
│  ├─ _toast.scss               # --tt-*
│  ├─ _post.scss                # --post-* (blog)
│  └─ _index.scss
├─ themes/
│  ├─ _emit.scss                # a mixin que gera claro, escuro (sistema) e escuro (forçado)
│  ├─ _high-contrast.scss       # prefers-contrast: more e data-contrast="more"
│  ├─ _forced-colors.scss       # NOVO · Alto Contraste do Windows
│  └─ _reduced-motion.scss      # durações para 0
└─ index.scss
```

Os números entre parênteses são as contagens de hoje, para conferir que nada se perde.

### 3.3 Como o claro e o escuro ficam juntos

Cada token de tema é declarado **uma vez**, com os dois valores lado a lado. Ter `color-light.scss` e `color-dark.scss` separados foi descartado: é a mesma duplicação de hoje, só que em dois arquivos.

```scss
// src/tokens/semantic/color/_text.scss
@use '../../primitives/color' as p;

$tokens: (
  'color-text':          (light: p.$blue-810,  dark: p.$slate-85),
  'color-text-subtle':   (light: p.$slate-650, dark: p.$slate-225),
  'color-text-subtlest': (light: p.$slate-550, dark: p.$slate-350),
  'color-text-inverse':  (light: p.$white,     dark: p.$slate-925),
  // …
);
```

Um token de cor que é igual nos dois temas por intenção, como `--color-surface-paper` (o fundo claro do corpo do e-mail, claro também no escuro), é declarado com valor único. A intenção fica explícita, e acaba o aviso "herda o claro" que o `ds:check` emite hoje.

```scss
// src/tokens/semantic/_space.scss: sem tema, valor único
@use '../primitives/space' as p;

$tokens: (
  'space-050': p.$space-4,
  'space-100': p.$space-8,
  // …
);
```

```scss
// src/tokens/themes/_emit.scss
@use 'sass:map';
@use 'sass:meta';

@mixin _vars($maps, $mode) {
  @each $map in $maps {
    @each $name, $value in $map {
      @if meta.type-of($value) == 'map' {
        @if not map.has-key($value, $mode) {
          @error 'Token --#{$name} não tem valor para o tema #{$mode}.';
        }
        --#{$name}: #{map.get($value, $mode)};
      } @else if $mode == light {
        --#{$name}: #{$value};          // sem tema: sai uma vez só
      }
    }
  }
}

@mixin themes($maps...) {
  :root { color-scheme: light; @include _vars($maps, light); }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme='light']) { color-scheme: dark; @include _vars($maps, dark); }
  }
  :root[data-theme='dark'] { color-scheme: dark; @include _vars($maps, dark); }
}
```

O que isso garante:

- a paridade entre os temas vira **erro de compilação** (`@error`), não verificação posterior;
- o bloco "escuro pelo sistema" e o "escuro forçado" saem da mesma fonte e não divergem;
- o CSS publicado tem **os mesmos nomes de custom property de hoje**, então o app não muda nada.

`light-dark()` foi avaliado e descartado por enquanto: só aceita cores (as sombras ficariam de fora) e depende da versão do WebKitGTK no Linux.

### 3.4 Tokens de componente

```scss
// src/tokens/components/_button.scss
$button: (
  default: (bg: var(--color-bg-neutral),     bg-hover: var(--color-bg-neutral-hovered),     fg: var(--color-text-subtle)),
  primary: (bg: var(--color-bg-brand-bold),  bg-hover: var(--color-bg-brand-bold-hovered),  fg: var(--color-text-inverse)),
  danger:  (bg: var(--color-bg-danger-bold), bg-hover: var(--color-bg-danger-bold-hovered), fg: var(--color-text-inverse)),
  // …
);
```

```scss
// src/styles/core/_button.scss
@use '../../tokens/components/button' as t;
@each $variant, $props in t.$button {
  .#{$prefix}btn#{if($variant == default, '', '--#{$variant}')} {
    @each $prop, $value in $props { --btn-#{$prop}: #{$value}; }
  }
}
```

Regra de revisão: um arquivo em `tokens/components/` só pode ter `var(--semantic)` ou `transparent`/`currentColor`. Nunca primitivo, nunca hex. O `check.mjs` confere.

### 3.5 Primitivos fora do CSS final **[decidir]**

- **Recomendado:** primitivos só em Sass. O `dist/tokens.css` fica menor e ninguém consegue usar `--palette-*` por engano. Para a página da paleta, o build gera um `dist/primitives.css` só para a documentação.
- **Custo:** no DevTools, `--color-text` mostra `#172b4d` em vez de `var(--palette-blue-810)`. Aceitável.
- **Alternativa:** emitir os primitivos como hoje e manter a regra no `check.mjs`.

### 3.6 Sass: o que usar e o que evitar

- **Usar:** Dart Sass (`sass` no npm), só `@use`/`@forward` (o `@import` foi descontinuado), mapas, `@each`, mixins de tema e de breakpoint e o `@error` para validar.
- **Evitar:**
  - aninhamento com mais de dois níveis;
  - `@extend`, que gera seletores imprevisíveis;
  - funções de cor do Sass para criar cores novas (`darken`, `lighten`): toda cor nova entra pela paleta;
  - lógica que só existe em Sass sem chegar a uma custom property: o tema precisa poder ser trocado em tempo de execução.
- **Breakpoints:** a mixin `@include bp(md) { … }` lê o mesmo mapa de `primitives/_breakpoint.scss` que gera `--breakpoint-*`, e a regra "o `@media` tem de bater com o token" deixa de precisar de verificação.

---

## 4. Fases

Cada fase termina num estado que funciona e pode ser publicado. Uma fase só começa quando a anterior cumpriu o critério de saída.

### Fase 0 · Decisões e linha de base (antes de mover qualquer arquivo)

1. Decidir: nome do pacote, licença, repositório público ou privado, forma de distribuição (§5), primitivos no CSS (§3.5) e prefixo de classes (Fase 3).
2. **Capturar a linha de base visual:** Playwright tira uma captura de cada página atual do DS nos temas claro, escuro e de alto contraste. Essas imagens são a referência das fases 2 e 3.
3. **Capturar a linha de base dos tokens:** um script abre o DS atual no navegador e grava o valor resolvido de cada custom property em cada tema (`tokens-baseline.json`), como foi feito na decisão 0004.
4. Limpar o que já é dívida e não depende da migração:
   - apagar `rascunho-us16.html`;
   - trocar Google Fonts por `@fontsource` nas 46 páginas (regra 6 do `AGENTS.md`);
   - tirar as referências a US do histórico das fichas.

**Sai quando:** as decisões estão registradas no `DECISIONS.md` e as duas linhas de base estão salvas.

### Fase 1 · Extração com histórico

1. Num clone novo do app: `git filter-repo --path design-system/ --path scripts/check-design-system.mjs --path EpistulaMailDesignSystem-v3.md`. Isso preserva os 22 commits do DS.
2. Mover para `legacy/` dentro do repositório novo, sem alterar o conteúdo.
3. Criar `package.json`, `LICENSE`, `README`, `CHANGELOG` (0.1.0) e CI mínimo (o `check.mjs` atual rodando contra `legacy/`).
4. O app continua usando o próprio `design-system/`; nada muda para ele ainda.

**Sai quando:** o repositório novo tem o histórico e o CI passa.

### Fase 2 · Tokens em Sass

1. Criar a árvore de §3.2 e mover cada token para o arquivo do assunto, mantendo os nomes.
2. Escrever `_emit.scss` (§3.3) e trocar os dois blocos escuros por mapas `light`/`dark`.
3. Alto contraste vira `themes/_high-contrast.scss`, gerado por uma mixin (sai uma vez para `@media` e outra para `data-contrast`).
4. **Novo:** `themes/_forced-colors.scss`, que mapeia os semânticos para as cores de sistema dentro de `@media (forced-colors: active)`.
5. Gerar `dist/tokens.css` e rodar `compare-tokens.mjs` contra a linha de base: **todo token, em todo tema, com o mesmo valor resolvido**. A única diferença permitida é a ausência de `--palette-*`, se essa for a decisão.
6. Resolver os itens 6 e 7 do roadmap atual:
   - os 6 tokens sem uso (`--color-border-warning`, `--space-0`, `--z-card`, `--z-dialog`, `--z-modal`, `--easing-exit`);
   - os 25 valores fixos do `components.css`.
7. Densidade como conjunto de tokens (necessidade nossa): agrupar os tokens de densidade num mapa `comfortable/default/compact`, aplicado por `data-density`.

**Sai quando:** a comparação de tokens dá zero diferenças e a regressão visual passa.

### Fase 3 · Componentes em Sass

1. Quebrar o `components.css` em partials por componente, nas pastas da camada (`base/`, `core/`, `patterns/`, `product/`, `layouts/`), com a mesma camada que a página tem em `EPISTULA_PAGES`. As seções organizadas por entrega se desfazem. Por exemplo, "Aparência, rolagem, arrastar e sinalizadas" vira:
   - `base/_scrollbar.scss`;
   - `product/_theme-picker.scss`;
   - `product/_color-swatch.scss`;
   - `patterns/_drag.scss`;
   - `product/_folders.scss`.
2. Tokens de componente em `tokens/components/` (§3.4), gerados por `@each`.
3. Envolver tudo em `@layer epistula.base, epistula.components, epistula.utilities`.
4. Prefixo configurável `$prefix` **[decidir]**:
   - padrão `''` na 1.0, para o app não precisar mudar nada;
   - a mudança para `ep-` fica para uma 2.0, com guia de migração.
5. Regras de `forced-colors` nos componentes que dependem de cor de fundo: botões, selos de segurança, ponto de não lida, foco, seleção na lista e toggles.
6. O trecho `@docs-site` vira `styles/docs-site/` e sai como `dist/docs-site.css`, sem regex.
7. Tirar os `style=""` das páginas (criptografia 73, arquivos 47, regras 43) com utilitários de layout de documentação.

**Sai quando:** `dist/components.css` passa na regressão visual contra a linha de base.

### Fase 4 · Ícones

1. Extrair cada `<symbol>` do `docs.js` para `src/icons/<nome>.svg`.
2. `build-icons.mjs` gera `dist/sprite.svg` e `dist/icons.json` (nome, palavras-chave, categoria) para uma página de busca de ícones.
3. A decisão L2 é revista e substituída (registrar no `DECISIONS.md`): os consumidores leem `dist/sprite.svg`, não o `docs.js`.
4. Separar os ícones de marca (GitHub, X, Discord) dos ícones de interface.

**Sai quando:** o sprite gerado tem os mesmos símbolos, com o mesmo SVG, que o atual.

### Fase 5 · Site de documentação (Astro + MDX)

1. **Astro sem Starlight.** O Starlight colide com o `components.css`; aqui o site é o próprio DS e usa as classes direto.
2. **Content Collections** com esquema validado (zod). O frontmatter de cada página junta o que hoje está em três lugares:

   ```yaml
   ---
   id: botoes
   title: Botões
   description: Primário, padrão, sutil, perigo, aviso e link.
   layer: core            # fundamentos | core | padroes | produto | layouts
   status: stable         # draft | experimental | beta | stable | deprecated | removed
   reference: ADS Button, Icon button, Split button
   tokens: [--btn-bg, --color-bg-brand-bold]
   related: [campos, menus, modais, padrao-confirmacao]
   history:
     - { piece: L81, date: 2026-10-20, note: Botão dividido de download, com Windows e Linux. }
   ---
   ```

   O `usadoEm` sai do DS (ele descreve o app, não o DS). No repositório do app, um script lê os comentários `// DS:` e gera a lista de onde cada página é usada.
3. **Componentes de documentação** (Astro), que tiram o HTML repetido das páginas:

   | Componente | Faz | Parte do ADS |
   |---|---|---|
   | `<Example>` | mostra o exemplo ao vivo, alterna claro / escuro / contraste / RTL e mostra o código com botão de copiar | aba Exemplos e aba Código |
   | `<StateMatrix>` | a matriz variante × estado (hover, foco, pressionado, desabilitado) a partir de uma lista | exemplos de estado |
   | `<Anatomy>` | desenho com as partes numeradas e a legenda | Uso → Anatomia |
   | `<DoDont>` | par lado a lado com exemplo, rótulo e ícone | Uso → Boas práticas |
   | `<KeyboardTable>` | tecla → ação, e os atributos ARIA | Uso → Acessibilidade |
   | `<TokenTable>` | os tokens que o componente usa, com o valor nos dois temas | tokens de design |
   | `<Ficha>` | o rodapé atual, lido do frontmatter | (nosso) |

4. **Modelo de página de componente**, na ordem do ADS (Exemplos → Código → Uso). É uma página só, com sumário fixo, para funcionar o Ctrl+F e a busca:
   1. Resumo (lede) e status
   2. **Exemplos:** variantes (`<Example>`) e estados (`<StateMatrix>`)
   3. **Código:** o HTML de cada variante, as classes e os modificadores
   4. **Uso:**
      - Quando usar
      - Anatomia (`<Anatomy>`)
      - Boas práticas (`<DoDont>`)
      - Diretrizes de conteúdo
      - Acessibilidade (`<KeyboardTable>`, contraste)
   5. Tokens (`<TokenTable>`)
   6. Relacionados e ficha (camada, histórico)
5. **Modelo de página de padrão:** o atual (problema, contexto, composição, fluxo, variações, estados, acessibilidade, conteúdo, antipadrões), agora como layout MDX.
6. **Busca com Pagefind:** índice estático gerado no build, que roda no navegador sem nenhum serviço externo.
7. **Fontes com `@fontsource`.** Nenhuma requisição a terceiros, como no app.
8. **Migrar as 54 páginas,** começando por três para validar o modelo (Botões, Cores, Padrão de confirmação) e depois por camada. As demos interativas do `docs.js` viram ilhas Astro com JS puro, só nas páginas que precisam.
9. **Página de variáveis gerada no build** a partir dos mapas Sass (substitui o `docs.js` que lê o CSS no navegador).

**Sai quando:** todas as páginas estão no site novo, sem `style=""`, com busca, e o `legacy/` pode ser apagado.

### Fase 6 · Enriquecer o conteúdo

Prioridade por uso no app: botões, campos, menus, modais, toasts, lista de conversas, leitura, composição, criptografia.

1. Anatomia e tabela de teclado/ARIA para todos os componentes interativos.
2. Boas práticas e diretrizes de conteúdo em cada página, como no Uso do ADS.
3. Seção **Conteúdo**, com as páginas dos fundamentos de conteúdo do ADS, em pt-BR:
   - voz e tom;
   - escrita inclusiva;
   - linguagem e gramática (verbos de botão, datas e números em pt-BR);
   - textos de mensagens (erro, vazio, sucesso, confirmação);
   - glossário do produto ("conversa", "arquivos anexados", "chave"), que é nosso.
4. Página **Plataforma Windows** (necessidade nossa): alto contraste com `forced-colors`, escala de texto do sistema, foco e atalhos do Windows, e as diferenças no WebKitGTK do Linux.
5. Página **Segurança na interface**, que expande `criptografia.html`: por que cada estado tem forma própria e o que nunca fazer.
6. Foundations mais longas, explicando o porquê de cada escala, além do valor.

### Fase 7 · Qualidade e governança

1. **Testes no CI:**
   - Playwright visual para cada `<Example>` em claro, escuro, alto contraste e `forced-colors`;
   - axe-core em cada página;
   - contraste calculado no build para os pares texto × superfície de cada tema (falha abaixo de 4.5:1 ou 3:1).
2. **Stylelint:**
   - proibir hex fora de `primitives/`;
   - exigir propriedades lógicas (com exceção comentada `/* físico: */`);
   - proibir `@import`;
   - limitar o aninhamento.
3. `check.mjs`: o que sobrar do `ds:check` atual (registro, status e páginas relacionadas que existem).
4. **Critérios de maturidade** para os status do ADS (os critérios são nossos), em `governanca.mdx`:

   | Para chegar a | Precisa de |
   |---|---|
   | Experimental | rascunho aprovado, tokens só semânticos |
   | Beta | página completa no modelo, exemplo com código, teclado documentado, um uso real |
   | Estável | testes visual e axe passando, revisão com leitor de tela registrada, três usos reais, sem falha de acessibilidade aberta |
   | Descontinuado | motivo, alternativa e como migrar |

5. Revisar os status atuais com esses critérios (ROADMAP item 10).
6. Atualizar `CONTRIBUTING.md`: o fluxo de rascunho vira um branch com uma página `status: draft`, e não um arquivo `rascunho-*.html`.

### Fase 8 · Distribuição e troca no EpistulaMail

1. Publicar a 1.0.0: `dist/` + `CHANGELOG.md` + tag `v1.0.0`.
2. No repositório do app:

   | Arquivo | Muda para |
   |---|---|
   | `package.json` | dependência `@epistula/design-system@1.0.0` |
   | `index.html` | `node_modules/@epistula/design-system/dist/{tokens,components}.css` (via import no Vite) |
   | `vite.config.ts` | `virtual:ds-icons` lê `dist/sprite.svg`; sai a regex do `docs.js` |
   | `site/build.mjs` | copia de `dist/`; sai a regex |
   | `docs-site/scripts/sync-ds.mjs` | lê `dist/tokens.css` e `dist/docs-site.css`; saem as duas regex |
   | `scripts/check-design-system.mjs` | fica só a parte do app: comentários `// DS:` contra o `pages.json` publicado pelo pacote, e nenhum `--palette-*` em `src/` |
   | `design-system/` | apagado |
   | `AGENTS.md` | seção Design system reescrita: onde fica o DS, como propor uma mudança, como atualizar a versão |
   | `.github/workflows/docs.yml` | o gatilho em `tokens.css`/`components.css` vira o gatilho em mudança de versão do pacote |

3. Rodar no app `pnpm test`, `pnpm build`, `node build.mjs` (site) e `pnpm build` (docs-site), e conferir o app aberto nos dois temas.

**Sai quando:** o app, o site e as docs constroem com o pacote e a pasta `design-system/` não existe mais.

---

## 5. Distribuição **[decidir]**

| Opção | Prós | Contras |
|---|---|---|
| **A · npm público** `@epistula/design-system` | padrão, versões claras, qualquer um usa | exige conta npm; o pacote fica público |
| **B · dependência Git por tag** (`github:<org>/EpistulaDesignSystem#v1.0.0`) | sem registro externo; combina com "nada de terceiros" | o `dist/` precisa ir versionado ou ser gerado no `prepare` |
| **C · workspace pnpm** (os dois repositórios lado a lado em desenvolvimento) | iteração rápida enquanto as fases 2 a 5 andam | não serve para o CI do app sozinho |

**Recomendação:** C durante a migração, B na 1.0 e A quando o DS for público e estável.

**Versionamento:** semver. Mudar o nome de uma classe ou de um token público é *major*, um token ou variante novo é *minor* e uma correção visual é *patch*. Tudo isso fica descrito no `CHANGELOG.md`.

---

## 6. Rastreio: propostas anteriores → fase

| Proposta | Fase |
|---|---|
| Escrever o conteúdo em MDX e publicar como HTML estático (Astro) | 5 |
| Tirar o Google Fonts das páginas | 0 |
| Acabar com o cabeçalho repetido em 54 arquivos | 5 |
| Juntar texto, ficha e status (hoje em `.html`, `fichas.js` e `docs.js`) no frontmatter | 5 |
| Separar o `docs.js` e acabar com o sprite extraído por regex | 4, 5 |
| Exemplo com código copiável em todo componente | 5 |
| Tirar os `style=""` inline | 3 |
| Prefixo de classes | 3 (configurável), 2.0 (troca) |
| Tokens num formato que gere outras saídas (antes: DTCG + Style Dictionary) | 2, com Sass. DTCG fica para quando houver Figma ou outra plataforma |
| Busca entre páginas | 5 (Pagefind) |
| Apagar o rascunho e tirar as referências a US | 0 |
| Tokens sem uso e valores fixos (ROADMAP 6 e 7) | 2 |
| Regressão visual e acessibilidade automáticas (ROADMAP 5) | 0 (linha de base), 7 |
| Status de maturidade estimados (ROADMAP 10) | 7 |
| Anatomia, abas de conteúdo, tabela de teclado | 5, 6 |
| **Novo:** `forced-colors` do Windows | 2, 3, 6 |
| **Novo:** tema escuro gerado de uma fonte só | 2 |
| **Novo:** primitivos fora do CSS final | 2 |
| **Novo:** `@layer` | 3 |
| **Novo:** `components.css` organizado por componente, não por entrega | 3 |
| **Novo:** `usadoEm` e `// DS:` sem acoplar os repositórios | 5, 8 |
| **Novo:** licença | 0, 1 |
| **Novo:** densidade como dimensão de token | 2 |
| **Novo:** critérios objetivos de maturidade | 7 |

---

## 7. Riscos

| Risco | Como evitar |
|---|---|
| Um token muda de valor sem ninguém perceber na conversão para Sass | `compare-tokens.mjs` contra a linha de base, obrigatório no CI da fase 2 |
| A quebra do `components.css` muda a ordem da cascata | `@layer` + regressão visual por página antes e depois |
| O app quebra na troca para o pacote | 1.0 com os mesmos nomes de classe e de token; o prefixo fica para a 2.0 |
| Dois lugares para mudar durante a migração | o `design-system/` do app fica congelado a partir da fase 1; mudança visual nova vai só para o repositório novo |
| O Sass vira uma segunda linguagem de lógica | regras de §3.6 no Stylelint; o resultado são sempre custom properties trocáveis em tempo de execução |
| A migração das 54 páginas se arrasta | três páginas-piloto primeiro; o `legacy/` continua publicado até a última página migrar |

---

## 8. Decisões para registrar no `DECISIONS.md`

| # | Decisão | Substitui |
|---|---|---|
| 0009 | O DS vira o repositório EpistulaDesignSystem, distribuído como pacote | — |
| 0010 | Tokens em Sass, em três pastas por nível e um arquivo por assunto; o tema só no nível semântico | 0003 (`tokens.css` como fonte) |
| 0011 | Primitivos só em Sass, fora do CSS publicado | parte de 0004 |
| 0012 | O sprite é gerado de `src/icons/*.svg` | 0002 (L2) |
| 0013 | Documentação em Astro + MDX, com frontmatter validado | — |
| 0014 | `@layer` e prefixo de classe configurável | — |
| 0015 | Suporte a `forced-colors` faz parte do critério de Estável | — |
| 0016 | Critérios objetivos de maturidade | completa 0005 |
