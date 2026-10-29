"use client";
import type { Lesson } from "../../domain/content";
import { Examples } from "./examples";
import { SourceButton } from "./source-button";

type Expression = NonNullable<Lesson["expressions"]>[number];
type Source = NonNullable<Expression["source"]>;

export function ExpressionsSection({
  expressions,
  showZh,
  onOpenSource,
}: {
  expressions: Expression[];
  showZh: boolean;
  onOpenSource: (source: Source) => void;
}) {
  return (
    <>
      {expressions.map((expression, index) => (
        <div className="entry rule-entry" key={expression.id}>
          <div className="rule-heading">
            <span className="entry-number">句型 {String(index + 1).padStart(2, "0")}</span>
            <h3 lang="ja">{expression.pattern}</h3>
            <p className="entry-meaning">{expression.meaning}</p>
            <p className="entry-note">
              {expression.function} · 适用：{expression.audience}
            </p>
          </div>
          <div className="rule-body">
            {expression.notes.map((note) => (
              <p key={note}>{note}</p>
            ))}
            {expression.slots.map((slot) => (
              <p key={slot.key}>
                {slot.key}：{slot.description}
              </p>
            ))}
            <Examples items={expression.examples} showZh={showZh} />
            {expression.source && <SourceButton onOpen={() => onOpenSource(expression.source!)} />}
          </div>
        </div>
      ))}
    </>
  );
}
