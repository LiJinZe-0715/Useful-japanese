import { test } from "node:test";
import assert from "node:assert/strict";
import { discoverCourses } from "../scripts/generate-content.mjs";

const curriculum = discoverCourses("data/courses").find(
  (coursePackage) => coursePackage.course.id === "it-business",
);

test("every development lesson supports spoken, written and follow-up practice", () => {
  assert.ok(curriculum);
  for (const lesson of curriculum.lessons) {
    assert.ok(
      lesson.dialogues.some((dialogue) => dialogue.variant === "main"),
      lesson.id,
    );
    assert.ok(
      lesson.dialogues.some((dialogue) => dialogue.variant === "branch"),
      lesson.id,
    );
    for (const dialogue of lesson.dialogues) {
      for (const line of dialogue.lines) {
        assert.ok(line.reading?.trim(), `${lesson.id}/${line.id}: reading`);
        assert.ok(line.ttsText?.trim(), `${lesson.id}/${line.id}: speech`);
        assert.doesNotMatch(line.ttsText, /[A-Za-z]/, `${lesson.id}/${line.id}: pronunciation`);
      }
    }
    assert.ok(lesson.expressions.length >= 3, lesson.id);
    for (const id of ["work-oral", "work-written", "work-followup"]) {
      const task = lesson.homework.find((homework) => homework.id === id);
      assert.ok(task?.knownInformation.length, `${lesson.id}/${id}: context`);
      assert.ok(
        task?.answers.some((answer) => answer.ja && answer.zh && answer.ttsText),
        `${lesson.id}/${id}: answer`,
      );
    }
    assert.ok(lesson.materials.length, `${lesson.id}: working material`);
    for (const word of lesson.vocabulary) {
      assert.ok(
        word.reading && word.meaning && word.collocations?.length,
        `${lesson.id}/${word.id}`,
      );
      assert.ok(
        word.examples.some((example) => example.ja && example.zh && example.ttsText),
        `${lesson.id}/${word.id}: example`,
      );
    }
  }
});

test("specialist coverage includes Java, Spring, frontend, operations and business", () => {
  const essentials = {
    "java-core": ["Stream", "Optional", "BigDecimal", "CompletableFuture", "AtomicInteger"],
    "spring-development": ["Qualifier", "Bean Validation", "ControllerAdvice", "AOP", "Scheduled"],
    "api-development": ["PUT", "PATCH", "DELETE", "カーソル", "multipart"],
    "data-access": ["MyBatis", "SELECT", "LEFT JOIN", "複合インデックス", "Flyway"],
    transactions: ["REQUIRES_NEW", "分離レベル", "楽観ロック", "冪等キー"],
    "backend-testing": ["Mockito", "MockMvc", "WebMvcTest", "Testcontainers", "回帰テスト"],
    "cache-messaging": ["TTL", "パーティション", "DLQ", "Outbox"],
    "delivery-runtime": ["CI/CD", "Linux", "TLS", "Kubernetes", "S3"],
    "application-security": ["401", "403", "PKCE", "XSS", "CSRF", "CORS"],
    "frontend-collaboration": ["HTML", "CSS", "useEffect", "型の絞り込み", "AbortController"],
    "business-systems": ["在庫引当", "消込", "差戻し", "CSV取込"],
    "business-communication": ["代替案", "工数", "納期", "議事録", "回答期限"],
  };
  for (const [unitId, terms] of Object.entries(essentials)) {
    const lessons = curriculum.lessons.filter((lesson) => lesson.unitId === unitId);
    assert.ok(lessons.length >= 3, unitId);
    const words = new Set(lessons.flatMap((lesson) => lesson.vocabulary.map((word) => word.word)));
    for (const term of terms) assert.ok(words.has(term), `${unitId}: ${term}`);
    for (const lesson of lessons) {
      assert.ok(
        lesson.dialogues.some((dialogue) => dialogue.variant === "register"),
        lesson.id,
      );
      assert.ok(
        lesson.materials.some((material) => material.kind === "email"),
        lesson.id,
      );
      const branch = lesson.dialogues.find((dialogue) => dialogue.id === "followup");
      assert.ok(
        branch.lines.some(
          (line) =>
            line.ja ===
            lesson.homework.find((homework) => homework.id === "work-followup").answers[0].ja,
        ),
        lesson.id,
      );
    }
  }
});

test("workplace grammar is taught from each lesson's own dialogue", () => {
  assert.ok(curriculum);
  for (const lesson of curriculum.lessons) {
    assert.equal(lesson.grammar.length, 2, `${lesson.id}: two grammar points`);
    const lines = lesson.dialogues.flatMap((dialogue) => dialogue.lines);
    for (const entry of lesson.grammar) {
      assert.ok(entry.pattern.trim(), `${lesson.id}/${entry.id}: pattern`);
      assert.ok(entry.meaning.trim(), `${lesson.id}/${entry.id}: meaning`);
      assert.ok(entry.connection.trim(), `${lesson.id}/${entry.id}: connection`);
      assert.ok(entry.notes.length, `${lesson.id}/${entry.id}: notes`);
      assert.ok(entry.examples.length, `${lesson.id}/${entry.id}: example`);
      for (const example of entry.examples) {
        assert.ok(example.zh.trim(), `${lesson.id}/${entry.id}: translation`);
        // Examples must quote the lesson instead of being generated copy, so
        // the reading and translation stay those of the vetted dialogue.
        assert.ok(
          lines.some((line) => line.ja === example.ja),
          `${lesson.id}/${entry.id}: example is not from this lesson`,
        );
      }
    }
  }
  // Guards against collapsing the whole course onto a handful of patterns.
  const patterns = new Set(
    curriculum.lessons.flatMap((lesson) => lesson.grammar.map((entry) => entry.pattern)),
  );
  assert.ok(patterns.size >= 20, `only ${patterns.size} distinct grammar patterns`);
});
