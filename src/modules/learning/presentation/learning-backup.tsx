"use client";
import { useState } from "react";
import {
  exportLearningBackup,
  importLearningBackup,
  MAX_BACKUP_BYTES,
} from "../application/learning-backup";

export function LearningBackup() {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <section aria-label="学习记录备份">
      <h2>备份与恢复学习记录</h2>
      <p className="muted">
        导出进度、收藏和书面草稿，可在网站与 Android App
        之间迁移。恢复时，同一课次以备份为准，其他课次保留。备份包含你的草稿，请妥善保存。
      </p>
      <div className="controls">
        <button
          disabled={busy}
          onClick={() => {
            setMessage("");
            setError("");
            try {
              const text = exportLearningBackup(window.localStorage);
              const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
              try {
                const anchor = document.createElement("a");
                anchor.href = url;
                anchor.download = `nihongo-progress-${new Date().toISOString().slice(0, 10)}.json`;
                anchor.click();
                setMessage("已发起备份下载，请完成文件保存后再清除数据或卸载 App。");
              } finally {
                URL.revokeObjectURL(url);
              }
            } catch (failure) {
              setError(failure instanceof Error ? failure.message : "导出失败，请检查设备存储。");
            }
          }}
        >
          导出学习记录
        </button>
        <label>
          恢复备份（JSON，最大 10 MB）{" "}
          <input
            type="file"
            accept="application/json,.json"
            disabled={busy}
            onChange={async (event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              if (!file) return;
              setBusy(true);
              setMessage("");
              setError("");
              try {
                if (file.size > MAX_BACKUP_BYTES) throw Error("备份文件不能超过 10 MB。");
                const count = importLearningBackup(await file.text(), window.localStorage);
                window.dispatchEvent(new Event("nihongo:learning-change"));
                setMessage(`已恢复 ${count} 条课次记录。`);
              } catch (failure) {
                setError(
                  failure instanceof Error
                    ? failure.message
                    : "恢复失败，请检查备份文件和设备存储。",
                );
              } finally {
                setBusy(false);
              }
            }}
          />
        </label>
      </div>
      {busy && <p role="status">正在读取备份…</p>}
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
