"use client";
import type { Segment, Voice } from "../domain/speech";
import { useSpeech } from "./provider";
export function SpeechStatus() {
  const speech = useSpeech();
  return (
    <>
      {speech?.snapshot.state.message && <p role="status">{speech.snapshot.state.message}</p>}
      {speech?.snapshot.notice && <p role="status">{speech.snapshot.notice}</p>}
      {speech?.snapshot.settingsSaveFailed && (
        <p role="alert">语音设置保存失败，当前设置仅在本页有效，刷新或离开页面后可能恢复旧设置。</p>
      )}
    </>
  );
}
export function SpeakButton({
  text,
  voice,
  label = "朗读",
}: {
  text: string;
  voice?: Voice;
  label?: string;
}) {
  const speech = useSpeech();
  return (
    <button disabled={!speech} onClick={() => void speech?.runtime.queue.play([{ text, voice }])}>
      {label}
    </button>
  );
}
export function AudioControls({
  items,
  loop,
  onLoop,
}: {
  items: Segment[];
  loop: boolean;
  onLoop: (v: boolean) => void;
}) {
  const speech = useSpeech();
  return (
    <div className="controls">
      <button
        disabled={!speech || !items.length}
        onClick={() => void speech?.runtime.queue.play(items, loop)}
      >
        播放所选 / 整段
      </button>
      <button
        disabled={!speech}
        onClick={() =>
          speech?.snapshot.state.status === "paused"
            ? speech.runtime.queue.resume()
            : speech?.runtime.queue.pause()
        }
      >
        {speech?.snapshot.state.status === "paused" ? "继续" : "暂停"}
      </button>
      <button onClick={() => speech?.runtime.queue.stop()}>停止</button>
      <button onClick={() => void speech?.runtime.queue.replay(loop)}>重播</button>
      <label>
        <input type="checkbox" checked={loop} onChange={(e) => onLoop(e.target.checked)} />
        片段循环
      </label>
    </div>
  );
}
export function VoiceSettings({ roles = [] }: { roles?: { id: string; name: string }[] }) {
  const speech = useSpeech();
  if (!speech) return <p className="muted">合成语音设置加载中，阅读不受影响。</p>;
  const { runtime, snapshot: s } = speech;
  const voiceSelect = (value: Voice, onChange: (v: Voice) => void) =>
    s.settings.engine === "browser" ? (
      <select
        aria-label="设备声音"
        value={value.browserVoiceURI ?? ""}
        onChange={(e) => onChange({ browserVoiceURI: e.target.value })}
      >
        <option value="">自动选择日语声音</option>
        {s.voices.map((v) => (
          <option key={v.id} value={v.id}>
            {v.label}
          </option>
        ))}
      </select>
    ) : (
      <select
        aria-label="VOICEVOX 风格"
        value={value.voicevoxStyleId ?? s.settings.voicevoxStyleId}
        onChange={(e) => onChange({ voicevoxStyleId: Number(e.target.value) })}
      >
        {!s.styles.some((v) => v.id === (value.voicevoxStyleId ?? s.settings.voicevoxStyleId)) && (
          <option value={value.voicevoxStyleId ?? s.settings.voicevoxStyleId}>
            已保存 / 默认风格（连接后验证）
          </option>
        )}
        {s.styles.map((v) => (
          <option key={v.id} value={v.id}>
            {v.label}
          </option>
        ))}
      </select>
    );
  return (
    <details className="settings">
      <summary>合成语音设置</summary>
      <div className="controls">
        <label>
          引擎{" "}
          <select
            aria-label="引擎"
            value={s.settings.engine}
            onChange={(e) =>
              runtime.configure({ engine: e.target.value as "browser" | "voicevox" })
            }
          >
            <option value="browser">设备日语合成语音</option>
            <option value="voicevox">VOICEVOX 合成语音</option>
          </select>
        </label>
        <label>
          语速{" "}
          <input
            type="range"
            min="0.5"
            max="1.5"
            step="0.1"
            value={s.settings.rate}
            onChange={(e) => runtime.configure({ rate: Number(e.target.value) })}
          />
          {s.settings.rate.toFixed(1)}
        </label>
        <label>默认声音 {voiceSelect(s.settings, (v) => runtime.configure(v))}</label>
        <button onClick={() => void runtime.detect()}>检测本机 VOICEVOX / 加载风格</button>
      </div>
      <p className="muted">{s.connection}</p>
      {roles.map((role) => (
        <label className="role" key={role.id}>
          {role.name}{" "}
          {voiceSelect(s.settings.roles[role.id] ?? {}, (v) =>
            runtime.configure({
              roles: { ...s.settings.roles, [role.id]: { ...s.settings.roles[role.id], ...v } },
            }),
          )}
          <button
            onClick={() => {
              const next = { ...s.settings.roles };
              delete next[role.id];
              runtime.configure({ roles: next });
            }}
          >
            使用数据 / 默认声音
          </button>
        </label>
      ))}
    </details>
  );
}
