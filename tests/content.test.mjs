import { test } from "node:test";
import assert from "node:assert/strict";
import {
  mkdtempSync,
  cpSync,
  readFileSync,
  writeFileSync,
  rmSync,
  mkdirSync,
  renameSync,
} from "node:fs";
import path from "node:path";
import os from "node:os";
import { discover } from "../scripts/content.mjs";
import { lessonGroups, summarizeLessons } from "../src/modules/catalog/application/catalog.ts";
const fixtures = path.resolve("tests/fixtures/courses");
test("directory summaries contain only catalog fields, leaving full lesson content on the server", () => {
  const p = discover(fixtures).find((p) => p.course.id === "legal-business");
  const summary = summarizeLessons(p.lessons)[0];
  assert.deepEqual(Object.keys(summary).sort(), ["id", "level", "order", "title", "unitId"]);
  assert.equal(summary.id, p.lessons[0].id);
  assert.equal(summary.order, p.lessons[0].order);
  assert.ok(p.lessons[0].dialogues.length);
  assert.ok(p.lessons[0].homework.length);
  assert.doesNotMatch(JSON.stringify(summary), /確認します|dialogues|vocabulary|grammar|homework/);
});
test("chapter tree separates sections, sorts chapters and lessons, and preserves ungrouped courses", () => {
  const course = {
    units: [
      { id: "n3", title: "N3", order: 3 },
      { id: "pre", title: "准备篇", order: 0 },
      { id: "n4", title: "N4", order: 2 },
      { id: "n5", title: "N5", order: 1 },
    ],
  };
  const lessons = [
    { id: "n3-1", unitId: "n3", order: 301 },
    { id: "n5-2", unitId: "n5", order: 102 },
    { id: "kana", unitId: "pre", order: 1 },
    { id: "n4-1", unitId: "n4", order: 201 },
    { id: "n5-1", unitId: "n5", order: 101 },
  ];
  const before = structuredClone({ course, lessons });
  assert.deepEqual(
    lessonGroups(course, lessons).map((group) => [group.id, group.lessons.map((l) => l.id)]),
    [
      ["pre", ["kana"]],
      ["n5", ["n5-1", "n5-2"]],
      ["n4", ["n4-1"]],
      ["n3", ["n3-1"]],
    ],
  );
  assert.deepEqual({ course, lessons }, before);
  const ungrouped = { id: "intro", order: 0 };
  assert.deepEqual(lessonGroups({}, [ungrouped]), [
    { id: "", title: "课次", lessons: [ungrouped] },
  ]);
  assert.deepEqual(lessonGroups(course, [...lessons, ungrouped]).at(-1).lessons, [ungrouped]);
});
test("production directory is empty, examples are separate, business/life/preparation discovered deterministically", () => {
  assert.deepEqual(discover(path.resolve("tests/fixtures/empty-courses")), []);
  assert.ok(Array.isArray(discover()));
  assert.equal(discover(path.resolve("docs/examples/course-package")).length, 1);
  const p = discover(fixtures);
  assert.deepEqual(
    p.map((p) => p.course.id),
    ["legal-business", "life-demo"],
  );
  assert.deepEqual(
    p[1].lessons.map((l) => l.id),
    ["preparation", "example-scene"],
  );
  assert.equal(p[0].course.learningMode, "business");
  assert.equal(p[1].lessons[0].materials[0].blocks[1].type, "table");
});
function sandbox(fn) {
  const root = mkdtempSync(path.join(os.tmpdir(), "nihongo-test-"));
  try {
    cpSync(fixtures, root, { recursive: true });
    fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("every dialogue variant references one learner by stable ID with actual lines", () =>
  sandbox((root) => {
    const file = path.join(root, "legal-business/lessons/example-scene.json");
    const original = JSON.parse(readFileSync(file));
    for (const [mutate, regex] of [
      [(lesson) => delete lesson.learnerSpeakerId, /required property.*learnerSpeakerId/],
      [
        (lesson) => (lesson.learnerSpeakerId = "missing"),
        /\/learnerSpeakerId unknown learner speaker/,
      ],
      [
        (lesson) => (lesson.dialogues[1].lines[0].speakerId = "colleague"),
        /\/dialogues\/1\/lines dialogue must include lines spoken by/,
      ],
      [
        (lesson) => (lesson.dialogues[2].lines = []),
        /\/dialogues\/2\/lines dialogue must include lines spoken by/,
      ],
    ]) {
      const lesson = structuredClone(original);
      mutate(lesson);
      writeFileSync(file, JSON.stringify(lesson));
      assert.throws(() => discover(root), regex);
    }
    writeFileSync(file, JSON.stringify(original));
    assert.equal(discover(root).length, 2);
    const renamed = structuredClone(original);
    renamed.speakers.forEach((speaker) => (speaker.name = "同名角色"));
    renamed.speakers.reverse();
    writeFileSync(file, JSON.stringify(renamed));
    assert.equal(discover(root)[0].lessons[0].learnerSpeakerId, original.learnerSpeakerId);
    for (const { lessons } of discover()) {
      for (const lesson of lessons.filter((lesson) => lesson.dialogues?.length)) {
        const learners = lesson.speakers.filter(
          (speaker) => speaker.id === lesson.learnerSpeakerId,
        );
        assert.equal(learners.length, 1, lesson.id);
        for (const dialogue of lesson.dialogues)
          assert.ok(
            dialogue.lines.some((line) => line.speakerId === learners[0].id),
            `${lesson.id}:${dialogue.id}`,
          );
      }
    }
  }));
test("life preparation is ungraded while scene lessons still require a declared level", () =>
  sandbox((root) => {
    const course = discover(root).find((p) => p.course.id === "life-demo");
    assert.equal(course.lessons.find((l) => l.kind === "preparation").level, undefined);
    const file = path.join(root, "life-demo/lessons/example-scene.json");
    const lesson = JSON.parse(readFileSync(file));
    delete lesson.level;
    writeFileSync(file, JSON.stringify(lesson));
    assert.throws(
      () => discover(root),
      /example-scene.json: \/level life scene lesson requires level/,
    );
    lesson.level = "N3";
    writeFileSync(file, JSON.stringify(lesson));
    assert.throws(() => discover(root), /\/level not declared in course.levels/);
  }));
test("chapter folders discover numbered sections and validate folder references", () =>
  sandbox((root) => {
    const folder = path.join(root, "life-demo"),
      manifest = path.join(folder, "course.json"),
      course = JSON.parse(readFileSync(manifest));
    course.units = [{ id: "n5", title: "N5", order: 1 }];
    writeFileSync(manifest, JSON.stringify(course));
    mkdirSync(path.join(folder, "lessons/n5"));
    const oldFile = path.join(folder, "lessons/example-scene.json"),
      file = path.join(folder, "lessons/n5/1.json"),
      lesson = JSON.parse(readFileSync(oldFile));
    lesson.id = "n5-1";
    lesson.unitId = "n5";
    writeFileSync(oldFile, JSON.stringify(lesson));
    renameSync(oldFile, file);
    assert.deepEqual(
      discover(root)[1].lessons.map((l) => l.id),
      ["preparation", "n5-1"],
    );
    lesson.unitId = "missing";
    writeFileSync(file, JSON.stringify(lesson));
    assert.throws(() => discover(root), /n5[\\/]1.json: \/unitId must match chapter folder/);
    lesson.unitId = "n5";
    lesson.id = "wrong";
    writeFileSync(file, JSON.stringify(lesson));
    assert.throws(() => discover(root), /n5[\\/]1.json: \/id must match filename/);
  }));
test("adding only a legal course folder requires no registry/core changes", () =>
  sandbox((root) => {
    const copy = path.join(root, "another-legal");
    cpSync(path.join(root, "legal-business"), copy, { recursive: true });
    const f = path.join(copy, "course.json");
    const v = JSON.parse(readFileSync(f));
    v.id = "another-legal";
    writeFileSync(f, JSON.stringify(v));
    assert.deepEqual(
      discover(root).map((p) => p.course.id),
      ["another-legal", "legal-business", "life-demo"],
    );
  }));
test("invalid JSON and references identify exact file and field", () =>
  sandbox((root) => {
    const file = path.join(root, "legal-business/lessons/example-scene.json");
    const value = JSON.parse(readFileSync(file));
    value.shadowing[0].lineIds = ["missing"];
    writeFileSync(file, JSON.stringify(value));
    assert.throws(() => discover(root), /example-scene.json: \/shadowing\/0\/lineIds\/0/);
    value.shadowing[0].lineIds = ["line-one"];
    value.dialogues[0].lines[0].speakerId = "missing";
    writeFileSync(file, JSON.stringify(value));
    assert.throws(() => discover(root), /\/dialogues\/0\/lines\/0\/speakerId/);
    writeFileSync(file, "{bad");
    assert.throws(() => discover(root), /example-scene.json: JSON/);
  }));
test("schema rejects unknown fields, wrong IDs, invalid units and malformed tables", () =>
  sandbox((root) => {
    const file = path.join(root, "life-demo/lessons/preparation.json"),
      original = JSON.parse(readFileSync(file));
    for (const [mutate, regex] of [
      [(v) => (v.html = "<b>x</b>"), /additional properties/],
      [(v) => (v.id = "wrong"), /\/id/],
      [(v) => (v.unitId = "missing"), /\/unitId/],
      [(v) => (v.materials[0].blocks[1].rows = [["a"]]), /\/rows/],
    ]) {
      const v = structuredClone(original);
      mutate(v);
      writeFileSync(file, JSON.stringify(v));
      assert.throws(() => discover(root), regex);
    }
  }));
test("missing folder manifests fail and disabled courses still validate", () =>
  sandbox((root) => {
    mkdirSync(path.join(root, "missing"));
    assert.throws(() => discover(root), /missing.*course.json/);
  }));
for (const level of ["N2", "N1"])
  test(`${level} sections and grammar follow v1 and declared course levels`, () =>
    sandbox((root) => {
      const unitId = level.toLowerCase();
      const folder = path.join(root, "life-demo");
      const manifest = path.join(folder, "course.json");
      const course = JSON.parse(readFileSync(manifest));
      course.levels.push(level);
      course.units = [{ id: unitId, title: level, order: 4 }];
      writeFileSync(manifest, JSON.stringify(course));
      const original = path.join(folder, "lessons/example-scene.json");
      const lesson = JSON.parse(readFileSync(original));
      lesson.id = `${unitId}-1`;
      lesson.unitId = unitId;
      lesson.level = level;
      lesson.grammar = [
        {
          id: "contrast",
          pattern: "〜にもかかわらず",
          level: level,
          meaning: "尽管如此",
          connection: "普通形＋にもかかわらず",
          notes: [],
          examples: [
            { ja: "雨にもかかわらず、参加者は集まりました。", zh: "尽管下雨，参与者仍聚集了。" },
          ],
        },
      ];
      mkdirSync(path.join(folder, `lessons/${unitId}`));
      const file = path.join(folder, `lessons/${unitId}/1.json`);
      writeFileSync(original, JSON.stringify(lesson));
      renameSync(original, file);
      const found = discover(root).find((p) => p.course.id === "life-demo");
      assert.equal(found.lessons.find((l) => l.id === `${unitId}-1`).grammar[0].level, level);
      assert.deepEqual(
        lessonGroups(found.course, summarizeLessons(found.lessons))
          .find((g) => g.id === unitId)
          .lessons.map((l) => l.id),
        [`${unitId}-1`],
      );
      course.levels = ["N5"];
      writeFileSync(manifest, JSON.stringify(course));
      assert.throws(
        () => discover(root),
        new RegExp(`${unitId}[\\\\/]1.json: /level not declared in course.levels`),
      );
    }));
test("chapter filename prefixes preserve stable lesson IDs and reject unrelated names", () =>
  sandbox((root) => {
    const folder = path.join(root, "life-demo");
    const manifest = path.join(folder, "course.json");
    const course = JSON.parse(readFileSync(manifest));
    course.units = [
      { id: "pre", title: "准备篇", order: 0 },
      { id: "n5", title: "N5", order: 1 },
    ];
    writeFileSync(manifest, JSON.stringify(course));
    const preparation = path.join(folder, "lessons/preparation.json");
    const scene = path.join(folder, "lessons/example-scene.json");
    const prep = JSON.parse(readFileSync(preparation));
    const lesson = JSON.parse(readFileSync(scene));
    prep.unitId = "pre";
    lesson.id = "n5-1";
    lesson.unitId = "n5";
    writeFileSync(preparation, JSON.stringify(prep));
    writeFileSync(scene, JSON.stringify(lesson));
    mkdirSync(path.join(folder, "lessons/pre"));
    mkdirSync(path.join(folder, "lessons/n5"));
    const prepFile = path.join(folder, "lessons/pre/pre-preparation.json");
    const sceneFile = path.join(folder, "lessons/n5/n5-1.json");
    renameSync(preparation, prepFile);
    renameSync(scene, sceneFile);
    const found = discover(root).find((p) => p.course.id === "life-demo");
    assert.deepEqual(found.lessons, [prep, lesson]);
    const wrongFile = path.join(folder, "lessons/pre/other-preparation.json");
    renameSync(prepFile, wrongFile);
    assert.throws(() => discover(root), /other-preparation.json: \/id must match filename/);
  }));
