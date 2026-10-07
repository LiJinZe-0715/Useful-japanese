export const VOICEVOX_URL = import.meta.env?.VITE_VOICEVOX_URL ?? "http://127.0.0.1:50021";
export type Style = { id: number; label: string };
export function createVoicevoxPlayer(baseURL = VOICEVOX_URL, timeout = 15000) {
  let audio: HTMLAudioElement | undefined;
  let paused = false;
  let playbackError: ((error: Error) => void) | undefined;
  async function request<T>(route: string, init: RequestInit, read: (r: Response) => Promise<T>) {
    const signal = AbortSignal.any([
      ...(init.signal ? [init.signal] : []),
      AbortSignal.timeout(timeout),
    ]);
    const response = await fetch(`${baseURL.replace(/\/$/, "")}${route}`, {
      ...init,
      signal,
      mode: "cors",
      credentials: "omit",
      redirect: "error",
    });
    if (!response.ok) throw Error(`VOICEVOX ${route.split("?")[0]}: HTTP ${response.status}`);
    return await read(response);
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
      const current = audio;
      const fail = playbackError;
      void current?.play().catch((error) => {
        if (audio === current) fail?.(error instanceof Error ? error : Error(String(error)));
      });
    },
    async detect(signal: AbortSignal): Promise<Style[]> {
      const version = await request("/version", { signal }, (r) => r.json());
      if (typeof version !== "string" || !version.trim()) throw Error("VOICEVOX version 无效");
      const speakers: unknown = await request("/speakers", { signal }, (r) => r.json());
      if (!Array.isArray(speakers)) throw Error("VOICEVOX speakers 无效");
      const styles: Style[] = [];
      for (const s of speakers) {
        if (typeof s?.name !== "string" || !Array.isArray(s.styles))
          throw Error("VOICEVOX 角色无效");
        for (const v of s.styles) {
          if (typeof v?.name !== "string" || !Number.isSafeInteger(v.id) || v.id < 0)
            throw Error("VOICEVOX 风格无效");
          if (v.type === undefined || v.type === "talk")
            styles.push({ id: v.id, label: `${s.name} / ${v.name}` });
        }
      }
      return styles;
    },
    async speak(text: string, styleId: number, rate: number, signal: AbortSignal) {
      signal.throwIfAborted();
      const query = await request(
        `/audio_query?${new URLSearchParams({ text, speaker: String(styleId) })}`,
        { method: "POST", signal },
        (r) => r.json(),
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
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(query),
        },
        (r) => r.blob(),
      );
      signal.throwIfAborted();
      if (!blob.size) throw Error("VOICEVOX 返回空音频");
      const url = URL.createObjectURL(blob);
      let current: HTMLAudioElement;
      try {
        current = new Audio(url);
      } catch (error) {
        URL.revokeObjectURL(url);
        throw error;
      }
      audio = current;
      try {
        await new Promise<void>((resolve, reject) => {
          let done = false;
          const finish = (error?: Error) => {
            if (done) return;
            done = true;
            signal.removeEventListener("abort", abort);
            current.onended = null;
            current.onerror = null;
            playbackError = undefined;
            if (error) reject(error);
            else resolve();
          };
          const abort = () => {
            current.pause();
            finish(Error("播放已取消"));
          };
          signal.addEventListener("abort", abort, { once: true });
          playbackError = finish;
          current.onended = () => finish();
          current.onerror = () => finish(Error("VOICEVOX 音频播放失败"));
          if (!paused)
            void current.play().catch((e) => finish(e instanceof Error ? e : Error(String(e))));
        });
      } finally {
        current.pause();
        current.removeAttribute("src");
        current.load();
        URL.revokeObjectURL(url);
        if (audio === current) audio = undefined;
      }
    },
  };
}
