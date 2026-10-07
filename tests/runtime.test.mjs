import { test } from "node:test";
import assert from "node:assert/strict";
import { createQueue } from "../src/modules/speech/application/queue.ts";
import { chooseVoice, defaultSettings } from "../src/modules/speech/domain/speech.ts";
import { createLearning } from "../src/modules/learning/application/learning.ts";
import { localRecordStore } from "../src/modules/learning/infrastructure/local-record-store.ts";
import { createBrowserPlayer } from "../src/modules/speech/infrastructure/browser.ts";
import { createVoicevoxPlayer } from "../src/modules/speech/infrastructure/voicevox.ts";
import { createSpeechRuntime } from "../src/bootstrap/speech.ts";
import {
  dialogueSegmentId,
  isDialogueLineActive,
} from "../src/modules/catalog/application/dialogue-playback.ts";
const tick = () => new Promise((r) => setImmediate(r));
async function withNativeSpeech(fn) {
  const oldWindow = globalThis.window;
  const oldStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  let paused = false;
  let current;
  const waiting = [],
    started = [],
    resumed = [];
  const startNext = () => {
    if (paused || current || !waiting.length) return;
    current = waiting.shift();
    started.push(current);
    current.onstart?.();
  };
  const native = {
    get paused() {
      return paused;
    },
    get current() {
      return current;
    },
    waiting,
    started,
    resumed,
    getVoices: () => [{ lang: "ja-JP", voiceURI: "ja", name: "Japanese", localService: true }],
    addEventListener() {},
    removeEventListener() {},
    speak(u) {
      waiting.push(u);
      startNext();
    },
    pause() {
      paused = true;
    },
    cancel() {
      current = undefined;
      waiting.length = 0;
    },
    resume() {
      const wasPaused = paused;
      paused = false;
      if (wasPaused && current) resumed.push(current);
      startNext();
    },
    finish() {
      const ended = current;
      current = undefined;
      ended?.onend?.();
      startNext();
    },
  };
  globalThis.window = {
    SpeechSynthesisUtterance: class {
      constructor(text) {
        this.text = text;
      }
    },
    speechSynthesis: native,
  };
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: { getItem: () => null, setItem() {} },
  });
  try {
    await fn(native);
  } finally {
    if (oldWindow === undefined) delete globalThis.window;
    else globalThis.window = oldWindow;
    if (oldStorage === undefined) delete globalThis.localStorage;
    else Object.defineProperty(globalThis, "localStorage", oldStorage);
  }
}
const browserQueue = (player) =>
  createQueue(
    {
      speak: (item, settings, signal) =>
        player.speak(item.text, chooseVoice(item, settings), settings.rate, signal),
      stop: player.stop,
      pause: player.pause,
      resume: player.resume,
    },
    defaultSettings,
    () => {},
  );
test("native speech mock preserves pause through cancel and queues speak until resume", () =>
  withNativeSpeech(async (native) => {
    native.pause();
    native.cancel();
    native.speak(new window.SpeechSynthesisUtterance("waiting"));
    assert.equal(native.paused, true);
    assert.equal(native.started.length, 0);
    assert.equal(native.waiting.length, 1);
    native.resume();
    assert.equal(native.started[0].text, "waiting");
  }));
test("browser pause/resume continues the same utterance without restarting it", () =>
  withNativeSpeech(async (native) => {
    const q = browserQueue(createBrowserPlayer());
    const run = q.play([{ id: "current", text: "current" }]);
    const current = native.current;
    q.pause();
    await tick();
    assert.equal(native.paused, true);
    assert.equal(native.current, current);
    q.resume();
    assert.equal(native.paused, false);
    assert.deepEqual(native.resumed, [current]);
    assert.deepEqual(native.started, [current]);
    native.finish();
    await run;
  }));
