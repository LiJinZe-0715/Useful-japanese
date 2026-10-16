"use client";
import type {ReactNode} from "react";
import {usePathname} from "next/navigation";
import type {Course} from "../domain/content";
import {groupLessons, type LessonSummary} from "../application/course-catalog";
import {href, isWithinRoute} from "../../../shared/paths";

export function LearningShell({
                                  courses,
                                  children,
                              }: {
    courses: { course: Course; lessons: LessonSummary[] }[];
    children: ReactNode;
}) {
    const pathname = usePathname();
    const currentCourse = courses.find(({course}) =>
        isWithinRoute(pathname, `/courses/${course.id}`),
    );
    const selectedCourse =
        currentCourse ??
        (isWithinRoute(pathname, "/vocabulary")
            ? courses.find(({course}) => course.learningMode === "business")
            : undefined) ??
        courses[0];
    return (
        <div className="workspace">
            <aside className="course-sidebar" aria-label="学习导航">
                <div className="sidebar-label">
                    <span>LEARNING PATH</span>
                    <span className="tag">SCENE BASED</span>
                </div>
                <nav className="workspace-links" aria-label="平台导航">
                    <a
                        href={href("/vocabulary/")}
                        aria-current={isWithinRoute(pathname, "/vocabulary") ? "page" : undefined}
                    >
                        商务与职场词汇 <span aria-hidden="true">↗</span>
                    </a>
                    <a
                        href={href("/")}
                        aria-current={pathname === "/" || pathname === href("/") ? "page" : undefined}
                    >
                        课程总览 <span aria-hidden="true">↗</span>
                    </a>
                    <a
                        href={href("/guide/")}
                        aria-current={isWithinRoute(pathname, "/guide") ? "page" : undefined}
                    >
                        内容格式指南 <span aria-hidden="true">↗</span>
                    </a>
                </nav>
                <nav className="course-switch" aria-label="课程路线">
                    {courses.map(({course}) => (
                        <a
                            key={course.id}
                            href={href(`/courses/${course.id}/`)}
                            title={course.title}
                            className={selectedCourse?.course.id === course.id ? "selected" : ""}
                        >
                            {course.title.split("：")[0]}
                        </a>
                    ))}
                </nav>
                {selectedCourse && (
                    <nav className="sidebar-chapters" aria-label="课程目录">
                        <a
                            className="sidebar-course-title"
                            href={href(`/courses/${selectedCourse.course.id}/`)}
                        >
                            {selectedCourse.course.title}
                            <span>{selectedCourse.lessons.length} 节课程</span>
                        </a>
                        {groupLessons(selectedCourse.course, selectedCourse.lessons).map((group, index) => (
                            <details
                                key={`${selectedCourse.course.id}:${group.id}`}
                                className="sidebar-chapter"
                                open={
                                    group.lessons.some((lesson) =>
                                        isWithinRoute(pathname, `/courses/${selectedCourse.course.id}/${lesson.id}`),
                                    ) ||
                                    (!isWithinRoute(pathname, `/courses/${selectedCourse.course.id}`) && index === 0)
                                }
                            >
                                <summary>
                  <span className="chapter-index">
                    CHAPTER {String(index + 1).padStart(2, "0")}
                  </span>
                                    <strong>{group.title}</strong>
                                    <span className="chapter-count">{group.lessons.length} 节</span>
                                </summary>
                                <div className="sidebar-lessons">
                                    {group.lessons.map((lesson, i) => {
                                        const route = `/courses/${selectedCourse.course.id}/${lesson.id}`;
                                        const active = isWithinRoute(pathname, route);
                                        return (
                                            <a
                                                key={lesson.id}
                                                href={href(`${route}/`)}
                                                aria-current={active ? "page" : undefined}
                                            >
                        <span className="sidebar-lesson-meta">
                          第 {index + 1}.{i + 1} 课 {lesson.level && `· ${lesson.level}`}
                        </span>
                                                <strong>{lesson.title}</strong>
                                            </a>
                                        );
                                    })}
                                </div>
                            </details>
                        ))}
                    </nav>
                )}
                <div className="sidebar-note">
                    <span className="eyebrow">STUDY AT YOUR OWN PACE</span>
                    <p>
                        按章节循序渐进。
                        <br/>
                        听读、跟读，再练习表达。
                    </p>
                    <span className="muted">学习记录仅保存在本设备。</span>
                </div>
            </aside>
            <div className="workspace-content">
                <main id="main-content">
                    <div className="android-download" data-android-download>
                        <div><strong>Nihongo Android App</strong><p>离线学习生活、开发与审计日语 · Android 8.0 及以上</p></div>
                        <a href={href("/downloads/Useful-japanese.apk")} download="Useful-japanese.apk">下载 Android APK</a>
                    </div>
                    {children}
                </main>
                <footer className="site-footer">
                    日本語 · 自主学习<span>合成语音 / 本地学习记录</span>
                </footer>
            </div>
        </div>
    );
}
