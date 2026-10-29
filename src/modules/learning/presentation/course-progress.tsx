"use client";
import { useEffect, useState } from "react";
// Type-only: the lesson summary shape belongs to catalog, but this panel only
// renders what the route already grouped for it.
import type { LessonSummary } from "../../catalog/application/course-catalog";
import { useLearning } from "./learning-provider";
import type { StudyRecord } from "../domain/study-record";
import { href } from "../../../shared/paths";

export type LessonGroup = { id: string; title: string; lessons: LessonSummary[] };

export function CourseProgress({
  courseId,
  lessons,
  groups,
}: {
  courseId: string;
  lessons: LessonSummary[];
  groups: LessonGroup[];
}) {
  const learning = useLearning();
  const [records, setRecords] = useState<Record<string, StudyRecord>>({});
  useEffect(() => {
    const refreshRecords = () =>
      setRecords(
        Object.fromEntries(
          lessons.map((lesson) => [lesson.id, learning.load(courseId, lesson.id)]),
        ),
      );
    refreshRecords();
    return learning.subscribe(courseId, "", refreshRecords);
  }, [courseId, lessons, learning]);
  const renderLessonList = (items: LessonSummary[]) => (
    <ol className="lesson-list">
      {items.map((lesson, index) => (
        <li key={lesson.id}>
          <a href={href(`/courses/${courseId}/${lesson.id}/`)}>
            <span className="lesson-number">{String(index + 1).padStart(2, "0")}</span>
            <span className="lesson-list-title">{lesson.title}</span>
            <span className="lesson-list-status">
              {lesson.level} {records[lesson.id]?.bookmarked ? "★ 已收藏 " : ""}
              {records[lesson.id]?.completed ? "✓ 已学过" : "未学习"}
            </span>
            <span className="lesson-arrow" aria-hidden="true">
              →
            </span>
          </a>
        </li>
      ))}
    </ol>
  );
  const completedCount = lessons.filter((lesson) => records[lesson.id]?.completed).length;
  const nextLesson = lessons.find((lesson) => !records[lesson.id]?.completed) ?? lessons[0];
  return (
    <>
      <section className="course-progress-panel" aria-label="课程学习记录">
        <div>
          <span className="eyebrow">YOUR PROGRESS</span>
          <h2>
            {completedCount} <small>/ {lessons.length} 节已学过</small>
          </h2>
          <progress value={completedCount} max={lessons.length || 1} aria-label="已学过课次占比" />
          <p className="muted">完成标记仅记录学习经历。</p>
        </div>
        {nextLesson && (
          <a className="button-primary" href={href(`/courses/${courseId}/${nextLesson.id}/`)}>
            {completedCount ? "继续学习" : "开始学习"} <span aria-hidden="true">→</span>
          </a>
        )}
      </section>
      {!groups.length ? (
        renderLessonList(lessons)
      ) : (
        <div className="chapter-tree">
          {groups.map((group, index) => (
            <details className="chapter" key={group.id}>
              <summary>
                <span className="chapter-index">CHAPTER {String(index + 1).padStart(2, "0")}</span>
                <strong>{group.title}</strong>{" "}
                <span className="chapter-summary-count">
                  {group.lessons.filter((lesson) => records[lesson.id]?.completed).length} /{" "}
                  {group.lessons.length} 节
                </span>
              </summary>
              {renderLessonList(group.lessons)}
            </details>
          ))}
        </div>
      )}
    </>
  );
}
