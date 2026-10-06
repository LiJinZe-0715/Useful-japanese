import { href } from "../src/shared/paths";
export default function NotFound() {
  return (
    <section className="empty-state">
      <p className="eyebrow">404 / PAGE NOT FOUND</p>
      <h1>未找到课程或课次</h1>
      <p className="page-description">可以从左侧目录选择课程，或返回总览重新开始。</p>
      <a className="button-primary" href={href("/")}>
        返回课程首页 →
      </a>
    </section>
  );
}
