import type { QueueState } from "../../speech/application/queue.ts";
export const dialogueSegmentId = (
  courseId: string,
  lessonId: string,
  dialogueId: string,
  lineId: string,
) => JSON.stringify([courseId, lessonId, dialogueId, lineId]);
export const isDialogueLineActive = (
  state: Pick<QueueState, "status" | "activeSegmentId"> | undefined,
  segmentId: string,
) =>
  (state?.status === "playing" || state?.status === "paused") &&
  state.activeSegmentId === segmentId;
