"use client";
import type { Lesson } from "../../domain/content";
import { Examples } from "./examples";

type Grammar = NonNullable<Lesson["grammar"]>[number];

export function GrammarSection({ grammar, showZh }: { grammar: Grammar[]; showZh: boolean }) {
  return (
    <>
      {grammar.map((item, index) => (
        <div className="entry rule-entry" key={item.id}>
          <div className="rule-heading">
            <span className="entry-number">
              文法 {String(index + 1).padStart(2, "0")}
              {item.level ? ` · ${item.level}` : ""}
            </span>
            <h3 lang="ja">{item.pattern}</h3>
            <p className="entry-meaning">{item.meaning}</p>
            <p className="entry-note">接续：{item.connection}</p>
          </div>
          <div className="rule-body">
            {item.notes.map((note) => (
              <p key={note}>{note}</p>
            ))}
            <Examples items={item.examples} showZh={showZh} />
          </div>
        </div>
      ))}
    </>
  );
}
