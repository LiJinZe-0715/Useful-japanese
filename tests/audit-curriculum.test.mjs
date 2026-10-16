import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {discoverCourses} from "../scripts/generate-content.mjs";
import {groupLessons, summarizeLessons,} from "../src/modules/catalog/application/course-catalog.ts";

const auditCourse = discoverCourses("data/courses").find(
    (coursePackage) => coursePackage.course.id === "audit-business",
);
const baseline = JSON.parse(readFileSync("tests/fixtures/audit-import.json", "utf8"));
const hashText = (text) => createHash("sha256").update(text).digest("hex");
const collectStrings = (value) =>
    typeof value === "string"
        ? [value]
        : Array.isArray(value)
            ? value.flatMap(collectStrings)
            : value && typeof value === "object"
                ? Object.values(value).flatMap(collectStrings)
                : [];

test("audit course keeps 86 learning days and inserts all 20 supplements in 12 chapters", () => {
    assert.equal(auditCourse.course.learningMode, "business");
    assert.deepEqual(auditCourse.course.levels, []);
    assert.equal(auditCourse.course.units.length, 12);
    assert.equal(auditCourse.lessons.length, 106);
    const main = auditCourse.lessons.filter((lesson) => lesson.id.startsWith("audit-"));
    assert.deepEqual(
        main.map((lesson) => lesson.id),
        Array.from({length: 86}, (_, i) => `audit-${i + 1}`),
    );
    assert.equal(
        auditCourse.lessons.filter((lesson) => lesson.id.startsWith("supplement-")).length,
        20,
    );
    const groups = groupLessons(auditCourse.course, summarizeLessons(auditCourse.lessons));
    assert.equal(
        groups.reduce((total, group) => total + group.lessons.length, 0),
        106,
    );
    for (const lesson of auditCourse.lessons.filter((lesson) =>
        lesson.id.startsWith("supplement-"),
    )) {
        const day = Math.floor(lesson.order / 10);
        const parent = main.find((lesson) => lesson.id === `audit-${day}`);
        assert.equal(lesson.unitId, parent.unitId, lesson.id);
        assert.ok(lesson.order > parent.order && lesson.order < parent.order + 10, lesson.id);
    }
});

test("audit course preserves imported training text and reviewed content corrections", () => {
    assert.equal(baseline.lessons.length, 106);
    for (const expected of baseline.lessons) {
        const lesson = auditCourse.lessons.find((lesson) => lesson.id === expected.id);
        // Branch labels join title/trigger; listening reference answers join original answer lines.
        const actual = new Set(
            collectStrings(lesson)
                .flatMap((s) => [s, ...s.split("｜"), ...s.split("\n")])
                .map(hashText),
        );
        for (const digest of expected.textHashes) {
            assert.ok(actual.has(digest), `${expected.id}: source fragment ${digest}`);
        }
    }
});

test("audit lessons provide learner speech, readable terms, role registers and blind listening", () => {
    for (const lesson of auditCourse.lessons) {
        assert.equal(lesson.learnerSpeakerId, "learner");
        assert.equal(
            lesson.speakers.find((practice) => practice.id === "learner").name,
            "我（わたし）",
        );
        for (const dialogue of lesson.dialogues) {
            assert.ok(
                dialogue.lines.some((lesson) => lesson.speakerId === "learner"),
                `${lesson.id}/${dialogue.id}`,
            );
            for (const line of dialogue.lines) {
                assert.ok(line.reading && line.ttsText && line.zh, lesson.id);
                assert.doesNotMatch(line.ttsText, /[A-Za-z一-龯]/, `${lesson.id}/${line.id}`);
            }
            assert.ok(
                lesson.shadowing.some((practice) => practice.dialogueId === dialogue.id),
                lesson.id,
            );
        }
        for (const word of lesson.vocabulary) {
            assert.ok(word.reading && word.meaning, `${lesson.id}/${word.word}`);
            assert.ok(
                word.examples.some((entry) => entry.ja && entry.zh && entry.ttsText),
                `${lesson.id}/${word.word}`,
            );
        }
        for (const task of lesson.homework)
            assert.ok(
                task.answers.every((answer) => answer.ja && answer.ttsText),
                lesson.id,
            );
        if (lesson.id.startsWith("audit-")) {
            assert.equal(
                lesson.expressions.filter((entry) => entry.id.startsWith("audience-")).length,
                3,
                lesson.id,
            );
            assert.equal(
                lesson.materials.find((material) => material.id === "listening").blocks[0].hideTranscript,
                true,
                lesson.id,
            );
            for (const id of ["audit-listening", "audit-client", "audit-internal", "audit-workpaper"]) {
                assert.ok(
                    lesson.homework.some((homework) => homework.id === id),
                    `${lesson.id}/${id}`,
                );
            }
        }
    }
    assert.equal(auditCourse.lessons.flatMap((lesson) => lesson.vocabulary).length, 925);
});
