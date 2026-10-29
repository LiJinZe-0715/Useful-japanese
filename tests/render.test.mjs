import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const buildStaticSite = (fixtures, base, root = true) => {
  const env = {
    ...process.env,
    NIHONGO_TEST_FIXTURES: fixtures === true ? "1" : fixtures === "empty" ? "empty" : "0",
  };
  if (base === undefined) delete env.PAGES_BASE_PATH;
  else env.PAGES_BASE_PATH = base;
  const result = spawnSync(
    process.execPath,
    ["scripts/build-pages.mjs", ...(root ? ["--root"] : [])],
    {
      encoding: "utf8",
      env,
      timeout: 120000,
    },
  );
  assert.equal(result.status, 0, result.stderr + "\n" + result.stdout);
};
const readRouteHtml = (route) =>
  readFileSync(path.join("dist/client", route, "index.html"), "utf8");
test("CI base-path expression uses explicit slash for root and defaults empty/unset to project site", () => {
  const workflow = readFileSync(".github/workflows/deploy-pages.yml", "utf8");
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
    buildStaticSite(true, undefined, false);
    assert.ok(readRouteHtml("").includes(`href="/${path.basename(process.cwd())}/courses/`));
    assert.doesNotMatch(readRouteHtml(""), /(?:src|href)="\/nihongo\//);
    buildStaticSite(true, "/nihongo");
    assert.match(readRouteHtml(""), /法律结构夹具/);
    assert.match(readRouteHtml(""), /生活结构夹具/);
    const law = readRouteHtml("courses/legal-business/example-scene");
    for (const page of [
      readRouteHtml(""),
      readRouteHtml("guide"),
      readRouteHtml("courses/legal-business"),
      law,
    ]) {
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
    const life = readRouteHtml("courses/life-demo/preparation");
    assert.match(life, /aria-controls="grammar"/);
    assert.match(life, /<table/);
    assert.match(life, /<ul/);
    assert.match(life, /本课文法/);
    assert.doesNotMatch(life, /本课词汇/);
    assert.match(readRouteHtml("guide"), /日语学习内容格式 v1/);
    assert.match(law, /href="\/nihongo\/courses\/legal-business\//);
    assert.match(law, /href="\/nihongo\/course-assets\/legal-business\/reference.txt"/);
    assert.match(law, /href="\/nihongo\/course-assets\/legal-business\/reference.html"/);
    assert.match(
      readFileSync("dist/client/course-assets/legal-business/reference.html", "utf8"),
      /HTML asset fixture/,
    );
    assert.ok(!existsSync("dist/client/course-assets/legal-business/reference/index.html"));
    assert.doesNotMatch(law, /0<details><summary>查看参考答案/);
    assert.match(
      readFileSync("dist/client/course-assets/legal-business/reference.txt", "utf8"),
      /Static asset fixture/,
    );
    const directory = readRouteHtml("courses/legal-business");
    assert.match(directory, /结构示范/);
    assert.doesNotMatch(directory, /確認します|確認してください|課後|dialogues|grammar|homework/);
    assert.doesNotMatch(directory, /(?:"|\\")vocabulary(?:"|\\")\s*:/);
    const glossaryIndex = readRouteHtml("vocabulary");
    assert.match(glossaryIndex, /搜索全部词汇/);
    assert.match(glossaryIndex, /商务与职场词汇/);
    assert.match(glossaryIndex, /href="\/nihongo\/vocabulary\/legal-business\/all\//);
    const glossary = readRouteHtml("vocabulary/legal-business/all");
    assert.match(glossary, /搜索词汇/);
    assert.match(glossary, /合成语音设置/);
    const fixture = JSON.parse(
      readFileSync("tests/fixtures/courses/legal-business/lessons/example-scene.json", "utf8"),
    );
    for (const word of fixture.vocabulary) {
      assert.ok(glossary.includes(word.word));
      assert.ok(glossary.includes(word.reading));
      assert.ok(glossary.includes(word.meaning));
    }
    assert.match(glossary, /href="\/nihongo\/courses\/legal-business\/example-scene\//);
    buildStaticSite(true, "/");
    const rootLaw = readRouteHtml("courses/legal-business/example-scene");
    assert.match(rootLaw, /href="\/course-assets\/legal-business\/reference.txt"/);
    assert.match(rootLaw, /href="\/courses\/legal-business\//);
    assert.doesNotMatch(rootLaw, /(?:src|href)="\/\/|(?:src|href)="\/nihongo\//);
    assert.ok(existsSync("dist/client/course-assets/legal-business/reference.txt"));
    buildStaticSite("empty", "/");
    assert.match(readRouteHtml(""), /还没有发布课程/);
    assert.doesNotMatch(readRouteHtml(""), /法律结构夹具/);
    assert.ok(existsSync("dist/client/guide/index.html"));
    assert.match(readRouteHtml("vocabulary"), /暂未发布职场词汇/);
    assert.ok(existsSync("dist/client/404.html"));
    assert.match(readFileSync("dist/client/404.html", "utf8"), /class="empty-state"/);
    assert.deepEqual(JSON.parse(readFileSync("src/generated/catalog.json")), []);
  } finally {
    buildStaticSite(false, "");
  }
  const production = JSON.parse(readFileSync("src/generated/catalog.json", "utf8"));
  const n1 = production
    .find(({ course }) => course.id === "life")
    .lessons.filter((lesson) => lesson.level === "N1");
  const lifeDirectory = readRouteHtml("courses/life");
  assert.match(lifeDirectory, /N1：深入生活与多角度表达/);
  for (const lesson of n1) {
    assert.ok(lifeDirectory.includes(`/courses/life/${lesson.id}/`), lesson.id);
    const page = readRouteHtml(`courses/life/${lesson.id}`);
    assert.ok(page.includes(lesson.title), lesson.id);
    assert.ok(page.includes(lesson.materials[0].blocks[1].ja), `${lesson.id}: original reading`);
    assert.match(page, /课后作业与参考答案/);
  }
  const glossaryIndex = readRouteHtml("vocabulary");
  const auditCourse = production.find(({ course }) => course.id === "audit-business");
  assert.match(readRouteHtml(""), /审计商务日语/);
  assert.match(readRouteHtml("courses/audit-business"), /86 节主课/);
  for (const lesson of auditCourse.lessons) {
    const page = readRouteHtml(`courses/audit-business/${lesson.id}`);
    assert.ok(page.includes(lesson.title), lesson.id);
    assert.ok(page.includes(lesson.dialogues[0].lines[0].ja), `${lesson.id}: original dialogue`);
    if (lesson.id.startsWith("audit-")) {
      assert.match(page, /<details><summary>查看听力原文<\/summary>/);
      assert.match(page, /播放听力/);
      assert.match(page, /本课文法/);
      for (const grammar of lesson.grammar)
        assert.ok(page.includes(grammar.pattern), `${lesson.id}: grammar`);
    }
  }
  // The glossary is chunked per unit: every business lesson's words must live on
  // its own unit page, and the index must link to each unit exactly once.
  for (const { course, lessons } of production.filter(
    ({ course }) => course.learningMode === "business",
  )) {
    const pages = new Map();
    for (const lesson of lessons) {
      const slug = lesson.unitId || "all";
      if (!pages.has(slug)) {
        pages.set(slug, readRouteHtml(`vocabulary/${course.id}/${slug}`));
        assert.ok(
          glossaryIndex.includes(`/vocabulary/${course.id}/${slug}/`),
          `${course.id}/${slug}: missing from the glossary index`,
        );
      }
      const page = pages.get(slug);
      for (const word of lesson.vocabulary ?? [])
        assert.ok(page.includes(word.word), `${lesson.id}: ${word.word}`);
      assert.ok(page.includes(`/courses/${course.id}/${lesson.id}/`));
    }
  }
  // Cross-course search is served by a generated asset, so every entry that lives
  // on a chunked page must also be reachable through it.
  const searchIndex = JSON.parse(readFileSync("dist/client/vocabulary-search.json", "utf8"));
  const indexed = new Set(searchIndex.map((entry) => `${entry.c}:${entry.l}:${entry.w}`));
  for (const { course, lessons } of production.filter(
    ({ course }) => course.learningMode === "business",
  )) {
    for (const lesson of lessons)
      for (const word of lesson.vocabulary ?? [])
        assert.ok(
          indexed.has(`${course.id}:${lesson.id}:${word.word}`),
          `${lesson.id}: ${word.word} missing from the search index`,
        );
  }
});
