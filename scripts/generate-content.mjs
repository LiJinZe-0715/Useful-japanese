import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv from "ajv";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const readSchemas = () =>
  Object.fromEntries(
    ["course", "lesson"].map((kind) => [
      kind,
      JSON.parse(readFileSync(path.join(projectRoot, `schemas/${kind}.schema.json`), "utf8")),
    ]),
  );
const ajv = new Ajv({ allErrors: true, strict: true });
const validateSchemas = () =>
  Object.fromEntries(
    Object.entries(readSchemas()).map(([kind, schema]) => [kind, ajv.compile(schema)]),
  );
const compareContentOrder = (left, right) =>
  left.order - right.order || (left.id < right.id ? -1 : left.id > right.id ? 1 : 0);

function readValidatedJson(file, kind, validators) {
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
          (validationError) =>
            `${file}: ${validationError.instancePath || "/"} ${validationError.message}${validationError.params.missingProperty ? ` (${validationError.params.missingProperty})` : ""}`,
        )
        .join("\n"),
    );
  return data;
}

export function discoverCourses(directory = path.join(projectRoot, "data/courses")) {
  const validators = validateSchemas();
  if (!existsSync(directory)) return [];
  const coursePackages = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    const folder = path.join(directory, entry.name),
      file = path.join(folder, "course.json");
    if (!existsSync(file)) throw Error(`${file}: / missing course.json`);
    const course = readValidatedJson(file, "course", validators);
    const assets = path.join(folder, "assets");
    if (existsSync(assets)) {
      if (lstatSync(assets).isSymbolicLink()) throw Error(`${assets}: symlinks not allowed`);
      const checkAssets = (directory) => {
        for (const child of readdirSync(directory, { withFileTypes: true })) {
          const target = path.join(directory, child.name);
          if (child.isSymbolicLink()) throw Error(`${target}: symlinks not allowed`);
          if (child.isDirectory()) checkAssets(target);
        }
      };
      checkAssets(assets);
    }
    const fail = (filePath, field, message) => {
      throw Error(`${filePath}: ${field} ${message}`);
    };
    if (course.id !== entry.name) fail(file, "/id", "must match folder");
    if (course.learningMode === "life" && !course.levels.length)
      fail(file, "/levels", "life requires N5/N4/N3 levels");
    const collectUniqueIds = (items, filePath, field) => {
      const seen = new Set();
      for (const [i, item] of items.entries()) {
        if (seen.has(item.id)) fail(filePath, `${field}/${i}/id`, `duplicate ${item.id}`);
        seen.add(item.id);
      }
      return seen;
    };
    const units = collectUniqueIds(course.units ?? [], file, "/units");
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
    for (const { file: lessonFile, chapterId } of lessonFiles) {
      const name = path.basename(lessonFile, ".json"),
        lesson = readValidatedJson(lessonFile, "lesson", validators);
      if (chapterId && lesson.unitId !== chapterId)
        fail(lessonFile, "/unitId", "must match chapter folder");
      if (
        lesson.id !== name &&
        (!chapterId ||
          (lesson.id !== `${chapterId}-${name}` && name !== `${chapterId}-${lesson.id}`))
      )
        fail(lessonFile, "/id", "must match filename or chapter-prefixed filename");
      if (lesson.unitId && !units.has(lesson.unitId)) fail(lessonFile, "/unitId", "unknown unit");
      if (lesson.level && !course.levels.includes(lesson.level))
        fail(lessonFile, "/level", "not declared in course.levels");
      if (course.learningMode === "life" && lesson.kind === "scene" && !lesson.level)
        fail(lessonFile, "/level", "life scene lesson requires level");
      const speakers = collectUniqueIds(lesson.speakers ?? [], lessonFile, "/speakers");
      if (lesson.learnerSpeakerId && !speakers.has(lesson.learnerSpeakerId))
        fail(lessonFile, "/learnerSpeakerId", "unknown learner speaker");
      const dialogues = collectUniqueIds(lesson.dialogues ?? [], lessonFile, "/dialogues");
      const lineIds = new Set();
      for (const [dialogueIndex, dialogue] of (lesson.dialogues ?? []).entries()) {
        for (const [lineIndex, line] of dialogue.lines.entries()) {
          if (lineIds.has(line.id))
            fail(
              lessonFile,
              `/dialogues/${dialogueIndex}/lines/${lineIndex}/id`,
              "line ID must be unique within lesson",
            );
          lineIds.add(line.id);
          if (!speakers.has(line.speakerId))
            fail(
              lessonFile,
              `/dialogues/${dialogueIndex}/lines/${lineIndex}/speakerId`,
              "unknown speaker",
            );
        }
      }
      if (lesson.dialogues?.length) {
        for (const [dialogueIndex, dialogue] of lesson.dialogues.entries()) {
          if (!dialogue.lines.some((line) => line.speakerId === lesson.learnerSpeakerId))
            fail(
              lessonFile,
              `/dialogues/${dialogueIndex}/lines`,
              "dialogue must include lines spoken by learnerSpeakerId",
            );
        }
      }
      const validateDialogueReference = (reference, field) => {
        const dialogue = (lesson.dialogues ?? []).find(
          (dialogue) => dialogue.id === reference.dialogueId,
        );
        if (!dialogue) fail(lessonFile, `${field}/dialogueId`, "unknown dialogue");
        if (reference.lineId && !dialogue.lines.some((line) => line.id === reference.lineId))
          fail(lessonFile, `${field}/lineId`, "line not in referenced dialogue");
        for (const [i, referencedLineId] of (reference.lineIds ?? []).entries())
          if (!dialogue.lines.some((line) => line.id === referencedLineId))
            fail(lessonFile, `${field}/lineIds/${i}`, "line not in referenced dialogue");
        if (reference.lineIds && new Set(reference.lineIds).size !== reference.lineIds.length)
          fail(lessonFile, `${field}/lineIds`, "duplicate line");
      };
      for (const field of [
        "materials",
        "vocabulary",
        "expressions",
        "grammar",
        "shadowing",
        "homework",
      ]) {
        collectUniqueIds(lesson[field] ?? [], lessonFile, `/${field}`);
        for (const [i, entry] of (lesson[field] ?? []).entries()) {
          if (entry.source) validateDialogueReference(entry.source, `/${field}/${i}/source`);
          if (field === "shadowing") validateDialogueReference(entry, `/${field}/${i}`);
          if (field === "homework" && !entry.answers.length)
            fail(lessonFile, `/${field}/${i}/answers`, "at least one answer required");
          if (field === "materials") {
            if (
              entry.asset &&
              (!/^assets\/[a-zA-Z0-9._/-]+$/.test(entry.asset) ||
                entry.asset.split("/").some((segment) => segment === ".." || segment === ".") ||
                !existsSync(path.join(folder, entry.asset)) ||
                !statSync(path.join(folder, entry.asset)).isFile() ||
                !realpathSync(path.join(folder, entry.asset)).startsWith(
                  realpathSync(path.join(folder, "assets")) + path.sep,
                ))
            )
              fail(
                lessonFile,
                `/${field}/${i}/asset`,
                "must reference an existing file under assets/",
              );
            for (const [blockIndex, block] of entry.blocks.entries())
              if (
                block.type === "table" &&
                block.rows.some((row) => row.length !== block.headers.length)
              )
                fail(
                  lessonFile,
                  `/${field}/${i}/blocks/${blockIndex}/rows`,
                  "table row width must equal headers",
                );
          }
        }
      }
      if (lesson.kind === "scene" && (!lesson.scene || !dialogues.size))
        fail(lessonFile, "/kind", "scene requires scene and nonempty dialogues");
      if (lesson.kind === "preparation" && !lesson.materials?.length)
        fail(lessonFile, "/materials", "preparation requires materials");
      lessons.push(lesson);
    }
    collectUniqueIds(lessons, file, "/lessons");
    if (course.guide) {
      const lessonIds = new Set(lessons.map((lesson) => lesson.id));
      for (const [i, track] of course.guide.tracks.entries())
        if (!lessonIds.has(track.lessonId))
          fail(file, `/guide/tracks/${i}/lessonId`, "unknown lesson");
      if (course.guide.footnote.split("{link}").length !== 2)
        fail(file, "/guide/footnote", "must contain exactly one {link} placeholder");
    }
    coursePackages.push({ course, lessons: lessons.sort(compareContentOrder) });
  }
  return coursePackages.sort((left, right) => compareContentOrder(left.course, right.course));
}

