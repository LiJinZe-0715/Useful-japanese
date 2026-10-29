"use client";
import type { Lesson } from "../../domain/content";
import { dialogueSegmentId, isDialogueLineActive } from "../../../../shared/dialogue-playback";
import { CHANNEL_LABELS, VARIANT_LABELS } from "../../application/lesson-sections";
import { AudioControls } from "../../../speech/presentation/speech-controls";
import { useSpeech } from "../../../speech/presentation/speech-provider";
import { toSpeechSegment } from "./speech-segments";

export function DialogueSection({
  courseId,
  lesson,
  dialogueId,
  selectedLineIds,
  loop,
  showZh,
  showReading,
  onSelectDialogue,
  onToggleLine,
  onLoop,
}: {
  courseId: string;
  lesson: Lesson;
  dialogueId: string;
  selectedLineIds: string[];
  loop: boolean;
  showZh: boolean;
  showReading: boolean;
  onSelectDialogue: (dialogueId: string) => void;
  onToggleLine: (lineId: string, selected: boolean) => void;
  onLoop: (value: boolean) => void;
}) {
  const speech = useSpeech();
  const runtime = speech?.runtime;
  const dialogue = lesson.dialogues?.find((item) => item.id === dialogueId);
  const learner = lesson.speakers?.find((speaker) => speaker.id === lesson.learnerSpeakerId);
  const lines = dialogue?.lines ?? [];
  const playbackSegments = lines
    .filter((line) => !selectedLineIds.length || selectedLineIds.includes(line.id))
    .map((line) => toSpeechSegment(courseId, lesson, line, dialogueId));
  return (
    <>
      {lesson.scene && (
        <div className="scene">
          <p>{lesson.scene.background}</p>
          <p className="muted">
            渠道：
            {CHANNEL_LABELS[lesson.scene.channel]} · 关系：{lesson.scene.relationships}
          </p>
          <ul>
            {lesson.scene.tasks.map((task) => (
              <li key={task}>{task}</li>
            ))}
          </ul>
        </div>
      )}
      {!!lesson.dialogues?.length && (
        <>
          <p className="muted">
            你扮演的角色：<strong>{learner?.name}</strong> · {learner?.role}
          </p>
          <label>
            课文版本{" "}
            <select value={dialogueId} onChange={(event) => onSelectDialogue(event.target.value)}>
              {lesson.dialogues.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}（{VARIANT_LABELS[item.variant]}）
                </option>
              ))}
            </select>
          </label>
          <AudioControls
            items={playbackSegments}
            loop={loop}
            onLoop={(value) => {
              onLoop(value);
              runtime?.queue.setLoop(value);
            }}
          />
          <p className="muted">未选择句子时播放整段；勾选句子后播放选定片段。声音为合成语音。</p>
          {lines.map((line, index) => (
            <div
              className={`dialogue-line ${line.speakerId === learner?.id ? "speaker-primary" : ""} ${isDialogueLineActive(speech?.snapshot.state, dialogueSegmentId(courseId, lesson.id, dialogueId, line.id)) ? "active" : ""}`}
              key={line.id}
            >
              <label
                className="dialogue-speaker"
                title={lesson.speakers?.find((speaker) => speaker.id === line.speakerId)?.role}
              >
                <input
                  type="checkbox"
                  aria-label={`选择 ${line.id}`}
                  checked={selectedLineIds.includes(line.id)}
                  onChange={(event) => onToggleLine(line.id, event.target.checked)}
                />
                <span>
                  {lesson.speakers?.find((speaker) => speaker.id === line.speakerId)?.name}
                </span>
                <small>{String(index + 1).padStart(2, "0")}</small>
              </label>
              <button
                className="dialogue-sentence"
                aria-label={`逐句播放 ${index + 1}`}
                onClick={() =>
                  void runtime?.queue.play([toSpeechSegment(courseId, lesson, line, dialogueId)])
                }
              >
                <span lang="ja">{line.ja}</span>
                {showReading && line.reading && <span className="reading">{line.reading}</span>}
                {showZh && <span className="translation">{line.zh}</span>}
                <span className="sentence-play">▷ 播放这句</span>
              </button>
            </div>
          ))}
        </>
      )}
    </>
  );
}
