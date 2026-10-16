import type {RecordStore} from "../application/learning-records";
import type {StudyRecord} from "../domain/study-record";

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
        return () => {
            window.removeEventListener("storage", handleStorageChange);
            window.removeEventListener("focus", listener);
            window.removeEventListener("pageshow", listener);
        };
    },
    read(key) {
        if (typeof window === "undefined") return undefined;
        try {
            const storedRecord = JSON.parse(localStorage.getItem(key) ?? "null");
            if (
                storedRecord &&
                typeof storedRecord.completed === "boolean" &&
                typeof storedRecord.bookmarked === "boolean" &&
                typeof storedRecord.position === "string" &&
                storedRecord.drafts &&
                typeof storedRecord.drafts === "object" &&
                !Array.isArray(storedRecord.drafts) &&
                Object.values(storedRecord.drafts).every((draft) => typeof draft === "string")
            )
                return storedRecord as StudyRecord;
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