test("paused browser queues really start after stop, replay or replacement and reject stale highlights", async () => {
  for (const action of ["stop", "replay", "replace"])
    await withNativeSpeech(async (native) => {
      const q = browserQueue(createBrowserPlayer());
      const old = q.play([{ id: "old", text: "old" }]);
      const lateEnd = native.current.onend;
      q.pause();
      if (action === "stop") q.stop();
      const run = action === "replay" ? q.replay() : q.play([{ id: "new", text: "new" }]);
      const expected = action === "replay" ? "old" : "new";
      assert.equal(native.started.length, 2, `${action}: new utterance must actually start`);
      assert.equal(native.paused, false, action);
      assert.equal(native.current.text, expected);
      lateEnd();
      await old;
      assert.equal(native.current.text, expected);
      assert.equal(q.getState().activeSegmentId, expected);
      assert.equal(q.getState().status, "playing");
      native.finish();
      await run;
      assert.equal(q.getState().activeSegmentId, undefined);
    });
});
test("runtime settings and engine changes clear native pause before the next browser playback", async () => {
  for (const change of ["settings", "engine"])
    await withNativeSpeech(async (native) => {
      const runtime = createSpeechRuntime();
      try {
        const old = runtime.queue.play([{ id: "old", text: "old" }]);
        runtime.queue.pause();
        if (change === "settings") runtime.configure({ rate: 0.8 });
        else {
          runtime.configure({ engine: "voicevox" });
          runtime.configure({ engine: "browser" });
        }
        const run = runtime.queue.play([{ id: "new", text: "new" }]);
        assert.equal(native.paused, false);
        assert.equal(native.started.length, 2);
        assert.equal(native.current.text, "new");
        native.finish();
        await Promise.all([old, run]);
      } finally {
        runtime.dispose();
      }
    });
});
test("VOICEVOX failure during pause does not resume browser fallback until explicit continue", () =>
  withNativeSpeech(async (native) => {
    const oldFetch = globalThis.fetch;
    let rejectQuery;
    globalThis.fetch = () =>
      new Promise((_resolve, reject) => {
        rejectQuery = reject;
      });
    const runtime = createSpeechRuntime();
    try {
      runtime.configure({ engine: "voicevox" });
      const run = runtime.queue.play([{ id: "fallback", text: "fallback" }]);
      runtime.queue.pause();
      rejectQuery(Error("offline"));
      await tick();
      assert.equal(native.paused, true);
      assert.equal(native.started.length, 0);
      assert.equal(native.waiting.length, 1);
      assert.equal(runtime.getSnapshot().state.status, "paused");
      runtime.queue.resume();
      assert.equal(native.started[0].text, "fallback");
      native.finish();
      await run;
      const next = runtime.queue.play([{ id: "next", text: "next" }]);
      rejectQuery(Error("offline"));
      await tick();
      assert.equal(native.started[1].text, "next");
      native.finish();
      await next;
    } finally {
      runtime.dispose();
      globalThis.fetch = oldFetch;
    }
  }));
