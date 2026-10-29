"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { Course, Lesson } from "../domain/content";
import {
  buildSectionLinks,
  defaultSectionId,
  resolveSectionId,
  type LessonSectionId,
} from "../application/lesson-sections";
import type { StudyRecord } from "../../learning/domain/study-record";
import { useLearning } from "../../learning/presentation/learning-provider";
import { SpeechStatus, VoiceSettings } from "../../speech/presentation/speech-controls";
import { useSpeech } from "../../speech/presentation/speech-provider";
import { href } from "../../../shared/paths";
import { DialogueSection } from "./lesson/dialogue-section";
import { ExpressionsSection } from "./lesson/expressions-section";
import { GrammarSection } from "./lesson/grammar-section";
import { HomeworkSection } from "./lesson/homework-section";
import { LessonToolbar } from "./lesson/lesson-toolbar";
import { MaterialsSection } from "./lesson/materials-section";
import { speakerVoiceKey, toSpeechSegment } from "./lesson/speech-segments";
import { VocabularySection } from "./lesson/vocabulary-section";

type Shadowing = NonNullable<Lesson["shadowing"]>[number];

// The lesson page is a client component, so everything passed in is serialized into
// the RSC payload. Only these three course fields are used here; passing the whole
// course would ship its unit list to every lesson page for nothing.
export type LessonCourse = Pick<Course, "id" | "title" | "learningMode">;

