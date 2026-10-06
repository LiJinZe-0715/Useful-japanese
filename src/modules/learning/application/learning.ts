import { emptyRecord, recordKey, type StudyRecord } from "../domain/record.ts";
export interface RecordStore {
  read(key: string): StudyRecord | undefined;
  write(key: string, value: StudyRecord): void;
}
export function createLearning(store: RecordStore) {
  return {
    load: (course: string, lesson: string) =>
      store.read(recordKey(course, lesson)) ?? emptyRecord(),
    save: (course: string, lesson: string, record: StudyRecord) =>
      store.write(recordKey(course, lesson), record),
  };
}
