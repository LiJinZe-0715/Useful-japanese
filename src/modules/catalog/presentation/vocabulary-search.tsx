"use client";
import { useEffect, useRef, useState } from "react";
import { href } from "../../../shared/paths";

type SearchEntry = {
  /** word */ w: string;
  /** reading */ r: string;
  /** meaning */ m: string;
  /** courseId */ c: string;
  /** lessonId */ l: string;
  /** topic slug */ t: string;
  /** lesson title */ n: string;
  /** extra searchable text (usage, collocations, examples) */ s: string;
};

const LIMIT = 40;

// Cross-course lookup for the chunked glossary. The index is a generated static
// asset fetched on the first keystroke, so no page has to carry every entry just
// to stay searchable.
export function VocabularySearch() {
  const [query, setQuery] = useState("");
  const [entries, setEntries] = useState<SearchEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const loading = useRef(false);
  const needle = query.trim().toLocaleLowerCase();

  useEffect(() => {
    if (!needle || entries || loading.current) return;
    loading.current = true;
    fetch(href("/vocabulary-search.json"))
      .then((response) =>
        response.ok ? response.json() : Promise.reject(new Error(String(response.status))),
      )
      .then((data: SearchEntry[]) => setEntries(data))
      .catch(() => setFailed(true))
      .finally(() => {
        loading.current = false;
      });
  }, [needle, entries]);

  const matches =
    entries && needle
      ? entries.filter((entry) =>
          [entry.w, entry.r, entry.m, entry.s].join(" ").toLocaleLowerCase().includes(needle),
        )
      : [];

  return (
    <section aria-label="全部词汇搜索">
      <div className="controls">
        <label>
          搜索全部词汇{" "}
          <input
            type="search"
            value={query}
            placeholder="Java、監査、证据、しさんひょう…"
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
      </div>
      {needle && !entries && !failed && (
        <p className="muted" role="status">
          正在加载全部词汇索引…
        </p>
      )}
      {failed && <p role="alert">词汇索引加载失败，请刷新后重试，或直接进入下面的分册逐册浏览。</p>}
      {entries && needle && (
        <p className="muted" role="status">
          命中 {matches.length} 条
          {matches.length > LIMIT ? `，显示前 ${LIMIT} 条，请把关键词写得更具体` : ""}。
        </p>
      )}
      {!!matches.length && (
        <ol className="lesson-list">
          {matches.slice(0, LIMIT).map((entry, index) => (
            <li key={`${entry.c}:${entry.l}:${entry.w}:${index}`}>
              <a href={href(`/vocabulary/${entry.c}/${entry.t}/`)}>
                <span className="lesson-list-title" lang="ja">
                  {entry.w} <small className="reading">{entry.r}</small>
                </span>
                <span className="lesson-list-status">
                  {entry.m} · {entry.n}
                </span>
                <span className="lesson-arrow" aria-hidden="true">
                  →
                </span>
              </a>
            </li>
          ))}
        </ol>
      )}
      {entries && needle && !matches.length && <p>没有找到匹配词汇，请换一个关键词。</p>}
    </section>
  );
}
