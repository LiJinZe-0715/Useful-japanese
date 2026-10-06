import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
function files(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(path.join(dir, e.name)) : [path.join(dir, e.name)],
  );
}
test("domain modules have no React/browser/storage/transport/adapter dependencies", () => {
  for (const module of ["catalog", "learning", "speech"])
    for (const f of files(`src/modules/${module}/domain`)) {
      const source = readFileSync(f, "utf8");
      assert.doesNotMatch(
        source,
        /\b(?:window|document|localStorage|fetch|React|Audio|speechSynthesis)\b|from\s+['"][^'"]*(?:infrastructure|presentation|application)/,
        f,
      );
    }
});

test("shared code stays independent of feature modules", () => {
  for (const f of files("src/shared").filter((file) => /\.tsx?$/.test(file)))
    assert.doesNotMatch(readFileSync(f, "utf8"), /from\s+['"][^'"]*modules\//, f);
});

test("application modules do not import UI, adapters or assembly code", () => {
  for (const module of ["catalog", "learning", "speech"])
    for (const f of files(`src/modules/${module}/application`))
      assert.doesNotMatch(
        readFileSync(f, "utf8"),
        /from\s+['"][^'"]*(?:presentation|infrastructure|bootstrap|react|next\/)/,
        f,
      );
});
