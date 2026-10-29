"use client";
import type { Lesson } from "../../domain/content";
import {
  communicationFunctionsLabel,
  homeworkDetails,
  HOMEWORK_TYPE_LABELS,
} from "../../application/lesson-sections";
import { SpeakButton } from "../../../speech/presentation/speak-button";

type Homework = NonNullable<Lesson["homework"]>[number];

export function HomeworkSection({
  homework,
  drafts,
  loaded,
  showZh,
  onDraftChange,
}: {
  homework: Homework[];
  drafts: Record<string, string>;
  loaded: boolean;
  showZh: boolean;
  onDraftChange: (homeworkId: string, value: string) => void;
}) {
  return (
    <>
      {homework.map((task) => (
        <div className="entry homework-entry" key={task.id}>
          <h3>{HOMEWORK_TYPE_LABELS[task.type]}</h3>
          <p>{task.situation}</p>
          {homeworkDetails(task).map((detail) => (
            <div key={detail.title}>
              <h4>{detail.title}</h4>
              <ul>
                {detail.values.map((value) => (
                  <li key={value}>{value}</li>
                ))}
              </ul>
            </div>
          ))}
          {!!task.functions?.length && (
            <p>沟通功能：{communicationFunctionsLabel(task.functions)}</p>
          )}
          {task.type === "written" && (
            <label>
              个人草稿（仅保存在本设备）
              <textarea
                disabled={!loaded}
                value={Object.hasOwn(drafts, task.id) ? drafts[task.id] : ""}
                onChange={(event) => onDraftChange(task.id, event.target.value)}
              />
            </label>
          )}
          <details>
            <summary>查看参考答案</summary>
            {task.answers.map((answer, index) => (
              <div className="material-paragraph" key={index}>
                <p lang="ja">{answer.ja}</p>
                {showZh && answer.zh && <p className="translation">{answer.zh}</p>}
                {task.type === "oral" && <SpeakButton text={answer.ttsText ?? answer.ja} />}
              </div>
            ))}
          </details>
        </div>
      ))}
    </>
  );
}
