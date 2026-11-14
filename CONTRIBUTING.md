# Como contribuir com o design system

Este arquivo é o fluxo operacional do EpistulaDesignSystem, o design system do EpistulaMail. A arquitetura, as camadas e os critérios estão em `docs/fundamentos-v3.md` e na página `site/governanca.html`. A única referência externa é o Atlassian Design System. As decisões com impacto duradouro ficam em `DECISIONS.md`, e a ordem de trabalho em `ROADMAP.md`.

## Quando uma mudança passa por revisão

Passa por revisão (sempre) qualquer um destes casos:

- novo componente Core ou Produto;
- novo padrão ou novo layout reutilizável;
- novo token, ou mudança de significado de um token existente;
- nova variante ou novo tamanho público;
- mudança de API ou de comportamento;
- mudança que quebra o que já existe, ou descontinuação;
- mudança de acessibilidade, de texto ou de tema com efeito em várias peças;
- mudança no jeito de gerar ou conferir os tokens.

Correção de erro de digitação e ajuste de texto de uma página só não precisam de proposta.

## Fluxo

1. **Rascunho.** Crie `site/rascunho-<tema>.html` só com tokens e componentes que já existem, mostrando todos os estados nos dois temas. O CSS novo vai num partial de `src/styles/<camada>/`, só com tokens semânticos; um token novo vai no arquivo do assunto em `src/tokens/` (veja "Onde fica cada coisa").
2. **Aprovação.** Mostre o rascunho a quem mantém o design system. Nada vai para o app, o site ou as docs do EpistulaMail antes disso.
3. **Incorporação.** Mova as peças para a página do componente (ou crie `site/<id>.html` e registre em `EPISTULA_PAGES`, em `site/docs.js`, com camada e status). Apague o rascunho e registre o que foi decidido em <code>DECISIONS.md</code>.
4. **Implementação.** Use as mesmas classes no app, no site e nas docs.
5. **Conferência.** Rode `pnpm verify` (build, comparação e conferência) e deixe tudo sem erro. Se a mudança altera o resultado de propósito, atualize `baseline/` no mesmo commit e diga por quê.

## Onde fica cada coisa

| Quero mudar | Arquivo |
|---|---|
| Uma cor bruta da paleta | `src/tokens/primitives/color/_<família>.scss` |
| Uma escala bruta (espaço, fonte, raio, tamanho, camada, movimento, opacidade, breakpoint) | `src/tokens/primitives/_<assunto>.scss` |
| O significado de uma cor, com o valor claro e o escuro | `src/tokens/semantic/color/_<assunto>.scss` |
| Um token semântico que não é cor | `src/tokens/semantic/_<assunto>.scss` |
| O alto contraste ou o movimento reduzido | `src/tokens/themes/` |
| Uma variante de componente (botão primário, avatar verde…) | `src/tokens/components/_<componente>.scss` |
| A forma de um componente | `src/styles/<camada>/_<componente>.scss` |
| Um ícone | `src/icons/<nome>.svg` e a ordem em `src/icons/icons.json` |
| Uma página da documentação | `site/<id>.html`, `site/fichas.js` e o registro em `site/docs.js` |

Regras que a compilação ou o `pnpm check` garantem:

- Um token de cor com `light` precisa de `dark`; o que é igual nos dois temas usa `value`.
- Tema só no nível semântico: arquivos de `src/tokens/components/` não têm `light`/`dark`, não chamam `palette()` e não usam cor fixa.
- `src/styles/` nunca chama `palette()`.
- `palette('nome')` falha se a cor não existir.
- Os `@media` de largura usam `down()` e `up()` de `src/tokens/semantic/_breakpoint.scss`.

## Papéis

O projeto tem uma pessoa mantendo o design system, então os papéis do v3 se acumulam. A responsabilidade por cada gate continua explícita:

| Papel | Quem faz hoje | O que decide |
|---|---|---|
| Responsável pelo design system | quem mantém o repositório | decisão final e coerência da arquitetura |
| Implementação | quem abre a mudança | API, tokens, testes e manutenção |
| Acessibilidade | quem abre a mudança, com revisão de quem mantém | pode bloquear mudança que piore um fluxo crítico |
| Texto e tradução | quem abre a mudança | microtexto, truncamento, tradução e RTL |

## Os seis gates

Antes de aprovar, responda sim às seis perguntas (ou registre a exceção):

1. **Camada.** O elemento está na camada certa, com uma responsabilidade clara?
2. **Reuso.** Já existe algo parecido? Há três usos reais, ou a exceção está justificada?
3. **Tokens e temas.** Usa só tokens semânticos e funciona no claro, no escuro e em alto contraste?
4. **API e acessibilidade.** Teclado, foco, semântica, leitor de tela e estados foram avaliados?
5. **Texto e tradução.** O texto pode ser traduzido? Truncamento, plural e RTL foram considerados?
6. **Documentação e testes.** Há exemplos, a ficha do componente, a conferência e o registro em <code>DECISIONS.md</code>/<code>CHANGELOG.md</code>?

## Definição de pronto

- [ ] Camada e status definidos.
- [ ] Caso de uso real e decisão de reuso registrados.
- [ ] API, variantes, estados e limites descritos.
- [ ] Tokens documentados; valor fixo justificado.
- [ ] Claro, escuro e alto contraste verificados.
- [ ] Teclado, foco e semântica testados na mão.
- [ ] Texto preparado para tradução; RTL considerado.
- [ ] Exemplos cobrindo as variantes e os estados.
- [ ] Ficha do componente preenchida (fazer e não fazer, texto, testes, relacionados, histórico).
- [ ] `pnpm verify` sem erro.
- [ ] Changelog e migração, se algo mudou para quem já usa.
- [ ] Gates aprovados.

Teste automático ajuda, mas não substitui conferir com teclado e leitor de tela.

## Maturidade e descontinuação

Cada página declara o status: Rascunho, Experimental, Beta, Estável, Descontinuado ou Removido.

Uma descontinuação diz o motivo, a alternativa, o impacto e como migrar. Nada Estável some sem aviso. O prazo considera o ciclo de versões do app. Exceção por segurança é registrada em `DECISIONS.md` e avisada na hora.

## Modelo de proposta (RFC)

Uma mudança relevante registra:

1. Problema e contexto.
2. Evidência de uso ou necessidade.
3. Camada proposta e alternativas consideradas.
4. API e comportamento propostos.
5. Efeito em acessibilidade, temas, tradução e segurança.
6. Plano de testes e de documentação.
7. Compatibilidade, migração e versão.
8. Decisão, responsável e data.

Aprovada, a proposta vira uma entrada em `DECISIONS.md`.

## Ritmo

- Revisão por pull request é o caminho comum.
- A meta é dar retorno em até três dias úteis. É uma meta, não uma garantia.
- Uma vez por mês, olhe a lista de descontinuações pendentes e as métricas de `pnpm check --metrics`.
