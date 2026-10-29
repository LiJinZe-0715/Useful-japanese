import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildSectionLinks,
  CHANNEL_LABELS,
  communicationFunctionsLabel,
  defaultSectionId,
  homeworkDetails,
  HOMEWORK_TYPE_LABELS,
  resolveSectionId,
  VARIANT_LABELS,
} from "../src/modules/catalog/application/lesson-sections.ts";

const lesson = (overrides = {}) => ({
  schemaVersion: 1,
  id: "sample",
  order: 1,
  title: "サンプル",
  kind: "scene",
  objectives: ["目标"],
  ...overrides,
});

const scene = {
  background: "背景",
  channel: "meeting",
  tasks: ["任务"],
  relationships: "同事",
};

const line = (id) => ({ id, speakerId: "learner", ja: "文", zh: "句" });

test("section links follow lesson content and keep the fixed order", () => {
  const full = lesson({
    scene,
    dialogues: [{ id: "main", title: "主", variant: "main", lines: [line("l1")] }],
    vocabulary: [{ id: "w1", word: "語", reading: "ご", meaning: "词", examples: [] }],
    expressions: [
      {
        id: "e1",
        function: "报告",
        pattern: "〜です",
        meaning: "是",
        audience: "上司",
        notes: [],
        slots: [],
        examples: [],
      },
    ],
    homework: [
      {
        id: "h1",
        type: "oral",
        situation: "场景",
        knownInformation: ["信息"],
        tasks: ["任务"],
        requirements: ["要求"],
        hints: [],
        answers: [{ ja: "答", zh: "答" }],
      },
    ],
  });
  assert.deepEqual(
    buildSectionLinks(full).map((link) => link.id),
    ["objectives", "text", "vocabulary", "expressions", "homework"],
  );
  assert.deepEqual(
    buildSectionLinks(full).map((link) => link.title),
    ["目标", "听读", "词汇", "句型", "作业"],
  );
});

test("preparation lessons expose reading material without a dialogue", () => {
  const preparation = lesson({
    kind: "preparation",
    materials: [
      {
        id: "m1",
        title: "假名",
        kind: "table",
        blocks: [{ type: "table", headers: ["a"], rows: [["あ"]] }],
      },
    ],
  });
  const ids = buildSectionLinks(preparation).map((link) => link.id);
  assert.ok(ids.includes("text"));
  assert.ok(!ids.includes("vocabulary"));
  assert.ok(!ids.includes("grammar"));
});

test("a lesson without readable content opens on its first available section", () => {
  const bare = lesson({ objectives: [], dialogues: [] });
  assert.deepEqual(buildSectionLinks(bare), []);
  assert.equal(defaultSectionId([]), "");
  assert.equal(resolveSectionId([], "text"), "");
});

test("the reading section opens first when present, and stale positions fall back", () => {
  const withGrammar = lesson({
    scene,
    dialogues: [{ id: "main", title: "主", variant: "main", lines: [line("l1")] }],
    grammar: [
      {
        id: "g1",
        pattern: "〜に至るまで",
        meaning: "范围",
        connection: "名词",
        notes: [],
        examples: [],
      },
    ],
  });
  const links = buildSectionLinks(withGrammar);
  assert.equal(defaultSectionId(links), "text");
  // A saved position from a lesson that no longer has that section must not
  // leave the workspace on an empty pane.
  assert.equal(resolveSectionId(links, "homework"), "text");
  assert.equal(resolveSectionId(links, "grammar"), "grammar");
});

test("enum labels cover every schema value", () => {
  assert.deepEqual(Object.keys(CHANNEL_LABELS).sort(), [
    "chat",
    "email",
    "in-person",
    "meeting",
    "other",
    "phone",
  ]);
  assert.deepEqual(Object.keys(VARIANT_LABELS).sort(), ["branch", "main", "register"]);
  assert.deepEqual(Object.keys(HOMEWORK_TYPE_LABELS).sort(), ["oral", "written"]);
  assert.equal(communicationFunctionsLabel(["report", "consult"]), "报告、相谈");
  assert.equal(communicationFunctionsLabel(), "");
});

test("homework details drop empty lists and keep the documented order", () => {
  const details = homeworkDetails({
    id: "h1",
    type: "written",
    situation: "场景",
    knownInformation: ["信息"],
    tasks: ["任务"],
    requirements: [],
    hints: ["提示"],
    answers: [{ ja: "答", zh: "答" }],
  });
  assert.deepEqual(details, [
    { title: "已知信息", values: ["信息"] },
    { title: "任务", values: ["任务"] },
    { title: "提示", values: ["提示"] },
  ]);
});
