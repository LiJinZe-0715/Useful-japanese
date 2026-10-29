import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

function collectFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
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

// --- Import graph -----------------------------------------------------------
// The tests above match import strings inside single files. The tests below
// resolve every relative import to a real file and check the resulting graph,
// so cross-module and cross-layer edges are covered as well.
//
// Every rule allows a small, commented allowlist of known debt. A new edge
// fails the suite; a repaired edge only prints a diagnostic telling you to
// delete the stale allowlist entry.

const toPosix = (file) => file.split(path.sep).join("/");
const sourceFiles = [...collectFiles("src"), ...collectFiles("app")]
  .map(toPosix)
  .filter((file) => /\.tsx?$/.test(file));
const sourceFileSet = new Set(sourceFiles);

const moduleOf = (file) => {
  const feature = file.match(/^src\/modules\/([^/]+)\//);
  if (feature) return feature[1];
  if (file.startsWith("src/bootstrap/")) return "bootstrap";
  if (file.startsWith("app/")) return "app";
  return "shared";
};

const layerOf = (file) => {
  if (file.startsWith("app/")) return "app";
  if (file.startsWith("src/bootstrap/")) return "bootstrap";
  if (file.startsWith("src/shared/")) return "shared";
  const layer = file.match(/^src\/modules\/[^/]+\/([^/]+)\//);
  return layer ? layer[1] : "other";
};

const resolveInternal = (file, specifier) => {
  const target = toPosix(path.join(path.dirname(file), specifier));
  for (const candidate of [
    target,
    `${target}.ts`,
    `${target}.tsx`,
    `${target}/index.ts`,
    `${target}/index.tsx`,
  ])
    if (sourceFileSet.has(candidate)) return candidate;
  // Generated JSON (src/generated/*.json) is not part of sourceFiles.
  return existsSync(target) && statSync(target).isFile() ? target : undefined;
};

function importsOf(file) {
  const imports = [];
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const named = line.match(/^\s*(?:import|export)\b([^"']*?)\bfrom\s*["'](\.[^"']+)["']/);
    if (named) {
      imports.push({ specifier: named[2], typeOnly: /^\s*type\b/.test(named[1]) });
      continue;
    }
    const sideEffect = line.match(/^\s*import\s*["'](\.[^"']+)["']/);
    if (sideEffect) {
      imports.push({ specifier: sideEffect[1], typeOnly: false });
      continue;
    }
    const dynamic = line.match(/\bimport\s*\(\s*["'](\.[^"']+)["']\s*\)/);
    if (dynamic) imports.push({ specifier: dynamic[1], typeOnly: false });
  }
  return imports;
}

// `import type` is erased at build time, so it creates no runtime coupling and
// is excluded from every rule below. Value imports are what the graph checks.
const resolvedImports = sourceFiles.flatMap((from) =>
  importsOf(from)
    .map((entry) => ({ from, ...entry, to: resolveInternal(from, entry.specifier) }))
    .filter((entry) => entry.to),
);
const edges = resolvedImports
  .filter((entry) => !entry.typeOnly)
  .map(({ from, to }) => ({
    from,
    to,
    fromModule: moduleOf(from),
    toModule: moduleOf(to),
    fromLayer: layerOf(from),
    toLayer: layerOf(to),
  }));

function assertNoNewLeaks(t, actual, allowed) {
  for (const entry of allowed)
    if (!actual.has(entry)) t.diagnostic(`allowlist entry is no longer needed: ${entry}`);
  assert.deepEqual(
    [...actual].filter((entry) => !allowed.has(entry)),
    [],
    "new architectural leak(s) detected",
  );
}

// Guards the guard: if import parsing ever breaks, every rule below would pass
// on an empty graph. These floors fail loudly instead.
test("import graph covers the whole source tree", () => {
  assert.ok(sourceFiles.length >= 25, `only ${sourceFiles.length} source files found`);
  assert.ok(
    resolvedImports.length >= 40,
    `only ${resolvedImports.length} internal imports resolved`,
  );
  for (const file of sourceFiles) assert.ok(!file.includes("\\"), `un-normalized path: ${file}`);
});

test("domain layers never reach outside their own domain", () => {
  assert.deepEqual(
    edges
      .filter((edge) => edge.fromLayer === "domain")
      .filter((edge) => edge.toLayer !== "domain" || edge.toModule !== edge.fromModule)
      .map((edge) => `${edge.from} -> ${edge.to}`),
    [],
  );
});

test("application layers never import UI, adapters, routes or the composition root", () => {
  assert.deepEqual(
    edges
      .filter((edge) => edge.fromLayer === "application")
      .filter((edge) =>
        ["presentation", "infrastructure", "bootstrap", "app"].includes(edge.toLayer),
      )
      .map((edge) => `${edge.from} -> ${edge.to}`),
    [],
  );
});

// Empty on purpose: runtimes are injected through context by
// src/bootstrap/*-provider.tsx, so no component needs the composition root.
// Only add an entry here for an exception that the review has accepted.
const KNOWN_PRESENTATION_TO_BOOTSTRAP = new Set([]);

test("presentation layers do not reach into the composition root", (t) => {
  const actual = new Set(
    edges
      .filter((edge) => edge.fromLayer === "presentation" && edge.toModule === "bootstrap")
      .map((edge) => edge.from),
  );
  assertNoNewLeaks(t, actual, KNOWN_PRESENTATION_TO_BOOTSTRAP);
});

// Empty on purpose: cross-module data now arrives as props or through context,
// so a component never reaches into another module's domain or application.
const KNOWN_PRESENTATION_CROSS_MODULE = new Set([]);

test("presentation layers do not import another module's domain or application", (t) => {
  const actual = new Set(
    edges
      .filter((edge) => edge.fromLayer === "presentation")
      .filter((edge) => edge.toModule !== edge.fromModule)
      .filter((edge) => edge.toLayer === "domain" || edge.toLayer === "application")
      .map((edge) => `${edge.from} -> ${edge.to}`),
  );
  assertNoNewLeaks(t, actual, KNOWN_PRESENTATION_CROSS_MODULE);
});

// Empty on purpose: backup parsing moved to the learning application layer, so
// the panel no longer calls an adapter directly.
const KNOWN_PRESENTATION_TO_INFRASTRUCTURE = new Set([]);

test("presentation layers do not import adapters", (t) => {
  const actual = new Set(
    edges
      .filter((edge) => edge.fromLayer === "presentation" && edge.toLayer === "infrastructure")
      .map((edge) => `${edge.from} -> ${edge.to}`),
  );
  assertNoNewLeaks(t, actual, KNOWN_PRESENTATION_TO_INFRASTRUCTURE);
});

// Empty on purpose: segment identity moved into speech/application, so catalog
// no longer depends on speech's queue state.
const KNOWN_APPLICATION_CROSS_MODULE = new Set([]);

test("application layers do not import another module's application layer", (t) => {
  const actual = new Set(
    edges
      .filter((edge) => edge.fromLayer === "application")
      .filter((edge) => edge.toModule !== edge.fromModule)
      .map((edge) => `${edge.from} -> ${edge.to}`),
  );
  assertNoNewLeaks(t, actual, KNOWN_APPLICATION_CROSS_MODULE);
});

// Feature modules must stay acyclic. The composition root and routes are
// excluded: bootstrap points at every module by design, so including it would
// turn each known presentation leak into one giant cycle.
const KNOWN_MODULE_CYCLES = [];

function stronglyConnectedComponents(adjacency) {
  const indices = new Map();
  const lowLinks = new Map();
  const stack = [];
  const onStack = new Set();
  const components = [];
  let nextIndex = 0;
  const visit = (node) => {
    indices.set(node, nextIndex);
    lowLinks.set(node, nextIndex);
    nextIndex++;
    stack.push(node);
    onStack.add(node);
    for (const next of adjacency.get(node) ?? []) {
      if (!indices.has(next)) {
        visit(next);
        lowLinks.set(node, Math.min(lowLinks.get(node), lowLinks.get(next)));
      } else if (onStack.has(next))
        lowLinks.set(node, Math.min(lowLinks.get(node), indices.get(next)));
    }
    if (lowLinks.get(node) !== indices.get(node)) return;
    const component = [];
    let member;
    do {
      member = stack.pop();
      onStack.delete(member);
      component.push(member);
    } while (member !== node);
    components.push(component.sort());
  };
  for (const node of adjacency.keys()) if (!indices.has(node)) visit(node);
  return components.filter((component) => component.length > 1);
}

test("feature modules only cycle where the review recorded it", (t) => {
  const adjacency = new Map();
  for (const { fromModule, toModule } of edges) {
    if (fromModule === toModule) continue;
    if (fromModule === "bootstrap" || toModule === "bootstrap") continue;
    if (fromModule === "app" || toModule === "app") continue;
    if (!adjacency.has(fromModule)) adjacency.set(fromModule, new Set());
    adjacency.get(fromModule).add(toModule);
  }
  const cycles = stronglyConnectedComponents(adjacency);
  for (const cycle of KNOWN_MODULE_CYCLES)
    if (!cycles.some((component) => component.join(",") === cycle.join(",")))
      t.diagnostic(`recorded cycle no longer exists: ${cycle.join(" <-> ")}`);
  assert.deepEqual(
    cycles.filter(
      (component) => !KNOWN_MODULE_CYCLES.some((cycle) => cycle.join(",") === component.join(",")),
    ),
    [],
    "new module cycle detected",
  );
});

test("generated content is only imported by adapters and routes", () => {
  assert.deepEqual(
    edges
      .filter((edge) => edge.to.startsWith("src/generated/"))
      .filter((edge) => !["infrastructure", "app"].includes(edge.fromLayer))
      .map((edge) => `${edge.from} -> ${edge.to}`),
    [],
  );
});

test("routes do not import adapters directly", () => {
  assert.deepEqual(
    edges
      .filter((edge) => edge.fromLayer === "app" && edge.toLayer === "infrastructure")
      .map((edge) => `${edge.from} -> ${edge.to}`),
    [],
  );
});
