import type {RecordStore} from "../application/learning-records";
import {isStudyRecord} from "../domain/study-record.ts";

export const localRecordStore: RecordStore = {
    subscribe(prefix, listener) {
        if (typeof window === "undefined") return () => {
        };
        const handleStorageChange = (event: StorageEvent) => {
            if (
                event.key === null ||
                event.key === prefix ||
                (prefix.endsWith(":") && event.key.startsWith(prefix))
            )
                listener();
        };
        window.addEventListener("storage", handleStorageChange);
        window.addEventListener("focus", listener);
        window.addEventListener("pageshow", listener);
        window.addEventListener("nihongo:learning-change", listener);
        return () => {
            window.removeEventListener("storage", handleStorageChange);
            window.removeEventListener("focus", listener);
            window.removeEventListener("pageshow", listener);
            window.removeEventListener("nihongo:learning-change", listener);
        };
    },
    read(key) {
        if (typeof window === "undefined") return undefined;
        try {
            const storedRecord = JSON.parse(localStorage.getItem(key) ?? "null");
            if (isStudyRecord(storedRecord)) return storedRecord;
        } catch {
            /* Unavailable or corrupt device storage: reading still works. */
        }
        return undefined;
    },
    write(key, value) {
        if (typeof window === "undefined") return false;
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch {
            /* Private mode / quota: retain current in-memory record. */
            return false;
        }
    },
};
