import { defaultSettings, type SpeechSettings, type Voice } from "../domain/speech.ts";
const validVoice = (v: unknown): v is Voice =>
  !!v &&
  typeof v === "object" &&
  !Array.isArray(v) &&
  Object.entries(v).every(([k, x]) =>
    k === "browserVoiceURI"
      ? typeof x === "string"
      : k === "voicevoxStyleId" && typeof x === "number" && Number.isSafeInteger(x) && x >= 0,
  );
export function loadSettings(): SpeechSettings {
  const defaults = defaultSettings();
  if (typeof window === "undefined") return defaults;
  try {
    const v = JSON.parse(localStorage.getItem("nihongo:speech:v1") ?? "null");
    if (!v || (v.engine !== "browser" && v.engine !== "voicevox")) return defaults;
    return {
      engine: v.engine,
      rate: typeof v.rate === "number" && v.rate >= 0.5 && v.rate <= 1.5 ? v.rate : 1,
      browserVoiceURI: typeof v.browserVoiceURI === "string" ? v.browserVoiceURI : "",
      voicevoxStyleId:
        Number.isSafeInteger(v.voicevoxStyleId) && v.voicevoxStyleId >= 0 ? v.voicevoxStyleId : 3,
      roles:
        v.roles && typeof v.roles === "object" && !Array.isArray(v.roles)
          ? Object.fromEntries(Object.entries(v.roles).filter(([, x]) => validVoice(x)))
          : {},
    } as SpeechSettings;
  } catch {
    return defaults;
  }
}
export function saveSettings(v: SpeechSettings) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem("nihongo:speech:v1", JSON.stringify(v));
  } catch {
    /* Reading remains available when persistence is blocked. */
  }
}
