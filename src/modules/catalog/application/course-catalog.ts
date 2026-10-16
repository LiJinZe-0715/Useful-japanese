import type {Course, CoursePackage, Lesson} from "../domain/content";

export type LessonSummary = Pick<Lesson, "id" | "title" | "level" | "unitId" | "order">;

export function summarizeLessons(lessons: Lesson[]): LessonSummary[] {
    return lessons.map(({id, title, level, unitId, order}) => ({
        id,
        title,
        level,
        unitId,
        order,
    }));
}

export function groupLessons(course: Course, lessons: LessonSummary[]) {
    const sortedLessons = [...lessons].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
    const groups = [...(course.units ?? [])]
        .sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
        .map((unit) => ({
            id: unit.id,
            title: unit.title,
            lessons: sortedLessons.filter((lesson) => lesson.unitId === unit.id),
        }));
    const ungroupedLessons = sortedLessons.filter((lesson) => !lesson.unitId);
    if (ungroupedLessons.length) groups.push({id: "", title: "课次", lessons: ungroupedLessons});
    return groups;
}

export function createCatalog(coursePackages: CoursePackage[]) {
    const enabledPackages = coursePackages.filter((coursePackage) => coursePackage.course.enabled);
    return {
        courses: () => enabledPackages,
        course: (id: string) => enabledPackages.find((coursePackage) => coursePackage.course.id === id),
        lesson: (courseId: string, lessonId: string) =>
            enabledPackages
                .find((coursePackage) => coursePackage.course.id === courseId)
                ?.lessons.find((lesson) => lesson.id === lessonId),
    };
}