test("dialogue highlight follows the playing identity, not queue index, selected list or duplicate text", async () => {
  // Minimal reproduction of life/n5-1; independent of the published course directory.
  const lesson = {
    id: "n5-1",
    dialogues: [
      {
        id: "main",
        lines: [
          { id: "main-line-1", ja: "はじめまして。" },
          { id: "main-line-2", ja: "私は林です。", ttsText: "わたしはリンです。" },
        ],
      },
    ],
  };
  const dialogue = lesson.dialogues.find((d) => d.id === "main");
  const id = (lineId, lessonId = lesson.id, dialogueId = dialogue.id) =>
    dialogueSegmentId("life", lessonId, dialogueId, lineId);
  const items = dialogue.lines.slice(0, 2).map((line) => ({
    id: id(line.id),
    text: line.ttsText ?? line.ja,
  }));
  const pending = [];
  const spoken = [];
  const q = createQueue(
    {
      speak(item) {
        spoken.push(item);
        return new Promise((resolve, reject) => pending.push({ resolve, reject }));
      },
      stop() {},
      pause() {},
      resume() {},
    },
    defaultSettings,
    () => {},
  );
  const highlighted = (lines = items) =>
    lines.filter((line) => isDialogueLineActive(q.getState(), line.id)).map((line) => line.id);
  const second = q.play([items[1]]);
  assert.equal(spoken[0].text, "わたしはリンです。");
  assert.equal(q.getState().index, 0);
  assert.deepEqual(highlighted(), [items[1].id]);
  // Selection changes are independent of the active queue; row identity remains stable.
  const changedSelection = [items[0]];
  assert.equal(changedSelection.length, 1);
  assert.deepEqual(highlighted(), [items[1].id]);
  const duplicate = { ...items[0], text: items[1].text };
  assert.deepEqual(highlighted([duplicate, items[1]]), [items[1].id]);
  assert.equal(isDialogueLineActive(q.getState(), id(dialogue.lines[1].id, "n5-2")), false);
  assert.equal(
    isDialogueLineActive(q.getState(), id(dialogue.lines[1].id, lesson.id, "branch")),
    false,
  );
  q.pause();
  assert.deepEqual(highlighted(), [items[1].id]);
  q.resume();
  pending.shift().resolve();
  await second;
  assert.deepEqual(highlighted(), []);
  const replay = q.replay();
  assert.deepEqual(highlighted(), [items[1].id]);
  q.stop();
  assert.deepEqual(highlighted(), []);
  pending.shift().resolve();
  await replay;
  const superseded = q.play([items[0]]);
  const newest = q.play([items[1]]);
  pending.shift().resolve();
  await superseded;
  assert.deepEqual(highlighted(), [items[1].id]);
  pending.shift().resolve();
  await newest;
  const old = q.play([items[0]]);
  const example = q.play([{ text: items[0].text }]);
  assert.deepEqual(highlighted(), []);
  pending.shift().resolve();
  await old;
  assert.deepEqual(highlighted(), []);
  pending.shift().resolve();
  await example;
  const fail = q.play([items[1]]);
  pending.shift().reject(Error("synthesis failed"));
  await fail;
  assert.equal(q.getState().status, "error");
  assert.deepEqual(highlighted(), []);
  const sequence = q.play(items);
  assert.deepEqual(highlighted(), [items[0].id]);
  pending.shift().resolve();
  await tick();
  assert.deepEqual(highlighted(), [items[1].id]);
  pending.shift().resolve();
  await sequence;
  const loop = q.play([items[1]], true);
  pending.shift().resolve();
  await tick();
  assert.deepEqual(highlighted(), [items[1].id]);
  q.stop();
  pending.shift().resolve();
  await loop;
  assert.deepEqual(highlighted(), []);
});
test("records isolated by course and lesson", () => {
  const data = new Map();
  const service = createLearning({
    read: (k) => data.get(k),
    write: (k, v) => {
      data.set(k, v);
      return true;
    },
  });
  const v = service.load("law", "one");
  v.completed = true;
  v.drafts.answer = "例";
  assert.equal(service.save("law", "one", v), true);
  assert.equal(service.load("law", "one").completed, true);
  assert.equal(service.load("life", "one").completed, false);
  assert.equal(service.load("law", "two").drafts.answer, undefined);
});
test("learning save reports storage failure, preserves the draft and can recover", () => {
  const oldWindow = globalThis.window;
  const oldStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const data = new Map();
  let blocked = true;
  globalThis.window = {};
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key) => data.get(key) ?? null,
      setItem(key, value) {
        if (blocked) throw new DOMException("Storage full", "QuotaExceededError");
        data.set(key, value);
      },
    },
  });
  try {
    const service = createLearning(localRecordStore);
    const record = service.load("law", "one");
    record.drafts.answer = "未保存的书面答案";
    record.completed = true;
    assert.equal(service.save("law", "one", record), false);
    assert.equal(record.drafts.answer, "未保存的书面答案");
    assert.equal(service.load("law", "one").drafts.answer, undefined);
    blocked = false;
    assert.equal(service.save("law", "one", record), true);
    assert.deepEqual(service.load("law", "one"), record);
    delete globalThis.window;
    assert.equal(service.save("law", "one", record), false);
  } finally {
    if (oldWindow === undefined) delete globalThis.window;
    else globalThis.window = oldWindow;
    if (oldStorage === undefined) delete globalThis.localStorage;
    else Object.defineProperty(globalThis, "localStorage", oldStorage);
  }
});
test("cancel and late completion cannot restart old queue; replay supersedes", async () => {
  const pending = [];
  let calls = 0;
  const states = [];
  const player = {
    speak: () => {
      calls++;
      return new Promise((resolve) => pending.push(resolve));
    },
    stop() {},
    pause() {},
    resume() {},
  };
  const q = createQueue(player, defaultSettings, (s) => states.push(s));
  const old = q.play([{ text: "旧一" }, { text: "旧二" }]);
  q.stop();
  pending.shift()();
  await old;
  assert.equal(calls, 1);
  const a = q.play([{ text: "A" }, { text: "B" }]);
  const b = q.play([{ text: "C" }]);
  pending.shift()();
  await a;
  assert.equal(calls, 3);
  pending.shift()();
  await b;
  assert.equal(q.getState().status, "idle");
});
test("pause blocks next segment and resume continues; loop can stop", async () => {
  let calls = 0;
  const pending = [];
  const q = createQueue(
    {
      speak: () => {
        calls++;
        return new Promise((r) => pending.push(r));
      },
      stop() {},
      pause() {},
      resume() {},
    },
    defaultSettings,
    () => {},
  );
  const run = q.play([{ text: "一" }, { text: "二" }]);
  q.pause();
  pending.shift()();
  await tick();
  assert.equal(calls, 1);
  q.resume();
  await tick();
  assert.equal(calls, 2);
  pending.shift()();
  await run;
  const loop = q.play([{ text: "例" }], true);
  pending.shift()();
  await tick();
  assert.equal(calls, 4);
  q.stop();
  pending.shift()();
  await loop;
});
test("empty loop returns and role voice precedence is independent", async () => {
  const q = createQueue(
    {
      speak() {
        throw Error("should not play");
      },
      stop() {},
      pause() {},
      resume() {},
    },
    defaultSettings,
    () => {},
  );
  await q.play([], true);
  const s = defaultSettings();
  s.roles.a = { browserVoiceURI: "user" };
  assert.deepEqual(
    chooseVoice(
      { text: "例", speakerId: "a", voice: { browserVoiceURI: "data", voicevoxStyleId: 9 } },
      s,
    ),
    { browserVoiceURI: "user", voicevoxStyleId: 9 },
  );
});
test("SSR module import and adapter creation do not touch browser APIs", () => {
  assert.equal(typeof window, "undefined");
  const b = createBrowserPlayer();
  assert.deepEqual(b.voices(), []);
  createVoicevoxPlayer();
  b.stop();
});
test("VOICEVOX aborted late query cannot synthesize or create Audio", async () => {
  const original = globalThis.fetch;
  let resolve;
  let calls = 0;
  globalThis.fetch = () => {
    calls++;
    return new Promise((r) => (resolve = r));
  };
  try {
    const p = createVoicevoxPlayer();
    const c = new AbortController();
    const run = p.speak("例", 3, 1, c.signal);
    c.abort();
    resolve(new Response(JSON.stringify({}), { headers: { "Content-Type": "application/json" } }));
    await assert.rejects(run);
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = original;
  }
});

