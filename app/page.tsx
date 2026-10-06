import { catalog } from "../src/bootstrap/catalog";
import { href } from "../src/shared/paths";
import { VoiceSettings } from "../src/modules/speech/presentation/controls";
export default function Home() {
  const courses = catalog.courses();
  const lessonCount = courses.reduce((total, { lessons }) => total + lessons.length, 0);
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">NIHONGO / LEARNING WORKSPACE</p>
          <h1>从听懂，到自然表达。</h1>
          <p className="page-description">
            选择你的学习路线，在真实场景中练习日语。每一课都有目标，每一步都能留下记录。
          </p>
        </div>
        <div className="heading-card">
          <span className="muted">课程内容</span>
          <strong>
            {lessonCount}
            <small> 节课程</small>
          </strong>
          <span className="tag">{courses.length} 个学习方向</span>
        </div>
      </div>
      <section id="voice-settings" aria-label="主页合成语音设置">
        <VoiceSettings />
      </section>
      <section className="path-panel" aria-label="课程学习方式">
        <div>
          <p className="eyebrow">LISTEN → PRACTICE → EXPRESS</p>
          <h2>按场景学习，逐步独立表达</h2>
          <p className="muted">先听懂课文，再练词汇与句型，最后通过跟读和作业把表达用起来。</p>
        </div>
        <div className="path-steps">
          {["听读理解", "跟读练习", "自主表达"].map((title, i) => (
            <div key={title}>
              <span>0{i + 1}</span>
              <strong>{title}</strong>
            </div>
          ))}
        </div>
        <div className="path-tags">
          <span className="tag">生活日语 · 分级学习</span>
          <span className="tag">商务日语 · 场景沟通</span>
          <span className="tag">收藏与本地学习记录</span>
        </div>
      </section>
      <div className="catalog-heading" id="courses">
        <div>
          <p className="eyebrow">CHOOSE YOUR TRACK</p>
          <h2>学习路线</h2>
        </div>
        <span className="muted">
          {courses.length} 门课程 / {lessonCount} 节内容
        </span>
      </div>
      {courses.length ? (
        <div className="course-grid">
          {courses.map(({ course, lessons }, index) => (
            <section className="course-card" key={course.id}>
              <div className="course-meta">
                <span className="eyebrow">
                  TRACK {String(index + 1).padStart(2, "0")} /{" "}
                  {course.learningMode === "life" ? "DAILY LIFE" : "BUSINESS"}
                </span>
                <span className="tag">{lessons.length} 节</span>
              </div>
              <h3>{course.title}</h3>
              <p className="course-description">{course.description}</p>
              <div className="course-units">
                {course.units?.map((unit) => (
                  <span key={unit.id}>{unit.title}</span>
                ))}
              </div>
              <div className="course-bottom">
                <span className="muted">
                  {course.levels.length ? course.levels.join(" / ") : "职场场景沟通"}
                </span>
                <a className="button-primary" href={href(`/courses/${course.id}/`)}>
                  进入课程 <span aria-hidden="true">→</span>
                </a>
              </div>
            </section>
          ))}
        </div>
      ) : (
        <section>
          <h2>还没有发布课程</h2>
          <p>新的学习内容正在准备中，发布后会出现在这里。</p>
          <a href={href("/guide/")}>阅读内容格式指南 →</a>
        </section>
      )}
      <section className="study-note">
        <span className="eyebrow">HOW TO STUDY</span>
        <h2>一节课，可以分几次练。</h2>
        <p className="muted">
          先听读理解，再逐句跟读。收藏需要复习的课次，写下自己的表达，准备好后标记学过。
        </p>
      </section>
    </>
  );
}
