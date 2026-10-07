import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
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
export function createPreviewServer(
  root = path.resolve("dist/client"),
  base = (process.env.PAGES_BASE_PATH ?? "").replace(/^\/$/, ""),
) {
  root = path.resolve(root);
  return createServer((req, res) => {
    let pathname;
    try {
      const url = new URL(req.url, "http://localhost");
      if (base && !url.pathname.startsWith(base + "/") && url.pathname !== base) {
        res.writeHead(404).end();
        return;
      }
      pathname = decodeURIComponent(url.pathname.slice(base.length));
      if (pathname.includes("\0")) throw Error("Invalid path");
    } catch {
      res.writeHead(400).end("Invalid request path");
      return;
    }
    const file = path.resolve(root, "." + pathname);
    if (!file.startsWith(root + path.sep) && file !== root) {
      res.writeHead(403).end();
      return;
    }
    try {
      const target =
        existsSync(file) && statSync(file).isDirectory() ? path.join(file, "index.html") : file;
      if (!existsSync(target)) {
        const notFound = path.join(root, "404.html");
        const body = existsSync(notFound) ? readFileSync(notFound) : "Not found";
        res.writeHead(404, { "Content-Type": "text/html" }).end(body);
        return;
      }
      const body = readFileSync(target);
      res
        .writeHead(200, {
          "Content-Type": mime[path.extname(target)] ?? "application/octet-stream",
        })
        .end(body);
    } catch {
      res.writeHead(500).end("Unable to read preview file");
    }
  });
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const base = (process.env.PAGES_BASE_PATH ?? "").replace(/^\/$/, "");
  createPreviewServer(undefined, base).listen(4173, "127.0.0.1", () =>
    console.log(`Static preview http://127.0.0.1:4173${base}/`),
  );
}
