import { test } from "node:test";
import assert from "node:assert/strict";
import { discover } from "../scripts/content.mjs";

const curriculum = discover("data/courses").find((p) => p.course.id === "it-business");

test("every development lesson supports spoken, written and follow-up practice", () => {
  assert.ok(curriculum);
  for (const lesson of curriculum.lessons) {
    assert.ok(
      lesson.dialogues.some((d) => d.variant === "main"),
      lesson.id,
    );
    assert.ok(
      lesson.dialogues.some((d) => d.variant === "branch"),
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
      const task = lesson.homework.find((h) => h.id === id);
      assert.ok(task?.knownInformation.length, `${lesson.id}/${id}: context`);
      assert.ok(
        task?.answers.some((a) => a.ja && a.zh && a.ttsText),
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
        word.examples.some((e) => e.ja && e.zh && e.ttsText),
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
        lesson.dialogues.some((d) => d.variant === "register"),
        lesson.id,
      );
      assert.ok(
        lesson.materials.some((m) => m.kind === "email"),
        lesson.id,
      );
      const branch = lesson.dialogues.find((d) => d.id === "followup");
      assert.ok(
        branch.lines.some(
          (l) => l.ja === lesson.homework.find((h) => h.id === "work-followup").answers[0].ja,
        ),
        lesson.id,
      );
    }
  }
});
