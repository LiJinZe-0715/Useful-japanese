import type {SpeechQueueState} from "../../speech/application/speech-queue.ts";

export const dialogueSegmentId = (
    courseId: string,
    lessonId: string,
    dialogueId: string,
    lineId: string,
) => JSON.stringify([courseId, lessonId, dialogueId, lineId]);
export const isDialogueLineActive = (
    state: Pick<SpeechQueueState, "status" | "activeSegmentId"> | undefined,
    segmentId: string,
) =>
    (state?.status === "playing" || state?.status === "paused") &&
    state.activeSegmentId === segmentId;
