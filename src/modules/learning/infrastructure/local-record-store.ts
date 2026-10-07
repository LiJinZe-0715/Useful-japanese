import type { RecordStore } from "../application/learning";
import type { StudyRecord } from "../domain/record";
export const localRecordStore: RecordStore = {
  subscribe(prefix, listener) {
    if (typeof window === "undefined") return () => {};
    const changed = (event: StorageEvent) => {
      if (
        event.key === null ||
        event.key === prefix ||
        (prefix.endsWith(":") && event.key.startsWith(prefix))
      )
        listener();
    };
    window.addEventListener("storage", changed);
    window.addEventListener("focus", listener);
    window.addEventListener("pageshow", listener);
    return () => {
      window.removeEventListener("storage", changed);
      window.removeEventListener("focus", listener);
      window.removeEventListener("pageshow", listener);
    };
  },
  read(key) {
    if (typeof window === "undefined") return undefined;
    try {
      const v = JSON.parse(localStorage.getItem(key) ?? "null");
      if (
        v &&
        typeof v.completed === "boolean" &&
        typeof v.bookmarked === "boolean" &&
        typeof v.position === "string" &&
        v.drafts &&
        typeof v.drafts === "object" &&
        !Array.isArray(v.drafts) &&
        Object.values(v.drafts).every((x) => typeof x === "string")
      )
        return v as StudyRecord;
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
