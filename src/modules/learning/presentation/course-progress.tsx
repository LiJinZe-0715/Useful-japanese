"use client";
import {useEffect, useState} from "react";
import type {Course} from "../../catalog/domain/content";
import {groupLessons, type LessonSummary} from "../../catalog/application/course-catalog";
import {learning} from "../../../bootstrap/learning";
import type {StudyRecord} from "../domain/study-record";
import {href} from "../../../shared/paths";

export function CourseProgress({course, lessons}: { course: Course; lessons: LessonSummary[] }) {
    const [records, setRecords] = useState<Record<string, StudyRecord>>({});
    useEffect(() => {
        const refreshRecords = () =>
            setRecords(
                Object.fromEntries(
                    lessons.map((lesson) => [lesson.id, learning.load(course.id, lesson.id)]),
                ),
            );
        refreshRecords();
        return learning.subscribe(course.id, "", refreshRecords);
    }, [course.id, lessons]);
    const renderLessonList = (items: LessonSummary[]) => (
        <ol className="lesson-list">
            {items.map((lesson, index) => (
                <li key={lesson.id}>
                    <a href={href(`/courses/${course.id}/${lesson.id}/`)}>
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
                    <progress value={completedCount} max={lessons.length || 1} aria-label="已学过课次占比"/>
                    <p className="muted">完成标记仅记录学习经历。</p>
                </div>
                {nextLesson && (
                    <a className="button-primary" href={href(`/courses/${course.id}/${nextLesson.id}/`)}>
                        {completedCount ? "继续学习" : "开始学习"} <span aria-hidden="true">→</span>
                    </a>
                )}
            </section>
            {!course.units?.length ? (
                renderLessonList(lessons)
            ) : (
                <div className="chapter-tree">
                    {groupLessons(course, lessons).map((group, index) => (
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
