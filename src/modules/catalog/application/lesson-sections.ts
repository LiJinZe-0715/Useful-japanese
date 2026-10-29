import type { Lesson } from "../domain/content";

// Presentation-free rules for the lesson workspace: which sections a lesson
// exposes, which one opens first, and how enum values are labelled in Chinese.
// Kept here so the rules can be tested without rendering React.

export type LessonSectionId =
  | "objectives"
  | "text"
  | "vocabulary"
  | "expressions"
  | "grammar"
  | "homework";

export type LessonSectionLink = { id: LessonSectionId; title: string };

type Scene = NonNullable<Lesson["scene"]>;
type Dialogue = NonNullable<Lesson["dialogues"]>[number];
type Homework = NonNullable<Lesson["homework"]>[number];

const SECTION_TITLES: Record<LessonSectionId, string> = {
  objectives: "目标",
  text: "听读",
  vocabulary: "词汇",
  expressions: "句型",
  grammar: "文法",
  homework: "作业",
};

const hasText = (lesson: Lesson) =>
  !!(
    lesson.scene ||
    lesson.dialogues?.some((dialogue) => dialogue.lines.length) ||
    lesson.materials?.length
  );

const SECTION_RULES: Record<LessonSectionId, (lesson: Lesson) => boolean> = {
  objectives: (lesson) => !!lesson.objectives.length,
  text: hasText,
  vocabulary: (lesson) => !!lesson.vocabulary?.length,
  expressions: (lesson) => !!lesson.expressions?.length,
  grammar: (lesson) => !!lesson.grammar?.length,
  homework: (lesson) => !!lesson.homework?.length,
};

const SECTION_ORDER: LessonSectionId[] = [
  "objectives",
  "text",
  "vocabulary",
  "expressions",
  "grammar",
  "homework",
];

export function buildSectionLinks(lesson: Lesson): LessonSectionLink[] {
  return SECTION_ORDER.filter((id) => SECTION_RULES[id](lesson)).map((id) => ({
    id,
    title: SECTION_TITLES[id],
  }));
}

export function defaultSectionId(links: LessonSectionLink[]): LessonSectionId | "" {
  return links.find((link) => link.id === "text")?.id ?? links[0]?.id ?? "";
}

export function resolveSectionId(
  links: LessonSectionLink[],
  requested: string,
): LessonSectionId | "" {
  return links.find((link) => link.id === requested)?.id ?? defaultSectionId(links);
}

export const CHANNEL_LABELS: Record<Scene["channel"], string> = {
  "in-person": "当面",
  phone: "电话",
  meeting: "会议",
  email: "邮件",
  chat: "消息",
  other: "其他",
};

export const VARIANT_LABELS: Record<Dialogue["variant"], string> = {
  main: "主课文",
  branch: "场景分支",
  register: "语体版本",
};

export const HOMEWORK_TYPE_LABELS: Record<Homework["type"], string> = {
  oral: "口头任务",
  written: "书面任务",
};

export type CommunicationFunction = NonNullable<Homework["functions"]>[number];

export const FUNCTION_LABELS: Record<CommunicationFunction, string> = {
  report: "报告",
  contact: "联络",
  consult: "相谈",
};

export type HomeworkDetail = { title: string; values: string[] };

export function homeworkDetails(homework: Homework): HomeworkDetail[] {
  const details: HomeworkDetail[] = [
    { title: "已知信息", values: homework.knownInformation },
    { title: "任务", values: homework.tasks },
    { title: "要求", values: homework.requirements },
    { title: "提示", values: homework.hints },
  ];
  return details.filter((detail) => detail.values.length);
}

export const communicationFunctionsLabel = (functions: CommunicationFunction[] = []) =>
  functions.map((item) => FUNCTION_LABELS[item]).join("、");
