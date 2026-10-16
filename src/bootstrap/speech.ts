import {createSpeechQueue, type SpeechQueueState,} from "../modules/speech/application/speech-queue.ts";
import {resolveSegmentVoice, type SpeechSettings} from "../modules/speech/domain/speech.ts";
import {createBrowserPlayer} from "../modules/speech/infrastructure/browser-player.ts";
import {createVoicevoxPlayer, type VoicevoxStyle,} from "../modules/speech/infrastructure/voicevox-player.ts";
import {loadSpeechSettings, saveSpeechSettings,} from "../modules/speech/infrastructure/speech-preferences.ts";

export function createSpeechRuntime() {
    let settings = loadSpeechSettings();
    const browserPlayer = createBrowserPlayer(),
        voicevoxPlayer = createVoicevoxPlayer();
    const listeners = new Set<() => void>();
    let snapshot = {
        settings,
        voices: browserPlayer.voices().map((voice) => ({id: voice.voiceURI, label: voice.name})),
        styles: [] as VoicevoxStyle[],
        connection: "未检测 VOICEVOX",
        state: {status: "idle", index: 0, message: ""} as SpeechQueueState,
        notice: "",
        settingsSaveFailed: false,
    };
    const notify = () => {
        snapshot = {...snapshot, settings};
        listeners.forEach((listener) => listener());
    };
    const queue = createSpeechQueue(
        {
            async speak(segment, currentSettings, signal) {
                const voice = resolveSegmentVoice(segment, currentSettings);
                if (currentSettings.engine === "voicevox") {
                    try {
                        const styleId = snapshot.styles.some((style) => style.id === voice.voicevoxStyleId)
                            ? voice.voicevoxStyleId!
                            : (snapshot.styles[0]?.id ?? voice.voicevoxStyleId ?? 3);
                        await voicevoxPlayer.speak(segment.text, styleId, currentSettings.rate, signal);
                        return;
                    } catch (error) {
                        if (signal.aborted) throw error;
                        snapshot.notice = "VOICEVOX 失败，尝试设备日语合成语音。";
                        notify();
                    }
                }
                await browserPlayer.speak(segment.text, voice, currentSettings.rate, signal);
            },
            stop() {
                browserPlayer.stop();
                voicevoxPlayer.stop();
            },
            pause() {
                browserPlayer.pause();
                voicevoxPlayer.pause();
            },
            resume() {
                browserPlayer.resume();
                voicevoxPlayer.resume();
            },
        },
        () => settings,
        (state) => {
            if (state.status === "playing" && snapshot.state.status === "idle") snapshot.notice = "";
            snapshot.state = state;
            notify();
        },
    );
    const refreshBrowserVoices = () => {
        snapshot.voices = browserPlayer
            .voices()
            .map((voice) => ({id: voice.voiceURI, label: voice.name}));
        notify();
    };
    if (typeof window !== "undefined")
        window.speechSynthesis?.addEventListener("voiceschanged", refreshBrowserVoices);
    let detectionController: AbortController | undefined;
    let detectionRequestId = 0;
    return {
        queue,
        getSnapshot: () => snapshot,
        subscribe(listener: () => void) {
            listeners.add(listener);
            return () => {
                listeners.delete(listener);
            };
        },
        configure(changes: Partial<SpeechSettings>) {
            queue.stop();
            settings = {...settings, ...changes};
            snapshot.notice = "";
            snapshot.settingsSaveFailed = !saveSpeechSettings(settings);
            notify();
        },
        async detect() {
            detectionController?.abort();
            detectionController = new AbortController();
            const requestId = ++detectionRequestId;
            try {
                const styles = await voicevoxPlayer.detect(detectionController.signal);
                if (requestId !== detectionRequestId) return;
                snapshot.styles = styles;
                snapshot.notice = "";
                snapshot.connection = `VOICEVOX 已连接（${styles.length} 个风格）`;
                notify();
            } catch {
                if (requestId !== detectionRequestId) return;
                snapshot.styles = [];
                snapshot.connection =
                    "VOICEVOX 未连接：请启动本机 Engine 并检查地址、CORS 与本地网络权限。";
                notify();
            }
        },
        dispose() {
            detectionRequestId++;
            detectionController?.abort();
            queue.stop();
            if (typeof window !== "undefined")
                window.speechSynthesis?.removeEventListener("voiceschanged", refreshBrowserVoices);
            listeners.clear();
        },
    };
}

export type SpeechRuntime = ReturnType<typeof createSpeechRuntime>;
