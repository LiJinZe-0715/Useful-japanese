import {test} from "node:test";
import assert from "node:assert/strict";
import {cpSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, symlinkSync, writeFileSync,} from "node:fs";
import path from "node:path";
import os from "node:os";
import {discoverCourses} from "../scripts/generate-content.mjs";
import {groupLessons, summarizeLessons,} from "../src/modules/catalog/application/course-catalog.ts";

const fixtures = path.resolve("tests/fixtures/courses");
test("life dialogues provide pronunciation and N5 lessons have independent oral and written practice", () => {
    const life = discoverCourses().find(({course}) => course.id === "life");
    for (const lesson of life.lessons) {
        for (const dialogue of lesson.dialogues ?? []) for (const line of dialogue.lines) {
            assert.ok(line.reading, `${lesson.id}/${line.id}: missing reading`);
            if (["N3", "N2"].includes(lesson.level)) {
                assert.ok(line.ttsText, `${lesson.id}/${line.id}: missing speech text`);
                assert.doesNotMatch(line.reading, /[\p{Script=Han}\p{Script=Latin}0-9]/u);
                assert.doesNotMatch(line.ttsText, /[\p{Script=Han}\p{Script=Latin}0-9]/u);
            }
        }
        if (lesson.level === "N5") for (const type of ["oral", "written"]) {
            const task = lesson.homework?.find(item => item.type === type);
            assert.ok(task?.knownInformation.length && task.tasks.length && task.answers[0]?.ja, `${lesson.id}: ${type} practice`);
            assert.ok(task.answers[0].ttsText && task.answers[0].zh);
        }
    }
    const readings = id => life.lessons.find(lesson => lesson.id === id).dialogues.flatMap(dialogue => dialogue.lines).map(line => line.reading).join("\n");
    for (const [id, pronunciation] of [["n3-11", "にじごじゅっぷん"], ["n3-11", "べつのかた"], ["n3-9", "ふたへや"], ["n2-12", "ふたばん"], ["n2-21", "じゅうよっかかん"], ["n2-25", "さんぜんえん"], ["n2-42", "はっせんえん"]])
        assert.ok(readings(id).includes(pronunciation), `${id}: ${pronunciation}`);
});
test("directory summaries contain only catalog fields, leaving full lesson content on the server", () => {
    const coursePackage = discoverCourses(fixtures).find(
        (coursePackage) => coursePackage.course.id === "legal-business",
    );
    const summary = summarizeLessons(coursePackage.lessons)[0];
    assert.deepEqual(Object.keys(summary).sort(), ["id", "level", "order", "title", "unitId"]);
    assert.equal(summary.id, coursePackage.lessons[0].id);
    assert.equal(summary.order, coursePackage.lessons[0].order);
    assert.ok(coursePackage.lessons[0].dialogues.length);
    assert.ok(coursePackage.lessons[0].homework.length);
    assert.doesNotMatch(JSON.stringify(summary), /確認します|dialogues|vocabulary|grammar|homework/);
});
test("chapter tree separates sections, sorts chapters and lessons, and preserves ungrouped courses", () => {
    const course = {
        units: [
            {id: "n3", title: "N3", order: 3},
            {id: "pre", title: "准备篇", order: 0},
            {id: "n4", title: "N4", order: 2},
            {id: "n5", title: "N5", order: 1},
        ],
    };
    const lessons = [
        {id: "n3-1", unitId: "n3", order: 301},
        {id: "n5-2", unitId: "n5", order: 102},
        {id: "kana", unitId: "pre", order: 1},
        {id: "n4-1", unitId: "n4", order: 201},
        {id: "n5-1", unitId: "n5", order: 101},
    ];
    const before = structuredClone({course, lessons});
    assert.deepEqual(
        groupLessons(course, lessons).map((group) => [
            group.id,
            group.lessons.map((lesson) => lesson.id),
        ]),
        [
            ["pre", ["kana"]],
            ["n5", ["n5-1", "n5-2"]],
            ["n4", ["n4-1"]],
            ["n3", ["n3-1"]],
        ],
    );
    assert.deepEqual({course, lessons}, before);
    const ungrouped = {id: "intro", order: 0};
    assert.deepEqual(groupLessons({}, [ungrouped]), [
        {id: "", title: "课次", lessons: [ungrouped]},
    ]);
    assert.deepEqual(groupLessons(course, [...lessons, ungrouped]).at(-1).lessons, [ungrouped]);
});
test("production directory is empty, examples are separate, business/life/preparation discovered deterministically", () => {
    assert.deepEqual(discoverCourses(path.resolve("tests/fixtures/empty-courses")), []);
    assert.ok(Array.isArray(discoverCourses()));
    assert.equal(discoverCourses(path.resolve("docs/examples/course-package")).length, 1);
    const coursePackages = discoverCourses(fixtures);
    assert.deepEqual(
        coursePackages.map((coursePackage) => coursePackage.course.id),
        ["legal-business", "life-demo"],
    );
    assert.deepEqual(
        coursePackages[1].lessons.map((lesson) => lesson.id),
        ["preparation", "example-scene"],
    );
    assert.equal(coursePackages[0].course.learningMode, "business");
    assert.equal(coursePackages[1].lessons[0].materials[0].blocks[1].type, "table");
});

