import {isStudyRecord, type StudyRecord} from "../domain/study-record.ts";

export const MAX_BACKUP_BYTES = 10 * 1024 * 1024;
const recordKey =
    /^nihongo:learning:v1:[a-z][a-z0-9]*(?:-[a-z0-9]+)*:[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;
type BackupEntry = {key: string; record: StudyRecord};
type BackupStorage = Pick<Storage, "length" | "key" | "getItem" | "setItem" | "removeItem">;

function parseBackup(text: string): BackupEntry[] {
    if (new TextEncoder().encode(text).length > MAX_BACKUP_BYTES)
        throw Error("备份文件不能超过 10 MB。");
    let data;
    try {
        data = JSON.parse(text);
    } catch {
        throw Error("备份不是有效的 JSON 文件。");
    }
    if (!data || data.version !== 1 || !Array.isArray(data.records))
        throw Error("不是受支持的学习记录备份，未修改本机记录。");
    const keys = new Set<string>();
    for (const entry of data.records) {
        if (
            !entry ||
            typeof entry.key !== "string" ||
            !recordKey.test(entry.key) ||
            !isStudyRecord(entry.record) ||
            keys.has(entry.key)
        )
            throw Error("备份包含无效或重复的课次记录，未修改本机记录。");
        keys.add(entry.key);
    }
    return data.records;
}

export function exportLearningBackup(storage: BackupStorage): string {
    const records: BackupEntry[] = [];
    for (let index = 0; index < storage.length; index++) {
        const key = storage.key(index);
        if (!key || !recordKey.test(key)) continue;
        let record: unknown;
        try {
            record = JSON.parse(storage.getItem(key) ?? "null");
        } catch {
            throw Error("本机有损坏的学习记录，未生成备份。");
        }
        if (!isStudyRecord(record)) throw Error("本机有损坏的学习记录，未生成备份。");
        records.push({key, record});
    }
    records.sort((left, right) => left.key.localeCompare(right.key));
    const text = JSON.stringify(
        {version: 1, exportedAt: new Date().toISOString(), records},
        null,
        2,
    );
    parseBackup(text);
    return text;
}

export function importLearningBackup(text: string, storage: BackupStorage): number {
    const records = parseBackup(text);
    // Validate the whole file and retain originals before writing the first record.
    const originals = records.map(({key}) => storage.getItem(key));
    let written = 0;
    try {
        for (const {key, record} of records) {
            storage.setItem(key, JSON.stringify(record));
            written++;
        }
    } catch {
        let restored = true;
        for (let index = written - 1; index >= 0; index--) {
            try {
                const original = originals[index];
                if (original === null) storage.removeItem(records[index].key);
                else storage.setItem(records[index].key, original);
            } catch {
                restored = false;
            }
        }
        throw Error(
            restored
                ? "保存失败，原有记录已保留。请检查设备存储后重试。"
                : "保存失败，部分记录可能已更新。请保留备份文件并重试。",
        );
    }
    return records.length;
}
