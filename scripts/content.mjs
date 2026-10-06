import {
  readFileSync,
  readdirSync,
  existsSync,
  mkdirSync,
  writeFileSync,
  copyFileSync,
  rmSync,
  statSync,
  realpathSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";
const root = fileURLToPath(new URL("../", import.meta.url));
const readSchemas = () =>
  Object.fromEntries(
    ["course", "lesson"].map((k) => [
      k,
      JSON.parse(readFileSync(path.join(root, `schemas/${k}.schema.json`), "utf8")),
    ]),
  );
const ajv = new Ajv({ allErrors: true, strict: true });
const validateSchemas = () =>
  Object.fromEntries(Object.entries(readSchemas()).map(([k, v]) => [k, ajv.compile(v)]));
const compare = (a, b) => a.order - b.order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
function read(file, kind, validators) {
  let data;
  try {
    data = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    throw Error(`${file}: JSON: ${error.message}`);
  }
  if (!validators[kind](data))
    throw Error(
      validators[kind].errors
        .map(
          (e) =>
            `${file}: ${e.instancePath || "/"} ${e.message}${e.params.missingProperty ? ` (${e.params.missingProperty})` : ""}`,
        )
        .join("\n"),
    );
  return data;
}
export function discover(directory = path.join(root, "data/courses")) {
  const validators = validateSchemas();
  if (!existsSync(directory)) return [];
  const packages = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    const folder = path.join(directory, entry.name),
      file = path.join(folder, "course.json");
    if (!existsSync(file)) throw Error(`${file}: / missing course.json`);
    const course = read(file, "course", validators);
    const fail = (f, field, message) => {
      throw Error(`${f}: ${field} ${message}`);
    };
    if (course.id !== entry.name) fail(file, "/id", "must match folder");
    if (course.learningMode === "life" && !course.levels.length)
      fail(file, "/levels", "life requires N5/N4/N3 levels");
    const unique = (items, f, field) => {
      const seen = new Set();
      for (const [i, v] of items.entries()) {
        if (seen.has(v.id)) fail(f, `${field}/${i}/id`, `duplicate ${v.id}`);
        seen.add(v.id);
      }
      return seen;
    };
    const units = unique(course.units ?? [], file, "/units");
    if (new Set(course.levels).size !== course.levels.length)
      fail(file, "/levels", "duplicate level");
    const lessons = [];
    const lessonFolder = path.join(folder, "lessons");
    const lessonFiles = [];
    for (const entry of existsSync(lessonFolder)
      ? readdirSync(lessonFolder, { withFileTypes: true })
      : []) {
      const target = path.join(lessonFolder, entry.name);
      if (entry.isDirectory()) {
        if (!units.has(entry.name))
          fail(target, "/unitId", "chapter folder not declared in course.units");
        for (const child of readdirSync(target, { withFileTypes: true })) {
          if (child.isDirectory())
            fail(path.join(target, child.name), "/", "only one chapter folder level is supported");
          if (child.isFile() && child.name.endsWith(".json"))
            lessonFiles.push({ file: path.join(target, child.name), chapterId: entry.name });
        }
      } else if (entry.isFile() && entry.name.endsWith(".json")) {
        lessonFiles.push({ file: target });
      }
    }
    for (const { file: lf, chapterId } of lessonFiles) {
      const name = path.basename(lf, ".json"),
        l = read(lf, "lesson", validators);
      if (chapterId && l.unitId !== chapterId) fail(lf, "/unitId", "must match chapter folder");
      if (
        l.id !== name &&
        (!chapterId || (l.id !== `${chapterId}-${name}` && name !== `${chapterId}-${l.id}`))
      )
        fail(lf, "/id", "must match filename or chapter-prefixed filename");
      if (l.unitId && !units.has(l.unitId)) fail(lf, "/unitId", "unknown unit");
      if (l.level && !course.levels.includes(l.level))
        fail(lf, "/level", "not declared in course.levels");
      if (course.learningMode === "life" && l.kind === "scene" && !l.level)
        fail(lf, "/level", "life scene lesson requires level");
      const speakers = unique(l.speakers ?? [], lf, "/speakers");
      if (l.learnerSpeakerId && !speakers.has(l.learnerSpeakerId))
        fail(lf, "/learnerSpeakerId", "unknown learner speaker");
      const dialogues = unique(l.dialogues ?? [], lf, "/dialogues");
      const lineIds = new Set();
      for (const [di, d] of (l.dialogues ?? []).entries()) {
        for (const [li, line] of d.lines.entries()) {
          if (lineIds.has(line.id))
            fail(lf, `/dialogues/${di}/lines/${li}/id`, "line ID must be unique within lesson");
          lineIds.add(line.id);
          if (!speakers.has(line.speakerId))
            fail(lf, `/dialogues/${di}/lines/${li}/speakerId`, "unknown speaker");
        }
      }
      if (l.dialogues?.length) {
        for (const [di, dialogue] of l.dialogues.entries()) {
          if (!dialogue.lines.some((line) => line.speakerId === l.learnerSpeakerId))
            fail(
              lf,
              `/dialogues/${di}/lines`,
              "dialogue must include lines spoken by learnerSpeakerId",
            );
        }
      }
      const checkRef = (r, field) => {
        const d = (l.dialogues ?? []).find((d) => d.id === r.dialogueId);
        if (!d) fail(lf, `${field}/dialogueId`, "unknown dialogue");
        if (r.lineId && !d.lines.some((v) => v.id === r.lineId))
          fail(lf, `${field}/lineId`, "line not in referenced dialogue");
        for (const [i, line] of (r.lineIds ?? []).entries())
          if (!d.lines.some((v) => v.id === line))
            fail(lf, `${field}/lineIds/${i}`, "line not in referenced dialogue");
        if (r.lineIds && new Set(r.lineIds).size !== r.lineIds.length)
          fail(lf, `${field}/lineIds`, "duplicate line");
      };
      for (const field of [
        "materials",
        "vocabulary",
        "expressions",
        "grammar",
        "shadowing",
        "homework",
      ]) {
        unique(l[field] ?? [], lf, `/${field}`);
        for (const [i, v] of (l[field] ?? []).entries()) {
          if (v.source) checkRef(v.source, `/${field}/${i}/source`);
          if (field === "shadowing") checkRef(v, `/${field}/${i}`);
          if (field === "homework" && !v.answers.length)
            fail(lf, `/${field}/${i}/answers`, "at least one answer required");
          if (field === "materials") {
            if (
              v.asset &&
              (!/^assets\/[a-zA-Z0-9._/-]+$/.test(v.asset) ||
                v.asset.split("/").some((p) => p === ".." || p === ".") ||
                !existsSync(path.join(folder, v.asset)) ||
                !statSync(path.join(folder, v.asset)).isFile() ||
                !realpathSync(path.join(folder, v.asset)).startsWith(
                  realpathSync(path.join(folder, "assets")) + path.sep,
                ))
            )
              fail(lf, `/${field}/${i}/asset`, "must reference an existing file under assets/");
            for (const [bi, b] of v.blocks.entries())
              if (b.type === "table" && b.rows.some((r) => r.length !== b.headers.length))
                fail(lf, `/${field}/${i}/blocks/${bi}/rows`, "table row width must equal headers");
          }
        }
      }
      if (l.kind === "scene" && (!l.scene || !dialogues.size))
        fail(lf, "/kind", "scene requires scene and nonempty dialogues");
      if (l.kind === "preparation" && !l.materials?.length)
        fail(lf, "/materials", "preparation requires materials");
      lessons.push(l);
    }
    unique(lessons, file, "/lessons");
    packages.push({ course, lessons: lessons.sort(compare) });
  }
  return packages.sort((a, b) => compare(a.course, b.course));
}
function type(schema) {
  if (schema.const !== undefined) return JSON.stringify(schema.const);
  if (schema.enum) return schema.enum.map((v) => JSON.stringify(v)).join(" | ");
  if (schema.oneOf) return schema.oneOf.map(type).join(" | ");
  if (schema.type === "array") return `(${type(schema.items)})[]`;
  if (schema.type === "object")
    return `{ ${Object.entries(schema.properties)
      .map(
        ([key, v]) =>
          `${JSON.stringify(key)}${schema.required?.includes(key) ? "" : "?"}: ${type(v)}`,
      )
      .join("; ")} }`;
  return schema.type === "integer" ? "number" : schema.type;
}
export function generate() {
  const schemas = readSchemas();
  const source = path.join(
    root,
    process.env.NIHONGO_TEST_FIXTURES === "1"
      ? "tests/fixtures/courses"
      : process.env.NIHONGO_TEST_FIXTURES === "empty"
        ? "tests/fixtures/empty-courses"
        : "data/courses",
  );
  const packages = discover(source);
  mkdirSync(path.join(root, "src/generated"), { recursive: true });
  const output = (name, value) => {
    const target = path.join(root, name);
    mkdirSync(path.dirname(target), { recursive: true });
    if (!existsSync(target) || readFileSync(target, "utf8") !== value) writeFileSync(target, value);
  };
  output("src/generated/catalog.json", JSON.stringify(packages, null, 2) + "\n");
  output(
    "src/generated/guide.json",
    JSON.stringify(readFileSync(path.join(root, "docs/content-format.md"), "utf8")) + "\n",
  );
  output(
    "src/modules/catalog/domain/content.ts",
    `// Generated from schemas/*.schema.json. Edit schemas, then run validate:content.\nexport type Course = ${type(schemas.course)};\nexport type Lesson = ${type(schemas.lesson)};\nexport type CoursePackage = { course: Course; lessons: Lesson[] };\n`,
  );
  const copyAssets = (from, to) => {
    mkdirSync(to, { recursive: true });
    for (const e of readdirSync(from, { withFileTypes: true })) {
      if (e.isSymbolicLink()) throw Error(`${from}/${e.name}: symlinks not allowed`);
      if (e.isDirectory()) copyAssets(path.join(from, e.name), path.join(to, e.name));
      else copyFileSync(path.join(from, e.name), path.join(to, e.name));
    }
  };
  const assetOutput = path.resolve(root, "public/course-assets");
  if (!assetOutput.startsWith(path.resolve(root) + path.sep))
    throw Error("Asset output escapes project");
  rmSync(assetOutput, { recursive: true, force: true });
  for (const { course } of packages.filter((p) => p.course.enabled)) {
    const from = path.join(source, course.id, "assets");
    if (existsSync(from)) copyAssets(from, path.join(root, "public/course-assets", course.id));
  }
  console.log(
    `Content validated: ${packages.length} course packages (${packages.filter((p) => p.course.enabled).length} enabled).`,
  );
  return packages;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes("--validate")) {
    discover();
    discover(path.join(root, "docs/examples/course-package"));
    discover(path.join(root, "tests/fixtures/courses"));
  }
  generate();
}
