import {test} from "node:test";
import assert from "node:assert/strict";
import {readdirSync, readFileSync} from "node:fs";
import path from "node:path";

function collectFiles(directory) {
    return readdirSync(directory, {withFileTypes: true}).flatMap((entry) =>
        entry.isDirectory()
            ? collectFiles(path.join(directory, entry.name))
            : [path.join(directory, entry.name)],
    );
}

test("domain modules have no React/browser/storage/transport/adapter dependencies", () => {
    for (const module of ["catalog", "learning", "speech"])
        for (const file of collectFiles(`src/modules/${module}/domain`)) {
            const source = readFileSync(file, "utf8");
            assert.doesNotMatch(
                source,
                /\b(?:window|document|localStorage|fetch|React|Audio|speechSynthesis)\b|from\s+['"][^'"]*(?:infrastructure|presentation|application)/,
                file,
            );
        }
});

test("shared code stays independent of feature modules", () => {
    for (const file of collectFiles("src/shared").filter((file) => /\.tsx?$/.test(file)))
        assert.doesNotMatch(readFileSync(file, "utf8"), /from\s+['"][^'"]*modules\//, file);
});

test("application modules do not import UI, adapters or assembly code", () => {
    for (const module of ["catalog", "learning", "speech"])
        for (const file of collectFiles(`src/modules/${module}/application`))
            assert.doesNotMatch(
                readFileSync(file, "utf8"),
                /from\s+['"][^'"]*(?:presentation|infrastructure|bootstrap|react|next\/)/,
                file,
            );
});
