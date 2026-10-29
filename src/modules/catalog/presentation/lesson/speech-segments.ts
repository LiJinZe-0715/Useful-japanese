import type { Lesson } from "../../domain/content";
import { dialogueSegmentId } from "../../../../shared/dialogue-playback";
import type { SpeechSegment } from "../../../speech/domain/speech";

type LessonLine = NonNullable<Lesson["dialogues"]>[number]["lines"][number];

// Speaker voices are stored per course+lesson, so the same speaker in another
// lesson keeps its own voice preference.
export const speakerVoiceKey = (courseId: string, lessonId: string, speakerId: string) =>
  `${courseId}:${lessonId}:${speakerId}`;

export function toSpeechSegment(
  courseId: string,
  lesson: Lesson,
  line: LessonLine,
  sourceDialogueId: string,
): SpeechSegment {
  return {
    id: dialogueSegmentId(courseId, lesson.id, sourceDialogueId, line.id),
    text: line.ttsText ?? line.ja,
    speakerId: speakerVoiceKey(courseId, lesson.id, line.speakerId),
    voice: lesson.speakers?.find((speaker) => speaker.id === line.speakerId)?.voice,
  };
}
