// Migração (uso único, 14 nov 2026): atualiza CONTRIBUTING, DECISIONS e ROADMAP para o repositório próprio.
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
function patch(file, pairs) {
  const path = join(root, file);
  let s = readFileSync(path, "utf8").replace(/\r\n/g, "\n");
  for (const [from, to] of pairs) {
    if (!s.includes(from)) throw new Error(`${file}: não achei ${from.slice(0, 70)}`);
    s = s.split(from).join(to);
  }
  writeFileSync(path, s);
}

if (!readFileSync(join(root, "CONTRIBUTING.md"), "utf8").includes("## Onde fica cada coisa")) patch("CONTRIBUTING.md", [
  ["Este arquivo é o fluxo operacional do design system do EpistulaMail. A arquitetura, as camadas e os critérios estão em `EpistulaMailDesignSystem-v3.md` e na página `governanca.html`.",
   "Este arquivo é o fluxo operacional do EpistulaDesignSystem, o design system do EpistulaMail. A arquitetura, as camadas e os critérios estão em `docs/fundamentos-v3.md` e na página `site/governanca.html`. A única referência externa é o Atlassian Design System."],
  ["1. **Rascunho.** Crie `design-system/rascunho-<tema>.html` só com tokens e componentes que já existem, mostrando todos os estados nos dois temas. O CSS novo vai em `components.css`, só com tokens.",
   "1. **Rascunho.** Crie `site/rascunho-<tema>.html` só com tokens e componentes que já existem, mostrando todos os estados nos dois temas. O CSS novo vai num partial de `src/styles/<camada>/`, só com tokens semânticos; um token novo vai no arquivo do assunto em `src/tokens/` (veja \"Onde fica cada coisa\")."],
  ["2. **Aprovação.** Mostre o rascunho a quem mantém o design system. Nada vai para `src/`, `site/` ou `docs-site/` antes disso.",
   "2. **Aprovação.** Mostre o rascunho a quem mantém o design system. Nada vai para o app, o site ou as docs do EpistulaMail antes disso."],
  ["3. **Incorporação.** Mova as peças para a página do componente (ou crie `<id>.html` e registre em `EPISTULA_PAGES`, em `docs.js`, com camada e status).",
   "3. **Incorporação.** Mova as peças para a página do componente (ou crie `site/<id>.html` e registre em `EPISTULA_PAGES`, em `site/docs.js`, com camada e status)."],
  ["5. **Conferência.** Rode `pnpm ds:check` e deixe tudo sem erro.",
   "5. **Conferência.** Rode `pnpm verify` (build, comparação e conferência) e deixe tudo sem erro. Se a mudança altera o resultado de propósito, atualize `baseline/` no mesmo commit e diga por quê."],
  ["- [ ] `pnpm ds:check` sem erro.", "- [ ] `pnpm verify` sem erro."],
  ["as métricas de `pnpm ds:check --metrics`.", "as métricas de `pnpm check --metrics`."],
  ["## Papéis", `## Onde fica cada coisa

| Quero mudar | Arquivo |
|---|---|
| Uma cor bruta da paleta | \`src/tokens/primitives/color/_<família>.scss\` |
| Uma escala bruta (espaço, fonte, raio, tamanho, camada, movimento, opacidade, breakpoint) | \`src/tokens/primitives/_<assunto>.scss\` |
| O significado de uma cor, com o valor claro e o escuro | \`src/tokens/semantic/color/_<assunto>.scss\` |
| Um token semântico que não é cor | \`src/tokens/semantic/_<assunto>.scss\` |
| O alto contraste ou o movimento reduzido | \`src/tokens/themes/\` |
| Uma variante de componente (botão primário, avatar verde…) | \`src/tokens/components/_<componente>.scss\` |
| A forma de um componente | \`src/styles/<camada>/_<componente>.scss\` |
| Um ícone | \`src/icons/<nome>.svg\` e a ordem em \`src/icons/icons.json\` |
| Uma página da documentação | \`site/<id>.html\`, \`site/fichas.js\` e o registro em \`site/docs.js\` |

Regras que a compilação ou o \`pnpm check\` garantem:

- Um token de cor com \`light\` precisa de \`dark\`; o que é igual nos dois temas usa \`value\`.
- Tema só no nível semântico: arquivos de \`src/tokens/components/\` não têm \`light\`/\`dark\`, não chamam \`palette()\` e não usam cor fixa.
- \`src/styles/\` nunca chama \`palette()\`.
- \`palette('nome')\` falha se a cor não existir.
- Os \`@media\` de largura usam \`down()\` e \`up()\` de \`src/tokens/semantic/_breakpoint.scss\`.

## Papéis`],
]);

