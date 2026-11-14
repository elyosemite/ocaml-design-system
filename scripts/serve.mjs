// Servidor local da documentação, sem dependências. Serve a raiz do repositório (site/ precisa de ../dist/).
// Uso: node scripts/serve.mjs [porta]   → http://localhost:4400/
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, dirname, extname, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const port = Number(process.argv[2]) || 4400;
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".woff2": "font/woff2", ".md": "text/plain; charset=utf-8" };

createServer(async (req, res) => {
  const url = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (url === "/") { res.writeHead(302, { Location: "/site/index.html" }); return res.end(); }
  if (url === "/favicon.ico") { res.writeHead(204); return res.end(); } // as páginas não têm favicon; evita o 404 no console
  const path = normalize(join(root, url));
  if (!path.startsWith(root) || /node_modules|\.git/.test(path)) { res.writeHead(403); return res.end(); }
  try {
    const file = (await stat(path)).isDirectory() ? join(path, "index.html") : path;
    const body = await readFile(file);
    res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream", "Cache-Control": "no-store" });
    res.end(body);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Não encontrado");
  }
}).listen(port, "127.0.0.1", () => console.log(`Documentação em http://localhost:${port}/`));
