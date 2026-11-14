// Migração (uso único, 14 nov 2026): divide baseline/components.css em partials Sass por camada e componente.
// Cada trecho vai do marcador até a linha antes do próximo. A ordem dos @use no index é a ordem original,
// então a cascata não muda. O script falha se um arquivo recebesse trechos não contíguos.
// Uso: node scripts/migrate/split-components.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const lines = readFileSync(join(root, "baseline", "components.css"), "utf8").replace(/\r\n/g, "\n").split("\n");
const out = join(root, "src", "styles");

// [linha inicial, arquivo, título]. Linha 1–6 é o cabeçalho antigo (vira o cabeçalho do index).
const MAP = [
  [7, "base/box-model", "Modelo de caixa"],
  [10, "base/icon", "Ícones"],
  [20, "base/focus", "Foco visível"],
  [32, "core/button", "Botões (ADS Button)"],
  [103, "core/text-field", "Campos de texto (ADS Textfield / Textarea)"],
  [164, "product/recipients", "Chips de destinatário (ADS Tag + User Picker)"],
  [190, "layouts/row", "Linha de controles"],
  [194, "patterns/form-columns", "Formulário em duas colunas (L88)"],
  [197, "patterns/field-suggestions", "Sugestões abaixo de um campo"],
  [200, "product/search", "Busca: chips de filtro, barra de resultados e conta do resultado (L73–L75)"],
  [222, "core/selection", "Seleção: checkbox e toggle (ADS Checkbox / Toggle)"],
  [270, "core/avatar", "Avatar (ADS Avatar)"],
  [296, "core/badge-lozenge", "Badge (contagem) e Lozenge (status)"],
  [332, "product/labels", "Etiquetas de e-mail (ADS Tag colorida)"],
  [353, "core/side-navigation", "Navegação lateral (ADS Side Navigation)"],
  [395, "layouts/app-shell", "Casca do cliente: header, banner, sidebar, lista e leitura"],
  [484, "product/accounts", "Coluna de contas (L15)"],
  [601, "layouts/shell-header", "Header nas colunas da casca e linha de comandos (L18)"],
  [622, "core/toolbar", "Barra de comandos (L19)"],
  [638, "layouts/resizer", "Divisor entre lista e leitura (L20)"],
  [667, "layouts/blocks", "Casca em blocos (L25–L27)"],
  [730, "patterns/drag-to-folder", "Arrastar mensagens para uma pasta (L29)"],
  [747, "core/select", "Lista de opções (L33)"],
  [761, "product/settings", "Configurações (L32, L34, L49)"],
  [836, "base/scrollbar", "Barra de rolagem global (L35)"],
  [853, "product/theme-picker", "Escolha de tema (L36)"],
  [869, "product/color-swatch", "Amostra de cor do fundo (L37)"],
  [879, "patterns/drag-cursor", "Cursor e rótulo de arraste (L38)"],
  [885, "product/flagged", "Sinalizadas na coluna de pastas (L39)"],
  [888, "core/segmented", "Controle segmentado (L41)"],
  [899, "layouts/header-end", "Fim do header (L42)"],
  [907, "product/notifications", "Sino e painel de notificações (L52)"],
  [935, "product/account-menu", "Menu da conta (L40)"],
  [948, "layouts/collapsible-columns", "Colunas recolhíveis (L43)"],
  [968, "product/list-density", "Densidade da lista (L44)"],
  [974, "product/sending", "Envio (L45)"],
  [982, "product/wordmark", "Marca (wordmark) e logo (L76)"],
  [1006, "layouts/global-header", "Header global (ADS Atlassian Navigation, adaptado)"],
  [1024, "core/tabs", "Abas (ADS Tabs)"],
  [1042, "product/thread-list", "Lista de conversas"],
  [1130, "product/bulk-actions", "Barra de ações em massa"],
  [1144, "product/reading-pane", "Painel de leitura e conversa em cards (L46, L47)"],
  [1211, "product/attachment", "Anexo (ADS Media card, simplificado)"],
  [1238, "product/compose", "Composição (L23)"],
  [1279, "core/banner", "Banner e Section message (ADS Banner / Section Message)"],
  [1312, "core/toast", "Toast (ADS Flag)"],
  [1347, "core/modal", "Modal (ADS Modal Dialog) e seletor de pastas (L22)"],
  [1385, "core/menu", "Menu (ADS Dropdown Menu)"],
  [1423, "core/tooltip", "Tooltip"],
  [1441, "product/provider-grid", "Grade de provedores (L16)"],
  [1465, "product/account-color", "Seletor de cor da conta (L17)"],
  [1486, "patterns/empty-state", "Estado vazio (ADS Empty State)"],
  [1501, "core/loading", "Carregamento: spinner e skeleton (ADS Spinner / Skeleton)"],
  [1528, "product/privacy", "Privacidade e proteção local (L53–L57)"],
  [1575, "product/rules", "Regras (L58–L63)"],
  [1649, "product/crypto", "Criptografia de ponta a ponta (L64–L69, L85–L87)"],
  [1737, "product/mail-archives", "Arquivos de e-mail (L70–L72)"],
  [1770, "layouts/article", "Artigo (L89)"],
  [1812, "layouts/blog-index", "Índice do blog (L90)"],
  [1842, "docs-site/docs-site", "Peças das docs: gradiente, brilho, ícones de marca, idioma, timeline (L77–L80)"],
];

const LAYER = { base: "Base", core: "Core", patterns: "Padrões", product: "Produto", layouts: "Layouts e páginas", "docs-site": "Docs" };
const seen = new Map();
const order = [];
MAP.forEach(([start, file, title], i) => {
  const end = i + 1 < MAP.length ? MAP[i + 1][0] - 1 : lines.length;
  let body = lines.slice(start - 1, end).join("\n").replace(/\s+$/, "") + "\n";
  if (seen.has(file) && order[order.length - 1] !== file) throw new Error(`${file} recebe trechos não contíguos`);
  if (!seen.has(file)) { seen.set(file, { title, parts: [] }); order.push(file); }
  seen.get(file).parts.push({ start, end, body });
});
// O trecho de linha 1431 começa no meio do bloco do menu? Confere que nenhum trecho abre mais chaves do que fecha.
for (const file of order) {
  const css = seen.get(file).parts.map((p) => p.body).join("\n").replace(/\/\*[\s\S]*?\*\//g, "");
  const open = (css.match(/\{/g) || []).length, close = (css.match(/\}/g) || []).length;
  if (open !== close) throw new Error(`${file}: chaves desbalanceadas (${open} × ${close})`);
}
for (const file of order) {
  const { title, parts } = seen.get(file);
  const layer = LAYER[file.split("/")[0]];
  const range = parts.map((p) => `${p.start}–${p.end}`).join(", ");
  const header = `// ${layer} · ${title}\n// Veio de components.css (linhas ${range}) na migração para o EpistulaDesignSystem.\n\n`;
  const path = join(out, dirname(file), `_${file.split("/").pop()}.scss`);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, header + parts.map((p) => p.body).join("\n"));
}
const index = `// EpistulaDesignSystem · componentes
// Entrada de dist/components.css. Depende de dist/tokens.css.
// Estados forçados (.is-hover, .is-focus, .is-active) existem só para a documentação mostrar todos os estados lado a lado.
// A ordem dos @use é a ordem da cascata: não reordene sem conferir com pnpm compare.

${order.map((f) => `@use '${f}';`).join("\n")}
`;
writeFileSync(join(out, "index.scss"), index);
console.log(`${order.length} partials escritos em src/styles/.`);