patch("DECISIONS.md", [
  ["## 0002 · O sprite de ícones vive dentro de `docs.js` (L2)\n\n- **Status:** em vigor, anterior ao v3.",
   "## 0002 · O sprite de ícones vive dentro de `docs.js` (L2)\n\n- **Status:** substituída pela 0018 neste repositório. O app ainda extrai o sprite da cópia antiga até trocar para o pacote."],
  ["## 0003 · `tokens.css` é a fonte de verdade, sem Figma nem Style Dictionary\n",
   "## 0003 · `tokens.css` é a fonte de verdade, sem Figma nem Style Dictionary\n\n- **Status:** substituída pela 0016 (a fonte agora é o Sass de `src/tokens/`; continua sem Figma nem Style Dictionary).\n"],
  ["de `design-system/images/people/`", "de `site/images/people/`"],
]);

const decisions = `

As decisões 0015 a 0020 são de 14 nov 2026, da migração para o repositório próprio (\`docs/plano-migracao.md\`).

## 0015 · Repositório próprio: EpistulaDesignSystem

- **Contexto:** o design system morava em \`epistulamail/design-system/\` e vai servir a mais de um projeto.
- **Decisão:** repositório próprio, com o histórico de \`design-system/\` trazido por \`git subtree split\`. As páginas ficam em \`site/\`, os fontes em \`src/\`, o resultado em \`dist/\` (gerado, fora do Git) e o CSS de antes da migração em \`baseline/\`, como referência.
- **Efeito:** \`pnpm compare\` confere que o CSS gerado equivale ao de \`baseline/\`. O app continua com a cópia dele até a fase 8 do plano; nada foi apagado lá.

## 0016 · Tokens em Sass: três níveis, uma pasta por nível, um arquivo por assunto

- **Contexto:** \`tokens.css\` tinha 596 linhas e o tema escuro escrito duas vezes à mão.
- **Decisão:** \`src/tokens/primitives/\`, \`semantic/\` e \`components/\`, um arquivo por assunto. O tema mora só no nível semântico: cada token de cor traz \`light\` e \`dark\` lado a lado, e a mixin \`themes()\` gera o claro, o escuro do sistema e o escuro forçado da mesma fonte. A compilação falha se faltar um tema ou se \`palette()\` receber uma cor que não existe.
- **Efeito:** os 311 tokens resolvem para o mesmo valor nos seis contextos (claro, escuro do sistema, escuro forçado, alto contraste por sistema e por atributo, movimento reduzido), conferido por \`pnpm compare\`. Os nomes das custom properties não mudaram.

## 0017 · A paleta continua saindo no CSS, por enquanto

- **Decisão:** \`$emit-primitives: true\` em \`src/tokens/_config.scss\`. A paleta sai como \`--palette-*\` e os semânticos apontam para ela, como antes.
- **Efeito:** em aberto. Com \`false\`, a paleta fica só no Sass e ninguém consegue usá-la por engano; a página de variáveis precisaria de outra fonte para mostrar a paleta.

## 0018 · Um arquivo por ícone

- **Decisão:** cada ícone é \`src/icons/<nome>.svg\` (abre sozinho em qualquer visualizador); \`src/icons/icons.json\` guarda a ordem e a categoria (interface ou marca). O build gera \`dist/sprite.svg\`, \`dist/sprite.js\` e \`dist/icons.json\`.
- **Efeito:** o sprite gerado é byte a byte igual ao que estava dentro do \`docs.js\`. O \`docs.js\` deixou de carregar o sprite.

## 0019 · Componentes em partials Sass por camada

- **Decisão:** \`components.css\` virou 60 partials em \`src/styles/base|core|patterns|product|layouts|docs-site/\`. As seções organizadas por entrega (por exemplo, "Aparência, rolagem, arrastar e sinalizadas") foram separadas por peça. A ordem dos \`@use\` em \`src/styles/index.scss\` é a ordem da cascata. Tokens de componente (\`--btn-*\`, \`--av-*\`, \`--lb-*\`, \`--sm-*\`, \`--tt-*\`, \`--app-shell-*\`, \`--post-*\`) ficam em \`src/tokens/components/\` e entram na regra por \`@include <componente>.set('<variante>')\`. Os \`@media\` de largura usam \`down()\`/\`up()\`.
- **Efeito:** as 872 regras do CSS gerado são as mesmas de antes, na mesma ordem. O \`@media (max-width: 960px)\` do índice do blog ficou como estava: difere 1px dos outros (959px) e está no roteiro.

## 0020 · Só o Atlassian como referência externa

- **Decisão:** o plano e as páginas se baseiam só no Atlassian Design System. O que não vem dele é necessidade própria do EpistulaMail (Alto Contraste do Windows, Sass, densidade) e é marcado como tal.
`;
writeFileSync(join(root, "DECISIONS.md"), readFileSync(join(root, "DECISIONS.md"), "utf8").replace(/\r\n/g, "\n").replace(/\s*$/, "") + decisions);

