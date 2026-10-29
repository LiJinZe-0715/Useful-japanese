import type { Course, Lesson } from "../domain/content";
import { groupLessons, summarizeLessons } from "./course-catalog";

export type VocabularyEntry = NonNullable<Lesson["vocabulary"]>[number] & {
  courseId: string;
  lessonId: string;
  lessonTitle: string;
};

export type VocabularyTopic = {
  /** Unit id, or "" when the course has lessons outside any unit. */
  id: string;
  /** URL segment for the topic; `all` covers lessons outside a unit. */
  slug: string;
  title: string;
  courseId: string;
  /** Course name without the "：..." suffix, used as a topic prefix. */
  courseTitle: string;
  entries: VocabularyEntry[];
};

// The glossary is chunked per unit so a single page never has to carry every
// entry of a course. Both the index and the per-topic route build from here, so
// the two cannot disagree about which words belong to which topic.
export function vocabularyTopics(course: Course, lessons: Lesson[]): VocabularyTopic[] {
  const summaries = summarizeLessons(lessons);
  const courseTitle = course.title.split("：")[0];
  return groupLessons(course, summaries)
    .map((group) => ({
      id: group.id,
      slug: group.id || "all",
      title: group.title,
      courseId: course.id,
      courseTitle,
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
    }))
    .filter((topic) => topic.entries.length);
}

export const vocabularyTopicTitle = (topic: VocabularyTopic) =>
  `${topic.courseTitle} · ${topic.title}`;
