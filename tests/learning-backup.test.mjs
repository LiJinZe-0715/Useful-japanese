import test from "node:test";
import assert from "node:assert/strict";
import {
    exportLearningBackup,
    importLearningBackup,
    MAX_BACKUP_BYTES,
} from "../src/modules/learning/infrastructure/learning-backup.ts";
import {
    createEmptyStudyRecord,
    studyRecordKey,
} from "../src/modules/learning/domain/study-record.ts";

function storage(entries = []) {
    const values = new Map(entries);
    return {
        values,
        get length() {
            return values.size;
        },
        key: (index) => [...values.keys()][index] ?? null,
        getItem: (key) => values.get(key) ?? null,
        setItem: (key, value) => {
            values.set(key, value);
        },
        removeItem: (key) => {
            values.delete(key);
        },
    };
}
const first = studyRecordKey("life", "n5-1");
const second = studyRecordKey("it-business", "workflow-1");
const record = {
    ...createEmptyStudyRecord(),
    completed: true,
    bookmarked: true,
    position: "homework",
    drafts: {"written-one": "私の下書き。我的草稿。"},
};
const file = (records) => JSON.stringify({version: 1, records});

test("backup round trip preserves progress and Unicode drafts, excludes unrelated data, and keeps other lessons", () => {
    const source = storage([
        [first, JSON.stringify(record)],
        ["nihongo:speech:v1", "private preferences"],
        ["other-app", "other data"],
    ]);
    const backup = exportLearningBackup(source);
    assert.deepEqual(JSON.parse(backup).records, [{key: first, record}]);
    const target = storage([
        [first, JSON.stringify(createEmptyStudyRecord())],
        [second, "keep this"],
        ["other-app", "keep"],
    ]);
    assert.equal(importLearningBackup(backup, target), 1);
    assert.deepEqual(JSON.parse(target.getItem(first)), record);
    assert.equal(target.getItem(second), "keep this");
    assert.equal(target.getItem("other-app"), "keep");
});

test("invalid or oversized backup is rejected before changing any records", () => {
    const target = storage([[first, "original"]]);
    const valid = {key: first, record};
    for (const invalid of [
        "not json",
        "null",
        JSON.stringify({version: 2, records: [valid]}),
        file([valid, {key: second, record: {...record, drafts: []}}]),
        file([valid, {key: "other-app", record}]),
        file([valid, valid]),
        file([{key: first, record: {...record, completed: "true"}}]),
        file([{key: first, record: {...record, drafts: {task: 123}}}]),
        " ".repeat(MAX_BACKUP_BYTES + 1),
    ]) {
        assert.throws(() => importLearningBackup(invalid, target));
        assert.deepEqual([...target.values], [[first, "original"]]);
    }
    assert.equal(importLearningBackup(file([]), target), 0);
});

test("quota failure rolls back both overwritten and newly created records", () => {
    const third = studyRecordKey("audit-business", "audit-1");
    const target = storage([[first, "original"]]);
    const save = target.setItem;
    target.setItem = (key, value) => {
        if (key === third) throw Error("quota");
        save(key, value);
    };
    assert.throws(
        () =>
            importLearningBackup(
                file([first, second, third].map((key) => ({key, record}))),
                target,
            ),
        /原有记录已保留/,
    );
    assert.deepEqual([...target.values], [[first, "original"]]);
    assert.throws(() => exportLearningBackup(target), /损坏/);
});
