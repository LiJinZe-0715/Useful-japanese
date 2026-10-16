export const VOICEVOX_URL = import.meta.env?.VITE_VOICEVOX_URL ?? "http://127.0.0.1:50021";
export type VoicevoxStyle = { id: number; label: string };

export function createVoicevoxPlayer(baseURL = VOICEVOX_URL, timeoutMs = 15000) {
    let audio: HTMLAudioElement | undefined;
    let paused = false;
    let playbackError: ((error: Error) => void) | undefined;

    async function request<T>(
        route: string,
        init: RequestInit,
        readResponse: (response: Response) => Promise<T>,
    ) {
        const signal = AbortSignal.any([
            ...(init.signal ? [init.signal] : []),
            AbortSignal.timeout(timeoutMs),
        ]);
        const response = await fetch(`${baseURL.replace(/\/$/, "")}${route}`, {
            ...init,
            signal,
            mode: "cors",
            credentials: "omit",
            redirect: "error",
        });
        if (!response.ok) throw Error(`VOICEVOX ${route.split("?")[0]}: HTTP ${response.status}`);
        return await readResponse(response);
    }

    return {
        stop() {
            audio?.pause();
            paused = false;
        },
        pause() {
            paused = true;
            audio?.pause();
        },
        resume() {
            paused = false;
            const currentAudio = audio;
            const failPlayback = playbackError;
            void currentAudio?.play().catch((error) => {
                if (audio === currentAudio)
                    failPlayback?.(error instanceof Error ? error : Error(String(error)));
            });
        },
        async detect(signal: AbortSignal): Promise<VoicevoxStyle[]> {
            const version = await request("/version", {signal}, (response) => response.json());
            if (typeof version !== "string" || !version.trim()) throw Error("VOICEVOX version 无效");
            const speakers: unknown = await request("/speakers", {signal}, (response) =>
                response.json(),
            );
            if (!Array.isArray(speakers)) throw Error("VOICEVOX speakers 无效");
            const styles: VoicevoxStyle[] = [];
            for (const speaker of speakers) {
                if (typeof speaker?.name !== "string" || !Array.isArray(speaker.styles))
                    throw Error("VOICEVOX 角色无效");
                for (const style of speaker.styles) {
                    if (typeof style?.name !== "string" || !Number.isSafeInteger(style.id) || style.id < 0)
                        throw Error("VOICEVOX 风格无效");
                    if (style.type === undefined || style.type === "talk")
                        styles.push({id: style.id, label: `${speaker.name} / ${style.name}`});
                }
            }
            return styles;
        },
        async speak(text: string, styleId: number, rate: number, signal: AbortSignal) {
            signal.throwIfAborted();
            const query = await request(
                `/audio_query?${new URLSearchParams({text, speaker: String(styleId)})}`,
                {method: "POST", signal},
                (response) => response.json(),
            );
            signal.throwIfAborted();
            if (!query || typeof query !== "object" || Array.isArray(query))
                throw Error("VOICEVOX audio_query 无效");
            query.speedScale = rate;
            const blob = await request(
                `/synthesis?speaker=${styleId}`,
                {
                    method: "POST",
                    signal,
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify(query),
                },
                (response) => response.blob(),
            );
            signal.throwIfAborted();
            if (!blob.size) throw Error("VOICEVOX 返回空音频");
            const url = URL.createObjectURL(blob);
            let currentAudio: HTMLAudioElement;
            try {
                currentAudio = new Audio(url);
            } catch (error) {
                URL.revokeObjectURL(url);
                throw error;
            }
            audio = currentAudio;
            try {
                await new Promise<void>((resolve, reject) => {
                    let settled = false;
                    const finish = (error?: Error) => {
                        if (settled) return;
                        settled = true;
                        signal.removeEventListener("abort", abort);
                        currentAudio.onended = null;
                        currentAudio.onerror = null;
                        playbackError = undefined;
                        if (error) reject(error);
                        else resolve();
                    };
                    const abort = () => {
                        currentAudio.pause();
                        finish(Error("播放已取消"));
                    };
                    signal.addEventListener("abort", abort, {once: true});
                    playbackError = finish;
                    currentAudio.onended = () => finish();
                    currentAudio.onerror = () => finish(Error("VOICEVOX 音频播放失败"));
                    if (!paused)
                        void currentAudio
                            .play()
                            .catch((error) => finish(error instanceof Error ? error : Error(String(error))));
                });
            } finally {
                currentAudio.pause();
                currentAudio.removeAttribute("src");
                currentAudio.load();
                URL.revokeObjectURL(url);
                if (audio === currentAudio) audio = undefined;
            }
        },
    };
}