export function LessonView({
  course,
  lesson,
  previousLessonId,
  nextLessonId,
}: {
  course: LessonCourse;
  lesson: Lesson;
  previousLessonId?: string;
  nextLessonId?: string;
}) {
  const learning = useLearning();
  const speech = useSpeech();
  const runtime = speech?.runtime;
  const [record, setRecord] = useState(() => learning.empty());
  const [loaded, setLoaded] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const recordRef = useRef(record);
  const savedRecordRef = useRef<StudyRecord | undefined>(undefined);
  const updateRecord = (edit: (currentRecord: StudyRecord) => StudyRecord) => {
    const editedRecord = edit(recordRef.current);
    const saved = learning.save(course.id, lesson.id, editedRecord, savedRecordRef.current);
    setSaveFailed(!saved);
    const currentRecord = saved ? learning.load(course.id, lesson.id) : editedRecord;
    if (saved) savedRecordRef.current = currentRecord;
    recordRef.current = currentRecord;
    setRecord(currentRecord);
  };
  const sectionLinks = buildSectionLinks(lesson);
  const [activeSection, setActiveSection] = useState<LessonSectionId | "">(
    defaultSectionId(sectionLinks),
  );
  const [showZh, setShowZh] = useState(true),
    [showReading, setShowReading] = useState(false),
    [dialogueId, setDialogueId] = useState(lesson.dialogues?.[0]?.id ?? ""),
    [selectedLineIds, setSelectedLineIds] = useState<string[]>([]),
    [loop, setLoop] = useState(false);
  useEffect(() => {
    const refreshRecord = () => {
      const mergedRecord = learning.reload(
        course.id,
        lesson.id,
        recordRef.current,
        savedRecordRef.current,
      );
      savedRecordRef.current = learning.load(course.id, lesson.id);
      recordRef.current = mergedRecord;
      setRecord(mergedRecord);
      setLoaded(true);
    };
    refreshRecord();
    return learning.subscribe(course.id, lesson.id, refreshRecord);
  }, [course.id, lesson.id, learning]);
  useEffect(() => () => runtime?.queue.stop(), [runtime]);
  const dialogue = lesson.dialogues?.find((item) => item.id === dialogueId);
  const lines = dialogue?.lines ?? [];
  const openSection = (requested: string) => {
    const id = resolveSectionId(sectionLinks, requested);
    runtime?.queue.stop();
    setActiveSection(id);
    updateRecord((currentRecord) => ({ ...currentRecord, position: id }));
    requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: "start" }));
  };
  const openSource = (source: { dialogueId: string; lineId: string }) => {
    runtime?.queue.stop();
    setDialogueId(source.dialogueId);
    setSelectedLineIds([source.lineId]);
    openSection("text");
  };
  const playShadowing = (practice: Shadowing) => {
    const sourceDialogue = lesson.dialogues?.find((item) => item.id === practice.dialogueId);
    setDialogueId(practice.dialogueId);
    setSelectedLineIds(practice.lineIds ?? []);
    void runtime?.queue.play(
      (sourceDialogue?.lines ?? [])
        .filter((line) => !practice.lineIds?.length || practice.lineIds.includes(line.id))
        .map((line) => toSpeechSegment(course.id, lesson, line, practice.dialogueId)),
      loop,
    );
  };
  const toggleLine = (lineId: string, selected: boolean) =>
    setSelectedLineIds((lineIds) =>
      selected ? [...lineIds, lineId] : lineIds.filter((id) => id !== lineId),
    );
  const renderSection = (id: LessonSectionId, title: string, children: ReactNode) => (
    <section
      id={id}
      hidden={activeSection !== id}
      onFocus={() => updateRecord((currentRecord) => ({ ...currentRecord, position: id }))}
    >
      <p className="eyebrow">
        {String(sectionLinks.findIndex((item) => item.id === id) + 1).padStart(2, "0")} /{" "}
        {sectionLinks.find((item) => item.id === id)?.title}
      </p>
      <h2>{title}</h2>
      {children}
    </section>
  );
  return (
    <article className="lesson-workspace">
      <p className="eyebrow">
        {course.title} ·{" "}
        {lesson.level ?? (course.learningMode === "business" ? "商务模式" : "生活模式")}
      </p>
      <h1>{lesson.title}</h1>
      <p className="page-description">{lesson.objectives[0]}</p>
      <LessonToolbar
        bookmarked={record.bookmarked}
        completed={record.completed}
        loaded={loaded}
        position={record.position}
        showZh={showZh}
        showReading={showReading}
        onToggleBookmark={() =>
          updateRecord((currentRecord) => ({
            ...currentRecord,
            bookmarked: !currentRecord.bookmarked,
          }))
        }
        onToggleCompleted={() =>
          updateRecord((currentRecord) => ({
            ...currentRecord,
            completed: !currentRecord.completed,
          }))
        }
        onShowZh={setShowZh}
        onShowReading={setShowReading}
        onResume={() => openSection(record.position)}
      />
      <p className="muted">“已学过”仅记录学习经历，不代表语言能力分数。</p>
      {saveFailed && (
        <p role="alert">
          学习记录保存失败，当前修改仅保留在本页。请先复制书面草稿，刷新或离开页面会丢失未保存的内容。
        </p>
      )}
      <VoiceSettings
        roles={lesson.speakers?.map((speaker) => ({
          id: speakerVoiceKey(course.id, lesson.id, speaker.id),
          name: speaker.name,
        }))}
      />
      <SpeechStatus />
      <nav className="lesson-tabs" aria-label="本课学习环节">
        {sectionLinks.map((item, index) => (
          <button
            key={item.id}
            aria-controls={item.id}
            aria-pressed={activeSection === item.id}
            onClick={() => openSection(item.id)}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            {item.title}
          </button>
        ))}
      </nav>
      {!!lesson.objectives.length &&
        renderSection(
          "objectives",
          "当前课程目标",
          <ul className="objective-list">
            {lesson.objectives.map((objective) => (
              <li key={objective}>{objective}</li>
            ))}
          </ul>,
        )}
      {(lesson.scene || lines.length > 0 || lesson.materials?.length) &&
        renderSection(
          "text",
          "场景课文与听读练习",
          <>
            <DialogueSection
              courseId={course.id}
              lesson={lesson}
              dialogueId={dialogueId}
              selectedLineIds={selectedLineIds}
              loop={loop}
              showZh={showZh}
              showReading={showReading}
              onSelectDialogue={(nextDialogueId) => {
                runtime?.queue.stop();
                setDialogueId(nextDialogueId);
                setSelectedLineIds([]);
              }}
              onToggleLine={toggleLine}
              onLoop={setLoop}
            />
            <MaterialsSection
              course={course}
              lesson={lesson}
              showZh={showZh}
              showReading={showReading}
              onPlayShadowing={playShadowing}
            />
          </>,
        )}
      {!!lesson.vocabulary?.length &&
        renderSection(
          "vocabulary",
          "本课词汇",
          <VocabularySection
            entries={lesson.vocabulary}
            showZh={showZh}
            showReading={showReading}
            onOpenSource={openSource}
          />,
        )}
      {!!lesson.expressions?.length &&
        renderSection(
          "expressions",
          "本课固定句型",
          <ExpressionsSection
            expressions={lesson.expressions}
            showZh={showZh}
            onOpenSource={openSource}
          />,
        )}
      {!!lesson.grammar?.length &&
        renderSection(
          "grammar",
          "本课文法",
          <GrammarSection grammar={lesson.grammar} showZh={showZh} />,
        )}
      {!!lesson.homework?.length &&
        renderSection(
          "homework",
          "课后作业与参考答案",
          <HomeworkSection
            homework={lesson.homework}
            drafts={record.drafts}
            loaded={loaded}
            showZh={showZh}
            onDraftChange={(homeworkId, value) =>
              updateRecord((currentRecord) => ({
                ...currentRecord,
                drafts: { ...currentRecord.drafts, [homeworkId]: value },
              }))
            }
          />,
        )}
      {!!lesson.references?.length && (
        <aside>
          <h2>来源与说明</h2>
          {lesson.references.map((reference, index) => (
            <p key={index}>
              {reference.url ? (
                <a href={reference.url} rel="noreferrer">
                  {reference.title}
                </a>
              ) : (
                reference.title
              )}{" "}
              {reference.note}
            </p>
          ))}
        </aside>
      )}
      <nav className="controls">
        {previousLessonId && (
          <a href={href(`/courses/${course.id}/${previousLessonId}/`)}>← 上一课</a>
        )}
        <a href={href(`/courses/${course.id}/`)}>课程目录</a>
        {nextLessonId && <a href={href(`/courses/${course.id}/${nextLessonId}/`)}>下一课 →</a>}
      </nav>
    </article>
  );
}
