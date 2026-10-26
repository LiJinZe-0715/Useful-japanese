import {test} from "node:test";
import assert from "node:assert/strict";
import {discoverCourses} from "../scripts/generate-content.mjs";
import {groupLessons, summarizeLessons,} from "../src/modules/catalog/application/course-catalog.ts";

const lifeCourse = discoverCourses("data/courses").find(
    (coursePackage) => coursePackage.course.id === "life",
);
const lessons = lifeCourse.lessons.filter((lesson) => lesson.level === "N1");

test("life curriculum exposes all 80 N1 lessons after N2 with stable links", () => {
    assert.equal(lifeCourse.lessons.length, 208);
    assert.deepEqual(lifeCourse.course.levels, ["N5", "N4", "N3", "N2", "N1"]);
    assert.equal(lessons.length, 80);
    assert.equal(new Set(lessons.map((lesson) => lesson.title)).size, 80);
    lessons.forEach((lesson, i) => {
        assert.equal(lesson.id, `n1-${i + 1}`);
        assert.equal(lesson.order, 501 + i);
        assert.equal(lesson.unitId, "n1");
    });
    const groups = groupLessons(lifeCourse.course, summarizeLessons(lifeCourse.lessons));
    assert.equal(groups.at(-1).id, "n1");
    assert.deepEqual(
        groups.at(-1).lessons.map((lesson) => lesson.id),
        lessons.map((lesson) => lesson.id),
    );
});

test("N1 reading and vocabulary stay grounded in the lesson and include pronunciation", () => {
    const analyses = new Set();
    const focusPatterns = new Set();
    for (const lesson of lessons) {
        const label = lesson.id;
        const paragraphs = lesson.materials
            .flatMap((material) => material.blocks)
            .filter((block) => block.type === "paragraph");
        assert.ok(
            paragraphs.reduce((total, paragraph) => total + paragraph.ja.length, 0) >= 500,
            `${label}: reading depth`,
        );
        analyses.add(paragraphs.at(-1).ja);
        focusPatterns.add(lesson.grammar.find((grammar) => grammar.id === "focus").pattern);
        for (const paragraph of paragraphs) {
            assert.ok(paragraph.zh && paragraph.reading && paragraph.ttsText, label);
            assert.doesNotMatch(paragraph.ttsText, /[A-Za-z一-龯]/, `${label}: reading pronunciation`);
        }
        assert.equal(lesson.vocabulary.length, 8);
        for (const word of lesson.vocabulary) {
            const source = lesson.dialogues
                .find((dialogue) => dialogue.id === word.source.dialogueId)
                .lines.find((lesson) => lesson.id === word.source.lineId);
            assert.ok(source.ja.includes(word.word), `${label}: ${word.word} in source`);
            assert.ok(word.reading && word.meaning && word.collocations.length, label);
            assert.ok(
                word.examples.some(
                    (example) => example.ja.includes(word.word) && example.zh && example.ttsText,
                ),
                label,
            );
        }
        for (const dialogue of lesson.dialogues) {
            for (const line of dialogue.lines) {
                assert.ok(line.zh && line.reading && line.ttsText, `${label}/${line.id}`);
                assert.doesNotMatch(line.ttsText, /[A-Za-z一-龯]/, `${label}/${line.id}: pronunciation`);
            }
            assert.ok(
                lesson.shadowing.some((practice) => practice.dialogueId === dialogue.id),
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
            const task = lesson.homework.find((homework) => homework.id === id);
            assert.ok(
                task.knownInformation.length && task.tasks.length && task.requirements.length,
                lesson.id,
            );
            assert.ok(
                task.answers.some((answer) => answer.ja && answer.zh && answer.ttsText),
                lesson.id,
            );
        }
        const reading = lesson.homework.find((homework) => homework.id === "reading-task").answers[0]
            .ja;
        const written = lesson.homework.find((homework) => homework.id === "written-task").answers[0]
            .ja;
        assert.ok(reading.length >= 120 && reading.length <= 200, `${lesson.id}: reading model length`);
        assert.ok(written.length >= 150 && written.length <= 220, `${lesson.id}: written model length`);
        assert.ok(
            written.includes(lesson.dialogues.find((dialogue) => dialogue.id === "main").lines[2].ja),
            `${lesson.id}: written answer addresses the main proposal`,
        );
        assert.doesNotMatch(written, /とご質問いただいた点について/, `${lesson.id}: avoid the generic branch-answer template`);
        const answer = lesson.homework.find((homework) => homework.id === "followup-task").answers[0]
            .ja;
        assert.ok(
            lesson.dialogues
                .find((dialogue) => dialogue.variant === "branch")
                .lines.some((lesson) => lesson.ja === answer),
            lesson.id,
        );
    }
    const repair = lessons[0].homework.find(homework => homework.id === "written-task").answers[0].ja;
    for (const fact of ["共用部分", "専有部分", "臨時の修繕に限ります", "更新条件とは別", "どの項目"])
        assert.ok(repair.includes(fact), `n1-1: ${fact}`);
    const housing = lessons[1].homework.find(homework => homework.id === "written-task").answers[0].ja;
    for (const fact of ["毎月の総額", "生活動線", "仮予約は明日まで", "共益費", "駐輪場代"])
        assert.ok(housing.includes(fact), `n1-2: ${fact}`);
});
