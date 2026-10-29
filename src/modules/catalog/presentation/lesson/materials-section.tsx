"use client";
import type { Lesson } from "../../domain/content";
import { SpeakButton } from "../../../speech/presentation/speak-button";
import { href } from "../../../../shared/paths";
import { Examples } from "./examples";

type Material = NonNullable<Lesson["materials"]>[number];
type Shadowing = NonNullable<Lesson["shadowing"]>[number];

export function MaterialsSection({
  course,
  lesson,
  showZh,
  showReading,
  onPlayShadowing,
}: {
  course: { id: string };
  lesson: Lesson;
  showZh: boolean;
  showReading: boolean;
  onPlayShadowing: (practice: Shadowing) => void;
}) {
  return (
    <>
      {lesson.materials?.map((material: Material) => (
        <div className="material" key={material.id}>
          <h3>{material.title}</h3>
          {material.blocks.map((block, index) =>
            block.type === "paragraph" ? (
              <div className="material-paragraph" key={index}>
                {block.hideTranscript ? (
                  <details>
                    <summary>查看听力原文</summary>
                    <p lang="ja">{block.ja}</p>
                    {showReading && block.reading && <p className="reading">{block.reading}</p>}
                    {showZh && block.zh && <p className="translation">{block.zh}</p>}
                  </details>
                ) : (
                  <>
                    <p lang="ja">{block.ja}</p>
                    {showReading && block.reading && <p className="reading">{block.reading}</p>}
                    {showZh && block.zh && <p className="translation">{block.zh}</p>}
                  </>
                )}
                <SpeakButton
                  text={block.ttsText ?? block.ja}
                  label={block.hideTranscript ? "播放听力" : "朗读"}
                />
              </div>
            ) : block.type === "list" ? (
              <ul key={index}>
                {block.items.map((item, itemIndex) => (
                  <li key={itemIndex}>
                    <Examples items={[item]} showZh={showZh} />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="table-scroll" key={index}>
                <table>
                  <thead>
                    <tr>
                      {block.headers.map((header, columnIndex) => (
                        <th key={columnIndex}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, columnIndex) => (
                          <td key={columnIndex}>{cell}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ),
          )}
          {material.asset && (
            <a href={href(`/course-assets/${course.id}/${material.asset.slice(7)}`)}>
              查看关联素材
            </a>
          )}
        </div>
      ))}
      {!!lesson.shadowing?.length && (
        <div>
          <h3>听后跟读与影子跟读</h3>
          <p>
            听后跟读：先听一句，暂停后模仿。影子跟读：熟悉意思后，播放原句并稍晚同步跟读；可降低语速和循环片段。
          </p>
          {lesson.shadowing.map((practice) => (
            <div className="practice-entry" key={practice.id}>
              <p>{practice.prompt}</p>
              <button onClick={() => onPlayShadowing(practice)}>播放跟读原句</button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
