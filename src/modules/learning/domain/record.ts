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

export function mergeRecord(latest: StudyRecord, edited: StudyRecord, previous: StudyRecord) {
  const merged = { ...latest, drafts: { ...latest.drafts } };
  for (const field of ["completed", "bookmarked", "position"] as const) {
    if (edited[field] !== previous[field]) Object.assign(merged, { [field]: edited[field] });
  }
  for (const key of new Set([...Object.keys(previous.drafts), ...Object.keys(edited.drafts)])) {
    if (edited.drafts[key] === previous.drafts[key]) continue;
    if (Object.hasOwn(edited.drafts, key)) merged.drafts[key] = edited.drafts[key];
    else delete merged.drafts[key];
  }
  return merged;
}
