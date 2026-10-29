import { catalog } from "../../src/bootstrap/catalog";
import { vocabularyTopics } from "../../src/modules/catalog/application/vocabulary";
import { VocabularySearch } from "../../src/modules/catalog/presentation/vocabulary-search";
import { href } from "../../src/shared/paths";

export default function VocabularyPage() {
  const courses = catalog
    .courses()
    .filter(({ course }) => course.learningMode === "business")
    .map(({ course, lessons }) => ({
      id: course.id,
      title: course.title.split("：")[0],
      topics: vocabularyTopics(course, lessons),
    }))
    .filter((course) => course.topics.length);
  const entryCount = courses.reduce(
    (total, course) =>
      total + course.topics.reduce((count, topic) => count + topic.entries.length, 0),
    0,
  );
  if (!courses.length) return <p>暂未发布职场词汇。</p>;
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">BUSINESS / WORKPLACE VOCABULARY</p>
          <h1>商务与职场词汇</h1>
          <p className="page-description">
            把术语放进能直接说出口的工作句子里。读词、听例句，再回到课文练习沟通。
          </p>
        </div>
        <div className="heading-card">
          <span className="muted">课程词汇</span>
          <strong>
            {entryCount}
            <small> 条</small>
          </strong>
          <span className="tag">按场景保留词汇用法</span>
        </div>
      </div>
      <p className="muted">
        词汇按课程单元分册，每册只加载该单元的词汇，翻查更快。要跨全部课程找一个词，用下面的搜索。
      </p>
      <VocabularySearch />
      {courses.map((course) => (
        <section key={course.id}>
          <h2>{course.title}</h2>
          <ol className="lesson-list">
            {course.topics.map((topic, index) => (
              <li key={topic.id}>
                <a href={href(`/vocabulary/${course.id}/${topic.slug}/`)}>
                  <span className="lesson-number">{String(index + 1).padStart(2, "0")}</span>
                  <span className="lesson-list-title">{topic.title}</span>
                  <span className="lesson-list-status">{topic.entries.length} 条</span>
                  <span className="lesson-arrow" aria-hidden="true">
                    →
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </section>
      ))}
    </>
  );
}
