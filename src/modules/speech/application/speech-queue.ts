import type {SpeechSegment, SpeechSettings} from "../domain/speech.ts";

export interface SpeechPlayer {
    speak(segment: SpeechSegment, settings: SpeechSettings, signal: AbortSignal): Promise<void>;

    stop(): void;

    pause(): void;

    resume(): void;
}

export type SpeechQueueState = {
    status: "idle" | "playing" | "paused" | "error";
    index: number;
    activeSegmentId?: string;
    message: string;
};

export function createSpeechQueue(
    player: SpeechPlayer,
    getSettings: () => SpeechSettings,
    publish: (state: SpeechQueueState) => void,
) {
    let playbackId = 0;
    let playbackController: AbortController | undefined;
    let paused = false;
    let looping = false;
    let resumePendingPlayback: (() => void) | undefined;
    let lastSegments: SpeechSegment[] = [];
    let state: SpeechQueueState = {status: "idle", index: 0, message: ""};
    const update = (changes: Partial<SpeechQueueState>) => {
        state = {...state, ...changes};
        publish(state);
    };

    function stop() {
        playbackId++;
        playbackController?.abort();
        playbackController = undefined;
        paused = false;
        looping = false;
        resumePendingPlayback?.();
        resumePendingPlayback = undefined;
        player.stop();
        update({status: "idle", activeSegmentId: undefined, message: ""});
    }

    async function play(segments: SpeechSegment[], loop = false) {
        stop();
        looping = loop;
        lastSegments = segments.filter((segment) => segment.text.trim());
        if (!lastSegments.length) return;
        const playbackSegments = lastSegments;
        const currentPlaybackId = ++playbackId;
        playbackController = new AbortController();
        const signal = playbackController.signal;
        update({status: "playing", index: 0});
        try {
            do {
                for (let i = 0; i < playbackSegments.length; i++) {
                    if (paused)
                        await new Promise<void>((resolve) => {
                            resumePendingPlayback = resolve;
                        });
                    if (currentPlaybackId !== playbackId || signal.aborted) return;
                    update({index: i, activeSegmentId: playbackSegments[i].id});
                    await player.speak(playbackSegments[i], getSettings(), signal);
                    if (currentPlaybackId !== playbackId || signal.aborted) return;
                }
            } while (looping && currentPlaybackId === playbackId);
            if (currentPlaybackId === playbackId)
                update({status: "idle", activeSegmentId: undefined, message: "本次合成语音播放结束。"});
        } catch (error) {
            if (currentPlaybackId === playbackId && !signal.aborted)
                update({
                    status: "error",
                    activeSegmentId: undefined,
                    message: error instanceof Error ? error.message : String(error),
                });
        } finally {
            if (currentPlaybackId === playbackId) {
                paused = false;
                resumePendingPlayback = undefined;
                playbackController = undefined;
            }
        }
    }

    return {
        play,
        stop,
        setLoop(value: boolean) {
            looping = value;
        },
        replay: (loop = false) => play(lastSegments, loop),
        pause() {
            if (state.status !== "playing") return;
            paused = true;
            player.pause();
            update({status: "paused"});
        },
        resume() {
            if (!paused || state.status !== "paused" || !playbackController) return;
            paused = false;
            player.resume();
            resumePendingPlayback?.();
            resumePendingPlayback = undefined;
            update({status: "playing"});
        },
        getState: () => state,
    };
}
