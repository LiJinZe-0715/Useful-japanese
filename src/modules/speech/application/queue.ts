import type { Segment, SpeechSettings } from "../domain/speech.ts";
export interface SpeechPlayer {
  speak(item: Segment, settings: SpeechSettings, signal: AbortSignal): Promise<void>;
  stop(): void;
  pause(): void;
  resume(): void;
}
export type QueueState = {
  status: "idle" | "playing" | "paused" | "error";
  index: number;
  activeSegmentId?: string;
  message: string;
};
export function createQueue(
  player: SpeechPlayer,
  settings: () => SpeechSettings,
  publish: (state: QueueState) => void,
) {
  let token = 0;
  let controller: AbortController | undefined;
  let paused = false;
  let wake: (() => void) | undefined;
  let last: Segment[] = [];
  let state: QueueState = { status: "idle", index: 0, message: "" };
  const update = (v: Partial<QueueState>) => {
    state = { ...state, ...v };
    publish(state);
  };
  function stop() {
    token++;
    controller?.abort();
    controller = undefined;
    paused = false;
    wake?.();
    wake = undefined;
    player.stop();
    update({ status: "idle", activeSegmentId: undefined, message: "" });
  }
  async function play(items: Segment[], loop = false) {
    stop();
    last = items.filter((i) => i.text.trim());
    if (!last.length) return;
    const runItems = last;
    const current = ++token;
    controller = new AbortController();
    const signal = controller.signal;
    update({ status: "playing", index: 0 });
    try {
      do {
        for (let i = 0; i < runItems.length; i++) {
          if (paused)
            await new Promise<void>((resolve) => {
              wake = resolve;
            });
          if (current !== token || signal.aborted) return;
          update({ index: i, activeSegmentId: runItems[i].id });
          await player.speak(runItems[i], settings(), signal);
          if (current !== token || signal.aborted) return;
        }
      } while (loop && current === token);
      if (current === token)
        update({ status: "idle", activeSegmentId: undefined, message: "本次合成语音播放结束。" });
    } catch (error) {
      if (current === token && !signal.aborted)
        update({
          status: "error",
          activeSegmentId: undefined,
          message: error instanceof Error ? error.message : String(error),
        });
    }
  }
  return {
    play,
    stop,
    replay: (loop = false) => play(last, loop),
    pause() {
      if (state.status !== "playing") return;
      paused = true;
      player.pause();
      update({ status: "paused" });
    },
    resume() {
      if (!paused) return;
      paused = false;
      player.resume();
      wake?.();
      wake = undefined;
      update({ status: "playing" });
    },
    getState: () => state,
  };
}