function schemaToTypeScript(schema) {
  if (schema.const !== undefined) return JSON.stringify(schema.const);
  if (schema.enum) return schema.enum.map((schemaValue) => JSON.stringify(schemaValue)).join(" | ");
  if (schema.oneOf) return schema.oneOf.map(schemaToTypeScript).join(" | ");
  if (schema.type === "array") return `(${schemaToTypeScript(schema.items)})[]`;
  if (schema.type === "object")
    return `{ ${Object.entries(schema.properties)
      .map(
        ([key, schemaValue]) =>
          `${JSON.stringify(key)}${schema.required?.includes(key) ? "" : "?"}: ${schemaToTypeScript(schemaValue)}`,
      )
      .join("; ")} }`;
  return schema.type === "integer" ? "number" : schema.type;
}

export function generateContent() {
  const schemas = readSchemas();
  const source = path.join(
    projectRoot,
    process.env.NIHONGO_TEST_FIXTURES === "1"
      ? "tests/fixtures/courses"
      : process.env.NIHONGO_TEST_FIXTURES === "empty"
        ? "tests/fixtures/empty-courses"
        : "data/courses",
  );
  const coursePackages = discoverCourses(source);
  mkdirSync(path.join(projectRoot, "src/generated"), { recursive: true });
  const writeGeneratedFile = (name, value) => {
    const target = path.join(projectRoot, name);
    mkdirSync(path.dirname(target), { recursive: true });
    if (!existsSync(target) || readFileSync(target, "utf8") !== value) writeFileSync(target, value);
  };
  writeGeneratedFile("src/generated/catalog.json", JSON.stringify(coursePackages, null, 2) + "\n");
  writeGeneratedFile(
    "src/generated/guide.json",
    JSON.stringify(readFileSync(path.join(projectRoot, "docs/content-format.md"), "utf8")) + "\n",
  );
  writeGeneratedFile(
    "src/modules/catalog/domain/content.ts",
    `// Generated from schemas/*.schema.json. Edit schemas, then run validate:content.\nexport type Course = ${schemaToTypeScript(schemas.course)};\nexport type Lesson = ${schemaToTypeScript(schemas.lesson)};\nexport type CoursePackage = { course: Course; lessons: Lesson[] };\n`,
  );
  const copyAssets = (from, to) => {
    if (lstatSync(from).isSymbolicLink()) throw Error(`${from}: symlinks not allowed`);
    mkdirSync(to, { recursive: true });
    for (const entry of readdirSync(from, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) throw Error(`${from}/${entry.name}: symlinks not allowed`);
      if (entry.isDirectory()) copyAssets(path.join(from, entry.name), path.join(to, entry.name));
      else copyFileSync(path.join(from, entry.name), path.join(to, entry.name));
    }
  };
  const assetOutput = path.resolve(projectRoot, "public/course-assets");
  if (!assetOutput.startsWith(path.resolve(projectRoot) + path.sep))
    throw Error("Asset output escapes project");
  rmSync(assetOutput, { recursive: true, force: true });
  for (const { course } of coursePackages.filter((coursePackage) => coursePackage.course.enabled)) {
    const from = path.join(source, course.id, "assets");
    if (existsSync(from))
      copyAssets(from, path.join(projectRoot, "public/course-assets", course.id));
  }
  // The glossary is split per unit, so cross-course search needs an index that no
  // single page carries. It is fetched on first keystroke only, which keeps every
  // page small while preserving the "find this word anywhere" workflow.
  const vocabularySearch = [];
  for (const { course, lessons } of coursePackages) {
    if (!course.enabled || course.learningMode !== "business") continue;
    for (const lesson of lessons) {
      for (const word of lesson.vocabulary ?? []) {
        const extras = [
          word.usage ?? "",
          ...(word.collocations ?? []),
          ...(word.examples ?? []).flatMap((example) => [example.ja, example.zh]),
        ].filter(Boolean);
        vocabularySearch.push({
          w: word.word,
          r: word.reading,
          m: word.meaning,
          c: course.id,
          l: lesson.id,
          t: lesson.unitId || "all",
          n: lesson.title,
          s: extras.join(" "),
        });
      }
    }
  }
  writeGeneratedFile("public/vocabulary-search.json", JSON.stringify(vocabularySearch) + "\n");
  console.log(
    `Content validated: ${coursePackages.length} course packages (${coursePackages.filter((coursePackage) => coursePackage.course.enabled).length} enabled).`,
  );
  return coursePackages;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv.includes("--validate")) {
    discoverCourses();
    discoverCourses(path.join(projectRoot, "docs/examples/course-package"));
    discoverCourses(path.join(projectRoot, "tests/fixtures/courses"));
  }
  generateContent();
}
