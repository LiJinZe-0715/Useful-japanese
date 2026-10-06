import { notFound } from "next/navigation";
import { catalog } from "../../../../src/bootstrap/catalog";
import { LessonView } from "../../../../src/modules/catalog/presentation/lesson";
export function generateStaticParams() {
  return catalog
    .courses()
    .flatMap((p) => p.lessons.map((l) => ({ courseId: p.course.id, lessonId: l.id })));
}
export default async function LessonPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const { courseId, lessonId } = await params;
  const p = catalog.course(courseId);
  const lesson = catalog.lesson(courseId, lessonId);
  if (!p || !lesson) notFound();
  const i = p.lessons.findIndex((l) => l.id === lessonId);
  return (
    <LessonView
      key={`${courseId}:${lessonId}`}
      course={p.course}
      lesson={lesson}
      previous={p.lessons[i - 1]?.id}
      next={p.lessons[i + 1]?.id}
    />
  );
}
