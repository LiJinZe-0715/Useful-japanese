import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, rmdirSync, unlinkSync } from "node:fs";
import { request } from "node:http";
import { once } from "node:events";
import path from "node:path";
import os from "node:os";
import { createPreviewServer } from "../scripts/preview.mjs";

test("preview rejects malformed paths and keeps serving after request and file errors", async () => {
  const root = mkdtempSync(path.join(os.tmpdir(), "nihongo-preview-"));
  writeFileSync(path.join(root, "index.html"), "Preview home");
  mkdirSync(path.join(root, "404.html"));
  const server = createPreviewServer(root, "/nihongo");
  server.listen(0, "127.0.0.1");
  try {
    await once(server, "listening");
    const get = (pathname) =>
      new Promise((resolve, reject) => {
        const req = request(
          { hostname: "127.0.0.1", port: server.address().port, path: pathname },
          (res) => {
            let body = "";
            res.setEncoding("utf8");
            res.on("data", (chunk) => (body += chunk));
            res.on("end", () => resolve({ status: res.statusCode, body }));
            res.on("error", reject);
          },
        );
        req.on("error", reject);
        req.end();
      });
    for (const pathname of ["/nihongo/%", "/nihongo/%E0%A4%A", "/nihongo/%00"])
      assert.equal((await get(pathname)).status, 400);
    assert.equal((await get("/nihongo/..%2foutside")).status, 403);
    assert.equal((await get("/other/")).status, 404);
    assert.equal((await get("/nihongo/missing")).status, 500);
    rmdirSync(path.join(root, "404.html"));
    writeFileSync(path.join(root, "404.html"), "Preview not found");
    assert.deepEqual(await get("/nihongo/missing"), { status: 404, body: "Preview not found" });
    unlinkSync(path.join(root, "404.html"));
    assert.deepEqual(await get("/nihongo/missing"), { status: 404, body: "Not found" });
    assert.deepEqual(await get("/nihongo/"), { status: 200, body: "Preview home" });
    assert.deepEqual(await get("/nihongo"), { status: 200, body: "Preview home" });
    assert.ok(server.listening);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    assert.ok(root.startsWith(path.join(os.tmpdir(), "nihongo-preview-")));
    rmSync(root, { recursive: true, force: true });
  }
});
