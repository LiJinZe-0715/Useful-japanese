import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  existsSync,
  renameSync,
  writeFileSync,
  readdirSync,
  mkdirSync,
  readFileSync,
} from "node:fs";
import path from "node:path";
import { generate } from "./content.mjs";
generate();
const configuredBase =
  process.env.PAGES_BASE_PATH ?? (process.argv.includes("--root") ? "" : "/nihongo");
const base = configuredBase === "/" ? "" : configuredBase;
if (base !== "" && !/^\/[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/.test(base))
  throw Error("PAGES_BASE_PATH must be empty or an absolute path without trailing slash");
const cli = fileURLToPath(new URL("./bin/vite.js", import.meta.resolve("vite/package.json")));
const result = spawnSync(process.execPath, [cli, "build"], {
  stdio: "inherit",
  env: { ...process.env, PAGES_BASE_PATH: base },
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
if (base) {
  const from = path.resolve("dist/client", base.slice(1), "_next");
  if (existsSync(from)) renameSync(from, path.resolve("dist/client/_next"));
}
writeFileSync("dist/client/.nojekyll", "");
// GitHub Pages serves clean URLs from directory indexes.
function directoryIndexes(folder) {
  for (const entry of readdirSync(folder, { withFileTypes: true })) {
    const file = path.join(folder, entry.name);
    if (entry.isDirectory()) directoryIndexes(file);
    else if (entry.name.endsWith(".html") && !["index.html", "404.html"].includes(entry.name)) {
      const target = file.slice(0, -5);
      mkdirSync(target, { recursive: true });
      renameSync(file, path.join(target, "index.html"));
    }
  }
}
directoryIndexes(path.resolve("dist/client"));
const packages = generate().filter((p) => p.course.enabled);
for (const route of [
  "",
  "guide",
  "vocabulary",
  ...packages.flatMap((p) => [
    `courses/${p.course.id}`,
    ...p.lessons.map((l) => `courses/${p.course.id}/${l.id}`),
  ]),
]) {
  const file = path.resolve("dist/client", route, "index.html");
  if (!existsSync(file)) throw Error(`Missing exported route: ${file}`);
  const html = readFileSync(file, "utf8");
  for (const match of html.matchAll(/(?:src|href)="([^"?#]+)"/g)) {
    const url = match[1];
    if (
      (url.startsWith(`${base}/_next/`) || url.startsWith(`${base}/course-assets/`)) &&
      !existsSync(path.resolve("dist/client", url.slice(base.length + 1)))
    )
      throw Error(`Missing built asset ${url} in ${file}`);
  }
}
console.log(`Pages artifact: dist/client, base path: ${base || "/"}`);