patch("ROADMAP.md", [
  ["## Próximo", `## Feito em 14 nov 2026 (migração para o repositório próprio)

Fases 0 a 4 do \`docs/plano-migracao.md\`:

1. **Repositório.** Histórico trazido do app; páginas em \`site/\`, fontes em \`src/\`, referência em \`baseline/\`.
2. **Tokens em Sass.** Três pastas (primitives, semantic, components) e um arquivo por assunto; tema claro e escuro lado a lado; alto contraste e movimento reduzido em \`themes/\`. Zero diferença nos valores resolvidos.
3. **Componentes em Sass.** 60 partials por camada; tokens de componente com \`set()\`; breakpoints com \`down()\`/\`up()\`. As 872 regras iguais.
4. **Ícones.** 83 arquivos \`.svg\`; sprite gerado igual ao antigo.
5. **Páginas.** Fontes locais (\`@fontsource\`) no lugar do Google Fonts; nenhuma requisição a terceiros; o rascunho \`rascunho-us16.html\` apagado.
6. **Conferência.** \`pnpm compare\` (resultado contra \`baseline/\`) e \`pnpm check\` adaptado.

## Próximo`],
  ["| 10 | Revisar os status de maturidade. |", "| 11 | Alinhar o \`@media (max-width: 960px)\` do índice do blog aos outros (959px, \`down(compact)\`). | Único \`@media\` que difere 1px do token; ficou igual na migração para não mudar o resultado. | Layouts |\n| 12 | Fases 5 a 8 do plano: documentação em Astro + MDX, conteúdo no modelo do ADS, testes e a troca no app. | \`docs/plano-migracao.md\`. | Governança |\n| 10 | Revisar os status de maturidade. |"],
  ["`pnpm ds:check --metrics --list` lista cada um.", "`pnpm check --metrics --list` lista cada um."],
  ["O `ds:check` confere tokens e registro", "O `pnpm check` confere tokens e registro"],
]);
console.log("CONTRIBUTING, DECISIONS e ROADMAP atualizados.");
