import guide from "../../src/generated/guide.json";
export const dynamic = "force-static";
export default function Guide() {
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">DOCUMENTATION / CONTENT GUIDE</p>
          <h1>内容格式指南</h1>
          <p className="page-description">
            课程结构、课文格式与内容编写说明。以下内容在开发与构建时同步。
          </p>
        </div>
      </div>
      <pre className="guide">{guide}</pre>
    </>
  );
}
