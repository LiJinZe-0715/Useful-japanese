import { catalog } from "../../src/bootstrap/catalog";
import { lessonGroups } from "../../src/modules/catalog/application/catalog";
import { VocabularyView } from "../../src/modules/catalog/presentation/vocabulary";

export default function VocabularyPage() {
  const groups = catalog
    .courses()
    .filter(({ course }) => course.learningMode === "business")
    .flatMap(({ course, lessons }) =>
      lessonGroups(course, lessons).map((group) => ({
        id: `${course.id}:${group.id}`,
        title: `${course.title.split("：")[0]} · ${group.title}`,
        entries: group.lessons.flatMap((summary) => {
          const lesson = lessons.find((item) => item.id === summary.id)!;
          return (lesson.vocabulary ?? []).map((word) => ({
            ...word,
            id: `${course.id}:${lesson.id}:${word.id}`,
            courseId: course.id,
            lessonId: lesson.id,
            lessonTitle: lesson.title,
          }));
        }),
      })),
    )
    .filter((group) => group.entries.length);
  return <VocabularyView groups={groups} />;
}
