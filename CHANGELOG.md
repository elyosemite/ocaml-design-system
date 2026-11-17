# Changelog

Versões do OCaml Design System. Semver: valor de token que muda é versão menor enquanto estivermos em 0.x; token ou classe removidos ou renomeados são versão maior.

## 0.2.0 · 17 nov 2026

O visual neutro (decisão 0022) passa a valer para qualquer produto: EpistulaMail, OpenBoard, sites e apps nativos.

### Tokens

- **Tema claro neutro**: texto, ícones, bordas e fundos em cinza puro (`gray-*`), marca `#2563EB`, raios xsmall 4px, small 6px, medium 8px e large 12px.
- **Tema escuro neutro**: superfícies `#09090B` a `#222226`, sem matiz azul. O texto fica em `#F4F4F5` (16,7:1) e a marca em `#60A5FA` (7,2:1). O alto contraste acompanha.
- Novos: `--radius-xlarge` (16px), `--color-border-brand` e `--color-border-information`.
- Removidos da paleta: os tons `slate-*`, `blue-150`, `blue-150-a04`, `blue-275` e `blue-300` (sem uso depois da troca).

### Componentes novos

- `.pill` (neutra, `--success`, `--warning`, `--danger`, `--information`, `--brand`, `--filled`, `.pill__dot`)
- `.filter-chip` e `.filter-chip-group`
- `.tabs--raised`
- `.stepper` e `.step` (`--done`, `--current`, `--todo`, `--failed`)
- `.segments` (`--brand`, `--warning`, `--danger`)
- `.composer` (`__input`, `__bar`, `__spacer`, `__hint`, `__stop`)
- A casca `.workspace` (`__sidebar`, `__sidebar-foot`, `__main`, `__topbar`, `__topbar-end`, `__crumb`), `.panel`, `.usage-card` e `.identity`
- `.input--round` e `.wordmark__glyph--neutral`

Nenhuma regra existente mudou: as 874 regras de 0.1.0 continuam iguais, e 0.2.0 acrescenta 91.

### Plataformas

- `dist/platforms/`: `tokens.json` (DTCG), `tokens.ts`, `OCamlTokens.swift`, `OCamlTokens.kt` e o XML do Android (`values/` e `values-night/`), gerados no build.
- `package.json` ganha `exports` (`ocaml-design-system/tokens.css`, `/components.css`, `/tokens`, `/platforms/*`, `/scss/*`) e `prepare`, para instalar pelo git.

### Documentação

- Páginas novas: Pill e chip de filtro, Abas, Progresso, Composer, Área de trabalho e Usar em um produto.
- A página Forma mostra os raios atuais.
- O escuro do site de documentação passa a ser cinza neutro.
- `examples/index.html` e `examples/epistulamail.html` usam os componentes novos no lugar do CSS local.

## 0.1.0 · 14 nov 2026

Migração para o repositório próprio: tokens e componentes em Sass, ícones em arquivos, documentação local e `pnpm compare` contra `baseline/`.
