import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";
import {existsSync, mkdirSync, readdirSync, readFileSync, renameSync, writeFileSync,} from "node:fs";
import path from "node:path";
import {generateContent} from "./generate-content.mjs";

generateContent();
const configuredBase =
    process.env.PAGES_BASE_PATH ??
    (process.argv.includes("--root") ? "" : `/${path.basename(process.cwd())}`);
const basePath = configuredBase === "/" ? "" : configuredBase;
if (basePath !== "" && !/^\/[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)*$/.test(basePath))
    throw Error("PAGES_BASE_PATH must be empty or an absolute path without trailing slash");
const viteCliPath = fileURLToPath(
    new URL("./bin/vite.js", import.meta.resolve("vite/package.json")),
);
const result = spawnSync(process.execPath, [viteCliPath, "build"], {
    stdio: "inherit",
    env: {...process.env, PAGES_BASE_PATH: basePath},
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
if (basePath) {
    const from = path.resolve("dist/client", basePath.slice(1), "_next");
    if (existsSync(from)) renameSync(from, path.resolve("dist/client/_next"));
}
writeFileSync("dist/client/.nojekyll", "");

// GitHub Pages serves clean URLs from directory indexes.
function createDirectoryIndexes(folder) {
    for (const entry of readdirSync(folder, {withFileTypes: true})) {
        const file = path.join(folder, entry.name);
        if (entry.isDirectory() && !["course-assets", "_next"].includes(entry.name))
            createDirectoryIndexes(file);
        else if (entry.name.endsWith(".html") && !["index.html", "404.html"].includes(entry.name)) {
            const target = file.slice(0, -5);
            mkdirSync(target, {recursive: true});
            renameSync(file, path.join(target, "index.html"));
        }
    }
}

createDirectoryIndexes(path.resolve("dist/client"));
const coursePackages = generateContent().filter((coursePackage) => coursePackage.course.enabled);
for (const route of [
    "",
    "guide",
    "vocabulary",
    ...coursePackages.flatMap((coursePackage) => [
        `courses/${coursePackage.course.id}`,
        ...coursePackage.lessons.map((lesson) => `courses/${coursePackage.course.id}/${lesson.id}`),
    ]),
]) {
    const file = path.resolve("dist/client", route, "index.html");
    if (!existsSync(file)) throw Error(`Missing exported route: ${file}`);
    const html = readFileSync(file, "utf8");
    for (const match of html.matchAll(/(?:src|href)="([^"?#]+)"/g)) {
        const url = match[1];
        if (
            (url.startsWith(`${basePath}/_next/`) || url.startsWith(`${basePath}/course-assets/`)) &&
            !existsSync(path.resolve("dist/client", url.slice(basePath.length + 1)))
        )
            throw Error(`Missing built asset ${url} in ${file}`);
    }
}
console.log(`Pages artifact: dist/client, base path: ${basePath || "/"}`);
