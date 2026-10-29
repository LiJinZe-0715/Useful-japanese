"use client";
import { SpeakButton } from "../../../speech/presentation/speak-button";

export type Example = { ja: string; zh?: string; ttsText?: string };

export function Examples({ items, showZh }: { items: Example[]; showZh: boolean }) {
  return (
    <>
      {items.map((example, exampleIndex) => (
        <div className="example-line" key={exampleIndex}>
          <div>
            <p lang="ja">{example.ja}</p>
            {showZh && example.zh && <p className="translation">{example.zh}</p>}
          </div>
          <SpeakButton text={example.ttsText ?? example.ja} label="播放例句" />
        </div>
      ))}
    </>
  );
}
