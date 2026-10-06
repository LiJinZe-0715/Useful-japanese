import type { Voice } from "../domain/speech";
export function createBrowserPlayer() {
  let utterance: SpeechSynthesisUtterance | undefined;
  let settle: (() => void) | undefined;
  let paused = false;
  const supported = () =>
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    "SpeechSynthesisUtterance" in window;
  const voices = () =>
    supported()
      ? window.speechSynthesis
          .getVoices()
          .filter((v) => /^ja(?:-|_)/i.test(v.lang) || v.lang === "ja")
          .sort(
            (a, b) =>
              Number(b.localService) - Number(a.localService) ||
              a.voiceURI.localeCompare(b.voiceURI),
          )
      : [];
  function stop() {
    const old = utterance;
    utterance = undefined;
    if (old) {
      old.onend = null;
      old.onerror = null;
    }
    settle?.();
    settle = undefined;
    if (supported()) {
      window.speechSynthesis.cancel();
      // cancel() clears utterances but preserves the native paused state.
      if (window.speechSynthesis.paused) window.speechSynthesis.resume();
    }
    paused = false;
  }
  return {
    voices,
    stop,
    pause() {
      paused = true;
      if (supported()) window.speechSynthesis.pause();
    },
    resume() {
      paused = false;
      if (supported()) window.speechSynthesis.resume();
    },
    speak(text: string, voice: Voice, rate: number, signal: AbortSignal) {
      return new Promise<void>((resolve, reject) => {
        signal.throwIfAborted();
        if (!supported() || !voices().length) {
          reject(Error("设备没有可用的日语合成声音；仍可阅读。"));
          return;
        }
        const u = new window.SpeechSynthesisUtterance(text);
        u.lang = "ja-JP";
        u.rate = rate;
        u.voice = voices().find((v) => v.voiceURI === voice.browserVoiceURI) ?? voices()[0];
        utterance = u;
        let done = false;
        const finish = (error?: Error) => {
          if (done) return;
          done = true;
          signal.removeEventListener("abort", abort);
          u.onend = null;
          u.onerror = null;
          if (utterance === u) {
            utterance = undefined;
            settle = undefined;
          }
          if (error) reject(error);
          else resolve();
        };
        const abort = () => {
          finish(Error("播放已取消"));
          if (supported()) window.speechSynthesis.cancel();
        };
        settle = () => finish(Error("播放已取消"));
        signal.addEventListener("abort", abort, { once: true });
        u.onend = () => finish();
        u.onerror = () => finish(Error("设备日语合成语音播放失败。"));
        try {
          window.speechSynthesis.speak(u);
          if (paused) window.speechSynthesis.pause();
        } catch (error) {
          finish(error instanceof Error ? error : Error(String(error)));
        }
      });
    },
  };
}
