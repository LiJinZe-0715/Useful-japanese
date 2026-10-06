"use client";
import { useState } from "react";
import type { Lesson } from "../domain/content";
import { SpeakButton } from "../../speech/presentation/controls";
import { href } from "../../../shared/paths";

type Entry = NonNullable<Lesson["vocabulary"]>[number] & {
  courseId: string;
  lessonId: string;
  lessonTitle: string;
};

export function VocabularyView({
  groups,
}: {
  groups: { id: string; title: string; entries: Entry[] }[];
}) {
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("");
  const search = query.trim().toLocaleLowerCase();
  const count = groups.reduce((total, group) => total + group.entries.length, 0);
  const visible = groups
    .filter((group) => !topic || topic === group.id)
    .map((group) => ({
      ...group,
      entries: group.entries.filter(
        (entry) =>
          !search ||
          [
            entry.word,
            entry.reading,
            entry.meaning,
            entry.usage ?? "",
            ...(entry.collocations ?? []),
            ...entry.examples.flatMap((example) => [example.ja, example.zh]),
          ]
            .join(" ")
            .toLocaleLowerCase()
            .includes(search),
      ),
    }))
    .filter((group) => group.entries.length);
  const matches = visible.reduce((total, group) => total + group.entries.length, 0);
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">DEVELOPMENT / WORKPLACE VOCABULARY</p>
          <h1>开发与职场词汇</h1>
          <p className="page-description">
            把术语放进能直接说出口的工作句子里。读词、听例句，再回到课文练习沟通。
          </p>
        </div>
        <div className="heading-card">
          <span className="muted">课程词汇</span>
          <strong>
            {count}
            <small> 条</small>
          </strong>
          <span className="tag">按场景保留词汇用法</span>
        </div>
      </div>
      <section aria-label="词汇检索">
        <div className="controls">
          <label>
            搜索词汇{" "}
            <input
              type="search"
              value={query}
              placeholder="Java、事务、認証、にんしょう…"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label>
            主题{" "}
            <select value={topic} onChange={(event) => setTopic(event.target.value)}>
              <option value="">全部主题</option>
              {groups.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.title}
                </option>
              ))}
            </select>
          </label>
          <button
            onClick={() => {
              setQuery("");
              setTopic("");
            }}
          >
            显示全部
          </button>
        </div>
        <p className="muted" role="status">
          显示 {matches} / {count} 条。默认展开全部词汇；同一词在不同课次的用法分别保留。
        </p>
      </section>
      {!visible.length && (
        <p>{count ? "没有找到匹配词汇，请换一个关键词或选择全部主题。" : "暂未发布职场词汇。"}</p>
      )}
      {visible.map((group) => (
        <section key={group.id}>
          <h2>{group.title}</h2>
          {group.entries.map((entry) => (
            <div className="entry vocabulary-entry" key={entry.id}>
              <div className="entry-heading">
                <div>
                  <h3 lang="ja">
                    {entry.word} <small className="reading">{entry.reading}</small>
                  </h3>
                  <p className="entry-meaning">{entry.meaning}</p>
                </div>
                <SpeakButton text={entry.reading} label="读词" />
              </div>
              {entry.usage && <p className="entry-note">{entry.usage}</p>}
              {!!entry.collocations?.length && (
                <p className="collocations">
                  <span>常用搭配</span>
                  {entry.collocations.join(" · ")}
                </p>
              )}
              {entry.examples.map((example, index) => (
                <div className="example-line" key={index}>
                  <div>
                    <p lang="ja">{example.ja}</p>
                    <p className="translation">{example.zh}</p>
                  </div>
                  <SpeakButton text={example.ttsText ?? example.ja} label="播放例句" />
                </div>
              ))}
              <a href={href(`/courses/${entry.courseId}/${entry.lessonId}/`)}>
                在课文中练习 · {entry.lessonTitle}
              </a>
            </div>
          ))}
        </section>
      ))}
    </>
  );
}
