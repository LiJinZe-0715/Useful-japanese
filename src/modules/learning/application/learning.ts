import { emptyRecord, mergeRecord, recordKey, type StudyRecord } from "../domain/record.ts";
export interface RecordStore {
  read(key: string): StudyRecord | undefined;
  write(key: string, value: StudyRecord): boolean;
  subscribe?(prefix: string, listener: () => void): () => void;
}
export function createLearning(store: RecordStore) {
  return {
    load: (course: string, lesson: string) =>
      store.read(recordKey(course, lesson)) ?? emptyRecord(),
    save(course: string, lesson: string, record: StudyRecord, previous?: StudyRecord) {
      const key = recordKey(course, lesson);
      return store.write(
        key,
        previous ? mergeRecord(store.read(key) ?? previous, record, previous) : record,
      );
    },
    subscribe: (course: string, lesson: string, listener: () => void) =>
      store.subscribe?.(recordKey(course, lesson), listener) ?? (() => {}),
  };
}
