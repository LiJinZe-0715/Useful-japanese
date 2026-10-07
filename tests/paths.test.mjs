import { test } from "node:test";
import assert from "node:assert/strict";
import { href, isWithinRoute } from "../src/shared/paths.ts";
test("development config uses one normalized base for navigation and assetPrefix", async () => {
  const oldBase = process.env.PAGES_BASE_PATH;
  const oldPublic = process.env.NEXT_PUBLIC_BASE_PATH;
  try {
    for (const [i, raw] of [undefined, "", "/", "/nihongo"].entries()) {
      if (raw === undefined) delete process.env.PAGES_BASE_PATH;
      else process.env.PAGES_BASE_PATH = raw;
      const { default: config } = await import(`../next.config.ts?case=${i}`);
      const expected = raw === "/nihongo" ? "/nihongo" : "";
      assert.equal(config.assetPrefix, expected);
      assert.equal(config.env.NEXT_PUBLIC_BASE_PATH, expected);
      process.env.NEXT_PUBLIC_BASE_PATH = config.env.NEXT_PUBLIC_BASE_PATH;
      for (const pathname of [
        "/",
        "/courses/life/",
        "/courses/life/n5-1/",
        "/guide/",
        "/_next/static/client.js",
        "/course-assets/life/example.txt",
      ]) {
        const link = href(pathname);
        assert.equal(link, expected + pathname);
        assert.equal(new URL(link, "http://localhost:3000/").origin, "http://localhost:3000");
      }
    }
  } finally {
    if (oldBase === undefined) delete process.env.PAGES_BASE_PATH;
    else process.env.PAGES_BASE_PATH = oldBase;
    if (oldPublic === undefined) delete process.env.NEXT_PUBLIC_BASE_PATH;
    else process.env.NEXT_PUBLIC_BASE_PATH = oldPublic;
  }
});
test("navigation matches path segments without confusing course or lesson prefixes", () => {
  const oldBase = process.env.NEXT_PUBLIC_BASE_PATH;
  try {
    for (const base of ["", "/nihongo"]) {
      process.env.NEXT_PUBLIC_BASE_PATH = base;
      for (const prefix of new Set(["", base])) {
        for (const suffix of ["", "/"]) {
          const pathname = `${prefix}/courses/audit-business/audit-60${suffix}`;
          assert.equal(isWithinRoute(pathname, "/courses/audit-business"), true);
          assert.equal(isWithinRoute(pathname, "/courses/audit-business/audit-60"), true);
          assert.equal(isWithinRoute(pathname, "/courses/audit-business/audit-6"), false);
          assert.equal(isWithinRoute(pathname, "/courses/audit"), false);
        }
        assert.equal(isWithinRoute(`${prefix}/courses/life-demo/`, "/courses/life"), false);
        assert.equal(isWithinRoute(`${prefix}/courses/life-demo/`, "/courses/life-demo"), true);
        assert.equal(isWithinRoute(`${prefix}/vocabulary/`, "/vocabulary"), true);
      }
    }
  } finally {
    if (oldBase === undefined) delete process.env.NEXT_PUBLIC_BASE_PATH;
    else process.env.NEXT_PUBLIC_BASE_PATH = oldBase;
  }
});
