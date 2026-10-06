import { createQueue, type QueueState } from "../modules/speech/application/queue.ts";
import { chooseVoice, type SpeechSettings } from "../modules/speech/domain/speech.ts";
import { createBrowserPlayer } from "../modules/speech/infrastructure/browser.ts";
import { createVoicevoxPlayer, type Style } from "../modules/speech/infrastructure/voicevox.ts";
import { loadSettings, saveSettings } from "../modules/speech/infrastructure/preferences.ts";
export function createSpeechRuntime() {
  let settings = loadSettings();
  const browser = createBrowserPlayer(),
    voicevox = createVoicevoxPlayer();
  const listeners = new Set<() => void>();
  let snapshot = {
    settings,
    voices: browser.voices().map((v) => ({ id: v.voiceURI, label: v.name })),
    styles: [] as Style[],
    connection: "未检测 VOICEVOX",
    state: { status: "idle", index: 0, message: "" } as QueueState,
    notice: "",
  };
  const notify = () => {
    snapshot = { ...snapshot, settings };
    listeners.forEach((fn) => fn());
  };
  const queue = createQueue(
    {
      async speak(item, current, signal) {
        const voice = chooseVoice(item, current);
        if (current.engine === "voicevox") {
          try {
            const id = snapshot.styles.some((v) => v.id === voice.voicevoxStyleId)
              ? voice.voicevoxStyleId!
              : (snapshot.styles[0]?.id ?? voice.voicevoxStyleId ?? 3);
            await voicevox.speak(item.text, id, current.rate, signal);
            return;
          } catch (error) {
            if (signal.aborted) throw error;
            snapshot.notice = "VOICEVOX 失败，尝试设备日语合成语音。";
            notify();
          }
        }
        await browser.speak(item.text, voice, current.rate, signal);
      },
      stop() {
        browser.stop();
        voicevox.stop();
      },
      pause() {
        browser.pause();
        voicevox.pause();
      },
      resume() {
        browser.resume();
        voicevox.resume();
      },
    },
    () => settings,
    (state) => {
      snapshot.state = state;
      notify();
    },
  );
  const refresh = () => {
    snapshot.voices = browser.voices().map((v) => ({ id: v.voiceURI, label: v.name }));
    notify();
  };
  if (typeof window !== "undefined")
    window.speechSynthesis?.addEventListener("voiceschanged", refresh);
  let detection: AbortController | undefined;
  let detectionId = 0;
  return {
    queue,
    getSnapshot: () => snapshot,
    subscribe(fn: () => void) {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    configure(changes: Partial<SpeechSettings>) {
      queue.stop();
      settings = { ...settings, ...changes };
      saveSettings(settings);
      notify();
    },
    async detect() {
      detection?.abort();
      detection = new AbortController();
      const current = ++detectionId;
      try {
        const styles = await voicevox.detect(detection.signal);
        if (current !== detectionId) return;
        snapshot.styles = styles;
        snapshot.connection = `VOICEVOX 已连接（${styles.length} 个风格）`;
        notify();
      } catch {
        if (current !== detectionId) return;
        snapshot.connection =
          "VOICEVOX 未连接：请启动本机 Engine 并检查地址、CORS 与本地网络权限。";
        notify();
      }
    },
    dispose() {
      detectionId++;
      detection?.abort();
      queue.stop();
      if (typeof window !== "undefined")
        window.speechSynthesis?.removeEventListener("voiceschanged", refresh);
      listeners.clear();
    },
  };
}
export type SpeechRuntime = ReturnType<typeof createSpeechRuntime>;
