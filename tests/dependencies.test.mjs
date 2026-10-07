import { test } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

test("build-tool braces preserves normal globs and rejects excessive string and AST depth", () => {
  let require = createRequire(import.meta.resolve("vinext"));
  for (const name of [
    "vite-plugin-commonjs",
    "vite-plugin-dynamic-import",
    "fast-glob",
    "micromatch",
  ])
    require = createRequire(require.resolve(name));
  const braces = require("braces");
  assert.equal(braces.compile("src/{app,modules}/*.ts"), "src/(app|modules)/*.ts");
  assert.deepEqual(braces.expand("{1..3}"), ["1", "2", "3"]);
  for (const method of ["parse", "compile", "expand", "stringify"])
    assert.throws(
      () => braces[method]("{".repeat(4000) + "a,b" + "}".repeat(4000)),
      /maximum depth/,
    );
  assert.throws(() => braces.parse("(".repeat(4000)), /maximum depth/);
  let ast = { type: "text", value: "a" };
  for (let i = 0; i < 10000; i++) ast = { type: "root", nodes: [ast] };
  for (const method of ["compile", "expand", "stringify"])
    assert.throws(() => braces[method](ast), /maximum depth/);
});
