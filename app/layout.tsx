import type { ReactNode } from "react";
import "./globals.css";
import { SpeechProvider } from "../src/modules/speech/presentation/provider";
import { href } from "../src/shared/paths";
import { catalog } from "../src/bootstrap/catalog";
import { summarizeLessons } from "../src/modules/catalog/application/catalog";
import { LearningShell } from "../src/modules/catalog/presentation/learning-shell";
export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <a className="skip-link" href="#main-content">
          跳到主要内容
        </a>
        <header className="site-header">
          <a className="brand" href={href("/")} aria-label="Nihongo 日语学习首页">
            <span className="brand-mark" aria-hidden="true">
              ⌘
            </span>
            <span>
              日本語<span className="brand-caption">NIHONGO / SCENE-BASED LEARNING</span>
            </span>
          </a>
          <nav aria-label="主导航">
            <a href={href("/#courses")}>探索课程</a>
            <a href={href("/vocabulary/")}>职场词汇</a>
            <a href={href("/guide/")}>内容格式指南</a>
          </nav>
          <span className="header-note">
            <span className="status-dot" /> 自主学习工作台
          </span>
        </header>
        <SpeechProvider>
          <LearningShell
            courses={catalog
              .courses()
              .map(({ course, lessons }) => ({ course, lessons: summarizeLessons(lessons) }))}
          >
            {children}
          </LearningShell>
        </SpeechProvider>
      </body>
    </html>
  );
}
