import type {SpeechVoice} from "../domain/speech";

export function createBrowserPlayer() {
    let utterance: SpeechSynthesisUtterance | undefined;
    let cancelPendingUtterance: (() => void) | undefined;
    let paused = false;
    const isSpeechSupported = () =>
        typeof window !== "undefined" &&
        "speechSynthesis" in window &&
        "SpeechSynthesisUtterance" in window;
    const voices = () =>
        isSpeechSupported()
            ? window.speechSynthesis
                .getVoices()
                .filter(
                    (browserVoice) => /^ja(?:-|_)/i.test(browserVoice.lang) || browserVoice.lang === "ja",
                )
                .sort(
                    (a, b) =>
                        Number(b.localService) - Number(a.localService) ||
                        a.voiceURI.localeCompare(b.voiceURI),
                )
            : [];

    function stop() {
        const previousUtterance = utterance;
        utterance = undefined;
        if (previousUtterance) {
            previousUtterance.onend = null;
            previousUtterance.onerror = null;
        }
        cancelPendingUtterance?.();
        cancelPendingUtterance = undefined;
        if (isSpeechSupported()) {
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
            if (isSpeechSupported()) window.speechSynthesis.pause();
        },
        resume() {
            paused = false;
            if (isSpeechSupported()) window.speechSynthesis.resume();
        },
        speak(text: string, voice: SpeechVoice, rate: number, signal: AbortSignal) {
            return new Promise<void>((resolve, reject) => {
                signal.throwIfAborted();
                if (!isSpeechSupported() || !voices().length) {
                    reject(Error("设备没有可用的日语合成声音；仍可阅读。"));
                    return;
                }
                const currentUtterance = new window.SpeechSynthesisUtterance(text);
                currentUtterance.lang = "ja-JP";
                currentUtterance.rate = rate;
                currentUtterance.voice =
                    voices().find((browserVoice) => browserVoice.voiceURI === voice.browserVoiceURI) ??
                    voices()[0];
                utterance = currentUtterance;
                let settled = false;
                const finish = (error?: Error) => {
                    if (settled) return;
                    settled = true;
                    signal.removeEventListener("abort", abort);
                    currentUtterance.onend = null;
                    currentUtterance.onerror = null;
                    if (utterance === currentUtterance) {
                        utterance = undefined;
                        cancelPendingUtterance = undefined;
                    }
                    if (error) reject(error);
                    else resolve();
                };
                const abort = () => {
                    finish(Error("播放已取消"));
                    if (isSpeechSupported()) window.speechSynthesis.cancel();
                };
                cancelPendingUtterance = () => finish(Error("播放已取消"));
                signal.addEventListener("abort", abort, {once: true});
                currentUtterance.onend = () => finish();
                currentUtterance.onerror = () => finish(Error("设备日语合成语音播放失败。"));
                try {
                    window.speechSynthesis.speak(currentUtterance);
                    if (paused) window.speechSynthesis.pause();
                } catch (error) {
                    finish(error instanceof Error ? error : Error(String(error)));
                }
            });
        },
    };
}
