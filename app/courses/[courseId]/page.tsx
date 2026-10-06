import { notFound } from "next/navigation";
import { catalog } from "../../../src/bootstrap/catalog";
import { summarizeLessons } from "../../../src/modules/catalog/application/catalog";
import { CourseProgress } from "../../../src/modules/learning/presentation/course-progress";
import { href } from "../../../src/shared/paths";
export function generateStaticParams() {
  return catalog.courses().map((p) => ({ courseId: p.course.id }));
}
export default async function CoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const p = catalog.course(courseId);
  if (!p) notFound();
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">
            COURSE DIRECTORY / {p.course.learningMode === "life" ? "DAILY LIFE" : "BUSINESS"}
          </p>
          <h1>{p.course.title}</h1>
          <p className="page-description">{p.course.description}</p>
        </div>
        <div className="heading-card">
          <span className="muted">学习路线</span>
          <strong>
            {p.lessons.length}
            <small> 节课程</small>
          </strong>
          <span className="tag">
            {p.course.levels.length ? p.course.levels.join(" / ") : "商务沟通"}
          </span>
        </div>
      </div>
      {p.course.id === "it-business" && (
        <section aria-label="岗位日语学习路线">
          <h2>按上班任务学，再练到能直接回应</h2>
          <p>
            先从入职、任务沟通和开发全过程建立表达基础，再进入 Java 后端专题。
            每课练口头汇报、书面消息和现场追问；隐藏原文后，换成自己的项目再说一次。
          </p>
          <ul>
            <li>
              <a href={href("/courses/it-business/onboarding-1/")}>职场路线</a>
              ：入职、需求、设计、实现、测试、交付、故障、交接与独立负责。
            </li>
            <li>
              <a href={href("/courses/it-business/java-backend-1/")}>Java 后端基础</a>
              ：继续学习核心代码、Spring、API、数据库、事务、测试、缓存消息、部署和安全。
            </li>
            <li>
              <a href={href("/courses/it-business/frontend-collaboration-1/")}>前端与业务协作</a>
              ：页面、类型、异步接口、订单、库存、账单、审批和批处理。
            </li>
            <li>
              <a href={href("/courses/it-business/business-communication-1/")}>商务沟通</a>
              ：礼貌提异议、协商范围与交期、正式邮件、客户说明和会议记录。
            </li>
          </ul>
          <p>
            需要查说法时，打开<a href={href("/vocabulary/")}>全部开发与职场词汇</a>
            ，按关键词或主题查找，再回到相应课文练习。
          </p>
        </section>
      )}
      {p.lessons.length ? (
        <CourseProgress course={p.course} lessons={summarizeLessons(p.lessons)} />
      ) : (
        <p>本课程暂未添加课次。</p>
      )}
    </>
  );
}
