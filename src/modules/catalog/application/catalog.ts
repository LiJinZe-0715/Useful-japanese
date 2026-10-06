import type { Course, CoursePackage, Lesson } from "../domain/content";
export type LessonSummary = Pick<Lesson, "id" | "title" | "level" | "unitId" | "order">;
export function summarizeLessons(lessons: Lesson[]): LessonSummary[] {
  return lessons.map(({ id, title, level, unitId, order }) => ({
    id,
    title,
    level,
    unitId,
    order,
  }));
}
export function lessonGroups(course: Course, lessons: LessonSummary[]) {
  const sorted = [...lessons].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
  const groups = [...(course.units ?? [])]
    .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
    .map((unit) => ({
      id: unit.id,
      title: unit.title,
      lessons: sorted.filter((lesson) => lesson.unitId === unit.id),
    }));
  const ungrouped = sorted.filter((lesson) => !lesson.unitId);
  if (ungrouped.length) groups.push({ id: "", title: "课次", lessons: ungrouped });
  return groups;
}
export function createCatalog(packages: CoursePackage[]) {
  const visible = packages.filter((p) => p.course.enabled);
  return {
    courses: () => visible,
    course: (id: string) => visible.find((p) => p.course.id === id),
    lesson: (courseId: string, lessonId: string) =>
      visible.find((p) => p.course.id === courseId)?.lessons.find((l) => l.id === lessonId),
  };
}
