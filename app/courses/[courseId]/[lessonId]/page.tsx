import { notFound } from "next/navigation";
import { catalog } from "../../../../src/bootstrap/catalog";
import { LessonView } from "../../../../src/modules/catalog/presentation/lesson-view";

export function generateStaticParams() {
  return catalog.courses().flatMap((coursePackage) =>
    coursePackage.lessons.map((lesson) => ({
      courseId: coursePackage.course.id,
      lessonId: lesson.id,
    })),
  );
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const { courseId, lessonId } = await params;
  const coursePackage = catalog.course(courseId);
  const lesson = catalog.lesson(courseId, lessonId);
  if (!coursePackage || !lesson) notFound();
  const lessonIndex = coursePackage.lessons.findIndex((lesson) => lesson.id === lessonId);
  const { course } = coursePackage;
  return (
    <LessonView
      key={`${courseId}:${lessonId}`}
      course={{ id: course.id, title: course.title, learningMode: course.learningMode }}
      lesson={lesson}
      previousLessonId={coursePackage.lessons[lessonIndex - 1]?.id}
      nextLessonId={coursePackage.lessons[lessonIndex + 1]?.id}
    />
  );
}
