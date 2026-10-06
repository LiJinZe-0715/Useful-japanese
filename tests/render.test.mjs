import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
const build = (fixtures, base) => {
  const result = spawnSync(process.execPath, ["scripts/build-pages.mjs", "--root"], {
    encoding: "utf8",
    env: {
      ...process.env,
      NIHONGO_TEST_FIXTURES: fixtures === true ? "1" : fixtures === "empty" ? "empty" : "0",
      PAGES_BASE_PATH: base,
    },
    timeout: 120000,
  });
  assert.equal(result.status, 0, result.stderr + "\n" + result.stdout);
};
const html = (route) => readFileSync(path.join("dist/client", route, "index.html"), "utf8");
test("CI base-path expression uses explicit slash for root and defaults empty/unset to project site", () => {
  const workflow = readFileSync(".github/workflows/pages.yml", "utf8");
  assert.ok(
    workflow.includes(
      "${{ vars.PAGES_BASE_PATH || format('/{0}', github.event.repository.name) }}",
    ),
  );
  // Local check of the documented || behavior for these string values; not a remote Actions run.
  for (const [value, expected] of [
    [undefined, "/nihongo"],
    ["", "/nihongo"],
    ["/", "/"],
    ["/custom", "/custom"],
  ])
    assert.equal(value || "/nihongo", expected);
});
test("real Vinext static rendering of business, life, preparation and empty production", () => {
  try {
    build(true, "/nihongo");
    assert.match(html(""), /法律结构夹具/);
    assert.match(html(""), /生活结构夹具/);
    const law = html("courses/legal-business/example-scene");
    for (const page of [html(""), html("guide"), html("courses/legal-business"), law]) {
      assert.match(page, /class="workspace"/);
      assert.match(page, /class="course-sidebar"/);
    }
    assert.match(law, /aria-controls="vocabulary"/);
    assert.doesNotMatch(law, /aria-controls="grammar"/);
    assert.match(law, /<section id="text">/);
    assert.match(law, /<section id="vocabulary" hidden=""/);
    assert.match(law, /本课词汇/);
    assert.match(law, /本课固定句型/);
    assert.match(law, /你扮演的角色：<strong>わたし<\/strong>/);
    assert.match(law, /class="dialogue-line speaker-primary/);
    assert.match(law, /课后作业与参考答案/);
    assert.doesNotMatch(law, /本课文法/);
    assert.match(law, /语体格式示范/);
    const life = html("courses/life-demo/preparation");
    assert.match(life, /aria-controls="grammar"/);
    assert.match(life, /<table/);
    assert.match(life, /<ul/);
    assert.match(life, /本课文法/);
    assert.doesNotMatch(life, /本课词汇/);
    assert.match(html("guide"), /日语学习内容格式 v1/);
    assert.match(law, /href="\/nihongo\/courses\/legal-business\//);
    assert.match(law, /href="\/nihongo\/course-assets\/legal-business\/reference.txt"/);
    assert.match(
      readFileSync("dist/client/course-assets/legal-business/reference.txt", "utf8"),
      /Static asset fixture/,
    );
    const directory = html("courses/legal-business");
    assert.match(directory, /结构示范/);
    assert.doesNotMatch(directory, /確認します|確認してください|課後|dialogues|grammar|homework/);
    assert.doesNotMatch(directory, /(?:"|\\")vocabulary(?:"|\\")\s*:/);
    const glossary = html("vocabulary");
    assert.match(glossary, /开发与职场词汇/);
    assert.match(glossary, /全部主题/);
    const fixture = JSON.parse(
      readFileSync("tests/fixtures/courses/legal-business/lessons/example-scene.json", "utf8"),
    );
    for (const word of fixture.vocabulary) {
      assert.ok(glossary.includes(word.word));
      assert.ok(glossary.includes(word.reading));
      assert.ok(glossary.includes(word.meaning));
    }
    assert.match(glossary, /href="\/nihongo\/courses\/legal-business\/example-scene\//);
    build(true, "/");
    const rootLaw = html("courses/legal-business/example-scene");
    assert.match(rootLaw, /href="\/course-assets\/legal-business\/reference.txt"/);
    assert.match(rootLaw, /href="\/courses\/legal-business\//);
    assert.doesNotMatch(rootLaw, /(?:src|href)="\/\/|(?:src|href)="\/nihongo\//);
    assert.ok(existsSync("dist/client/course-assets/legal-business/reference.txt"));
    build("empty", "/");
    assert.match(html(""), /还没有发布课程/);
    assert.doesNotMatch(html(""), /法律结构夹具/);
    assert.ok(existsSync("dist/client/guide/index.html"));
    assert.match(html("vocabulary"), /暂未发布职场词汇/);
    assert.ok(existsSync("dist/client/404.html"));
    assert.match(readFileSync("dist/client/404.html", "utf8"), /class="empty-state"/);
    assert.deepEqual(JSON.parse(readFileSync("src/generated/catalog.json")), []);
  } finally {
    build(false, "");
  }
  const production = JSON.parse(readFileSync("src/generated/catalog.json", "utf8"));
  const glossary = html("vocabulary");
  for (const { course, lessons } of production.filter(
    ({ course }) => course.learningMode === "business",
  )) {
    for (const lesson of lessons) {
      for (const word of lesson.vocabulary ?? [])
        assert.ok(glossary.includes(word.word), `${lesson.id}: ${word.word}`);
      assert.ok(glossary.includes(`/courses/${course.id}/${lesson.id}/`));
    }
  }
});
