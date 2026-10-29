export type SpeechVoice = { browserVoiceURI?: string; voicevoxStyleId?: number };
export type SpeechSegment = { id?: string; text: string; speakerId?: string; voice?: SpeechVoice };
export type SpeechSettings = {
  engine: "browser" | "voicevox";
  rate: number;
  browserVoiceURI: string;
  voicevoxStyleId: number;
  roles: Record<string, SpeechVoice>;
};
export const defaultSpeechSettings = (): SpeechSettings => ({
  engine: "browser",
  rate: 1,
  browserVoiceURI: "",
  voicevoxStyleId: 3,
  roles: {},
});
export const resolveSegmentVoice = (
  segment: SpeechSegment,
  settings: SpeechSettings,
): SpeechVoice => ({
  browserVoiceURI: settings.browserVoiceURI,
  voicevoxStyleId: settings.voicevoxStyleId,
  ...segment.voice,
  ...(segment.speakerId ? settings.roles[segment.speakerId] : {}),
});
