import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
const root = path.resolve("dist/client");
const base = (process.env.PAGES_BASE_PATH ?? "").replace(/^\/$/, "");
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".rsc": "text/x-component",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".wav": "audio/wav",
};
createServer((req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (base && !url.pathname.startsWith(base + "/") && url.pathname !== base) {
    res.writeHead(404).end();
    return;
  }
  const file = path.resolve(root, "." + decodeURIComponent(url.pathname.slice(base.length)));
  if (!file.startsWith(root + path.sep) && file !== root) {
    res.writeHead(403).end();
    return;
  }
  const target =
    existsSync(file) && statSync(file).isDirectory() ? path.join(file, "index.html") : file;
  if (!existsSync(target)) {
    res
      .writeHead(404, { "Content-Type": "text/html" })
      .end(readFileSync(path.join(root, "404.html")));
    return;
  }
  res
    .writeHead(200, { "Content-Type": mime[path.extname(target)] ?? "application/octet-stream" })
    .end(readFileSync(target));
}).listen(4173, "127.0.0.1", () => console.log(`Static preview http://127.0.0.1:4173${base}/`));
