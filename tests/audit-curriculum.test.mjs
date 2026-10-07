import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { discover } from "../scripts/content.mjs";
import { lessonGroups, summarizeLessons } from "../src/modules/catalog/application/catalog.ts";

const pack = discover("data/courses").find((p) => p.course.id === "audit-business");
const baseline = JSON.parse(readFileSync("tests/fixtures/audit-import.json", "utf8"));
const hash = (s) => createHash("sha256").update(s).digest("hex");
const strings = (v) =>
  typeof v === "string"
    ? [v]
    : Array.isArray(v)
      ? v.flatMap(strings)
      : v && typeof v === "object"
        ? Object.values(v).flatMap(strings)
        : [];

test("audit course keeps 86 learning days and inserts all 20 supplements in 12 chapters", () => {
  assert.equal(pack.course.learningMode, "business");
  assert.deepEqual(pack.course.levels, []);
  assert.equal(pack.course.units.length, 12);
  assert.equal(pack.lessons.length, 106);
  const main = pack.lessons.filter((l) => l.id.startsWith("audit-"));
  assert.deepEqual(
    main.map((l) => l.id),
    Array.from({ length: 86 }, (_, i) => `audit-${i + 1}`),
  );
  assert.equal(pack.lessons.filter((l) => l.id.startsWith("supplement-")).length, 20);
  const groups = lessonGroups(pack.course, summarizeLessons(pack.lessons));
  assert.equal(
    groups.reduce((n, g) => n + g.lessons.length, 0),
    106,
  );
  for (const lesson of pack.lessons.filter((l) => l.id.startsWith("supplement-"))) {
    const day = Math.floor(lesson.order / 10);
    const parent = main.find((l) => l.id === `audit-${day}`);
    assert.equal(lesson.unitId, parent.unitId, lesson.id);
    assert.ok(lesson.order > parent.order && lesson.order < parent.order + 10, lesson.id);
  }
});

test("import preserves every source training text, including amounts, qualifiers and answers", () => {
  assert.equal(baseline.lessons.length, 106);
  for (const expected of baseline.lessons) {
    const lesson = pack.lessons.find((l) => l.id === expected.id);
    // Branch labels join title/trigger; listening reference answers join original answer lines.
    const actual = new Set(
      strings(lesson)
        .flatMap((s) => [s, ...s.split("｜"), ...s.split("\n")])
        .map(hash),
    );
    for (const digest of expected.textHashes) {
      assert.ok(actual.has(digest), `${expected.id}: source fragment ${digest}`);
    }
  }
});

test("audit lessons provide learner speech, readable terms, role registers and blind listening", () => {
  for (const lesson of pack.lessons) {
    assert.equal(lesson.learnerSpeakerId, "learner");
    assert.equal(lesson.speakers.find((s) => s.id === "learner").name, "我（わたし）");
    for (const d of lesson.dialogues) {
      assert.ok(
        d.lines.some((l) => l.speakerId === "learner"),
        `${lesson.id}/${d.id}`,
      );
      for (const line of d.lines) {
        assert.ok(line.reading && line.ttsText && line.zh, lesson.id);
        assert.doesNotMatch(line.ttsText, /[A-Za-z一-龯]/, `${lesson.id}/${line.id}`);
      }
      assert.ok(
        lesson.shadowing.some((s) => s.dialogueId === d.id),
        lesson.id,
      );
    }
    for (const word of lesson.vocabulary) {
      assert.ok(word.reading && word.meaning, `${lesson.id}/${word.word}`);
      assert.ok(
        word.examples.some((e) => e.ja && e.zh && e.ttsText),
        `${lesson.id}/${word.word}`,
      );
    }
    for (const task of lesson.homework)
      assert.ok(
        task.answers.every((a) => a.ja && a.ttsText),
        lesson.id,
      );
    if (lesson.id.startsWith("audit-")) {
      assert.equal(
        lesson.expressions.filter((e) => e.id.startsWith("audience-")).length,
        3,
        lesson.id,
      );
      assert.equal(
        lesson.materials.find((m) => m.id === "listening").blocks[0].hideTranscript,
        true,
        lesson.id,
      );
      for (const id of ["audit-listening", "audit-client", "audit-internal", "audit-workpaper"]) {
        assert.ok(
          lesson.homework.some((h) => h.id === id),
          `${lesson.id}/${id}`,
        );
      }
    }
  }
  assert.equal(pack.lessons.flatMap((l) => l.vocabulary).length, 925);
});