test("delayed voices, saved preferences, stale utterance callbacks, and listener cleanup", async () => {
  const oldWindow = globalThis.window,
    oldStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const events = new Map(),
    spoken = [];
  let voices = [];
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    writable: true,
    value: {
      getItem: () => JSON.stringify({ ...defaultSettings(), browserVoiceURI: "saved" }),
      setItem() {},
    },
  });
  globalThis.window = {
    SpeechSynthesisUtterance: class {
      constructor(text) {
        this.text = text;
      }
    },
    speechSynthesis: {
      getVoices: () => voices,
      addEventListener: (k, f) => events.set(k, f),
      removeEventListener: (k) => events.delete(k),
      cancel() {},
      pause() {},
      resume() {},
      speak: (u) => spoken.push(u),
    },
  };
  try {
    const runtime = createSpeechRuntime();
    assert.equal(runtime.getSnapshot().voices.length, 0);
    voices = [
      { voiceURI: "other", lang: "ja-JP", name: "Other", localService: true },
      { voiceURI: "saved", lang: "ja-JP", name: "Saved", localService: true },
    ];
    events.get("voiceschanged")();
    assert.equal(runtime.getSnapshot().voices.length, 2);
    const old = runtime.queue.play([{ text: "旧" }, { text: "続き" }]);
    const oldEnd = spoken[0].onend;
    assert.equal(spoken[0].voice.voiceURI, "saved");
    runtime.queue.stop();
    oldEnd();
    await old;
    assert.equal(spoken.length, 1);
    runtime.configure({ browserVoiceURI: "missing" });
    const run = runtime.queue.play([{ text: "新" }]);
    assert.equal(spoken[1].voice.voiceURI, "other");
    spoken[1].onend();
    await run;
    runtime.dispose();
    assert.equal(events.size, 0);
  } finally {
    if (oldWindow === undefined) delete globalThis.window;
    else globalThis.window = oldWindow;
    if (oldStorage === undefined) delete globalThis.localStorage;
    else Object.defineProperty(globalThis, "localStorage", oldStorage);
  }
});
test("late VOICEVOX detection does not override a newer engine choice", async () => {
  const oldFetch = globalThis.fetch;
  let versionResolve;
  globalThis.fetch = (url) =>
    String(url).endsWith("/version")
      ? new Promise((resolve) => (versionResolve = resolve))
      : Promise.resolve(
          new Response(
            JSON.stringify([
              {
                name: "Example",
                styles: [
                  { id: 3, name: "Normal", type: "talk" },
                  { id: 99, name: "Song", type: "sing" },
                ],
              },
            ]),
          ),
        );
  try {
    const runtime = createSpeechRuntime();
    runtime.configure({ engine: "voicevox" });
    const detecting = runtime.detect();
    runtime.configure({ engine: "browser" });
    versionResolve(new Response(JSON.stringify("test")));
    await detecting;
    assert.equal(runtime.getSnapshot().settings.engine, "browser");
    assert.deepEqual(runtime.getSnapshot().styles, [{ id: 3, label: "Example / Normal" }]);
    runtime.dispose();
  } finally {
    globalThis.fetch = oldFetch;
  }
});
test("VOICEVOX request timeout rejects and HTTP errors are explicit", async () => {
  const oldFetch = globalThis.fetch;
  try {
    globalThis.fetch = (_url, { signal }) =>
      new Promise((_resolve, reject) =>
        signal.addEventListener("abort", () => reject(signal.reason), { once: true }),
      );
    const timer = setTimeout(() => {}, 50);
    await assert.rejects(
      createVoicevoxPlayer("http://example", 5).detect(new AbortController().signal),
    );
    clearTimeout(timer);
    globalThis.fetch = () => Promise.resolve(new Response("error", { status: 500 }));
    await assert.rejects(createVoicevoxPlayer().detect(new AbortController().signal), /HTTP 500/);
  } finally {
    globalThis.fetch = oldFetch;
  }
});
test("VOICEVOX audio cancellation revokes URL, detaches callbacks, and cannot resume late audio", async () => {
  const original = {
    fetch: globalThis.fetch,
    Audio: globalThis.Audio,
    create: URL.createObjectURL,
    revoke: URL.revokeObjectURL,
  };
  let current,
    plays = 0,
    revoked = 0;
  const requests = [];
  globalThis.fetch = (url) => {
    requests.push(url);
    return Promise.resolve(
      new Response(String(url).includes("audio_query") ? JSON.stringify({}) : "wave"),
    );
  };
  URL.createObjectURL = () => "blob:test";
  URL.revokeObjectURL = () => {
    revoked++;
  };
  globalThis.Audio = class {
    constructor() {
      current = this;
    }
    play() {
      plays++;
      return Promise.resolve();
    }
    pause() {}
    removeAttribute() {}
    load() {}
  };
  try {
    const player = createVoicevoxPlayer();
    const c = new AbortController();
    const run = player.speak("例", 3, 0.8, c.signal);
    await tick();
    assert.equal(plays, 1);
    const late = current.onended;
    c.abort();
    late();
    await assert.rejects(run);
    player.resume();
    assert.equal(plays, 1);
    assert.equal(revoked, 1);
    assert.equal(current.onended, null);
    assert.equal(requests.length, 2);
  } finally {
    globalThis.fetch = original.fetch;
    if (original.Audio === undefined) delete globalThis.Audio;
    else globalThis.Audio = original.Audio;
    URL.createObjectURL = original.create;
    URL.revokeObjectURL = original.revoke;
  }
});
test("VOICEVOX failure falls back through same runtime to device speech", async () => {
  const oldFetch = globalThis.fetch,
    oldWindow = globalThis.window;
  let utterance;
  globalThis.fetch = () => Promise.reject(Error("offline"));
  globalThis.window = {
    SpeechSynthesisUtterance: class {},
    speechSynthesis: {
      getVoices: () => [{ lang: "ja-JP", voiceURI: "ja", name: "Japanese", localService: true }],
      addEventListener() {},
      removeEventListener() {},
      cancel() {},
      pause() {},
      resume() {},
      speak: (u) => {
        utterance = u;
        queueMicrotask(() => u.onend?.());
      },
    },
  };
  try {
    const runtime = createSpeechRuntime();
    runtime.configure({ engine: "voicevox" });
    await runtime.queue.play([{ text: "例" }]);
    assert.equal(utterance.lang, "ja-JP");
    assert.match(runtime.getSnapshot().notice, /尝试设备/);
    assert.equal(runtime.getSnapshot().state.status, "idle");
    runtime.dispose();
  } finally {
    globalThis.fetch = oldFetch;
    if (oldWindow === undefined) delete globalThis.window;
    else globalThis.window = oldWindow;
  }
});
