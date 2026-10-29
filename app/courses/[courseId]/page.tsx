import { notFound } from "next/navigation";
import { catalog } from "../../../src/bootstrap/catalog";
import {
  groupLessons,
  summarizeLessons,
} from "../../../src/modules/catalog/application/course-catalog";
import { CourseGuide } from "../../../src/modules/catalog/presentation/course-guide";
import { CourseProgress } from "../../../src/modules/learning/presentation/course-progress";

export function generateStaticParams() {
  return catalog.courses().map((coursePackage) => ({ courseId: coursePackage.course.id }));
}

export default async function CoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const coursePackage = catalog.course(courseId);
  if (!coursePackage) notFound();
  const summaries = summarizeLessons(coursePackage.lessons);
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            COURSE DIRECTORY /{" "}
            {coursePackage.course.learningMode === "life" ? "DAILY LIFE" : "BUSINESS"}
          </p>
          <h1>{coursePackage.course.title}</h1>
          <p className="page-description">{coursePackage.course.description}</p>
        </div>
        <div className="heading-card">
          <span className="muted">学习路线</span>
          <strong>
            {coursePackage.lessons.length}
            <small> 节课程</small>
          </strong>
          <span className="tag">
            {coursePackage.course.levels.length
              ? coursePackage.course.levels.join(" / ")
              : "商务沟通"}
          </span>
        </div>
      </div>
      {coursePackage.course.guide && (
        <CourseGuide courseId={coursePackage.course.id} guide={coursePackage.course.guide} />
      )}
      {coursePackage.lessons.length ? (
        <CourseProgress
          courseId={coursePackage.course.id}
          lessons={summaries}
          groups={
            coursePackage.course.units?.length ? groupLessons(coursePackage.course, summaries) : []
          }
        />
      ) : (
        <p>本课程暂未添加课次。</p>
      )}
    </>
  );
}
