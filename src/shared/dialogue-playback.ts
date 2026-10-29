// Segment identity is the contract between the lesson UI (which builds speech
// segments) and the speech queue (which reports the active segment id). It
// lives in shared so neither module has to import the other.
//
// The playback state is described structurally instead of importing
// SpeechQueueState, which keeps shared independent of feature modules.

export type ActiveSegmentState = { status: string; activeSegmentId?: string };

export const dialogueSegmentId = (
  courseId: string,
  lessonId: string,
  dialogueId: string,
  lineId: string,
) => JSON.stringify([courseId, lessonId, dialogueId, lineId]);

export const isDialogueLineActive = (state: ActiveSegmentState | undefined, segmentId: string) =>
  (state?.status === "playing" || state?.status === "paused") &&
  state.activeSegmentId === segmentId;
