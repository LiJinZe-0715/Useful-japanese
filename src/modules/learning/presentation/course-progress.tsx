"use client";
import { useEffect, useState } from "react";
import type { Course } from "../../catalog/domain/content";
import { lessonGroups, type LessonSummary } from "../../catalog/application/catalog";
import { learning } from "../../../bootstrap/learning";
import type { StudyRecord } from "../domain/record";
import { href } from "../../../shared/paths";
export function CourseProgress({ course, lessons }: { course: Course; lessons: LessonSummary[] }) {
  const [records, setRecords] = useState<Record<string, StudyRecord>>({});
  useEffect(() => {
    setRecords(Object.fromEntries(lessons.map((l) => [l.id, learning.load(course.id, l.id)])));
  }, [course.id, lessons]);
  const list = (items: LessonSummary[]) => (
    <ol className="lesson-list">
      {items.map((l, index) => (
        <li key={l.id}>
          <a href={href(`/courses/${course.id}/${l.id}/`)}>
            <span className="lesson-number">{String(index + 1).padStart(2, "0")}</span>
            <span className="lesson-list-title">{l.title}</span>
            <span className="lesson-list-status">
              {l.level} {records[l.id]?.bookmarked ? "★ 已收藏 " : ""}
              {records[l.id]?.completed ? "✓ 已学过" : "未学习"}
            </span>
            <span className="lesson-arrow" aria-hidden="true">
              →
            </span>
          </a>
        </li>
      ))}
    </ol>
  );
  const completed = lessons.filter((l) => records[l.id]?.completed).length;
  const nextLesson = lessons.find((l) => !records[l.id]?.completed) ?? lessons[0];
  return (
    <>
      <section className="course-progress-panel" aria-label="课程学习记录">
        <div>
          <span className="eyebrow">YOUR PROGRESS</span>
          <h2>
            {completed} <small>/ {lessons.length} 节已学过</small>
          </h2>
          <progress value={completed} max={lessons.length || 1} aria-label="已学过课次占比" />
          <p className="muted">完成标记仅记录学习经历。</p>
        </div>
        {nextLesson && (
          <a className="button-primary" href={href(`/courses/${course.id}/${nextLesson.id}/`)}>
            {completed ? "继续学习" : "开始学习"} <span aria-hidden="true">→</span>
          </a>
        )}
      </section>
      {!course.units?.length ? (
        list(lessons)
      ) : (
        <div className="chapter-tree">
          {lessonGroups(course, lessons).map((group, index) => (
            <details className="chapter" key={group.id}>
              <summary>
                <span className="chapter-index">CHAPTER {String(index + 1).padStart(2, "0")}</span>
                <strong>{group.title}</strong>{" "}
                <span className="chapter-summary-count">
                  {group.lessons.filter((l) => records[l.id]?.completed).length} /{" "}
                  {group.lessons.length} 节
                </span>
              </summary>
              {list(group.lessons)}
            </details>
          ))}
        </div>
      )}
    </>
  );
}
