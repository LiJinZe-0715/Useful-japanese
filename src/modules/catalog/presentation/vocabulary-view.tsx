"use client";
import { useState } from "react";
import { SpeakButton } from "../../speech/presentation/speak-button";
import { SpeechStatus, VoiceSettings } from "../../speech/presentation/speech-controls";
import { href } from "../../../shared/paths";
import type { VocabularyEntry } from "../application/vocabulary";

// Renders one glossary topic. Entries arrive as props, so the payload stays
// proportional to a single unit instead of the whole course.
export function VocabularyView({
  topics,
}: {
  topics: { id: string; title: string; entries: VocabularyEntry[] }[];
}) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("");
  const searchText = query.trim().toLocaleLowerCase();
  const entryCount = topics.reduce((total, topic) => total + topic.entries.length, 0);
  const visibleTopics = topics
    .filter((topic) => !group || group === topic.id)
    .map((topic) => ({
      ...topic,
      entries: topic.entries.filter(
        (entry) =>
          !searchText ||
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
            .includes(searchText),
      ),
    }))
    .filter((topic) => topic.entries.length);
  const matchingEntryCount = visibleTopics.reduce(
    (total, topic) => total + topic.entries.length,
    0,
  );
  return (
    <>
      <VoiceSettings />
      <SpeechStatus />
      <section aria-label="词汇检索">
        <div className="controls">
          <label>
            搜索词汇{" "}
            <input
              type="search"
              value={query}
              placeholder="Java、監査、证据、しさんひょう…"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          {topics.length > 1 && (
            <label>
              主题{" "}
              <select value={group} onChange={(event) => setGroup(event.target.value)}>
                <option value="">全部主题</option>
                {topics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.title}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setGroup("");
            }}
          >
            显示全部
          </button>
        </div>
        <p className="muted" role="status">
          显示 {matchingEntryCount} / {entryCount} 条。同一词在不同课次的用法分别保留。
        </p>
      </section>
      {!visibleTopics.length && (
        <p>
          {entryCount ? "没有找到匹配词汇，请换一个关键词或选择全部主题。" : "暂未发布职场词汇。"}
        </p>
      )}
      {visibleTopics.map((topic) => (
        <section key={topic.id}>
          <h2>{topic.title}</h2>
          {topic.entries.map((entry) => (
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
