"use client";
import type { Lesson } from "../../domain/content";
import { SpeakButton } from "../../../speech/presentation/speak-button";
import { Examples } from "./examples";
import { SourceButton } from "./source-button";

type VocabularyEntry = NonNullable<Lesson["vocabulary"]>[number];
type Source = NonNullable<VocabularyEntry["source"]>;

export function VocabularySection({
  entries,
  showZh,
  showReading,
  onOpenSource,
}: {
  entries: VocabularyEntry[];
  showZh: boolean;
  showReading: boolean;
  onOpenSource: (source: Source) => void;
}) {
  return (
    <>
      {entries.map((entry) => (
        <div className="entry vocabulary-entry" key={entry.id}>
          <div className="entry-heading">
            <div>
              <h3 lang="ja">
                {entry.word} {showReading && <small className="reading">{entry.reading}</small>}
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
          <Examples items={entry.examples} showZh={showZh} />
          {entry.source && <SourceButton onOpen={() => onOpenSource(entry.source!)} />}
        </div>
      ))}
    </>
  );
}
