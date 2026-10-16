import {createEmptyStudyRecord, mergeStudyRecord, type StudyRecord, studyRecordKey,} from "../domain/study-record.ts";

export interface RecordStore {
    read(key: string): StudyRecord | undefined;

    write(key: string, value: StudyRecord): boolean;

    subscribe?(prefix: string, listener: () => void): () => void;
}

export function createLearningRecords(store: RecordStore) {
    return {
        load: (courseId: string, lessonId: string) =>
            store.read(studyRecordKey(courseId, lessonId)) ?? createEmptyStudyRecord(),
        save(courseId: string, lessonId: string, record: StudyRecord, previous?: StudyRecord) {
            const key = studyRecordKey(courseId, lessonId);
            return store.write(
                key,
                previous ? mergeStudyRecord(store.read(key) ?? previous, record, previous) : record,
            );
        },
        subscribe: (courseId: string, lessonId: string, listener: () => void) =>
            store.subscribe?.(studyRecordKey(courseId, lessonId), listener) ?? (() => {
            }),
    };
}
