export type StudyRecord = {
  completed: boolean;
  bookmarked: boolean;
  position: string;
  drafts: Record<string, string>;
};
export const emptyRecord = (): StudyRecord => ({
  completed: false,
  bookmarked: false,
  position: "",
  drafts: {},
});
export const recordKey = (courseId: string, lessonId: string) =>
  `nihongo:learning:v1:${courseId}:${lessonId}`;
