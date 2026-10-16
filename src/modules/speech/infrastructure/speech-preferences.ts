import {defaultSpeechSettings, type SpeechSettings, type SpeechVoice} from "../domain/speech.ts";

const isSpeechVoice = (voice: unknown): voice is SpeechVoice =>
    !!voice &&
    typeof voice === "object" &&
    !Array.isArray(voice) &&
    Object.entries(voice).every(([field, value]) =>
        field === "browserVoiceURI"
            ? typeof value === "string"
            : field === "voicevoxStyleId" &&
            typeof value === "number" &&
            Number.isSafeInteger(value) &&
            value >= 0,
    );

export function loadSpeechSettings(): SpeechSettings {
    const defaults = defaultSpeechSettings();
    if (typeof window === "undefined") return defaults;
    try {
        const storedSettings = JSON.parse(localStorage.getItem("nihongo:speech:v1") ?? "null");
        if (
            !storedSettings ||
            (storedSettings.engine !== "browser" && storedSettings.engine !== "voicevox")
        )
            return defaults;
        return {
            engine: storedSettings.engine,
            rate:
                typeof storedSettings.rate === "number" &&
                storedSettings.rate >= 0.5 &&
                storedSettings.rate <= 1.5
                    ? storedSettings.rate
                    : 1,
            browserVoiceURI:
                typeof storedSettings.browserVoiceURI === "string" ? storedSettings.browserVoiceURI : "",
            voicevoxStyleId:
                Number.isSafeInteger(storedSettings.voicevoxStyleId) && storedSettings.voicevoxStyleId >= 0
                    ? storedSettings.voicevoxStyleId
                    : 3,
            roles:
                storedSettings.roles &&
                typeof storedSettings.roles === "object" &&
                !Array.isArray(storedSettings.roles)
                    ? Object.fromEntries(
                        Object.entries(storedSettings.roles).filter(([, voice]) => isSpeechVoice(voice)),
                    )
                    : {},
        } as SpeechSettings;
    } catch {
        return defaults;
    }
}

export function saveSpeechSettings(settings: SpeechSettings) {
    if (typeof window === "undefined") return false;
    try {
        localStorage.setItem("nihongo:speech:v1", JSON.stringify(settings));
        return true;
    } catch {
        /* Reading remains available when persistence is blocked. */
        return false;
    }
}
