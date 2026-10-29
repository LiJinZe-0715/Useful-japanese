import {
  createEmptyStudyRecord,
  mergeStudyRecord,
  type StudyRecord,
  studyRecordKey,
} from "../domain/study-record.ts";

export interface RecordStore {
  read(key: string): StudyRecord | undefined;

  write(key: string, value: StudyRecord): boolean;

  subscribe?(prefix: string, listener: () => void): () => void;
}

export function createLearningRecords(store: RecordStore) {
  return {
    empty: createEmptyStudyRecord,
    load: (courseId: string, lessonId: string) =>
      store.read(studyRecordKey(courseId, lessonId)) ?? createEmptyStudyRecord(),
    // Merge the stored record with edits still held in memory, so a second
    // tab, a focus refresh or a backup import cannot discard what is being
    // typed right now.
    reload(courseId: string, lessonId: string, edited: StudyRecord, previous?: StudyRecord) {
      return mergeStudyRecord(
        store.read(studyRecordKey(courseId, lessonId)) ?? createEmptyStudyRecord(),
        edited,
        previous ?? edited,
      );
    },
    save(courseId: string, lessonId: string, record: StudyRecord, previous?: StudyRecord) {
      const key = studyRecordKey(courseId, lessonId);
      return store.write(
        key,
        previous ? mergeStudyRecord(store.read(key) ?? previous, record, previous) : record,
      );
    },
    subscribe: (courseId: string, lessonId: string, listener: () => void) =>
      store.subscribe?.(studyRecordKey(courseId, lessonId), listener) ?? (() => {}),
  };
}
