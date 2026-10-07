import { test } from "node:test";
import assert from "node:assert/strict";
import { discover } from "../scripts/content.mjs";
import { lessonGroups, summarizeLessons } from "../src/modules/catalog/application/catalog.ts";

const pack = discover("data/courses").find((p) => p.course.id === "life");
const lessons = pack.lessons.filter((l) => l.level === "N1");

test("life curriculum exposes all 80 N1 lessons after N2 with stable links", () => {
  assert.equal(pack.lessons.length, 208);
  assert.deepEqual(pack.course.levels, ["N5", "N4", "N3", "N2", "N1"]);
  assert.equal(lessons.length, 80);
  assert.equal(new Set(lessons.map((l) => l.title)).size, 80);
  lessons.forEach((lesson, i) => {
    assert.equal(lesson.id, `n1-${i + 1}`);
    assert.equal(lesson.order, 501 + i);
    assert.equal(lesson.unitId, "n1");
  });
  const groups = lessonGroups(pack.course, summarizeLessons(pack.lessons));
  assert.equal(groups.at(-1).id, "n1");
  assert.deepEqual(
    groups.at(-1).lessons.map((l) => l.id),
    lessons.map((l) => l.id),
  );
});

test("N1 reading and vocabulary stay grounded in the lesson and include pronunciation", () => {
  const analyses = new Set();
  const focusPatterns = new Set();
  for (const lesson of lessons) {
    const label = lesson.id;
    const paragraphs = lesson.materials
      .flatMap((m) => m.blocks)
      .filter((b) => b.type === "paragraph");
    assert.ok(paragraphs.reduce((n, p) => n + p.ja.length, 0) >= 500, `${label}: reading depth`);
    analyses.add(paragraphs.at(-1).ja);
    focusPatterns.add(lesson.grammar.find((g) => g.id === "focus").pattern);
    for (const paragraph of paragraphs) {
      assert.ok(paragraph.zh && paragraph.reading && paragraph.ttsText, label);
      assert.doesNotMatch(paragraph.ttsText, /[A-Za-z一-龯]/, `${label}: reading pronunciation`);
    }
    assert.equal(lesson.vocabulary.length, 8);
    for (const word of lesson.vocabulary) {
      const source = lesson.dialogues
        .find((d) => d.id === word.source.dialogueId)
        .lines.find((l) => l.id === word.source.lineId);
      assert.ok(source.ja.includes(word.word), `${label}: ${word.word} in source`);
      assert.ok(word.reading && word.meaning && word.collocations.length, label);
      assert.ok(
        word.examples.some((e) => e.ja.includes(word.word) && e.zh && e.ttsText),
        label,
      );
    }
    for (const dialogue of lesson.dialogues) {
      for (const line of dialogue.lines) {
        assert.ok(line.zh && line.reading && line.ttsText, `${label}/${line.id}`);
        assert.doesNotMatch(line.ttsText, /[A-Za-z一-龯]/, `${label}/${line.id}: pronunciation`);
      }
      assert.ok(
        lesson.shadowing.some((s) => s.dialogueId === dialogue.id),
        label,
      );
    }
  }
  assert.equal(analyses.size, 80);
  assert.equal(focusPatterns.size, 80);
});

test("each N1 lesson provides reading, oral, written and changed-condition practice", () => {
  for (const lesson of lessons) {
    assert.equal(lesson.homework.length, 4, lesson.id);
    for (const id of ["reading-task", "oral-task", "written-task", "followup-task"]) {
      const task = lesson.homework.find((h) => h.id === id);
      assert.ok(
        task.knownInformation.length && task.tasks.length && task.requirements.length,
        lesson.id,
      );
      assert.ok(
        task.answers.some((a) => a.ja && a.zh && a.ttsText),
        lesson.id,
      );
    }
    const reading = lesson.homework.find((h) => h.id === "reading-task").answers[0].ja;
    const written = lesson.homework.find((h) => h.id === "written-task").answers[0].ja;
    assert.ok(reading.length >= 120 && reading.length <= 200, `${lesson.id}: reading model length`);
    assert.ok(written.length >= 150 && written.length <= 220, `${lesson.id}: written model length`);
    assert.ok(
      written.includes(lesson.dialogues.find((d) => d.id === "main").lines[6].ja),
      `${lesson.id}: specific written question`,
    );
    const answer = lesson.homework.find((h) => h.id === "followup-task").answers[0].ja;
    assert.ok(
      lesson.dialogues.find((d) => d.variant === "branch").lines.some((l) => l.ja === answer),
      lesson.id,
    );
  }
});
