import { notFound } from "next/navigation";
import { catalog } from "../../../../src/bootstrap/catalog";
import {
  vocabularyTopicTitle,
  vocabularyTopics,
} from "../../../../src/modules/catalog/application/vocabulary";
import { VocabularyView } from "../../../../src/modules/catalog/presentation/vocabulary-view";
import { href } from "../../../../src/shared/paths";

export function generateStaticParams() {
  return catalog
    .courses()
    .filter(({ course }) => course.learningMode === "business")
    .flatMap(({ course, lessons }) =>
      vocabularyTopics(course, lessons).map((topic) => ({
        courseId: course.id,
        topicId: topic.slug,
      })),
    );
}

export default async function VocabularyTopicPage({
  params,
}: {
  params: Promise<{ courseId: string; topicId: string }>;
}) {
  const { courseId, topicId } = await params;
  const coursePackage = catalog.course(courseId);
  if (!coursePackage || coursePackage.course.learningMode !== "business") notFound();
  const topics = vocabularyTopics(coursePackage.course, coursePackage.lessons);
  const index = topics.findIndex((topic) => topic.slug === topicId);
  if (index < 0) notFound();
  const topic = topics[index];
  const previous = topics[index - 1];
  const next = topics[index + 1];
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">BUSINESS / WORKPLACE VOCABULARY</p>
          <h1>{vocabularyTopicTitle(topic)}</h1>
          <p className="page-description">
            把术语放进能直接说出口的工作句子里。读词、听例句，再回到课文练习沟通。
          </p>
        </div>
        <div className="heading-card">
          <span className="muted">本册词汇</span>
          <strong>
            {topic.entries.length}
            <small> 条</small>
          </strong>
          <span className="tag">同一词在不同课次的用法分别保留</span>
        </div>
      </div>
      <VocabularyView topics={[{ id: topic.id, title: topic.title, entries: topic.entries }]} />
      <nav className="controls">
        {previous && (
          <a href={href(`/vocabulary/${courseId}/${previous.slug}/`)}>← {previous.title}</a>
        )}
        <a href={href("/vocabulary/")}>词汇分册</a>
        {next && <a href={href(`/vocabulary/${courseId}/${next.slug}/`)}>{next.title} →</a>}
      </nav>
    </>
  );
}
