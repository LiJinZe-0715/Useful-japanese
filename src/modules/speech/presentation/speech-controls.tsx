"use client";
import type {SpeechSegment, SpeechVoice} from "../domain/speech";
import {useSpeech} from "./speech-provider";

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
    voice?: SpeechVoice;
    label?: string;
}) {
    const speech = useSpeech();
    return (
        <button disabled={!speech} onClick={() => void speech?.runtime.queue.play([{text, voice}])}>
            {label}
        </button>
    );
}

export function AudioControls({
                                  items,
                                  loop,
                                  onLoop,
                              }: {
    items: SpeechSegment[];
    loop: boolean;
    onLoop: (enabled: boolean) => void;
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
                <input type="checkbox" checked={loop} onChange={(event) => onLoop(event.target.checked)}/>
                片段循环
            </label>
        </div>
    );
}

export function VoiceSettings({roles = []}: { roles?: { id: string; name: string }[] }) {
    const speech = useSpeech();
    if (!speech) return <p className="muted">合成语音设置加载中，阅读不受影响。</p>;
    const {runtime, snapshot} = speech;
    const renderVoiceSelect = (value: SpeechVoice, onChange: (voice: SpeechVoice) => void) =>
        snapshot.settings.engine === "browser" ? (
            <select
                aria-label="设备声音"
                value={value.browserVoiceURI ?? ""}
                onChange={(event) => onChange({browserVoiceURI: event.target.value})}
            >
                <option value="">自动选择日语声音</option>
                {snapshot.voices.map((voice) => (
                    <option key={voice.id} value={voice.id}>
                        {voice.label}
                    </option>
                ))}
            </select>
        ) : (
            <select
                aria-label="VOICEVOX 风格"
                value={value.voicevoxStyleId ?? snapshot.settings.voicevoxStyleId}
                onChange={(event) => onChange({voicevoxStyleId: Number(event.target.value)})}
            >
                {!snapshot.styles.some(
                    (style) => style.id === (value.voicevoxStyleId ?? snapshot.settings.voicevoxStyleId),
                ) && (
                    <option value={value.voicevoxStyleId ?? snapshot.settings.voicevoxStyleId}>
                        已保存 / 默认风格（连接后验证）
                    </option>
                )}
                {snapshot.styles.map((style) => (
                    <option key={style.id} value={style.id}>
                        {style.label}
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
                        value={snapshot.settings.engine}
                        onChange={(event) =>
                            runtime.configure({engine: event.target.value as "browser" | "voicevox"})
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
                        value={snapshot.settings.rate}
                        onChange={(event) => runtime.configure({rate: Number(event.target.value)})}
                    />
                    {snapshot.settings.rate.toFixed(1)}
                </label>
                <label>
                    默认声音 {renderVoiceSelect(snapshot.settings, (voice) => runtime.configure(voice))}
                </label>
                <button onClick={() => void runtime.detect()}>检测本机 VOICEVOX / 加载风格</button>
            </div>
            <p className="muted">{snapshot.connection}</p>
            {roles.map((role) => (
                <label className="role" key={role.id}>
                    {role.name}{" "}
                    {renderVoiceSelect(snapshot.settings.roles[role.id] ?? {}, (voice) =>
                        runtime.configure({
                            roles: {
                                ...snapshot.settings.roles,
                                [role.id]: {...snapshot.settings.roles[role.id], ...voice},
                            },
                        }),
                    )}
                    <button
                        onClick={() => {
                            const nextRoleVoices = {...snapshot.settings.roles};
                            delete nextRoleVoices[role.id];
                            runtime.configure({roles: nextRoleVoices});
                        }}
                    >
                        使用数据 / 默认声音
                    </button>
                </label>
            ))}
        </details>
    );
}