function withCourseFixtures(runTest) {
    const root = mkdtempSync(path.join(os.tmpdir(), "nihongo-test-"));
    try {
        cpSync(fixtures, root, {recursive: true});
        runTest(root);
    } finally {
        assert.equal(path.dirname(root), path.resolve(os.tmpdir()));
        assert.ok(path.basename(root).startsWith("nihongo-test-"));
        rmSync(root, {recursive: true, force: true});
    }
}

test("asset roots and nested directories cannot be symbolic links or junctions", () =>
    withCourseFixtures((root) => {
        const assets = path.join(root, "legal-business/assets");
        const real = path.join(root, ".actual-assets");
        renameSync(assets, real);
        symlinkSync(real, assets, process.platform === "win32" ? "junction" : "dir");
        assert.throws(() => discoverCourses(root), /symlinks not allowed/);
        rmSync(assets);
        renameSync(real, assets);
        symlinkSync(
            assets,
            path.join(assets, "nested"),
            process.platform === "win32" ? "junction" : "dir",
        );
        assert.throws(() => discoverCourses(root), /symlinks not allowed/);
    }));

test("every dialogue variant references one learner by stable ID with actual lines", () =>
    withCourseFixtures((root) => {
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
            assert.throws(() => discoverCourses(root), regex);
        }
        writeFileSync(file, JSON.stringify(original));
        assert.equal(discoverCourses(root).length, 2);
        const renamed = structuredClone(original);
        renamed.speakers.forEach((speaker) => (speaker.name = "同名角色"));
        renamed.speakers.reverse();
        writeFileSync(file, JSON.stringify(renamed));
        assert.equal(discoverCourses(root)[0].lessons[0].learnerSpeakerId, original.learnerSpeakerId);
        for (const {lessons} of discoverCourses()) {
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
    withCourseFixtures((root) => {
        const course = discoverCourses(root).find(
            (coursePackage) => coursePackage.course.id === "life-demo",
        );
        assert.equal(course.lessons.find((lesson) => lesson.kind === "preparation").level, undefined);
        const file = path.join(root, "life-demo/lessons/example-scene.json");
        const lesson = JSON.parse(readFileSync(file));
        delete lesson.level;
        writeFileSync(file, JSON.stringify(lesson));
        assert.throws(
            () => discoverCourses(root),
            /example-scene.json: \/level life scene lesson requires level/,
        );
        lesson.level = "N3";
        writeFileSync(file, JSON.stringify(lesson));
        assert.throws(() => discoverCourses(root), /\/level not declared in course.levels/);
    }));
test("chapter folders discover numbered sections and validate folder references", () =>
    withCourseFixtures((root) => {
        const folder = path.join(root, "life-demo"),
            manifest = path.join(folder, "course.json"),
            course = JSON.parse(readFileSync(manifest));
        course.units = [{id: "n5", title: "N5", order: 1}];
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
            discoverCourses(root)[1].lessons.map((lesson) => lesson.id),
            ["preparation", "n5-1"],
        );
        lesson.unitId = "missing";
        writeFileSync(file, JSON.stringify(lesson));
        assert.throws(() => discoverCourses(root), /n5[\\/]1.json: \/unitId must match chapter folder/);
        lesson.unitId = "n5";
        lesson.id = "wrong";
        writeFileSync(file, JSON.stringify(lesson));
        assert.throws(() => discoverCourses(root), /n5[\\/]1.json: \/id must match filename/);
    }));
test("adding only a legal course folder requires no registry/core changes", () =>
    withCourseFixtures((root) => {
        const copy = path.join(root, "another-legal");
        cpSync(path.join(root, "legal-business"), copy, {recursive: true});
        const manifestFile = path.join(copy, "course.json");
        const course = JSON.parse(readFileSync(manifestFile));
        course.id = "another-legal";
        writeFileSync(manifestFile, JSON.stringify(course));
        assert.deepEqual(
            discoverCourses(root).map((coursePackage) => coursePackage.course.id),
            ["another-legal", "legal-business", "life-demo"],
        );
    }));
test("invalid JSON and references identify exact file and field", () =>
    withCourseFixtures((root) => {
        const file = path.join(root, "legal-business/lessons/example-scene.json");
        const value = JSON.parse(readFileSync(file));
        value.shadowing[0].lineIds = ["missing"];
        writeFileSync(file, JSON.stringify(value));
        assert.throws(() => discoverCourses(root), /example-scene.json: \/shadowing\/0\/lineIds\/0/);
        value.shadowing[0].lineIds = ["line-one"];
        value.dialogues[0].lines[0].speakerId = "missing";
        writeFileSync(file, JSON.stringify(value));
        assert.throws(() => discoverCourses(root), /\/dialogues\/0\/lines\/0\/speakerId/);
        writeFileSync(file, "{bad");
        assert.throws(() => discoverCourses(root), /example-scene.json: JSON/);
    }));
test("schema rejects unknown fields, wrong IDs, invalid units and malformed tables", () =>
    withCourseFixtures((root) => {
        const file = path.join(root, "life-demo/lessons/preparation.json"),
            original = JSON.parse(readFileSync(file));
        for (const [mutate, regex] of [
            [(lesson) => (lesson.html = "<b>x</b>"), /additional properties/],
            [(lesson) => (lesson.id = "wrong"), /\/id/],
            [(lesson) => (lesson.unitId = "missing"), /\/unitId/],
            [(lesson) => (lesson.materials[0].blocks[1].rows = [["a"]]), /\/rows/],
        ]) {
            const lesson = structuredClone(original);
            mutate(lesson);
            writeFileSync(file, JSON.stringify(lesson));
            assert.throws(() => discoverCourses(root), regex);
        }
    }));
test("missing folder manifests fail and disabled courses still validate", () =>
    withCourseFixtures((root) => {
        mkdirSync(path.join(root, "missing"));
        assert.throws(() => discoverCourses(root), /missing.*course.json/);
    }));
for (const level of ["N2", "N1"])
    test(`${level} sections and grammar follow v1 and declared course levels`, () =>
        withCourseFixtures((root) => {
            const unitId = level.toLowerCase();
            const folder = path.join(root, "life-demo");
            const manifest = path.join(folder, "course.json");
            const course = JSON.parse(readFileSync(manifest));
            course.levels.push(level);
            course.units = [{id: unitId, title: level, order: 4}];
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
                        {ja: "雨にもかかわらず、参加者は集まりました。", zh: "尽管下雨，参与者仍聚集了。"},
                    ],
                },
            ];
            mkdirSync(path.join(folder, `lessons/${unitId}`));
            const file = path.join(folder, `lessons/${unitId}/1.json`);
            writeFileSync(original, JSON.stringify(lesson));
            renameSync(original, file);
            const found = discoverCourses(root).find(
                (coursePackage) => coursePackage.course.id === "life-demo",
            );
            assert.equal(
                found.lessons.find((lesson) => lesson.id === `${unitId}-1`).grammar[0].level,
                level,
            );
            assert.deepEqual(
                groupLessons(found.course, summarizeLessons(found.lessons))
                    .find((group) => group.id === unitId)
                    .lessons.map((lesson) => lesson.id),
                [`${unitId}-1`],
            );
            course.levels = ["N5"];
            writeFileSync(manifest, JSON.stringify(course));
            assert.throws(
                () => discoverCourses(root),
                new RegExp(`${unitId}[\\\\/]1.json: /level not declared in course.levels`),
            );
        }));
test("chapter filename prefixes preserve stable lesson IDs and reject unrelated names", () =>
    withCourseFixtures((root) => {
        const folder = path.join(root, "life-demo");
        const manifest = path.join(folder, "course.json");
        const course = JSON.parse(readFileSync(manifest));
        course.units = [
            {id: "pre", title: "准备篇", order: 0},
            {id: "n5", title: "N5", order: 1},
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
        const found = discoverCourses(root).find(
            (coursePackage) => coursePackage.course.id === "life-demo",
        );
        assert.deepEqual(found.lessons, [prep, lesson]);
        const wrongFile = path.join(folder, "lessons/pre/other-preparation.json");
        renameSync(prepFile, wrongFile);
        assert.throws(() => discoverCourses(root), /other-preparation.json: \/id must match filename/);
    }));
