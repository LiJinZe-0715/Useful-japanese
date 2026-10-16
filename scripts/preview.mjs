import {createServer} from "node:http";
import {existsSync, readFileSync, statSync} from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const contentTypes = {
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
    outputDirectory = path.resolve("dist/client"),
    basePath = (process.env.PAGES_BASE_PATH ?? "").replace(/^\/$/, ""),
) {
    outputDirectory = path.resolve(outputDirectory);
    return createServer((request, response) => {
        let pathname;
        try {
            const url = new URL(request.url, "http://localhost");
            if (basePath && !url.pathname.startsWith(basePath + "/") && url.pathname !== basePath) {
                response.writeHead(404).end();
                return;
            }
            pathname = decodeURIComponent(url.pathname.slice(basePath.length));
            if (pathname.includes("\0")) throw Error("Invalid path");
        } catch {
            response.writeHead(400).end("Invalid request path");
            return;
        }
        const file = path.resolve(outputDirectory, "." + pathname);
        if (!file.startsWith(outputDirectory + path.sep) && file !== outputDirectory) {
            response.writeHead(403).end();
            return;
        }
        try {
            const target =
                existsSync(file) && statSync(file).isDirectory() ? path.join(file, "index.html") : file;
            if (!existsSync(target)) {
                const notFound = path.join(outputDirectory, "404.html");
                const body = existsSync(notFound) ? readFileSync(notFound) : "Not found";
                response.writeHead(404, {"Content-Type": "text/html"}).end(body);
                return;
            }
            const body = readFileSync(target);
            response
                .writeHead(200, {
                    "Content-Type": contentTypes[path.extname(target)] ?? "application/octet-stream",
                })
                .end(body);
        } catch {
            response.writeHead(500).end("Unable to read preview file");
        }
    });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const basePath = (process.env.PAGES_BASE_PATH ?? "").replace(/^\/$/, "");
    createPreviewServer(undefined, basePath).listen(4173, "127.0.0.1", () =>
        console.log(`Static preview http://127.0.0.1:4173${basePath}/`),
    );
}
